import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Calendar from './components/Calendar';
import BodyPartSelector from './components/BodyPartSelector';
import ExerciseList from './components/ExerciseList';
import WorkoutLogger from './components/WorkoutLogger';
import PRTracker from './components/PRTracker';
import { getWorkoutForDate } from './utils/storage';
import './App.css';

function getTodayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateStr) {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function AppContent() {
  const { user, logout, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedBodyPart, setSelectedBodyPart] = useState(null);
  const [loggerOpen, setLoggerOpen] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [prFlash, setPrFlash] = useState(null);
  const [activeTab, setActiveTab] = useState('workout');
  const [dayWorkouts, setDayWorkouts] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Fetch workouts when date or refreshKey changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setDataError('');
    setDataLoading(true);
    getWorkoutForDate(selectedDate)
      .then((data) => {
        if (!cancelled) {
          setDayWorkouts(data);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setDayWorkouts([]);
          setDataError(err.message || 'Unable to load workout data');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDataLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedDate, refreshKey, user]);

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  function handleSelectExercise(exerciseName, bodyPart) {
    setLoggerOpen({ exerciseName, bodyPart });
  }

  function handleLoggerUpdate(updatedWorkouts, isNewPR) {
    setDayWorkouts(updatedWorkouts);
    refresh();
    if (isNewPR) {
      setPrFlash(loggerOpen.exerciseName);
      setTimeout(() => setPrFlash(null), 2500);
    }
  }

  function handleCloseLogger() {
    setLoggerOpen(null);
  }

  const totalSets = dayWorkouts.reduce((t, e) => t + e.sets.length, 0);
  const totalReps = dayWorkouts.reduce((t, e) => t + e.sets.reduce((r, s) => r + s.reps, 0), 0);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/></svg>
          </div>
          <div>
            <h1 className="app-title">LiftLog</h1>
            <p className="app-subtitle">Track Every Rep. Beat Every PR.</p>
          </div>
        </div>
        <div className="app-header-right">
          <nav className="app-nav">
            <button
              className={`nav-btn ${activeTab === 'workout' ? 'nav-active' : ''}`}
              onClick={() => setActiveTab('workout')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              Workout
            </button>
            <button
              className={`nav-btn ${activeTab === 'prs' ? 'nav-active' : ''}`}
              onClick={() => setActiveTab('prs')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Records
            </button>
          </nav>
          <div className="app-user">
            <span className="app-username">{user.name}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      {prFlash && (
        <div className="pr-toast">
          <span className="pr-toast-icon">🏆</span>
          <div>
            <strong>New Personal Record!</strong>
            <span className="pr-toast-exercise">{prFlash}</span>
          </div>
        </div>
      )}

      {activeTab === 'workout' ? (
        <main className="app-main">
          <aside className="app-sidebar">
            <Calendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              refreshKey={refreshKey}
            />

            <div className="day-card">
              <div className="day-card-header">
                <h3 className="day-card-title">{formatDateLabel(selectedDate)}</h3>
                {dayWorkouts.length > 0 && (
                  <div className="day-card-stats">
                    <span className="day-stat">{dayWorkouts.length} exercises</span>
                    <span className="day-stat-sep">·</span>
                    <span className="day-stat">{totalSets} sets</span>
                    <span className="day-stat-sep">·</span>
                    <span className="day-stat">{totalReps} reps</span>
                  </div>
                )}
              </div>
              {dataError && (
                <div className="day-card-error" role="alert">
                  {dataError}
                </div>
              )}
              {dataLoading ? (
                <div className="day-card-skeleton-list">
                  <div className="day-card-skeleton-item shimmer" />
                  <div className="day-card-skeleton-item shimmer" />
                  <div className="day-card-skeleton-item shimmer" />
                </div>
              ) : dayWorkouts.length === 0 ? (
                <div className="day-card-empty">
                  <p>No exercises logged</p>
                  <p className="day-card-empty-hint">Select a body part to start</p>
                </div>
              ) : (
                <div className="day-card-list">
                  {dayWorkouts.map((entry) => (
                    <button
                      key={entry.exercise}
                      className="day-card-item"
                      onClick={() => handleSelectExercise(entry.exercise, entry.bodyPart)}
                    >
                      <div className="dci-left">
                        <span className="dci-part">{entry.bodyPart}</span>
                        <span className="dci-name">{entry.exercise}</span>
                      </div>
                      <div className="dci-right">
                        <span className="dci-sets">{entry.sets.length}×</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="app-content">
            <BodyPartSelector
              selected={selectedBodyPart}
              onSelect={setSelectedBodyPart}
            />
            <ExerciseList
              bodyPart={selectedBodyPart}
              onSelectExercise={handleSelectExercise}
              dayWorkouts={dayWorkouts}
            />
          </section>
        </main>
      ) : (
        <main className="app-main app-main-single">
          <PRTracker refreshKey={refreshKey} />
        </main>
      )}

      {loggerOpen && (
        <WorkoutLogger
          exerciseName={loggerOpen.exerciseName}
          bodyPart={loggerOpen.bodyPart}
          selectedDate={selectedDate}
          dayWorkouts={dayWorkouts}
          onClose={handleCloseLogger}
          onUpdate={handleLoggerUpdate}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
