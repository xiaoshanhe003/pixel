import type { ScenarioDefinition, ScenarioId, StudioDocument } from '../types/studio';

type StudioTopbarProps = {
  document: StudioDocument;
  activeScenario: ScenarioId;
  scenarios: ScenarioDefinition[];
  onScenarioChange: (scenarioId: ScenarioId) => void;
  onCreateBlankCanvas: () => void;
};

export default function StudioTopbar({
  document,
  activeScenario,
  scenarios,
  onScenarioChange,
  onCreateBlankCanvas,
}: StudioTopbarProps) {
  return (
    <header className="app-topbar">
      <div className="topbar-cluster">
        <nav className="scenario-switcher" aria-label="创作场景">
          {scenarios.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`scenario-tab${item.id === activeScenario ? ' is-active' : ''}`}
              onClick={() => onScenarioChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="topbar-cluster topbar-actions">
        <button type="button" className="chip-button" onClick={onCreateBlankCanvas}>
          新建空白画布
        </button>
      </div>

      <div className="topbar-cluster topbar-status">
        {activeScenario === 'pixel' ? (
          <span className="info-tag">{document.frames.length} 帧</span>
        ) : null}
      </div>
    </header>
  );
}
