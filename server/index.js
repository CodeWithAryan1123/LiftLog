import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import requestLogger from './middleware/logging.js';
import { initDb, closeDb } from './db.js';
import authRoutes from './routes/auth.js';
import workoutRoutes from './routes/workouts.js';

const app = express();
const PORT = process.env.PORT || 5000;
let server;

// Middleware
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.stack || err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

function shutdown(reason, code = 0) {
  console.warn(reason);

  closeDb()
    .catch((err) => {
      console.error('❌ Error while closing PostgreSQL pool:', err.message);
    })
    .finally(() => {
      if (server) {
        server.close(() => process.exit(code));
        return;
      }

      process.exit(code);
    });
}

process.on('SIGINT', () => shutdown('🛑 Received SIGINT, shutting down gracefully...'));
process.on('SIGTERM', () => shutdown('🛑 Received SIGTERM, shutting down gracefully...'));

// Connect to PostgreSQL and start server
async function start() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is missing.');
    }
    console.log('🔌 Connecting to PostgreSQL...');
    await initDb();
    console.log('✅ Connected to PostgreSQL — tables ready');
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
}

start();
