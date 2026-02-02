

import React, { useRef, useEffect, useLayoutEffect, useCallback, useContext, useState, forwardRef, useImperativeHandle } from 'react';
import Konva from 'konva';
import { AppContext } from '../contexts/AppContext';
import {
    Artboard, SVGElementData, AnySVGGradient, InterpolatedGradientUpdateData,
    PathElementProps, AccumulatedTransform, AppAction, AppState, BezierPoint,
    RectElementProps, ImageElementProps, CircleElementProps, TransformableProps,
    CurrentTool, SVGElementType, TextElementProps, OnCanvasTextEditorState, Asset
} from '../types';
import {
    BEZIER_CLOSING_THRESHOLD, DEFAULT_CIRCLE_R, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, DEFAULT_ELEMENT_FILL, DEFAULT_TEXT_ANCHOR, DEFAULT_TEXT_VERTICAL_ALIGN, DEFAULT_TEXT_CONTENT, DEFAULT_TEXT_WRAP, DEFAULT_TEXT_ALIGN_KONVA, PATH_HITBOX_EXTRA_WIDTH, BEZIER_ANCHOR_RADIUS, BEZIER_HANDLE_RADIUS, BEZIER_LINE_STROKE_WIDTH, BEZIER_POINT_FILL_COLOR, BEZIER_HANDLE_FILL_COLOR, BEZIER_HANDLE_LINE_COLOR, BEZIER_SELECTED_POINT_COLOR, BEZIER_POINT_STROKE_COLOR, BEZIER_HANDLE_STROKE_COLOR, BEZIER_CLOSING_INDICATOR_FILL, BEZIER_CLOSING_INDICATOR_STROKE, BEZIER_CLOSING_INDICATOR_RADIUS, GHOST_PATH_OPACITY, DEFAULT_ELEMENT_STROKE, DEFAULT_STROKE_WIDTH, DEFAULT_PATH_FILL, GHOST_PATH_COLOR, GHOST_PATH_STROKE_DASHARRAY, GHOST_PATH_STROKE_WIDTH_FACTOR, DEFAULT_SKEW_X, DEFAULT_SKEW_Y, TRANSFORM_HANDLE_SIZE, TRANSFORM_ROTATION_HANDLE_OFFSET
} from '../constants';
import KonvaElementRenderer from './konva/KonvaElementRenderer';
import KonvaDrawingEffects from './konva/KonvaDrawingEffects';
import { getAccumulatedTransform as getAccumulatedTransformUtil } from '../utils/transformUtils';
import { getOutermostGroupId, generateUniqueId } from '../contexts/appContextUtils';
import { ZoomInIcon, ZoomOutIcon, MoveIcon as PanIcon, MaximizeIcon as ResetViewIcon } from './icons/EditorIcons';
import Toolbar from './Toolbar';
import { getClosestTOnBezierSegment, splitBezierSegment, generatePointId as generateBezierPointId } from '../utils/pathUtils';


const CURSOR_CROSSHAIR = 'crosshair';
const CURSOR_TEXT_DEFAULT = 'text';
const CURSOR_GRAB = 'grab';
const CURSOR_GRABBING = 'grabbing';
const CURSOR_DEFAULT = 'default';
const CURSOR_POINTER = 'pointer';
const CURSOR_PEN_ADD = 'copy';

interface KonvaCanvasContainerProps {
  artboard: Artboard;
  elements: SVGElementData[];
  initialGradientDefs: AnySVGGradient[];
  frameSpecificGradientUpdates: InterpolatedGradientUpdateData[];
  selectedElementIdProp: string | null;
  onDblClick: (e: Konva.KonvaEventObject<MouseEvent>, elementId: string, clickedElementModel: SVGElementData) => void;
  onAddElement: (type: SVGElementType, initialProps?: Partial<SVGElementData>, targetParentId?: string | null, andInitiateEdit?: boolean) => void;
  onDeleteElement?: () => void;
  artboardIsPresent?: boolean;
  stageRefExposed: React.MutableRefObject<Konva.Stage | null>;
  elementNodeMapRefExposed: React.MutableRefObject<Map<string, Konva.Node>>;
  activateOnCanvasTextEditor: (elementId: string) => void;
}

interface DragContext {
  isCtrlDrag: boolean;
  elementId: string | null;
  isTransforming: boolean;
  draggedKonvaNode: Konva.Node | null;
}

export interface KonvaCanvasContainerHandles {
  zoom: (direction: 'in' | 'out') => void;
  fitToView: () => void;
}

const getAccumulatedTransformLocal = (
  elementId: string,
  elementsArray: ReadonlyArray<SVGElementData>
): AccumulatedTransform => {
 return getAccumulatedTransformUtil(elementId, elementsArray);
};

