import type { ScenarioDefinition, ScenarioId, StudioDocument } from '../types/studio';
import { Button } from './ui/button';
import { DropdownField } from './ui/dropdown';

type StudioTopbarProps = {
  document: StudioDocument;
  activeScenario: ScenarioId;
  scenarios: ScenarioDefinition[];
  onScenarioChange: (scenarioId: ScenarioId) => void;
  onCreateBlankCanvas: () => void;
};

export default function StudioTopbar({
  document: _document,
  activeScenario,
  scenarios,
  onScenarioChange,
  onCreateBlankCanvas,
}: StudioTopbarProps) {
  return (
    <header className="app-topbar">
      <div className="topbar-cluster">
        <DropdownField
          className="topbar-scenario-dropdown"
          selectClassName="topbar-scenario-dropdown__select"
          label="创作场景"
          hideLabel
          value={activeScenario}
          options={scenarios.map((item) => ({
            label: item.label,
            value: item.id,
          }))}
          onChange={(value) => onScenarioChange(value as ScenarioId)}
        />
      </div>

      <div className="topbar-cluster topbar-actions">
        <Button variant="secondary" onClick={onCreateBlankCanvas}>
          新建空白画布
        </Button>
      </div>
    </header>
  );
}
