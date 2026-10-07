import { Router } from 'express';
import { query } from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

const CARDIO_TYPES = [
  'Treadmill',
  'Running',
  'Walking',
  'Jogging',
  'Sprints',
  'Shuttle Runs',
  'Cycling',
  'Stationary Bike',
  'Spin Bike',
  'Assault Bike',
  'StairMaster',
  'Stair Climbing',
  'Elliptical',
  'Rowing',
  'Swimming',
  'Jump Rope',
  'Jumping Jacks',
  'High Knees',
  'Mountain Climbers',
  'Burpees',
  'Squat Jumps',
  'Box Jumps',
  'Skater Jumps',
  'Bear Crawl',
  'HIIT',
  'Circuit Training',
  'Hiking',
  'Dancing',
  'Kickboxing',
  'Shadow Boxing',
  'Other',
];
const INTENSITIES = ['Low', 'Moderate', 'High'];

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parsePayload(body) {
  const {
    date,
    cardioType,
    duration,
    distance,
    calories,
    heartRate,
    intensity,
    notes,
  } = body;
  const durationMinutes = Number(duration);
  const distanceKm = distance === '' || distance == null ? null : Number(distance);
  const caloriesBurned = calories === '' || calories == null ? null : Number(calories);
  const averageHeartRate = heartRate === '' || heartRate == null ? null : Number(heartRate);

  if (!isDate(date) || !CARDIO_TYPES.includes(cardioType) || !INTENSITIES.includes(intensity)) {
    return { error: 'Please provide a valid date, cardio type, and intensity.' };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { error: 'Duration must be greater than zero.' };
  }
  if (distanceKm !== null && (!Number.isFinite(distanceKm) || distanceKm < 0)) {
    return { error: 'Distance must be zero or greater.' };
  }
  if (caloriesBurned !== null && (!Number.isInteger(caloriesBurned) || caloriesBurned < 0)) {
    return { error: 'Calories must be a whole number zero or greater.' };
  }
  if (averageHeartRate !== null && (!Number.isInteger(averageHeartRate) || averageHeartRate < 0)) {
    return { error: 'Heart rate must be a whole number zero or greater.' };
  }

  return {
    values: [
      date,
      cardioType,
      durationMinutes,
      distanceKm,
      caloriesBurned,
      averageHeartRate,
      intensity,
      typeof notes === 'string' ? notes.trim() || null : null,
    ],
  };
}

function mapSession(row) {
  return {
    id: row.id,
    date: row.date,
    cardioType: row.cardio_type,
    duration: Number(row.duration_minutes),
    distance: row.distance_km == null ? null : Number(row.distance_km),
    calories: row.calories_burned,
    heartRate: row.average_heart_rate,
    intensity: row.intensity,
    notes: row.notes || '',
  };
}

function getRangeStart(range) {
  if (range === 'all') return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === 'month') {
    start.setDate(1);
  } else {
    const day = start.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysSinceMonday);
  }
  return [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, '0'),
    String(start.getDate()).padStart(2, '0'),
  ].join('-');
}

async function getSessions(userId, range) {
  const start = getRangeStart(range);
  const result = start
    ? await query(
        `SELECT * FROM cardio_sessions
         WHERE user_id = $1 AND date >= $2
         ORDER BY date DESC, created_at DESC`,
        [userId, start]
      )
    : await query(
        `SELECT * FROM cardio_sessions
         WHERE user_id = $1
         ORDER BY date DESC, created_at DESC`,
        [userId]
      );

  const sessions = result.rows.map(mapSession);
  return {
    sessions,
    summary: {
      sessions: sessions.length,
      duration: sessions.reduce((total, session) => total + session.duration, 0),
      distance: sessions.reduce((total, session) => total + (session.distance || 0), 0),
      calories: sessions.reduce((total, session) => total + (session.calories || 0), 0),
    },
  };
}

router.get('/', async (req, res) => {
  try {
    const range = req.query.range || 'week';
    if (!['week', 'month', 'all'].includes(range)) {
      return res.status(400).json({ error: 'Invalid cardio range.' });
    }
    res.json(await getSessions(req.userId, range));
  } catch (err) {
    console.error('GET /cardio error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const parsed = parsePayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const result = await query(
      `INSERT INTO cardio_sessions
       (user_id, date, cardio_type, duration_minutes, distance_km, calories_burned,
        average_heart_rate, intensity, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.userId, ...parsed.values]
    );
    res.status(201).json(mapSession(result.rows[0]));
  } catch (err) {
    console.error('POST /cardio error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = parsePayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const result = await query(
      `UPDATE cardio_sessions
       SET date = $3, cardio_type = $4, duration_minutes = $5, distance_km = $6,
           calories_burned = $7, average_heart_rate = $8, intensity = $9,
           notes = $10, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, ...parsed.values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cardio session not found.' });
    res.json(mapSession(result.rows[0]));
  } catch (err) {
    console.error('PUT /cardio error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM cardio_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cardio session not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /cardio error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
