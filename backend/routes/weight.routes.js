import { Router } from 'express';
import WeightRecord from '../models/WeightRecord.js';
import Pet from '../models/Pet.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

router.get('/:petId', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.petId, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const records = await WeightRecord.find({ user: req.user._id, pet: req.params.petId })
      .sort({ date: 1 })
      .lean();

    res.json({ pet: { name: pet.name, _id: pet._id }, records });
  } catch (error) {
    next(error);
  }
});

router.post('/:petId', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.petId, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const { date, weight, chestGirth, rearGirth, notes } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'La fecha es obligatoria' });
    }

    const weightValue = Number(weight);
    if (weight === undefined || weight === null || weight === '' || isNaN(weightValue) || weightValue <= 0) {
      return res.status(400).json({ message: 'El peso debe ser un número mayor a 0' });
    }

    let chestGirthValue;
    if (chestGirth !== undefined && chestGirth !== null && chestGirth !== '') {
      chestGirthValue = Number(chestGirth);
      if (isNaN(chestGirthValue) || chestGirthValue <= 0) {
        return res.status(400).json({ message: 'La parte torácica (PT) debe ser un número mayor a 0' });
      }
    }

    let rearGirthValue;
    if (rearGirth !== undefined && rearGirth !== null && rearGirth !== '') {
      rearGirthValue = Number(rearGirth);
      if (isNaN(rearGirthValue) || rearGirthValue <= 0) {
        return res.status(400).json({ message: 'La parte posterior (PP) debe ser un número mayor a 0' });
      }
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const existing = await WeightRecord.findOne({
      user: req.user._id,
      pet: req.params.petId,
      date: parsed,
    });
    if (existing) {
      return res.status(409).json({ message: 'Ya existe un registro de peso con esa fecha' });
    }

    const record = await WeightRecord.create({
      user: req.user._id,
      pet: req.params.petId,
      date: parsed,
      weight: weightValue,
      chestGirth: chestGirthValue,
      rearGirth: rearGirthValue,
      notes: notes || '',
    });

    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const record = await WeightRecord.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!record) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
