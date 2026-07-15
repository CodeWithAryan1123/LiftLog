import './BodyPartSelector.css';

const BODY_PARTS = [
  { id: 'Chest', color: '#f07178' },
  { id: 'Shoulder', color: '#f78c6c' },
  { id: 'Biceps', color: '#fbbf4a' },
  { id: 'Triceps', color: '#66d9a0' },
  { id: 'Back', color: '#4dd0e1' },
  { id: 'Legs', color: '#82aaff' },
  { id: 'Abs', color: '#c792ea' },
];

export default function BodyPartSelector({ selected, onSelect }) {
  return (
    <div className="bp-row">
      {BODY_PARTS.map((part) => (
        <button
          key={part.id}
          className={`bp-card ${selected === part.id ? 'bp-active' : ''}`}
          onClick={() => onSelect(selected === part.id ? null : part.id)}
          style={{ '--bp-color': part.color }}
        >
          <span className="bp-card-label">{part.id}</span>
          {selected === part.id && <span className="bp-active-dot" />}
        </button>
      ))}
    </div>
  );
}
