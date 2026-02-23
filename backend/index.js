import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './database.js';
import authRoutes from './routes/auth.routes.js';
import ingredientRoutes from './routes/ingredient.routes.js';
import bagRoutes from './routes/bag.routes.js';
import configRoutes from './routes/config.routes.js';
import petRoutes from './routes/pet.routes.js';

// Cargamos variables de entorno necesarias para la API
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
// Configuramos CORS para permitir llamadas desde el frontend (por defecto Vite en 5173)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);

// Middleware para parsear JSON en el body de las peticiones
app.use(express.json());

// Endpoint sencillo para comprobar que la API está viva
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rutas de la API separadas por dominio funcional
app.use('/api/auth', authRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/bags', bagRoutes);
app.use('/api/config', configRoutes);
app.use('/api/pets', petRoutes);

// Middleware de manejo de errores centralizado
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  });
});

// Arrancamos el servidor HTTP en el puerto configurado
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

