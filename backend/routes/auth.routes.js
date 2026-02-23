import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { createToken, authRequired } from '../middleware/auth.js';

// Rutas de autenticación: registro, login y recuperación de contraseña
const router = Router();

// Registro de usuario nuevo con email y contraseña
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
    }

    const user = await User.create({ email, password });
    const token = createToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});
// Inicio de sesión de un usuario existente
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});
// Devuelve los datos del usuario autenticado a partir del token
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const { _id, email } = req.user;
    res.json({ id: _id, email });
  } catch (error) {
    next(error);
  }
});
// Solicitud de recuperación de contraseña (genera un token de un solo uso)
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email es obligatorio' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // No revelamos si el usuario existe o no
      return res.json({ message: 'Si el email existe, se enviará un enlace de recuperación' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60); // 1h
    await user.save();

    // Aquí normalmente enviarías un email con el token
    console.log(`Token de recuperación para ${email}: ${token}`);

    res.json({ message: 'Se ha generado un enlace de recuperación (revisa la consola del servidor en este demo)' });
  } catch (error) {
    next(error);
  }
});
// Restablece la contraseña usando el token generado en la solicitud anterior
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token y nueva contraseña son obligatorios' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
});

export default router;

