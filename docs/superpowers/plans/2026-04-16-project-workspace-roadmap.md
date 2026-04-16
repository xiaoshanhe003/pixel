# Project Workspace Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project workspace layer above the current editor so users can create projects, pick canvas size and project type, reopen saved work, and continue editing without losing state.

**Architecture:** Split the app into two product surfaces: a project dashboard and an editor workspace. Move persistence and project metadata into a dedicated domain/repository layer so editor logic stops owning every top-level concern. Keep login out of the first release; use local-first storage and an explicit serialization format that can later back a cloud sync adapter.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, `localStorage` for v1 persistence

---

## Scope Note

This roadmap intentionally delivers one closed loop first:

1. User lands on a project dashboard.
2. User creates a project with type and canvas size.
3. User enters the editor.
4. Changes autosave locally.
5. User returns later and reopens the project.

Do **not** add login, remote sync, or payments in this batch. Those are follow-up plans after local persistence, schema versioning, and project lifecycle UX are stable.

## Current Architecture Risks To Fix Early

- `src/hooks/useStudioApp.ts` is already acting as app shell, editor controller, playback controller, persistence candidate, and scenario switcher at once. At `513` lines, it is the biggest refactor risk.
- `src/App.tsx` assumes one always-open editor. There is no route or shell abstraction for a dashboard surface.
- `src/types/studio.ts` models a document, but not a project. There is nowhere to store project name, timestamps, cover preview, or persistence version.
- `src/types/pixel.ts` hard-codes `GridSize = 16 | 32 | 64` and reuses that type for both `width` and `height`. That works for square-only v1 presets, but it will force a bigger refactor when beads/crochet need rectangular canvases.
- `src/utils/studio.ts` owns pure document helpers and ID generation together. The module is `914` lines and will become harder to evolve once save/load, undo history, and migrations land.
- `src/styles.css` is global and monolithic at `1242` lines. A dashboard plus future auth/payments/settings screens will make this harder to maintain.
- Current state is in memory only. Refreshing the page loses the session; this blocks the planned product model.
- Route state lives only in React state today. That is fine for the first batch, but later refresh/deep-link behavior should not depend on an in-memory route.
- `localStorage` is enough for v1, but the plan must keep persistence behind a repository boundary so the app can later move to IndexedDB or cloud sync without touching editor logic.

## Proposed File Structure

### Existing files to modify

- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/hooks/useStudioApp.ts`
- Modify: `src/types/studio.ts`
- Modify: `src/utils/studio.ts`
- Modify: `src/test/appTestUtils.tsx`
- Modify: `README.md`
- Modify: `src/styles.css`

### New files to create

- Create: `src/app/AppShell.tsx`
- Create: `src/app/routes.ts`
- Create: `src/features/projects/types.ts`
- Create: `src/features/projects/defaults.ts`
- Create: `src/features/projects/serialization.ts`
- Create: `src/features/projects/repository.ts`
- Create: `src/features/projects/useProjectsStore.ts`
- Create: `src/features/projects/components/ProjectDashboard.tsx`
- Create: `src/features/projects/components/CreateProjectDialog.tsx`
- Create: `src/features/projects/components/ProjectCard.tsx`
- Create: `src/features/editor/EditorWorkspace.tsx`
- Create: `src/features/editor/useEditorSession.ts`
- Create: `src/features/editor/saveStatus.ts`
- Create: `src/features/projects/__tests__/repository.test.ts`
- Create: `src/features/projects/__tests__/dashboard.test.tsx`
- Create: `src/features/editor/__tests__/autosave.test.tsx`

### Responsibility boundaries

- `src/features/projects/*`: project metadata, creation, list/open/delete, serialization, migrations
- `src/features/editor/*`: editor session wiring and save lifecycle, while keeping pixel tools inside existing `studio` helpers
- `src/app/*`: top-level shell and route selection between dashboard and editor
- `src/utils/studio.ts`: pure document transforms only; no storage and no app routing knowledge

## Product Decisions

- **Project model:** `project` wraps `studio document` plus metadata.
- **Persistence strategy:** local-first `localStorage`, with one index key for summaries and one key per project snapshot.
- **Autosave:** debounced save after document changes, plus immediate save on explicit navigation back to dashboard.
- **Canvas sizes in v1:** keep `16`, `32`, `64` because current type system already supports these values.
- **Canvas model after v1:** widen project creation to independent `width` and `height` before introducing rectangular presets. Do not let a single `size` field become the long-term project API.
- **Project types in v1:** `pixel`, `beads`, `crochet`, matching current scenario IDs.
- **Login:** skip for v1. It adds backend auth, account recovery, storage quotas, privacy policy, abuse handling, and migration work with low user value before local persistence exists.

## Batch Recommendation

Ship this roadmap in three checkpoints instead of one long branch.

### Batch 1: Architecture Prep + Project Foundation

- Task 0: app/editor boundary prep
- Task 1: project domain and repository foundation
- Task 2: dashboard + create project
- Release bar: user can create a project and reopen it from the dashboard in the same browser session

### Batch 2: Editor Session Persistence

- Task 3: editor rehydration + autosave
- Task 4: corruption handling + migration hook
- Release bar: refresh and reopen works, save state is visible, and bad records fail safely

### Batch 3: Hardening And Rollout

- Task 5: docs, helper updates, full test/build verification
- Optional follow-up in the same batch: route persistence to the current project ID
- Release bar: all existing tests pass, the project workflow is documented, and the app can be demoed end-to-end

## Optimized Task Order

The original roadmap direction is correct, but the execution order should be stricter:

1. First separate app-shell concerns from editor concerns.
2. Then add project domain + persistence seams.
3. Then build the dashboard and project creation flow.
4. Only after that wire project rehydration and autosave into the editor.
5. Then harden corruption handling and migration hooks.
6. Finish with docs, verification, and rollout checks.

This avoids the highest-risk pattern in the current codebase: building project UX on top of an editor hook that still owns application bootstrapping.

## Early Structure Adjustments Before Feature Creep

These calls should happen now so later roadmap items do not create avoidable rewrites.

1. **Create a real repository boundary now**
   Why: save/open/autosave, import/export, crash recovery, login, and cloud sync all need the same seam.
2. **Move bootstrapping out of `useStudioApp`**
   Why: the editor hook should manage editing, not decide whether a dashboard, recovery flow, or cloud snapshot is the source of truth.
3. **Treat project metadata as a first-class domain**
   Why: once there is a dashboard, `name`, `thumbnail`, `updatedAt`, `type`, and `storageVersion` stop being UI details and become durable state.
4. **Do not freeze the domain around square-only canvas presets**
   Why: beads and crochet are the most likely modes to want rectangular canvases first.
5. **Keep auth and monetization out of editor modules**
   Why: those concerns belong above the repository layer, not inside document mutation helpers.

## Task 0 Overview

**Intent:** front-load the structural changes that would otherwise cause rework later. The goal of this task is to make `App` own product surface selection so the application no longer assumes the editor is the only surface.

**Scope in this task:**

- Create the app shell and route boundary
- Define the first `AppRoute` shape
- Switch the default boot surface from editor-first to dashboard-first
- Keep persistence-specific save logic out of this task

**Completion bar:**

- `src/App.tsx` no longer assumes the editor is the only app surface
- rendering tests are aligned to a dashboard-first app shell

## Task 0: Introduce The App Shell And Surface Boundary

**Files:**
- Create: `src/app/routes.ts`
- Create: `src/app/AppShell.tsx`
- Create: `src/features/projects/types.ts`
- Create: `src/features/projects/defaults.ts`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/hooks/App.rendering.test.tsx`

- [ ] **Step 1: Add the project domain types**

```ts
// src/features/projects/types.ts
import type { GridSize } from '../../types/pixel';
import type { ScenarioId, StudioDocument } from '../../types/studio';

export type ProjectType = ScenarioId;

export type ProjectSummary = {
  id: string;
  name: string;
  type: ProjectType;
  width: GridSize;
  height: GridSize;
  updatedAt: string;
  createdAt: string;
  thumbnailDataUrl?: string;
};

export type ProjectRecord = {
  version: 1;
  summary: ProjectSummary;
  document: StudioDocument;
};

export type AppRoute =
  | { kind: 'dashboard' }
  | { kind: 'editor'; projectId: string };
```

- [ ] **Step 2: Add project defaults and blank project factory**

```ts
// src/features/projects/defaults.ts
import type { GridSize } from '../../types/pixel';
import { createStudioDocument } from '../../utils/studio';
import type { ProjectRecord, ProjectType } from './types';

export function createProjectRecord(params: {
  id: string;
  name: string;
  type: ProjectType;
  size: GridSize;
  now: string;
}): ProjectRecord {
  const { id, name, type, size, now } = params;

  return {
    version: 1,
    summary: {
      id,
      name,
      type,
      width: size,
      height: size,
      createdAt: now,
      updatedAt: now,
    },
    document: createStudioDocument(type, size),
  };
}
```

- [ ] **Step 3: Add route helpers and app shell**

```ts
// src/app/routes.ts
import type { AppRoute } from '../features/projects/types';

export function getInitialRoute(): AppRoute {
  return { kind: 'dashboard' };
}
```

```tsx
// src/app/AppShell.tsx
import { useState } from 'react';
import { getInitialRoute } from './routes';
import ProjectDashboard from '../features/projects/components/ProjectDashboard';
import EditorWorkspace from '../features/editor/EditorWorkspace';

export default function AppShell() {
  const [route, setRoute] = useState(getInitialRoute());

  return route.kind === 'dashboard' ? (
    <ProjectDashboard onOpenProject={(projectId) => setRoute({ kind: 'editor', projectId })} />
  ) : (
    <EditorWorkspace
      projectId={route.projectId}
      onBackToProjects={() => setRoute({ kind: 'dashboard' })}
    />
  );
}
```

- [ ] **Step 4: Point the entrypoint to the new shell**

```tsx
// src/App.tsx
import AppShell from './app/AppShell';

export default function App() {
  return <AppShell />;
}
```

- [ ] **Step 5: Run rendering tests and update them for the dashboard-first boot**

Run: `npm test -- --run src/hooks/App.rendering.test.tsx`

Expected: FAIL because tests still expect the editor to render first.

- [ ] **Step 6: Update the rendering test for the new default surface**

```tsx
// src/hooks/App.rendering.test.tsx
it('renders the project dashboard before opening an editor session', () => {
  renderApp();

  expect(screen.getByRole('heading', { name: '项目面板' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '新建项目' })).toBeInTheDocument();
});
```

- [ ] **Step 7: Re-run the rendering test**

Run: `npm test -- --run src/hooks/App.rendering.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/main.tsx src/app src/features/projects/types.ts src/features/projects/defaults.ts src/hooks/App.rendering.test.tsx
git commit -m "feat: add project app shell foundation"
```

## Task 1: Introduce Project Domain And Repository Foundation

**Files:**
- Create: `src/features/projects/serialization.ts`
- Create: `src/features/projects/repository.ts`
- Create: `src/features/projects/__tests__/repository.test.ts`
- Modify: `src/features/projects/types.ts`

- [ ] **Step 1: Add explicit storage keys and serializers**

```ts
// src/features/projects/serialization.ts
import type { ProjectRecord, ProjectSummary } from './types';

export const PROJECT_INDEX_KEY = 'pixel-forge.projects.index';
export const PROJECT_RECORD_KEY_PREFIX = 'pixel-forge.projects.record';

export function getProjectRecordKey(projectId: string): string {
  return `${PROJECT_RECORD_KEY_PREFIX}.${projectId}`;
}

export function serializeProjectIndex(items: ProjectSummary[]): string {
  return JSON.stringify(items);
}

export function parseProjectIndex(raw: string | null): ProjectSummary[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as ProjectSummary[];
  return Array.isArray(parsed) ? parsed : [];
}

export function serializeProjectRecord(record: ProjectRecord): string {
  return JSON.stringify(record);
}

export function parseProjectRecord(raw: string | null): ProjectRecord | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as ProjectRecord;
  return parsed?.version === 1 ? parsed : null;
}
```

- [ ] **Step 2: Implement the repository adapter**

```ts
// src/features/projects/repository.ts
import {
  getProjectRecordKey,
  parseProjectIndex,
  parseProjectRecord,
  PROJECT_INDEX_KEY,
  serializeProjectIndex,
  serializeProjectRecord,
} from './serialization';
import type { ProjectRecord, ProjectSummary } from './types';

export type ProjectsRepository = {
  list(): ProjectSummary[];
  load(projectId: string): ProjectRecord | null;
  save(record: ProjectRecord): void;
  remove(projectId: string): void;
};

export function createProjectsRepository(storage: Storage): ProjectsRepository {
  return {
    list() {
      return parseProjectIndex(storage.getItem(PROJECT_INDEX_KEY)).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    },
    load(projectId) {
      return parseProjectRecord(storage.getItem(getProjectRecordKey(projectId)));
    },
    save(record) {
      const current = parseProjectIndex(storage.getItem(PROJECT_INDEX_KEY));
      const next = current.filter((item) => item.id !== record.summary.id);
      next.push(record.summary);

      storage.setItem(PROJECT_INDEX_KEY, serializeProjectIndex(next));
      storage.setItem(getProjectRecordKey(record.summary.id), serializeProjectRecord(record));
    },
    remove(projectId) {
      const current = parseProjectIndex(storage.getItem(PROJECT_INDEX_KEY));
      storage.setItem(
        PROJECT_INDEX_KEY,
        serializeProjectIndex(current.filter((item) => item.id !== projectId)),
      );
      storage.removeItem(getProjectRecordKey(projectId));
    },
  };
}
```

- [ ] **Step 3: Write the failing repository test**

```ts
// src/features/projects/__tests__/repository.test.ts
import { describe, expect, it } from 'vitest';
import { createProjectsRepository } from '../repository';
import { createProjectRecord } from '../defaults';

describe('projects repository', () => {
  it('saves and reloads a project record', () => {
    const storage = window.localStorage;
    storage.clear();
    const repository = createProjectsRepository(storage);

    const record = createProjectRecord({
      id: 'p-1',
      name: '我的像素龙',
      type: 'pixel',
      size: 32,
      now: '2026-04-16T00:00:00.000Z',
    });

    repository.save(record);

    expect(repository.list()).toHaveLength(1);
    expect(repository.load('p-1')?.summary.name).toBe('我的像素龙');
  });
});
```

- [ ] **Step 4: Run the repository test**

Run: `npm test -- --run src/features/projects/__tests__/repository.test.ts`

Expected: PASS after repository creation

- [ ] **Step 5: Add a missing-record test before moving on**

```ts
it('returns null when the project record does not exist', () => {
  const repository = createProjectsRepository(window.localStorage);
  window.localStorage.clear();

  expect(repository.load('missing')).toBeNull();
});
```

- [ ] **Step 6: Re-run the repository test suite**

Run: `npm test -- --run src/features/projects/__tests__/repository.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/projects/serialization.ts src/features/projects/repository.ts src/features/projects/__tests__/repository.test.ts src/features/projects/types.ts
git commit -m "feat: add versioned local project repository"
```

## Task 2: Build The Project Dashboard And Create-Project Flow

**Files:**
- Create: `src/features/projects/useProjectsStore.ts`
- Create: `src/features/projects/components/ProjectDashboard.tsx`
- Create: `src/features/projects/components/CreateProjectDialog.tsx`
- Create: `src/features/projects/components/ProjectCard.tsx`
- Create: `src/features/projects/__tests__/dashboard.test.tsx`
- Modify: `src/styles.css`
- Test: `src/features/projects/__tests__/dashboard.test.tsx`

- [ ] **Step 1: Add a lightweight projects store**

```ts
// src/features/projects/useProjectsStore.ts
import { useMemo, useState } from 'react';
import { createProjectsRepository } from './repository';
import { createProjectRecord } from './defaults';
import type { GridSize } from '../../types/pixel';
import type { ProjectSummary, ProjectType } from './types';

export function useProjectsStore() {
  const repository = useMemo(() => createProjectsRepository(window.localStorage), []);
  const [projects, setProjects] = useState<ProjectSummary[]>(() => repository.list());

  function createProject(input: { name: string; type: ProjectType; size: GridSize }) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const record = createProjectRecord({ id, name: input.name, type: input.type, size: input.size, now });
    repository.save(record);
    setProjects(repository.list());
    return record.summary.id;
  }

  function deleteProject(projectId: string) {
    repository.remove(projectId);
    setProjects(repository.list());
  }

  return { projects, createProject, deleteProject };
}
```

- [ ] **Step 2: Build the create-project dialog**

```tsx
// src/features/projects/components/CreateProjectDialog.tsx
import { useState } from 'react';
import type { GridSize } from '../../../types/pixel';
import type { ProjectType } from '../types';

export default function CreateProjectDialog(props: {
  onSubmit: (input: { name: string; type: ProjectType; size: GridSize }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('未命名项目');
  const [type, setType] = useState<ProjectType>('pixel');
  const [size, setSize] = useState<GridSize>(32);

  return (
    <div role="dialog" aria-modal="true" aria-label="新建项目">
      <label>
        项目名称
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        项目类型
        <select value={type} onChange={(event) => setType(event.target.value as ProjectType)}>
          <option value="pixel">像素画</option>
          <option value="beads">拼豆</option>
          <option value="crochet">钩织</option>
        </select>
      </label>
      <label>
        画布尺寸
        <select value={size} onChange={(event) => setSize(Number(event.target.value) as GridSize)}>
          <option value={16}>16 x 16</option>
          <option value={32}>32 x 32</option>
          <option value={64}>64 x 64</option>
        </select>
      </label>
      <button type="button" onClick={() => props.onSubmit({ name, type, size })}>
        创建并进入编辑
      </button>
      <button type="button" onClick={props.onClose}>取消</button>
    </div>
  );
}
```

- [ ] **Step 3: Build the dashboard view**

```tsx
// src/features/projects/components/ProjectDashboard.tsx
import { useState } from 'react';
import { useProjectsStore } from '../useProjectsStore';
import CreateProjectDialog from './CreateProjectDialog';

export default function ProjectDashboard(props: { onOpenProject: (projectId: string) => void }) {
  const { projects, createProject, deleteProject } = useProjectsStore();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <main className="project-dashboard">
      <header className="project-dashboard__header">
        <div>
          <p className="eyebrow">Pixel Forge</p>
          <h1>项目面板</h1>
        </div>
        <button type="button" onClick={() => setIsCreating(true)}>新建项目</button>
      </header>

      <section aria-label="项目列表">
        {projects.map((project) => (
          <article key={project.id}>
            <h2>{project.name}</h2>
            <p>{project.type} · {project.width} x {project.height}</p>
            <button type="button" onClick={() => props.onOpenProject(project.id)}>继续编辑</button>
            <button type="button" onClick={() => deleteProject(project.id)}>删除</button>
          </article>
        ))}
      </section>

      {isCreating ? (
        <CreateProjectDialog
          onClose={() => setIsCreating(false)}
          onSubmit={(input) => {
            const projectId = createProject(input);
            props.onOpenProject(projectId);
          }}
        />
      ) : null}
    </main>
  );
}
```

- [ ] **Step 4: Write the dashboard flow test**

```tsx
// src/features/projects/__tests__/dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProjectDashboard from '../components/ProjectDashboard';

describe('project dashboard', () => {
  it('creates a project and opens it', async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    const onOpenProject = vi.fn();

    render(<ProjectDashboard onOpenProject={onOpenProject} />);

    await user.click(screen.getByRole('button', { name: '新建项目' }));
    await user.click(screen.getByRole('button', { name: '创建并进入编辑' }));

    expect(onOpenProject).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: '新建项目' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the dashboard test**

Run: `npm test -- --run src/features/projects/__tests__/dashboard.test.tsx`

Expected: PASS

- [ ] **Step 6: Add dashboard-specific styles instead of extending the editor selectors**

```css
/* src/styles.css */
.project-dashboard {
  min-height: 100vh;
  padding: 32px;
}

