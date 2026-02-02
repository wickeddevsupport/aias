
import React, { useCallback, useEffect, useMemo, useContext, useState, useRef, useLayoutEffect, Dispatch } from 'react';
import { SVGElementData, AnimationTrack, PathElementProps, Artboard, AnimatableProperty, GroupElementProps, RectElementProps, CircleElementProps, AnySVGGradient, LinearSVGGradient, RadialSVGGradient, GradientStop, InterpolatedGradientUpdateData, BezierPoint, AppState, AppAction, SVGElementType, ImageElementProps, TextElementProps, MotionPathCacheEntry, OnCanvasTextEditorState } from './types';
import { FRAME_STEP_TIME, DEFAULT_MOTION_PATH_START, DEFAULT_MOTION_PATH_END, DEFAULT_MOTION_PATH_OFFSET_X, DEFAULT_MOTION_PATH_OFFSET_Y, TIMELINE_PIXELS_PER_SECOND, TIMELINE_HEIGHT, DEFAULT_GRADIENT_STOPS, DEFAULT_GRADIENT_ANGLE, DEFAULT_RADIAL_CX, DEFAULT_RADIAL_CY, DEFAULT_RADIAL_R, DEFAULT_RADIAL_FX, DEFAULT_RADIAL_FY, DEFAULT_RADIAL_FR, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT, DEFAULT_LETTER_SPACING, DEFAULT_TEXT_ANCHOR, DEFAULT_ELEMENT_FILL, DEFAULT_OPACITY, DEFAULT_TEXT_CONTENT, DEFAULT_TEXT_VERTICAL_ALIGN, DEFAULT_PLAYBACK_SPEED } from './constants'; // Added DEFAULT_TEXT_VERTICAL_ALIGN, DEFAULT_PLAYBACK_SPEED
import KonvaCanvasContainer from './components/KonvaCanvasContainer';
import PropertiesPanel from './components/PropertiesPanel';
import Timeline from './components/Timeline';
import PlaybackControls from './components/PlaybackControls';
import LeftTabsPanel from './components/LeftTabsPanel';
import AiChatBubble from './components/AiChatBubble';
import ContextMenu from './components/ContextMenu';
import KonvaTextEditor from './components/KonvaTextEditor';
import { interpolateValue, getElementAnimatableProperties } from './utils/animationUtils';
import { getPathAngleAtProgress, getRectAsPathD, getCircleAsPathD, calculateShapePathLength, buildPathDFromStructuredPoints, generatePointId } from './utils/pathUtils';
import { exportToHtml } from './utils/exportUtils';
import { generateAnimationWithAI } from './aiUtils';
import { AppContext } from './contexts/AppContext';
import { getAccumulatedTransform } from './utils/transformUtils';
import Konva from 'konva';
import { getOutermostGroupId, generateUniqueId } from './contexts/appContextUtils';


const MIN_PANEL_WIDTH = 220; // Adjusted min width
const MIN_CANVAS_AREA_WIDTH = 300;
const MIN_TIMELINE_PANEL_HEIGHT = 160; // Adjusted min height
const MIN_TOP_SECTION_HEIGHT = 200;

const TEXT_EDITOR_POSITION_ADJUST_X = 0; // Adjusted for new styling
const TEXT_EDITOR_POSITION_ADJUST_Y = 0; // Adjusted for new styling


