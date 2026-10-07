import { Router } from 'express';
import { query } from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mapSteps(row) {
  return {
    id: row.id,
    date: row.date,
    steps: row.steps,
  };
}

router.get('/:date', async (req, res) => {
  if (!isDate(req.params.date)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  try {
    const result = await query(
      'SELECT * FROM daily_steps WHERE user_id = $1 AND date = $2',
      [req.userId, req.params.date]
    );
    res.json(result.rows.length > 0 ? mapSteps(result.rows[0]) : { date: req.params.date, steps: 0 });
  } catch (err) {
    console.error('GET /steps error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:date', async (req, res) => {
  if (!isDate(req.params.date)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  const steps = Number(req.body.steps);
  if (!Number.isInteger(steps) || steps < 0) {
    return res.status(400).json({ error: 'Steps must be a whole number zero or greater.' });
  }

  try {
    const result = await query(
      `INSERT INTO daily_steps (user_id, date, steps)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE
         SET steps = EXCLUDED.steps, updated_at = NOW()
       RETURNING *`,
      [req.userId, req.params.date, steps]
    );
    res.json(mapSteps(result.rows[0]));
  } catch (err) {
    console.error('PUT /steps error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
