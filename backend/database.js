import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargamos variables de entorno de .env (URI_MONGO, MONGO_DB_NAME, etc.)
dotenv.config();

// Cadena de conexión a MongoDB (por ejemplo, un cluster de Atlas)
const uri = process.env.URI_MONGO || process.env.MONGO_URI;
// Nombre de la base de datos lógica donde se guardan las colecciones de la app
const dbName = process.env.MONGO_DB_NAME || 'foodBarf';

if (!uri) {
  console.error('No Mongo URI provided. Set URI_MONGO or MONGO_URI in .env');
  process.exit(1);
}

// Activamos modo estricto en consultas para evitar filtros con campos no definidos
mongoose.set('strictQuery', true);

// Establecemos la conexión global de Mongoose a la base de datos indicada
mongoose
  .connect(uri, { dbName })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
    process.exit(1);
  });

