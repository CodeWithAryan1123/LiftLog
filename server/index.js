import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
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
  res.status(500).json({ error: 'Something went wrong on the server' });
});

function shutdown(reason, code = 0) {
  console.warn(reason);

  Promise.resolve()
    .then(() => mongoose.connection.close())
    .catch((err) => {
      console.error('❌ Error while closing MongoDB connection:', err.message);
    })
    .finally(() => {
      if (server) {
        server.close(() => process.exit(code));
        return;
      }

      process.exit(code);
    });
}

mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

process.on('SIGINT', () => shutdown('🛑 Received SIGINT, shutting down gracefully...'));
process.on('SIGTERM', () => shutdown('🛑 Received SIGTERM, shutting down gracefully...'));

// Connect to MongoDB and start server
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

start();