const KonvaCanvasContainer = forwardRef<KonvaCanvasContainerHandles, KonvaCanvasContainerProps>((props, ref) => {
  const {
    artboard: artboardProp,
    elements: elementsProp,
    initialGradientDefs: initialGradientDefsProp,
    frameSpecificGradientUpdates: frameSpecificGradientUpdatesProp,
    selectedElementIdProp,
    onDblClick: onDblClickAppProp,
    onAddElement,
    onDeleteElement,
    artboardIsPresent,
    stageRefExposed,
    elementNodeMapRefExposed,
    activateOnCanvasTextEditor,
  } = props;

  const { state: appContextState, dispatch } = useContext(AppContext);
  const {
    currentTool, isDrawingBezierPath, isExtendingPathInfo,
    activeControlPoint, selectedBezierPointId, motionPathSelectionTargetElementId,
    textOnPathSelectionTargetElementId,
    isDrawing: isDrawingPencil, currentDrawingPath: currentPencilPath,
    currentBezierPathData, editingKeyframeShapePreview,
  } = appContextState;

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRefInternal = useRef<Konva.Stage | null>(null);
  const mainLayerRef = useRef<Konva.Layer | null>(null);
  const effectsLayerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const artboardGroupRef = useRef<Konva.Group | null>(null);
  const elementNodeMapRefInternal = useRef<Map<string, Konva.Node>>(new Map());

  const imageNodeCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    stageRefExposed.current = stageRefInternal.current;
  }, [stageRefInternal, stageRefExposed]);

  useEffect(() => {
    elementNodeMapRefExposed.current = elementNodeMapRefInternal.current;
  }, [elementNodeMapRefInternal, elementNodeMapRefExposed]);


  const stateRef = useRef(appContextState);
  useEffect(() => { stateRef.current = appContextState; }, [appContextState]);

  const dragContextRef = useRef<DragContext>({ isCtrlDrag: false, elementId: null, isTransforming: false, draggedKonvaNode: null });
  const nodeIsBeingDirectlyDraggedRef = useRef<string | null>(null);

  const [defaultToolCursor, setDefaultToolCursor] = useState<string>(CURSOR_DEFAULT);
  const isDraggingOutHandleRef = useRef(false);
  const isPanningKonvaRef = useRef(false);
  const [isPanToolActiveState, setIsPanToolActiveState] = useState(false);

  const initialSetupDoneRef = useRef(false);

  // This effect resets the view fitting flag whenever a new project is created (indicated by a change in artboard ID).
  useEffect(() => {
    initialSetupDoneRef.current = false;
  }, [artboardProp.id]);


  const getArtboardRelativeCoords = useCallback((stagePointerX: number, stagePointerY: number): { x: number; y: number } => {
    const artboardGrp = artboardGroupRef.current;
    if (!artboardGrp || !stageRefInternal.current) return { x: stagePointerX, y: stagePointerY };

    const transform = artboardGrp.getAbsoluteTransform().copy().invert();
    if (!transform) return { x: stagePointerX, y: stagePointerY };

    return transform.point({ x: stagePointerX, y: stagePointerY });
  }, []);


  const handleKonvaDragStartInternal = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const konvaNode = e.target;
    if (stageRefInternal.current) stageRefInternal.current.container().style.cursor = CURSOR_GRABBING;

    nodeIsBeingDirectlyDraggedRef.current = konvaNode.id();

    dragContextRef.current = {
        isCtrlDrag: e.evt.ctrlKey || e.evt.metaKey,
        elementId: konvaNode.id(),
        isTransforming: false,
        draggedKonvaNode: konvaNode,
    };

    if (transformerRef.current?.nodes().includes(konvaNode)) {
        transformerRef.current.hide();
        mainLayerRef.current?.batchDraw();
    }
  }, []);

  const calculateNewModelPosition = useCallback((konvaNode: Konva.Node, currentElementsInState: ReadonlyArray<SVGElementData>): { x?: number; y?: number } => {
    const elementId = konvaNode.id();
    const modelElement = currentElementsInState.find(el => el.id === elementId);
    if (!modelElement) return {};

    let newModelX: number;
    let newModelY: number;

    if (modelElement.type === 'rect' || modelElement.type === 'image' || modelElement.type === 'text') {
        newModelX = (konvaNode.x() ?? 0) - (konvaNode.offsetX() ?? 0);
        newModelY = (konvaNode.y() ?? 0) - (konvaNode.offsetY() ?? 0);
    } else if (modelElement.type === 'circle') {
        newModelX = konvaNode.x() ?? 0;
        newModelY = konvaNode.y() ?? 0;
    }
     else { // Path, Group
        newModelX = konvaNode.x() ?? 0;
        newModelY = konvaNode.y() ?? 0;
    }

    const propsToReturn: {x?:number, y?:number} = {};
    if (Number.isFinite(newModelX)) propsToReturn.x = parseFloat(newModelX.toFixed(2));
    if (Number.isFinite(newModelY)) propsToReturn.y = parseFloat(newModelY.toFixed(2));
    return propsToReturn;
  }, []);


  const handleKonvaDragMoveInternal = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
      const konvaNode = e.target;
      const elementId = konvaNode.id();

      if (dragContextRef.current.elementId !== elementId || dragContextRef.current.isTransforming) {
          return;
      }

      const modelProps = calculateNewModelPosition(konvaNode, stateRef.current.elements);
      if (Object.keys(modelProps).length > 0) {
         dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementId, props: modelProps, skipHistory: true } });
      }
  }, [dispatch, calculateNewModelPosition]);

  const handleKonvaDragEndInternal = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
      const konvaNode = e.target;
      const elementId = konvaNode.id();

      nodeIsBeingDirectlyDraggedRef.current = null;

      if (dragContextRef.current.elementId !== elementId || dragContextRef.current.isTransforming) {
          if (stageRefInternal.current) stageRefInternal.current.container().style.cursor = CURSOR_POINTER;
          return;
      }

      const modelElement = stateRef.current.elements.find(el => el.id === elementId);
      if (!modelElement) return;

      const finalModelProps = calculateNewModelPosition(konvaNode, stateRef.current.elements);

      if (Object.keys(finalModelProps).length > 0) {
        dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementId, props: finalModelProps, skipHistory: false } });
      }

      if (transformerRef.current?.nodes().includes(konvaNode)) {
        transformerRef.current.show();
      }
      mainLayerRef.current?.batchDraw();
      if (stageRefInternal.current) stageRefInternal.current.container().style.cursor = CURSOR_GRAB;
      dragContextRef.current = { isCtrlDrag: false, elementId: null, isTransforming: false, draggedKonvaNode: null };
  }, [dispatch, calculateNewModelPosition]);

  const handleKonvaTransformStartInternal = useCallback(() => {
    dragContextRef.current.isTransforming = true;
    if (stageRefInternal.current) stageRefInternal.current.container().style.cursor = CURSOR_GRABBING;
  }, []);

  const handleKonvaTransformInternal = useCallback((e: Konva.KonvaEventObject<Event>) => {
  }, []);

  const handleKonvaTransformEndInternal = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const konvaNode = e.target as Konva.Node;
    const elementId = konvaNode.id();
    const originalModelElement = stateRef.current.elements.find(el => el.id === elementId);

    if (!originalModelElement) {
        if (stageRefInternal.current) stageRefInternal.current.container().style.cursor = CURSOR_GRAB;
        dragContextRef.current.isTransforming = false;
        return;
    }

    const propsToUpdate: Partial<SVGElementData> & TransformableProps = {};
    const konvaX = konvaNode.x() ?? 0;
    const konvaY = konvaNode.y() ?? 0;
    const konvaRotation = parseFloat(konvaNode.rotation().toFixed(2));
    const konvaScaleX = parseFloat(konvaNode.scaleX().toFixed(3));
    const konvaScaleY = parseFloat(konvaNode.scaleY().toFixed(3));

    propsToUpdate.rotation = konvaRotation;

    if (originalModelElement.type === 'rect' || originalModelElement.type === 'image') {
        const nodeAsShape = konvaNode as Konva.Rect | Konva.Image;
        const currentIntrinsicWidth = nodeAsShape.width() ?? 0;
        const currentIntrinsicHeight = nodeAsShape.height() ?? 0;

        const newVisualWidth = currentIntrinsicWidth * konvaScaleX;
        const newVisualHeight = currentIntrinsicHeight * konvaScaleY;

        propsToUpdate.width = parseFloat(newVisualWidth.toFixed(2));
        propsToUpdate.height = parseFloat(newVisualHeight.toFixed(2));

        propsToUpdate.x = konvaX - newVisualWidth / 2;
        propsToUpdate.y = konvaY - newVisualHeight / 2;

    } else if (originalModelElement.type === 'circle') {
        const ellipseNode = konvaNode as Konva.Ellipse;
        const currentIntrinsicRadiusX = ellipseNode.radiusX() ?? 0;
        const currentIntrinsicRadiusY = ellipseNode.radiusY() ?? 0;

        const newVisualRadiusX = currentIntrinsicRadiusX * konvaScaleX;
        const newVisualRadiusY = currentIntrinsicRadiusY * konvaScaleY;

        propsToUpdate.rx = parseFloat(newVisualRadiusX.toFixed(3));
        propsToUpdate.ry = parseFloat(newVisualRadiusY.toFixed(3));
        if(propsToUpdate.rx === propsToUpdate.ry) {
            propsToUpdate.r = propsToUpdate.rx;
        } else {
            propsToUpdate.r = undefined;
        }

        propsToUpdate.x = konvaX;
        propsToUpdate.y = konvaY;

    } else if (originalModelElement.type === 'text') {
        const textNode = konvaNode as Konva.Text;
        const modelWidth = (originalModelElement as TextElementProps).width;
        const baseWidthForScaling = modelWidth !== undefined ? modelWidth : textNode.width();

        const modelHeight = (originalModelElement as TextElementProps).height;
        const baseHeightForScaling = modelHeight !== undefined ? modelHeight : textNode.height();

        const newVisualWidth = baseWidthForScaling * konvaScaleX;
        const newVisualHeight = baseHeightForScaling * konvaScaleY;

        if ((originalModelElement as TextElementProps).width !== undefined) {
            propsToUpdate.width = parseFloat(newVisualWidth.toFixed(2));
        }
        if ((originalModelElement as TextElementProps).height !== undefined) {
            propsToUpdate.height = parseFloat(newVisualHeight.toFixed(2));
        }

        propsToUpdate.rotation = konvaRotation;
        propsToUpdate.x = konvaX - newVisualWidth / 2;
        propsToUpdate.y = konvaY - newVisualHeight / 2;

    } else { // Path, Group
        const newModelScale = parseFloat(((konvaScaleX + konvaScaleY) / 2.0 || 0.001).toFixed(3));
        propsToUpdate.scale = newModelScale;

        propsToUpdate.x = konvaX;
        propsToUpdate.y = konvaY;
    }

    dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementId, props: propsToUpdate, skipHistory: false } });

    mainLayerRef.current?.batchDraw();
    if (stageRefInternal.current) stageRefInternal.current.container().style.cursor = CURSOR_GRAB;
    dragContextRef.current.isTransforming = false;

  }, [dispatch]);


  const handleNodeDblClickInContainer = useCallback((e: Konva.KonvaEventObject<MouseEvent>, konvaNode: Konva.Node) => {
    const stage = stageRefInternal.current;
    if (stage) {
        stage.setPointersPositions(e.evt);
    }

    let elementId = konvaNode.id().replace('-hitbox', '').replace('-bg-hittarget','');
    let clickedElementModel = stateRef.current.elements.find(el => el.id === elementId);

    if ((!clickedElementModel || clickedElementModel.type === 'group') && stage) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
            const intersections = stage.getAllIntersections(pointerPos);
            const fallbackNode = intersections.find(node => {
                const nodeId = node.id();
                if (!nodeId || nodeId === artboardProp.id) return false;
                if (node.name() === 'group-hit-background') return false;
                return !!stateRef.current.elements.find(el => el.id === nodeId.replace('-hitbox','').replace('-bg-hittarget',''));
            });
            if (fallbackNode) {
                elementId = fallbackNode.id().replace('-hitbox', '').replace('-bg-hittarget','');
                clickedElementModel = stateRef.current.elements.find(el => el.id === elementId);
            }
        }
    }

    if (!clickedElementModel) return;
    onDblClickAppProp(e, elementId, clickedElementModel);

  }, [onDblClickAppProp, artboardProp.id]);


  const handleKonvaPointerDownKonva = useCallback((e: Konva.KonvaEventObject<PointerEvent>, elementIdFromNodeArgument: string) => {
    const { elements: currentElementsFromState, onCanvasTextEditor: currentEditorState, motionPathSelectionTargetElementId: currentMotionTargetId, textOnPathSelectionTargetElementId: currentTextPathTargetId } = stateRef.current;

    const actualElementId = elementIdFromNodeArgument.replace('-hitbox', '').replace('-bg-hittarget','');
    const clickedElementModel = currentElementsFromState.find(el => el.id === actualElementId);

    // --- Path Assignment Logic ---
    if (currentMotionTargetId) {
      if (clickedElementModel && ['path', 'rect', 'circle'].includes(clickedElementModel.type)) {
        dispatch({ type: 'ASSIGN_MOTION_PATH', payload: { elementId: currentMotionTargetId, pathId: clickedElementModel.id } });
        e.evt.preventDefault(); e.cancelBubble = true; return;
      } else {
        dispatch({ type: 'SET_MOTION_PATH_SELECTION_TARGET', payload: null });
      }
    } else if (currentTextPathTargetId) {
      if (clickedElementModel && ['path', 'rect', 'circle'].includes(clickedElementModel.type)) {
        dispatch({ type: 'ASSIGN_TEXT_PATH', payload: { textElementId: currentTextPathTargetId, pathElementId: clickedElementModel.id }});
        e.evt.preventDefault(); e.cancelBubble = true; return;
      } else {
        dispatch({ type: 'SET_TEXT_ON_PATH_SELECTION_TARGET', payload: null });
      }
    }


    if (currentEditorState?.isVisible) {
        let clickedOnTextEditor = false;
        if (e.evt.target instanceof HTMLElement) {
            clickedOnTextEditor = e.evt.target.classList.contains('on-canvas-text-editor');
        }
        if (!clickedOnTextEditor) {
             const editor = currentEditorState!;
             const textElementModel = currentElementsFromState.find(el => el.id === editor.elementId) as TextElementProps | undefined;
             const konvaNode = elementNodeMapRefInternal.current.get(editor.elementId) as Konva.Text | undefined;
             let finalWidth = editor.width; let finalHeight = editor.height;
             if (textElementModel && konvaNode) {
                 const absScaleX = konvaNode.getAbsoluteScale().x; const absScaleY = konvaNode.getAbsoluteScale().y;
                 finalWidth = absScaleX !== 0 ? editor.width / absScaleX : editor.width;
                 finalHeight = absScaleY !== 0 ? editor.height / absScaleY : editor.height;
             }
             dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: editor.elementId, props: { text: editor.text || "\u200B", width: finalWidth, height: finalHeight } } });
             dispatch({ type: 'HIDE_ON_CANVAS_TEXT_EDITOR' });
             dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
        } else {
            return;
        }
    }

    if (isPanningKonvaRef.current || isPanToolActiveState) {
        return;
    }
    const stage = stageRefInternal.current;
    if (stage && e.evt instanceof PointerEvent) {
        stage.setPointersPositions(e.evt);
    }
    const pointerPos = stage?.getPointerPosition();
    if (!pointerPos) {
        console.warn("KonvaCanvasContainer: Could not get pointer position on pointerdown.");
        return;
    }

    const {
        currentTool: toolFromState,
        isDrawingBezierPath: isDrawingBezierPathFromState,
        isExtendingPathInfo: isExtendingPathInfoFromState,
        currentBezierPathData: currentBezierPathDataFromState,
        selectedElementId: currentSelectedIdFromState,
        selectedBezierPointId: currentSelectedBezierPointId,
        activeControlPoint: currentActiveControlPoint,
    } = stateRef.current;

    const artboardRelPos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);
    const isCtrlPressedFromEvent = e.evt.ctrlKey || e.evt.metaKey;
    const targetIsBackground = actualElementId === artboardProp.id;

    if (toolFromState === 'pencil') {
        dispatch({ type: 'START_DRAWING_PATH', payload: { x: artboardRelPos.x, y: artboardRelPos.y } });
        e.evt.preventDefault();
        e.cancelBubble = true;
        return;
    }

    if (toolFromState === 'bezierPath') {
        e.evt.preventDefault(); e.cancelBubble = true;

        if (isDrawingBezierPathFromState) { // Includes when isExtendingPathInfo is also set
            let doClosePath = false;
            const pathDataForClosingCheck = currentBezierPathDataFromState;

            const allowCloseCheck = !isExtendingPathInfoFromState ||
                                    (isExtendingPathInfoFromState && pathDataForClosingCheck && pathDataForClosingCheck.structuredPoints &&
                                     pathDataForClosingCheck.structuredPoints.length > (currentElementsFromState.find(el => el.id === isExtendingPathInfoFromState.originalPathId) as PathElementProps).structuredPoints!.length);

            if (allowCloseCheck && pathDataForClosingCheck?.structuredPoints && pathDataForClosingCheck.structuredPoints.length > 1) {
                const firstPointToCloseTo = isExtendingPathInfoFromState && isExtendingPathInfoFromState.extendingFromStart && currentElementsFromState.find(el => el.id === isExtendingPathInfoFromState.originalPathId)
                    ? (currentElementsFromState.find(el => el.id === isExtendingPathInfoFromState.originalPathId) as PathElementProps).structuredPoints![0]
                    : pathDataForClosingCheck.structuredPoints[0];

                if (firstPointToCloseTo) {
                    const pathTransform = pathDataForClosingCheck;
                    let localClickX = artboardRelPos.x - (pathTransform.x || 0);
                    let localClickY = artboardRelPos.y - (pathTransform.y || 0);
                    const scale = pathTransform.scale || 1; const rotation = pathTransform.rotation || 0;
                    if (scale !== 0 && scale !== 1) { localClickX /= scale; localClickY /= scale; }
                    if (rotation !== 0) {
                        const angleRad = -rotation * (Math.PI / 180); const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
                        const rotatedX = localClickX * cosA - localClickY * sinA; const rotatedY = localClickX * sinA + localClickY * cosA;
                        localClickX = rotatedX; localClickY = rotatedY;
                    }
                    const stageZoom = stageRefInternal.current?.scaleX() || 1;
                    const distToFirst = Math.sqrt(Math.pow(localClickX - firstPointToCloseTo.x, 2) + Math.pow(localClickY - firstPointToCloseTo.y, 2));
                    if (distToFirst < BEZIER_CLOSING_THRESHOLD / stageZoom) {
                        doClosePath = true;
                    }
                }
            }
            if (doClosePath) {
                dispatch({ type: 'FINISH_DRAWING_BEZIER_PATH', payload: { closedByJoining: true, isDoubleClickEvent: false } });
            } else {
                dispatch({ type: 'ADD_BEZIER_PATH_POINT', payload: { x: artboardRelPos.x, y: artboardRelPos.y, dragPull: true } });
                isDraggingOutHandleRef.current = true;
            }
        } else {
            const selectedPathModel = currentElementsFromState.find(el => el.id === currentSelectedIdFromState && el.type === 'path') as PathElementProps | undefined;
            const isEditingExistingEditablePath = selectedPathModel && selectedPathModel.structuredPoints;

            if (isEditingExistingEditablePath) {
                if (targetIsBackground || (clickedElementModel && actualElementId !== selectedPathModel.id)) {
                    dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
                    dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: targetIsBackground ? null : actualElementId });
                    if (currentSelectedBezierPointId || currentActiveControlPoint) {
                        dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: selectedPathModel.id, pointId: null } });
                        dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
                    }
                    return;
                } else if (actualElementId === selectedPathModel.id) {
                    if (isCtrlPressedFromEvent) {
                        const konvaPathNode = elementNodeMapRefInternal.current.get(selectedPathModel.id) as Konva.Path | undefined;
                        if (konvaPathNode && selectedPathModel.structuredPoints && selectedPathModel.structuredPoints.length >= (selectedPathModel.closedByJoining ? 1 : 2)) {
                            const invTransform = konvaPathNode.getAbsoluteTransform().copy().invert();
                            if (!invTransform) return;
                            const localClickPos = invTransform.point(pointerPos);
                            let closestSegIndex = -1; let closestTVal = -1; let minDistToSegmentSq = Infinity;
                            const pathPoints = selectedPathModel.structuredPoints;
                            const numSegments = selectedPathModel.closedByJoining ? pathPoints.length : pathPoints.length - 1;

                            for (let i = 0; i < numSegments; i++) {
                                const pStart = pathPoints[i]; const pEnd = pathPoints[(i + 1) % pathPoints.length];
                                const tOnSeg = getClosestTOnBezierSegment(
                                    {x:pStart.x,y:pStart.y}, {x:pStart.h2x??pStart.x,y:pStart.h2y??pStart.y},
                                    {x:pEnd.h1x??pEnd.x,y:pEnd.h1y??pEnd.y}, {x:pEnd.x,y:pEnd.y}, localClickPos
                                );
                                const mt=1-tOnSeg,t=tOnSeg;
                                const bx=mt**3*pStart.x+3*mt**2*t*(pStart.h2x??pStart.x)+3*mt*t**2*(pEnd.h1x??pEnd.x)+t**3*pEnd.x;
                                const by=mt**3*pStart.y+3*mt**2*t*(pStart.h2y??pStart.y)+3*mt*t**2*(pEnd.h1y??pEnd.y)+t**3*pEnd.y;
                                const distSq=(bx-localClickPos.x)**2+(by-localClickPos.y)**2;
                                const effectiveHitStrokeWidth = konvaPathNode.hitStrokeWidth() || PATH_HITBOX_EXTRA_WIDTH;
                                const effectiveScaleX = konvaPathNode.getAbsoluteScale().x || 1;
                                const thresholdBase = (effectiveHitStrokeWidth / 2) / effectiveScaleX;
                                const clickThresholdInLocalUnitsSq = thresholdBase ** 2;

                                if(distSq<minDistToSegmentSq && distSq < clickThresholdInLocalUnitsSq * 2){
                                    minDistToSegmentSq=distSq;closestSegIndex=i;closestTVal=tOnSeg;
                                }
                            }
                            if (closestSegIndex !== -1 && closestTVal >= 0 && closestTVal <= 1 && pathPoints.length > 0) {
                               const {newPoint}=splitBezierSegment(pathPoints[closestSegIndex],pathPoints[(closestSegIndex+1)%pathPoints.length],closestTVal);
                               dispatch({type:'ADD_BEZIER_POINT_TO_SEGMENT',payload:{pathId:selectedPathModel.id,newPoint,insertAtIndex:closestSegIndex+1}});
                               return;
                            }
                        }
                    }
                    return;
                }
            } else {
                dispatch({ type: 'START_DRAWING_BEZIER_PATH', payload: { x: artboardRelPos.x, y: artboardRelPos.y } });
                isDraggingOutHandleRef.current = true;
                return;
            }
        }
        return;
    }

    let finalTargetIdForSelectionLogic: string;
    let selectionDecisionMade = false;

    if (isCtrlPressedFromEvent && !targetIsBackground) {
        finalTargetIdForSelectionLogic = actualElementId; // Deep select
        selectionDecisionMade = true;
    } else if (targetIsBackground) {
        finalTargetIdForSelectionLogic = artboardProp.id; // Artboard select
        selectionDecisionMade = true;
    } else {
        // Normal click on an element (not background, not ctrl)
        finalTargetIdForSelectionLogic = getOutermostGroupId(actualElementId, currentElementsFromState); // Group select
        selectionDecisionMade = true;
    }

    // Only proceed if a selection decision was relevant for this click
    if (selectionDecisionMade) {
        const shouldDispatchSelection =
            (finalTargetIdForSelectionLogic !== currentSelectedIdFromState) ||
            (!targetIsBackground && !isCtrlPressedFromEvent && actualElementId === finalTargetIdForSelectionLogic);

        if (shouldDispatchSelection) {
            dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: finalTargetIdForSelectionLogic });
        }
        e.cancelBubble = true; // Stop event bubbling after a selection decision
    }


    if (toolFromState === 'select' && (stateRef.current.selectedBezierPointId || stateRef.current.activeControlPoint)) {
        const pathIdForClear = stateRef.current.activeControlPoint?.pathId ||
                             (currentSelectedIdFromState && currentElementsFromState.find(el => el.id === currentSelectedIdFromState)?.type === 'path' ? currentSelectedIdFromState : '') ||
                             '';
        // Use finalTargetIdForSelectionLogic for comparison, as currentSelectedIdFromState might be stale if a dispatch just happened
        const newSelectedIdAfterPossibleDispatch = selectionDecisionMade ? finalTargetIdForSelectionLogic : currentSelectedIdFromState;
        if (pathIdForClear && (pathIdForClear !== newSelectedIdAfterPossibleDispatch || newSelectedIdAfterPossibleDispatch === artboardProp.id)) {
             dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: pathIdForClear, pointId: null } });
             dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
        }
    }
  }, [
    artboardProp.id, dispatch,
    getArtboardRelativeCoords, onAddElement, activateOnCanvasTextEditor,
    stateRef
  ]);

  const handleBezierPointPointerDownKonva = useCallback((e: Konva.KonvaEventObject<PointerEvent>, pathId: string, pointId: string, handleType: 'anchor' | 'h1' | 'h2') => {
    e.evt.preventDefault(); e.cancelBubble = true;
    const stage = stageRefInternal.current; if (!stage) return;
    stage.setPointersPositions(e.evt);

    const localElements = stateRef.current.elements;
    const localCurrentBezierPathData = stateRef.current.currentBezierPathData;
    const localIsDrawingBezierPath = stateRef.current.isDrawingBezierPath;
    const localIsExtendingPathInfo = stateRef.current.isExtendingPathInfo;
    const localEditingKeyframeShapePreview = stateRef.current.editingKeyframeShapePreview;
    const isCtrlPressedFromEvent = e.evt.ctrlKey || e.evt.metaKey;
    const isAltPressedFromEvent = e.evt.altKey;
    const isShiftPressedFromEvent = e.evt.shiftKey;

    let pathDataForOp: PathElementProps | undefined;
    const animatedPathElement = elementsProp.find(el => el.id === pathId && el.type === 'path') as PathElementProps | undefined;
    const rawPathElementFromState = localElements.find(el => el.id === pathId && el.type === 'path') as PathElementProps | undefined;

    if (localIsDrawingBezierPath && localCurrentBezierPathData?.id === pathId) {
        pathDataForOp = localCurrentBezierPathData;
    } else if (localIsExtendingPathInfo && localIsExtendingPathInfo.originalPathId === pathId && localCurrentBezierPathData) {
        pathDataForOp = localCurrentBezierPathData;
    } else if (localEditingKeyframeShapePreview && localEditingKeyframeShapePreview.pathId === pathId) {
        pathDataForOp = { ...(rawPathElementFromState || animatedPathElement || {} as PathElementProps), id: pathId, type: 'path', structuredPoints: localEditingKeyframeShapePreview.points };
    } else if (animatedPathElement && Array.isArray(animatedPathElement.d)) {
        pathDataForOp = { ...animatedPathElement, structuredPoints: animatedPathElement.d as BezierPoint[] };
    } else if (rawPathElementFromState?.structuredPoints) {
        pathDataForOp = { ...rawPathElementFromState, ...animatedPathElement };
    } else {
        pathDataForOp = animatedPathElement;
    }


    if (!pathDataForOp || !pathDataForOp.structuredPoints) return;
    const pointForOp = pathDataForOp.structuredPoints.find(p=>p.id === pointId); if (!pointForOp) return;

    const pointerPos = stage?.getPointerPosition(); if (!pointerPos) return;
    const artboardRelPos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);

    const isEndpoint = pointForOp.id === pathDataForOp.structuredPoints[0]?.id || pointForOp.id === pathDataForOp.structuredPoints[pathDataForOp.structuredPoints.length - 1]?.id;
    if (stateRef.current.currentTool === 'bezierPath' && !localIsDrawingBezierPath && pathDataForOp && !pathDataForOp.closedByJoining && isEndpoint && handleType === 'anchor' && !stateRef.current.activeControlPoint && !isAltPressedFromEvent && !isCtrlPressedFromEvent && !localIsExtendingPathInfo) {
        dispatch({ type: 'START_EXTENDING_BEZIER_PATH', payload: { pathId, pointIdToExtendFrom: pointId } });
        return;
    }

    if (isAltPressedFromEvent && handleType !== 'anchor') {
        dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: { pathId, pointId, handleType, keyframeTime: (editingKeyframeShapePreview && editingKeyframeShapePreview.pathId === pathId) ? editingKeyframeShapePreview.time : undefined } });
        return;
    }
    if (isAltPressedFromEvent && handleType === 'anchor') {
        dispatch({ type: 'DELETE_BEZIER_POINT', payload: { pathId, pointId }});
        return;
    }
    if (isCtrlPressedFromEvent && !isAltPressedFromEvent && handleType === 'anchor') {
        const targetIsSmooth = !pointForOp.isSmooth;
        dispatch({ type: 'UPDATE_BEZIER_POINT_TYPE', payload: { pathId, pointId, isSmooth: targetIsSmooth, ctrlPressed: true, altPressed: false }});
        dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId, pointId }});
        return;
    }

    dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId, pointId }});
    dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: { pathId, pointId, handleType, keyframeTime: (editingKeyframeShapePreview && editingKeyframeShapePreview.pathId === pathId) ? editingKeyframeShapePreview.time : undefined }});
  }, [dispatch, getArtboardRelativeCoords, elementsProp, editingKeyframeShapePreview, stateRef]);


  useLayoutEffect(() => {
    if (containerRef.current && !stageRefInternal.current) {
      const initialContainerWidth = containerRef.current.clientWidth;
      const initialContainerHeight = containerRef.current.clientHeight;
      stageRefInternal.current = new Konva.Stage({
        container: containerRef.current,
        width: initialContainerWidth > 0 ? initialContainerWidth : 300,
        height: initialContainerHeight > 0 ? initialContainerHeight : 150,
        draggable: false,
      });

      mainLayerRef.current = new Konva.Layer({ name: 'mainElementsLayer' });
      stageRefInternal.current.add(mainLayerRef.current);

      effectsLayerRef.current = new Konva.Layer({ name: 'effectsOverlayLayer' });
      stageRefInternal.current.add(effectsLayerRef.current);


      artboardGroupRef.current = new Konva.Group({
        id: `${artboardProp.id}-konva-artboard-group`,
        name: 'artboard-konva-group',
        listening: true,
        x: 0,
        y: 0,
      });
      mainLayerRef.current.add(artboardGroupRef.current);
      artboardGroupRef.current.on('pointerdown.artboardBg', (evt) => {
        if (evt.target === artboardGroupRef.current) {
          handleKonvaPointerDownKonva(evt, artboardProp.id);
        }
      });


      transformerRef.current = new Konva.Transformer({
        nodes: [],
        borderStroke: '#00A8FF',
        borderStrokeWidth: 1.0,
        anchorStroke: '#00A8FF',
        anchorFill: '#FFF',
        anchorSize: TRANSFORM_HANDLE_SIZE,
        rotateAnchorOffset: TRANSFORM_ROTATION_HANDLE_OFFSET,
        padding: 0,
        ignoreStroke: true,
        rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
        resizeEnabled: true,
        dragBoundFunc: (pos) => pos,
      });
      mainLayerRef.current.add(transformerRef.current);
    }
    return () => {
        transformerRef.current?.off('transformstart.container');
        transformerRef.current?.off('transform.container');
        transformerRef.current?.off('transformend.container');
        artboardGroupRef.current?.off('pointerdown.artboardBg');
    }
  }, [artboardProp.id, handleKonvaPointerDownKonva, handleKonvaTransformStartInternal, handleKonvaTransformInternal, handleKonvaTransformEndInternal]);

  useEffect(() => {
    initialSetupDoneRef.current = false;
  }, [artboardProp.width, artboardProp.height]);

  const performResetView = useCallback(() => {
    const stage = stageRefInternal.current;
    const container = containerRef.current;
    if (!stage || !container || !artboardProp) return;

    const currentContainerWidth = container.clientWidth;
    const currentContainerHeight = container.clientHeight;
    if (currentContainerWidth <= 0 || currentContainerHeight <= 0) return;

    const artboardW = artboardProp.width > 0 ? artboardProp.width : 1;
    const artboardH = artboardProp.height > 0 ? artboardProp.height : 1;

    const scaleToFitX = (currentContainerWidth * 0.95) / artboardW;
    const scaleToFitY = (currentContainerHeight * 0.95) / artboardH;
    let newStageScale = Math.min(scaleToFitX, scaleToFitY);
    if (!Number.isFinite(newStageScale) || newStageScale <= 0.01) newStageScale = 0.1;

    stage.scale({ x: newStageScale, y: newStageScale });
    setStageScale(newStageScale);

    const artboardContentCenterX = artboardW / 2;
    const artboardContentCenterY = artboardH / 2;

    const newStageX = (currentContainerWidth / 2) - (artboardContentCenterX * newStageScale);
    const newStageY = (currentContainerHeight / 2) - (artboardContentCenterY * newStageScale);

    stage.position({ x: newStageX, y: newStageY });
    stage.batchDraw();
  }, [artboardProp, stageRefInternal, containerRef, setStageScale]);


  useLayoutEffect(() => {
    const stage = stageRefInternal.current;
    const layer = mainLayerRef.current;
    const artboardGrp = artboardGroupRef.current;
    const container = containerRef.current;

    if (!stage || !layer || !artboardGrp || !artboardProp) {
        return;
    }

    if (artboardGrp.x() !== 0 || artboardGrp.y() !== 0) {
        artboardGrp.x(0);
        artboardGrp.y(0);
    }

    artboardGrp.clipFunc(undefined);


    const updateDrawingSurface = () => {
        if (!container) return;
        const currentContainerWidth = container.clientWidth;
        const currentContainerHeight = container.clientHeight;

        if (currentContainerWidth <= 0 || currentContainerHeight <= 0) return;

        stage.width(currentContainerWidth);
        stage.height(currentContainerHeight);

        if (!initialSetupDoneRef.current) {
            performResetView();
            initialSetupDoneRef.current = true;
        }

        let visualBgRect = artboardGrp.findOne(`#${artboardProp.id}-konva-visual-bg`) as Konva.Rect | undefined;
        if (!visualBgRect) {
            visualBgRect = new Konva.Rect({
                id: `${artboardProp.id}-konva-visual-bg`,
                name: 'artboard-visual-background-rect',
                listening: false,
            });
            artboardGrp.add(visualBgRect);
        }
        const currentStageZoom = stage.scaleX();
        const strokeScaleFactor = currentStageZoom !== 0 ? 1 / currentStageZoom : 1;

        visualBgRect.setAttrs({
            x: 0, y: 0,
            width: artboardProp.width, height: artboardProp.height,
            fill: artboardProp.backgroundColor || 'transparent',
            stroke: '#4A5568',
            strokeWidth: 1.5 * strokeScaleFactor,
        });
        visualBgRect.moveToBottom();

        if (transformerRef.current) {
            transformerRef.current.borderStrokeWidth(1.0);
            transformerRef.current.anchorSize(TRANSFORM_HANDLE_SIZE);
            transformerRef.current.rotateAnchorOffset(TRANSFORM_ROTATION_HANDLE_OFFSET);
        }
        layer.batchDraw();
        effectsLayerRef.current?.batchDraw();
    };

    const observer = new ResizeObserver(updateDrawingSurface);
    if (container) observer.observe(container);

    updateDrawingSurface();

    return () => {
        if (container) observer.unobserve(container);
    };
  }, [handleKonvaPointerDownKonva, artboardProp, performResetView]);


  useEffect(() => {
    const tr = transformerRef.current;
    const currentMainLayer = mainLayerRef.current;
    const stage = stageRefInternal.current;

    if (!tr || !currentMainLayer || !stage) return;

    let nodeToAttach: Konva.Node | undefined;
    const selectedModelElement = elementsProp.find(el => el.id === selectedElementIdProp);

    const isBezierPointEditing = currentTool === 'bezierPath' &&
                                 selectedModelElement &&
                                 selectedModelElement.type === 'path' &&
                                 ((selectedModelElement as PathElementProps).structuredPoints || editingKeyframeShapePreview?.pathId === selectedModelElement.id) &&
                                 (selectedBezierPointId || activeControlPoint);

    if (isBezierPointEditing) {
        tr.nodes([]);
    } else if (selectedElementIdProp && selectedElementIdProp !== artboardProp.id) {
        nodeToAttach = elementNodeMapRefInternal.current.get(selectedElementIdProp);
        if (nodeToAttach && nodeToAttach.getLayer() && nodeToAttach.getStage() && nodeToAttach.visible()) {
            if (!tr.nodes().includes(nodeToAttach)) {
                 tr.nodes([nodeToAttach]);
            }
            tr.borderStrokeWidth(1.0);
            tr.anchorSize(TRANSFORM_HANDLE_SIZE);
            tr.rotateAnchorOffset(TRANSFORM_ROTATION_HANDLE_OFFSET);

            if (selectedModelElement && (selectedModelElement.type === 'circle' || selectedModelElement.type === 'text')) {
                tr.keepRatio(stateRef.current.isShiftPressed);
            } else {
                tr.keepRatio(true);
            }

        } else {
            tr.nodes([]);
        }
    } else {
      tr.nodes([]);
    }
    currentMainLayer.batchDraw();
  }, [selectedElementIdProp, elementsProp, artboardProp.id, stageScale, stateRef.current.isShiftPressed, currentTool, selectedBezierPointId, activeControlPoint, editingKeyframeShapePreview]);


  useEffect(() => {
    let newCursor = CURSOR_DEFAULT;
    if (isPanToolActiveState) {
      newCursor = CURSOR_GRAB;
    } else if (currentTool === 'pencil' || (currentTool === 'bezierPath' && (isDrawingBezierPath || isExtendingPathInfo))) {
      newCursor = CURSOR_CROSSHAIR;
    } else if (currentTool === 'bezierPath') {
      newCursor = CURSOR_CROSSHAIR;
    } else if (currentTool === 'text') {
      newCursor = CURSOR_TEXT_DEFAULT;
    }
    setDefaultToolCursor(newCursor);

    if (stageRefInternal.current && !isPanningKonvaRef.current && !dragContextRef.current.isTransforming && !dragContextRef.current.elementId && stageRefInternal.current.container().style.cursor !== CURSOR_PEN_ADD ) {
        stageRefInternal.current.container().style.cursor = newCursor;
    }
  }, [currentTool, isDrawingBezierPath, isExtendingPathInfo, isPanToolActiveState]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const localIsCtrlPressed = e.ctrlKey || e.metaKey;
        const localIsAltPressed = e.altKey;
        const localIsShiftPressed = e.shiftKey;

        if(localIsCtrlPressed !== stateRef.current.isCtrlPressed) dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Control', pressed: localIsCtrlPressed } });
        if(localIsAltPressed !== stateRef.current.isAltPressed) dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Alt', pressed: localIsAltPressed } });
        if(localIsShiftPressed !== stateRef.current.isShiftPressed) dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Shift', pressed: localIsShiftPressed } });


      if (e.code === 'Space' && !isPanningKonvaRef.current && stageRefInternal.current &&
          !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) &&
          !stateRef.current.onCanvasTextEditor?.isVisible
         ) {
          stageRefInternal.current.draggable(true);
          isPanningKonvaRef.current = true;
          stageRefInternal.current.container().style.cursor = CURSOR_GRAB;
          e.preventDefault();
      }
      if (e.key === 'Escape' && currentTool === 'bezierPath') {
        if (activeControlPoint) dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
        else if (isDrawingBezierPath) dispatch({ type: 'CANCEL_DRAWING_BEZIER_PATH' });
        else if (selectedBezierPointId) dispatch({ type: 'SELECT_BEZIER_POINT', payload: { pathId: selectedElementIdProp || '', pointId: null }});
        else if (selectedElementIdProp && selectedElementIdProp !== artboardProp.id) {
            dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: artboardProp.id });
            dispatch({ type: 'SET_CURRENT_TOOL', payload: 'select' });
        }
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Control' || e.key === 'Meta') dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Control', pressed: false } });
        if (e.key === 'Alt') dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Alt', pressed: false } });
        if (e.key === 'Shift') dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Shift', pressed: false } });

      if (e.code === 'Space') {
          if (stageRefInternal.current && !isPanToolActiveState) {
            stageRefInternal.current.draggable(false);
            stageRefInternal.current.container().style.cursor = defaultToolCursor;
          }
          isPanningKonvaRef.current = false;
      }
    };
    const handleWindowBlur = () => {
        if (isPanningKonvaRef.current && stageRefInternal.current) {
            stageRefInternal.current.draggable(false);
            if (!isPanToolActiveState) {
                 stageRefInternal.current.container().style.cursor = defaultToolCursor;
            }
            isPanningKonvaRef.current = false;
        }
        dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Control', pressed: false } });
        dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Alt', pressed: false } });
        dispatch({ type: 'SET_KEY_MODIFIER_STATE', payload: { key: 'Shift', pressed: false } });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [defaultToolCursor, dispatch, currentTool, activeControlPoint, isDrawingBezierPath, selectedBezierPointId, selectedElementIdProp, artboardProp.id, isPanToolActiveState]);


  useEffect(() => {
    const stage = stageRefInternal.current;
    if (!stage) return;

    const handleStagePointerMoveKonva = (e: Konva.KonvaEventObject<PointerEvent>) => {
        const pointerPos = stage.getPointerPosition(); if (!pointerPos) return;

        if (stateRef.current.isDrawing && stateRef.current.currentDrawingPath && stateRef.current.currentTool === 'pencil') {
            const artboardRelPencilPos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);
            dispatch({ type: 'UPDATE_DRAWING_PATH', payload: { x: artboardRelPencilPos.x, y: artboardRelPencilPos.y } });
        } else if (stateRef.current.currentTool === 'bezierPath' && isDraggingOutHandleRef.current && stateRef.current.currentBezierPathData?.structuredPoints?.length) {
            const { pathId, pointId, handleType } = stateRef.current.activeControlPoint || {};
            const currentPathData = stateRef.current.currentBezierPathData;
            const points = currentPathData.structuredPoints;

            let pointToDrag: BezierPoint;
            const handleTypeToDrag: 'h1' | 'h2' = 'h2';

            if (stateRef.current.isExtendingPathInfo?.extendingFromStart && points[0]) {
              pointToDrag = points[0];
            } else if (points.length > 0) {
              pointToDrag = points[points.length - 1];
            } else return;

            const pathTransform = currentPathData;
            const artboardRelMousePos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);
            let tempX = artboardRelMousePos.x - (pathTransform.x || 0);
            let tempY = artboardRelMousePos.y - (pathTransform.y || 0);
            const scale = pathTransform.scale || 1;
            if (scale !== 0 && scale !== 1) { tempX /= scale; tempY /= scale; }
            const rotation = pathTransform.rotation || 0;
            if (rotation !== 0) {
                const angleRad = -rotation * (Math.PI / 180); const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
                const rotatedX = tempX * cosA - tempY * sinA; const rotatedY = tempX * sinA + tempY * cosA;
                tempX = rotatedX; tempY = rotatedY;
            }

            dispatch({ type: 'MOVE_BEZIER_CONTROL_POINT', payload: {
                pathId: currentPathData.id, pointId: pointToDrag.id, handleType: handleTypeToDrag,
                newLocalX: tempX, newLocalY: tempY,
                skipHistory: true, shiftPressed: e.evt.shiftKey, ctrlPressed: (e.evt.ctrlKey || e.evt.metaKey), altPressed: e.evt.altKey
            }});

        } else if (stateRef.current.activeControlPoint && stateRef.current.currentTool === 'bezierPath') {
            const { pathId, pointId, handleType, keyframeTime } = stateRef.current.activeControlPoint;
            const elements = stateRef.current.elements;
            const currentBezierPath = stateRef.current.currentBezierPathData;
            const isDrawingNewOrExtending = (stateRef.current.isDrawingBezierPath || stateRef.current.isExtendingPathInfo) && currentBezierPath?.id === pathId;

            let localPointerPos: { x: number; y: number };

            if (isDrawingNewOrExtending && currentBezierPath) {
                const artboardRelMousePos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);
                const pathTransform = currentBezierPath;
                let tempX = artboardRelMousePos.x - (pathTransform.x || 0);
                let tempY = artboardRelMousePos.y - (pathTransform.y || 0);
                const scale = pathTransform.scale || 1; if (scale !== 0 && scale !== 1) { tempX /= scale; tempY /= scale; }
                const rotation = pathTransform.rotation || 0;
                if (rotation !== 0) {
                    const angleRad = -rotation * (Math.PI / 180); const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
                    const rotatedX = tempX * cosA - tempY * sinA; const rotatedY = tempX * sinA + tempY * cosA;
                    tempX = rotatedX; tempY = rotatedY;
                }
                localPointerPos = { x: tempX, y: tempY };
            } else {
                const konvaNode = elementNodeMapRefInternal.current.get(pathId);
                if (!konvaNode) { console.warn(`Konva node not found for path ${pathId}`); return; }
                const transform = konvaNode.getAbsoluteTransform().copy().invert();
                if (!transform) { console.warn(`Could not invert transform for ${pathId}`); return; }
                localPointerPos = transform.point(pointerPos);
            }

            dispatch({ type: 'MOVE_BEZIER_CONTROL_POINT', payload: {
                pathId, pointId, handleType, newLocalX: localPointerPos.x, newLocalY: localPointerPos.y,
                keyframeTime, skipHistory: true, shiftPressed: e.evt.shiftKey, ctrlPressed: (e.evt.ctrlKey || e.evt.metaKey), altPressed: e.evt.altKey
            }});
        }

        let newCursorForMove = defaultToolCursor;
        if (stateRef.current.currentTool === 'bezierPath' && (e.evt.ctrlKey || e.evt.metaKey) && stateRef.current.selectedElementId) {
            const selectedPathModel = stateRef.current.elements.find(el => el.id === stateRef.current.selectedElementId && el.type === 'path') as PathElementProps | undefined;
            if (selectedPathModel?.structuredPoints) {
                const konvaPathNode = elementNodeMapRefInternal.current.get(selectedPathModel.id);
                if (konvaPathNode) {
                    const shapeUnderPointer = stage.getIntersection(pointerPos);
                    if (shapeUnderPointer && (shapeUnderPointer.id() === selectedPathModel.id || shapeUnderPointer.id().startsWith(`${selectedPathModel.id}-`))) {
                        newCursorForMove = CURSOR_PEN_ADD;
                    }
                }
            }
        }
        if (stage.container().style.cursor !== newCursorForMove && !isPanningKonvaRef.current && !dragContextRef.current.isTransforming && !dragContextRef.current.elementId ) {
            stage.container().style.cursor = newCursorForMove;
        }
    };

    const handleStagePointerUpKonva = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (stateRef.current.isDrawing && stateRef.current.currentTool === 'pencil') {
          dispatch({ type: 'FINISH_DRAWING_PATH' });
      } else if (stateRef.current.currentTool === 'bezierPath' && isDraggingOutHandleRef.current && stateRef.current.currentBezierPathData?.structuredPoints?.length) {
          isDraggingOutHandleRef.current = false;
          const currentPathData = stateRef.current.currentBezierPathData;
          const points = currentPathData.structuredPoints;

          let pointToFinalizeDrag: BezierPoint;
          const handleTypeToFinalizeDrag: 'h1' | 'h2' = 'h2';

          if (stateRef.current.isExtendingPathInfo?.extendingFromStart && points[0]) pointToFinalizeDrag = points[0];
          else if (points.length > 0) pointToFinalizeDrag = points[points.length - 1];
          else return;

          const pointerPos = stage.getPointerPosition();
          if(pointerPos){
              const artboardRelPos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);
              const pathTransform = currentPathData;
              let tempX = artboardRelPos.x - (pathTransform.x || 0);
              let tempY = artboardRelPos.y - (pathTransform.y || 0);
              const scale = pathTransform.scale || 1; if (scale !== 0 && scale !== 1) { tempX /= scale; tempY /= scale; }
              const rotation = pathTransform.rotation || 0;
              if (rotation !== 0) {
                const angleRad = -rotation * (Math.PI / 180); const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
                const rotatedX = tempX * cosA - tempY * sinA; const rotatedY = tempX * sinA + tempY * cosA;
                tempX = rotatedX; tempY = rotatedY;
              }
              dispatch({ type: 'MOVE_BEZIER_CONTROL_POINT', payload: {
                pathId: currentPathData.id, pointId: pointToFinalizeDrag.id, handleType: handleTypeToFinalizeDrag,
                newLocalX: tempX, newLocalY: tempY,
                skipHistory: false, shiftPressed: e.evt.shiftKey, ctrlPressed: (e.evt.ctrlKey || e.evt.metaKey), altPressed: e.evt.altKey
              }});
          }
      } else if (stateRef.current.activeControlPoint && stateRef.current.currentTool === 'bezierPath') {
          const { pathId, pointId, handleType, keyframeTime } = stateRef.current.activeControlPoint;
          const pointerPos = stage.getPointerPosition();
          if(pointerPos){
              const currentBezierPath = stateRef.current.currentBezierPathData;
              const isDrawingNewOrExtending = (stateRef.current.isDrawingBezierPath || stateRef.current.isExtendingPathInfo) && currentBezierPath?.id === pathId;
              let localPointerPos: { x: number; y: number };

              if (isDrawingNewOrExtending && currentBezierPath) {
                  const artboardRelMousePos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);
                  const pathTransform = currentBezierPath;
                  let tempX = artboardRelMousePos.x - (pathTransform.x || 0);
                  let tempY = artboardRelMousePos.y - (pathTransform.y || 0);
                  const scale = pathTransform.scale || 1; if (scale !== 0 && scale !== 1) { tempX /= scale; tempY /= scale; }
                  const rotation = pathTransform.rotation || 0;
                  if (rotation !== 0) {
                      const angleRad = -rotation * (Math.PI / 180); const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
                      const rotatedX = tempX * cosA - tempY * sinA; const rotatedY = tempX * sinA + tempY * cosA;
                      tempX = rotatedX; tempY = rotatedY;
                  }
                  localPointerPos = { x: tempX, y: tempY };
              } else {
                  const konvaNode = elementNodeMapRefInternal.current.get(pathId);
                  if (!konvaNode) { console.warn(`Konva node not found for path ${pathId}`); return; }
                  const transform = konvaNode.getAbsoluteTransform().copy().invert();
                  if (!transform) { console.warn(`Could not invert transform for ${pathId}`); return; }
                  localPointerPos = transform.point(pointerPos);
              }
              dispatch({ type: 'MOVE_BEZIER_CONTROL_POINT', payload: {
                pathId, pointId, handleType, newLocalX: localPointerPos.x, newLocalY: localPointerPos.y,
                keyframeTime, skipHistory: false, shiftPressed: e.evt.shiftKey, ctrlPressed: (e.evt.ctrlKey || e.evt.metaKey), altPressed: e.evt.altKey
              }});
          }
          dispatch({ type: 'SET_ACTIVE_CONTROL_POINT', payload: null });
      }
    };

    const handleStageDblClickKonvaInternal = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === stage || e.target === artboardGroupRef.current) {
            if (stateRef.current.currentTool === 'bezierPath' && stateRef.current.isDrawingBezierPath && stateRef.current.currentBezierPathData) {
                const points = stateRef.current.currentBezierPathData.structuredPoints; if (!points) return;
                let doClosePath = false;
                if (points.length > 1) {
                    const firstPoint = points[0]; const pointerPos = stage.getPointerPosition();
                    if(pointerPos){
                        const artboardRelPos = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);
                        const pathTransform = stateRef.current.currentBezierPathData;
                        let localClickX = artboardRelPos.x - (pathTransform.x || 0); let localClickY = artboardRelPos.y - (pathTransform.y || 0);
                        const scale = pathTransform.scale || 1; const rotation = pathTransform.rotation || 0;
                        if (scale !== 0 && scale !== 1) { localClickX /= scale; localClickY /= scale; }
                        if (rotation !== 0) { const angleRad = -rotation * (Math.PI / 180); const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad); const rotatedX = localClickX * cosA - localClickY * sinA; const rotatedY = localClickX * sinA + tempY * cosA; localClickX = rotatedX; localClickY = rotatedY;}
                        const stageZoom = stageRefInternal.current?.scaleX() || 1;
                        const distToFirst = Math.sqrt(Math.pow(localClickX - firstPoint.x, 2) + Math.pow(localClickY - firstPoint.y, 2));
                        if (distToFirst < BEZIER_CLOSING_THRESHOLD / stageZoom) doClosePath = true;
                    }
                }
                if (points.length >= 1) {
                     dispatch({ type: 'FINISH_DRAWING_BEZIER_PATH', payload: { closedByJoining: doClosePath, isDoubleClickEvent: true }});
                }
            }
        } else {
            handleNodeDblClickInContainer(e, e.target);
        }
    };

    const handleStageWheelKonva = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      stage.scale({ x: newScale, y: newScale });
      setStageScale(newScale);

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      stage.position(newPos);
      stage.batchDraw();
    };

    const handleStagePointerDownKonvaStageTarget = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (e.target === stage || e.target === artboardGroupRef.current) {
        handleKonvaPointerDownKonva(e, artboardProp.id);
      }
    };

    stage.on('pointermove.containerEvents', handleStagePointerMoveKonva);
    stage.on('pointerup.containerEvents pointercancel.containerEvents', handleStagePointerUpKonva);
    stage.on('dblclick.containerEvents dbltap.containerEvents', handleStageDblClickKonvaInternal);
    stage.on('wheel.containerEvents', handleStageWheelKonva);
    stage.on('pointerdown.stageInteraction', handleStagePointerDownKonvaStageTarget);

    stage.on('dragstart.containerEvents', () => {
        if ((isPanningKonvaRef.current || isPanToolActiveState) && stageRefInternal.current) {
            stageRefInternal.current.container().style.cursor = CURSOR_GRABBING;
        }
    });
    stage.on('dragend.containerEvents', () => {
        if (stageRefInternal.current) {
            stageRefInternal.current.container().style.cursor = (isPanningKonvaRef.current || isPanToolActiveState) ? CURSOR_GRAB : defaultToolCursor;
        }
    });


    return () => {
      stage.off('pointermove.containerEvents');
      stage.off('pointerup.containerEvents pointercancel.containerEvents');
      stage.off('dblclick.containerEvents dbltap.containerEvents');
      stage.off('wheel.containerEvents');
      stage.off('dragstart.containerEvents');
      stage.off('dragend.containerEvents');
      stage.off('pointerdown.stageInteraction');
    };
  }, [dispatch, getArtboardRelativeCoords, artboardProp.id, handleKonvaPointerDownKonva, defaultToolCursor, isPanToolActiveState, handleNodeDblClickInContainer, setStageScale, stateRef]);

  const handleCanvasZoom = (direction: 'in' | 'out') => {
    const stage = stageRefInternal.current;
    if (!stage) return;
    const scaleBy = 1.2;
    const oldScale = stage.scaleX();
    const center = {
        x: stage.width() / 2,
        y: stage.height() / 2,
    };
    const mousePointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
    };
    const newScale = direction === 'out' ? oldScale / scaleBy : oldScale * scaleBy;
    stage.scale({ x: newScale, y: newScale });
    setStageScale(newScale);
    const newPos = {
        x: center.x - mousePointTo.x * newScale,
        y: center.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  };

  const handleTogglePanTool = () => {
    const stage = stageRefInternal.current;
    if (!stage) return;
    const newPanToolActiveState = !isPanToolActiveState;
    setIsPanToolActiveState(newPanToolActiveState);
    stage.draggable(newPanToolActiveState);
    if (newPanToolActiveState) {
        stage.container().style.cursor = CURSOR_GRAB;
    } else {
        stage.container().style.cursor = defaultToolCursor;
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const stage = stageRefInternal.current;
    if (!stage) return;

    try {
        const dataString = e.dataTransfer.getData('application/json');
        if (!dataString) return;
        const { assetId } = JSON.parse(dataString) as { assetId: string };

        stage.setPointersPositions(e);
        const pointerPos = stage.getPointerPosition();
        if (!pointerPos) return;

        const artboardCoords = getArtboardRelativeCoords(pointerPos.x, pointerPos.y);

        dispatch({ type: 'ADD_ASSET_FROM_LIBRARY', payload: { assetId, position: artboardCoords } });
    } catch (error) {
        console.error("Failed to handle drop event:", error);
    }
  };

  useImperativeHandle(ref, () => ({
    zoom: handleCanvasZoom,
    fitToView: performResetView,
  }), [handleCanvasZoom, performResetView]);


  const viewControlsButtonClass = "p-2 glass-button";

  return (
    <div className="w-full h-full relative">
        <div className="absolute top-2 left-3 z-20">
            <Toolbar
                onAddElement={onAddElement}
                onDeleteElement={onDeleteElement}
                artboardIsPresent={artboardIsPresent}
            />
        </div>
      <div 
        ref={containerRef} 
        className="w-full h-full bg-dark-bg-primary overflow-hidden touch-none select-none" 
        style={{ cursor: defaultToolCursor }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <KonvaElementRenderer
          artboard={artboardProp}
          elements={elementsProp}
          initialGradientDefs={initialGradientDefsProp}
          frameSpecificGradientUpdates={frameSpecificGradientUpdatesProp}
          selectedElementIdProp={selectedElementIdProp}
          currentTool={currentTool}
          isDrawingBezierPath={isDrawingBezierPath}
          currentBezierPathData={currentBezierPathData}
          isExtendingPathInfo={isExtendingPathInfo}
          activeControlPoint={activeControlPoint}
          selectedBezierPointId={selectedBezierPointId}
          motionPathSelectionTargetElementId={motionPathSelectionTargetElementId}
          textOnPathSelectionTargetElementId={textOnPathSelectionTargetElementId}
          editingKeyframeShapePreview={editingKeyframeShapePreview}
          isAltPressed={stateRef.current.isAltPressed}
          isCtrlPressed={stateRef.current.isCtrlPressed}
          nodeIsBeingDirectlyDraggedRef={nodeIsBeingDirectlyDraggedRef}
          stageScale={stageScale}
          stageRef={stageRefInternal}
          layerRef={mainLayerRef}
          artboardGroupRef={artboardGroupRef}
          transformerRef={transformerRef}
          elementNodeMapRef={elementNodeMapRefInternal}
          imageNodeCacheRef={imageNodeCacheRef}
          getArtboardRelativeCoords={getArtboardRelativeCoords}
          handleBezierPointPointerDown={handleBezierPointPointerDownKonva}
          handleKonvaPointerDown={handleKonvaPointerDownKonva}
          onDblClick={(e, konvaNode) => handleNodeDblClickInContainer(e, konvaNode)}
          onNodeDragStart={handleKonvaDragStartInternal}
          onNodeDragMove={handleKonvaDragMoveInternal}
          onNodeDragEnd={handleKonvaDragEndInternal}
          onNodeTransformEnd={handleKonvaTransformEndInternal}
        />
        <KonvaDrawingEffects
          currentTool={currentTool}
          isDrawingPencil={isDrawingPencil}
          currentPencilPath={currentPencilPath}
          isDrawingBezierPath={isDrawingBezierPath}
          currentBezierPathData={currentBezierPathData}
          isExtendingPathInfo={isExtendingPathInfo}
          selectedElementId={selectedElementIdProp}
          selectedBezierPointId={selectedBezierPointId}
          elements={elementsProp}
          editingKeyframeShapePreview={editingKeyframeShapePreview}
          stageScale={stageScale}
          stageRef={stageRefInternal}
          effectsLayerRef={effectsLayerRef}
          elementNodeMapRef={elementNodeMapRefInternal}
          handleBezierPointPointerDown={handleBezierPointPointerDownKonva}
        />
      </div>
      <div className="absolute bottom-3 right-3 z-10 glass-panel p-1.5 flex flex-col space-y-1.5">
        <button onClick={() => handleCanvasZoom('in')} className={viewControlsButtonClass} title="Zoom In">
          <ZoomInIcon size={18} />
        </button>
        <button onClick={() => handleCanvasZoom('out')} className={viewControlsButtonClass} title="Zoom Out">
          <ZoomOutIcon size={18} />
        </button>
        <button
          onClick={handleTogglePanTool}
          className={`${viewControlsButtonClass} ${isPanToolActiveState ? 'active' : ''}`}
          title="Toggle Pan Tool (Hold Spacebar to Pan)"
        >
          <PanIcon size={18} />
        </button>
        <button onClick={performResetView} className={viewControlsButtonClass} title="Reset View">
          <ResetViewIcon size={18} />
        </button>
      </div>
    </div>
  );
});

KonvaCanvasContainer.displayName = 'KonvaCanvasContainer';
export default KonvaCanvasContainer;
