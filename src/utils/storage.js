import { API_BASE } from './api';
import { getToken } from '../context/AuthContext';

const WORKOUT_API = `${API_BASE}/api/workouts`;

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = 'Request failed';

    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      try {
        const text = await res.text();
        if (text) {
          message = text;
        }
      } catch {
        // Ignore unreadable bodies and keep the default message.
      }
    }

    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export async function saveWorkoutForDate(date, exercises) {
  return fetchJson(`${WORKOUT_API}/${date}`, {
    method: 'POST',
    body: JSON.stringify({ exercises }),
  });
}

// Get all exercises logged for a specific date
export async function getWorkoutForDate(date) {
  return fetchJson(`${WORKOUT_API}/${date}`);
}

// Add a set to an exercise on a date
export async function addSetToExercise(date, exerciseName, bodyPart, newSet) {
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

  return saveWorkoutForDate(date, nextWorkouts);
}

// Remove a set by index
export async function removeSet(date, exerciseName, setIndex) {
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

  return saveWorkoutForDate(date, nextWorkouts);
}

// Update a set by index (e.g. toggle isDropSet, or edit values)
export async function updateSet(date, exerciseName, setIndex, updatedFields) {
  const current = await getWorkoutForDate(date);
  const entry = current.find((e) => e.exercise === exerciseName);
  if (!entry || !entry.sets[setIndex]) return current;

  const sets = entry.sets.map((s, i) =>
    i === setIndex ? { ...s, ...updatedFields } : s
  );

  const nextWorkouts = current.map((workout) =>
    workout.exercise === exerciseName
      ? { ...workout, sets }
      : workout
  );

  return saveWorkoutForDate(date, nextWorkouts);
}

// Get dates that have workouts (for calendar dots)
export async function getWorkoutDates(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  return fetchJson(`${WORKOUT_API}/dates${query}`);
}

// Get all personal records
export async function getAllPRs() {
  return fetchJson(`${WORKOUT_API}/prs`);
}
