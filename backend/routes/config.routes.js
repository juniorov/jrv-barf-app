import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';

// Rutas de configuración de la aplicación por usuario
const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Devuelve la configuración actual del usuario (máximo de ingredientes por bolsa)
router.get('/settings', async (req, res, next) => {
  try {
    res.json({
      maxIngredientsPerBag: req.user.maxIngredientsPerBag,
    });
  } catch (error) {
    next(error);
  }
});

// Actualiza la configuración del usuario (máximo de ingredientes por bolsa)
router.put('/settings', async (req, res, next) => {
  try {
    const { maxIngredientsPerBag } = req.body;

    if (!maxIngredientsPerBag || maxIngredientsPerBag < 1) {
      return res.status(400).json({ message: 'maxIngredientsPerBag debe ser un número positivo' });
    }

    req.user.maxIngredientsPerBag = maxIngredientsPerBag;
    await req.user.save();

    res.json({
      maxIngredientsPerBag: req.user.maxIngredientsPerBag,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

