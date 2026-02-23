import { Router } from 'express';
import Bag from '../models/Bag.js';
import Ingredient from '../models/Ingredient.js';
import Pet from '../models/Pet.js';
import { authRequired } from '../middleware/auth.js';

// Rutas para gestionar las bolsas o platos incompletos
const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Devuelve todas las bolsas (incompletas y completadas) del usuario
// Opcionalmente se puede filtrar por mascota con query ?pet=<petId>
router.get('/', async (req, res, next) => {
  try {
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
    const max = req.user.maxIngredientsPerBag;

    if (!name || !Array.isArray(ingredients) || !ingredients.length || !quantity) {
      return res
        .status(400)
        .json({ message: 'Nombre, ingredientes y cantidad son obligatorios' });
    }

    if (ingredients.length > max) {
      return res
        .status(400)
        .json({ message: `Máximo ${max} ingredientes por bolsa configurado para tu usuario` });
    }

    const ingredientIds = ingredients.map((i) => i.ingredient);
    const existing = await Ingredient.find({
      _id: { $in: ingredientIds },
      user: req.user._id,
    }).select('_id');

    if (existing.length !== ingredientIds.length) {
      return res.status(400).json({ message: 'Hay ingredientes inválidos o que no pertenecen al usuario' });
    }

    // Si viene una mascota, validamos que exista y pertenezca al usuario
    let petId = null;
    if (pet) {
      const foundPet = await Pet.findOne({ _id: pet, user: req.user._id }).select('_id');
      if (!foundPet) {
        return res.status(400).json({ message: 'Mascota inválida o que no pertenece al usuario' });
      }
      petId = foundPet._id;
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

    if (ingredients && ingredients.length > req.user.maxIngredientsPerBag) {
      return res
        .status(400)
        .json({ message: `Máximo ${req.user.maxIngredientsPerBag} ingredientes por bolsa configurado para tu usuario` });
    }

    const update = { name, ingredients, quantity };

    // Si viene una mascota, validamos que exista y pertenezca al usuario
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
      { new: true, runValidators: true },
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

// Marca una bolsa como completada e incrementa el contador de bolsas completadas
router.post('/:id/complete', async (req, res, next) => {
  try {
    const bag = await Bag.findOne({ _id: req.params.id, user: req.user._id });
    if (!bag) {
      return res.status(404).json({ message: 'Bolsa no encontrada' });
    }

    bag.completedCount += bag.quantity;
    bag.isCompleted = true;
    await bag.save();

    const populated = await bag.populate('ingredients.ingredient');

    res.json(populated);
  } catch (error) {
    next(error);
  }
});

export default router;

