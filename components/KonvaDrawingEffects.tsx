
import React, { useEffect, useCallback, useContext, useRef } from 'react';
import Konva from 'konva';
import { AppContext } from '../contexts/AppContext';
import { PathElementProps, BezierPoint, AccumulatedTransform, AppState, SVGElementData } from '../../types';
import { buildPathDFromStructuredPoints } from '../../utils/pathUtils';
// getAccumulatedTransformUtil removed as we're using local transforms now for selected handles
import {
    GHOST_PATH_OPACITY, DEFAULT_STROKE_WIDTH, BEZIER_CLOSING_THRESHOLD,
    BEZIER_ANCHOR_RADIUS, BEZIER_HANDLE_RADIUS, BEZIER_LINE_STROKE_WIDTH,
    BEZIER_POINT_FILL_COLOR, BEZIER_HANDLE_FILL_COLOR, BEZIER_HANDLE_LINE_COLOR,
    BEZIER_SELECTED_POINT_COLOR, BEZIER_POINT_STROKE_COLOR, BEZIER_HANDLE_STROKE_COLOR,
    BEZIER_CLOSING_INDICATOR_FILL, BEZIER_CLOSING_INDICATOR_STROKE, BEZIER_CLOSING_INDICATOR_RADIUS,
    DEFAULT_PATH_FILL, DEFAULT_ELEMENT_STROKE,
    GHOST_PATH_STROKE_WIDTH_FACTOR, GHOST_PATH_COLOR, GHOST_PATH_STROKE_DASHARRAY,
    DEFAULT_SKEW_X, DEFAULT_SKEW_Y
} from '../../constants';
import { parseDashArrayKonva } from '../../utils/konvaUtils';

interface KonvaDrawingEffectsProps {
  currentTool: AppState['currentTool'];
  isDrawingPencil: AppState['isDrawing'];
  currentPencilPath: AppState['currentDrawingPath'];
  isDrawingBezierPath: AppState['isDrawingBezierPath'];
  currentBezierPathData: AppState['currentBezierPathData'];
  isExtendingPathInfo: AppState['isExtendingPathInfo'];
  selectedElementId: AppState['selectedElementId'];
  selectedBezierPointId: AppState['selectedBezierPointId'];
  elements: AppState['elements']; // Full elements array
  editingKeyframeShapePreview: AppState['editingKeyframeShapePreview'];
  stageScale: number;

  stageRef: React.RefObject<Konva.Stage>;
  effectsLayerRef: React.RefObject<Konva.Layer>; // For new path previews
  // artboardGroupRef no longer directly needed if handles are parented to path's parent
  elementNodeMapRef: React.MutableRefObject<Map<string, Konva.Node>>;

  handleBezierPointPointerDown: (e: Konva.KonvaEventObject<PointerEvent>, pathId: string, pointId: string, handleType: 'anchor' | 'h1' | 'h2') => void;
}

