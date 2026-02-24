import { Router } from 'express';
import Ingredient from '../models/Ingredient.js';
import { authRequired } from '../middleware/auth.js';

// Rutas para gestionar los ingredientes del usuario autenticado
const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Devuelve todos los ingredientes del usuario
router.get('/', async (req, res, next) => {
  try {
    const items = await Ingredient.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// Crea un nuevo ingrediente vinculado al usuario
router.post('/', async (req, res, next) => {
  try {
    const { name, code, desiredPortions = 0 } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Nombre y código son obligatorios' });
    }

    const ingredient = await Ingredient.create({
      user: req.user._id,
      name,
      code,
      desiredPortions,
    });

    res.status(201).json(ingredient);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ya existe un ingrediente con ese código' });
    }
    next(error);
  }
});

// Actualiza los datos de un ingrediente existente
router.put('/:id', async (req, res, next) => {
  try {
    const { name, code, desiredPortions } = req.body;
    const ingredient = await Ingredient.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name, code, desiredPortions },
      { returnDocument: 'after', runValidators: true },
    );

    if (!ingredient) {
      return res.status(404).json({ message: 'Ingrediente no encontrado' });
    }

    res.json(ingredient);
  } catch (error) {
    next(error);
  }
});

// Elimina un ingrediente del usuario
router.delete('/:id', async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!ingredient) {
      return res.status(404).json({ message: 'Ingrediente no encontrado' });
    }

    // Nota: la actualización de bolsas que contengan este ingrediente
    // se gestionará en la ruta de bolsas para simplificar este ejemplo,
    // o en un servicio separado si se quiere una lógica más sofisticada.

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

