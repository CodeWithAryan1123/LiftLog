import { useEffect, useState } from 'react';
import { getWorkoutDates } from '../utils/storage';
import { calculateWorkoutStreak } from '../utils/streak';
import './StreakCard.css';

export default function StreakCard({ refreshKey }) {
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    getWorkoutDates()
      .then((dates) => {
        if (active) setStreak(calculateWorkoutStreak(dates));
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setStreak(0);
          setError(err.message || 'Unable to load streak');
        }
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <div className="streak-card" aria-label="Workout streak">
      <div className="streak-icon" aria-hidden="true">🔥</div>
      <div className="streak-content">
        <div className="streak-label">Current streak</div>
        <div className="streak-value">
          {streak} <span>{streak === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="streak-hint">Sundays don't break your streak</div>
        {error && <div className="streak-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}