.project-dashboard__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}
```

- [ ] **Step 7: Re-run the dashboard test after styling changes**

Run: `npm test -- --run src/features/projects/__tests__/dashboard.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/projects/useProjectsStore.ts src/features/projects/components src/features/projects/__tests__/dashboard.test.tsx src/styles.css
git commit -m "feat: add project dashboard and creation flow"
```

## Task 3: Rehydrate The Editor From A Project And Autosave Changes

**Files:**
- Create: `src/features/editor/EditorWorkspace.tsx`
- Create: `src/features/editor/useEditorSession.ts`
- Create: `src/features/editor/saveStatus.ts`
- Create: `src/features/editor/__tests__/autosave.test.tsx`
- Modify: `src/hooks/useStudioApp.ts`
- Modify: `src/components/StudioTopbar.tsx`
- Modify: `src/test/appTestUtils.tsx`

- [ ] **Step 1: Refactor `useStudioApp` so it accepts initial state instead of owning bootstrapping**

```ts
// src/hooks/useStudioApp.ts
export function useStudioApp(params?: {
  initialScenario?: ScenarioId;
  initialDocument?: StudioDocument;
}) {
  const initialScenario = params?.initialScenario ?? 'pixel';
  const initialDocument =
    params?.initialDocument ?? createStudioDocument(initialScenario, DEFAULT_OPTIONS.gridSize);

  const [activeScenario, setActiveScenario] = useState<ScenarioId>(initialScenario);
  const [document, setDocument] = useState<StudioDocument>(initialDocument);
  // keep the existing editor behaviors unchanged below this point
}
```

- [ ] **Step 2: Add an editor session hook that loads and saves a project**

```ts
// src/features/editor/useEditorSession.ts
import { useEffect, useMemo, useState } from 'react';
import { createProjectsRepository } from '../projects/repository';
import { useStudioApp } from '../../hooks/useStudioApp';

