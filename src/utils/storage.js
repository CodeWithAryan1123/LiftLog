const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WORKOUT_API = `${API_BASE}/api/workouts`;
const AUTH_TOKEN_KEY = 'gymlog-token';

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error('Request failed');
  }

  return res.json();
}

export async function saveWorkoutForDate(date, exercises) {
  try {
    return await fetchJson(`${WORKOUT_API}/${date}`, {
      method: 'POST',
      body: JSON.stringify({ exercises }),
    });
  } catch {
    return [];
  }
}

// Get all exercises logged for a specific date
export async function getWorkoutForDate(date) {
  try {
    return await fetchJson(`${WORKOUT_API}/${date}`);
  } catch {
    return [];
  }
}

// Add a set to an exercise on a date
export async function addSetToExercise(date, exerciseName, bodyPart, newSet) {
  try {
    const current = await getWorkoutForDate(date);
    const entry = current.find((e) => e.exercise === exerciseName);
    const sets = entry ? [...entry.sets, newSet] : [newSet];

    const nextWorkouts = entry
      ? current.map((workout) => (
          workout.exercise === exerciseName
            ? { ...workout, bodyPart, sets }
            : workout
        ))
      : [...current, { exercise: exerciseName, bodyPart, sets }];

    return await saveWorkoutForDate(date, nextWorkouts);
  } catch {
    return [];
  }
}

// Remove a set by index
export async function removeSet(date, exerciseName, setIndex) {
  try {
    const current = await getWorkoutForDate(date);
    const entry = current.find((e) => e.exercise === exerciseName);
    if (!entry) return current;

    const sets = entry.sets.filter((_, i) => i !== setIndex);

    const nextWorkouts = sets.length > 0
      ? current.map((workout) => (
          workout.exercise === exerciseName
            ? { ...workout, sets }
            : workout
        ))
      : current.filter((workout) => workout.exercise !== exerciseName);

    return await saveWorkoutForDate(date, nextWorkouts);
  } catch {
    return [];
  }
}

// Get dates that have workouts (for calendar dots)
export async function getWorkoutDates(month) {
  try {
    return await fetchJson(`${WORKOUT_API}/dates?month=${month}`);
  } catch {
    return [];
  }
}

// Get all personal records
export async function getAllPRs() {
  try {
    return await fetchJson(`${WORKOUT_API}/prs`);
  } catch {
    return {};
  }
}
