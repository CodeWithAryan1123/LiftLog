export const TRAINING_GOALS = [
  'muscle_gain',
  'strength',
  'fat_loss',
  'endurance',
  'general_fitness',
];

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

export function validateProfileInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Profile must be an object.');
  }

  const primaryGoal = optionalText(input.primaryGoal, 'primaryGoal', 32);
  const experienceLevel = optionalText(input.experienceLevel, 'experienceLevel', 32);
  const preferredWorkoutSplit = optionalText(input.preferredWorkoutSplit, 'preferredWorkoutSplit', 100);

  if (primaryGoal !== undefined && !TRAINING_GOALS.includes(primaryGoal)) {
    throw new Error(`primaryGoal must be one of: ${TRAINING_GOALS.join(', ')}.`);
  }
  if (experienceLevel !== undefined && !EXPERIENCE_LEVELS.includes(experienceLevel)) {
    throw new Error(`experienceLevel must be one of: ${EXPERIENCE_LEVELS.join(', ')}.`);
  }

  let trainingDaysPerWeek = input.trainingDaysPerWeek;
  if (trainingDaysPerWeek !== undefined && trainingDaysPerWeek !== null && trainingDaysPerWeek !== '') {
    trainingDaysPerWeek = Number(trainingDaysPerWeek);
    if (!Number.isInteger(trainingDaysPerWeek) || trainingDaysPerWeek < 1 || trainingDaysPerWeek > 7) {
      throw new Error('trainingDaysPerWeek must be an integer from 1 to 7.');
    }
  } else {
    trainingDaysPerWeek = undefined;
  }

  let trainingGoals = input.trainingGoals;
  if (trainingGoals === undefined || trainingGoals === null) {
    trainingGoals = undefined;
  } else if (
    !Array.isArray(trainingGoals)
    || trainingGoals.some((goal) => typeof goal !== 'string' || !TRAINING_GOALS.includes(goal))
  ) {
    throw new Error(`trainingGoals must contain only: ${TRAINING_GOALS.join(', ')}.`);
  } else {
    trainingGoals = [...new Set(trainingGoals)];
  }

  const profile = {};
  if (primaryGoal !== undefined) profile.primaryGoal = primaryGoal;
  if (experienceLevel !== undefined) profile.experienceLevel = experienceLevel;
  if (preferredWorkoutSplit !== undefined) profile.preferredWorkoutSplit = preferredWorkoutSplit;
  if (trainingDaysPerWeek !== undefined) profile.trainingDaysPerWeek = trainingDaysPerWeek;
  if (trainingGoals !== undefined) profile.trainingGoals = trainingGoals;
  return profile;
}

export function serializeProfile(row) {
  if (!row) return null;

  const profile = {};
  if (row.primary_goal !== null && row.primary_goal !== undefined) profile.primaryGoal = row.primary_goal;
  if (row.experience_level !== null && row.experience_level !== undefined) profile.experienceLevel = row.experience_level;
  if (row.preferred_workout_split !== null && row.preferred_workout_split !== undefined) {
    profile.preferredWorkoutSplit = row.preferred_workout_split;
  }
  if (row.training_days_per_week !== null && row.training_days_per_week !== undefined) {
    profile.trainingDaysPerWeek = row.training_days_per_week;
  }
  if (Array.isArray(row.training_goals) && row.training_goals.length > 0) {
    profile.trainingGoals = row.training_goals;
  }
  return profile;
}
