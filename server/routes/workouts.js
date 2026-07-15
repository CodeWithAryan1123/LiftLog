import { Router } from 'express';
import mongoose from 'mongoose';
import Workout from '../models/Workout.js';
import auth from '../middleware/auth.js';

const router = Router();

// All routes require auth
router.use(auth);

// Validate date param format (YYYY-MM-DD)
router.param('date', (req, res, next, date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }
  next();
});

// GET /api/workouts/dates?month=2026-07
// Returns array of date strings that have workouts
router.get('/dates', async (req, res) => {
  try {
    const { month } = req.query; // e.g. '2026-07'
    const filter = { userId: req.userId };
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM.' });
      }
      filter.date = { $regex: `^${month}` };
    }
    const docs = await Workout.find(filter).select('date -_id').lean();
    const dates = docs.map((d) => d.date);
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workouts/prs
// Returns all personal records grouped by exercise
router.get('/prs', async (req, res) => {
  try {
    const prsList = await Workout.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      { $unwind: '$exercises' },
      { $unwind: '$exercises.sets' },
      { $sort: { 'exercises.sets.weight': -1, 'exercises.sets.reps': -1 } },
      { $group: {
          _id: '$exercises.exercise',
          weight: { $first: '$exercises.sets.weight' },
          reps: { $first: '$exercises.sets.reps' },
          bodyPart: { $first: '$exercises.bodyPart' },
          date: { $first: '$date' }
        }
      }
    ]);

    const prs = {};
    prsList.forEach((item) => {
      prs[item._id] = {
        weight: item.weight,
        reps: item.reps,
        bodyPart: item.bodyPart,
        date: item.date,
      };
    });

    res.json(prs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workouts/:date
// Returns exercises array for a specific date
router.get('/:date', async (req, res) => {
  try {
    const doc = await Workout.findOne({
      userId: req.userId,
      date: req.params.date,
    }).lean();
    res.json(doc ? doc.exercises : []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workouts/:date
// Save/update exercises for a date
router.post('/:date', async (req, res) => {
  try {
    const { exercises, exercise, bodyPart, sets } = req.body;
    const nextExercises = Array.isArray(exercises) ? exercises : null;

    let doc;
    if (nextExercises) {
      doc = await Workout.findOneAndUpdate(
        { userId: req.userId, date: req.params.date },
        { exercises: nextExercises },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    } else if (exercise) {
      if (Array.isArray(sets) && sets.length > 0) {
        doc = await Workout.findOneAndUpdate(
          { userId: req.userId, date: req.params.date, 'exercises.exercise': exercise },
          { $set: { 'exercises.$.sets': sets, 'exercises.$.bodyPart': bodyPart } },
          { new: true }
        ).lean();

        if (!doc) {
          doc = await Workout.findOneAndUpdate(
            { userId: req.userId, date: req.params.date },
            { $push: { exercises: { exercise, bodyPart, sets } } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).lean();
        }
      } else {
        doc = await Workout.findOneAndUpdate(
          { userId: req.userId, date: req.params.date },
          { $pull: { exercises: { exercise } } },
          { new: true }
        ).lean();
      }
    }

    if (doc && !doc.exercises.length) {
      await Workout.deleteOne({ _id: doc._id });
      return res.json([]);
    }

    res.json(doc ? doc.exercises : []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
