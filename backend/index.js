import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './database.js';
import authRoutes from './routes/auth.routes.js';
import ingredientRoutes from './routes/ingredient.routes.js';
import bagRoutes from './routes/bag.routes.js';
import configRoutes from './routes/config.routes.js';
import petRoutes from './routes/pet.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { startInventoryAutoUpdateCron } from './cron-inventory-update.js';

// Cargamos variables de entorno necesarias para la API
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 4000;
// Configuramos CORS para permitir llamadas desde el frontend
// Permitimos múltiples orígenes para desarrollo y producción
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://foodbarf.netlify.app',
  process.env.CORS_ORIGIN // Permite configurar un origen personalizado
].filter(Boolean); // Elimina valores undefined/null

console.log('Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      console.log('CORS request from origin:', origin);
      // Permitir requests sin origen (ej: aplicaciones móviles, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        console.log('CORS: Origin allowed');
        return callback(null, true);
      } else {
        console.log('CORS: Origin blocked');
        return callback(new Error('No permitido por política CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    preflightContinue: false,
    optionsSuccessStatus: 200
  }),
);

// Middleware para parsear JSON - NECESARIO para que req.body funcione
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware adicional para manejar preflight requests manualmente si es necesario
app.options('*', (req, res) => {
  console.log('Manual OPTIONS request handled for:', req.path);
  res.sendStatus(200);
});
// Rutas de la API separadas por dominio funcional
app.use('/api/auth', authRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/bags', bagRoutes);
app.use('/api/config', configRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
  
  // Iniciar el cron job para el rebajo automático del inventario
  startInventoryAutoUpdateCron();
});

