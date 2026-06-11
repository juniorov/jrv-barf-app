import { Router } from 'express';
import HeatCycle from '../models/HeatCycle.js';
import Pet from '../models/Pet.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

const SIZE_CONFIG = {
  small:   { label: 'Pequeña', min: 150, max: 210, default: 180 },
  medium:  { label: 'Mediana', min: 180, max: 240, default: 210 },
  large:   { label: 'Grande',  min: 210, max: 270, default: 240 },
  giant:   { label: 'Gigante', min: 240, max: 300, default: 270 },
};

function daysBetween(a, b) {
  const ms = Math.abs(new Date(b) - new Date(a));
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  const sq = arr.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(sq / arr.length);
}

function formatDate(d) {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

router.get('/:petId', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.petId, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const cycles = await HeatCycle.find({ user: req.user._id, pet: req.params.petId })
      .sort({ startDate: 1 })
      .lean();

    res.json({ pet: { name: pet.name, _id: pet._id }, cycles });
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

    const { startDate, notes } = req.body;
    if (!startDate) {
      return res.status(400).json({ message: 'La fecha de inicio del celo es obligatoria' });
    }

    const parsed = new Date(startDate);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const existing = await HeatCycle.findOne({
      user: req.user._id,
      pet: req.params.petId,
      startDate: parsed,
    });
    if (existing) {
      return res.status(409).json({ message: 'Ya existe un registro con esa fecha' });
    }

    const cycle = await HeatCycle.create({
      user: req.user._id,
      pet: req.params.petId,
      startDate: parsed,
      notes: notes || '',
    });

    res.status(201).json(cycle);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const cycle = await HeatCycle.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!cycle) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:petId/predict', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.petId, user: req.user._id });
    if (!pet) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const cycles = await HeatCycle.find({ user: req.user._id, pet: req.params.petId })
      .sort({ startDate: 1 })
      .lean();

    const dates = cycles.map(c => c.startDate);
    const count = dates.length;

    if (count === 0) {
      return res.json({
        count: 0,
        message: 'No hay fechas registradas. Ingresa al menos un celo para obtener una predicción.',
        cycles: [],
        prediction: null,
      });
    }

    const prediction = { count };
    const lastDate = new Date(dates[dates.length - 1]);

    if (count === 1) {
      prediction.type = 'estimated';
      prediction.defaultInterval = SIZE_CONFIG.medium.default;
      prediction.estimatedRangeMin = SIZE_CONFIG.medium.min;
      prediction.estimatedRangeMax = SIZE_CONFIG.medium.max;
      prediction.lastDate = formatDate(lastDate);
      prediction.nextDate = formatDate(addDays(lastDate, SIZE_CONFIG.medium.default));
      prediction.rangeStart = formatDate(addDays(lastDate, SIZE_CONFIG.medium.min));
      prediction.rangeEnd = formatDate(addDays(lastDate, SIZE_CONFIG.medium.max));
      prediction.message = 'Solo hay un celo registrado. La predicción usa el intervalo promedio estimado de 7 meses.';
    } else {
      const intervals = [];
      for (let i = 1; i < count; i++) {
        intervals.push(daysBetween(dates[i - 1], dates[i]));
      }

      prediction.intervals = intervals.map((d, i) => ({
        from: formatDate(dates[i]),
        to: formatDate(dates[i + 1]),
        days: d,
      }));

      if (count === 2) {
        const interval = intervals[0];
        prediction.type = 'exact';
        prediction.averageInterval = interval;
        prediction.lastInterval = interval;
        prediction.stdDev = 0;
        prediction.lastDate = formatDate(lastDate);
        prediction.nextDate = formatDate(addDays(lastDate, interval));
        prediction.rangeStart = formatDate(addDays(lastDate, interval - 5));
        prediction.rangeEnd = formatDate(addDays(lastDate, interval + 5));
        prediction.message = `Basado en 1 intervalo de ${interval} días entre los dos celos registrados.`;
      } else {
        const avg = Math.round(mean(intervals));
        const dev = Math.round(stdDev(intervals) * 10) / 10;
        const margin = Math.max(5, Math.round(dev * 1.5));

        prediction.type = 'average';
        prediction.averageInterval = avg;
        prediction.lastInterval = intervals[intervals.length - 1];
        prediction.stdDev = dev;
        prediction.margin = margin;
        prediction.lastDate = formatDate(lastDate);
        prediction.nextDate = formatDate(addDays(lastDate, avg));
        prediction.rangeStart = formatDate(addDays(lastDate, avg - margin));
        prediction.rangeEnd = formatDate(addDays(lastDate, avg + margin));
        prediction.message = `Basado en ${intervals.length} intervalos. Promedio: ${avg} días, desviación típica: ${dev} días.`;
      }
    }

    res.json({
      count,
      cycles: cycles.map(c => ({
        _id: c._id,
        startDate: c.startDate,
        formattedDate: formatDate(c.startDate),
        notes: c.notes,
      })),
      prediction,
      sizeConfig: SIZE_CONFIG,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
