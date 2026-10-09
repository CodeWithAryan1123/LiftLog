import { Router } from 'express';
import { query } from '../db.js';
import auth from '../middleware/auth.js';
import { getWorkoutContext } from '../services/workoutContext.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const context = await getWorkoutContext(req.userId, query);
    res.json(context);
  } catch (err) {
    console.error('GET /ai-context error:', err.message);
    res.status(500).json({ error: 'Unable to prepare workout context' });
  }
});

export default router;
