import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';

// Rutas de configuración de la aplicación por usuario
const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Devuelve información general del sistema
router.get('/settings', async (req, res, next) => {
  try {
    res.json({
      message: 'Las configuraciones específicas como el máximo de ingredientes por bolsa ahora se configuran por mascota.',
      defaultMaxIngredients: 5,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

