import { Router } from 'express';
import Pet from '../models/Pet.js';
import Bag from '../models/Bag.js';
import { authRequired } from '../middleware/auth.js';

// Rutas para gestionar las mascotas del usuario (nombre, edad, comidas y consumo automático)
const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Calcula cuántas comidas deberían haberse hecho desde lastInventoryUpdate hasta ahora,
// usando las feedingTimes si están definidas. Si no hay feedingTimes, se usa un consumo
// de mealsPerDay por día completo transcurrido.
async function applyInventoryAutoUpdateForPet(pet, userId) {
  const now = new Date();
  const last = pet.lastInventoryUpdate || pet.createdAt || now;

  // Nada que hacer si last es en el futuro o no hay comidas configuradas
  if (now <= last || !pet.mealsPerDay || pet.mealsPerDay <= 0) {
    return;
  }

  let totalMealsToConsume = 0;

  const feedingTimes = Array.isArray(pet.feedingTimes)
    ? pet.feedingTimes.filter(Boolean)
    : [];

  if (feedingTimes.length === 0) {
    // Modo simple: consumir mealsPerDay por día completo transcurrido
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = nowDay - lastDay;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return;
    }
    totalMealsToConsume = diffDays * pet.mealsPerDay;
  } else {
    // Modo detallado: contar cada comida programada (HH:mm) entre last y now
    const parsedTimes = feedingTimes
      .map((t) => t.trim())
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
      .map((t) => {
        const [h, m] = t.split(':').map((n) => parseInt(n, 10));
        return { h, m };
      })
      .sort((a, b) => a.h - b.h || a.m - b.m);

    if (parsedTimes.length === 0) {
      return;
    }

    const cursor = new Date(last);
    const end = now;

    // Empezamos desde el día de last hasta el día de now
    let day = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
    );
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (day <= endDay) {
      for (const { h, m } of parsedTimes) {
        const event = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          h,
          m,
          0,
          0,
        );
        if (event > last && event <= end) {
          totalMealsToConsume += 1;
        }
      }
      day.setDate(day.getDate() + 1);
    }

    if (totalMealsToConsume <= 0) {
      return;
    }
  }

  if (totalMealsToConsume <= 0) {
    return;
  }

  let remainingToConsume = totalMealsToConsume;

  // Obtenemos todas las bolsas COMPLETADAS para esta mascota y usuario
  const bags = await Bag.find({
    user: userId,
    pet: pet._id,
    completedCount: { $gt: 0 },
  }).sort({ createdAt: 1 });

  for (const bag of bags) {
    if (remainingToConsume <= 0) break;
    const available = bag.completedCount - (bag.consumedCount || 0);
    if (available <= 0) continue;

    const consume = Math.min(available, remainingToConsume);
    bag.consumedCount = (bag.consumedCount || 0) + consume;
    remainingToConsume -= consume;
    await bag.save();
  }

  // Actualizamos la fecha de última actualización de inventario
  pet.lastInventoryUpdate = now;
  await pet.save();
}

// Devuelve todas las mascotas del usuario autenticado y, antes,
// aplica el rebajo automático de bolsas según comidas/hora y última actualización
router.get('/', async (req, res, next) => {
  try {
    const pets = await Pet.find({ user: req.user._id }).sort({ createdAt: -1 });

    for (const pet of pets) {
      await applyInventoryAutoUpdateForPet(pet, req.user._id);
    }

    res.json(pets);
  } catch (error) {
    next(error);
  }
});

// Crea una nueva mascota
router.post('/', async (req, res, next) => {
  try {
    const { name, age, mealsPerDay = 1, feedingTimes = [] } = req.body;

    if (!name || age === undefined) {
      return res.status(400).json({ message: 'Nombre y edad son obligatorios' });
    }

    const pet = await Pet.create({
      user: req.user._id,
      name,
      age,
      mealsPerDay,
      feedingTimes,
    });

    res.status(201).json(pet);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ya existe una mascota con ese nombre' });
    }
    next(error);
  }
});

// Actualiza una mascota existente
router.put('/:id', async (req, res, next) => {
  try {
    const { name, age, mealsPerDay, feedingTimes } = req.body;

    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name, age, mealsPerDay, feedingTimes },
      { new: true, runValidators: true },
    );

    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    res.json(pet);
  } catch (error) {
    next(error);
  }
});

// Registra un "día de comida" para la mascota:
// consume mealsPerDay bolsas completas asociadas a esa mascota (si hay suficientes)
router.post('/:id/feed-day', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.id, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const meals = pet.mealsPerDay;
    if (!meals || meals <= 0) {
      return res.status(400).json({ message: 'mealsPerDay debe ser mayor que 0 para registrar un día de comida' });
    }

    let remainingToConsume = meals;

    // Obtenemos todas las bolsas COMPLETADAS para esta mascota y usuario
    const bags = await Bag.find({
      user: req.user._id,
      pet: pet._id,
      completedCount: { $gt: 0 },
    }).sort({ createdAt: 1 });

    for (const bag of bags) {
      if (remainingToConsume <= 0) break;
      const available = bag.completedCount - (bag.consumedCount || 0);
      if (available <= 0) continue;

      const consume = Math.min(available, remainingToConsume);
      bag.consumedCount = (bag.consumedCount || 0) + consume;
      remainingToConsume -= consume;
      await bag.save();
    }

    const consumed = meals - remainingToConsume;

    // Calculamos bolsas restantes totales para esta mascota después del consumo
    const allBags = await Bag.find({
      user: req.user._id,
      pet: pet._id,
      completedCount: { $gt: 0 },
    });

    const remainingBags = allBags.reduce(
      (acc, b) => acc + Math.max(0, b.completedCount - (b.consumedCount || 0)),
      0,
    );

    res.json({
      petId: pet._id,
      mealsRequested: meals,
      mealsConsumed: consumed,
      remainingBags,
    });
  } catch (error) {
    next(error);
  }
});

// Elimina una mascota; las bolsas que la usen quedarán sin mascota asociada
router.delete('/:id', async (req, res, next) => {
  try {
    const pet = await Pet.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    // Quitamos la referencia a la mascota en las bolsas del usuario
    await Bag.updateMany({ user: req.user._id, pet: pet._id }, { $unset: { pet: '' } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

