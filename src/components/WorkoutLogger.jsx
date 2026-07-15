import { useState, useEffect } from 'react';
import { addSetToExercise, removeSet, getAllPRs } from '../utils/storage';
import './WorkoutLogger.css';

export default function WorkoutLogger({
  exerciseName,
  bodyPart,
  selectedDate,
  dayWorkouts,
  onClose,
  onUpdate,
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPR, setCurrentPR] = useState(null);
  const [error, setError] = useState('');

  const exerciseEntry = dayWorkouts?.find((e) => e.exercise === exerciseName);
  const sets = exerciseEntry?.sets || [];

  // Fetch PRs
  useEffect(() => {
    let active = true;
    setError('');
    getAllPRs()
      .then((prs) => {
        if (active) {
          setCurrentPR(prs[exerciseName] || null);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setError(err.message || 'Unable to load PR information');
        }
      });
    return () => {
      active = false;
    };
  }, [exerciseName, dayWorkouts]);

  async function handleAddSet(e) {
    e.preventDefault();
    if (!weight || !reps || saving) return;

    setSaving(true);
    setError('');

    try {
      const newSet = { weight: Number(weight), reps: Number(reps) };
      const updated = await addSetToExercise(selectedDate, exerciseName, bodyPart, newSet);
      const isNewPR = !currentPR || newSet.weight > currentPR.weight;

      setWeight('');
      setReps('');
      onUpdate(updated, isNewPR);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to save workout');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSet(index) {
    setSaving(true);
    setError('');
    try {
      const updated = await removeSet(selectedDate, exerciseName, index);
      onUpdate(updated, false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to remove set');
    } finally {
      setSaving(false);
    }
  }

  // Format date nicely
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="wl-overlay" onClick={onClose}>
      <div className="wl-modal" onClick={(e) => e.stopPropagation()}>

        <div className="wl-top-bar">
          <button className="wl-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span className="wl-top-label">{bodyPart}</span>
          <div style={{ width: 32 }} />
        </div>

        <div className="wl-body">
          <h3 className="wl-exercise-name">{exerciseName}</h3>
          <span className="wl-date">{dateLabel}</span>

          {error && (
            <div className="wl-error" role="alert">
              {error}
            </div>
          )}

          {currentPR && (
            <div className="wl-pr-row">
              <span className="wl-pr-icon">🏆</span>
              <span className="wl-pr-text">PR: <strong>{currentPR.weight} kg</strong> × {currentPR.reps} reps</span>
            </div>
          )}

          {sets.length > 0 && (
            <div className="wl-sets">
              <div className="wl-sets-head">
                <span className="wl-sh-set">SET</span>
                <span className="wl-sh-val">KG</span>
                <span className="wl-sh-val">REPS</span>
                <span className="wl-sh-act"></span>
              </div>
              {sets.map((set, i) => (
                <div key={i} className={`wl-row ${currentPR && set.weight >= currentPR.weight ? 'wl-row-pr' : ''}`}>
                  <span className="wl-row-num">{i + 1}</span>
                  <span className="wl-row-weight">{set.weight}</span>
                  <span className="wl-row-reps">{set.reps}</span>
                  <button className="wl-row-del" onClick={() => handleRemoveSet(i)} title="Remove set" disabled={saving}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="wl-form" onSubmit={handleAddSet}>
            <div className="wl-field">
              <label>Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                autoFocus
              />
            </div>
            <div className="wl-field">
              <label>Reps</label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                min="1"
              />
            </div>
            <button type="submit" className="wl-submit" disabled={!weight || !reps || saving}>
              {saving ? '...' : 'Add Set'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
