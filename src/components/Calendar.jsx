import { useState, useEffect } from 'react';
import { getWorkoutDates } from '../utils/storage';
import './Calendar.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar({ selectedDate, onSelectDate, refreshKey }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [workoutDates, setWorkoutDates] = useState(new Set());
  const [error, setError] = useState('');

  // Fetch workout dates from API when month or refreshKey changes
  useEffect(() => {
    let active = true;
    setError('');
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    getWorkoutDates(monthStr)
      .then((dates) => {
        if (active) {
          setWorkoutDates(new Set(dates));
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setWorkoutDates(new Set());
          setError(err.message || 'Unable to load calendar data');
        }
      });
    return () => {
      active = false;
    };
  }, [viewYear, viewMonth, refreshKey]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-cell cal-empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === todayStr;
    const hasWorkout = workoutDates.has(dateStr);

    cells.push(
      <div
        key={dateStr}
        className={`cal-cell ${isSelected ? 'cal-selected' : ''} ${isToday ? 'cal-today' : ''}`}
        onClick={() => onSelectDate(dateStr)}
      >
        <span className="cal-day-num">{d}</span>
        {hasWorkout && <span className="cal-dot" />}
      </div>
    );
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <h2 className="cal-title">{MONTHS[viewMonth]} {viewYear}</h2>
        <button className="cal-nav" onClick={nextMonth}>›</button>
      </div>
      {error && (
        <div className="cal-error" role="alert">
          {error}
        </div>
      )}
      <div className="cal-weekdays">
        {DAYS.map((d) => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
      </div>
      <div className="cal-grid">{cells}</div>
    </div>
  );
}
