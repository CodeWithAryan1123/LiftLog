import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkoutContext, getWorkoutContext } from '../services/workoutContext.js';
import { serializeProfile, validateProfileInput } from '../services/workoutProfile.js';

test('builds a structured context from normal and drop sets', () => {
  const context = buildWorkoutContext({
    workouts: [
      {
        date: '2026-01-01',
        exercises: [{
          exercise: 'Bench Press',
          bodyPart: 'Chest',
          sets: [
            { weight: 60, reps: 10 },
            {
              weight: 60,
              reps: 18,
              isDropSet: true,
              drops: [
                { weight: 60, reps: 10 },
                { weight: 50, reps: 8 },
              ],
            },
          ],
        }],
      },
      {
        date: '2026-01-08',
        exercises: [{
          exercise: 'Bench Press',
          bodyPart: 'Chest',
          sets: [{ weight: 65, reps: 8 }],
        }],
      },
    ],
    profile: null,
  });

  assert.equal(context.version, 1);
  assert.equal(context.profile, null);
  assert.deepEqual(context.availableTrainingGoals, [
    'muscle_gain',
    'strength',
    'fat_loss',
    'endurance',
    'general_fitness',
  ]);
  assert.equal(context.history.totalWorkoutDays, 2);
  assert.equal(context.history.recentWorkouts.length, 2);
  assert.equal(context.analytics.allTime.summary.sets, 3);
  assert.equal(context.analytics.allTime.summary.volume, 2120);
  assert.equal(context.analytics.muscleGroups[0].name, 'Chest');
  assert.equal(context.analytics.muscleGroups[0].workoutFrequency, 2);
  assert.equal(context.analytics.muscleGroups[0].totalSets, 3);
  assert.equal(context.analytics.muscleGroups[0].lastTrainedDate, '2026-01-08');
  assert.equal(context.exerciseProgression[0].exercise, 'Bench Press');
  assert.equal(context.exerciseProgression[0].bestEstimated1RM, 82.33);
  assert.deepEqual(context.exerciseProgression[0].previousPerformance, {
    date: '2026-01-01',
    sets: 2,
    reps: 28,
    weight: 60,
    volume: 1600,
    estimated1RM: 80,
  });
  assert.equal(context.exerciseProgression[0].latestPerformance.date, '2026-01-08');
  assert.equal(context.exerciseProgression[0].latestPerformance.weight, 65);
  assert.equal(context.history.recentWorkouts[0].exercises[0].sets[0].stages.length, 1);
  assert.equal(context.analytics.allTime.consistencyPercent, 25);
});

test('ignores malformed workout and set records without inventing data', () => {
  const context = buildWorkoutContext({
    workouts: [
      null,
      { date: 'not-a-date', exercises: [] },
      { date: '2026-01-01', exercises: [{ exercise: '', sets: [{ weight: 100, reps: 5 }] }] },
      { date: '2026-01-02', exercises: [{ exercise: 'Squat', sets: [{ weight: 'bad', reps: 0 }] }] },
    ],
  });

  assert.equal(context.history.totalWorkoutDays, 0);
  assert.equal(context.history.firstWorkoutDate, null);
  assert.deepEqual(context.analytics.allTime.summary, { sets: 0, reps: 0, volume: 0 });
  assert.deepEqual(context.exerciseProgression, []);
  assert.equal(context.profile, null);
});

test('returns an empty context when the user has no workout history', () => {
  const context = buildWorkoutContext({ workouts: [] });

  assert.equal(context.history.totalWorkoutDays, 0);
  assert.equal(context.history.recentWorkouts.length, 0);
  assert.equal(context.analytics.allTime.consistencyPercent, null);
  assert.deepEqual(context.analytics.muscleGroups, []);
});

test('returns null consistency when one workout date cannot establish a span', () => {
  const context = buildWorkoutContext({
    workouts: [{
      date: '2026-01-01',
      exercises: [{ exercise: 'Squat', bodyPart: 'Legs', sets: [{ weight: 80, reps: 5 }] }],
    }],
  });

  assert.equal(context.analytics.allTime.consistencyPercent, null);
  assert.equal(context.analytics.allTime.workoutFrequencyPerWeek, 0);
});

test('scopes the database query to the authenticated user id', async () => {
  const receivedParams = [];
  const context = await getWorkoutContext('user-123', async (sql, params) => {
    receivedParams.push({ sql, params });
    return sql.includes('workout_profiles')
      ? {
          rows: [{
            primary_goal: 'strength',
            experience_level: 'intermediate',
            preferred_workout_split: null,
            training_days_per_week: 4,
            training_goals: ['strength'],
          }],
        }
      : { rows: [] };
  });

  assert.deepEqual(receivedParams.map((query) => query.params), [['user-123'], ['user-123']]);
  assert.deepEqual(context.profile, {
    primaryGoal: 'strength',
    experienceLevel: 'intermediate',
    trainingDaysPerWeek: 4,
    trainingGoals: ['strength'],
  });
  assert.equal(context.history.totalWorkoutDays, 0);
});

test('validates and serializes persisted profile fields without adding missing values', () => {
  assert.deepEqual(validateProfileInput({
    primaryGoal: 'muscle_gain',
    experienceLevel: 'beginner',
    trainingGoals: ['muscle_gain', 'strength', 'strength'],
    trainingDaysPerWeek: 3,
  }), {
    primaryGoal: 'muscle_gain',
    experienceLevel: 'beginner',
    trainingGoals: ['muscle_gain', 'strength'],
    trainingDaysPerWeek: 3,
  });
  assert.deepEqual(serializeProfile({
    primary_goal: 'fat_loss',
    experience_level: null,
    preferred_workout_split: null,
    training_days_per_week: null,
    training_goals: [],
  }), { primaryGoal: 'fat_loss' });
  assert.throws(() => validateProfileInput({ primaryGoal: 'invalid' }), /primaryGoal/);
  assert.throws(() => validateProfileInput({ trainingDaysPerWeek: 8 }), /trainingDaysPerWeek/);
});
