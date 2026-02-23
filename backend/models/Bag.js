import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargamos variables de entorno para obtener el prefijo de colecciones
dotenv.config();

const bagIngredientSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    gramsPerBag: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const bagSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Mascota a la que pertenece esta bolsa/plato (opcional)
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
    name: { type: String, required: true, trim: true },
    ingredients: {
      type: [bagIngredientSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'La bolsa debe contener al menos un ingrediente',
      },
    },
    // Cantidad de bolsas de este tipo que se pueden hacer
    quantity: { type: Number, required: true, min: 1 },
    // Indica si es una receta completa (true) o incompleta (false)
    isComplete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Nombre de la colección de bolsas con prefijo configurable desde .env (PREFIX)
const prefix = process.env.PREFIX || 'barf';
const bagCollectionName = `${prefix}_bags`;
const Bag = mongoose.model('Bag', bagSchema, bagCollectionName);

export default Bag;

