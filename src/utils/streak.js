function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function previousTrainingDate(date) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  if (previous.getDay() === 0) {
    previous.setDate(previous.getDate() - 1);
  }
  return previous;
}

/**
 * Count consecutive workout days, treating Sundays as non-streak days.
 * A streak remains active through Sunday, but a missed Saturday or Monday
 * still breaks it.
 */
export function calculateWorkoutStreak(workoutDates, today = new Date()) {
  const dates = new Set(
    workoutDates.filter((date) => parseDate(date).getDay() !== 0)
  );
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const latestDate = [...dates]
    .map(parseDate)
    .filter((date) => date <= currentDate)
    .sort((a, b) => b - a)[0];

  if (!latestDate) return 0;

  const expectedLatest = currentDate.getDay() === 0
    ? previousTrainingDate(currentDate)
    : currentDate;
  const latestDateString = formatDate(latestDate);
  const expectedLatestString = formatDate(expectedLatest);
  const yesterdayString = formatDate(previousTrainingDate(currentDate));

  if (latestDateString !== expectedLatestString && latestDateString !== yesterdayString) {
    return 0;
  }

  let streak = 0;
  let date = latestDate;
  while (dates.has(formatDate(date))) {
    streak += 1;
    date = previousTrainingDate(date);
  }
  return streak;
}
