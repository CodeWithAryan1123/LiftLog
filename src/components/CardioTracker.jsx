import { useEffect, useState } from 'react';
import {
  deleteCardioSession,
  getCardioSessions,
  getStepsForDate,
  saveCardioSession,
  saveStepsForDate,
  updateCardioSession,
} from '../utils/storage';
import './CardioTracker.css';

const CARDIO_TYPES = [
  'Treadmill',
  'Running',
  'Walking',
  'Jogging',
  'Sprints',
  'Shuttle Runs',
  'Cycling',
  'Stationary Bike',
  'Spin Bike',
  'Assault Bike',
  'StairMaster',
  'Stair Climbing',
  'Elliptical',
  'Rowing',
  'Swimming',
  'Jump Rope',
  'Jumping Jacks',
  'High Knees',
  'Mountain Climbers',
  'Burpees',
  'Squat Jumps',
  'Box Jumps',
  'Skater Jumps',
  'Bear Crawl',
  'HIIT',
  'Circuit Training',
  'Hiking',
  'Dancing',
  'Kickboxing',
  'Shadow Boxing',
  'Other',
];
const INTENSITIES = ['Low', 'Moderate', 'High'];

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function emptyForm() {
  return {
    date: todayString(),
    cardioType: 'Treadmill',
    duration: '',
    distance: '',
    calories: '',
    heartRate: '',
    intensity: 'Moderate',
    notes: '',
  };
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function number(value, digits = 1) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export default function CardioTracker({ refreshKey }) {
  const [range, setRange] = useState('week');
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({ sessions: 0, duration: 0, distance: 0, calories: 0 });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [stepsDate, setStepsDate] = useState(todayString());
  const [steps, setSteps] = useState('');
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsSaving, setStepsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getCardioSessions(range)
      .then((data) => {
        if (active) {
          setSessions(data.sessions);
          setSummary(data.summary);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setSessions([]);
          setSummary({ sessions: 0, duration: 0, distance: 0, calories: 0 });
          setError(err.message || 'Unable to load cardio sessions');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  useEffect(() => {
    let active = true;
    setStepsLoading(true);
    getStepsForDate(stepsDate)
      .then((data) => {
        if (active) setSteps(data.steps ? String(data.steps) : '');
      })
      .catch((err) => {
        console.error(err);
        if (active) setError(err.message || 'Unable to load steps');
      })
      .finally(() => {
        if (active) setStepsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [stepsDate, refreshKey]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateCardioSession(editingId, form);
      } else {
        await saveCardioSession(form);
      }
      setForm(emptyForm());
      setEditingId(null);
      const data = await getCardioSessions(range);
      setSessions(data.sessions);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to save cardio session');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(session) {
    setEditingId(session.id);
    setForm({
      date: session.date,
      cardioType: session.cardioType,
      duration: session.duration,
      distance: session.distance ?? '',
      calories: session.calories ?? '',
      heartRate: session.heartRate ?? '',
      intensity: session.intensity,
      notes: session.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleDelete(id) {
    if (saving || !window.confirm('Delete this cardio session?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteCardioSession(id);
      const data = await getCardioSessions(range);
      setSessions(data.sessions);
      setSummary(data.summary);
      if (editingId === id) cancelEditing();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to delete cardio session');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cardio-container">
      <div className="cardio-page-head">
        <div>
          <p className="cardio-eyebrow">Training log</p>
          <h2 className="cardio-title">Cardio</h2>
          <p className="cardio-subtitle">Track your conditioning alongside strength training.</p>
        </div>
        <div className="cardio-head-icon">♥</div>
      </div>

      <form className="cardio-form cardio-panel" onSubmit={handleSubmit}>
        <div className="cardio-panel-head">
          <h3>{editingId ? 'Edit cardio session' : 'Log cardio'}</h3>
          {editingId && <button type="button" className="cardio-link-btn" onClick={cancelEditing}>Cancel</button>}
        </div>
        <div className="cardio-form-grid">
          <label className="cardio-field">
            <span>Date</span>
            <input type="date" name="date" value={form.date} onChange={handleChange} required />
          </label>
          <label className="cardio-field">
            <span>Cardio type</span>
            <select name="cardioType" value={form.cardioType} onChange={handleChange}>
              {CARDIO_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="cardio-field">
            <span>Duration (min)</span>
            <input type="number" name="duration" value={form.duration} onChange={handleChange} min="0.1" step="0.1" required />
          </label>
          <label className="cardio-field">
            <span>Distance (km) <em>optional</em></span>
            <input type="number" name="distance" value={form.distance} onChange={handleChange} min="0" step="0.1" />
          </label>
          <label className="cardio-field">
            <span>Calories <em>optional</em></span>
            <input type="number" name="calories" value={form.calories} onChange={handleChange} min="0" step="1" />
          </label>
          <label className="cardio-field">
            <span>Avg. heart rate <em>optional</em></span>
            <input type="number" name="heartRate" value={form.heartRate} onChange={handleChange} min="0" step="1" placeholder="BPM" />
          </label>
          <label className="cardio-field">
            <span>Intensity</span>
            <select name="intensity" value={form.intensity} onChange={handleChange}>
              {INTENSITIES.map((intensity) => <option key={intensity}>{intensity}</option>)}
            </select>
          </label>
          <label className="cardio-field cardio-field-wide">
            <span>Notes <em>optional</em></span>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" placeholder="How did it feel?" />
          </label>
        </div>
        {error && <div className="cardio-error" role="alert">{error}</div>}
        <button className="cardio-primary-btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add cardio session'}
        </button>
      </form>

      <section className="cardio-panel steps-panel">
        <div className="cardio-panel-head">
          <div>
            <h3>Daily steps</h3>
            <p>Update the steps you completed on a particular day.</p>
          </div>
          <span className="steps-icon" aria-hidden="true">👟</span>
        </div>
        <div className="steps-form">
          <label className="cardio-field">
            <span>Date</span>
            <input
              type="date"
              value={stepsDate}
              onChange={(event) => setStepsDate(event.target.value)}
            />
          </label>
          <label className="cardio-field">
            <span>Steps</span>
            <input
              type="number"
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
              min="0"
              step="1"
              placeholder={stepsLoading ? 'Loading...' : 'e.g. 8000'}
              disabled={stepsLoading}
            />
          </label>
          <button
            className="cardio-primary-btn steps-save-btn"
            type="button"
            onClick={async () => {
              if (stepsSaving || steps === '') return;
              setStepsSaving(true);
              setError('');
              try {
                const saved = await saveStepsForDate(stepsDate, Number(steps));
                setSteps(String(saved.steps));
              } catch (err) {
                console.error(err);
                setError(err.message || 'Unable to save steps');
              } finally {
                setStepsSaving(false);
              }
            }}
            disabled={stepsSaving || stepsLoading || steps === ''}
          >
            {stepsSaving ? 'Saving...' : 'Update steps'}
          </button>
        </div>
      </section>

      <section className="cardio-panel">
        <div className="cardio-panel-head cardio-history-head">
          <div>
            <h3>Summary</h3>
            <p>Cardio recorded in the selected period</p>
          </div>
          <div className="cardio-filter" role="group" aria-label="Cardio history period">
            {[
              ['week', 'This week'],
              ['month', 'This month'],
              ['all', 'All time'],
            ].map(([value, label]) => (
              <button key={value} type="button" className={range === value ? 'active' : ''} onClick={() => setRange(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="cardio-summary-grid">
          <div><strong>{summary.sessions}</strong><span>Sessions</span></div>
          <div><strong>{number(summary.duration)} <small>min</small></strong><span>Total time</span></div>
          <div><strong>{number(summary.distance)} <small>km</small></strong><span>Distance</span></div>
          <div><strong>{number(summary.calories, 0)} <small>kcal</small></strong><span>Calories</span></div>
        </div>
      </section>

      <section className="cardio-panel">
        <div className="cardio-panel-head">
          <div>
            <h3>Cardio history</h3>
            <p>Previous cardio sessions</p>
          </div>
          <span className="cardio-count">{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</span>
        </div>
        {loading ? (
          <div className="cardio-empty">Loading cardio history...</div>
        ) : sessions.length === 0 ? (
          <div className="cardio-empty">No cardio sessions in this period.</div>
        ) : (
          <div className="cardio-history-list">
            {sessions.map((session) => (
              <article className="cardio-record" key={session.id}>
                <div className="cardio-record-main">
                  <div className="cardio-record-title">
                    <h4>{session.cardioType}</h4>
                    <span className={`cardio-intensity cardio-${session.intensity.toLowerCase()}`}>{session.intensity}</span>
                  </div>
                  <span className="cardio-record-date">{formatDate(session.date)}</span>
                  <div className="cardio-record-stats">
                    <span><strong>{number(session.duration)}</strong> min</span>
                    {session.distance != null && <span><strong>{number(session.distance)}</strong> km</span>}
                    {session.calories != null && <span><strong>{number(session.calories, 0)}</strong> kcal</span>}
                    {session.heartRate != null && <span><strong>{session.heartRate}</strong> BPM</span>}
                  </div>
                  {session.notes && <p className="cardio-record-notes">{session.notes}</p>}
                </div>
                <div className="cardio-record-actions">
                  <button type="button" onClick={() => startEditing(session)}>Edit</button>
                  <button type="button" className="danger" onClick={() => handleDelete(session.id)} disabled={saving}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