const KonvaDrawingEffects: React.FC<KonvaDrawingEffectsProps> = ({
  currentTool, isDrawingPencil, currentPencilPath,
  isDrawingBezierPath, currentBezierPathData, isExtendingPathInfo,
  selectedElementId, selectedBezierPointId, elements, // Pass full elements
  editingKeyframeShapePreview,
  stageScale,
  stageRef, effectsLayerRef, elementNodeMapRef,
  handleBezierPointPointerDown,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const currentPencilKonvaPathRef = useRef<Konva.Path | null>(null);
  const currentBezierKonvaPathRef = useRef<Konva.Path | null>(null);
  const currentBezierKonvaHandlesGroupRef = useRef<Konva.Group | null>(null);
  const selectedBezierKonvaHandlesGroupRef = useRef<Konva.Group | null>(null);
  const ghostPathKonvaNodeRef = useRef<Konva.Path | null>(null); // Ghost path can still be on effectsLayer


  useEffect(() => {
    const effectsLayer = effectsLayerRef.current;
    if (!effectsLayer) return;
    if (isDrawingPencil && currentPencilPath && currentTool === 'pencil') {
      if (!currentPencilKonvaPathRef.current) {
        currentPencilKonvaPathRef.current = new Konva.Path({ listening: false, perfectDrawEnabled: false, shadowForStrokeEnabled: false });
        effectsLayer.add(currentPencilKonvaPathRef.current);
      }
      const pd = currentPencilPath;
      const baseStrokeWidth = Number.isFinite(pd.strokeWidth) ? pd.strokeWidth : DEFAULT_STROKE_WIDTH;
      const zoom = stageScale > 0 ? stageScale : 1;
      const finalStrokeWidth = (baseStrokeWidth * GHOST_PATH_STROKE_WIDTH_FACTOR) / zoom;
      
      const artboardOffsetX = state.artboard.x || 0; // Get artboard offset from context state
      const artboardOffsetY = state.artboard.y || 0;

      currentPencilKonvaPathRef.current.setAttrs({
          data: pd.d as string, 
          x: (Number.isFinite(pd.x) ? pd.x : 0) + artboardOffsetX, // Position relative to stage
          y: (Number.isFinite(pd.y) ? pd.y : 0) + artboardOffsetY,
          stroke: pd.stroke as string || DEFAULT_ELEMENT_STROKE, strokeWidth: finalStrokeWidth,
          opacity: Number.isFinite(pd.opacity) ? pd.opacity : GHOST_PATH_OPACITY,
          dash: parseDashArrayKonva(pd.strokeDasharray), fillEnabled: false,
          rotation: 0, scaleX: 1, scaleY: 1, // Pencil paths are drawn directly, no extra transform
      });
      currentPencilKonvaPathRef.current.moveToTop();
    } else {
      if (currentPencilKonvaPathRef.current) { currentPencilKonvaPathRef.current.destroy(); currentPencilKonvaPathRef.current = null; }
    }
    effectsLayer.batchDraw();
  }, [isDrawingPencil, currentPencilPath, currentTool, effectsLayerRef, stageScale, state.artboard.x, state.artboard.y]);


  useEffect(() => {
    const effectsLayer = effectsLayerRef.current;
    if (!effectsLayer) return;
    const zoom = stageScale > 0 ? stageScale : 1;

    // Cleanup previously drawn "drawing" path and its handles
    if (currentBezierKonvaPathRef.current) {
      currentBezierKonvaPathRef.current.destroy();
      currentBezierKonvaPathRef.current = null;
    }
    if (currentBezierKonvaHandlesGroupRef.current) {
      currentBezierKonvaHandlesGroupRef.current.destroy();
      currentBezierKonvaHandlesGroupRef.current = null;
    }
     // Cleanup previously drawn "selected" path handles (distinct from drawing handles)
    if (selectedBezierKonvaHandlesGroupRef.current) {
        const oldLayer = selectedBezierKonvaHandlesGroupRef.current.getLayer();
        selectedBezierKonvaHandlesGroupRef.current.destroy();
        selectedBezierKonvaHandlesGroupRef.current = null;
        oldLayer?.batchDraw(); // Draw immediately if it was on a different layer (main layer)
    }
    // Cleanup ghost path
    if (ghostPathKonvaNodeRef.current) {
        ghostPathKonvaNodeRef.current.destroy();
        ghostPathKonvaNodeRef.current = null;
    }


    let activePathDataForRendering: PathElementProps | null = null;
    let konvaParentForHandles: Konva.Group | null = null; // The Konva group that will contain the handles
    let isDrawingOrExtendingThisPath = false;

    if (isDrawingBezierPath && currentBezierPathData?.structuredPoints) {
        // CASE 1: Actively drawing a new path or extending an existing one.
        // currentBezierPathData is the source of truth for the path preview and its handles.
        activePathDataForRendering = currentBezierPathData;
        isDrawingOrExtendingThisPath = true;
        
        const artboardOffsetX = state.artboard.x || 0;
        const artboardOffsetY = state.artboard.y || 0;

        // Render the path preview itself on the effects layer.
        currentBezierKonvaPathRef.current = new Konva.Path({ 
            data: buildPathDFromStructuredPoints(activePathDataForRendering.structuredPoints, activePathDataForRendering.closedByJoining),
            x: (Number.isFinite(activePathDataForRendering.x) ? activePathDataForRendering.x : 0) + artboardOffsetX,
            y: (Number.isFinite(activePathDataForRendering.y) ? activePathDataForRendering.y : 0) + artboardOffsetY,
            rotation: Number.isFinite(activePathDataForRendering.rotation) ? activePathDataForRendering.rotation : 0,
            scaleX: Number.isFinite(activePathDataForRendering.scale) && activePathDataForRendering.scale > 0 ? activePathDataForRendering.scale : 1,
            scaleY: Number.isFinite(activePathDataForRendering.scale) && activePathDataForRendering.scale > 0 ? activePathDataForRendering.scale : 1,
            skewX: Number.isFinite(activePathDataForRendering.skewX) ? activePathDataForRendering.skewX : DEFAULT_SKEW_X,
            skewY: Number.isFinite(activePathDataForRendering.skewY) ? activePathDataForRendering.skewY : DEFAULT_SKEW_Y,
            fillEnabled: !!activePathDataForRendering.closedByJoining && activePathDataForRendering.fill !== 'none',
            fill: activePathDataForRendering.fill as string || (activePathDataForRendering.closedByJoining ? DEFAULT_PATH_FILL : 'none'),
            stroke: activePathDataForRendering.stroke as string || DEFAULT_ELEMENT_STROKE,
            strokeWidth: (Number.isFinite(activePathDataForRendering.strokeWidth) ? activePathDataForRendering.strokeWidth : DEFAULT_STROKE_WIDTH) / zoom,
            opacity: Number.isFinite(activePathDataForRendering.opacity) ? activePathDataForRendering.opacity : GHOST_PATH_OPACITY,
            listening: false, perfectDrawEnabled: false, name: `drawing-path-${activePathDataForRendering.id}`
        });
        effectsLayer.add(currentBezierKonvaPathRef.current);
        currentBezierKonvaPathRef.current.moveToTop();

        // Handles will be parented to a group on the effects layer, transformed like the path preview.
        currentBezierKonvaHandlesGroupRef.current = new Konva.Group({ 
            id: `drawing-handles-${activePathDataForRendering.id}`,
            name: 'drawing-handles-group',
            x: currentBezierKonvaPathRef.current.x(),
            y: currentBezierKonvaPathRef.current.y(),
            rotation: currentBezierKonvaPathRef.current.rotation(), 
            scaleX: currentBezierKonvaPathRef.current.scaleX(), 
            scaleY: currentBezierKonvaPathRef.current.scaleY(), 
            skewX: currentBezierKonvaPathRef.current.skewX(),
            skewY: currentBezierKonvaPathRef.current.skewY(),
            listening: true,
        });
        effectsLayer.add(currentBezierKonvaHandlesGroupRef.current);
        konvaParentForHandles = currentBezierKonvaHandlesGroupRef.current;
      
    } else if (currentTool === 'bezierPath' && selectedElementId) {
        // CASE 2: Bezier tool is active, an element is selected, but not actively drawing/extending it.
        // This handles showing handles for an existing selected path or a path being edited at a keyframe.
        const baseRawPathFromState = state.elements.find(el => el.id === selectedElementId && el.type === 'path') as PathElementProps | undefined;
        const animatedPathFromProps = elements.find(el => el.id === selectedElementId && el.type === 'path') as PathElementProps | undefined;

        if (editingKeyframeShapePreview && editingKeyframeShapePreview.pathId === selectedElementId) {
            activePathDataForRendering = {
                ...(baseRawPathFromState || {} as PathElementProps), 
                id: selectedElementId!, type: 'path',
                structuredPoints: editingKeyframeShapePreview.points,
                d: buildPathDFromStructuredPoints(editingKeyframeShapePreview.points, baseRawPathFromState?.closedByJoining || false),
                x: animatedPathFromProps?.x ?? baseRawPathFromState?.x,
                y: animatedPathFromProps?.y ?? baseRawPathFromState?.y,
                rotation: animatedPathFromProps?.rotation ?? baseRawPathFromState?.rotation,
                scale: animatedPathFromProps?.scale ?? baseRawPathFromState?.scale,
                skewX: animatedPathFromProps?.skewX ?? baseRawPathFromState?.skewX ?? DEFAULT_SKEW_X,
                skewY: animatedPathFromProps?.skewY ?? baseRawPathFromState?.skewY ?? DEFAULT_SKEW_Y,
            };
        } else if (animatedPathFromProps && Array.isArray(animatedPathFromProps.d)) {
            activePathDataForRendering = { ...animatedPathFromProps, structuredPoints: animatedPathFromProps.d as BezierPoint[] };
        } else if (baseRawPathFromState?.structuredPoints) {
            activePathDataForRendering = { ...animatedPathFromProps, ...baseRawPathFromState };
        }
        
        if (activePathDataForRendering) {
            const konvaNodeForSelectedPath = elementNodeMapRef.current.get(selectedElementId);
            if (konvaNodeForSelectedPath && konvaNodeForSelectedPath.getParent() instanceof Konva.Group && konvaNodeForSelectedPath.getLayer()) {
                selectedBezierKonvaHandlesGroupRef.current = new Konva.Group({ id: `selected-handles-${activePathDataForRendering.id}`, name: `selected-handles-group`, listening: true,});
                (konvaNodeForSelectedPath.getParent() as Konva.Group).add(selectedBezierKonvaHandlesGroupRef.current);
                konvaParentForHandles = selectedBezierKonvaHandlesGroupRef.current;
                
                // Match the transform of the actual path node. Handles drawn in path's local space.
                konvaParentForHandles.setAttrs({
                    x: konvaNodeForSelectedPath.x(), y: konvaNodeForSelectedPath.y(),
                    rotation: konvaNodeForSelectedPath.rotation(),
                    scaleX: konvaNodeForSelectedPath.scaleX(), scaleY: konvaNodeForSelectedPath.scaleY(),
                    skewX: konvaNodeForSelectedPath.skewX(), skewY: konvaNodeForSelectedPath.skewY(),
                    offsetX: konvaNodeForSelectedPath.offsetX(), offsetY: konvaNodeForSelectedPath.offsetY(),
                });
            }
        }
    }

    // Common logic to render handles if activePathDataForRendering and konvaParentForHandles are set
    if (activePathDataForRendering && activePathDataForRendering.structuredPoints && konvaParentForHandles && activePathDataForRendering.id) {
        const linesToAdd: Konva.Line[] = []; const handleCirclesToAdd: Konva.Circle[] = []; const anchorCirclesToAdd: Konva.Circle[] = [];
        activePathDataForRendering.structuredPoints.forEach(point => {
            const isSelectedCurrentPoint = selectedBezierPointId === point.id;
            if (isSelectedCurrentPoint && point.h1x !== undefined && point.h1y !== undefined) {
                linesToAdd.push(new Konva.Line({ points: [point.x, point.y, point.h1x, point.h1y], stroke: BEZIER_HANDLE_LINE_COLOR, strokeWidth: BEZIER_LINE_STROKE_WIDTH / zoom, listening: false, name: `line-h1-${point.id}` }));
                const h1 = new Konva.Circle({ x: point.h1x, y: point.h1y, radius: BEZIER_HANDLE_RADIUS / zoom, fill: BEZIER_HANDLE_FILL_COLOR, stroke: BEZIER_HANDLE_STROKE_COLOR, strokeWidth: 0.5 / zoom, name: `handle-h1-${point.id}`, draggable: false});
                h1.on('pointerdown', (evt) => handleBezierPointPointerDown(evt, activePathDataForRendering!.id, point.id, 'h1'));
                handleCirclesToAdd.push(h1);
            }
            if (isSelectedCurrentPoint && point.h2x !== undefined && point.h2y !== undefined) {
                linesToAdd.push(new Konva.Line({ points: [point.x, point.y, point.h2x, point.h2y], stroke: BEZIER_HANDLE_LINE_COLOR, strokeWidth: BEZIER_LINE_STROKE_WIDTH / zoom, listening: false, name: `line-h2-${point.id}` }));
                const h2 = new Konva.Circle({ x: point.h2x, y: point.h2y, radius: BEZIER_HANDLE_RADIUS / zoom, fill: BEZIER_HANDLE_FILL_COLOR, stroke: BEZIER_HANDLE_STROKE_COLOR, strokeWidth: 0.5 / zoom, name: `handle-h2-${point.id}`, draggable: false});
                h2.on('pointerdown', (evt) => handleBezierPointPointerDown(evt, activePathDataForRendering!.id, point.id, 'h2'));
                handleCirclesToAdd.push(h2);
            }
            const anchor = new Konva.Circle({
                x: point.x, y: point.y, radius: BEZIER_ANCHOR_RADIUS / zoom,
                fill: isSelectedCurrentPoint ? BEZIER_SELECTED_POINT_COLOR : BEZIER_POINT_FILL_COLOR,
                stroke: BEZIER_POINT_STROKE_COLOR, strokeWidth: 0.7 / zoom, name: `anchor-${point.id}`, draggable: false
            });
            anchor.on('pointerdown', (evt) => handleBezierPointPointerDown(evt, activePathDataForRendering!.id, point.id, 'anchor'));
            anchorCirclesToAdd.push(anchor);
        });

        linesToAdd.forEach(line => konvaParentForHandles!.add(line));
        handleCirclesToAdd.forEach(circle => konvaParentForHandles!.add(circle));
        anchorCirclesToAdd.forEach(circle => konvaParentForHandles!.add(circle));
        konvaParentForHandles!.children?.forEach(child => { if (child.name()?.startsWith('anchor-')) child.moveToTop(); });
        konvaParentForHandles!.moveToTop();

        // Add closing indicator for the path being actively drawn/extended if applicable
        if (isDrawingOrExtendingThisPath && activePathDataForRendering.structuredPoints.length > 1 && !activePathDataForRendering.closedByJoining) {
            const firstPoint = activePathDataForRendering.structuredPoints[0];
            const closingIndicator = new Konva.Circle({
                x: firstPoint.x, y: firstPoint.y, radius: BEZIER_CLOSING_INDICATOR_RADIUS / zoom,
                fill: BEZIER_CLOSING_INDICATOR_FILL, stroke: BEZIER_CLOSING_INDICATOR_STROKE,
                strokeWidth: 1 / zoom, name: 'closing-indicator', listening: true
            });
            closingIndicator.on('pointerdown', (e) => { e.evt.preventDefault(); e.cancelBubble = true; dispatch({ type: 'FINISH_DRAWING_BEZIER_PATH', payload: { closedByJoining: true, isDoubleClickEvent: false }}); });
            konvaParentForHandles!.add(closingIndicator);
            closingIndicator.moveToTop();
        }
    }

    // Ghost path logic (if extending an existing path, or editing keyframe shape for an existing path)
    const shouldShowGhost = (isExtendingPathInfo && isExtendingPathInfo.originalPathId === selectedElementId) ||
                           (editingKeyframeShapePreview && editingKeyframeShapePreview.pathId === selectedElementId);

    if (shouldShowGhost && effectsLayer) {
        const originalPathElement = elements.find(el => el.id === selectedElementId && el.type === 'path') as PathElementProps | undefined;
        const konvaNodeForOriginalPathForGhost = elementNodeMapRef.current.get(selectedElementId);

        if (originalPathElement && konvaNodeForOriginalPathForGhost) {
            const pathDataForGhost = Array.isArray(originalPathElement.d)
                ? buildPathDFromStructuredPoints(originalPathElement.d, originalPathElement.closedByJoining)
                : originalPathElement.d;

            if (pathDataForGhost) {
                const absTransformGhostDecomposed = konvaNodeForOriginalPathForGhost.getAbsoluteTransform().decompose();
                ghostPathKonvaNodeRef.current = new Konva.Path({
                    data: pathDataForGhost,
                    x: absTransformGhostDecomposed.x, // Position directly on stage
                    y: absTransformGhostDecomposed.y,
                    rotation: absTransformGhostDecomposed.rotation,
                    scaleX: absTransformGhostDecomposed.scaleX, scaleY: absTransformGhostDecomposed.scaleY,
                    skewX: absTransformGhostDecomposed.skewX, skewY: absTransformGhostDecomposed.skewY,
                    stroke: GHOST_PATH_COLOR,
                    strokeWidth: (originalPathElement.strokeWidth || DEFAULT_STROKE_WIDTH) * GHOST_PATH_STROKE_WIDTH_FACTOR / zoom,
                    dash: parseDashArrayKonva(GHOST_PATH_STROKE_DASHARRAY),
                    opacity: GHOST_PATH_OPACITY,
                    fillEnabled: false, listening: false, perfectDrawEnabled: false,
                    name: `ghost-${originalPathElement.id}`
                });
                effectsLayer.add(ghostPathKonvaNodeRef.current);
                ghostPathKonvaNodeRef.current.moveToBottom();
            }
        }
    }
    
    effectsLayer.batchDraw();
    if (selectedBezierKonvaHandlesGroupRef.current && selectedBezierKonvaHandlesGroupRef.current.getLayer()) {
      selectedBezierKonvaHandlesGroupRef.current.getLayer()!.batchDraw();
    }

  }, [
    currentTool, selectedElementId, selectedBezierPointId, elements, isExtendingPathInfo, currentBezierPathData,
    editingKeyframeShapePreview, stageScale, handleBezierPointPointerDown, dispatch,
    effectsLayerRef, elementNodeMapRef, state.artboard.x, state.artboard.y, isDrawingBezierPath 
  ]);

  return null;
};

export default KonvaDrawingEffects;
