import { Router } from 'express';
import { query } from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

function getRangeStart(range) {
  if (range === 'all') return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === 'month') {
    start.setDate(1);
  } else {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  }

  return [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, '0'),
    String(start.getDate()).padStart(2, '0'),
  ].join('-');
}

function getPreviousRangeStart(range, currentStart) {
  if (range === 'all') return null;
  const start = new Date(`${currentStart}T00:00:00`);
  if (range === 'month') {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setDate(start.getDate() - 7);
  }
  return [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, '0'),
    String(start.getDate()).padStart(2, '0'),
  ].join('-');
}

function emptyMetrics() {
  return { sets: 0, reps: 0, volume: 0 };
}

export function getSetStages(set) {
  const drops = Array.isArray(set.drops) && set.drops.length > 0
    ? set.drops
    : [{ weight: set.weight, reps: set.reps }];
  return drops
    .filter((drop) => drop && Number.isFinite(Number(drop.weight)) && Number.isFinite(Number(drop.reps)))
    .map((drop) => ({
      weight: Math.max(0, Number(drop.weight)),
      reps: Math.max(0, Number(drop.reps)),
    }));
}

function addSet(metrics, set) {
  const stages = getSetStages(set);

  metrics.sets += 1;
  metrics.reps += stages.reduce((total, stage) => total + stage.reps, 0);
  metrics.volume += stages.reduce(
    (total, stage) => total + stage.weight * stage.reps,
    0
  );
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function getOneRepMax(weight, reps) {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

function getSetEstimated1RM(set) {
  return Math.max(...getSetStages(set).map((stage) => getOneRepMax(stage.weight, stage.reps)), 0);
}

export function calculateMetrics(rows) {
  const daily = new Map();
  const muscles = new Map();
  const exercises = new Map();
  const workoutDates = new Set();

  rows.forEach((workout) => {
    workoutDates.add(workout.date);
    if (!daily.has(workout.date)) daily.set(workout.date, emptyMetrics());
    const dayMetrics = daily.get(workout.date);

    (Array.isArray(workout.exercises) ? workout.exercises : []).forEach((entry) => {
      const muscle = entry.bodyPart || 'Other';
      if (!muscles.has(muscle)) muscles.set(muscle, emptyMetrics());
      if (!exercises.has(entry.exercise)) {
        exercises.set(entry.exercise, {
          exercise: entry.exercise,
          bodyPart: muscle,
          ...emptyMetrics(),
          estimated1RM: 0,
          firstEstimated1RM: 0,
          latestEstimated1RM: 0,
        });
      }

      const muscleMetrics = muscles.get(muscle);
      const exerciseMetrics = exercises.get(entry.exercise);
      (Array.isArray(entry.sets) ? entry.sets : []).forEach((set) => {
        addSet(dayMetrics, set);
        addSet(muscleMetrics, set);
        addSet(exerciseMetrics, set);

        const estimated = getSetEstimated1RM(set);
        exerciseMetrics.estimated1RM = Math.max(exerciseMetrics.estimated1RM, estimated);
        if (!exerciseMetrics.firstEstimated1RM) {
          exerciseMetrics.firstEstimated1RM = estimated;
        }
        exerciseMetrics.latestEstimated1RM = estimated;
      });
    });
  });

  const summary = [...daily.values()].reduce(
    (total, metrics) => ({
      sets: total.sets + metrics.sets,
      reps: total.reps + metrics.reps,
      volume: total.volume + metrics.volume,
    }),
    emptyMetrics()
  );

  return {
    summary,
    daily,
    muscles,
    exercises,
    workoutDates,
  };
}

router.get('/', async (req, res) => {
  try {
    const range = req.query.range || 'month';
    if (!['week', 'month', 'all'].includes(range)) {
      return res.status(400).json({ error: 'Invalid analytics range.' });
    }

    const start = getRangeStart(range);
    const previousStart = getPreviousRangeStart(range, start);
    const result = start
      ? await query(
          `SELECT TO_CHAR(w.date, 'YYYY-MM-DD') AS date, w.exercises
           FROM workouts w
           WHERE w.user_id = $1 AND w.date >= $2
           ORDER BY w.date`,
          [req.userId, previousStart || start]
        )
      : await query(
          `SELECT TO_CHAR(w.date, 'YYYY-MM-DD') AS date, w.exercises
           FROM workouts w
           WHERE w.user_id = $1
           ORDER BY w.date`,
          [req.userId]
        );

    const currentRows = start
      ? result.rows.filter((workout) => workout.date >= start)
      : result.rows;
    const previousRows = start
      ? result.rows.filter((workout) => workout.date < start)
      : [];
    const current = calculateMetrics(currentRows);
    const previous = calculateMetrics(previousRows);
    const periodDays = start
      ? Math.max(1, Math.floor((Date.now() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1)
      : 0;
    const workouts = current.workoutDates.size;
    const previousWorkouts = previous.workoutDates.size;
    const progress = previousWorkouts > 0
      ? {
          volumeChange: previous.summary.volume
            ? round(((current.summary.volume - previous.summary.volume) / previous.summary.volume) * 100)
            : null,
          workoutsChange: round(((workouts - previousWorkouts) / previousWorkouts) * 100),
        }
      : { volumeChange: null, workoutsChange: null };

    res.json({
      range,
      summary: {
        ...current.summary,
        volume: round(current.summary.volume),
        workouts,
        averageVolume: workouts ? round(current.summary.volume / workouts) : 0,
        frequency: periodDays ? round((workouts / periodDays) * 7) : 0,
        consistency: periodDays ? round(Math.min((workouts / periodDays) * 100, 100)) : null,
      },
      progress,
      daily: [...current.daily.entries()].map(([date, metrics]) => ({
        date,
        ...metrics,
        volume: round(metrics.volume),
      })),
      muscleGroups: [...current.muscles.entries()]
        .map(([name, metrics]) => ({
          name,
          ...metrics,
          volume: round(metrics.volume),
        }))
        .sort((a, b) => b.volume - a.volume),
      exercises: [...current.exercises.values()]
        .map((exercise) => ({
          ...exercise,
          volume: round(exercise.volume),
          estimated1RM: round(exercise.estimated1RM),
          progression: exercise.firstEstimated1RM
            ? round(((exercise.latestEstimated1RM - exercise.firstEstimated1RM) / exercise.firstEstimated1RM) * 100)
            : 0,
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8),
    });
  } catch (err) {
    console.error('GET /analytics error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
