import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargamos variables de entorno para obtener el prefijo de colecciones
dotenv.config();

const consumptionHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true, index: true },
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
    bag: { type: mongoose.Schema.Types.ObjectId, ref: 'Bag', required: true },
    // Gramos consumidos en esta fecha
    gramsConsumed: { 
      type: Number, 
      required: true, 
      min: 0,
      validate: {
        validator: function(value) {
          return !isNaN(value) && isFinite(value);
        },
        message: 'gramsConsumed debe ser un número válido'
      }
    },
    // Fecha del consumo (sin hora para poder agrupar por día)
    consumptionDate: { type: Date, required: true, index: true },
    // Referencia a cuántas bolsas se consumieron
    bagsConsumed: { 
      type: Number, 
      default: 1, 
      min: 0,
      validate: {
        validator: function(value) {
          return !isNaN(value) && isFinite(value);
        },
        message: 'bagsConsumed debe ser un número válido'
      }
    },
    // Tipo de consumo: 'automatic' (por sistema), 'manual' (ajuste manual), 'inventory_add' (agregar inventario)
    consumptionType: { 
      type: String, 
      enum: ['automatic', 'manual', 'inventory_add'], 
      default: 'automatic' 
    }
  },
  { timestamps: true },
);

// Índice compuesto para consultas eficientes por usuario, mascota y fecha
consumptionHistorySchema.index({ user: 1, pet: 1, consumptionDate: -1 });
consumptionHistorySchema.index({ user: 1, ingredient: 1, consumptionDate: -1 });

// Nombre de la colección con prefijo configurable desde .env (PREFIX)
const prefix = process.env.PREFIX || 'barf';
const consumptionHistoryCollectionName = `${prefix}_consumption_history`;
const ConsumptionHistory = mongoose.model('ConsumptionHistory', consumptionHistorySchema, consumptionHistoryCollectionName);

export default ConsumptionHistory;