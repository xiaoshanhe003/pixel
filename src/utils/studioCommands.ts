import type { StudioDocument } from '../types/studio';
import {
  addFrameToDocument,
  addLayerToActiveFrame,
  applyBrushStrokeOnActiveLayer,
  clearActiveLayer,
  deleteActiveFrame,
  deleteActiveLayer,
  drawLineOnActiveLayer,
  drawRectangleOnActiveLayer,
  duplicateActiveFrame,
  duplicateActiveLayer,
  fillActiveLayerArea,
  mergeActiveLayerDown,
  moveLayer,
  moveLayerToIndex,
  renameLayer,
  replaceActiveLayerCell,
  setLayerOpacity,
  toggleLayerLock,
  toggleLayerVisibility,
} from './studio';

export type StudioCommand =
  | {
      type: 'paintCell';
      x: number;
      y: number;
      color: string | null;
      size: 1 | 2 | 3 | 4;
    }
  | {
      type: 'replaceCell';
      x: number;
      y: number;
      color: string | null;
    }
  | {
      type: 'fillArea';
      x: number;
      y: number;
      color: string | null;
    }
  | {
      type: 'drawLine';
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      color: string | null;
    }
  | {
      type: 'drawRectangle';
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      color: string | null;
    }
  | { type: 'addLayer' }
  | { type: 'duplicateLayer'; layerId?: string }
  | { type: 'deleteLayer'; layerId?: string }
  | { type: 'mergeLayerDown'; layerId?: string }
  | { type: 'renameLayer'; layerId: string; name: string }
  | { type: 'toggleLayerVisibility'; layerId: string }
  | { type: 'toggleLayerLock'; layerId: string }
  | { type: 'clearLayer'; layerId: string }
  | { type: 'moveLayer'; layerId: string; direction: 'up' | 'down' }
  | { type: 'reorderLayer'; layerId: string; targetIndex: number }
  | { type: 'setLayerOpacity'; layerId: string; opacity: number }
  | { type: 'addFrame' }
  | { type: 'duplicateFrame' }
  | { type: 'deleteFrame' };

export type StudioHistoryState = {
  past: StudioDocument[];
  present: StudioDocument;
  future: StudioDocument[];
};

const MAX_HISTORY_ENTRIES = 100;

function cloneDocument(document: StudioDocument): StudioDocument {
  return structuredClone(document);
}

function areDocumentsEqual(
  left: StudioDocument,
  right: StudioDocument,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createStudioHistoryState(
  initialDocument: StudioDocument,
): StudioHistoryState {
  return {
    past: [],
    present: cloneDocument(initialDocument),
    future: [],
  };
}

export function executeStudioCommand(
  document: StudioDocument,
  command: StudioCommand,
): StudioDocument {
  switch (command.type) {
    case 'paintCell':
      return applyBrushStrokeOnActiveLayer(
        document,
        command.x,
        command.y,
        command.size,
        command.color,
      );
    case 'replaceCell':
      return replaceActiveLayerCell(document, command.x, command.y, command.color);
    case 'fillArea':
      return fillActiveLayerArea(document, command.x, command.y, command.color);
    case 'drawLine':
      return drawLineOnActiveLayer(
        document,
        command.startX,
        command.startY,
        command.endX,
        command.endY,
        command.color,
      );
    case 'drawRectangle':
      return drawRectangleOnActiveLayer(
        document,
        command.startX,
        command.startY,
        command.endX,
        command.endY,
        command.color,
      );
    case 'addLayer':
      return addLayerToActiveFrame(document);
    case 'duplicateLayer':
      return duplicateActiveLayer(document, command.layerId);
    case 'deleteLayer':
      return deleteActiveLayer(document, command.layerId);
    case 'mergeLayerDown':
      return mergeActiveLayerDown(document, command.layerId);
    case 'renameLayer':
      return renameLayer(document, command.layerId, command.name);
    case 'toggleLayerVisibility':
      return toggleLayerVisibility(document, command.layerId);
    case 'toggleLayerLock':
      return toggleLayerLock(document, command.layerId);
    case 'clearLayer':
      return clearActiveLayer(document, command.layerId);
    case 'moveLayer':
      return moveLayer(document, command.layerId, command.direction);
    case 'reorderLayer':
      return moveLayerToIndex(document, command.layerId, command.targetIndex);
    case 'setLayerOpacity':
      return setLayerOpacity(document, command.layerId, command.opacity);
    case 'addFrame':
      return addFrameToDocument(document);
    case 'duplicateFrame':
      return duplicateActiveFrame(document);
    case 'deleteFrame':
      return deleteActiveFrame(document);
    default:
      return document;
  }
}

export function applyStudioCommandToHistory(
  history: StudioHistoryState,
  command: StudioCommand,
): StudioHistoryState {
  const nextDocument = executeStudioCommand(history.present, command);

  if (
    nextDocument === history.present ||
    areDocumentsEqual(nextDocument, history.present)
  ) {
    return history;
  }

  return {
    past: [...history.past, cloneDocument(history.present)].slice(-MAX_HISTORY_ENTRIES),
    present: cloneDocument(nextDocument),
    future: [],
  };
}

export function applyStudioTransientUpdate(
  history: StudioHistoryState,
  updater: (document: StudioDocument) => StudioDocument,
): StudioHistoryState {
  const nextDocument = updater(history.present);

  if (
    nextDocument === history.present ||
    areDocumentsEqual(nextDocument, history.present)
  ) {
    return history;
  }

  return {
    ...history,
    present: cloneDocument(nextDocument),
  };
}

export function resetStudioHistory(
  nextDocument: StudioDocument,
): StudioHistoryState {
  return createStudioHistoryState(nextDocument);
}

export function undoStudioHistory(
  history: StudioHistoryState,
): StudioHistoryState {
  const previous = history.past.at(-1);

  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: cloneDocument(previous),
    future: [cloneDocument(history.present), ...history.future],
  };
}

export function redoStudioHistory(
  history: StudioHistoryState,
): StudioHistoryState {
  const [next, ...restFuture] = history.future;

  if (!next) {
    return history;
  }

  return {
    past: [...history.past, cloneDocument(history.present)].slice(-MAX_HISTORY_ENTRIES),
    present: cloneDocument(next),
    future: restFuture,
  };
}
