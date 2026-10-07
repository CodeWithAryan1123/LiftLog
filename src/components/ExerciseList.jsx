import exercises from '../data/exercises';
import './ExerciseList.css';

export default function ExerciseList({ bodyPart, onSelectExercise, dayWorkouts }) {
  if (!bodyPart) {
    return (
      <div className="el-empty">
        <p className="el-empty-text">Select a muscle group to browse exercises</p>
      </div>
    );
  }

  const list = exercises[bodyPart] || [];

  const setCounts = {};
  const dropCounts = {};
  if (dayWorkouts) {
    dayWorkouts.forEach((entry) => {
      setCounts[entry.exercise] = entry.sets.length;
      dropCounts[entry.exercise] = entry.sets.filter((s) => s.isDropSet).length;
    });
  }

  return (
    <div className="el-container">
      <div className="el-header">
        <h3 className="el-title">{bodyPart}</h3>
        <span className="el-count">{list.length} exercises</span>
      </div>
      <div className="el-grid">
        {list.map((name) => {
          const done = setCounts[name] > 0;
          return (
            <button
              key={name}
              className={`el-card ${done ? 'el-card-done' : ''}`}
              onClick={() => onSelectExercise(name, bodyPart)}
            >
              <div className="el-card-top">
                <span className="el-card-name">{name}</span>
                <svg className="el-card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              {done && (
                <div className="el-card-badge">
                  <span className="el-card-check">✓</span>
                  <span>
                    {setCounts[name]} {setCounts[name] === 1 ? 'set' : 'sets'}
                    {dropCounts[name] > 0 ? ` (${dropCounts[name]} drop)` : ''} logged
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
