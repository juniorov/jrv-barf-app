import { Router } from 'express';
import Pet from '../models/Pet.js';
import Bag from '../models/Bag.js';
import ConsumptionHistory from '../models/ConsumptionHistory.js';
import User from '../models/User.js';  // Añadir importación para el endpoint del sistema
import { authRequired } from '../middleware/auth.js';

// Rutas para gestionar las mascotas del usuario (nombre, edad, comidas y consumo automático)
const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Función auxiliar para calcular edad desde fecha de nacimiento
function calculateAge(birthDate) {
  if (!birthDate) return 0;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  // Calcular años, meses y días transcurridos
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  
  // Ajustar si no ha pasado el día del cumpleaños este mes
  if (days < 0) {
    months--;
    // Obtener días del mes anterior
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  // Ajustar si no ha pasado el mes del cumpleaños este año
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Convertir a años decimales (meses / 12 + días / 365)
  const ageInYears = years + (months / 12) + (days / 365);
  
  return Math.max(0, Math.round(ageInYears * 10) / 10); // Redondear a 1 decimal
}

// Función auxiliar para obtener la fecha actual en zona horaria de Costa Rica (UTC-6)
function getCostaRicaDate() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 6);
  return now;
}

// Calcula cuántas comidas deberían haberse hecho desde lastInventoryUpdate hasta ahora,
// usando las feedingTimes si están definidas. Si no hay feedingTimes, se usa un consumo
// de mealsPerDay por día completo transcurrido.
// IMPORTANTE: Verifica registros manuales existentes para evitar doble rebajo
export async function applyInventoryAutoUpdateForPet(pet, userId) {
  // Usar zona horaria de Costa Rica (UTC-6)
  const now = getCostaRicaDate();
  
  const last = pet.lastInventoryUpdate || pet.createdAt || now;

  // Nada que hacer si last es en el futuro o no hay comidas configuradas
  if (now <= last || !pet.mealsPerDay || pet.mealsPerDay <= 0 || pet.totalInventory <= 0) {
    return { consumed: 0, reason: 'No inventory or meals configured' };
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
      return { consumed: 0, reason: 'No full days elapsed' };
    }
    totalMealsToConsume = diffDays * pet.mealsPerDay;
    
    // Verificar si ya existen rebajos manuales en este período para evitar duplicación
    const startDate = new Date(lastDay);
    const endDate = new Date(nowDay);
    const manualConsumptions = await ConsumptionHistory.find({
      user: userId,
      pet: pet._id,
      consumptionType: 'manual',
      consumptionDate: { $gte: startDate, $lt: endDate }
    });
    
    // Reducir las comidas ya consumidas manualmente
    const manualMealsConsumed = manualConsumptions.reduce((total, record) => total + (record.bagsConsumed || 0), 0);
    totalMealsToConsume = Math.max(0, totalMealsToConsume - manualMealsConsumed);
    
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
      return { consumed: 0, reason: 'Invalid feeding times format' };
    }

    const cursor = new Date(last);
    const end = now;
    const mealEvents = [];

    // Recopilar todos los eventos de comida que deberían haber ocurrido
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
          mealEvents.push(event);
        }
      }
      day.setDate(day.getDate() + 1);
    }
    
    totalMealsToConsume = mealEvents.length;
    
    // Verificar rebajos manuales para los días que contienen estos eventos
    if (mealEvents.length > 0) {
      const firstEventDate = new Date(mealEvents[0].getFullYear(), mealEvents[0].getMonth(), mealEvents[0].getDate());
      const lastEventDate = new Date(mealEvents[mealEvents.length - 1].getFullYear(), mealEvents[mealEvents.length - 1].getMonth(), mealEvents[mealEvents.length - 1].getDate());
      
      const manualConsumptions = await ConsumptionHistory.find({
        user: userId,
        pet: pet._id,
        consumptionType: 'manual', 
        consumptionDate: { $gte: firstEventDate, $lte: lastEventDate }
      });
      
      // Reducir las comidas ya consumidas manualmente
      const manualMealsConsumed = manualConsumptions.reduce((total, record) => total + (record.bagsConsumed || 0), 0);
      totalMealsToConsume = Math.max(0, totalMealsToConsume - manualMealsConsumed);
    }
  }

  if (totalMealsToConsume <= 0) {
    return { consumed: 0, reason: 'No meals to consume after checking manual consumption' };
  }

  // Limitar el consumo al inventario disponible
  const mealsToConsume = Math.min(totalMealsToConsume, pet.totalInventory);
  
  if (mealsToConsume <= 0) {
    return { consumed: 0, reason: 'No inventory available' };
  }

  // Reducir del inventario total de la mascota
  const oldInventory = pet.totalInventory;
  pet.totalInventory -= mealsToConsume;
  pet.consumedCount = (pet.consumedCount || 0) + mealsToConsume;
  
  // Actualizar la fecha de última actualización (zona horaria Costa Rica)
  pet.lastInventoryUpdate = now;
  await pet.save();

  // Crear registro en el historial de consumo
  // Buscar una bolsa representativa para obtener los ingredientes
  const representativeBag = await Bag.findOne({
    user: userId,
    pet: pet._id,
    isComplete: true
  }).populate('ingredients.ingredient');

  if (representativeBag && representativeBag.ingredients) {
    // Crear fecha sin hora para el registro de consumo (solo día) - zona horaria Costa Rica
    const consumptionDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const ingredientBag of representativeBag.ingredients) {
      // Validar valores para evitar NaN
      const gramsPerBag = Number(ingredientBag.gramsPerBag) || 0;
      const gramsConsumed = gramsPerBag * mealsToConsume;
      
      // Solo crear registro si tenemos valores válidos
      if (gramsConsumed > 0 && ingredientBag.ingredient && ingredientBag.ingredient._id) {
        // Buscar si ya existe un registro automático para este día, mascota e ingrediente
        const existingHistory = await ConsumptionHistory.findOne({
          user: userId,
          pet: pet._id,
          ingredient: ingredientBag.ingredient._id,
          consumptionDate: consumptionDate,
          consumptionType: 'automatic'
        });

        if (existingHistory) {
          // Actualizar el registro existente
          existingHistory.gramsConsumed += gramsConsumed;
          existingHistory.bagsConsumed += mealsToConsume;
          await existingHistory.save();
        } else {
          // Crear nuevo registro (solo si no hay registro manual para evitar duplicidad)
          const manualRecord = await ConsumptionHistory.findOne({
            user: userId,
            pet: pet._id,
            ingredient: ingredientBag.ingredient._id,
            consumptionDate: consumptionDate,
            consumptionType: 'manual'
          });
          
          if (!manualRecord) {
            await ConsumptionHistory.create({
              user: userId,
              pet: pet._id,
              ingredient: ingredientBag.ingredient._id,
              bag: representativeBag._id,
              gramsConsumed: gramsConsumed,
              bagsConsumed: mealsToConsume,
              consumptionDate,
              consumptionType: 'automatic'
            });
          }
        }
      }
    }
  }

  return {
    consumed: mealsToConsume,
    oldInventory,
    newInventory: pet.totalInventory,
    reason: `Consumed ${mealsToConsume} meals based on feeding schedule (excluded manual entries)`
  };
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
    const { name, age, birthDate, mealsPerDay = 1, maxIngredientsPerBag = 5, totalInventory = 0, feedingTimes = [] } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nombre es obligatorio' });
    }

    // Calcular edad si se proporciona birthDate, si no usar age directamente
    let finalAge = age || 0;
    let finalBirthDate = null;
    
    if (birthDate) {
      finalBirthDate = new Date(birthDate);
      finalAge = calculateAge(finalBirthDate);
    } else if (age === undefined) {
      return res.status(400).json({ message: 'Fecha de nacimiento o edad son obligatorios' });
    }

    const pet = await Pet.create({
      user: req.user._id,
      name,
      age: finalAge,
      birthDate: finalBirthDate,
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
    const { name, age, birthDate, mealsPerDay, maxIngredientsPerBag, feedingTimes, totalInventory } = req.body;

    // Calcular edad si se proporciona birthDate
    let finalAge = age;
    let finalBirthDate = birthDate ? new Date(birthDate) : undefined;
    
    if (birthDate) {
      finalAge = calculateAge(finalBirthDate);
    }

    const updateData = { 
      name, 
      age: finalAge, 
      mealsPerDay, 
      maxIngredientsPerBag, 
      feedingTimes 
    };
    
    // Solo incluir birthDate si está presente en el request
    if (birthDate !== undefined) {
      updateData.birthDate = finalBirthDate;
    }
    
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
// consume mealsPerDay del inventario total de la mascota
router.post('/:id/feed-day', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.id, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const meals = Number(pet.mealsPerDay) || 0;
    if (meals <= 0) {
      return res.status(400).json({ message: 'mealsPerDay debe ser mayor que 0 para registrar un día de comida' });
    }

    if (pet.totalInventory < meals) {
      return res.status(400).json({ 
        message: `Inventario insuficiente. Necesitas ${meals} bolsas pero solo tienes ${pet.totalInventory}` 
      });
    }

    // Obtener tiempo actual en zona horaria de Costa Rica (UTC-6)
    const nowCostaRica = getCostaRicaDate();

    // Consumir del inventario total
    pet.totalInventory -= meals;
    pet.consumedCount += meals;
    // IMPORTANTE: Actualizar lastInventoryUpdate para evitar que el proceso automático se ejecute hasta mañana
    pet.lastInventoryUpdate = nowCostaRica;
    await pet.save();

    // Registrar en el historial (consumo manual) - usar zona horaria de Costa Rica
    const consumptionDate = new Date(nowCostaRica);
    consumptionDate.setHours(0, 0, 0, 0);
    
    // Buscar una bolsa representativa para los ingredientes
    const representativeBag = await Bag.findOne({ 
      user: req.user._id, 
      pet: pet._id,
      isComplete: true 
    }).populate('ingredients.ingredient');
    
    if (representativeBag && representativeBag.ingredients) {
      for (const ingredientBag of representativeBag.ingredients) {
        // Validar valores para evitar NaN
        const gramsPerBag = Number(ingredientBag.gramsPerBag) || 0;
        const gramsConsumed = gramsPerBag * meals;
        
        // Solo crear el registro si tenemos valores válidos
        if (gramsConsumed > 0 && ingredientBag.ingredient && ingredientBag.ingredient._id) {
          await ConsumptionHistory.create({
            user: req.user._id,
            pet: pet._id,
            ingredient: ingredientBag.ingredient._id,
            bag: representativeBag._id,
            gramsConsumed: gramsConsumed,
            bagsConsumed: meals,
            consumptionDate,
            consumptionType: 'manual'
          });
        }
      }
    }

    res.json({
      message: `Se registró un día de comida para ${pet.name}`,
      petId: pet._id,
      mealsRequested: meals,
      mealsConsumed: meals,
      remainingInventory: pet.totalInventory,
      lastInventoryUpdate: pet.lastInventoryUpdate, // Incluir para debugging
      timezone: 'Costa Rica (UTC-6)'
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint para automatización (cron job) - rebaja inventario de todos los usuarios
// Se puede configurar para ejecutarse a medianoche
router.post('/system/auto-inventory-update', async (req, res, next) => {
  try {
    // Este endpoint no requiere autenticación ya que es para sistema
    // Pero puedes añadir un token de sistema para seguridad
    const { systemToken } = req.body;
    
    // Opcional: validar token de sistema
    // if (systemToken !== process.env.SYSTEM_TOKEN) {
    //   return res.status(401).json({ message: 'Token de sistema inválido' });
    // }

    const now = getCostaRicaDate();
    console.log(`[${now.toISOString()}] Iniciando rebajo automático de inventario para todos los usuarios (Zona horaria: Costa Rica UTC-6)`);

    // Obtener todas las mascotas de todos los usuarios
    const allPets = await Pet.find({}).populate('user');
    
    const results = {
      totalPets: allPets.length,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const pet of allPets) {
      try {
        const result = await applyInventoryAutoUpdateForPet(pet, pet.user._id);
        if (result.consumed > 0) {
          results.updated++;
          console.log(`✓ ${pet.name} (${pet.user.email}): ${result.consumed} comidas consumidas`);
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push({
          petId: pet._id,
          petName: pet.name,
          userEmail: pet.user.email,
          error: error.message
        });
        console.error(`✗ Error con ${pet.name} (${pet.user.email}):`, error.message);
      }
    }

    console.log(`[${now.toISOString()}] Rebajo automático completado:`, results);

    res.json({
      message: 'Rebajo automático de inventario completado',
      timestamp: now,
      results
    });
  } catch (error) {
    console.error('Error en rebajo automático del sistema:', error);
    next(error);
  }
});

// Forzar rebajo automático manual para una mascota específica
router.post('/:id/force-inventory-update', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.id, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    // Verificar si ya se actualizó hoy
    const nowCostaRica = getCostaRicaDate();
    const today = new Date(nowCostaRica.getFullYear(), nowCostaRica.getMonth(), nowCostaRica.getDate());
    const lastUpdateDate = pet.lastInventoryUpdate ? 
      new Date(pet.lastInventoryUpdate.getFullYear(), pet.lastInventoryUpdate.getMonth(), pet.lastInventoryUpdate.getDate()) :
      null;

    if (lastUpdateDate && lastUpdateDate.getTime() >= today.getTime()) {
      return res.json({
        message: 'El inventario ya fue actualizado hoy',
        petName: pet.name,
        result: { consumed: 0, reason: 'Already updated today', lastUpdate: pet.lastInventoryUpdate }
      });
    }

    const result = await applyInventoryAutoUpdateForPet(pet, req.user._id);
    
    res.json({
      message: result.consumed > 0 ? 
        `Inventario actualizado. Se consumieron ${result.consumed} comidas` : 
        'No hay comidas pendientes por consumir',
      petName: pet.name,
      result: {
        ...result,
        consumedMeals: result.consumed,
        currentInventory: pet.totalInventory,
        lastUpdate: pet.lastInventoryUpdate
      }
    });
  } catch (error) {
    console.error('Error en force-inventory-update:', error);
    next(error);
  }
});

// Obtener información de la última actualización de inventario para todas las mascotas
router.get('/inventory-status', async (req, res, next) => {
  try {
    const pets = await Pet.find({ user: req.user._id }).select(
      'name totalInventory mealsPerDay feedingTimes lastInventoryUpdate createdAt'
    );

    const now = getCostaRicaDate(); // Usar zona horaria de Costa Rica

    const inventoryStatus = pets.map(pet => {
      const lastUpdate = pet.lastInventoryUpdate || pet.createdAt;
      const timeDiffMs = now - lastUpdate;
      const minutesSinceUpdate = Math.floor(timeDiffMs / (1000 * 60));
      const hoursSinceUpdate = Math.floor(minutesSinceUpdate / 60);
      
      // Formatear tiempo transcurrido de manera más precisa
      let timeAgoText;
      if (minutesSinceUpdate < 60) {
        timeAgoText = `${minutesSinceUpdate} min`;
      } else if (hoursSinceUpdate < 24) {
        const remainingMinutes = minutesSinceUpdate % 60;
        timeAgoText = remainingMinutes > 0 ? `${hoursSinceUpdate}h ${remainingMinutes}min` : `${hoursSinceUpdate}h`;
      } else {
        const days = Math.floor(hoursSinceUpdate / 24);
        const remainingHours = hoursSinceUpdate % 24;
        timeAgoText = remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
      }
      
      return {
        petId: pet._id,
        petName: pet.name,
        totalInventory: pet.totalInventory,
        mealsPerDay: pet.mealsPerDay,
        feedingTimes: pet.feedingTimes || [],
        lastInventoryUpdate: lastUpdate,
        hoursSinceUpdate, // Mantener para compatibilidad
        minutesSinceUpdate,
        timeAgoText,
        needsUpdate: hoursSinceUpdate >= 24 // Sugerir actualización si han pasado más de 24 horas
      };
    });

    res.json({
      pets: inventoryStatus,
      lastChecked: now,
      serverTime: now.toISOString(),
      timezone: 'America/Costa_Rica (UTC-6)'
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

