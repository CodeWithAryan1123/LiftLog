import pg from 'pg';

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isProduction && { ssl: { rejectUnauthorized: false } }),
});

/**
 * Run a parameterised SQL query against the pool.
 * @param {string} text  SQL statement
 * @param {any[]}  params  Bind parameters
 * @returns {Promise<pg.QueryResult>}
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Create tables if they don't already exist.
 * Called once on server startup.
 */
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(255) NOT NULL,
      email      VARCHAR(255) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       DATE NOT NULL,
      exercises  JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_date    ON workouts(date);

    CREATE TABLE IF NOT EXISTS workout_profiles (
      user_id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      primary_goal             VARCHAR(32),
      experience_level         VARCHAR(32),
      preferred_workout_split  VARCHAR(100),
      training_days_per_week   INTEGER,
      training_goals           TEXT[] NOT NULL DEFAULT '{}',
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

  `);
}

/**
 * Gracefully close all pool connections.
 */
export async function closeDb() {
  await pool.end();
}

export default pool;
