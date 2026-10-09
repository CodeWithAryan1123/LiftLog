import { Router } from 'express';
import { query } from '../db.js';
import auth from '../middleware/auth.js';
import {
  serializeProfile,
  validateProfileInput,
} from '../services/workoutProfile.js';

const router = Router();
router.use(auth);

const profileColumns = `
  primary_goal,
  experience_level,
  preferred_workout_split,
  training_days_per_week,
  training_goals
`;

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT ${profileColumns}
       FROM workout_profiles
       WHERE user_id = $1`,
      [req.userId]
    );
    res.json(serializeProfile(result.rows[0]));
  } catch (err) {
    console.error('GET /profile error:', err.message);
    res.status(500).json({ error: 'Unable to load workout profile' });
  }
});

router.put('/', async (req, res) => {
  try {
    const profile = validateProfileInput(req.body);
    const result = await query(
      `INSERT INTO workout_profiles (
         user_id, primary_goal, experience_level, preferred_workout_split,
         training_days_per_week, training_goals, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         primary_goal = EXCLUDED.primary_goal,
         experience_level = EXCLUDED.experience_level,
         preferred_workout_split = EXCLUDED.preferred_workout_split,
         training_days_per_week = EXCLUDED.training_days_per_week,
         training_goals = EXCLUDED.training_goals,
         updated_at = NOW()
       RETURNING ${profileColumns}`,
      [
        req.userId,
        profile.primaryGoal ?? null,
        profile.experienceLevel ?? null,
        profile.preferredWorkoutSplit ?? null,
        profile.trainingDaysPerWeek ?? null,
        profile.trainingGoals ?? [],
      ]
    );
    res.json(serializeProfile(result.rows[0]));
  } catch (err) {
    if (err.message.includes('must be')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('PUT /profile error:', err.message);
    res.status(500).json({ error: 'Unable to save workout profile' });
  }
});

export default router;