export function useEditorSession(projectId: string) {
  const repository = useMemo(() => createProjectsRepository(window.localStorage), []);
  const record = repository.load(projectId);
  const studio = useStudioApp({
    initialScenario: record?.summary.type ?? 'pixel',
    initialDocument: record?.document,
  });
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');

  useEffect(() => {
    if (!record) return;

    setSaveState('saving');
    const timeoutId = window.setTimeout(() => {
      repository.save({
        ...record,
        summary: { ...record.summary, updatedAt: new Date().toISOString() },
        document: studio.studio.document,
      });
      setSaveState('saved');
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [projectId, record, repository, studio.studio.document]);

  return { record, studio, saveState };
}
```

- [ ] **Step 3: Build the editor workspace container**

```tsx
// src/features/editor/EditorWorkspace.tsx
import { useEditorSession } from './useEditorSession';
import StudioCanvasStage from '../../components/StudioCanvasStage';
import StudioLeftDock from '../../components/StudioLeftDock';
import StudioRightDock from '../../components/StudioRightDock';
import StudioTopbar from '../../components/StudioTopbar';
import { SCENARIOS } from '../../constants/studio';

export default function EditorWorkspace(props: {
  projectId: string;
  onBackToProjects: () => void;
}) {
  const { record, studio, saveState } = useEditorSession(props.projectId);

  if (!record) {
    return <main className="empty-state">项目不存在或已损坏。</main>;
  }

  const { controls, source, editor, output, stats, actions } = studio;

  return (
    <main className="app-shell">
      <section className="studio-app">
        <StudioTopbar
          document={studio.studio.document}
          activeScenario={studio.studio.activeScenario}
          scenarios={SCENARIOS}
          onScenarioChange={actions.setActiveScenario}
          onCreateBlankCanvas={actions.createBlankCanvas}
          projectName={record.summary.name}
          saveState={saveState}
          onBack={props.onBackToProjects}
        />
        {/* keep the current editor layout below */}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Extend the top bar with project context and a back action**

```tsx
// src/components/StudioTopbar.tsx
type StudioTopbarProps = {
  // existing props...
  projectName: string;
  saveState: 'saved' | 'saving';
  onBack: () => void;
};

<button type="button" className="chip-button" onClick={onBack}>
  返回项目
</button>
<span className="info-tag">{projectName}</span>
<span className="info-tag">{saveState === 'saving' ? '保存中' : '已保存'}</span>
```

- [ ] **Step 5: Write the autosave test**

```tsx
// src/features/editor/__tests__/autosave.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EditorWorkspace from '../EditorWorkspace';
import { createProjectsRepository } from '../../projects/repository';
import { createProjectRecord } from '../../projects/defaults';

describe('editor autosave', () => {
  it('rehydrates a saved project and shows save status', async () => {
    window.localStorage.clear();
    const repository = createProjectsRepository(window.localStorage);
    repository.save(
      createProjectRecord({
        id: 'p-1',
        name: '测试项目',
        type: 'pixel',
        size: 16,
        now: '2026-04-16T00:00:00.000Z',
      }),
    );

    render(<EditorWorkspace projectId="p-1" onBackToProjects={() => {}} />);

    expect(screen.getByText('测试项目')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('已保存')).toBeInTheDocument());
  });
});
```

- [ ] **Step 6: Run the autosave and rendering tests together**

Run: `npm test -- --run src/features/editor/__tests__/autosave.test.tsx src/hooks/App.rendering.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/editor src/hooks/useStudioApp.ts src/components/StudioTopbar.tsx src/test/appTestUtils.tsx
git commit -m "feat: load editor sessions from saved projects"
```

## Task 4: Harden Persistence With Migration Hooks And Recovery UX

**Files:**
- Modify: `src/features/projects/serialization.ts`
- Modify: `src/features/projects/repository.ts`
- Modify: `src/features/projects/types.ts`
- Modify: `src/features/editor/EditorWorkspace.tsx`
- Modify: `src/features/projects/__tests__/repository.test.ts`

- [ ] **Step 1: Add a migration entry point even if v1 only returns the input unchanged**

```ts
// src/features/projects/serialization.ts
import type { ProjectRecord } from './types';

export function migrateProjectRecord(input: unknown): ProjectRecord | null {
  const parsed = input as Partial<ProjectRecord> | null;

  if (!parsed || parsed.version !== 1 || !parsed.summary || !parsed.document) {
    return null;
  }

  return parsed as ProjectRecord;
}

export function parseProjectRecord(raw: string | null): ProjectRecord | null {
  if (!raw) return null;
  return migrateProjectRecord(JSON.parse(raw));
}
```

- [ ] **Step 2: Preserve malformed records without crashing the app**

```ts
// src/features/projects/repository.ts
load(projectId) {
  try {
    return parseProjectRecord(storage.getItem(getProjectRecordKey(projectId)));
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Add the corruption-handling test**

```ts
it('returns null for malformed JSON records', () => {
  window.localStorage.clear();
  window.localStorage.setItem('pixel-forge.projects.record.bad', '{oops');
  const repository = createProjectsRepository(window.localStorage);

  expect(repository.load('bad')).toBeNull();
});
```

- [ ] **Step 4: Show a recovery message in the editor instead of a blank crash path**

```tsx
// src/features/editor/EditorWorkspace.tsx
if (!record) {
  return (
    <main className="empty-state">
      无法打开该项目。记录可能缺失，或需要迁移脚本修复。
    </main>
  );
}
```

- [ ] **Step 5: Run the repository and autosave tests**

Run: `npm test -- --run src/features/projects/__tests__/repository.test.ts src/features/editor/__tests__/autosave.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/projects/serialization.ts src/features/projects/repository.ts src/features/projects/types.ts src/features/editor/EditorWorkspace.tsx src/features/projects/__tests__/repository.test.ts
git commit -m "feat: harden project persistence and recovery"
```

## Task 5: Update Docs, Test Coverage, And Delivery Criteria

**Files:**
- Modify: `README.md`
- Modify: `src/test/appTestUtils.tsx`
- Modify: `src/hooks/App.canvas-editing.test.tsx`
- Modify: `src/hooks/App.layers-and-frames.test.tsx`
- Modify: `src/hooks/App.output-modes.test.tsx`

- [ ] **Step 1: Update README with the new product model**

```md
## Workflow

1. Open the project dashboard.
2. Create a project with type and canvas size.
3. Enter the editor and draw or convert an image.
4. Leave and reopen the project later; changes are stored locally in the browser.
```

- [ ] **Step 2: Update test helpers so editor tests can start from a created project**

```ts
// src/test/appTestUtils.tsx
export async function createProjectAndOpenEditor(user: UserEvent) {
  renderApp();
  await user.click(screen.getByRole('button', { name: '新建项目' }));
  await user.click(screen.getByRole('button', { name: '创建并进入编辑' }));
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`

Expected: PASS

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md src/test/appTestUtils.tsx src/hooks/App.canvas-editing.test.tsx src/hooks/App.layers-and-frames.test.tsx src/hooks/App.output-modes.test.tsx
git commit -m "docs: document project dashboard workflow"
```

## Next Plans After This One

Write these as separate plans after the project workspace foundation is merged.

## Decision Notes For Later Plans

### Rectangular canvases

- Do not implement them in this plan.
- Do reserve for them by keeping project metadata conceptually separate from the current `GridSize` editor presets.
- When the crochet/printable roadmap starts, that follow-up should widen the document model from square presets toward `{ width, height }`.

### URL routing

- Not required for this batch.
- Recommended next after Batch 2 because it improves refresh behavior, deep links, and future login/cloud restore.

### Storage backend migration

- `localStorage` is enough for initial public launch.
- If project files grow because of thumbnails, richer exports, or backup/share features, move the repository implementation to IndexedDB before adding accounts.

### Plan B: Editor Architecture Cleanup

- Split `src/utils/studio.ts` into `document.ts`, `layers.ts`, `frames.ts`, `drawing.ts`, `ids.ts`
- Add an undo/redo command history boundary
- Normalize IDs and snapshot diffing so autosave and history do not fight each other
- Widen the document model from square preset assumptions toward independent width/height support

### Plan C: Advanced Editing Features

- Selection tools
- Move/transform selected pixels
- Keyboard shortcuts
- Symmetry and shape helpers
- Palette lock / replace color / color remap

### Plan D: Output And Asset Pipeline

- PNG export for all scenarios
- GIF and sprite sheet export for pixel projects
- Project import/export file format for backup and sharing
- Print/PDF improvements for beads and crochet

## Aseprite Comparison And Priority

The official Aseprite docs emphasize preserving layered/frame-rich source files on save, keyboard-driven editing, selection/cut/copy/paste workflows, onion-skin animation support, sprite-sheet export, tilemap workflows, and slice metadata. Relevant docs:

- Save and preserve full sprite data: https://www.aseprite.org/docs/save/
- Edit menu and undo/copy/paste/transform shortcuts: https://www.aseprite.org/docs/edit-menu/
- Preferences and keyboard customization: https://www.aseprite.org/docs/preferences/

### Highest user value / lowest-to-medium cost

1. **Project save/open/autosave**
   Why: Without this, the app is not usable as a serious tool.
   Cost: Medium
2. **Undo/redo + keyboard shortcuts**
   Why: The current editing loop is slower than mature pixel tools.
   Cost: Medium
3. **PNG/GIF/sprite-sheet export for pixel projects**
   Why: Matches the main use case people already expect from a pixel editor.
   Cost: Medium
4. **Selection, move, copy, paste, transform**
   Why: Large productivity gain after users start editing more than a few pixels.
   Cost: Medium to high

### Medium user value / medium-to-high cost

1. **Onion skin improvements and real timeline controls**
   Why: Valuable for animation users, but only after save and export exist.
   Cost: High
2. **Reference layer / import as helper image**
   Why: Good for tracing and conversion cleanup.
   Cost: Medium
3. **Palette operations: lock palette, replace color, sort palette**
   Why: Strong workflow improvement for beads and crochet too.
   Cost: Medium

### Lower priority or likely out-of-scope for this product

1. **Tilemap / tileset authoring**
   Why: Powerful in Aseprite, but weak fit for beads and crochet.
   Cost: High
2. **Slices and 9-patch style metadata**
   Why: Useful for game UI pipelines, but not core to your current audience.
   Cost: Medium
3. **Scripting / extension API**
   Why: Premature before the core editing model stabilizes.
   Cost: High

## Login And Monetization Recommendation

- **Login for initial public launch:** not necessary
- **Why:** your launch promise is free access, and your first product risk is retention from usability, not account identity
- **Cost if added early:** backend, auth provider, email flows, password reset, privacy and retention policy, cloud storage quotas, project ownership rules, migration from anonymous projects
- **Recommendation:** launch anonymous local-first; later add optional login only when you need cross-device sync, cloud backup, gallery publishing, or creator profiles

### Practical revenue options for a free core product

1. Donations and sponsor wall
2. Paid cloud backup and cross-device sync
3. Paid export packs: advanced PDF, sprite-sheet presets, HD preview renders
4. Community pattern marketplace with creator tipping
5. Print partner referrals for beads and crochet materials

## Exit Criteria For This Plan

- Dashboard is the default app surface
- Users can create at least one project type from the dashboard
- Users can reopen a saved project after refresh
- Autosave updates project metadata timestamps
- Corrupt records fail safely
- Existing editor tests still pass after the new app shell lands

## Self-Review

- **Spec coverage:** project creation, size/type selection, project panel, save/open/continue editing, login timing analysis, monetization options, Aseprite-inspired backlog, and architecture risks are all covered above.
- **Placeholder scan:** no `TODO`, `TBD`, or unnamed follow-up implementation steps were left inside executable tasks.
- **Type consistency:** `ProjectType` maps to `ScenarioId`; `ProjectRecord` wraps `StudioDocument`; app route and repository naming are consistent across tasks.

Plan complete and saved to `docs/superpowers/plans/2026-04-16-project-workspace-roadmap.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
