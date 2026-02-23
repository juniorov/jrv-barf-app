import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware que protege rutas verificando un token JWT en el header Authorization
export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Extraemos el token sin el prefijo "Bearer "
    const token = header.replace('Bearer ', '');
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ message: 'Falta JWT_SECRET en el servidor' });
    }

    // Verificamos la firma y expiración del token
    const payload = jwt.verify(token, secret);
    // Recuperamos el usuario asociado al id incluido en el payload del token
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function createToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  // Generamos un token firmado con el id del usuario y una expiración configurable
  return jwt.sign({ id: user._id }, secret, { expiresIn });
}

