import { Router } from 'express';
import { query } from '../db.js';
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

    let result;
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM.' });
      }
      result = await query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date FROM workouts
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         ORDER BY date`,
        [req.userId, month]
      );
    } else {
      result = await query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date FROM workouts
         WHERE user_id = $1
         ORDER BY date`,
        [req.userId]
      );
    }

    const dates = result.rows.map((r) => r.date);
    res.json(dates);
  } catch (err) {
    console.error('GET /dates error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workouts/prs
// Returns all personal records grouped by exercise
router.get('/prs', async (req, res) => {
  try {
    // Unnest exercises JSONB array, then unnest each exercise's sets,
    // then pick the heaviest set (by weight desc, then reps desc) per exercise name.
    const result = await query(
      `WITH exploded AS (
        SELECT
          TO_CHAR(w.date, 'YYYY-MM-DD') AS date,
          ex->>'exercise'  AS exercise,
          ex->>'bodyPart'  AS body_part,
          (s->>'weight')::numeric AS weight,
          (s->>'reps')::integer   AS reps
        FROM workouts w,
             jsonb_array_elements(w.exercises) AS ex,
             jsonb_array_elements(ex->'sets')  AS s
        WHERE w.user_id = $1
      ),
      ranked AS (
        SELECT *,
               ROW_NUMBER() OVER (
                 PARTITION BY exercise
                 ORDER BY weight DESC, reps DESC
               ) AS rn
        FROM exploded
      )
      SELECT exercise, weight, reps, body_part, date
      FROM ranked
      WHERE rn = 1`,
      [req.userId]
    );

    const prs = {};
    result.rows.forEach((row) => {
      prs[row.exercise] = {
        weight: Number(row.weight),
        reps: row.reps,
        bodyPart: row.body_part,
        date: row.date,
      };
    });

    res.json(prs);
  } catch (err) {
    console.error('GET /prs error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workouts/:date
// Returns exercises array for a specific date
router.get('/:date', async (req, res) => {
  try {
    const result = await query(
      'SELECT exercises FROM workouts WHERE user_id = $1 AND date = $2',
      [req.userId, req.params.date]
    );
    res.json(result.rows.length > 0 ? result.rows[0].exercises : []);
  } catch (err) {
    console.error('GET /:date error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workouts/:date
// Save/update exercises for a date
router.post('/:date', async (req, res) => {
  try {
    const { exercises, exercise, bodyPart, sets } = req.body;
    const userId = req.userId;
    const date = req.params.date;

    let finalExercises;

    if (Array.isArray(exercises)) {
      // Full replacement of the exercises array
      if (exercises.length === 0) {
        // Delete the workout row entirely
        await query('DELETE FROM workouts WHERE user_id = $1 AND date = $2', [userId, date]);
        return res.json([]);
      }

      const result = await query(
        `INSERT INTO workouts (user_id, date, exercises)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (user_id, date) DO UPDATE
           SET exercises = $3::jsonb, updated_at = NOW()
         RETURNING exercises`,
        [userId, date, JSON.stringify(exercises)]
      );
      finalExercises = result.rows[0].exercises;
    } else if (exercise) {
      if (Array.isArray(sets) && sets.length > 0) {
        // Add or update a single exercise within the workout
        // First, try to get existing workout
        const existing = await query(
          'SELECT exercises FROM workouts WHERE user_id = $1 AND date = $2',
          [userId, date]
        );

        let updatedExercises;
        if (existing.rows.length > 0) {
          updatedExercises = existing.rows[0].exercises;
          const idx = updatedExercises.findIndex((e) => e.exercise === exercise);
          if (idx >= 0) {
            updatedExercises[idx].sets = sets;
            updatedExercises[idx].bodyPart = bodyPart;
          } else {
            updatedExercises.push({ exercise, bodyPart, sets });
          }
        } else {
          updatedExercises = [{ exercise, bodyPart, sets }];
        }

        const result = await query(
          `INSERT INTO workouts (user_id, date, exercises)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (user_id, date) DO UPDATE
             SET exercises = $3::jsonb, updated_at = NOW()
           RETURNING exercises`,
          [userId, date, JSON.stringify(updatedExercises)]
        );
        finalExercises = result.rows[0].exercises;
      } else {
        // Remove a specific exercise from the workout
        const existing = await query(
          'SELECT exercises FROM workouts WHERE user_id = $1 AND date = $2',
          [userId, date]
        );

        if (existing.rows.length === 0) {
          return res.json([]);
        }

        const updatedExercises = existing.rows[0].exercises.filter(
          (e) => e.exercise !== exercise
        );

        if (updatedExercises.length === 0) {
          await query('DELETE FROM workouts WHERE user_id = $1 AND date = $2', [userId, date]);
          return res.json([]);
        }

        const result = await query(
          `UPDATE workouts SET exercises = $3::jsonb, updated_at = NOW()
           WHERE user_id = $1 AND date = $2
           RETURNING exercises`,
          [userId, date, JSON.stringify(updatedExercises)]
        );
        finalExercises = result.rows[0].exercises;
      }
    } else {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    res.json(finalExercises);
  } catch (err) {
    console.error('POST /:date error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
