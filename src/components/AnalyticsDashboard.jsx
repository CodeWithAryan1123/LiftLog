import { useEffect, useState } from 'react';
import { getWorkoutAnalytics } from '../utils/storage';
import './AnalyticsDashboard.css';

function number(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function changeLabel(value) {
  if (value === null || value === undefined) return 'No prior period';
  return `${value > 0 ? '+' : ''}${number(value, 1)}% vs prior`;
}

export default function AnalyticsDashboard({ refreshKey }) {
  const [range, setRange] = useState('month');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getWorkoutAnalytics(range)
      .then((data) => {
        if (active) setAnalytics(data);
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setAnalytics(null);
          setError(err.message || 'Unable to load workout analytics');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  return (
    <div className="analytics-container">
      <div className="analytics-page-head">
        <div>
          <p className="analytics-eyebrow">Progress overview</p>
          <h2 className="analytics-title">Workout analytics</h2>
          <p className="analytics-subtitle">See how consistently and effectively you are training.</p>
        </div>
        <div className="analytics-filter" role="group" aria-label="Analytics period">
          {[
            ['week', 'Week'],
            ['month', 'Month'],
            ['all', 'All time'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={range === value ? 'active' : ''} onClick={() => setRange(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="analytics-error" role="alert">{error}</div>}
      {loading ? (
        <div className="analytics-panel analytics-empty">Loading analytics...</div>
      ) : analytics ? (
        <>
          <div className="analytics-metrics">
            <div className="analytics-metric"><span>Workouts</span><strong>{analytics.summary.workouts}</strong><small>training days</small></div>
            <div className="analytics-metric"><span>Frequency</span><strong>{number(analytics.summary.frequency, 1)}</strong><small>workouts / week</small></div>
            <div className="analytics-metric"><span>Total volume</span><strong>{number(analytics.summary.volume)}</strong><small>kg lifted</small></div>
            <div className="analytics-metric"><span>Total sets</span><strong>{number(analytics.summary.sets)}</strong><small>{number(analytics.summary.reps)} reps</small></div>
            <div className="analytics-metric"><span>Consistency</span><strong>{analytics.summary.consistency === null ? '—' : `${number(analytics.summary.consistency, 1)}%`}</strong><small>active days in period</small></div>
            <div className="analytics-metric"><span>Average volume</span><strong>{number(analytics.summary.averageVolume)}</strong><small>kg per workout</small></div>
          </div>

          <section className="analytics-panel analytics-progress-panel">
            <div className="analytics-panel-head">
              <div><h3>Progress snapshot</h3><p>Compared with the previous matching period</p></div>
            </div>
            <div className="analytics-progress-grid">
              <div><span>Training volume</span><strong>{changeLabel(analytics.progress.volumeChange)}</strong></div>
              <div><span>Workout days</span><strong>{changeLabel(analytics.progress.workoutsChange)}</strong></div>
            </div>
          </section>

          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <div><h3>Training frequency</h3><p>Workout volume by training day</p></div>
            </div>
            {analytics.daily.length === 0 ? (
              <div className="analytics-empty">No strength workouts in this period.</div>
            ) : (
              <div className="analytics-daily-list">
                {analytics.daily.map((day) => {
                  const maxVolume = Math.max(...analytics.daily.map((item) => item.volume), 1);
                  return (
                    <div className="analytics-day" key={day.date}>
                      <span>{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <div className="analytics-bar-track">
                        <div className="analytics-bar" style={{ width: `${Math.max((day.volume / maxVolume) * 100, 3)}%` }} />
                      </div>
                      <strong>{number(day.volume)} kg</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="analytics-columns">
            <section className="analytics-panel">
              <div className="analytics-panel-head"><div><h3>Muscle groups</h3><p>Volume distribution</p></div></div>
              {analytics.muscleGroups.length === 0 ? (
                <div className="analytics-empty">No muscle data yet.</div>
              ) : (
                <div className="analytics-ranking">
                  {analytics.muscleGroups.map((group) => (
                    <div className="analytics-ranking-row" key={group.name}>
                      <span>{group.name}</span>
                      <div className="analytics-rank-value"><strong>{number(group.volume)} kg</strong><small>{group.sets} sets</small></div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="analytics-panel">
              <div className="analytics-panel-head"><div><h3>Exercise progression</h3><p>Volume and estimated 1RM</p></div></div>
              {analytics.exercises.length === 0 ? (
                <div className="analytics-empty">No exercise data yet.</div>
              ) : (
                <div className="analytics-ranking">
                  {analytics.exercises.map((exercise) => (
                    <div className="analytics-ranking-row" key={exercise.exercise}>
                      <span>{exercise.exercise}<small>{exercise.bodyPart}</small></span>
                      <div className="analytics-rank-value"><strong>{number(exercise.volume)} kg</strong><small>1RM {number(exercise.estimated1RM)} kg · {changeLabel(exercise.progression)}</small></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
