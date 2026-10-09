import { calculateMetrics, getSetStages } from '../routes/analytics.js';
import { TRAINING_GOALS, serializeProfile } from './workoutProfile.js';

const RECENT_WORKOUT_LIMIT = 12;

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function estimated1RM(weight, reps) {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function normaliseSet(set) {
  if (!set || typeof set !== 'object') return null;

  const stages = getSetStages(set).filter(
    (stage) => stage.weight >= 0 && stage.reps > 0
  );
  if (stages.length === 0) return null;

  return {
    weight: finiteNumber(set.weight, stages[0].weight),
    reps: finiteNumber(set.reps, stages.reduce((total, stage) => total + stage.reps, 0)),
    isDropSet: Boolean(set.isDropSet || Array.isArray(set.drops)),
    drops: stages.map((stage) => ({ weight: stage.weight, reps: stage.reps })),
    stages: stages.map((stage) => ({
      weight: stage.weight,
      reps: stage.reps,
      estimated1RM: estimated1RM(stage.weight, stage.reps),
    })),
  };
}

function normaliseWorkout(workout) {
  if (
    !workout
    || typeof workout !== 'object'
    || !/^\d{4}-\d{2}-\d{2}$/.test(workout.date)
  ) {
    return null;
  }

  const exercises = (Array.isArray(workout.exercises) ? workout.exercises : [])
    .filter((entry) => entry && typeof entry.exercise === 'string' && entry.exercise.trim())
    .map((entry) => ({
      exercise: entry.exercise,
      bodyPart: entry.bodyPart || 'Other',
      sets: (Array.isArray(entry.sets) ? entry.sets : [])
        .map(normaliseSet)
        .filter(Boolean),
    }))
    .filter((entry) => entry.sets.length > 0);

  return exercises.length > 0 ? { date: workout.date, exercises } : null;
}

function summariseEntry(entry) {
  const stages = entry.sets.flatMap((set) => set.stages);
  return {
    date: null,
    sets: entry.sets.length,
    reps: stages.reduce((total, stage) => total + stage.reps, 0),
    weight: stages.length ? Math.max(...stages.map((stage) => stage.weight)) : null,
    volume: round(stages.reduce((total, stage) => total + stage.weight * stage.reps, 0)),
    estimated1RM: stages.length
      ? round(Math.max(...stages.map((stage) => stage.estimated1RM)))
      : null,
  };
}

function exerciseProgression(rows) {
  const byExercise = new Map();

  rows.forEach((workout) => {
    workout.exercises.forEach((entry) => {
      if (!byExercise.has(entry.exercise)) {
        byExercise.set(entry.exercise, {
          exercise: entry.exercise,
          bodyPart: entry.bodyPart,
          performances: [],
          bestEstimated1RM: 0,
        });
      }

      const progression = byExercise.get(entry.exercise);
      const performance = summariseEntry(entry);
      performance.date = workout.date;
      progression.performances.push(performance);
      progression.bestEstimated1RM = Math.max(
        progression.bestEstimated1RM,
        performance.estimated1RM || 0
      );
    });
  });

  return [...byExercise.values()].map((progression) => {
    const performances = progression.performances;
    const latest = performances.at(-1) || null;
    const previous = performances.length > 1 ? performances.at(-2) : null;
    const first = performances[0] || null;

    return {
      exercise: progression.exercise,
      bodyPart: progression.bodyPart,
      firstDate: first?.date || null,
      latestDate: latest?.date || null,
      latestPerformance: latest,
      previousPerformance: previous,
      bestEstimated1RM: round(progression.bestEstimated1RM),
      progressionPercent: first?.estimated1RM
        ? round(((latest.estimated1RM - first.estimated1RM) / first.estimated1RM) * 100)
        : null,
    };
  });
}

function getDateSpanDays(rows) {
  if (rows.length < 2) return null;
  const first = new Date(`${rows[0].date}T00:00:00Z`);
  const last = new Date(`${rows.at(-1).date}T00:00:00Z`);
  const span = Math.ceil((last.getTime() - first.getTime()) / 86400000) + 1;
  return Number.isFinite(span) && span > 0 ? span : null;
}

function buildMuscleGroups(rows, metrics) {
  const groups = new Map();
  rows.forEach((workout) => {
    workout.exercises.forEach((entry) => {
      const name = entry.bodyPart || 'Other';
      if (!groups.has(name)) groups.set(name, { workoutDates: new Set(), lastTrainedDate: workout.date });
      const group = groups.get(name);
      group.workoutDates.add(workout.date);
      group.lastTrainedDate = workout.date;
    });
  });

  return [...metrics.muscles.entries()]
    .map(([name, value]) => {
      const details = groups.get(name);
      return {
        name,
        totalSets: value.sets,
        totalReps: value.reps,
        volume: round(value.volume),
        workoutFrequency: details?.workoutDates.size || 0,
        lastTrainedDate: details?.lastTrainedDate || null,
      };
    })
    .sort((a, b) => b.volume - a.volume);
}

export function buildWorkoutContext({ workouts = [], profile = null }) {
  const normalised = workouts
    .map(normaliseWorkout)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  const metrics = calculateMetrics(normalised);
  const recentWorkouts = normalised.slice(-RECENT_WORKOUT_LIMIT).reverse();
  const dateSpanDays = getDateSpanDays(normalised);
  const workoutDays = metrics.workoutDates.size;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    profile,
    availableTrainingGoals: TRAINING_GOALS,
    history: {
      totalWorkoutDays: metrics.workoutDates.size,
      firstWorkoutDate: normalised[0]?.date || null,
      latestWorkoutDate: normalised.at(-1)?.date || null,
      recentWorkouts,
    },
    analytics: {
      allTime: {
        summary: metrics.summary,
        workoutFrequencyPerWeek: dateSpanDays
          ? round((workoutDays / dateSpanDays) * 7)
          : 0,
        consistencyPercent: dateSpanDays
          ? round((workoutDays / dateSpanDays) * 100)
          : null,
      },
      muscleGroups: buildMuscleGroups(normalised, metrics),
    },
    exerciseProgression: exerciseProgression(normalised),
  };
}

export async function getWorkoutContext(userId, query) {
  const result = await query(
    `SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, exercises
     FROM workouts
     WHERE user_id = $1
     ORDER BY date`,
    [userId]
  );
  const profileResult = await query(
    `SELECT primary_goal, experience_level, preferred_workout_split,
            training_days_per_week, training_goals
     FROM workout_profiles
     WHERE user_id = $1`,
    [userId]
  );

  return buildWorkoutContext({
    workouts: result.rows,
    profile: serializeProfile(profileResult.rows[0]),
  });
}