const App: React.FC = () => {
  const { state, dispatch } = useContext(AppContext) as { state: AppState; dispatch: Dispatch<AppAction> };
  const {
    artboard,
    elements,
    selectedElementId,
    animation,
    currentTime,
    playbackSpeed, // Added
    isPlaying,
    aiPrompt,
    motionPathSelectionTargetElementId,
    textOnPathSelectionTargetElementId,
    previewTarget,
    previewGradient,
    previewSolidColor,
    clipboard, 
    timelineKeyframeClipboard, 
    contextMenuVisible,
    currentTool,
    isDrawingBezierPath,
    selectedBezierPointId,
    activeControlPoint,
    editingKeyframeShapePreview,
    currentBezierPathData,
    isExtendingPathInfo,
    onCanvasTextEditor,
    newlyAddedTextElementId,
    selectedTimelineContextItem, 
  } = state;

  const selectedElement = elements.find(el => el.id === selectedElementId) || null;

  const [leftPanelWidth, setLeftPanelWidth] = useState(0);
  const [rightPanelWidth, setRightPanelWidth] = useState(0);
  const [bottomTimelinePanelHeight, setBottomTimelinePanelHeight] = useState(TIMELINE_HEIGHT);

  const [currentResizeMode, setCurrentResizeMode] = useState<'left' | 'right' | 'timeline' | null>(null);
  const initialPointerPos = useRef({x: 0, y: 0});
  const initialLeftWidth = useRef(0);
  const initialRightWidth = useRef(0);
  const initialTimelineHeight = useRef(0);
  const appRootRef = useRef<HTMLDivElement>(null);
  const topAreaRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const stageRefForApp = useRef<Konva.Stage | null>(null);
  const elementNodeMapRefForApp = useRef<Map<string, Konva.Node>>(new Map());

  const motionPathCacheRef = useRef<Map<string, MotionPathCacheEntry>>(new Map());
  const animationFrameIdRef = useRef<number | null>(null);
  const animationTimingRef = useRef({
    startTime: 0,
    startCurrentTime: 0,
  });

  const stateRefForCallbacks = useRef(state);
  useEffect(() => {
    stateRefForCallbacks.current = state;
  }, [state]);


  useLayoutEffect(() => {
    if (appRootRef.current) {
      const totalAppWidth = appRootRef.current.clientWidth;
      const twentyFivePercentWidth = totalAppWidth * 0.22; // Slightly larger panels
      const newLeftWidth = Math.max(MIN_PANEL_WIDTH, twentyFivePercentWidth);
      const newRightWidth = Math.max(MIN_PANEL_WIDTH, twentyFivePercentWidth);

      setLeftPanelWidth(newLeftWidth);
      setRightPanelWidth(newRightWidth);

      const totalAppHeight = appRootRef.current.clientHeight;
      if (totalAppHeight > 0) {
        let calculatedTimelineHeight = totalAppHeight * 0.30; // Slightly smaller timeline default

        calculatedTimelineHeight = Math.max(MIN_TIMELINE_PANEL_HEIGHT, calculatedTimelineHeight);

        if (totalAppHeight - calculatedTimelineHeight < MIN_TOP_SECTION_HEIGHT) {
          calculatedTimelineHeight = totalAppHeight - MIN_TOP_SECTION_HEIGHT;
          calculatedTimelineHeight = Math.max(MIN_TIMELINE_PANEL_HEIGHT, calculatedTimelineHeight);
        }
        setBottomTimelinePanelHeight(calculatedTimelineHeight);
      }
    }
  }, []);


  const addElement = useCallback((type: SVGElementType, initialProps?: Partial<SVGElementData>, targetParentId?: string | null, andInitiateEdit?: boolean) => {
    if (currentTool === 'bezierPath' && isDrawingBezierPath) {
      dispatch({ type: 'FINISH_DRAWING_BEZIER_PATH', payload: { closedByJoining: false, isDoubleClickEvent: false } });
    } else if (currentTool === 'pencil' && stateRefForCallbacks.current.isDrawing) {
      dispatch({ type: 'FINISH_DRAWING_PATH'});
    }
    dispatch({ type: 'ADD_ELEMENT', payload: { type, targetParentId, props: initialProps, andInitiateEdit } });
  }, [dispatch, currentTool, isDrawingBezierPath, stateRefForCallbacks]);


  const updateElementProps = useCallback((id: string, propsToUpdate: Partial<SVGElementData>, skipHistory: boolean = false) => {
    dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id, props: propsToUpdate, skipHistory } });
  }, [dispatch]);


  const handleUpdateElementName = useCallback((elementId: string, newName: string) => {
     dispatch({ type: 'UPDATE_ELEMENT_NAME', payload: { id: elementId, name: newName } });
  }, [dispatch]);

  const deleteElement = useCallback((idToDelete: string) => {
    dispatch({ type: 'DELETE_ELEMENT', payload: idToDelete });
  }, [dispatch]);

  const handleMoveElementInHierarchy = useCallback((draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => {
    dispatch({ type: 'MOVE_ELEMENT_IN_HIERARCHY', payload: { draggedId, targetId, position } });
  }, [dispatch]);

  const handleCommitTextChanges = useCallback((text: string, finalWidth: number, finalHeight: number) => {
    const currentOnCanvasTextEditor = stateRefForCallbacks.current.onCanvasTextEditor;
    if (currentOnCanvasTextEditor?.elementId) {
      const propsToUpdate: Partial<TextElementProps> = { text: text || "\u200B" }; 
      const textElementModel = stateRefForCallbacks.current.elements.find(el => el.id === currentOnCanvasTextEditor.elementId) as TextElementProps | undefined;
      const konvaNode = elementNodeMapRefForApp.current.get(currentOnCanvasTextEditor.elementId) as Konva.Text | undefined;

      if (textElementModel && konvaNode) {
        const absScaleX = konvaNode.getAbsoluteScale().x;
        const absScaleY = konvaNode.getAbsoluteScale().y;
        propsToUpdate.width = absScaleX !== 0 ? finalWidth / absScaleX : finalWidth;
        propsToUpdate.height = absScaleY !== 0 ? finalHeight / absScaleY : finalHeight;
      }
      dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: currentOnCanvasTextEditor.elementId, props: propsToUpdate } });
    }
    dispatch({ type: 'HIDE_ON_CANVAS_TEXT_EDITOR' });
    dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' }); 
  }, [dispatch, elementNodeMapRefForApp, stateRefForCallbacks]);

  const handleCancelTextChanges = useCallback(() => {
    dispatch({ type: 'HIDE_ON_CANVAS_TEXT_EDITOR' });
    dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' }); 
  }, [dispatch]);

  const handleTextEditorValueChange = useCallback((text: string) => {
    dispatch({ type: 'UPDATE_ON_CANVAS_TEXT_EDITOR_VALUE', payload: text });
  }, [dispatch]);

  const activateOnCanvasTextEditor = useCallback((elementIdForEditor: string) => {
    const localCurrentElements = stateRefForCallbacks.current.elements;
    const textElementBaseModel = localCurrentElements.find(el => el.id === elementIdForEditor && el.type === 'text') as TextElementProps | undefined;
    if (!textElementBaseModel) return;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const konvaNode = elementNodeMapRefForApp.current.get(textElementBaseModel.id) as Konva.Text | undefined;
            const stage = stageRefForApp.current;
            if (!konvaNode || !stage) return;

            const nodePadding = konvaNode.padding() || 0;
            const localContentTopLeft = { x: nodePadding, y: nodePadding };
            const absTransform = konvaNode.getAbsoluteTransform();
            const absoluteContentTopLeft = absTransform.point(localContentTopLeft);

            const absScale = konvaNode.getAbsoluteScale();
            const absRot = konvaNode.getAbsoluteRotation();

            const visualNodeWidth = konvaNode.width();
            const visualNodeHeight = konvaNode.height();

            const contentVisualWidth = (visualNodeWidth - 2 * nodePadding) * absScale.x;
            const contentVisualHeight = (visualNodeHeight - 2 * nodePadding) * absScale.y;

            let fillString = konvaNode.fill();
            if (typeof fillString !== 'string') {
                fillString = DEFAULT_ELEMENT_FILL;
            }

            const editorStatePayload: OnCanvasTextEditorState = {
                elementId: textElementBaseModel.id,
                isVisible: true,
                text: textElementBaseModel.text === "\u200B" ? "" : textElementBaseModel.text,
                x: absoluteContentTopLeft.x + TEXT_EDITOR_POSITION_ADJUST_X,
                y: absoluteContentTopLeft.y + TEXT_EDITOR_POSITION_ADJUST_Y,
                width: Math.max(1, contentVisualWidth),
                height: Math.max(1, contentVisualHeight),
                fontFamily: konvaNode.fontFamily(),
                fontSize: konvaNode.fontSize() * absScale.y, // Scale font size for editor
                fill: fillString,
                textAlign: konvaNode.align(),
                lineHeight: konvaNode.lineHeight(), // Konva lineHeight is a multiplier
                letterSpacing: (textElementBaseModel.letterSpacing || DEFAULT_LETTER_SPACING) * absScale.x, // Scale letter spacing
                rotation: absRot,
                transformOrigin: "0 0",
            };
            dispatch({ type: 'SHOW_ON_CANVAS_TEXT_EDITOR', payload: editorStatePayload });
        });
    });
  }, [dispatch, stateRefForCallbacks, elementNodeMapRefForApp, stageRefForApp]);


  const handleSelectElement = useCallback((elementId: string | null) => {
    const localState = stateRefForCallbacks.current;

    if (localState.onCanvasTextEditor?.isVisible && elementId !== localState.onCanvasTextEditor.elementId) {
        const editor = localState.onCanvasTextEditor;
        const textElementModel = localState.elements.find(el => el.id === editor.elementId) as TextElementProps | undefined;
        const konvaNode = elementNodeMapRefForApp.current.get(editor.elementId) as Konva.Text | undefined;
        let finalWidth = editor.width; let finalHeight = editor.height;
        if (textElementModel && konvaNode) {
            const absScaleX = konvaNode.getAbsoluteScale().x; const absScaleY = konvaNode.getAbsoluteScale().y;
            finalWidth = absScaleX !== 0 ? editor.width / absScaleX : editor.width;
            finalHeight = absScaleY !== 0 ? editor.height / absScaleY : editor.height;
        }
        handleCommitTextChanges(editor.text, finalWidth, finalHeight);
    }
    
    const clickedElement = elementId ? localState.elements.find(el => el.id === elementId) : null;
    if (localState.currentTool === 'text' && clickedElement && clickedElement.type === 'text') {
        if (localState.selectedElementId !== elementId || !localState.onCanvasTextEditor?.isVisible || localState.onCanvasTextEditor.elementId !== elementId) {
            dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elementId }); 
            activateOnCanvasTextEditor(elementId!); 
        }
        return; 
    }

    if (localState.currentTool === 'bezierPath' && localState.isDrawingBezierPath && elementId !== localState.currentBezierPathData?.id) {
       dispatch({ type: 'FINISH_DRAWING_BEZIER_PATH', payload: { closedByJoining: false, isDoubleClickEvent: false } });
    }
    
    if (localState.selectedElementId !== elementId || (localState.onCanvasTextEditor?.isVisible && localState.onCanvasTextEditor.elementId !== elementId)) {
         dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elementId });
    }


    const newSelectedElementAfterDispatch = elementId ? localState.elements.find(el => el.id === elementId) : null;
    const toolAfterPotentialChanges = stateRefForCallbacks.current.currentTool; 

    if (toolAfterPotentialChanges === 'bezierPath') {
        if (newSelectedElementAfterDispatch?.type === 'path' && (newSelectedElementAfterDispatch as PathElementProps).structuredPoints) {
            const pathPoints = (newSelectedElementAfterDispatch as PathElementProps).structuredPoints;
            if (!localState.selectedBezierPointId || !pathPoints.find(p => p.id === localState.selectedBezierPointId)) {
                 dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: elementId!, pointId: pathPoints && pathPoints.length > 0 ? pathPoints[0].id : null } });
            }
            dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
        } else {
            if (localState.selectedBezierPointId || localState.activeControlPoint) {
                const pathIdForClear = localState.activeControlPoint?.pathId || localState.currentBezierPathData?.id || (localState.selectedElementId && localState.elements.find(el=>el.id===localState.selectedElementId)?.type === 'path' ? localState.selectedElementId : '') || '';
                dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: pathIdForClear, pointId: null } });
                dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
            }
            if (!localState.isDrawingBezierPath && (!newSelectedElementAfterDispatch || newSelectedElementAfterDispatch.type !== 'path' || !(newSelectedElementAfterDispatch as PathElementProps).structuredPoints)) {
                 dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
            }
        }
    } else { 
        if (localState.selectedBezierPointId || localState.activeControlPoint) {
            const pathIdForClear = localState.activeControlPoint?.pathId || (localState.selectedElementId && localState.elements.find(el=>el.id===localState.selectedElementId)?.type === 'path' ? localState.selectedElementId : '') || '';
            dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: pathIdForClear, pointId: null } });
            dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
        }
    }
  }, [dispatch, activateOnCanvasTextEditor, handleCommitTextChanges, stateRefForCallbacks, elementNodeMapRefForApp]);


  const updateArtboardProps = useCallback((id: string, props: Partial<Artboard>) => {
    dispatch({ type: 'SET_ARTBOARD_PROPS', payload: props });
  }, [dispatch]);

  const addKeyframe = useCallback((elementId: string, property: AnimatableProperty, time: number, value: any) => {
    dispatch({ type: 'ADD_KEYFRAME', payload: { elementId, property, time, value } });
  }, [dispatch]);

  const removeKeyframe = useCallback((elementId: string, property: AnimatableProperty, time: number) => {
    dispatch({ type: 'REMOVE_KEYFRAME', payload: { elementId, property, time } });
  }, [dispatch]);

  const updateKeyframeTime = useCallback((elementId: string, property: AnimatableProperty, oldTime: number, newTime: number) => {
    dispatch({ type: 'UPDATE_KEYFRAME_TIME', payload: { elementId, property, oldTime, newTime } });
  }, [dispatch]);

  const updateAnimationDuration = useCallback((newDuration: number) => {
    dispatch({ type: 'UPDATE_ANIMATION_DURATION', payload: newDuration });
  }, [dispatch]);

  const setCurrentTime = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, [dispatch]);

  const setIsPlaying = useCallback((playing: boolean) => {
    dispatch({ type: 'SET_IS_PLAYING', payload: playing });
  }, [dispatch]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && currentTime >= animation.duration) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTime, animation.duration, setIsPlaying, setCurrentTime]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [setIsPlaying, setCurrentTime]);

  const handleRestart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(true);
  }, [setCurrentTime, setIsPlaying]);

  const handleGoToStart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [setCurrentTime, setIsPlaying]);

  const handleGoToEnd = useCallback(() => {
    setCurrentTime(animation.duration);
    setIsPlaying(false);
  }, [animation.duration, setCurrentTime, setIsPlaying]);

  const handlePreviousFrame = useCallback(() => {
    setCurrentTime(Math.max(0, currentTime - FRAME_STEP_TIME));
    setIsPlaying(false);
  }, [currentTime, setCurrentTime, setIsPlaying]);

  const handleNextFrame = useCallback(() => {
    setCurrentTime(Math.min(animation.duration, currentTime + FRAME_STEP_TIME));
    setIsPlaying(false);
  }, [animation.duration, currentTime, setCurrentTime, setIsPlaying]);

  const handleExport = useCallback(() => {
    const htmlOutput = exportToHtml(elements, animation, [artboard]);
    const blob = new Blob([htmlOutput], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [elements, animation, artboard]);

  const handleStartMotionPathSelection = useCallback((elementId: string) => {
    dispatch({ type: 'SET_MOTION_PATH_SELECTION_TARGET', payload: elementId });
  }, [dispatch]);

  const handleAssignMotionPathToTarget = useCallback((assignedPathId: string) => {
    if (motionPathSelectionTargetElementId) {
      updateElementProps(motionPathSelectionTargetElementId, { motionPathId: assignedPathId });
    }
    dispatch({ type: 'SET_MOTION_PATH_SELECTION_TARGET', payload: null });
  }, [motionPathSelectionTargetElementId, updateElementProps, dispatch]);

  const handleClearMotionPathForElement = useCallback((elementId: string) => {
    updateElementProps(elementId, { motionPathId: null });
  }, [updateElementProps]);


  useEffect(() => {
    if (isPlaying) {
      animationTimingRef.current.startTime = performance.now();
      animationTimingRef.current.startCurrentTime = stateRefForCallbacks.current.currentTime;

      const animateFrame = (timestamp: number) => {
        if (!stateRefForCallbacks.current.isPlaying) {
          if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
          }
          return;
        }
        
        const currentPlaybackSpeed = stateRefForCallbacks.current.playbackSpeed || DEFAULT_PLAYBACK_SPEED;
        const realTimeElapsedSincePlayInitiated = (timestamp - animationTimingRef.current.startTime) / 1000;
        const animationTimeElapsed = realTimeElapsedSincePlayInitiated * currentPlaybackSpeed;
        const newAppTime = animationTimingRef.current.startCurrentTime + animationTimeElapsed;

        if (newAppTime >= animation.duration) {
          setCurrentTime(animation.duration);
          setIsPlaying(false); 
        } else {
          setCurrentTime(newAppTime);
          if (stateRefForCallbacks.current.isPlaying) {
            animationFrameIdRef.current = requestAnimationFrame(animateFrame);
          } else {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
          }
        }
      };
      animationFrameIdRef.current = requestAnimationFrame(animateFrame);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [isPlaying, animation.duration, setCurrentTime, setIsPlaying, stateRefForCallbacks]);


   const initialGradientDefs = useMemo(() => {
    const defs: AnySVGGradient[] = [];
    const defsMap = new Map<string, {linear?: LinearSVGGradient, radial?: RadialSVGGradient}>();

    animation.tracks.forEach(track => {
      if (track.property === 'fill' || track.property === 'stroke') {
        const hasGradientKeyframe = track.keyframes.some(kf => typeof kf.value === 'object' && kf.value !== null && 'type' in kf.value && 'stops' in kf.value);
        if (hasGradientKeyframe) {
          const mapKey = `${track.elementId}-${track.property}`;
          if (!defsMap.has(mapKey)) {
            defsMap.set(mapKey, {});
          }
          const entry = defsMap.get(mapKey)!;

          if (!entry.linear) {
            const id = `stable-lin-${track.elementId}-${track.property}`;
            const linGrad: LinearSVGGradient = {
              id, type: 'linearGradient',
              stops: DEFAULT_GRADIENT_STOPS.map((s, i) => ({...s, id: `${id}-stop-${i}`})),
              angle: DEFAULT_GRADIENT_ANGLE, gradientUnits: 'objectBoundingBox'
            };
            defs.push(linGrad);
            entry.linear = linGrad;
          }
          if (!entry.radial) {
            const id = `stable-rad-${track.elementId}-${track.property}`;
            const radGrad: RadialSVGGradient = {
              id, type: 'radialGradient',
              stops: DEFAULT_GRADIENT_STOPS.map((s, i) => ({...s, id: `${id}-stop-${i}`})),
              cx: DEFAULT_RADIAL_CX, cy: DEFAULT_RADIAL_CY, r: DEFAULT_RADIAL_R,
              fx: DEFAULT_RADIAL_FX, fy: DEFAULT_RADIAL_FY, fr: DEFAULT_RADIAL_FR,
              gradientUnits: 'objectBoundingBox'
            };
            defs.push(radGrad);
            entry.radial = radGrad;
          }
        }
      }
    });
    if (artboard.defs?.gradients) {
      defs.push(...artboard.defs.gradients.map(g => ({...g, stops: g.stops.map((s,i) => ({...s, id: s.id || `${g.id}-stop-${i}`} ) ) })));
    }
    return defs;
  }, [animation.tracks, artboard.defs?.gradients]);


   const animatedElements = useMemo(() => {
    return elements.map(el => {
      const newProps: Partial<SVGElementData> & { gradientUpdates?: { fill?: InterpolatedGradientUpdateData | InterpolatedGradientUpdateData[], stroke?: InterpolatedGradientUpdateData | InterpolatedGradientUpdateData[] } } = {};
      let motionPathAppliedThisFrame = false;
      let rotationOverriddenByAlignToPath = false;

      let mpStart = el.motionPathStart ?? DEFAULT_MOTION_PATH_START;
      let mpEnd = el.motionPathEnd ?? DEFAULT_MOTION_PATH_END;
      let mpOffsetX = el.motionPathOffsetX ?? DEFAULT_MOTION_PATH_OFFSET_X;
      let mpOffsetY = el.motionPathOffsetY ?? DEFAULT_MOTION_PATH_OFFSET_Y;
      let currentMotionPathId = el.motionPathId;
      let currentTextPathId = (el as TextElementProps).textPathId;

      newProps.gradientUpdates = {};
      let isPreviewingThisFillStroke = false;

      if (previewTarget?.elementId === el.id) {
        const previewProp = previewTarget.property as 'fill' | 'stroke';
        if (previewProp === 'fill' || previewProp === 'stroke') {
          isPreviewingThisFillStroke = true;
          if (previewSolidColor) {
            (newProps as any)[previewProp] = previewSolidColor;
            if (newProps.gradientUpdates && newProps.gradientUpdates[previewProp]) {
              delete newProps.gradientUpdates[previewProp];
            }
          } else if (previewGradient) {
            const stableIdKey = `${el.id}-${previewProp}`;
            const targetDefId = previewGradient.type === 'linearGradient'
              ? `stable-lin-${stableIdKey}`
              : `stable-rad-${stableIdKey}`;
            (newProps as any)[previewProp] = `url(#${targetDefId})`;
            newProps.gradientUpdates![previewProp] = {
              data: previewGradient,
              targetDefId: targetDefId,
              type: previewGradient.type
            };
          }
        }
      }

      let currentElementOpacity = el.opacity ?? DEFAULT_OPACITY;

      animation.tracks.forEach(track => {
        if (track.elementId === el.id) {
          if (isPreviewingThisFillStroke && (track.property === 'fill' || track.property === 'stroke') && track.property === previewTarget!.property) {
            return;
          }

          const liveBaseValue = (el as any)[track.property];
          let valueToUse = interpolateValue(track.keyframes, currentTime, liveBaseValue, track.property);

          const keyframeAtCurrentTime = track.keyframes.find(kf => kf.time === currentTime);
          if (keyframeAtCurrentTime) {
              const liveBaseValueStr = JSON.stringify(liveBaseValue);
              const keyframeValueStr = JSON.stringify(keyframeAtCurrentTime.value);
              if (liveBaseValueStr !== keyframeValueStr) {
                  valueToUse = liveBaseValue;
              }
          }


          if (valueToUse !== undefined) {
            if ((track.property === 'fill' || track.property === 'stroke')) {
                const fillOrStrokeProp = track.property;
                if ((valueToUse as any)._isCrossfade) {
                    const crossfadeData = valueToUse as any;
                    const fromGrad = crossfadeData.from as AnySVGGradient;
                    const toGrad = crossfadeData.to as AnySVGGradient;
                    const stableIdKeyFrom = `${el.id}-${fillOrStrokeProp}`;
                    const targetDefIdFrom = fromGrad.type === 'linearGradient' ? `stable-lin-${stableIdKeyFrom}` : `stable-rad-${stableIdKeyFrom}`;
                    const stableIdKeyTo = `${el.id}-${fillOrStrokeProp}`;
                    const targetDefIdTo = toGrad.type === 'linearGradient' ? `stable-lin-${stableIdKeyTo}` : `stable-rad-${stableIdKeyTo}`;

                    (newProps as any)[fillOrStrokeProp] = `url(#${targetDefIdFrom})`;
                    newProps.gradientUpdates![fillOrStrokeProp] = [
                        { data: fromGrad, targetDefId: targetDefIdFrom, type: fromGrad.type },
                        { data: toGrad, targetDefId: targetDefIdTo, type: toGrad.type }
                    ];
                } else if (typeof valueToUse === 'object' && valueToUse !== null && 'type' in valueToUse && 'stops' in valueToUse) {
                    const gradientData = valueToUse as AnySVGGradient;
                    const stableIdKey = `${el.id}-${fillOrStrokeProp}`;
                    const targetDefId = gradientData.type === 'linearGradient' ? `stable-lin-${stableIdKey}` : `stable-rad-${stableIdKey}`;
                    (newProps as any)[fillOrStrokeProp] = `url(#${targetDefId})`;
                    newProps.gradientUpdates![fillOrStrokeProp] = {
                        data: gradientData,
                        targetDefId: targetDefId,
                        type: gradientData.type
                    };
                } else {
                    (newProps as any)[fillOrStrokeProp] = valueToUse;
                    if (newProps.gradientUpdates && newProps.gradientUpdates[fillOrStrokeProp]) {
                        delete newProps.gradientUpdates[fillOrStrokeProp];
                    }
                }
            } else {
              (newProps as any)[track.property] = valueToUse;
              if (track.property === 'opacity') {
                currentElementOpacity = valueToUse as number;
              }
            }
          }
          if (track.property === 'motionPathStart') mpStart = valueToUse as number;
          else if (track.property === 'motionPathEnd') mpEnd = valueToUse as number;
          else if (track.property === 'motionPathOffsetX') mpOffsetX = valueToUse as number;
          else if (track.property === 'motionPathOffsetY') mpOffsetY = valueToUse as number;
          else if (track.property === 'motionPath') currentMotionPathId = valueToUse as string | null;
          else if (track.property === 'textPath') currentTextPathId = valueToUse as string | null;
        }
      });

      if (el.type === 'text') {
        (newProps as TextElementProps).textPathId = currentTextPathId;
      }

      if (currentMotionPathId) {
        const motionPathSourceElement = elements.find(e => e.id === currentMotionPathId);
        if (motionPathSourceElement) {
            let pathD: string | null = null;
            if (motionPathSourceElement.type === 'path') {
                 const sourcePathEl = motionPathSourceElement as PathElementProps;
                 if (Array.isArray(sourcePathEl.d)) {
                    pathD = buildPathDFromStructuredPoints(sourcePathEl.d, sourcePathEl.closedByJoining);
                 } else {
                    pathD = sourcePathEl.d;
                 }
            }
            else if (motionPathSourceElement.type === 'rect') pathD = getRectAsPathD(motionPathSourceElement as RectElementProps);
            else if (motionPathSourceElement.type === 'circle') pathD = getCircleAsPathD(motionPathSourceElement as CircleElementProps);

            if (pathD) {
                let cachedPathData = motionPathCacheRef.current.get(currentMotionPathId);
                if (!cachedPathData || cachedPathData.originalD !== pathD) {
                  const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                  tempPath.setAttribute("d", pathD);
                  if (typeof tempPath.getTotalLength === 'function') {
                    cachedPathData = {
                      pathElement: tempPath,
                      totalLength: tempPath.getTotalLength(),
                      originalD: pathD,
                    };
                    motionPathCacheRef.current.set(currentMotionPathId, cachedPathData);
                  } else {
                    cachedPathData = undefined;
                  }
                }

                if (cachedPathData && cachedPathData.totalLength > 0) {
                    const { pathElement: tempPath, totalLength } = cachedPathData;
                    const motionKeyframes = animation.tracks.find(t => t.elementId === el.id && t.property === 'motionPath')?.keyframes.filter(kf => kf.value === currentMotionPathId) || [];
                    let startTime = 0, endTime = animation.duration;
                    if (motionKeyframes.length > 0) {
                        startTime = Math.min(...motionKeyframes.map(kf => kf.time));
                        const pathChangesTimes = animation.tracks.find(t => t.elementId === el.id && t.property === 'motionPath')?.keyframes.filter(kf => kf.time > startTime).map(kf=>kf.time) || [];
                        endTime = pathChangesTimes.length > 0 ? Math.min(...pathChangesTimes) : animation.duration;
                    } else if (el.motionPathId === currentMotionPathId) { startTime = 0; endTime = animation.duration; }

                    const motionDuration = Math.max(0.001, endTime - startTime);
                    const timeIntoMotion = Math.max(0, Math.min(motionDuration, currentTime - startTime));
                    const baseProgress = (motionDuration === 0 || endTime <= startTime) ? 0 : (timeIntoMotion / motionDuration);
                    const segmentLength = Math.max(0.0001, mpEnd - mpStart);
                    const actualPathProgress = mpStart + (baseProgress * segmentLength);
                    const rawPointOnPath = tempPath.getPointAtLength(Math.max(0, Math.min(1, actualPathProgress)) * totalLength);

                    const mpBaseX = motionPathSourceElement.x ?? 0;
                    const mpBaseY = motionPathSourceElement.y ?? 0;
                    const mpBaseRotation = motionPathSourceElement.rotation ?? 0;
                    const mpBaseScale = motionPathSourceElement.scale ?? 1;
                    let transformedPointX = rawPointOnPath.x * mpBaseScale, transformedPointY = rawPointOnPath.y * mpBaseScale;
                    if (mpBaseRotation !== 0) {
                        const angleRad = mpBaseRotation * (Math.PI / 180), cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
                        const rx = transformedPointX * cosA - transformedPointY * sinA, ry = transformedPointX * sinA + transformedPointY * cosA;
                        transformedPointX = rx; transformedPointY = ry;
                    }
                    transformedPointX += mpBaseX; transformedPointY += mpBaseY;
                    let finalX = transformedPointX, finalY = transformedPointY;
                    let finalAngleDegrees = newProps.rotation ?? el.rotation ?? 0;

                    if (el.alignToPath) {
                        finalAngleDegrees = getPathAngleAtProgress(tempPath, Math.max(0, Math.min(1, actualPathProgress))) + mpBaseRotation;
                        newProps.rotation = finalAngleDegrees; rotationOverriddenByAlignToPath = true;
                        const elementAngleRadians = finalAngleDegrees * (Math.PI / 180), cosElementAngle = Math.cos(elementAngleRadians), sinElementAngle = Math.sin(elementAngleRadians);
                        finalX += (mpOffsetX * cosElementAngle - mpOffsetY * sinElementAngle);
                        finalY += (mpOffsetX * sinElementAngle + mpOffsetY * cosElementAngle);
                    } else { finalX += mpOffsetX; finalY += mpOffsetY; }

                    if (el.type === 'rect') {
                        const rectWidth = (newProps as Partial<RectElementProps>)?.width ?? (el as RectElementProps).width;
                        const rectHeight = (newProps as Partial<RectElementProps>)?.height ?? (el as RectElementProps).height;
                        newProps.x = finalX - rectWidth / 2; newProps.y = finalY - rectHeight / 2;
                    } else if (el.type === 'text' || el.type === 'image' || el.type === 'circle' || el.type === 'path' || el.type === 'group') {
                        newProps.x = finalX; newProps.y = finalY;
                    }
                    motionPathAppliedThisFrame = true;
                }
            }
        }
      }

      if (el.type === 'path' || el.type === 'rect' || el.type === 'circle') {
        const pathLikeEl = el as PathElementProps | RectElementProps | CircleElementProps;
        const pathLikeNewProps = newProps as Partial<PathElementProps | RectElementProps | CircleElementProps>;
        const baseDrawStartPercent = pathLikeEl.drawStartPercent ?? 0;
        const baseDrawEndPercent = pathLikeEl.drawEndPercent ?? 1;
        const interpolatedDrawStartPercent = pathLikeNewProps.drawStartPercent ?? baseDrawStartPercent;
        const interpolatedDrawEndPercent = pathLikeNewProps.drawEndPercent ?? baseDrawEndPercent;
        pathLikeNewProps.drawStartPercent = interpolatedDrawStartPercent;
        pathLikeNewProps.drawEndPercent = interpolatedDrawEndPercent;
        const drawStartPercentTrack = animation.tracks.find(t => t.elementId === el.id && t.property === 'drawStartPercent');
        const drawEndPercentTrack = animation.tracks.find(t => t.elementId === el.id && t.property === 'drawEndPercent');
        const isPercentageDrawActive = (drawStartPercentTrack && drawStartPercentTrack.keyframes.length > 0) || (drawEndPercentTrack && drawEndPercentTrack.keyframes.length > 0) || interpolatedDrawStartPercent !== baseDrawStartPercent || interpolatedDrawEndPercent !== baseDrawEndPercent;

        if (isPercentageDrawActive) {
          const shapePathLen = calculateShapePathLength(el as PathElementProps | RectElementProps | CircleElementProps);
          if (shapePathLen > 0) {
            const currentAnimatedStart = shapePathLen * interpolatedDrawStartPercent;
            const currentAnimatedEnd = shapePathLen * interpolatedDrawEndPercent;
            pathLikeNewProps.strokeDasharray = `${Math.max(0, currentAnimatedEnd - currentAnimatedStart)} ${shapePathLen || 1}`;
            pathLikeNewProps.strokeDashoffset = -currentAnimatedStart;
          } else { pathLikeNewProps.strokeDasharray = "0 1"; pathLikeNewProps.strokeDashoffset = 0; }
        } else {
          if (pathLikeNewProps.strokeDasharray === undefined) pathLikeNewProps.strokeDasharray = pathLikeEl.strokeDasharray;
          if (pathLikeNewProps.strokeDashoffset === undefined) pathLikeNewProps.strokeDashoffset = pathLikeEl.strokeDashoffset;
        }
      }

      if (el.name !== undefined) newProps.name = el.name;
      if (newProps.gradientUpdates && Object.keys(newProps.gradientUpdates).length === 0) delete newProps.gradientUpdates;

      if (el.type === 'path') {
        const pathElFromState = el as PathElementProps;
        let finalDPropValue: string | BezierPoint[];

        if (editingKeyframeShapePreview && editingKeyframeShapePreview.pathId === el.id && editingKeyframeShapePreview.time === currentTime) {
          finalDPropValue = editingKeyframeShapePreview.points;
        }
        else if ((newProps as Partial<PathElementProps>).d !== undefined) {
          finalDPropValue = (newProps as Partial<PathElementProps>).d!;
        }
        else if (pathElFromState.structuredPoints && pathElFromState.structuredPoints.length > 0) {
          finalDPropValue = pathElFromState.structuredPoints;
        }
        else {
          finalDPropValue = typeof pathElFromState.d === 'string' ? pathElFromState.d : "M0,0";
        }
        (newProps as Partial<PathElementProps>).d = finalDPropValue;
      }

      if (!(el.type === 'text' && onCanvasTextEditor && onCanvasTextEditor.isVisible && onCanvasTextEditor.elementId === el.id)) {
        newProps.opacity = currentElementOpacity;
      }

      return { ...el, ...newProps } as SVGElementData;
    });
  }, [elements, animation, currentTime, previewTarget, previewGradient, previewSolidColor, editingKeyframeShapePreview, onCanvasTextEditor]);

  const frameSpecificGradientUpdates = useMemo(() => {
    const updates: InterpolatedGradientUpdateData[] = [];
    animatedElements.forEach(el => {
        if (previewTarget?.elementId === el.id && previewSolidColor) {
            if (previewTarget.property === 'fill' && el.gradientUpdates?.fill) {}
            else if (previewTarget.property === 'stroke' && el.gradientUpdates?.stroke) {}
            else {
                if (el.gradientUpdates?.fill) {
                    if (Array.isArray(el.gradientUpdates.fill)) updates.push(...el.gradientUpdates.fill);
                    else updates.push(el.gradientUpdates.fill);
                }
                if (el.gradientUpdates?.stroke) {
                    if (Array.isArray(el.gradientUpdates.stroke)) updates.push(...el.gradientUpdates.stroke);
                    else updates.push(el.gradientUpdates.stroke);
                }
            }
        } else {
            if (el.gradientUpdates?.fill) {
                if (Array.isArray(el.gradientUpdates.fill)) updates.push(...el.gradientUpdates.fill);
                else updates.push(el.gradientUpdates.fill);
            }
            if (el.gradientUpdates?.stroke) {
                if (Array.isArray(el.gradientUpdates.stroke)) updates.push(...el.gradientUpdates.stroke);
                else updates.push(el.gradientUpdates.stroke);
            }
        }
    });

    if (previewTarget && previewGradient) {
        const stableIdKey = `${previewTarget.elementId}-${previewTarget.property}`;
        const targetDefId = previewGradient.type === 'linearGradient' ? `stable-lin-${stableIdKey}` : `stable-rad-${stableIdKey}`;
        const previewUpdateEntry = { data: previewGradient, targetDefId, type: previewGradient.type };

        const filteredUpdates = updates.filter(upd => upd.targetDefId !== targetDefId);

        const elementBeingPreviewed = animatedElements.find(ae => ae.id === previewTarget.elementId);
        if (elementBeingPreviewed?.gradientUpdates) {
            const updatesForProp = elementBeingPreviewed.gradientUpdates[previewTarget.property as 'fill' | 'stroke'];
            if (Array.isArray(updatesForProp)) {
                const idsToRemove = updatesForProp.map(u => u.targetDefId);
                const nonCrossfadeUpdates = filteredUpdates.filter(upd => !idsToRemove.includes(upd.targetDefId));
                nonCrossfadeUpdates.push(previewUpdateEntry);
                return nonCrossfadeUpdates;
            }
        }
        filteredUpdates.push(previewUpdateEntry);
        return filteredUpdates;
    }
    return updates;
  }, [animatedElements, previewTarget, previewGradient, previewSolidColor]);


  const addKeyframeFromTimeline = useCallback((property: AnimatableProperty, value: string | number | AnySVGGradient) => {
    if (selectedElementId && selectedElementId !== artboard.id) {
      addKeyframe(selectedElementId, property, currentTime, value);
    }
  }, [selectedElementId, artboard.id, currentTime, addKeyframe]);


  const tracksForSelectedElement = useMemo(() => {
    if (!selectedElementId || selectedElementId === artboard.id) return [];
    return animation.tracks.filter(track => track.elementId === selectedElementId);
  }, [selectedElementId, animation.tracks, artboard.id]);

  const handleGenerateAiAnimation = useCallback(async () => {
    if (!selectedElement || !aiPrompt.trim()) {
      dispatch({ type: 'SET_AI_ERROR', payload: "Please select an element and describe the animation." });
      return;
    }
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_AI_ERROR', payload: null });
    try {
      const allPathElementsOnArtboardForAI = elements
        .filter(el => el.type === 'path' && el.artboardId === selectedElement.artboardId)
        .map(p => {
            const pathEl = p as PathElementProps;
            let dString: string;
            if (Array.isArray(pathEl.d)) {
                dString = buildPathDFromStructuredPoints(pathEl.d, pathEl.closedByJoining);
            } else {
                dString = pathEl.d;
            }
            return { id: p.id, d: dString };
        });

      const aiGeneratedTracks = await generateAnimationWithAI(
        selectedElement,
        aiPrompt,
        animation.duration,
        getElementAnimatableProperties(selectedElement.type as SVGElementType),
        allPathElementsOnArtboardForAI
      );
      if (aiGeneratedTracks) {
         dispatch({ type: 'UPDATE_ANIMATION_FROM_AI', payload: {elementId: selectedElement.id, aiTracks: aiGeneratedTracks} });
      } else {
        dispatch({ type: 'SET_AI_ERROR', payload: "AI could not generate animation tracks. Please try a different prompt." });
      }
    } catch (error) {
      console.error("AI Animation Generation Error:", error);
      dispatch({ type: 'SET_AI_ERROR', payload: error instanceof Error ? error.message : "Failed to generate animation. Check console for details." });
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  }, [selectedElement, aiPrompt, animation.duration, elements, dispatch]);

  const availableMotionPathSources = useMemo(() => {
    return elements.filter(el =>
        el.artboardId === artboard.id &&
        (el.type === 'path' || el.type === 'rect' || el.type === 'circle')
    );
  }, [elements, artboard.id]);

  const startResize = (mode: 'left' | 'right' | 'timeline', clientX: number, clientY: number) => {
    setCurrentResizeMode(mode);
    initialPointerPos.current = { x: clientX, y: clientY };
    if (mode === 'left') initialLeftWidth.current = leftPanelWidth;
    else if (mode === 'right') initialRightWidth.current = rightPanelWidth;
    else if (mode === 'timeline') {
      initialTimelineHeight.current = bottomTimelinePanelHeight;
    }
  };

  const handleMouseDownResize = (e: React.MouseEvent, mode: 'left' | 'right' | 'timeline') => {
    startResize(mode, e.clientX, e.clientY);
  };

  const handleTouchStartResize = (e: React.TouchEvent, mode: 'left' | 'right' | 'timeline') => {
    if (e.touches.length === 1) {
      startResize(mode, e.touches[0].clientX, e.touches[0].clientY);
    }
  };


  useEffect(() => {
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!currentResizeMode || !appRootRef.current || !topAreaRef.current) return;
      const totalAppWidth = appRootRef.current.clientWidth;
      const totalAppHeight = appRootRef.current.clientHeight;

      if (currentResizeMode === 'left') {
        const deltaX = clientX - initialPointerPos.current.x;
        const newLeft = Math.max(MIN_PANEL_WIDTH, Math.min(initialLeftWidth.current + deltaX, totalAppWidth - rightPanelWidth - MIN_CANVAS_AREA_WIDTH));
        setLeftPanelWidth(newLeft);
      } else if (currentResizeMode === 'right') {
        const deltaX = clientX - initialPointerPos.current.x;
        const newRight = Math.max(MIN_PANEL_WIDTH, Math.min(initialRightWidth.current - deltaX, totalAppWidth - leftPanelWidth - MIN_CANVAS_AREA_WIDTH));
        setRightPanelWidth(newRight);
      } else if (currentResizeMode === 'timeline') {
        const deltaY = clientY - initialPointerPos.current.y;
        const newHeight = initialTimelineHeight.current - deltaY;

        const maxTimelineHeightPossible = totalAppHeight - MIN_TOP_SECTION_HEIGHT;
        const finalNewHeight = Math.max(MIN_TIMELINE_PANEL_HEIGHT, Math.min(newHeight, maxTimelineHeightPossible));
        setBottomTimelinePanelHeight(finalNewHeight);
      }
    };

    const handleMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerUp = () => setCurrentResizeMode(null);

    if (currentResizeMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handlePointerUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handlePointerUp);
      document.body.style.cursor = currentResizeMode === 'timeline' ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [currentResizeMode, leftPanelWidth, rightPanelWidth]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const isTextEditorActiveTarget = target && target.classList.contains('on-canvas-text-editor');

      if (isTextEditorActiveTarget) {
        return;
      }

      if (currentTool === 'bezierPath' && isDrawingBezierPath && !isInputFocused) {
        if (event.key === 'Enter') {
          event.preventDefault();
          dispatch({ type: 'FINISH_DRAWING_BEZIER_PATH', payload: { closedByJoining: false, isDoubleClickEvent: true } });
        } else if (event.key === 'Escape') {
          event.preventDefault();
          dispatch({ type: 'CANCEL_DRAWING_BEZIER_PATH' });
        }
        return;
      }

      if (currentTool === 'bezierPath' && selectedElement && selectedElement.type === 'path' && (selectedElement as PathElementProps).structuredPoints && !isInputFocused) {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (activeControlPoint) {
                dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
            } else if (selectedBezierPointId) {
                dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: selectedElement.id, pointId: null } });
            } else {
                 dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: null});
                 dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
            }
        } else if (event.key === 'Enter' && !isDrawingBezierPath && !stateRefForCallbacks.current.isExtendingPathInfo && (selectedBezierPointId || activeControlPoint)) {
          event.preventDefault();
          dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: selectedElement.id, pointId: null } });
          dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
          dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
        }
      }

      if ((event.ctrlKey || event.metaKey)) {
        switch (event.key.toLowerCase()) {
          case 'z':
            if (!isInputFocused) { event.preventDefault(); if (event.shiftKey) dispatch({ type: 'REDO' }); else dispatch({ type: 'UNDO' }); }
            break;
          case 'y':
            if (!isInputFocused && !event.shiftKey) { event.preventDefault(); dispatch({ type: 'REDO' }); }
            break;
          case 'c':
            if (!isInputFocused) {
                event.preventDefault();
                if (selectedTimelineContextItem?.type === 'keyframe') {
                    dispatch({ type: 'COPY_TIMELINE_KEYFRAME' });
                } else if (selectedElementId && selectedElementId !== artboard.id) {
                    dispatch({ type: 'COPY_SELECTED_ELEMENT' });
                }
            }
            break;
          case 'v':
            if (!isInputFocused) {
                event.preventDefault();
                if (timelineKeyframeClipboard) {
                    dispatch({ type: 'PASTE_TIMELINE_KEYFRAME' });
                } else if (clipboard && clipboard.length > 0) { 
                    dispatch({ type: 'PASTE_FROM_CLIPBOARD' });
                }
            }
            break;
        }
      } else if (!isInputFocused) {
        switch (event.key.toLowerCase()) {
            case 'v':
                if(currentTool !== 'select') dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
                break;
            case 'p':
                 if(currentTool !== 'pencil') dispatch({ type: 'SET_CURRENT_TOOL', payload: 'pencil' });
                break;
            case 'b':
                 if(currentTool !== 'bezierPath') dispatch({ type: 'SET_CURRENT_TOOL', payload: 'bezierPath' });
                break;
            case 't':
                 if(currentTool !== 'text') dispatch({ type: 'SET_CURRENT_TOOL', payload: 'text' });
                break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, selectedElementId, clipboard, artboard.id, currentTool, isDrawingBezierPath, activeControlPoint, selectedBezierPointId, selectedElement, onCanvasTextEditor, stateRefForCallbacks, selectedTimelineContextItem, timelineKeyframeClipboard]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuVisible &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        dispatch({ type: 'HIDE_CONTEXT_MENU' });
      }
    };

    if (contextMenuVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuVisible, dispatch]);

  const handleElementDblClickOnKonva = useCallback((e: Konva.KonvaEventObject<MouseEvent>, elementId: string, clickedElementModelFromApp: SVGElementData) => {
    e.evt.preventDefault(); e.cancelBubble = true;
    const isCtrlPressedCurrently = e.evt.ctrlKey || e.evt.metaKey;

    const clickedAnimatedElement = animatedElements.find(el => el.id === elementId) || clickedElementModelFromApp;

    if (isCtrlPressedCurrently) {
        dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elementId });
        if (clickedAnimatedElement.type !== 'path' || stateRefForCallbacks.current.currentTool !== 'bezierPath') {
            if (stateRefForCallbacks.current.selectedBezierPointId || stateRefForCallbacks.current.activeControlPoint) {
                dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: stateRefForCallbacks.current.selectedElementId || '', pointId: null } });
                dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
            }
        }
        return;
    }

    if (stateRefForCallbacks.current.selectedElementId !== elementId) {
        dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elementId });
    }

    if (clickedAnimatedElement.type === 'text') {
        dispatch({ type: 'SET_CURRENT_TOOL', payload: 'text' }); 
        activateOnCanvasTextEditor(clickedAnimatedElement.id);
        return;
    }
    
    if (stateRefForCallbacks.current.currentTool !== 'select' && stateRefForCallbacks.current.currentTool !== 'bezierPath') {
        dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
    }


    if (currentTool === 'bezierPath') {
        if (clickedAnimatedElement.type === 'path') {
             if ((clickedAnimatedElement as PathElementProps).structuredPoints) {
                const firstPointId = (clickedAnimatedElement as PathElementProps).structuredPoints![0]?.id || null;
                dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: clickedAnimatedElement.id, pointId: firstPointId } });
            } else {
                dispatch({ type: 'CONVERT_TO_EDITABLE_PATH', payload: { elementId: clickedAnimatedElement.id } });
            }
        } else if (clickedAnimatedElement.type === 'rect' || clickedAnimatedElement.type === 'circle') {
            dispatch({ type: 'CONVERT_TO_EDITABLE_PATH', payload: { elementId: clickedAnimatedElement.id } });
        }
    } else if (stateRefForCallbacks.current.currentTool === 'select' || stateRefForCallbacks.current.currentTool === 'text') { 
        if (clickedAnimatedElement.type === 'path' || clickedAnimatedElement.type === 'rect' || clickedAnimatedElement.type === 'circle') {
            dispatch({ type: 'SET_CURRENT_TOOL', payload: 'bezierPath' });
            if ((clickedAnimatedElement as PathElementProps).structuredPoints) {
                const firstPointId = (clickedAnimatedElement as PathElementProps).structuredPoints![0]?.id || null;
                dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: clickedAnimatedElement.id, pointId: firstPointId } });
            } else {
                dispatch({ type: 'CONVERT_TO_EDITABLE_PATH', payload: { elementId: clickedAnimatedElement.id } });
            }
        }
    }

    const newlySelectedElementModel = animatedElements.find(el => el.id === elementId);
    const toolAfterDblClick = (clickedAnimatedElement.type === 'path' && (stateRefForCallbacks.current.currentTool === 'select' || stateRefForCallbacks.current.currentTool === 'text')) ? 'bezierPath' : stateRefForCallbacks.current.currentTool;

    if (newlySelectedElementModel?.type !== 'path' || toolAfterDblClick !== 'bezierPath') {
        if (stateRefForCallbacks.current.selectedBezierPointId || stateRefForCallbacks.current.activeControlPoint) {
           dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: stateRefForCallbacks.current.selectedElementId || '', pointId: null } });
           dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
       }
   }
}, [dispatch, animatedElements, currentTool, activateOnCanvasTextEditor, stateRefForCallbacks]);


    useLayoutEffect(() => {
      if (newlyAddedTextElementId && currentTool === 'text' && !onCanvasTextEditor?.isVisible) {
        const localElements = stateRefForCallbacks.current.elements;
        const newTextElement = localElements.find(el => el.id === newlyAddedTextElementId && el.type === 'text');
        if (newTextElement) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const konvaNode = elementNodeMapRefForApp.current.get(newTextElement.id);
                    if (konvaNode) {
                        activateOnCanvasTextEditor(newTextElement.id);
                    } else {
                        console.warn("Newly added text element's Konva node not found immediately for editing:", newTextElement.id);
                    }
                    dispatch({ type: 'CLEAR_NEWLY_ADDED_TEXT_FLAG' });
                });
            });
        } else {
          dispatch({ type: 'CLEAR_NEWLY_ADDED_TEXT_FLAG' });
        }
      }
    }, [newlyAddedTextElementId, currentTool, onCanvasTextEditor?.isVisible, activateOnCanvasTextEditor, dispatch, stateRefForCallbacks]);

  const handleAddGroupCallback = useCallback(() => {
    dispatch({ type: 'ADD_GROUP' });
  }, [dispatch]);


   return (
    <div ref={appRootRef} className="flex flex-col h-screen bg-dark-bg-primary text-text-primary overflow-hidden">
      <div ref={topAreaRef} className="flex flex-1 flex-row overflow-hidden">
        <div
          style={{ width: leftPanelWidth > 0 ? `${leftPanelWidth}px` : undefined, background: 'transparent' }}
          className={`h-full flex-shrink-0 p-2 ${leftPanelWidth === 0 ? 'w-0 !p-0' : ''}`}
        >
          {leftPanelWidth > 0 && <LeftTabsPanel onAddGroup={handleAddGroupCallback} onMoveElement={handleMoveElementInHierarchy} onUpdateElementName={handleUpdateElementName} />}
        </div>
        <div
            className="w-1.5 h-full bg-dark-bg-tertiary hover:bg-accent-color transition-colors duration-150 cursor-col-resize flex-shrink-0 group"
            onMouseDown={(e) => handleMouseDownResize(e, 'left')}
            onTouchStart={(e) => handleTouchStartResize(e, 'left')}
            title="Resize Left Panel"
            style={{ touchAction: 'none' }}
        >
          <div className="w-full h-full group-hover:bg-accent-color/30 transition-colors duration-100"></div> {/* Inner div for layered hover */}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
           <KonvaCanvasContainer
              artboard={artboard}
              elements={animatedElements}
              initialGradientDefs={initialGradientDefs}
              frameSpecificGradientUpdates={frameSpecificGradientUpdates}
              selectedElementIdProp={selectedElementId}
              onDblClick={handleElementDblClickOnKonva}
              onAddElement={addElement}
              onDeleteElement={selectedElementId && selectedElementId !== artboard.id ? () => deleteElement(selectedElementId) : undefined}
              artboardIsPresent={!!artboard}
              stageRefExposed={stageRefForApp}
              elementNodeMapRefExposed={elementNodeMapRefForApp}
              activateOnCanvasTextEditor={activateOnCanvasTextEditor}
            />
             <KonvaTextEditor
                editorState={onCanvasTextEditor}
                onCommit={handleCommitTextChanges}
                onCancel={handleCancelTextChanges}
                onValueChange={handleTextEditorValueChange}
            />
        </div>
        <div
            className="w-1.5 h-full bg-dark-bg-tertiary hover:bg-accent-color transition-colors duration-150 cursor-col-resize flex-shrink-0 group"
            onMouseDown={(e) => handleMouseDownResize(e, 'right')}
            onTouchStart={(e) => handleTouchStartResize(e, 'right')}
            title="Resize Right Panel"
            style={{ touchAction: 'none' }}
        >
            <div className="w-full h-full group-hover:bg-accent-color/30 transition-colors duration-100"></div> {/* Inner div */}
        </div>

        <div
          style={{ width: rightPanelWidth > 0 ? `${rightPanelWidth}px` : undefined, background: 'transparent' }}
          className={`h-full flex-shrink-0 p-2 ${rightPanelWidth === 0 ? 'w-0 !p-0' : ''}`}
        >
          {rightPanelWidth > 0 && (
            <PropertiesPanel
              elementFromState={selectedElement}
              animatedElementProps={selectedElementId === artboard.id ? null : animatedElements.find(el => el.id === selectedElementId) || null}
              allAnimatedElements={animatedElements}
              animationTracksForSelected={tracksForSelectedElement}
              artboardFromState={artboard}
              onAddKeyframeProp={addKeyframe}
              onStartMotionPathSelection={handleStartMotionPathSelection}
              onClearMotionPath={handleClearMotionPathForElement}
              isSelectingMotionPath={!!motionPathSelectionTargetElementId}
              availableMotionPathSources={availableMotionPathSources}
              onExport={handleExport}
            />
          )}
        </div>
      </div>

      <div
        className="w-full h-1.5 bg-dark-bg-tertiary hover:bg-accent-color transition-colors duration-150 cursor-row-resize flex-shrink-0 group"
        onMouseDown={(e) => handleMouseDownResize(e, 'timeline')}
        onTouchStart={(e) => handleTouchStartResize(e, 'timeline')}
        title="Resize Timeline Area"
        style={{ touchAction: 'none' }}
      >
        <div className="w-full h-full group-hover:bg-accent-color/30 transition-colors duration-100"></div> {/* Inner div */}
      </div>
      <div style={{ height: `${bottomTimelinePanelHeight}px`, background: 'transparent' }} className={`w-full flex-shrink-0 p-2 ${bottomTimelinePanelHeight === 0 ? '!p-0' : ''}`}>
        { bottomTimelinePanelHeight > 0 && (
            <Timeline
              pixelsPerSecond={TIMELINE_PIXELS_PER_SECOND}
              height={bottomTimelinePanelHeight - 16} // Account for p-2 on parent
              onAddKeyframe={addKeyframeFromTimeline}
              onRemoveKeyframe={removeKeyframe}
              onUpdateKeyframeTime={updateKeyframeTime}
              onUpdateDuration={updateAnimationDuration}
              playbackControlsSlot={
                <PlaybackControls
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onStop={handleStop}
                  onRestart={handleRestart}
                  onPreviousFrame={handlePreviousFrame}
                  onNextFrame={handleNextFrame}
                  onGoToStart={handleGoToStart}
                  onGoToEnd={handleGoToEnd}
                  currentTime={currentTime}
                  duration={animation.duration}
                />
              }
            />
          )}
      </div>

      <AiChatBubble onGenerateAiAnimation={handleGenerateAiAnimation} />
      <ContextMenu ref={contextMenuRef} animatedElementsForMenu={animatedElements} />
    </div>
  );
};

export default App;
