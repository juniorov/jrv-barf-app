import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargamos variables de entorno para obtener el prefijo de colecciones
dotenv.config();

const ingredientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    desiredPortions: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ingredientSchema.index({ user: 1, code: 1 }, { unique: true });

// Nombre de la colección de ingredientes con prefijo configurable desde .env (PREFIX)
const prefix = process.env.PREFIX || 'barf';
const ingredientCollectionName = `${prefix}_ingredients`;
const Ingredient = mongoose.model('Ingredient', ingredientSchema, ingredientCollectionName);

export default Ingredient;

