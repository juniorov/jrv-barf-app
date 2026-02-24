import { Router } from 'express';
import Bag from '../models/Bag.js';
import Ingredient from '../models/Ingredient.js';
import Pet from '../models/Pet.js';
import ConsumptionHistory from '../models/ConsumptionHistory.js';
import { authRequired } from '../middleware/auth.js';
import { applyInventoryAutoUpdateForPet } from './pet.routes.js';

// Rutas para gestionar las bolsas o platos incompletos
const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Devuelve todas las bolsas (incompletas y completadas) del usuario
// Opcionalmente se puede filtrar por mascota con query ?pet=<petId>
router.get('/', async (req, res, next) => {
  try {
    // Aplicar rebajo automático para todas las mascotas del usuario antes de mostrar bolsas
    const userPets = await Pet.find({ user: req.user._id });
    for (const pet of userPets) {
      await applyInventoryAutoUpdateForPet(pet, req.user._id);
    }

    const filter = { user: req.user._id };
    if (req.query.pet) {
      filter.pet = req.query.pet;
    }

    const bags = await Bag.find(filter)
      .populate('ingredients.ingredient')
      .populate('pet')
      .sort({ createdAt: -1 });
    res.json(bags);
  } catch (error) {
    next(error);
  }
});

// Crea una nueva bolsa comprobando el máximo de ingredientes permitido y la validez de los IDs
router.post('/', async (req, res, next) => {
  try {
    const { name, ingredients, quantity, pet } = req.body;

    if (!name || !Array.isArray(ingredients) || !ingredients.length || !quantity) {
      return res
        .status(400)
        .json({ message: 'Nombre, ingredientes y cantidad son obligatorios' });
    }

    // Determinar el máximo de ingredientes permitidos
    let maxIngredientsAllowed = 5; // Valor por defecto
    let petId = null;
    
    // Si viene una mascota, validamos que exista y usamos su límite de ingredientes
    if (pet) {
      const foundPet = await Pet.findOne({ _id: pet, user: req.user._id });
      if (!foundPet) {
        return res.status(400).json({ message: 'Mascota inválida o que no pertenece al usuario' });
      }
      petId = foundPet._id;
      maxIngredientsAllowed = foundPet.maxIngredientsPerBag || 5;
    }

    if (ingredients.length > maxIngredientsAllowed) {
      const context = pet ? 'esta mascota' : 'tu usuario';
      return res
        .status(400)
        .json({ message: `Máximo ${maxIngredientsAllowed} ingredientes por bolsa configurado para ${context}` });
    }

    const ingredientIds = ingredients.map((i) => i.ingredient);
    const existing = await Ingredient.find({
      _id: { $in: ingredientIds },
      user: req.user._id,
    }).select('_id');

    if (existing.length !== ingredientIds.length) {
      return res.status(400).json({ message: 'Hay ingredientes inválidos o que no pertenecen al usuario' });
    }

    const bag = await Bag.create({
      user: req.user._id,
      name,
      ingredients,
      quantity,
      pet: petId,
    });

    const populated = await bag.populate(['ingredients.ingredient', 'pet']);

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

// Actualiza una bolsa existente respetando el máximo de ingredientes configurado
router.put('/:id', async (req, res, next) => {
  try {
    const { name, ingredients, quantity, pet } = req.body;

    // Determinar el máximo de ingredientes permitidos
    let maxIngredientsAllowed = 5; // Valor por defecto
    
    // Si viene una mascota, validamos que exista y usamos su límite de ingredientes
    if (pet) {
      const foundPet = await Pet.findOne({ _id: pet, user: req.user._id });
      if (!foundPet) {
        return res.status(400).json({ message: 'Mascota inválida o que no pertenece al usuario' });
      }
      maxIngredientsAllowed = foundPet.maxIngredientsPerBag || 5;
    }

    if (ingredients && ingredients.length > maxIngredientsAllowed) {
      const context = pet ? 'esta mascota' : 'tu usuario';
      return res
        .status(400)
        .json({ message: `Máximo ${maxIngredientsAllowed} ingredientes por bolsa configurado para ${context}` });
    }

    const update = { name, ingredients, quantity };

    // Actualizar la mascota asociada
    if (pet) {
      const foundPet = await Pet.findOne({ _id: pet, user: req.user._id }).select('_id');
      if (!foundPet) {
        return res.status(400).json({ message: 'Mascota inválida o que no pertenece al usuario' });
      }
      update.pet = foundPet._id;
    } else if (pet === null) {
      // Permite desasociar la mascota si se envía pet: null
      update.pet = null;
    }

    const bag = await Bag.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      { returnDocument: 'after', runValidators: true },
    ).populate(['ingredients.ingredient', 'pet']);

    if (!bag) {
      return res.status(404).json({ message: 'Bolsa no encontrada' });
    }

    res.json(bag);
  } catch (error) {
    next(error);
  }
});

// Elimina una bolsa del usuario
router.delete('/:id', async (req, res, next) => {
  try {
    const bag = await Bag.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!bag) {
      return res.status(404).json({ message: 'Bolsa no encontrada' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Marca una bolsa como completada y aumenta el inventario de la mascota
router.post('/:id/complete', async (req, res, next) => {
  try {
    const bag = await Bag.findOne({ _id: req.params.id, user: req.user._id }).populate('pet');
    if (!bag) {
      return res.status(404).json({ message: 'Bolsa no encontrada' });
    }

    if (!bag.pet) {
      return res.status(400).json({ message: 'La bolsa debe estar asociada a una mascota para completarla' });
    }

    // Marcar como completada y sumar al inventario total de la mascota
    bag.isComplete = true;
    await bag.save();

    // Aumentar el inventario total de la mascota
    bag.pet.totalInventory += bag.quantity;
    await bag.pet.save();

    // Registrar en el historial de consumo (agregar al inventario)
    const consumptionDate = new Date();
    consumptionDate.setHours(0, 0, 0, 0); // Solo la fecha, sin hora

    for (const ingredientBag of bag.ingredients) {
      // Validar que tenemos un ingrediente válido
      if (ingredientBag.ingredient) {
        await ConsumptionHistory.create({
          user: req.user._id,
          pet: bag.pet._id,
          ingredient: ingredientBag.ingredient,
          bag: bag._id,
          gramsConsumed: 0, // Se agregó al inventario, no se consumió
          bagsConsumed: 0,
          consumptionDate,
          consumptionType: 'inventory_add'
        });
      }
    }

    const populated = await bag.populate('ingredients.ingredient');
    res.json({
      bag: populated,
      newInventory: bag.pet.totalInventory,
      message: `${bag.quantity} bolsas agregadas al inventario de ${bag.pet.name}`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

