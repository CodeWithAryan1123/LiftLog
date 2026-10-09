import { useState, useEffect } from 'react';
import { getAllPRs } from '../utils/storage';
import './PRTracker.css';

export default function PRTracker({ refreshKey }) {
  const [prs, setPrs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    setLoading(true);
    getAllPRs()
      .then((data) => {
        if (active) {
          setPrs(data);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setPrs({});
          setError(err.message || 'Unable to load personal records');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const grouped = {};
  Object.entries(prs).forEach(([exercise, data]) => {
    if (!grouped[data.bodyPart]) grouped[data.bodyPart] = [];
    grouped[data.bodyPart].push({ exercise, ...data });
  });

  const bodyParts = Object.keys(grouped).sort();
  const topRecords = Object.entries(prs)
    .map(([exercise, data]) => ({ exercise, ...data }))
    .sort((a, b) => b.weight - a.weight || b.reps - a.reps)
    .slice(0, 3);
  const strongestRecord = topRecords[0];

  if (loading) {
    return (
      <div className="pr-container">
        <div className="pr-head pr-head-skeleton">
          <div className="pr-head-title-skeleton shimmer" />
          <div className="pr-head-count-skeleton shimmer" />
        </div>
        <div className="pr-body pr-body-skeleton">
          <div className="pr-section-skeleton">
            <div className="pr-section-title-skeleton shimmer" />
            <div className="pr-row-skeleton shimmer" />
            <div className="pr-row-skeleton shimmer" />
          </div>
          <div className="pr-section-skeleton">
            <div className="pr-section-title-skeleton shimmer" />
            <div className="pr-row-skeleton shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pr-container pr-error-state" role="alert">
        <div className="pr-error-icon">!</div>
        <h3>Unable to load personal records</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (bodyParts.length === 0) {
    return (
      <div className="pr-container pr-empty-state">
        <div className="pr-empty-icon">🏆</div>
        <h3>No Personal Records Yet</h3>
        <p>Start logging your workouts to track your progress and set new PRs.</p>
      </div>
    );
  }

  return (
    <div className="pr-layout">
      <div className="pr-container">
        <div className="pr-head">
          <h3 className="pr-head-title">Personal Records</h3>
          <span className="pr-head-count">{Object.keys(prs).length} exercises tracked</span>
        </div>
        <div className="pr-body">
          {bodyParts.map((part) => (
            <div key={part} className="pr-section">
              <h4 className="pr-section-title">{part}</h4>
              <div className="pr-section-list">
                {grouped[part]
                  .sort((a, b) => b.weight - a.weight)
                  .map((pr) => (
                    <div key={pr.exercise} className="pr-row">
                      <span className="pr-row-name">{pr.exercise}</span>
                      <div className="pr-row-stats">
                        <span className="pr-row-weight">{pr.weight}<small>kg</small></span>
                        <span className="pr-row-sep">×</span>
                        <span className="pr-row-reps">{pr.reps}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="pr-insights">
        <div className="pr-insights-icon">✦</div>
        <p className="pr-insights-eyebrow">Training snapshot</p>
        <h3 className="pr-insights-title">Keep building momentum</h3>
        <p className="pr-insights-copy">
          Every record is proof that your consistency is paying off.
        </p>

        <div className="pr-insights-stats">
          <div className="pr-insight-stat">
            <strong>{Object.keys(prs).length}</strong>
            <span>records tracked</span>
          </div>
          <div className="pr-insight-stat">
            <strong>{bodyParts.length}</strong>
            <span>muscle groups</span>
          </div>
        </div>

        {strongestRecord && (
          <div className="pr-highlight">
            <span className="pr-highlight-label">Heaviest record</span>
            <strong>{strongestRecord.weight}<small> kg</small> × {strongestRecord.reps}</strong>
            <span className="pr-highlight-exercise">{strongestRecord.exercise}</span>
          </div>
        )}
      </aside>
    </div>
  );
}
