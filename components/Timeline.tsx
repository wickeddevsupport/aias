

import React, { useRef, useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { SVGElementData, AnimatableProperty, Keyframe, AnySVGGradient, TimelinePropertyUIGroup, TIMELINE_PROPERTY_GROUPS, TimelinePropertyGroupKey, Artboard, TimelineSelectionType, BezierPoint, TimelineViewMode, AnimationTrack, LoopMode } from '../types';
import { TIMELINE_RULER_HEIGHT, TIMELINE_GROUP_ROW_HEIGHT, TIMELINE_PROPERTY_ROW_HEIGHT, TIMELINE_CONTEXT_MENU_WIDTH, ANIMATION_BAR_HEIGHT, DEFAULT_KEYFRAME_EASING, MIN_CLIP_DURATION_SECONDS, PLAYBACK_SPEED_PRESETS, DEFAULT_PLAYBACK_SPEED, PLAYBACK_SPEED_MIN, PLAYBACK_SPEED_MAX, PLAYBACK_SPEED_CLICK_STEP, PLAYBACK_SPEED_DRAG_SENSITIVITY_PER_PIXEL } from '../constants';
import { PlusIcon, KeyframeIcon as AddKeyframeToTrackIcon, TrashIcon, ChevronUpDownIcon, GripVerticalIcon, ZoomInIcon, ZoomOutIcon, MaximizeIcon, ListTreeIcon, SplineIcon, ChevronRightIcon, ChevronDownIconSolid, ChevronUpIcon, ChevronDownIcon, RepeatIcon, PlayOnceIcon } from './icons/EditorIcons';
import { getElementAnimatableProperties, interpolateValue } from '../utils/animationUtils';
import { AppContext } from '../contexts/AppContext';
import TimelineContextualMenu from './TimelineContextualMenu';
import { formatDurationHHMMSSms, parseDurationHHMMSSms, adjustDuration, DURATION_DRAG_SENSITIVITY_MS_PER_PIXEL, DURATION_CLICK_STEP_MS, DURATION_MIN_SECONDS, getRulerMajorMarkerInterval, getRulerSubdivisionCount, formatTimeForRulerDisplay } from '../utils/timeUtils'; 

interface TimelineProps {
  pixelsPerSecond: number;
  height: number;
  onAddKeyframe: (property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  onUpdateKeyframeTime: (elementId: string, property: AnimatableProperty, oldTime: number, newTime: number) => void;
  onUpdateDuration: (duration: number) => void;
  playbackControlsSlot: React.ReactNode;
}

interface DraggingKeyframeInfo {
    elementId: string;
    property: AnimatableProperty;
    originalTime: number;
    keyframeValue: string | number | AnySVGGradient | BezierPoint[];
    initialMouseX: number;
    keyframeOffsetX: number;
}

interface DraggingGroupDurationInfo {
  elementId: string;
  groupKey: TimelinePropertyGroupKey;
  propertiesToScale: AnimatableProperty[];
  handleType: 'start' | 'end';
  initialMouseX: number;
  originalTimespan: { start: number; end: number };
}

interface DraggingDopesheetBarInfo {
  elementId: string;
  initialMouseX: number;
  originalMinTime: number;
  clipDuration: number;
  currentBarLeftTime: number;
}

interface ResizingDopesheetBarInfo {
  elementId: string;
  handleType: 'start' | 'end';
  initialMouseX: number;
  originalMinTime: number;
  originalMaxTime: number;
  currentBarTime: number;
}

interface DraggingPropertyGroupInfo {
  elementId: string;
  propertiesToShift: AnimatableProperty[];
  initialMouseX: number;
  originalEarliestTime: number; 
  groupKeyframeSpan: number;      
  currentBarLeftTime: number; 
}

interface EditingDopesheetDurationInfo {
    elementId: string;
    originalMinTime: number;
    originalMaxTime: number;
    inputRef?: React.RefObject<HTMLInputElement>;
}

interface EditingContextualGroupDurationInfo {
  elementId: string;
  groupKey: TimelinePropertyGroupKey;
  propertiesToScale: AnimatableProperty[];
  originalMinTimeInGroup: number;
  originalMaxTimeInGroup: number;
}

interface DraggingAdjustInfo {
  type: 'up' | 'down' | 'drag';
  startY: number;
  initialValue: number; // Can be duration in seconds or speed multiplier
  controlType: 'duration' | 'speed';
}


type DopesheetElementNode = SVGElementData & {
  minTime?: number;
  maxTime?: number;
  children: DopesheetElementNode[];
  level: number;
};


const TIMELINE_PROPERTIES_PANE_WIDTH = 230; 
const GROUP_DURATION_HANDLE_WIDTH = 8;
const DOPESHEET_BAR_RESIZE_HANDLE_WIDTH = 8; 
const TOP_CONTROLS_BAR_HEIGHT = 52; 
const MINIMAP_HEIGHT = 32; 
const MINIMAP_FIXED_WIDTH = 200; 
const MINIMAP_VIEWPORT_HANDLE_WIDTH = 4;
const MIN_ZOOM_LEVEL = 0.005; // Allow more zoom out for very long durations
const MAX_ZOOM_LEVEL = 50;  // Allow more zoom in for precision
const DOPESHEET_INDENT_WIDTH = 16;
const MINIMAP_DOPESHEET_BAR_HEIGHT = 3; 
const MINIMAP_DOPESHEET_BAR_GAP = 1;
const MINIMAP_DOPESHEET_INDENT_WIDTH = 3;
const MINIMAP_KEYFRAME_SEGMENT_HEIGHT = 'h-1.5'; 
const DOPESHEET_DURATION_TEXT_MIN_BAR_WIDTH = 55;
const DOPESHEET_DURATION_INPUT_MIN_BAR_WIDTH = 45;
const CONTEXTUAL_GROUP_DURATION_TEXT_MIN_BAR_WIDTH = 55;
const CONTEXTUAL_GROUP_DURATION_INPUT_MIN_BAR_WIDTH = 45;
const DURATION_TEXT_FONT_SIZE_CLASS = "text-[10px]"; 
const STICKY_TEXT_LEFT_OFFSET = "20px"; 
const STICKY_TEXT_Z_INDEX = 25;
const SPEED_INPUT_WIDTH_CLASS = "w-20"; 


interface MinimapTrackDisplayItem {
  elementId: string;
  property: string;
  keyframes: Keyframe[];
  isSelected?: boolean;
  order?: number;
  level?: number;
}


const Timeline: React.FC<TimelineProps> = ({
  pixelsPerSecond: basePixelsPerSecond,
  height,
  onAddKeyframe,
  onRemoveKeyframe,
  onUpdateKeyframeTime,
  onUpdateDuration,
  playbackControlsSlot,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { animation, currentTime, playbackSpeed, selectedElementId, elements, artboard, selectedTimelineContextItem, timelineViewMode, expandedGroupIds, loopMode, isPlaying, playbackDirection, isAutoKeyframing } = state;

  const rulerMarkersContainerRef = useRef<HTMLDivElement>(null);
  const propertiesPaneRef = useRef<HTMLDivElement>(null);
  const scrollableTracksAreaRef = useRef<HTMLDivElement>(null);
  const durationInputRef = useRef<HTMLInputElement>(null);
  const speedInputRef = useRef<HTMLInputElement>(null); 
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapViewportRef = useRef<HTMLDivElement>(null);
  const loopMenuRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<number | null>(null);
  const lastMouseXRef = useRef<number>(0);

  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [draggingKeyframeInfo, setDraggingKeyframeInfo] = useState<DraggingKeyframeInfo | null>(null);
  const [draggingGroupDurationInfo, setDraggingGroupDurationInfo] = useState<DraggingGroupDurationInfo | null>(null);
  const [draggingDopesheetBarInfo, setDraggingDopesheetBarInfo] = useState<DraggingDopesheetBarInfo | null>(null);
  const [resizingDopesheetBarInfo, setResizingDopesheetBarInfo] = useState<ResizingDopesheetBarInfo | null>(null);
  const [draggingPropertyGroupInfo, setDraggingPropertyGroupInfo] = useState<DraggingPropertyGroupInfo | null>(null);
  const [currentDraggingGroupTimespan, setCurrentDraggingGroupTimespan] = useState<{start: number, end: number} | null>(null);
  const [currentDraggedKeyframePixelOffset, setCurrentDraggedKeyframePixelOffset] = useState<number | null>(null);
  const keyframeClickThreshold = 5;
  const keyframeDragStartTimeRef = useRef<number>(0);
  const [expandedTimelinePropertyGroups, setExpandedTimelinePropertyGroups] = useState<Set<TimelinePropertyGroupKey>>(new Set(['Transform']));
  
  const [formattedDurationInput, setFormattedDurationInput] = useState<string>(formatDurationHHMMSSms(animation.duration));
  const [formattedSpeedInput, setFormattedSpeedInput] = useState<string>(`${playbackSpeed.toFixed(2)}x`); 
  const [draggingAdjustInfo, setDraggingAdjustInfo] = useState<DraggingAdjustInfo | null>(null); 
  const [isEditingSpeedInput, setIsEditingSpeedInput] = useState(false);
  const [isLoopMenuOpen, setIsLoopMenuOpen] = useState(false);


  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [effectivePixelsPerSecond, setEffectivePixelsPerSecond] = useState(basePixelsPerSecond * zoomLevel);
  const [isDraggingMinimapViewport, setIsDraggingMinimapViewport] = useState(false);
  const [minimapViewportDragStart, setMinimapViewportDragStart] = useState({ x: 0, scrollLeft: 0 });
  const [isResizingMinimapViewport, setIsResizingMinimapViewport] = useState<'left' | 'right' | null>(null);
  const [minimapViewportResizeStart, setMinimapViewportResizeStart] = useState({ x: 0, initialViewportX: 0, initialViewportWidth: 0, initialScrollLeft: 0, initialVisibleWidth: 0 });
  const verticalScrollSyncLockRef = useRef(false);

  const [editingDopesheetDurationInfo, setEditingDopesheetDurationInfo] = useState<EditingDopesheetDurationInfo | null>(null);
  const [dopesheetDurationInputValue, setDopesheetDurationInputValue] = useState<string>('');
  const dopesheetDurationInputRef = useRef<HTMLInputElement | null>(null);

  const [editingContextualGroupDurationInfo, setEditingContextualGroupDurationInfo] = useState<EditingContextualGroupDurationInfo | null>(null);
  const [contextualGroupDurationInputValue, setContextualGroupDurationInputValue] = useState<string>('');
  const contextualGroupDurationInputRef = useRef<HTMLInputElement | null>(null);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLoopMenuOpen && loopMenuRef.current && !loopMenuRef.current.contains(event.target as Node)) {
        setIsLoopMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLoopMenuOpen]);


  useEffect(() => {
    setEffectivePixelsPerSecond(basePixelsPerSecond * zoomLevel);
  }, [zoomLevel, basePixelsPerSecond]);

  useEffect(() => {
    setFormattedDurationInput(formatDurationHHMMSSms(animation.duration));
  }, [animation.duration]);
  
  useEffect(() => { 
    if (!isEditingSpeedInput) { // Don't overwrite if user is actively typing
        setFormattedSpeedInput(`${playbackSpeed.toFixed(2)}x`);
    }
  }, [playbackSpeed, isEditingSpeedInput]);


  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormattedDurationInput(e.target.value);
  };

  const handleDurationInputCommit = () => {
    const parsedSeconds = parseDurationHHMMSSms(formattedDurationInput);
    if (parsedSeconds !== null) {
      onUpdateDuration(Math.max(DURATION_MIN_SECONDS, parsedSeconds));
    } else {
      setFormattedDurationInput(formatDurationHHMMSSms(animation.duration)); 
    }
  };

  const handleSpeedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    setFormattedSpeedInput(e.target.value);
  };
  
  const handleSpeedInputCommit = () => { 
    if (isEditingSpeedInput) {
        let rawValue = formattedSpeedInput.trim().toLowerCase();
        if (rawValue.endsWith('x')) {
        rawValue = rawValue.slice(0, -1);
        }
        const parsedSpeed = parseFloat(rawValue);
        if (!isNaN(parsedSpeed)) {
        const clampedSpeed = Math.max(PLAYBACK_SPEED_MIN, Math.min(PLAYBACK_SPEED_MAX, parsedSpeed));
        dispatch({ type: 'SET_PLAYBACK_SPEED', payload: clampedSpeed });
        } else {
        setFormattedSpeedInput(`${playbackSpeed.toFixed(2)}x`);
        }
        setIsEditingSpeedInput(false);
    }
  };

  const handleSpeedInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isEditingSpeedInput) {
        if (e.key === 'Enter') {
            handleSpeedInputCommit(); 
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setFormattedSpeedInput(`${playbackSpeed.toFixed(2)}x`); 
            setIsEditingSpeedInput(false);
            (e.target as HTMLInputElement).blur();
        }
    }
  };

  const handleSpeedInputDoubleClick = () => {
    setIsEditingSpeedInput(true);
    if (speedInputRef.current) {
        speedInputRef.current.focus();
        let currentNumericValue = formattedSpeedInput;
        if (currentNumericValue.endsWith('x')) {
            currentNumericValue = currentNumericValue.slice(0, -1);
        }
        speedInputRef.current.value = currentNumericValue; 
        speedInputRef.current.select();
        setFormattedSpeedInput(currentNumericValue); 
    }
  };


  const handleValueAdjustChevronMouseDown = (e: React.MouseEvent, type: 'up' | 'down', controlType: 'duration' | 'speed') => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingAdjustInfo({ 
        type, 
        startY: e.clientY, 
        initialValue: controlType === 'duration' ? animation.duration : playbackSpeed,
        controlType 
    });
  };

  const handleValueAdjustDrag = useCallback((clientY: number) => {
    if (!draggingAdjustInfo) return;
    const deltaY = clientY - draggingAdjustInfo.startY;
    
    if (draggingAdjustInfo.controlType === 'duration') {
        const deltaMs = -deltaY * DURATION_DRAG_SENSITIVITY_MS_PER_PIXEL;
        const newDurationSeconds = adjustDuration(draggingAdjustInfo.initialValue, deltaMs);
        onUpdateDuration(newDurationSeconds);
    } else { // speed
        const deltaSpeed = -deltaY * PLAYBACK_SPEED_DRAG_SENSITIVITY_PER_PIXEL;
        let newSpeed = draggingAdjustInfo.initialValue + deltaSpeed;
        newSpeed = Math.max(PLAYBACK_SPEED_MIN, Math.min(PLAYBACK_SPEED_MAX, newSpeed));
        dispatch({ type: 'SET_PLAYBACK_SPEED', payload: parseFloat(newSpeed.toFixed(2)) });
    }
  }, [draggingAdjustInfo, onUpdateDuration, dispatch]);
  
  const handleValueAdjustClick = (type: 'up' | 'down', controlType: 'duration' | 'speed') => {
    if (controlType === 'duration') {
        const deltaMs = type === 'up' ? DURATION_CLICK_STEP_MS : -DURATION_CLICK_STEP_MS;
        const newDurationSeconds = adjustDuration(animation.duration, deltaMs);
        onUpdateDuration(newDurationSeconds);
    } else { // speed
        const deltaSpeed = type === 'up' ? PLAYBACK_SPEED_CLICK_STEP : -PLAYBACK_SPEED_CLICK_STEP;
        let newSpeed = playbackSpeed + deltaSpeed;
        newSpeed = Math.max(PLAYBACK_SPEED_MIN, Math.min(PLAYBACK_SPEED_MAX, newSpeed));
        dispatch({ type: 'SET_PLAYBACK_SPEED', payload: parseFloat(newSpeed.toFixed(2)) });
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingAdjustInfo) {
        handleValueAdjustDrag(e.clientY);
      }
    };
    const handleGlobalMouseUp = () => {
      if (draggingAdjustInfo) {
        if (draggingAdjustInfo.controlType === 'duration') {
            const finalParsedSeconds = parseDurationHHMMSSms(formatDurationHHMMSSms(animation.duration));
            if (finalParsedSeconds !== null) {
              onUpdateDuration(Math.max(DURATION_MIN_SECONDS, finalParsedSeconds));
            }
        }
        setDraggingAdjustInfo(null);
      }
    };
    if (draggingAdjustInfo) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingAdjustInfo, handleValueAdjustDrag, onUpdateDuration, animation.duration, formattedSpeedInput, dispatch]);


  useEffect(() => {
    // This effect handles auto-scrolling the timeline during playback.
    if (isPlaying && scrollableTracksAreaRef.current) {
      const tracksArea = scrollableTracksAreaRef.current;
      const scrollLeft = tracksArea.scrollLeft;
      const clientWidth = tracksArea.clientWidth;
      const scrubberX = currentTime * effectivePixelsPerSecond;

      const scrollTriggerPoint = scrollLeft + clientWidth / 2;

      // Determine if the scrubber has passed the center of the viewport in the direction of play.
      const shouldScroll = 
        (playbackDirection === 1 && scrubberX > scrollTriggerPoint) ||
        (playbackDirection === -1 && scrubberX < scrollTriggerPoint);

      if (shouldScroll) {
        // Calculate the new scroll position to center the scrubber.
        const newScrollLeft = scrubberX - clientWidth / 2;
        tracksArea.scrollLeft = newScrollLeft; // The browser will clamp this value automatically.
      }
    }
  }, [currentTime, isPlaying, effectivePixelsPerSecond, playbackDirection]);


  const selectedElement = elements.find(el => el.id === selectedElementId);
  const propertyGroupsForSelectedElement: TimelinePropertyUIGroup[] = selectedElement && timelineViewMode === 'contextual' ? TIMELINE_PROPERTY_GROUPS[selectedElement.type] : [];

  const relevantTracks = selectedElementId && timelineViewMode === 'contextual' ? animation.tracks.filter(track => track.elementId === selectedElementId) : [];

  const buildDopesheetTree = useCallback((parentId: string | null, level: number): DopesheetElementNode[] => {
    return elements
      .filter(el => el.artboardId === artboard.id && el.parentId === parentId)
      .sort((a, b) => b.order - a.order) 
      .map(el => {
        const elTracks = animation.tracks.filter(t => t.elementId === el.id);
        let minTime: number | undefined = undefined;
        let maxTime: number | undefined = undefined;
        if (elTracks.length > 0) {
          elTracks.forEach(track => {
            track.keyframes.forEach(kf => {
              if (minTime === undefined || kf.time < minTime) minTime = kf.time;
              if (maxTime === undefined || kf.time > maxTime) maxTime = kf.time;
            });
          });
        }
        return {
          ...el,
          minTime,
          maxTime,
          level,
          children: el.type === 'group' ? buildDopesheetTree(el.id, level + 1) : [],
        };
      });
  }, [elements, artboard.id, animation.tracks]);

  const dopesheetTree = useMemo(() => {
    if (timelineViewMode !== 'dopesheet') return [];
    return buildDopesheetTree(null, 0);
  }, [timelineViewMode, buildDopesheetTree]);

  const flattenedDopesheetElementsForMinimap = useMemo(() => {
    const result: DopesheetElementNode[] = [];
    function flatten(nodes: DopesheetElementNode[], currentLevel: number) {
      for (const node of nodes) {
        result.push({...node, level: currentLevel});
        if (expandedGroupIds.has(node.id) && node.children) {
          flatten(node.children, currentLevel + 1);
        }
      }
    }
    flatten(dopesheetTree, 0);
    return result;
  }, [dopesheetTree, expandedGroupIds]);


  const timelineContentWidth = Math.max(animation.duration * effectivePixelsPerSecond, scrollableTracksAreaRef.current?.clientWidth || 500);

  const onSetCurrentTime = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
    dispatch({ type: 'SET_IS_PLAYING', payload: false });
  }, [dispatch]);

  const handleRulerInteraction = useCallback((clientX: number, rulerOuterContainer: HTMLDivElement) => {
      const rect = rulerOuterContainer.getBoundingClientRect();
      const scrollOffset = rulerOuterContainer.scrollLeft || 0;
      const x = clientX - rect.left + scrollOffset;
      const time = Math.max(0, Math.min(animation.duration, x / effectivePixelsPerSecond));
      onSetCurrentTime(time);
      dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });
  }, [animation.duration, effectivePixelsPerSecond, onSetCurrentTime, dispatch]);

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget && !draggingDopesheetBarInfo && !resizingDopesheetBarInfo && !isDraggingMinimapViewport && !isResizingMinimapViewport && !draggingKeyframeInfo && !draggingGroupDurationInfo && !draggingPropertyGroupInfo) {
      handleRulerInteraction(e.clientX, e.currentTarget as HTMLDivElement);
      setIsDraggingScrubber(true);
    }
  };

  const handleScrubberHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (!draggingDopesheetBarInfo && !resizingDopesheetBarInfo && !isDraggingMinimapViewport && !isResizingMinimapViewport && !draggingKeyframeInfo && !draggingGroupDurationInfo && !draggingPropertyGroupInfo) {
        setIsDraggingScrubber(true);
        dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });
    }
  };

  useEffect(() => {
    const stopAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };

    const startAutoScroll = (direction: -1 | 1) => {
      stopAutoScroll();

      const scrollAmount = 15;
      autoScrollIntervalRef.current = window.setInterval(() => {
        const tracksArea = scrollableTracksAreaRef.current;
        const rulerContainer = rulerMarkersContainerRef.current?.parentElement;
        if (tracksArea && rulerContainer) {
          tracksArea.scrollLeft += scrollAmount * direction;
          handleRulerInteraction(lastMouseXRef.current, rulerContainer as HTMLDivElement);
        }
      }, 50);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseXRef.current = e.clientX;
      if (isDraggingScrubber && rulerMarkersContainerRef.current?.parentElement) {
        handleRulerInteraction(e.clientX, rulerMarkersContainerRef.current.parentElement as HTMLDivElement);
        
        const tracksArea = scrollableTracksAreaRef.current;
        if (!tracksArea) return;

        const rect = tracksArea.getBoundingClientRect();
        const scrollEdgeThreshold = 50; 

        if (e.clientX < rect.left + scrollEdgeThreshold) {
          startAutoScroll(-1);
        } else if (e.clientX > rect.right - scrollEdgeThreshold) {
          startAutoScroll(1);
        } else {
          stopAutoScroll();
        }
      }
    };
    
    const handleMouseUp = () => {
      if (isDraggingScrubber) {
        setIsDraggingScrubber(false);
        stopAutoScroll();
      }
    };
    
    if (isDraggingScrubber) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      stopAutoScroll();
    };
  }, [isDraggingScrubber, handleRulerInteraction]);


  const handleVerticalScroll = useCallback((scrolledPane: 'left' | 'right') => {
    if (verticalScrollSyncLockRef.current) return;
    verticalScrollSyncLockRef.current = true;

    const leftPane = propertiesPaneRef.current;
    const rightPane = scrollableTracksAreaRef.current;

    if (leftPane && rightPane) {
      if (scrolledPane === 'left') {
        if (rightPane.scrollTop !== leftPane.scrollTop) {
          rightPane.scrollTop = leftPane.scrollTop;
        }
      } else {
        if (leftPane.scrollTop !== rightPane.scrollTop) {
          leftPane.scrollTop = rightPane.scrollTop;
        }
      }
    }

    requestAnimationFrame(() => {
      verticalScrollSyncLockRef.current = false;
    });
  }, []);

  const handleHorizontalScrollSync = (event: React.UIEvent<HTMLDivElement>) => {
    const rulerViewport = rulerMarkersContainerRef.current?.parentElement;
    if (rulerViewport) {
      (rulerViewport as HTMLElement).scrollLeft = event.currentTarget.scrollLeft;
    }
  };


  const handleKeyframeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, kf: Keyframe, elId: string, prop: AnimatableProperty) => {
    e.preventDefault(); e.stopPropagation(); keyframeDragStartTimeRef.current = Date.now();
    if (draggingDopesheetBarInfo || resizingDopesheetBarInfo || isDraggingMinimapViewport || isResizingMinimapViewport || draggingGroupDurationInfo || draggingPropertyGroupInfo) return;
    setDraggingKeyframeInfo({ elementId: elId, property: prop, originalTime: kf.time, keyframeValue: kf.value, initialMouseX: e.clientX, keyframeOffsetX: kf.time * effectivePixelsPerSecond });
    setCurrentDraggedKeyframePixelOffset(kf.time * effectivePixelsPerSecond);
    dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: { type: 'keyframe', elementId: elId, property: prop, time: kf.time } });
  }, [effectivePixelsPerSecond, dispatch, draggingDopesheetBarInfo, resizingDopesheetBarInfo, isDraggingMinimapViewport, isResizingMinimapViewport, draggingGroupDurationInfo, draggingPropertyGroupInfo]);

  const handleKeyframeClick = useCallback((e: React.MouseEvent<HTMLDivElement>, kf: Keyframe, elId: string, prop: AnimatableProperty) => {
    e.stopPropagation();
    if (draggingDopesheetBarInfo || resizingDopesheetBarInfo || isDraggingMinimapViewport || isResizingMinimapViewport || draggingGroupDurationInfo || draggingPropertyGroupInfo) return;
    if (e.altKey) { onRemoveKeyframe(elId, prop, kf.time); if (selectedTimelineContextItem?.type === 'keyframe' && selectedTimelineContextItem.elementId === elId && selectedTimelineContextItem.property === prop && selectedTimelineContextItem.time === kf.time) { dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });} return; }
    const timeSinceMouseDown = Date.now() - keyframeDragStartTimeRef.current; let isDrag = false;
    if(draggingKeyframeInfo){ const dx = Math.abs(e.clientX - draggingKeyframeInfo.initialMouseX); if(dx > keyframeClickThreshold) isDrag = true; }
    if (timeSinceMouseDown < 250 && !isDrag) { onSetCurrentTime(kf.time); dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: { type: 'keyframe', elementId: elId, property: prop, time: kf.time } });}
  }, [onRemoveKeyframe, onSetCurrentTime, dispatch, draggingKeyframeInfo, keyframeClickThreshold, selectedTimelineContextItem, draggingDopesheetBarInfo, resizingDopesheetBarInfo, isDraggingMinimapViewport, isResizingMinimapViewport, draggingGroupDurationInfo, draggingPropertyGroupInfo]);

  const handleKeyframeDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>, kf: Keyframe, elId: string, prop: AnimatableProperty) => {
    e.stopPropagation();
    if (draggingDopesheetBarInfo || resizingDopesheetBarInfo || isDraggingMinimapViewport || isResizingMinimapViewport || draggingGroupDurationInfo || draggingPropertyGroupInfo) return;
    onRemoveKeyframe(elId, prop, kf.time);
    if (selectedTimelineContextItem?.type === 'keyframe' && selectedTimelineContextItem.elementId === elId && selectedTimelineContextItem.property === prop && selectedTimelineContextItem.time === kf.time) { dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });}
  }, [onRemoveKeyframe, dispatch, selectedTimelineContextItem, draggingDopesheetBarInfo, resizingDopesheetBarInfo, isDraggingMinimapViewport, isResizingMinimapViewport, draggingGroupDurationInfo, draggingPropertyGroupInfo]);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!draggingKeyframeInfo || !scrollableTracksAreaRef.current) return;
        const deltaX = e.clientX - draggingKeyframeInfo.initialMouseX;
        let newPixelOffset = (draggingKeyframeInfo.originalTime * effectivePixelsPerSecond) + deltaX;
        newPixelOffset = Math.max(0, Math.min(newPixelOffset, timelineContentWidth -1));
        setCurrentDraggedKeyframePixelOffset(newPixelOffset);
        const newTime = newPixelOffset / effectivePixelsPerSecond;
        onSetCurrentTime(Math.max(0, Math.min(newTime, animation.duration)));
    };
    const handleMouseUp = (e: MouseEvent) => {
        if (draggingKeyframeInfo && scrollableTracksAreaRef.current && currentDraggedKeyframePixelOffset !== null) {
            const mouseMovedSignificantly = Math.abs(e.clientX - draggingKeyframeInfo.initialMouseX) > keyframeClickThreshold;
            if (mouseMovedSignificantly) {
                let newTime = currentDraggedKeyframePixelOffset / effectivePixelsPerSecond;
                newTime = Math.max(0, Math.min(newTime, animation.duration));
                const track = animation.tracks.find(t => t.elementId === draggingKeyframeInfo.elementId && t.property === draggingKeyframeInfo.property);
                if (track) {
                    const otherKeyframesTimes = track.keyframes.filter(kf => Math.abs(kf.time - draggingKeyframeInfo.originalTime) > 0.001).map(kf => kf.time);
                    const prevKfTime = Math.max(-1, ...otherKeyframesTimes.filter(t => t < newTime));
                    const nextKfTime = Math.min(animation.duration + 1, ...otherKeyframesTimes.filter(t => t > newTime));
                    const minTimeDelta = 0.01;
                    if (newTime <= prevKfTime + minTimeDelta && prevKfTime > -1) newTime = prevKfTime + minTimeDelta;
                    if (newTime >= nextKfTime - minTimeDelta && nextKfTime < animation.duration +1) newTime = nextKfTime - minTimeDelta;
                }
                newTime = Math.max(0, Math.min(newTime, animation.duration));
                if (Math.abs(newTime - draggingKeyframeInfo.originalTime) > 0.001) {
                    onUpdateKeyframeTime(draggingKeyframeInfo.elementId, draggingKeyframeInfo.property, draggingKeyframeInfo.originalTime, newTime);
                    dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: { type: 'keyframe', elementId: draggingKeyframeInfo.elementId, property: draggingKeyframeInfo.property, time: newTime } });
                }
            }
        }
        setDraggingKeyframeInfo(null); setCurrentDraggedKeyframePixelOffset(null);
    };
    if (draggingKeyframeInfo) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp, { once: true }); }
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [draggingKeyframeInfo, currentDraggedKeyframePixelOffset, effectivePixelsPerSecond, animation.duration, onUpdateKeyframeTime, onSetCurrentTime, animation.tracks, timelineContentWidth, keyframeClickThreshold, dispatch]);

  const handleGroupDurationHandleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, grpKey: TimelinePropertyGroupKey, propsToScale: AnimatableProperty[], type: 'start' | 'end', grpTimespan: { start: number; end: number }) => {
    e.preventDefault(); e.stopPropagation(); if (!selectedElementId || draggingDopesheetBarInfo || resizingDopesheetBarInfo || isDraggingMinimapViewport || isResizingMinimapViewport || draggingKeyframeInfo || draggingPropertyGroupInfo) return;
    setDraggingGroupDurationInfo({ elementId: selectedElementId, groupKey: grpKey, propertiesToScale: propsToScale, handleType: type, initialMouseX: e.clientX, originalTimespan: grpTimespan });
    setCurrentDraggingGroupTimespan(grpTimespan); dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });
  }, [selectedElementId, dispatch, draggingDopesheetBarInfo, resizingDopesheetBarInfo, isDraggingMinimapViewport, isResizingMinimapViewport, draggingKeyframeInfo, draggingPropertyGroupInfo]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingGroupDurationInfo || !scrollableTracksAreaRef.current) return;
      const deltaX = e.clientX - draggingGroupDurationInfo.initialMouseX; const deltaSeconds = deltaX / effectivePixelsPerSecond;
      let newStart = draggingGroupDurationInfo.originalTimespan.start; let newEnd = draggingGroupDurationInfo.originalTimespan.end;
      if (draggingGroupDurationInfo.handleType === 'start') { newStart = Math.max(0, Math.min(newStart + deltaSeconds, newEnd - MIN_CLIP_DURATION_SECONDS)); }
      else { newEnd = Math.max(newStart + MIN_CLIP_DURATION_SECONDS, Math.min(newEnd + deltaSeconds, animation.duration)); }
      setCurrentDraggingGroupTimespan({ start: newStart, end: newEnd });
    };
    const handleMouseUp = () => {
      if (draggingGroupDurationInfo && currentDraggingGroupTimespan) {
        if (Math.abs(currentDraggingGroupTimespan.start - draggingGroupDurationInfo.originalTimespan.start) > 0.001 || Math.abs(currentDraggingGroupTimespan.end - draggingGroupDurationInfo.originalTimespan.end) > 0.001) {
          dispatch({ type: 'SCALE_KEYFRAME_GROUP_TIMES', payload: { elementId: draggingGroupDurationInfo.elementId, propertiesToScale: draggingGroupDurationInfo.propertiesToScale, originalTimespan: draggingGroupDurationInfo.originalTimespan, newTimespan: currentDraggingGroupTimespan } });
        }
      }
      setDraggingGroupDurationInfo(null); setCurrentDraggingGroupTimespan(null);
    };
    if (draggingGroupDurationInfo) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp, { once: true });}
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp);};
  }, [draggingGroupDurationInfo, currentDraggingGroupTimespan, effectivePixelsPerSecond, animation.duration, dispatch]);

  const handlePropertyGroupBarMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, elId: string, propsToShift: AnimatableProperty[], groupInitialEarliestTime: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!scrollableTracksAreaRef.current || isDraggingMinimapViewport || isResizingMinimapViewport || resizingDopesheetBarInfo || draggingKeyframeInfo || draggingGroupDurationInfo || draggingDopesheetBarInfo || editingContextualGroupDurationInfo?.elementId === elId) return;

    if (elId !== selectedElementId) dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elId });
    dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });

    let minKfTimeInGroup = Infinity;
    let maxKfTimeInGroup = -Infinity;
    animation.tracks.forEach(track => {
      if (track.elementId === elId && propsToShift.includes(track.property)) {
        track.keyframes.forEach(kf => {
          minKfTimeInGroup = Math.min(minKfTimeInGroup, kf.time);
          maxKfTimeInGroup = Math.max(maxKfTimeInGroup, kf.time);
        });
      }
    });
    const groupKeyframeSpan = (minKfTimeInGroup !== Infinity && maxKfTimeInGroup !== -Infinity && maxKfTimeInGroup > minKfTimeInGroup)
                              ? (maxKfTimeInGroup - minKfTimeInGroup)
                              : 0;

    setDraggingPropertyGroupInfo({
        elementId: elId,
        propertiesToShift: propsToShift,
        initialMouseX: e.clientX,
        originalEarliestTime: groupInitialEarliestTime,
        groupKeyframeSpan: groupKeyframeSpan,
        currentBarLeftTime: groupInitialEarliestTime,
    });
    if (scrollableTracksAreaRef.current) scrollableTracksAreaRef.current.style.cursor = 'grabbing';
  }, [isDraggingMinimapViewport, isResizingMinimapViewport, dispatch, resizingDopesheetBarInfo, draggingKeyframeInfo, draggingGroupDurationInfo, draggingDopesheetBarInfo, selectedElementId, animation.tracks, editingContextualGroupDurationInfo]);
  
  const handlePropertyGroupMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingPropertyGroupInfo || !scrollableTracksAreaRef.current) return;
    const deltaX = e.clientX - draggingPropertyGroupInfo.initialMouseX;
    const deltaSeconds = deltaX / effectivePixelsPerSecond;
    let newProposedStartTime = draggingPropertyGroupInfo.originalEarliestTime + deltaSeconds;
  
    const groupDuration = draggingPropertyGroupInfo.groupKeyframeSpan;
    let newStartTimeClamped = Math.max(0, newProposedStartTime);
    const newEndTimeCandidate = newStartTimeClamped + groupDuration;
  
    if (newEndTimeCandidate > animation.duration) {
      newStartTimeClamped = Math.max(0, animation.duration - groupDuration);
    }
    newStartTimeClamped = Math.max(0, newStartTimeClamped); 
  
    setDraggingPropertyGroupInfo(prev => prev ? { ...prev, currentBarLeftTime: parseFloat(newStartTimeClamped.toFixed(3)) } : null);
  }, [effectivePixelsPerSecond, animation.duration, draggingPropertyGroupInfo]);
  
  const handlePropertyGroupMouseUp = useCallback(() => {
    if (draggingPropertyGroupInfo) {
        const timeShift = draggingPropertyGroupInfo.currentBarLeftTime - draggingPropertyGroupInfo.originalEarliestTime;
        if (Math.abs(timeShift) > 0.001) {
            dispatch({
                type: 'SHIFT_PROPERTY_GROUP_TIMES',
                payload: {
                    elementId: draggingPropertyGroupInfo.elementId,
                    propertiesToShift: draggingPropertyGroupInfo.propertiesToShift,
                    timeShift: parseFloat(timeShift.toFixed(3)),
                },
            });
        }
        setDraggingPropertyGroupInfo(null);
        if (scrollableTracksAreaRef.current) scrollableTracksAreaRef.current.style.cursor = 'default';
    }
  }, [draggingPropertyGroupInfo, dispatch]);
  
  useEffect(() => {
    if (draggingPropertyGroupInfo) {
        document.addEventListener('mousemove', handlePropertyGroupMouseMove);
        document.addEventListener('mouseup', handlePropertyGroupMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handlePropertyGroupMouseMove);
        document.removeEventListener('mouseup', handlePropertyGroupMouseUp);
    };
  }, [draggingPropertyGroupInfo, handlePropertyGroupMouseMove, handlePropertyGroupMouseUp]);

  const handleDopesheetBarMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, elId: string, barMinTime: number, barMaxTime: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!scrollableTracksAreaRef.current || isDraggingMinimapViewport || isResizingMinimapViewport || resizingDopesheetBarInfo || draggingKeyframeInfo || draggingGroupDurationInfo || draggingPropertyGroupInfo || editingDopesheetDurationInfo?.elementId === elId) return;

    if (elId !== selectedElementId) {
        dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elId });
    }
    dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });

    const clipDuration = barMaxTime - barMinTime;
    setDraggingDopesheetBarInfo({
        elementId: elId,
        initialMouseX: e.clientX,
        originalMinTime: barMinTime,
        clipDuration: clipDuration,
        currentBarLeftTime: barMinTime,
    });
    if (scrollableTracksAreaRef.current) scrollableTracksAreaRef.current.style.cursor = 'grabbing';
  }, [isDraggingMinimapViewport, isResizingMinimapViewport, dispatch, resizingDopesheetBarInfo, draggingKeyframeInfo, draggingGroupDurationInfo, draggingPropertyGroupInfo, selectedElementId, editingDopesheetDurationInfo]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!draggingDopesheetBarInfo || !scrollableTracksAreaRef.current) return;
        const deltaX = e.clientX - draggingDopesheetBarInfo.initialMouseX;
        const deltaSeconds = deltaX / effectivePixelsPerSecond;
        let newProposedStartTime = draggingDopesheetBarInfo.originalMinTime + deltaSeconds;

        let newStartTimeClamped = Math.max(0, newProposedStartTime);
        const newEndTimeCandidate = newStartTimeClamped + draggingDopesheetBarInfo.clipDuration;

        if (newEndTimeCandidate > animation.duration) {
            newStartTimeClamped = Math.max(0, animation.duration - draggingDopesheetBarInfo.clipDuration);
        }

        setDraggingDopesheetBarInfo(prev => prev ? { ...prev, currentBarLeftTime: parseFloat(newStartTimeClamped.toFixed(3)) } : null);
    };

    const handleGlobalMouseUp = () => {
        if (draggingDopesheetBarInfo) {
            const timeShift = draggingDopesheetBarInfo.currentBarLeftTime - draggingDopesheetBarInfo.originalMinTime;
            if (Math.abs(timeShift) > 0.001) {
                dispatch({
                    type: 'SHIFT_ELEMENT_ANIMATION_TIMES',
                    payload: {
                        elementId: draggingDopesheetBarInfo.elementId,
                        timeShift: parseFloat(timeShift.toFixed(3)),
                    },
                });
            }
            setDraggingDopesheetBarInfo(null);
            if (scrollableTracksAreaRef.current) scrollableTracksAreaRef.current.style.cursor = resizingDopesheetBarInfo ? 'ew-resize' : 'default';
        }
    };

    if (draggingDopesheetBarInfo) {
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        if (scrollableTracksAreaRef.current && scrollableTracksAreaRef.current.style.cursor === 'grabbing') {
            scrollableTracksAreaRef.current.style.cursor = resizingDopesheetBarInfo ? 'ew-resize' : 'default';
        }
    };
  }, [draggingDopesheetBarInfo, effectivePixelsPerSecond, animation.duration, dispatch, resizingDopesheetBarInfo]);

  const handleDopesheetResizeHandleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, elId: string, handleType: 'start' | 'end', barMinTime: number, barMaxTime: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!scrollableTracksAreaRef.current || isDraggingMinimapViewport || isResizingMinimapViewport || draggingDopesheetBarInfo || draggingKeyframeInfo || draggingGroupDurationInfo || draggingPropertyGroupInfo || editingDopesheetDurationInfo?.elementId === elId) return;

    if (elId !== selectedElementId) {
        dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elId });
    }
    dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });

    setResizingDopesheetBarInfo({
        elementId: elId,
        handleType,
        initialMouseX: e.clientX,
        originalMinTime: barMinTime,
        originalMaxTime: barMaxTime,
        currentBarTime: handleType === 'start' ? barMinTime : barMaxTime,
    });
    if (scrollableTracksAreaRef.current) scrollableTracksAreaRef.current.style.cursor = 'ew-resize';
  }, [isDraggingMinimapViewport, isResizingMinimapViewport, dispatch, draggingDopesheetBarInfo, draggingKeyframeInfo, draggingGroupDurationInfo, draggingPropertyGroupInfo, selectedElementId, editingDopesheetDurationInfo]);

  useEffect(() => {
    const handleGlobalResizeMouseMove = (e: MouseEvent) => {
        if (!resizingDopesheetBarInfo || !scrollableTracksAreaRef.current) return;
        const deltaX = e.clientX - resizingDopesheetBarInfo.initialMouseX;
        const deltaSeconds = deltaX / effectivePixelsPerSecond;
        let newProposedTime;
        let clampedTime;

        if (resizingDopesheetBarInfo.handleType === 'start') {
            newProposedTime = resizingDopesheetBarInfo.originalMinTime + deltaSeconds;
            clampedTime = Math.max(0, Math.min(newProposedTime, resizingDopesheetBarInfo.originalMaxTime - MIN_CLIP_DURATION_SECONDS));
        } else { 
            newProposedTime = resizingDopesheetBarInfo.originalMaxTime + deltaSeconds;
            clampedTime = Math.max(resizingDopesheetBarInfo.originalMinTime + MIN_CLIP_DURATION_SECONDS, Math.min(newProposedTime, animation.duration));
        }
        setResizingDopesheetBarInfo(prev => prev ? { ...prev, currentBarTime: parseFloat(clampedTime.toFixed(3)) } : null);
    };

    const handleGlobalResizeMouseUp = () => {
        if (resizingDopesheetBarInfo) {
            let newTimespan;
            if (resizingDopesheetBarInfo.handleType === 'start') {
                newTimespan = { start: resizingDopesheetBarInfo.currentBarTime, end: resizingDopesheetBarInfo.originalMaxTime };
            } else {
                newTimespan = { start: resizingDopesheetBarInfo.originalMinTime, end: resizingDopesheetBarInfo.currentBarTime };
            }

            const propertiesToScale = animation.tracks.filter(t => t.elementId === resizingDopesheetBarInfo.elementId).map(t => t.property);

            if (propertiesToScale.length > 0 && (Math.abs(newTimespan.start - resizingDopesheetBarInfo.originalMinTime) > 0.001 || Math.abs(newTimespan.end - resizingDopesheetBarInfo.originalMaxTime) > 0.001)) {
                dispatch({
                    type: 'SCALE_KEYFRAME_GROUP_TIMES',
                    payload: {
                        elementId: resizingDopesheetBarInfo.elementId,
                        propertiesToScale,
                        originalTimespan: { start: resizingDopesheetBarInfo.originalMinTime, end: resizingDopesheetBarInfo.originalMaxTime },
                        newTimespan,
                    },
                });
            }
            setResizingDopesheetBarInfo(null);
            if (scrollableTracksAreaRef.current) scrollableTracksAreaRef.current.style.cursor = draggingDopesheetBarInfo ? 'grabbing' : 'default';
        }
    };

    if (resizingDopesheetBarInfo) {
        document.addEventListener('mousemove', handleGlobalResizeMouseMove);
        document.addEventListener('mouseup', handleGlobalResizeMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleGlobalResizeMouseMove);
        document.removeEventListener('mouseup', handleGlobalResizeMouseUp);
        if (scrollableTracksAreaRef.current && scrollableTracksAreaRef.current.style.cursor === 'ew-resize') {
             scrollableTracksAreaRef.current.style.cursor = draggingDopesheetBarInfo ? 'grabbing' : 'default';
        }
    };
  }, [resizingDopesheetBarInfo, effectivePixelsPerSecond, animation.duration, animation.tracks, dispatch, draggingDopesheetBarInfo]);

  const handleDopesheetBarDoubleClick = useCallback((elementId: string) => {
    dispatch({ type: 'SET_TIMELINE_VIEW_MODE', payload: 'contextual' });
    dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elementId });
    dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });
  }, [dispatch]);

  const handleDopesheetDurationTextClick = useCallback((e: React.MouseEvent, elementId: string, minTime: number, maxTime: number) => {
    e.stopPropagation(); 
    if (editingDopesheetDurationInfo?.elementId === elementId || resizingDopesheetBarInfo || draggingDopesheetBarInfo) return;
    setEditingDopesheetDurationInfo({ elementId, originalMinTime: minTime, originalMaxTime: maxTime });
    setDopesheetDurationInputValue((maxTime - minTime).toFixed(1) + "s");
  }, [editingDopesheetDurationInfo, resizingDopesheetBarInfo, draggingDopesheetBarInfo]);

  useEffect(() => {
    if (editingDopesheetDurationInfo && dopesheetDurationInputRef.current) {
        dopesheetDurationInputRef.current.focus();
        dopesheetDurationInputRef.current.select();
    }
  }, [editingDopesheetDurationInfo]);

  const commitDopesheetDurationChange = useCallback(() => {
    if (!editingDopesheetDurationInfo) return;
    const { elementId, originalMinTime, originalMaxTime } = editingDopesheetDurationInfo;

    let rawValue = dopesheetDurationInputValue.trim().toLowerCase();
    if (rawValue.endsWith('s')) rawValue = rawValue.slice(0, -1);
    let newDuration = parseFloat(rawValue);

    if (isNaN(newDuration)) newDuration = originalMaxTime - originalMinTime;
    newDuration = Math.max(MIN_CLIP_DURATION_SECONDS, newDuration);
    const newMaxTime = Math.min(originalMinTime + newDuration, animation.duration);
    newDuration = newMaxTime - originalMinTime; 

    if (Math.abs(newDuration - (originalMaxTime - originalMinTime)) > 0.01 || newMaxTime !== originalMaxTime) {
        const targetElement = elements.find(el => el.id === elementId);
        if (targetElement) {
            const propsToScale = getElementAnimatableProperties(targetElement.type);
            dispatch({
                type: 'SCALE_KEYFRAME_GROUP_TIMES',
                payload: {
                    elementId,
                    propertiesToScale: propsToScale,
                    originalTimespan: { start: originalMinTime, end: originalMaxTime },
                    newTimespan: { start: originalMinTime, end: newMaxTime }
                }
            });
        }
    }
    setEditingDopesheetDurationInfo(null);
    setDopesheetDurationInputValue('');
  }, [editingDopesheetDurationInfo, dopesheetDurationInputValue, animation.duration, elements, dispatch]);

  const cancelDopesheetDurationEdit = useCallback(() => {
    setEditingDopesheetDurationInfo(null);
    setDopesheetDurationInputValue('');
  }, []);

  const handleDopesheetDurationInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        commitDopesheetDurationChange();
        e.currentTarget.blur();
    } else if (e.key === 'Escape') {
        cancelDopesheetDurationEdit();
        e.currentTarget.blur();
    }
  }, [commitDopesheetDurationChange, cancelDopesheetDurationEdit]);

  const handleContextualGroupDurationTextClick = useCallback((
    e: React.MouseEvent,
    elementId: string,
    groupKey: TimelinePropertyGroupKey,
    propertiesToScale: AnimatableProperty[],
    minTime: number,
    maxTime: number
  ) => {
    e.stopPropagation();
    if (editingContextualGroupDurationInfo?.elementId === elementId && editingContextualGroupDurationInfo?.groupKey === groupKey ||
        draggingGroupDurationInfo || draggingPropertyGroupInfo) return;
    
    setEditingContextualGroupDurationInfo({
      elementId,
      groupKey,
      propertiesToScale,
      originalMinTimeInGroup: minTime,
      originalMaxTimeInGroup: maxTime
    });
    setContextualGroupDurationInputValue((maxTime - minTime).toFixed(1) + "s");
  }, [editingContextualGroupDurationInfo, draggingGroupDurationInfo, draggingPropertyGroupInfo]);

  useEffect(() => {
    if (editingContextualGroupDurationInfo && contextualGroupDurationInputRef.current) {
        contextualGroupDurationInputRef.current.focus();
        contextualGroupDurationInputRef.current.select();
    }
  }, [editingContextualGroupDurationInfo]);
  
  const commitContextualGroupDurationChange = useCallback(() => {
    if (!editingContextualGroupDurationInfo) return;
    const { elementId, propertiesToScale, originalMinTimeInGroup, originalMaxTimeInGroup } = editingContextualGroupDurationInfo;
  
    let rawValue = contextualGroupDurationInputValue.trim().toLowerCase();
    if (rawValue.endsWith('s')) rawValue = rawValue.slice(0, -1);
    let newDuration = parseFloat(rawValue);
  
    if (isNaN(newDuration)) newDuration = originalMaxTimeInGroup - originalMinTimeInGroup;
    newDuration = Math.max(MIN_CLIP_DURATION_SECONDS, newDuration);
    const newMaxTime = Math.min(originalMinTimeInGroup + newDuration, animation.duration);
  
    if (Math.abs(newMaxTime - originalMaxTimeInGroup) > 0.01 || newMaxTime !== originalMaxTimeInGroup) {
      dispatch({
        type: 'SCALE_KEYFRAME_GROUP_TIMES',
        payload: {
          elementId,
          propertiesToScale,
          originalTimespan: { start: originalMinTimeInGroup, end: originalMaxTimeInGroup },
          newTimespan: { start: originalMinTimeInGroup, end: newMaxTime }
        }
      });
    }
    setEditingContextualGroupDurationInfo(null);
    setContextualGroupDurationInputValue('');
  }, [editingContextualGroupDurationInfo, contextualGroupDurationInputValue, animation.duration, dispatch]);
  
  const cancelContextualGroupDurationEdit = useCallback(() => {
    setEditingContextualGroupDurationInfo(null);
    setContextualGroupDurationInputValue('');
  }, []);
  
  const handleContextualGroupDurationInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitContextualGroupDurationChange();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      cancelContextualGroupDurationEdit();
      e.currentTarget.blur();
    }
  }, [commitContextualGroupDurationChange, cancelContextualGroupDurationEdit]);


  const renderRulerMarkers = () => {
    const markers = [];
    if (animation.duration <= 0) {
        markers.push(
            <div key="marker-0" style={{ left: `0px` }} className="absolute top-0 h-full flex flex-col items-center pointer-events-none">
              <div className="w-px h-2/3 bg-[var(--glass-border-color)] opacity-70" />
              <span className="text-xs text-text-secondary mt-0.5 select-none">0s</span>
            </div>
          );
        return markers;
    }

    const majorMarkerInterval = getRulerMajorMarkerInterval(effectivePixelsPerSecond, animation.duration);
    const subdivisionCount = getRulerSubdivisionCount(majorMarkerInterval, effectivePixelsPerSecond);
    
    // Use an integer-based loop to avoid floating point precision errors with time
    const numMajorMarkers = Math.ceil(animation.duration / majorMarkerInterval);

    for (let i = 0; i <= numMajorMarkers; i++) {
        const time = i * majorMarkerInterval;
        // Don't render markers significantly past the end of the timeline duration.
        if (time > animation.duration + majorMarkerInterval * 0.1) continue;
        
        const xPos = time * effectivePixelsPerSecond;
        if (xPos > timelineContentWidth + 100) continue; // Performance safeguard

        const formattedTime = formatTimeForRulerDisplay(time, majorMarkerInterval, animation.duration);
        markers.push(
            <div key={`marker-${i}`} style={{ left: `${xPos}px` }} className="absolute top-0 h-full flex flex-col items-center pointer-events-none">
              <div className="w-px h-2/3 bg-[var(--glass-border-color)] opacity-70" />
              <span className="text-xs text-text-secondary mt-0.5 select-none">{formattedTime}</span>
            </div>
        );

        // Don't draw subdivisions for the very last major marker if they would go past the duration.
        if (i === numMajorMarkers) continue;

        if (subdivisionCount > 0) {
            const subInterval = majorMarkerInterval / subdivisionCount;
            for (let j = 1; j < subdivisionCount; j++) {
                const subTime = time + j * subInterval;
                if (subTime < animation.duration + subInterval * 0.1) {
                    markers.push(
                        <div key={`submarker-${i}-${j}`} style={{ left: `${subTime * effectivePixelsPerSecond}px` }} className="absolute top-0 h-1/3 w-px bg-[var(--glass-border-color)] opacity-40 pointer-events-none" />
                    );
                }
            }
        }
    }
    return markers;
  };

  const handleAddTrackOrKeyframe = (prop: AnimatableProperty, trackExists: boolean) => {
    if (!selectedElement) return;
    const currentElState = elements.find(e => e.id === selectedElement.id) || selectedElement;
    let valToKf;
    if (trackExists) { const trk = animation.tracks.find(t => t.elementId === selectedElement.id && t.property === prop); if (!trk) return; valToKf = interpolateValue(trk.keyframes, currentTime, (currentElState as any)[prop]); }
    else { valToKf = (currentElState as any)[prop]; if (prop === 'motionPath') valToKf = (currentElState as any)['motionPathId'] || ''; else if ((prop === 'fill' || prop === 'stroke') && valToKf === undefined) valToKf = 'none'; else if (valToKf === undefined) valToKf = 0;}
    onAddKeyframe(prop, valToKf); dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: { type: 'keyframe', elementId: selectedElement.id, property: prop, time: currentTime } });
  };

  const togglePropertyGroupExpansion = (grpKey: TimelinePropertyGroupKey) => { setExpandedTimelinePropertyGroups(prev => { const newSet = new Set(prev); if (newSet.has(grpKey)) newSet.delete(grpKey); else newSet.add(grpKey); return newSet; }); };

  const scrollableAreaEffectiveHeight = height - TOP_CONTROLS_BAR_HEIGHT - TIMELINE_RULER_HEIGHT;
  const handleTrackAreaClick = (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null }); };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.25 : 0.8;
    const newZoomLevel = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, zoomLevel * factor));
    const tracksArea = scrollableTracksAreaRef.current;
    if (tracksArea) {
        const currentVisibleTimeCenter = (tracksArea.scrollLeft + tracksArea.clientWidth / 2) / effectivePixelsPerSecond;
        const newEffectivePPS = basePixelsPerSecond * newZoomLevel;
        const newScrollLeft = (currentVisibleTimeCenter * newEffectivePPS) - (tracksArea.clientWidth / 2);
        setZoomLevel(newZoomLevel);
        requestAnimationFrame(() => { tracksArea.scrollLeft = Math.max(0, newScrollLeft); });
    } else {
        setZoomLevel(newZoomLevel);
    }
  };

  const handleFitToScreen = () => {
    if (!scrollableTracksAreaRef.current || animation.duration === 0) return;
    const visibleWidth = scrollableTracksAreaRef.current.clientWidth;
    if (visibleWidth <= 0) return;

    const newPixelsPerSecond = visibleWidth / animation.duration;
    let newZoom = newPixelsPerSecond / basePixelsPerSecond;
    newZoom = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, newZoom));

    setZoomLevel(newZoom);
    requestAnimationFrame(() => {
      if (scrollableTracksAreaRef.current) {
        scrollableTracksAreaRef.current.scrollLeft = 0;
      }
    });
  };


  useEffect(() => {
    const tracksArea = scrollableTracksAreaRef.current;
    const minimap = minimapRef.current;
    const viewport = minimapViewportRef.current;
    if (!tracksArea || !minimap || !viewport || animation.duration === 0) return;

    const updateViewportRect = () => {
      const minimapContainerWidth = MINIMAP_FIXED_WIDTH;
      const mainTimelineVisibleWidth = tracksArea.clientWidth;
      const mainScrollLeft = tracksArea.scrollLeft;

      let viewportWidth = (mainTimelineVisibleWidth / effectivePixelsPerSecond) * (minimapContainerWidth / animation.duration);
      let viewportX = (mainScrollLeft / effectivePixelsPerSecond) * (minimapContainerWidth / animation.duration);

      viewportWidth = Math.max(MINIMAP_VIEWPORT_HANDLE_WIDTH * 2, Math.min(viewportWidth, minimapContainerWidth));
      viewportX = Math.max(0, Math.min(viewportX, minimapContainerWidth - viewportWidth));

      viewport.style.width = `${viewportWidth}px`;
      viewport.style.left = `${viewportX}px`;
    };
    updateViewportRect();
    tracksArea.addEventListener('scroll', updateViewportRect);
    const resizeObserver = new ResizeObserver(updateViewportRect);
    resizeObserver.observe(tracksArea);
    return () => { tracksArea.removeEventListener('scroll', updateViewportRect); resizeObserver.disconnect(); };
  }, [effectivePixelsPerSecond, animation.duration, zoomLevel]);

  const handleMinimapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current || !scrollableTracksAreaRef.current || animation.duration === 0 || draggingDopesheetBarInfo || resizingDopesheetBarInfo || draggingKeyframeInfo || draggingGroupDurationInfo || draggingPropertyGroupInfo) return;
    const minimapContainerRect = minimapRef.current.getBoundingClientRect();
    const clickXInMinimapContainer = e.clientX - minimapContainerRect.left;

    const targetIsViewport = minimapViewportRef.current && minimapViewportRef.current.contains(e.target as Node);
    const targetIsLeftHandle = e.target === minimapViewportRef.current?.querySelector('.minimap-resize-handle-left');
    const targetIsRightHandle = e.target === minimapViewportRef.current?.querySelector('.minimap-resize-handle-right');

    if (targetIsLeftHandle || targetIsRightHandle) {
        setIsResizingMinimapViewport(targetIsLeftHandle ? 'left' : 'right');
        setMinimapViewportResizeStart({ x: e.clientX, initialViewportX: parseFloat(minimapViewportRef.current!.style.left || '0'), initialViewportWidth: parseFloat(minimapViewportRef.current!.style.width || '0'), initialScrollLeft: scrollableTracksAreaRef.current.scrollLeft, initialVisibleWidth: scrollableTracksAreaRef.current.clientWidth });
    } else if (targetIsViewport) {
        setIsDraggingMinimapViewport(true);
        setMinimapViewportDragStart({ x: e.clientX, scrollLeft: scrollableTracksAreaRef.current.scrollLeft });
    } else {
        const minimapContainerWidth = MINIMAP_FIXED_WIDTH;
        const targetTime = (clickXInMinimapContainer / minimapContainerWidth) * animation.duration;
        const mainTimelineVisibleWidth = scrollableTracksAreaRef.current.clientWidth;
        const newScrollLeft = (targetTime * effectivePixelsPerSecond) - (mainTimelineVisibleWidth / 2);
        scrollableTracksAreaRef.current.scrollLeft = Math.max(0, Math.min(newScrollLeft, timelineContentWidth - mainTimelineVisibleWidth));
    }
  };

 useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!scrollableTracksAreaRef.current || !minimapRef.current || !minimapViewportRef.current || animation.duration === 0) return;
      const minimapContainerWidth = MINIMAP_FIXED_WIDTH;
      const mainTimelineVisibleWidth = scrollableTracksAreaRef.current.clientWidth;

      if (isDraggingMinimapViewport) {
        const deltaX = e.clientX - minimapViewportDragStart.x;
        const deltaScroll = (deltaX / minimapContainerWidth) * animation.duration * effectivePixelsPerSecond;
        scrollableTracksAreaRef.current.scrollLeft = Math.max(0, Math.min(minimapViewportDragStart.scrollLeft + deltaScroll, timelineContentWidth - mainTimelineVisibleWidth));
      } else if (isResizingMinimapViewport) {
        const deltaX = e.clientX - minimapViewportResizeStart.x;
        let newViewportX = minimapViewportResizeStart.initialViewportX;
        let newViewportWidth = minimapViewportResizeStart.initialViewportWidth;
        let newZoom = zoomLevel;

        if (isResizingMinimapViewport === 'left') {
            newViewportX = Math.max(0, minimapViewportResizeStart.initialViewportX + deltaX);
            newViewportWidth = Math.max(MINIMAP_VIEWPORT_HANDLE_WIDTH * 2, minimapViewportResizeStart.initialViewportWidth - (newViewportX - minimapViewportResizeStart.initialViewportX));
            newViewportX = Math.min(newViewportX, minimapViewportResizeStart.initialViewportX + minimapViewportResizeStart.initialViewportWidth - MINIMAP_VIEWPORT_HANDLE_WIDTH * 2);

            const newStartTime = (newViewportX / minimapContainerWidth) * animation.duration;
            const currentEndTime = ((minimapViewportResizeStart.initialViewportX + minimapViewportResizeStart.initialViewportWidth) / minimapContainerWidth) * animation.duration;
            const newVisibleDuration = currentEndTime - newStartTime;
            if (newVisibleDuration > 0.01 && mainTimelineVisibleWidth > 0) {
                const newEffectivePPS = mainTimelineVisibleWidth / newVisibleDuration;
                newZoom = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, newEffectivePPS / basePixelsPerSecond));
                setZoomLevel(newZoom);
                requestAnimationFrame(() => {
                  if (scrollableTracksAreaRef.current) {
                    scrollableTracksAreaRef.current.scrollLeft = newStartTime * (basePixelsPerSecond * newZoom);
                  }
                });
            }
        } else { 
            newViewportWidth = Math.max(MINIMAP_VIEWPORT_HANDLE_WIDTH * 2, minimapViewportResizeStart.initialViewportWidth + deltaX);
            newViewportWidth = Math.min(newViewportWidth, minimapContainerWidth - newViewportX);

            const currentStartTime = (newViewportX / minimapContainerWidth) * animation.duration;
            const newVisibleDuration = (newViewportWidth / minimapContainerWidth) * animation.duration;

            if (newVisibleDuration > 0.01 && mainTimelineVisibleWidth > 0) {
                const newEffectivePPS = mainTimelineVisibleWidth / newVisibleDuration;
                newZoom = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, newEffectivePPS / basePixelsPerSecond));
                setZoomLevel(newZoom);
                requestAnimationFrame(() => {
                    if (scrollableTracksAreaRef.current) {
                        scrollableTracksAreaRef.current.scrollLeft = currentStartTime * (basePixelsPerSecond * newZoom);
                    }
                });
            }
        }
      }
    };
    const handleGlobalMouseUp = () => {
      setIsDraggingMinimapViewport(false);
      setIsResizingMinimapViewport(null);
    };
    if (isDraggingMinimapViewport || isResizingMinimapViewport) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
 }, [isDraggingMinimapViewport, isResizingMinimapViewport, minimapViewportDragStart, minimapViewportResizeStart, animation.duration, effectivePixelsPerSecond, timelineContentWidth, zoomLevel, basePixelsPerSecond]);


  const viewModeButtonClass = (isActive: boolean) =>
    `p-1.5 glass-button !rounded-md
     ${isActive
        ? '!bg-[rgba(var(--accent-rgb),0.25)] !text-accent-color !border-accent-color shadow-[var(--highlight-glow)]'
        : 'hover:!bg-[rgba(var(--accent-rgb),0.1)] hover:!border-[var(--glass-highlight-border)]'}`;

  const tracksForMinimap: MinimapTrackDisplayItem[] = timelineViewMode === 'contextual'
    ? animation.tracks
        .filter(t => selectedElementId ? t.elementId === selectedElementId : true)
        .map((animTrack: AnimationTrack): MinimapTrackDisplayItem => ({
            elementId: animTrack.elementId,
            property: animTrack.property,
            keyframes: animTrack.keyframes,
        }))
    : flattenedDopesheetElementsForMinimap.map((el_dope): MinimapTrackDisplayItem => {
        const isSelectedBar = el_dope.id === selectedElementId;
        const isResizingThisBarStart = resizingDopesheetBarInfo?.elementId === el_dope.id && resizingDopesheetBarInfo.handleType === 'start';
        const isResizingThisBarEnd = resizingDopesheetBarInfo?.elementId === el_dope.id && resizingDopesheetBarInfo.handleType === 'end';

        const currentBarMin = isResizingThisBarStart ? resizingDopesheetBarInfo!.currentBarTime : el_dope.minTime;
        const currentBarMax = isResizingThisBarEnd ? resizingDopesheetBarInfo!.currentBarTime : el_dope.maxTime;

        return {
          elementId: el_dope.id,
          property: 'dopesheet-span',
          isSelected: isSelectedBar,
          keyframes: (currentBarMin !== undefined && currentBarMax !== undefined && currentBarMax > currentBarMin)
            ? [{ time: currentBarMin, value: 0, easing: DEFAULT_KEYFRAME_EASING }, { time: currentBarMax, value: 0, easing: DEFAULT_KEYFRAME_EASING }]
            : [],
          order: el_dope.order,
          level: el_dope.level,
        };
      });


  const renderDopesheetRowLeftPart = (el: DopesheetElementNode): React.ReactNode => {
    const isSelectedRow = el.id === selectedElementId;
    const isGroup = el.type === 'group';
    const isExpanded = isGroup && expandedGroupIds.has(el.id);
    const indentStyle = { paddingLeft: `${el.level * DOPESHEET_INDENT_WIDTH + (isGroup ? 4 : 20)}px` };

    return (
        <div
            key={`${el.id}-left`}
            style={{ ...indentStyle, height: `${TIMELINE_GROUP_ROW_HEIGHT}px` }}
            className={`flex items-center px-2 border-b border-[var(--glass-border-color)] cursor-pointer transition-colors group/dopesheet-row
                        ${isSelectedRow ? 'bg-[rgba(var(--accent-rgb),0.1)] text-accent-color' : 'bg-transparent hover:bg-[rgba(var(--accent-rgb),0.03)]'}`}
            title={`Layer: ${String(el.name || el.id)}. Click to select. Double click to edit keyframes.`}
            onClick={() => {
                dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: el.id });
                dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });
            }}
            onDoubleClick={() => handleDopesheetBarDoubleClick(el.id)}
            role="button" tabIndex={0} aria-label={`Layer: ${String(el.name || el.id)}`} aria-selected={isSelectedRow}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDopesheetBarDoubleClick(el.id); }}
        >
            <div className={`flex items-center text-xs ${isSelectedRow ? 'text-accent-color' : 'text-text-primary group-hover/dopesheet-row:text-text-primary'}`}>
            {isGroup && (
                <button
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_GROUP_EXPANSION', payload: el.id }); }}
                className="mr-1 p-0.5 rounded hover:bg-[rgba(var(--accent-rgb),0.1)] flex items-center"
                aria-label={isExpanded ? `Collapse ${el.name}` : `Expand ${el.name}`}
                >
                {isExpanded ? <ChevronDownIconSolid size={14} /> : <ChevronRightIcon size={14} />}
                </button>
            )}
            <span className="truncate" title={String(el.name || el.id)}>{String(el.name || el.id)}</span>
            </div>
        </div>
    );
  };

  const renderDopesheetRowRightPart = (el: DopesheetElementNode): React.ReactNode => {
    const isSelectedRow = el.id === selectedElementId;
    const isBeingDragged = draggingDopesheetBarInfo?.elementId === el.id;
    const isBeingResized = resizingDopesheetBarInfo?.elementId === el.id;
    let barMinTime = el.minTime;
    let barMaxTime = el.maxTime;

    if (isBeingDragged) {
      barMinTime = draggingDopesheetBarInfo!.currentBarLeftTime;
      barMaxTime = barMinTime + draggingDopesheetBarInfo!.clipDuration;
    } else if (isBeingResized) {
      if (resizingDopesheetBarInfo!.handleType === 'start') barMinTime = resizingDopesheetBarInfo!.currentBarTime;
      else barMaxTime = resizingDopesheetBarInfo!.currentBarTime;
    }

    const barLeftPx = (barMinTime ?? 0) * effectivePixelsPerSecond;
    const barWidthPx = (barMinTime !== undefined && barMaxTime !== undefined && barMaxTime > barMinTime)
                      ? Math.max(MIN_CLIP_DURATION_SECONDS * effectivePixelsPerSecond, (barMaxTime - barMinTime) * effectivePixelsPerSecond)
                      : 0;

    let barContainerBgClass = 'bg-transparent';
    if (isSelectedRow) barContainerBgClass = 'bg-[rgba(var(--accent-rgb),0.1)]';
    else barContainerBgClass = 'hover:bg-[rgba(var(--accent-rgb),0.03)]';


    let barItselfBgClass = isSelectedRow ? 'bg-[rgba(var(--accent-rgb),0.2)]' : 'bg-[var(--dark-bg-tertiary)] opacity-70';
    let barItselfBorderClass = isSelectedRow ? 'border-accent-color' : 'border-[var(--glass-border-color)]';
    if (isBeingDragged || isBeingResized) {
        barItselfBgClass = isSelectedRow ? 'bg-[rgba(var(--accent-rgb),0.3)]' : 'bg-[rgba(var(--accent-rgb),0.1)] opacity-90';
        barItselfBorderClass = 'border-accent-color opacity-80';
    }
    const barHeightStyle = ANIMATION_BAR_HEIGHT; 
    
    const hasKeyframes = el.minTime !== undefined && el.maxTime !== undefined && el.maxTime > el.minTime;
    const duration = hasKeyframes ? (barMaxTime! - barMinTime!).toFixed(1) + "s" : "";
    const showDurationText = barWidthPx > DOPESHEET_DURATION_TEXT_MIN_BAR_WIDTH;
    const allowDurationEdit = barWidthPx > DOPESHEET_DURATION_INPUT_MIN_BAR_WIDTH;
    const isEditingThisDuration = editingDopesheetDurationInfo?.elementId === el.id;


    return (
        <div key={`${el.id}-right`} style={{ height: `${TIMELINE_GROUP_ROW_HEIGHT}px` }}
             className={`relative border-b border-[var(--glass-border-color)] flex items-center group/dopesheet-row ${barContainerBgClass} transition-colors`}
             onClick={(e) => {
                if (editingDopesheetDurationInfo?.elementId === el.id && dopesheetDurationInputRef.current && e.target !== dopesheetDurationInputRef.current) {
                    commitDopesheetDurationChange();
                } else if (!editingDopesheetDurationInfo) {
                    dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: el.id });
                    dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: null });
                }
             }}
             onDoubleClick={(e) => { if(!isEditingThisDuration) handleDopesheetBarDoubleClick(el.id);}}
        >
            {hasKeyframes && barWidthPx > 0 && (
            <div
                className={`absolute rounded-sm shadow-sm flex items-center 
                            ${barItselfBgClass} ${barItselfBorderClass}
                            ${isBeingDragged ? 'opacity-75 z-40 cursor-grabbing' : (isBeingResized ? 'opacity-75 z-40 cursor-ew-resize' : (isSelectedRow ? 'group-hover/dopesheet-row:bg-[rgba(var(--accent-rgb),0.25)]' : 'group-hover/dopesheet-row:bg-[rgba(var(--accent-rgb),0.05)]') + ' cursor-grab')}`}
                style={{ left: `${barLeftPx}px`, width: `${barWidthPx}px`, height: `${barHeightStyle}px`, top: '50%', transform: 'translateY(-50%)' }}
                onMouseDown={(e) => { if (hasKeyframes && !isEditingThisDuration) handleDopesheetBarMouseDown(e, el.id, el.minTime!, el.maxTime!);}}
                title={`Animation for ${String(el.name || el.id)}: ${barMinTime?.toFixed(2)}s - ${barMaxTime?.toFixed(2)}s. Click duration to edit.`}
                role="button" tabIndex={0} aria-label={`Animation clip for ${String(el.name || el.id)}`} aria-selected={isSelectedRow}
            >
                <div style={{position: 'sticky', left: STICKY_TEXT_LEFT_OFFSET, zIndex: STICKY_TEXT_Z_INDEX}} 
                     className="flex items-center h-full bg-[var(--dark-bg-tertiary)] px-1 rounded-sm">
                    {isEditingThisDuration ? (
                        <input
                            ref={dopesheetDurationInputRef}
                            type="text"
                            value={dopesheetDurationInputValue}
                            onChange={(e) => setDopesheetDurationInputValue(e.target.value)}
                            onBlur={commitDopesheetDurationChange}
                            onKeyDown={handleDopesheetDurationInputKeyDown}
                            onClick={(e) => e.stopPropagation()} 
                            className={`w-12 text-left bg-[var(--dark-bg-primary)] ${DURATION_TEXT_FONT_SIZE_CLASS} text-accent-color border border-accent-color rounded p-0.5 outline-none focus:ring-1 focus:ring-accent-color`}
                            style={{ height: 'calc(100% - 4px)', margin: '2px 0' }}
                        />
                    ) : (showDurationText && (
                        <span
                            className={`${DURATION_TEXT_FONT_SIZE_CLASS} text-text-secondary group-hover/dopesheet-row:text-text-primary select-none pointer-events-auto`}
                            onClick={(e) => { if (allowDurationEdit && hasKeyframes) handleDopesheetDurationTextClick(e, el.id, el.minTime!, el.maxTime!); }}
                            role="button" tabIndex={allowDurationEdit ? 0 : -1}
                            onKeyDown={(e) => { 
                                if (allowDurationEdit && hasKeyframes && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    if (editingDopesheetDurationInfo?.elementId === el.id || resizingDopesheetBarInfo || draggingDopesheetBarInfo) return;
                                    setEditingDopesheetDurationInfo({ elementId: el.id, originalMinTime: el.minTime!, originalMaxTime: el.maxTime! });
                                    setDopesheetDurationInputValue((el.maxTime! - el.minTime!).toFixed(1) + "s");
                                }
                            }}
                        >
                            {duration}
                        </span>
                    ))}
                </div>
                <div
                    className="absolute left-0 top-0 h-full bg-[rgba(var(--accent-rgb),0.2)] hover:bg-[rgba(var(--accent-rgb),0.3)] cursor-ew-resize z-30 flex items-center justify-center" 
                    style={{width: `${DOPESHEET_BAR_RESIZE_HANDLE_WIDTH}px`}}
                    onMouseDown={(e) => (el.minTime !== undefined && el.maxTime !== undefined) && handleDopesheetResizeHandleMouseDown(e, el.id, 'start', el.minTime, el.maxTime)}
                    title={`Resize start of ${String(el.name || el.id)} clip`} role="slider" tabIndex={0} aria-label={`Resize start of ${String(el.name || el.id)} clip`}
                    aria-valuemin={0} aria-valuenow={barMinTime} aria-valuemax={barMaxTime ? barMaxTime - MIN_CLIP_DURATION_SECONDS : animation.duration}
                >
                    <GripVerticalIcon size={10} className="text-text-secondary pointer-events-none opacity-70 group-hover:opacity-100" />
                </div>
                <div
                    className="absolute right-0 top-0 h-full bg-[rgba(var(--accent-rgb),0.2)] hover:bg-[rgba(var(--accent-rgb),0.3)] cursor-ew-resize z-30 flex items-center justify-center" 
                    style={{width: `${DOPESHEET_BAR_RESIZE_HANDLE_WIDTH}px`}}
                    onMouseDown={(e) => (el.minTime !== undefined && el.maxTime !== undefined) && handleDopesheetResizeHandleMouseDown(e, el.id, 'end', el.minTime, el.maxTime)}
                    title={`Resize end of ${String(el.name || el.id)} clip`} role="slider" tabIndex={0} aria-label={`Resize end of ${String(el.name || el.id)} clip`}
                    aria-valuemin={barMinTime ? barMinTime + MIN_CLIP_DURATION_SECONDS : MIN_CLIP_DURATION_SECONDS} aria-valuenow={barMaxTime} aria-valuemax={animation.duration}
                >
                     <GripVerticalIcon size={10} className="text-text-secondary pointer-events-none opacity-70 group-hover:opacity-100" />
                </div>
            </div>
            )}
        </div>
    );
  };

  const renderDopesheetHierarchySide = (
    nodes: DopesheetElementNode[],
    renderPartFunc: (el: DopesheetElementNode) => React.ReactNode
  ): React.ReactNode[] => {
    const renderedRows: React.ReactNode[] = [];
    nodes.forEach(el => {
      renderedRows.push(renderPartFunc(el));
      if (el.type === 'group' && expandedGroupIds.has(el.id) && el.children.length > 0) {
        renderedRows.push(...renderDopesheetHierarchySide(el.children, renderPartFunc));
      }
    });
    return renderedRows;
  };

  const isSpeedPresetSelected = PLAYBACK_SPEED_PRESETS.some(p => p.value === playbackSpeed);

  const loopOptions: { id: LoopMode; label: string; icon: React.ReactNode }[] = [
    { id: 'once', label: 'Play Once', icon: <PlayOnceIcon size={16} /> },
    { id: 'repeat', label: 'Repeat', icon: <RepeatIcon size={16} /> },
    { id: 'ping-pong', label: 'Ping-Pong', icon: <ChevronUpDownIcon size={16} /> },
  ];
  const currentLoopOption = loopOptions.find(opt => opt.id === loopMode) || loopOptions[0];

  return (
    <div style={{ height: `${height}px` }} className="glass-panel flex flex-col select-none p-0">
      <div
        style={{ height: `${TOP_CONTROLS_BAR_HEIGHT}px` }}
        className="flex items-center justify-between bg-[var(--dark-bg-secondary)] border-b border-[var(--glass-border-color)] shadow-sm text-sm p-2 rounded-t-[var(--border-radius-main)]"
      >
        <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
                <button onClick={() => dispatch({ type: 'SET_TIMELINE_VIEW_MODE', payload: 'dopesheet'})} className={viewModeButtonClass(timelineViewMode === 'dopesheet')} title="Dopesheet View">
                    <ListTreeIcon size={18} />
                </button>
                <button onClick={() => dispatch({ type: 'SET_TIMELINE_VIEW_MODE', payload: 'contextual'})} className={viewModeButtonClass(timelineViewMode === 'contextual')} title="Keyframes View (Contextual)">
                    <SplineIcon size={18} />
                </button>
            </div>
            <div className="h-5 border-l border-[var(--glass-border-color)] opacity-50 mx-2"></div>
            {/* New Auto-Keyframe Switch */}
            <div className="flex items-center space-x-2">
                <label htmlFor="auto-keyframe-toggle" className="text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors" title="Automatically create a keyframe when a property is changed.">
                    Auto-Keyframe
                </label>
                <button
                    id="auto-keyframe-toggle"
                    onClick={() => dispatch({ type: 'TOGGLE_AUTO_KEYFRAMING' })}
                    className={`relative inline-flex items-center h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2 focus:ring-offset-[var(--dark-bg-secondary)] 
                        ${isAutoKeyframing 
                            ? 'bg-[var(--glass-border-color)] border-b border-[var(--glass-border-color)] shadow-[0_0_10px_1px_rgba(var(--accent-rgb),0.7)]' 
                            : 'bg-gray-600 border-gray-500'}`}
                    role="switch"
                    aria-checked={isAutoKeyframing}
                >
                    <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full 
                        ${isAutoKeyframing ?'bg-[var(--accent-color)]'
                        :'bg-gray-200'} shadow-lg ring-0 transition duration-200 ease-in-out ${isAutoKeyframing ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                </button>
            </div>
            <div className="h-5 border-l border-[var(--glass-border-color)] opacity-50 ml-2"></div>
            {/* Duration Control */}
            <div style={{ background: 'var(--dark-bg-secondary)' }} className="flex items-center space-x-1 p-1 rounded-md">
                <label htmlFor="durationInput" className="text-text-secondary text-xs whitespace-nowrap">Duration:</label>
                <input
                    id="durationInput"
                    ref={durationInputRef}
                    type="text"
                    value={formattedDurationInput}
                    onChange={handleDurationInputChange}
                    onBlur={handleDurationInputCommit}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleDurationInputCommit(); (e.target as HTMLInputElement).blur(); }}}
                    className="w-28 p-1.5 glass-input text-xs font-mono" 
                    placeholder="HH:MM:SS.ms"
                />
                 <div className="flex flex-col -space-y-0.5">
                    <button onMouseDown={(e) => handleValueAdjustChevronMouseDown(e, 'up', 'duration')} onClick={() => handleValueAdjustClick('up', 'duration')} className="p-0.5 text-text-secondary hover:text-accent-color focus:outline-none"><ChevronUpIcon size={12}/></button>
                    <button onMouseDown={(e) => handleValueAdjustChevronMouseDown(e, 'down', 'duration')} onClick={() => handleValueAdjustClick('down', 'duration')} className="p-0.5 text-text-secondary hover:text-accent-color focus:outline-none"><ChevronDownIcon size={12}/></button>
                 </div>
            </div>
             {/* Speed Control */}
            <div className="h-5 border-l border-[var(--glass-border-color)] opacity-50 ml-1"></div>
            <div style={{ background: 'var(--dark-bg-secondary)' }} className="flex items-center space-x-1 p-1 rounded-md">
                <label htmlFor="speedInput" className="text-text-secondary text-xs whitespace-nowrap">Speed:</label>
                <div className="relative" onDoubleClick={handleSpeedInputDoubleClick}>
                    <input
                        id="speedInput"
                        ref={speedInputRef}
                        type="text"
                        value={formattedSpeedInput}
                        onChange={handleSpeedInputChange}
                        onBlur={handleSpeedInputCommit}
                        onKeyDown={handleSpeedInputKeyDown}
                        className={`${SPEED_INPUT_WIDTH_CLASS} p-1.5 glass-input text-xs font-mono ${isEditingSpeedInput ? '' : 'pointer-events-none'}`}
                        placeholder="e.g. 1.0x"
                        readOnly={!isEditingSpeedInput}
                    />
                    <select
                        value={isSpeedPresetSelected ? playbackSpeed : ""}
                        onChange={(e) => {
                            const newSpeed = parseFloat(e.target.value);
                            if (!isNaN(newSpeed)) {
                                dispatch({ type: 'SET_PLAYBACK_SPEED', payload: newSpeed });
                                setIsEditingSpeedInput(false);
                            }
                        }}
                        className="absolute inset-0 h-full w-full !bg-transparent !border-none !text-transparent appearance-none cursor-pointer"
                        aria-label="Select playback speed preset"
                        tabIndex={isEditingSpeedInput ? -1 : 0}
                    >
                        {!isSpeedPresetSelected && <option value="" disabled>{formattedSpeedInput}</option>}
                        {PLAYBACK_SPEED_PRESETS.map(preset => (
                            <option key={preset.value} value={preset.value}>{preset.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col -space-y-0.5">
                    <button onMouseDown={(e) => handleValueAdjustChevronMouseDown(e, 'up', 'speed')} onClick={() => handleValueAdjustClick('up', 'speed')} className="p-0.5 text-text-secondary hover:text-accent-color focus:outline-none"><ChevronUpIcon size={12}/></button>
                    <button onMouseDown={(e) => handleValueAdjustChevronMouseDown(e, 'down', 'speed')} onClick={() => handleValueAdjustClick('down', 'speed')} className="p-0.5 text-text-secondary hover:text-accent-color focus:outline-none"><ChevronDownIcon size={12}/></button>
                 </div>
            </div>
        </div>
        
        <div className="flex items-center justify-center space-x-1.5">
            {playbackControlsSlot}
            <div className="h-5 border-l border-[var(--glass-border-color)] opacity-50 ml-1"></div>
            <div className="relative z-40" ref={loopMenuRef}>
              <button onClick={() => setIsLoopMenuOpen(prev => !prev)} className="p-1.5 glass-button !rounded-md" title={`Loop mode: ${currentLoopOption.label}`}>
                {currentLoopOption.icon}
              </button>
              {isLoopMenuOpen && (
                <div className="absolute bottom-full mb-2 right-0 bg-dark-bg-tertiary border border-[var(--glass-border-color)] rounded-lg shadow-xl w-40 z-50">
                  <ul className="py-1">
                    {loopOptions.map(opt => (
                      <li key={opt.id}>
                        <button
                          onClick={() => {
                            dispatch({ type: 'SET_LOOP_MODE', payload: opt.id });
                            setIsLoopMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-2 px-3 py-2 text-left text-sm hover:bg-[rgba(var(--accent-rgb),0.15)] transition-colors ${loopMode === opt.id ? 'text-accent-color' : 'text-text-primary'}`}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
        </div>

        <div className="flex items-center space-x-1.5">
            <button onClick={() => handleZoom('out')} title="Zoom Out (-)" className="p-1.5 glass-button !rounded-md"><ZoomOutIcon size={16}/></button>
            <div
                ref={minimapRef}
                onMouseDown={handleMinimapMouseDown}
                className="bg-[var(--dark-bg-tertiary)] border border-[var(--glass-border-color)] rounded-md relative cursor-pointer flex-shrink-0 overflow-hidden"
                style={{ width: `${MINIMAP_FIXED_WIDTH}px`, height: `${MINIMAP_HEIGHT}px` }}
            >
                <div className="w-full h-full relative">
                   {tracksForMinimap.map((trackItem, index) => {
                        const keyframesToRender = trackItem.keyframes;
                        const minimapScaleFactor = MINIMAP_FIXED_WIDTH / animation.duration;

                        if (timelineViewMode === 'dopesheet') {
                            if (keyframesToRender.length === 2 && keyframesToRender[0].time !== undefined && keyframesToRender[1].time !== undefined) {
                                const indentPx = (trackItem.level || 0) * MINIMAP_DOPESHEET_INDENT_WIDTH;
                                const barLeft = keyframesToRender[0].time * minimapScaleFactor + indentPx;
                                let barWidth = (keyframesToRender[1].time - keyframesToRender[0].time) * minimapScaleFactor;
                                barWidth = Math.max(1, barWidth);

                                const barTop = index * (MINIMAP_DOPESHEET_BAR_HEIGHT + MINIMAP_DOPESHEET_BAR_GAP);
                                if (barTop + MINIMAP_DOPESHEET_BAR_HEIGHT > MINIMAP_HEIGHT) return null;

                                let barColorClass = trackItem.isSelected ? 'bg-[rgba(var(--accent-rgb),0.8)]' : 'bg-[rgba(var(--accent-rgb),0.4)]';

                                return (
                                    <div key={`${trackItem.elementId}-dopesheet-minimap-${index}`}
                                         className={`absolute rounded-sm ${barColorClass}`}
                                         style={{ left: `${barLeft}px`, width: `${barWidth}px`, top: `${barTop}px`, height: `${MINIMAP_DOPESHEET_BAR_HEIGHT}px` }}
                                    />
                                );
                            }
                            return null;
                        } else { 
                            return (keyframesToRender.length > 1 ? keyframesToRender : [])
                            .slice(0, -1).map((keyframeItem: Keyframe, kfIdx: number, arr: Keyframe[]) => {
                                const nextKeyframeItem = arr[kfIdx + 1];
                                if (!nextKeyframeItem || keyframeItem.time === undefined || nextKeyframeItem.time === undefined) return null;
                                const segmentLeft = keyframeItem.time * minimapScaleFactor;
                                const segmentWidth = (nextKeyframeItem.time - keyframeItem.time) * minimapScaleFactor;
                                let segmentBgColor = 'bg-[rgba(var(--accent-rgb),0.8)]'; 
                                if (segmentWidth <= 0) return null;
                                return (
                                    <div key={`${trackItem.elementId}-${trackItem.property}-${keyframeItem.time}-minimap`}
                                         className={`absolute ${MINIMAP_KEYFRAME_SEGMENT_HEIGHT} ${segmentBgColor} rounded-sm top-1/2 -translate-y-1/2`}
                                         style={{ left: `${segmentLeft}px`, width: `${Math.max(1,segmentWidth)}px` }}
                                    />
                                );
                            })
                        }
                    })}
                </div>
                <div
                    ref={minimapViewportRef}
                    className="absolute top-0 h-full bg-[rgba(var(--accent-rgb),0.3)] border-x border-accent-color opacity-70 cursor-grab active:cursor-grabbing flex justify-between items-center"
                    style={{ borderWidth: '1px'}}
                >
                    <div className="minimap-resize-handle-left absolute left-0 top-0 h-full bg-accent-color/40 hover:bg-accent-color/60 cursor-ew-resize" style={{width: `${MINIMAP_VIEWPORT_HANDLE_WIDTH}px`}}></div>
                    <div className="minimap-resize-handle-right absolute right-0 top-0 h-full bg-accent-color/40 hover:bg-accent-color/60 cursor-ew-resize" style={{width: `${MINIMAP_VIEWPORT_HANDLE_WIDTH}px`}}></div>
                </div>
            </div>
            <button onClick={() => handleZoom('in')} title="Zoom In (+)" className="p-1.5 glass-button !rounded-md"><ZoomInIcon size={16}/></button>
            <button onClick={handleFitToScreen} title="Fit to Screen" className="p-1.5 glass-button !rounded-md ml-1"><MaximizeIcon size={16}/></button>
            <div className="h-5 border-l border-[var(--glass-border-color)] opacity-50"></div>
            <span className="text-text-secondary text-xs select-none whitespace-nowrap">Time: {currentTime.toFixed(2)}s</span>
        </div>
      </div>


      <div className="flex flex-1 overflow-hidden">
        <div style={{ width: `${TIMELINE_PROPERTIES_PANE_WIDTH}px` }} className="bg-[var(--dark-bg-secondary)] border-r border-[var(--glass-border-color)] flex flex-col flex-shrink-0">
          <div style={{ height: `${TIMELINE_RULER_HEIGHT}px`, padding: '0 8px' }} className="flex-shrink-0 flex items-center border-b border-[var(--glass-border-color)] text-xs truncate">
            {timelineViewMode === 'contextual' ? (
              selectedElement ? (<span className="text-text-primary font-semibold truncate" title={String(selectedElement.name || selectedElement.id)}>{String(selectedElement.name || selectedElement.id)}</span>)
              : selectedElementId === artboard.id ? (<span className="text-text-primary font-semibold truncate" title={`Artboard: ${artboard.name}`}>Artboard: {artboard.name}</span>)
              : (<span className="text-text-placeholder">No Element Selected</span>)
            ) : (
              <span className="text-text-primary font-semibold">Dopesheet - Layers</span>
            )}
          </div>
          <div ref={propertiesPaneRef} style={{ height: `${scrollableAreaEffectiveHeight}px` }} className="overflow-y-auto custom-scrollbar bg-transparent" onScroll={() => handleVerticalScroll('left')}>
            {timelineViewMode === 'contextual' && (
              <>
                {!selectedElement && (<div className="p-4 text-xs text-text-placeholder text-center flex items-center justify-center h-full">Select an element.</div>)}
                {selectedElement && propertyGroupsForSelectedElement.map(group => {
                    const isGroupExpanded = expandedTimelinePropertyGroups.has(group.key); const relevantPropertiesInGroup = group.properties.filter(prop => getElementAnimatableProperties(selectedElement.type).includes(prop));
                    if (relevantPropertiesInGroup.length === 0) return null;
                    return (
                        <React.Fragment key={group.key}>
                            <button onClick={() => togglePropertyGroupExpansion(group.key)} className="w-full flex items-center justify-between px-2 text-xs font-medium text-text-primary hover:bg-[rgba(var(--accent-rgb),0.04)] focus:outline-none focus:bg-[rgba(var(--accent-rgb),0.05)] border-b border-[var(--glass-border-color)]" aria-expanded={isGroupExpanded} style={{ height: `${TIMELINE_GROUP_ROW_HEIGHT}px`}}>
                                <span>{group.label}</span><ChevronUpDownIcon size={16} className={`transform transition-transform duration-150 ${isGroupExpanded ? 'rotate-180 text-accent-color' : 'text-text-secondary'}`} />
                            </button>
                            {isGroupExpanded && relevantPropertiesInGroup.map(prop => {
                                const track = relevantTracks.find(t => t.property === prop); const keyframeExistsAtCurrentTime = track?.keyframes.some(kf => Math.abs(kf.time - currentTime) < 0.001);
                                let isControlled = false; let controlReason = '';
                                if (selectedElement.motionPathId) { if (prop === 'x' || prop === 'y') {isControlled = true; controlReason = 'Controlled by Motion Path';} else if (prop === 'rotation' && selectedElement.alignToPath) {isControlled = true; controlReason = 'Controlled by Align to Path';}}
                                const addTrackButtonDisabled = isControlled; const addKeyframeButtonDisabled = isControlled || (keyframeExistsAtCurrentTime && !isControlled);
                                let addKeyframeButtonTitle = `Add keyframe for ${prop} at ${currentTime.toFixed(2)}s`; let addKeyframeButtonClasses = 'bg-[rgba(var(--accent-rgb),0.15)] hover:bg-[rgba(var(--accent-rgb),0.25)] text-accent-color opacity-0 group-hover:opacity-100';
                                if (isControlled) { addKeyframeButtonTitle = controlReason; addKeyframeButtonClasses = 'bg-gray-600 cursor-not-allowed opacity-50 group-hover:opacity-60'; } else if (keyframeExistsAtCurrentTime) { addKeyframeButtonTitle = `Keyframe already exists at ${currentTime.toFixed(2)}s`; addKeyframeButtonClasses = 'bg-yellow-500/70 cursor-not-allowed opacity-70 group-hover:opacity-80'; }
                                return (
                                    <div key={prop} style={{ height: `${TIMELINE_PROPERTY_ROW_HEIGHT}px` }} className="pl-4 pr-1 text-xs text-text-secondary bg-transparent group flex items-center justify-between border-b border-[var(--glass-border-color)]">
                                        <span className="truncate" title={prop}>{prop}</span>
                                        {!track && (<button onClick={(e) => { e.stopPropagation(); handleAddTrackOrKeyframe(prop, false); }} title={addTrackButtonDisabled ? controlReason : `Add track for ${prop}`} className={`ml-1 p-0.5 rounded text-text-primary opacity-0 group-hover:opacity-100 transition-opacity ${addTrackButtonDisabled ? 'bg-gray-600 cursor-not-allowed !opacity-50' : 'bg-[rgba(var(--accent-rgb),0.15)] hover:bg-[rgba(var(--accent-rgb),0.25)] text-accent-color'}`} aria-label={`Add track for ${prop}`} disabled={addTrackButtonDisabled}> <PlusIcon size={12}/> </button> )}
                                        {track && ( <button onClick={(e) => { e.stopPropagation(); handleAddTrackOrKeyframe(prop, true); }} title={addKeyframeButtonTitle} className={`ml-1 p-0.5 rounded text-text-primary transition-opacity ${addKeyframeButtonClasses}`} aria-label={`Add keyframe for ${prop} at current time`} disabled={addKeyframeButtonDisabled}><AddKeyframeToTrackIcon size={12} /></button>)}
                                    </div>);
                            })}
                        </React.Fragment>);
                })}
              </>
            )}
            {timelineViewMode === 'dopesheet' && renderDopesheetHierarchySide(dopesheetTree, renderDopesheetRowLeftPart)}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden" onClick={handleTrackAreaClick}>
           <div style={{ width: '100%', height: `${TIMELINE_RULER_HEIGHT}px`, overflowX: 'hidden', overflowY: 'hidden' }} className="relative bg-[var(--dark-bg-secondary)] border-b border-[var(--glass-border-color)] cursor-grab flex-shrink-0" onMouseDown={handleRulerMouseDown}>
                <div ref={rulerMarkersContainerRef} style={{ width: `${timelineContentWidth}px`, position: 'relative', height: '100%' }}>
                    {renderRulerMarkers()}
                </div>
            </div>
            <div ref={scrollableTracksAreaRef} className="overflow-auto custom-scrollbar bg-[var(--dark-bg-secondary)]"
                style={{ height: `${scrollableAreaEffectiveHeight}px`, cursor: (draggingPropertyGroupInfo ? 'grabbing' : (draggingDopesheetBarInfo ? 'grabbing' : (resizingDopesheetBarInfo ? 'ew-resize' : 'default'))) }}
                onScroll={(e) => { handleVerticalScroll('right'); handleHorizontalScrollSync(e); }}
            >
                 <div className="relative" style={{ width: `${timelineContentWidth}px`, minHeight: '100%' }}>
                    {timelineViewMode === 'contextual' && selectedElement && propertyGroupsForSelectedElement.map(group => {
                        const isGroupExpanded = expandedTimelinePropertyGroups.has(group.key); const relevantPropertiesInGroup = group.properties.filter(prop => getElementAnimatableProperties(selectedElement.type).includes(prop)); if (relevantPropertiesInGroup.length === 0) return null;
                        const groupKeyframes = relevantPropertiesInGroup.flatMap(prop => relevantTracks.find(t => t.property === prop)?.keyframes || []);
                        
                        let groupInitialEarliestTime = Infinity, groupLatestTime = -Infinity;
                        if (groupKeyframes.length > 0) {
                            groupInitialEarliestTime = Math.min(...groupKeyframes.map(kf => kf.time));
                            groupLatestTime = Math.max(...groupKeyframes.map(kf => kf.time));
                        } else {
                            groupInitialEarliestTime = -1; groupLatestTime = -1; 
                        }
                        
                        const isDraggingThisPropertyGroup = draggingPropertyGroupInfo?.elementId === selectedElementId &&
                                                            draggingPropertyGroupInfo?.propertiesToShift.every(p => group.properties.includes(p)) &&
                                                            draggingPropertyGroupInfo?.propertiesToShift.length === group.properties.length;
                        
                        let displayGroupStartTime = groupInitialEarliestTime;
                        let displayGroupSpan = (groupInitialEarliestTime !== -1 && groupLatestTime > groupInitialEarliestTime) ? (groupLatestTime - groupInitialEarliestTime) : 0;
                        
                        if (isDraggingThisPropertyGroup && draggingPropertyGroupInfo) {
                            displayGroupStartTime = draggingPropertyGroupInfo.currentBarLeftTime;
                            displayGroupSpan = draggingPropertyGroupInfo.groupKeyframeSpan;
                        }
                        
                        const barVisible = displayGroupStartTime !== -1 && displayGroupSpan >= 0;
                        const isDraggingThisGroupDuration = draggingGroupDurationInfo?.elementId === selectedElementId && draggingGroupDurationInfo?.groupKey === group.key;
                        let finalBarLeft = displayGroupStartTime * effectivePixelsPerSecond;
                        let finalBarWidth = displayGroupSpan * effectivePixelsPerSecond;

                        if(isDraggingThisGroupDuration && currentDraggingGroupTimespan) {
                            finalBarLeft = currentDraggingGroupTimespan.start * effectivePixelsPerSecond;
                            finalBarWidth = (currentDraggingGroupTimespan.end - currentDraggingGroupTimespan.start) * effectivePixelsPerSecond;
                        }

                        const isEditingThisGroupDuration = editingContextualGroupDurationInfo?.elementId === selectedElement.id && editingContextualGroupDurationInfo?.groupKey === group.key;
                        const showGroupDurationText = barVisible && finalBarWidth > CONTEXTUAL_GROUP_DURATION_TEXT_MIN_BAR_WIDTH;
                        const allowGroupDurationEdit = barVisible && finalBarWidth > CONTEXTUAL_GROUP_DURATION_INPUT_MIN_BAR_WIDTH;
                        const groupDurationDisplay = barVisible ? displayGroupSpan.toFixed(1) + "s" : "";

                        return (
                            <React.Fragment key={`${group.key}-tracks-fragment`}>
                                <div style={{ height: `${TIMELINE_GROUP_ROW_HEIGHT}px`}} className={`relative border-b border-[var(--glass-border-color)] flex items-center bg-transparent ${barVisible && !isDraggingThisGroupDuration ? (isDraggingThisPropertyGroup ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                                  onMouseDown={(e) => { if (barVisible && !isDraggingThisGroupDuration && selectedElementId && !isEditingThisGroupDuration) handlePropertyGroupBarMouseDown(e, selectedElementId, group.properties, groupInitialEarliestTime);}}
                                >
                                    {barVisible && (
                                      <div className={`absolute h-[70%] bg-[rgba(var(--accent-rgb),0.08)] rounded hover:bg-[rgba(var(--accent-rgb),0.12)] transition-colors border border-[var(--glass-border-color)] flex items-center ${isDraggingThisPropertyGroup ? 'bg-[rgba(var(--accent-rgb),0.15)]' : ''}`} 
                                           style={{ left: `${finalBarLeft}px`, width: `${Math.max(MIN_CLIP_DURATION_SECONDS * effectivePixelsPerSecond, finalBarWidth)}px`, top: '50%', transform: 'translateY(-50%)' }} 
                                           title={`Drag to shift ${group.label} keyframes, Use handles to scale.`}>
                                          
                                          <div style={{position: 'sticky', left: STICKY_TEXT_LEFT_OFFSET, zIndex: STICKY_TEXT_Z_INDEX}} 
                                              className="flex items-center h-full bg-[var(--dark-bg-tertiary)] px-1 rounded-sm">
                                            {isEditingThisGroupDuration ? (
                                                <input
                                                    ref={contextualGroupDurationInputRef}
                                                    type="text"
                                                    value={contextualGroupDurationInputValue}
                                                    onChange={(e) => setContextualGroupDurationInputValue(e.target.value)}
                                                    onBlur={commitContextualGroupDurationChange}
                                                    onKeyDown={handleContextualGroupDurationInputKeyDown}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`w-12 text-left bg-[var(--dark-bg-primary)] ${DURATION_TEXT_FONT_SIZE_CLASS} text-accent-color border border-accent-color rounded p-0.5 outline-none focus:ring-1 focus:ring-accent-color`}
                                                    style={{ height: 'calc(100% - 4px)', margin: '2px 0' }}
                                                />
                                            ) : (showGroupDurationText && (
                                                <span
                                                    className={`${DURATION_TEXT_FONT_SIZE_CLASS} text-text-secondary group-hover:text-text-primary select-none pointer-events-auto`}
                                                    onClick={(e) => { if (allowGroupDurationEdit) handleContextualGroupDurationTextClick(e, selectedElement.id, group.key, group.properties, displayGroupStartTime, displayGroupStartTime + displayGroupSpan); }}
                                                >
                                                    {groupDurationDisplay}
                                                </span>
                                            ))}
                                          </div>

                                          <div className="absolute left-0 top-0 h-full cursor-ew-resize flex items-center justify-center opacity-50 hover:opacity-100 z-[26]" style={{width: `${GROUP_DURATION_HANDLE_WIDTH}px`}} onMouseDown={(e) => handleGroupDurationHandleMouseDown(e, group.key, relevantPropertiesInGroup, 'start', {start: groupInitialEarliestTime, end: groupLatestTime})}><GripVerticalIcon size={10} className="text-text-secondary pointer-events-none"/></div>
                                          <div className="absolute right-0 top-0 h-full cursor-ew-resize flex items-center justify-center opacity-50 hover:opacity-100 z-[26]" style={{width: `${GROUP_DURATION_HANDLE_WIDTH}px`}} onMouseDown={(e) => handleGroupDurationHandleMouseDown(e, group.key, relevantPropertiesInGroup, 'end', {start: groupInitialEarliestTime, end: groupLatestTime})}><GripVerticalIcon size={10} className="text-text-secondary pointer-events-none"/></div>
                                      </div>)}
                                </div>
                                {isGroupExpanded && relevantPropertiesInGroup.map(prop => {
                                    const track = relevantTracks.find(t => t.property === prop);
                                    return (
                                        <div key={`${group.key}-${prop}-track`} style={{ height: `${TIMELINE_PROPERTY_ROW_HEIGHT}px` }} className="relative border-b border-[var(--glass-border-color)] flex items-center bg-transparent">
                                            {track?.keyframes.map((kf, index, arr) => {
                                                const isSelectedByTime = Math.abs(kf.time - currentTime) < 0.001; const isBeingDragged = draggingKeyframeInfo?.elementId === selectedElementId && draggingKeyframeInfo?.property === prop && Math.abs(kf.time - draggingKeyframeInfo.originalTime) < 0.001;
                                                const isSelectedForContextMenu = selectedTimelineContextItem?.type === 'keyframe' && selectedTimelineContextItem.elementId === selectedElementId && selectedTimelineContextItem.property === prop && selectedTimelineContextItem.time === kf.time;
                                                const isActivelySelected = (isSelectedByTime || isSelectedForContextMenu) && !isBeingDragged;
                                                let displayLeft = kf.time * effectivePixelsPerSecond; if (isBeingDragged && currentDraggedKeyframePixelOffset !== null) displayLeft = currentDraggedKeyframePixelOffset;
                                                let keyframeFillColor = 'none', keyframeStrokeColorClass = 'text-accent-color opacity-70', keyframeExtraClasses = 'group-hover/keyframe:text-accent-color group-hover/keyframe:opacity-100 group-hover/keyframe:scale-125';
                                                if (isBeingDragged) { keyframeFillColor = 'var(--accent-color)'; keyframeStrokeColorClass = 'text-accent-color'; keyframeExtraClasses = 'opacity-90 scale-125 shadow-[var(--highlight-glow)]'; }
                                                else if (isActivelySelected) { keyframeFillColor = 'var(--accent-color)'; keyframeStrokeColorClass = 'text-accent-color'; keyframeExtraClasses = 'scale-125 group-hover/keyframe:scale-140 ring-1 ring-accent-color shadow-[var(--highlight-glow)]'; }

                                                let animationBar = null;
                                                if (index < arr.length - 1) { const nextKf = arr[index+1]; const barLeft = kf.time * effectivePixelsPerSecond; const barWidth = (nextKf.time - kf.time) * effectivePixelsPerSecond; const isSegmentSelected = selectedTimelineContextItem?.type === 'segment' && selectedTimelineContextItem.elementId === selectedElementId && selectedTimelineContextItem.property === prop && selectedTimelineContextItem.startTime === kf.time && selectedTimelineContextItem.endTime === nextKf.time;
                                                    animationBar = (<div className={`absolute h-${ANIMATION_BAR_HEIGHT / 4} top-1/2 -translate-y-1/2 rounded-sm cursor-pointer ${isSegmentSelected ? 'bg-[rgba(var(--accent-rgb),0.3)] border border-accent-color' : 'bg-[rgba(var(--accent-rgb),0.15)] hover:bg-[rgba(var(--accent-rgb),0.2)] border border-transparent'}`} style={{ left: `${barLeft}px`, width: `${barWidth}px`, height: `${ANIMATION_BAR_HEIGHT}px`, zIndex: 20 }} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_TIMELINE_CONTEXT_ITEM', payload: { type: 'segment', elementId: selectedElementId!, property: prop, startTime: kf.time, endTime: nextKf.time } }); }} title={`Animation segment for ${prop} from ${kf.time.toFixed(2)}s to ${nextKf.time.toFixed(2)}s`} />);
                                                }
                                                return (<React.Fragment key={`${kf.time}-${String(kf.value).slice(0,10)}`}>{animationBar}<div style={{ left: `${displayLeft}px`, transform: 'translate(-50%, -50%)', top: '50%' }} className={`absolute h-full flex items-center justify-center z-20 group/keyframe`} title={`Keyframe for ${prop} at ${kf.time.toFixed(2)}s. Alt+Click or DblClick: Delete.`} role="button" aria-label={`Keyframe for ${prop} at ${kf.time.toFixed(2)}s`}>
                                                        <div className="cursor-grab p-1 rounded-full flex items-center justify-center" onMouseDown={(e) => handleKeyframeMouseDown(e, kf, selectedElementId!, prop)} onClick={(e) => handleKeyframeClick(e, kf, selectedElementId!, prop)} onDoubleClick={(e) => handleKeyframeDoubleClick(e, kf, selectedElementId!, prop)}><AddKeyframeToTrackIcon size={10} className={`transition-all duration-100 ${keyframeStrokeColorClass} ${keyframeExtraClasses}`} fill={isActivelySelected || isBeingDragged ? 'var(--accent-color)' : 'rgba(var(--accent-rgb), 0.2)'} /></div>
                                                    </div></React.Fragment>);
                                            })}
                                            {draggingKeyframeInfo && draggingKeyframeInfo.elementId === selectedElementId && draggingKeyframeInfo.property === prop && (<div style={{ left: `${draggingKeyframeInfo.originalTime * effectivePixelsPerSecond}px`, transform: 'translateX(-50%)' }} className="absolute flex items-center justify-center pointer-events-none z-10"><AddKeyframeToTrackIcon size={10} className="text-text-placeholder opacity-50" fill="none" strokeDasharray="2 2" strokeWidth={1.5}/></div>)}
                                        </div>);
                                })}
                            </React.Fragment>);
                    })}
                    {timelineViewMode === 'dopesheet' && renderDopesheetHierarchySide(dopesheetTree, renderDopesheetRowRightPart)}
                    <div 
                        style={{ 
                            left: `${currentTime * effectivePixelsPerSecond}px`, 
                            height: `calc(100% + ${TIMELINE_RULER_HEIGHT}px)`, 
                            top: `-${TIMELINE_RULER_HEIGHT}px`,
                            backgroundColor: 'var(--accent-color)' 
                        }} 
                        className="absolute w-0.5 z-30 pointer-events-none"
                    >
                        <div style={{transform: 'translateX(-50%)'}} className="scrubber-handle absolute -top-1.5 w-3.5 h-3.5 bg-accent-color border-2 border-white rounded-full cursor-ew-resize pointer-events-auto shadow-[var(--highlight-glow)]" onMouseDown={handleScrubberHandleMouseDown}></div>
                    </div>
                </div>
            </div>
        </div>

        <div style={{ width: `${selectedTimelineContextItem ? TIMELINE_CONTEXT_MENU_WIDTH : 0}px` }} className={`bg-[var(--dark-bg-secondary)] border-l border-[var(--glass-border-color)] flex-shrink-0 transition-all duration-200 ease-in-out overflow-hidden backdrop-blur-sm ${selectedTimelineContextItem ? 'p-2' : 'p-0'}`}>
            {selectedTimelineContextItem && (<TimelineContextualMenu />)}
             {!selectedTimelineContextItem && TIMELINE_CONTEXT_MENU_WIDTH > 0 && (<div className="p-3 text-xs text-text-placeholder text-center h-full flex items-center justify-center">Select a keyframe or animation segment.</div>)}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
