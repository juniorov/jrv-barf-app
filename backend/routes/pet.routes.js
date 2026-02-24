import { Router } from 'express';
import Pet from '../models/Pet.js';
import Bag from '../models/Bag.js';
import ConsumptionHistory from '../models/ConsumptionHistory.js';
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
  }).populate('ingredients.ingredient').sort({ createdAt: 1 });

  // Crear fecha sin hora para el registro de consumo (solo día)
  const consumptionDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const bag of bags) {
    if (remainingToConsume <= 0) break;
    const available = bag.completedCount - (bag.consumedCount || 0);
    if (available <= 0) continue;

    const consume = Math.min(available, remainingToConsume);
    bag.consumedCount = (bag.consumedCount || 0) + consume;
    remainingToConsume -= consume;
    await bag.save();

    // Registrar el consumo en el historial para cada ingrediente de la bolsa
    for (const ingredientBag of bag.ingredients) {
      const gramsConsumed = ingredientBag.gramsPerBag * consume;
      
      // Buscar si ya existe un registro para este día, mascota e ingrediente
      const existingHistory = await ConsumptionHistory.findOne({
        user: userId,
        pet: pet._id,
        ingredient: ingredientBag.ingredient._id,
        consumptionDate: consumptionDate
      });

      if (existingHistory) {
        // Actualizar el registro existente
        existingHistory.gramsConsumed += gramsConsumed;
        existingHistory.bagsConsumed += consume;
        await existingHistory.save();
      } else {
        // Crear nuevo registro
        await ConsumptionHistory.create({
          user: userId,
          pet: pet._id,
          ingredient: ingredientBag.ingredient._id,
          bag: bag._id,
          gramsConsumed,
          bagsConsumed: consume,
          consumptionDate,
          consumptionType: 'automatic'
        });
      }
    }
  }

  // Actualizamos la fecha de última actualización de inventario
  pet.lastInventoryUpdate = now;
  await pet.save();
}

// Devuelve todas las mascotas del usuario autenticado y, antes,
// aplica el rebajo automático de bolsas según comidas/hora y última actualización
router.get('/', async (req, res, next) => {
  try {
    const pets = await Pet.find({ user: req.user._id })
      .populate('ingredients.ingredient')
      .sort({ createdAt: -1 });

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
    const { name, age, mealsPerDay = 1, maxIngredientsPerBag = 5, totalInventory = 0, feedingTimes = [] } = req.body;

    if (!name || age === undefined) {
      return res.status(400).json({ message: 'Nombre y edad son obligatorios' });
    }

    const pet = await Pet.create({
      user: req.user._id,
      name,
      age,
      mealsPerDay,
      maxIngredientsPerBag,
      totalInventory,
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
    const { name, age, mealsPerDay, maxIngredientsPerBag, feedingTimes, totalInventory } = req.body;

    const updateData = { name, age, mealsPerDay, maxIngredientsPerBag, feedingTimes };
    
    // Solo incluir totalInventory si está presente en el request
    if (typeof totalInventory === 'number') {
      updateData.totalInventory = totalInventory;
    }

    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { returnDocument: 'after', runValidators: true },
    );

    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    res.json(pet);
  } catch (error) {
    next(error);
  }
});

// Actualiza el inventario total de una mascota
router.patch('/:id/inventory', async (req, res, next) => {
  try {
    const { totalInventory } = req.body;

    if (typeof totalInventory !== 'number' || totalInventory < 0) {
      return res.status(400).json({ 
        message: 'El inventario total debe ser un número mayor o igual a 0' 
      });
    }

    const pet = await Pet.findOne({ _id: req.params.id, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const oldInventory = pet.totalInventory;
    pet.totalInventory = totalInventory;
    await pet.save();

    res.json({
      pet,
      oldInventory,
      newInventory: totalInventory,
      message: `Inventario actualizado de ${oldInventory} a ${totalInventory} bolsas`
    });
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
// Registra un "día de comida" para la mascota:
// consume mealsPerDay del inventario total de la mascota
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

    if (pet.totalInventory < meals) {
      return res.status(400).json({ 
        message: `Inventario insuficiente. Necesitas ${meals} bolsas pero solo tienes ${pet.totalInventory}` 
      });
    }

    // Consumir del inventario total
    pet.totalInventory -= meals;
    pet.consumedCount += meals;
    await pet.save();

    // Registrar en el historial (consumo manual)
    const consumptionDate = new Date();
    consumptionDate.setHours(0, 0, 0, 0);
    
    // Buscar una bolsa representativa para los ingredientes
    const representativeBag = await Bag.findOne({ 
      user: req.user._id, 
      pet: pet._id,
      isComplete: true 
    }).populate('ingredients.ingredient');
    
    if (representativeBag) {
      for (const ingredientBag of representativeBag.ingredients) {
        const gramsConsumed = ingredientBag.gramsPerBag * meals;
        
        await ConsumptionHistory.create({
          user: req.user._id,
          pet: pet._id,
          ingredient: ingredientBag.ingredient._id,
          bag: representativeBag._id,
          gramsConsumed,
          bagsConsumed: meals,
          consumptionDate,
          consumptionType: 'manual'
        });
      }
    }

    res.json({
      message: `Se registró un día de comida para ${pet.name}`,
      petId: pet._id,
      mealsRequested: meals,
      mealsConsumed: meals,
      remainingInventory: pet.totalInventory
    });
  } catch (error) {
    next(error);
  }
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

// Obtiene los ingredientes asociados a una mascota con sus cantidades
router.get('/:id/ingredients', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.id, user: req.user._id })
      .populate('ingredients.ingredient');
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    res.json(pet.ingredients);
  } catch (error) {
    next(error);
  }
});

// Actualiza los ingredientes asociados a una mascota
router.put('/:id/ingredients', async (req, res, next) => {
  try {
    const { ingredients } = req.body;
    
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ message: 'Los ingredientes deben ser un array' });
    }

    // Validar que cada ingrediente tenga los campos requeridos
    for (const ing of ingredients) {
      if (!ing.ingredient || !ing.gramsPerPortion || ing.gramsPerPortion < 1) {
        return res.status(400).json({ 
          message: 'Cada ingrediente debe tener un ID válido y gramos por porción >= 1' 
        });
      }
      // Asegurar que desiredPortions esté definido
      ing.desiredPortions = ing.desiredPortions || 0;
    }

    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ingredients },
      { returnDocument: 'after', runValidators: true }
    ).populate('ingredients.ingredient');

    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    res.json(pet.ingredients);
  } catch (error) {
    next(error);
  }
});

export default router;

