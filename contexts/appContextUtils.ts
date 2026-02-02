import { AppState, AppStateSnapshot, SVGElementData } from '../types';
import { MAX_HISTORY_ENTRIES } from '../constants';

// Helper to generate unique IDs
export const generateUniqueId = (prefix: string = 'el'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

// Helper to get the next order for a new element
export const getNextOrderUtil = (elements: SVGElementData[], targetParentId: string | null, artboardId: string): number => {
    const siblings = elements.filter(el => el.parentId === targetParentId && el.artboardId === artboardId);
    return siblings.length > 0 ? Math.max(...siblings.map(el => el.order)) + 1 : 0;
};

// Helper to record state to history
export const recordToHistory = (
  prevStateHistory: AppStateSnapshot[],
  prevHistoryIndex: number,
  newStateSliceForSnapshot: Pick<AppState, 'artboard' | 'elements' | 'animation' | 'selectedElementId' | 'currentTime' | 'playbackSpeed' | 'loopMode' | 'playbackDirection'>,
  actionDescription: string
): Pick<AppState, 'history' | 'historyIndex'> => {
  const snapshot: AppStateSnapshot = {
    artboard: JSON.parse(JSON.stringify(newStateSliceForSnapshot.artboard)),
    elements: JSON.parse(JSON.stringify(newStateSliceForSnapshot.elements)),
    animation: JSON.parse(JSON.stringify(newStateSliceForSnapshot.animation)),
    selectedElementId: newStateSliceForSnapshot.selectedElementId,
    currentTime: newStateSliceForSnapshot.currentTime,
    playbackSpeed: newStateSliceForSnapshot.playbackSpeed,
    loopMode: newStateSliceForSnapshot.loopMode,
    playbackDirection: newStateSliceForSnapshot.playbackDirection,
    actionDescription,
  };

  const newHistory = prevStateHistory.slice(0, prevHistoryIndex + 1);
  newHistory.push(snapshot);
  if (newHistory.length > MAX_HISTORY_ENTRIES) {
    newHistory.shift();
  }
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
};

// Helper to reorder siblings and normalize their 'order' property
export const reorderSiblingsAndNormalize = (elements: SVGElementData[], parentId: string | null, artboardId: string): SVGElementData[] => {
  const workingElements = [...elements];
  const siblings = workingElements
    .filter(el => el.parentId === parentId && el.artboardId === artboardId)
    .sort((a, b) => a.order - b.order);

  siblings.forEach((sibling, index) => {
    const globalIndex = workingElements.findIndex(el => el.id === sibling.id);
    if (globalIndex !== -1 && workingElements[globalIndex].order !== index) {
      workingElements[globalIndex] = { ...workingElements[globalIndex], order: index };
    }
  });
  return workingElements;
};

// Helper function to get the outermost group an element belongs to
export const getOutermostGroupId = (elementId: string, allElements: SVGElementData[]): string => {
  let currentElement = allElements.find(el => el.id === elementId);
  if (!currentElement) return elementId;

  let outermostParentId = elementId;
  while (currentElement && currentElement.parentId) {
    const parent = allElements.find(el => el.id === currentElement!.parentId);
    if (parent && parent.type === 'group') {
      outermostParentId = parent.id;
      currentElement = parent;
    } else {
      break; 
    }
  }
  return outermostParentId;
};

// Helper function to get all parent group IDs of an element
export const getAllParentGroupIds = (elementId: string, allElements: SVGElementData[]): string[] => {
  const parentIds: string[] = [];
  let currentElement = allElements.find(el => el.id === elementId);
  while (currentElement?.parentId) {
    const parent = allElements.find(el => el.id === currentElement!.parentId);
    if (parent && parent.type === 'group') {
      parentIds.unshift(parent.id); 
      currentElement = parent;
    } else {
      break;
    }
  }
  return parentIds;
};
