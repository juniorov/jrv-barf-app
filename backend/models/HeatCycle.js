import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const heatCycleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true, index: true },
    startDate: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

heatCycleSchema.index({ pet: 1, startDate: 1 }, { unique: true });

const prefix = process.env.PREFIX || 'barf';
const collectionName = `${prefix}_heatcycles`;
const HeatCycle = mongoose.model('HeatCycle', heatCycleSchema, collectionName);

export default HeatCycle;
