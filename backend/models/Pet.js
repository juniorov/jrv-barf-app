import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargamos variables de entorno para obtener el prefijo de colecciones
dotenv.config();

const petSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    // Número de comidas (bolsas) que recibe esta mascota al día
    mealsPerDay: { type: Number, default: 1, min: 0 },
    // Máximo número de ingredientes permitidos por bolsa para esta mascota
    maxIngredientsPerBag: { type: Number, default: 5, min: 1, max: 20 },
    // Inventario total de bolsas completas disponibles para esta mascota
    totalInventory: { type: Number, default: 0, min: 0 },
    // Número de bolsas consumidas (para estadísticas)
    consumedCount: { type: Number, default: 0, min: 0 },
    // Horas aproximadas en las que come (ej: ["08:00","20:00"])
    feedingTimes: [{ type: String }],
    // Última vez que se actualizó el inventario automático para esta mascota
    lastInventoryUpdate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Un mismo usuario no debería tener dos mascotas con el mismo nombre
petSchema.index({ user: 1, name: 1 }, { unique: true });

// Nombre de la colección de mascotas con prefijo configurable desde .env (PREFIX)
const prefix = process.env.PREFIX || 'barf';
const petCollectionName = `${prefix}_pets`;
const Pet = mongoose.model('Pet', petSchema, petCollectionName);

export default Pet;

