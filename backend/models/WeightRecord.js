import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const weightRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true, index: true },
    date: { type: Date, required: true },
    weight: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

weightRecordSchema.index({ pet: 1, date: 1 }, { unique: true });

const prefix = process.env.PREFIX || 'barf';
const collectionName = `${prefix}_weightrecords`;
const WeightRecord = mongoose.model('WeightRecord', weightRecordSchema, collectionName);

export default WeightRecord;
