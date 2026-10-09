import { useState, useEffect } from 'react';
import { addSetToExercise, updateSet, removeSet, getAllPRs } from '../utils/storage';
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
  const [isDropSet, setIsDropSet] = useState(false);
  const [dropStages, setDropStages] = useState([
    { weight: '', reps: '' },
    { weight: '', reps: '' },
  ]);
  const [addingDropToSetIndex, setAddingDropToSetIndex] = useState(null);
  const [inlineDropWeight, setInlineDropWeight] = useState('');
  const [inlineDropReps, setInlineDropReps] = useState('');
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

  function handleAddDropStage() {
    setDropStages((prev) => [...prev, { weight: '', reps: '' }]);
  }

  function handleRemoveDropStage(index) {
    if (dropStages.length <= 1) return;
    setDropStages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleStageChange(index, field, value) {
    setDropStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  async function handleAddSet(e) {
    e.preventDefault();
    if (saving) return;

    if (isDropSet) {
      const validDrops = dropStages
        .filter((s) => s.weight !== '' && s.reps !== '')
        .map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) }));

      if (validDrops.length === 0) return;

      setSaving(true);
      setError('');

      try {
        const maxWeight = Math.max(...validDrops.map((d) => d.weight));
        const totalReps = validDrops.reduce((sum, d) => sum + d.reps, 0);
        const bestDrop = validDrops.reduce((best, drop) => (
          !best
            || drop.weight > best.weight
            || (drop.weight === best.weight && drop.reps > best.reps)
            ? drop
            : best
        ), null);

        const newSet = {
          weight: maxWeight,
          reps: totalReps,
          isDropSet: true,
          drops: validDrops,
        };

        const updated = await addSetToExercise(selectedDate, exerciseName, bodyPart, newSet);
        const isNewPR = !currentPR
          || bestDrop.weight > currentPR.weight
          || (bestDrop.weight === currentPR.weight && bestDrop.reps > currentPR.reps);

        // Reset
        setDropStages([
          { weight: '', reps: '' },
          { weight: '', reps: '' },
        ]);
        setIsDropSet(false);
        onUpdate(updated, isNewPR);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Unable to save workout');
      } finally {
        setSaving(false);
      }
    } else {
      if (!weight || !reps) return;

      setSaving(true);
      setError('');

      try {
        const newSet = {
          weight: Number(weight),
          reps: Number(reps),
          isDropSet: false,
        };
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
  }

  async function handleToggleDropSet(index) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const targetSet = sets[index];
      const willBeDrop = !targetSet.isDropSet;
      const updatedFields = { isDropSet: willBeDrop };
      if (willBeDrop && (!targetSet.drops || targetSet.drops.length === 0)) {
        updatedFields.drops = [{ weight: targetSet.weight, reps: targetSet.reps }];
      }
      const updated = await updateSet(selectedDate, exerciseName, index, updatedFields);
      onUpdate(updated, false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to update set');
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

  async function handleSaveInlineDrop(setIndex) {
    if (!inlineDropWeight || !inlineDropReps || saving) return;
    setSaving(true);
    setError('');
    try {
      const target = sets[setIndex];
      const existingDrops =
        target.drops && target.drops.length > 0
          ? [...target.drops]
          : [{ weight: target.weight, reps: target.reps }];

      const nextDrops = [
        ...existingDrops,
        { weight: Number(inlineDropWeight), reps: Number(inlineDropReps) },
      ];
      const maxWeight = Math.max(...nextDrops.map((d) => d.weight));
      const totalSetReps = nextDrops.reduce((sum, d) => sum + d.reps, 0);

      const updated = await updateSet(selectedDate, exerciseName, setIndex, {
        isDropSet: true,
        weight: maxWeight,
        reps: totalSetReps,
        drops: nextDrops,
      });

      setAddingDropToSetIndex(null);
      setInlineDropWeight('');
      setInlineDropReps('');
      onUpdate(updated, false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to add drop to set');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveDropFromSet(setIndex, dropIndex) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const target = sets[setIndex];
      if (!target.drops || target.drops.length <= 1) return;
      const nextDrops = target.drops.filter((_, i) => i !== dropIndex);
      const maxWeight = Math.max(...nextDrops.map((d) => d.weight));
      const totalSetReps = nextDrops.reduce((sum, d) => sum + d.reps, 0);

      const updated = await updateSet(selectedDate, exerciseName, setIndex, {
        weight: maxWeight,
        reps: totalSetReps,
        drops: nextDrops,
      });
      onUpdate(updated, false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to remove drop');
    } finally {
      setSaving(false);
    }
  }

  // Format date nicely
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const validDropCount = dropStages.filter((s) => s.weight !== '' && s.reps !== '').length;

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
                <span className="wl-sh-type">TYPE</span>
                <span className="wl-sh-val">WEIGHT</span>
                <span className="wl-sh-val">REPS</span>
                <span className="wl-sh-act"></span>
              </div>
              {sets.map((set, i) => {
                const isDrop = Boolean(set.isDropSet);
                const dropsList = set.drops && set.drops.length > 0
                  ? set.drops
                  : isDrop
                  ? [{ weight: set.weight, reps: set.reps }]
                  : null;

                return (
                  <div
                    key={i}
                    className={`wl-row ${isDrop ? 'wl-row-dropset' : ''} ${currentPR && set.weight >= currentPR.weight ? 'wl-row-pr' : ''}`}
                  >
                    <div className="wl-row-main-line">
                      <span className="wl-row-num">{i + 1}</span>
                      <button
                        type="button"
                        className={`wl-row-type-badge ${isDrop ? 'is-drop' : 'is-normal'}`}
                        onClick={() => handleToggleDropSet(i)}
                        title="Click to toggle Normal / Drop Set"
                        disabled={saving}
                      >
                        {isDrop ? 'DROP' : 'Normal'}
                      </button>
                      <span className="wl-row-weight">
                        {set.weight} <small className="wl-unit">kg</small>
                      </span>
                      <span className="wl-row-reps">
                        {set.reps} <small className="wl-unit">reps</small>
                      </span>
                      <button
                        className="wl-row-del"
                        onClick={() => handleRemoveSet(i)}
                        title="Remove set"
                        disabled={saving}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>

                    {/* Breakdown of all weights/reps trained in this drop set */}
                    {isDrop && dropsList && (
                      <div className="wl-drop-chain-container">
                        <div className="wl-drop-chain">
                          {dropsList.map((drop, dIdx) => (
                            <div key={dIdx} className="wl-chain-stage">
                              {dIdx > 0 && <span className="wl-chain-arrow">➔</span>}
                              <div className="wl-chain-pill">
                                <span className="wl-chain-label">
                                  {dIdx === 0 ? '1st' : `Drop ${dIdx}`}
                                </span>
                                <span className="wl-chain-values">
                                  <strong>{drop.weight}kg</strong> × {drop.reps}
                                </span>
                                {dropsList.length > 1 && (
                                  <button
                                    type="button"
                                    className="wl-chain-item-del"
                                    onClick={() => handleRemoveDropFromSet(i, dIdx)}
                                    title="Remove this drop"
                                    disabled={saving}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {addingDropToSetIndex !== i && (
                            <button
                              type="button"
                              className="wl-chain-add-btn"
                              onClick={() => {
                                setAddingDropToSetIndex(i);
                                setInlineDropWeight('');
                                setInlineDropReps('');
                              }}
                              title="Add another weight to this drop set"
                            >
                              + Add drop
                            </button>
                          )}
                        </div>

                        {/* Inline add drop form */}
                        {addingDropToSetIndex === i && (
                          <div className="wl-inline-add-box">
                            <span className="wl-inline-add-title">Add drop to Set {i + 1}:</span>
                            <div className="wl-inline-add-inputs">
                              <input
                                type="number"
                                placeholder="Weight (kg)"
                                value={inlineDropWeight}
                                onChange={(e) => setInlineDropWeight(e.target.value)}
                                min="0"
                                step="0.5"
                                autoFocus
                              />
                              <input
                                type="number"
                                placeholder="Reps"
                                value={inlineDropReps}
                                onChange={(e) => setInlineDropReps(e.target.value)}
                                min="1"
                              />
                              <button
                                type="button"
                                className="wl-inline-btn wl-inline-save"
                                onClick={() => handleSaveInlineDrop(i)}
                                disabled={!inlineDropWeight || !inlineDropReps || saving}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="wl-inline-btn wl-inline-cancel"
                                onClick={() => {
                                  setAddingDropToSetIndex(null);
                                  setInlineDropWeight('');
                                  setInlineDropReps('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <form className="wl-form" onSubmit={handleAddSet}>
            <div className="wl-type-toggle">
              <button
                type="button"
                className={`wl-type-btn ${!isDropSet ? 'active' : ''}`}
                onClick={() => setIsDropSet(false)}
              >
                Normal Set
              </button>
              <button
                type="button"
                className={`wl-type-btn wl-type-drop ${isDropSet ? 'active' : ''}`}
                onClick={() => setIsDropSet(true)}
              >
                Drop Set
              </button>
            </div>

            {isDropSet ? (
              /* Drop Set multi-stage builder */
              <div className="wl-drop-builder">
                <div className="wl-drop-builder-header">
                  <div className="wl-drop-builder-title">
                    <span>Drop Set</span>
                  </div>
                  <span className="wl-drop-builder-sub">No rest between drops</span>
                </div>

                <div className="wl-drop-stages-list">
                  {dropStages.map((stage, sIdx) => (
                    <div key={sIdx} className="wl-drop-stage-row">
                      <span className="wl-stage-badge">
                        {sIdx === 0 ? '1st (Initial)' : `Drop ${sIdx}`}
                      </span>
                      <div className="wl-field">
                        <label>Weight (kg)</label>
                        <input
                          type="number"
                          value={stage.weight}
                          onChange={(e) => handleStageChange(sIdx, 'weight', e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.5"
                          autoFocus={sIdx === 0}
                        />
                      </div>
                      <div className="wl-field">
                        <label>Reps</label>
                        <input
                          type="number"
                          value={stage.reps}
                          onChange={(e) => handleStageChange(sIdx, 'reps', e.target.value)}
                          placeholder="0"
                          min="1"
                        />
                      </div>
                      {dropStages.length > 1 && (
                        <button
                          type="button"
                          className="wl-stage-remove"
                          onClick={() => handleRemoveDropStage(sIdx)}
                          title="Remove drop"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="wl-add-more-drop-btn"
                  onClick={handleAddDropStage}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add more in this drop set
                </button>
              </div>
            ) : (
              /* Normal set inputs */
              <div className="wl-inputs-row">
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
              </div>
            )}

            <button
              type="submit"
              className={`wl-submit ${isDropSet ? 'wl-submit-drop' : ''}`}
              disabled={
                saving ||
                (isDropSet ? validDropCount === 0 : !weight || !reps)
              }
            >
              {saving
                ? '...'
                : isDropSet
                ? 'Add Drop Set'
                : 'Add Set'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
