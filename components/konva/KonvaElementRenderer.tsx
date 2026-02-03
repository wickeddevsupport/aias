
import React, { useEffect, useCallback, useContext, useRef } from 'react';
import Konva from 'konva';
import { AppContext } from '../../contexts/AppContext'; 
import { 
    SVGElementData, AnySVGGradient, InterpolatedGradientUpdateData, 
    RectElementProps, CircleElementProps, PathElementProps, GroupElementProps, TextElementProps, ImageElementProps,
    BezierPoint, AppAction, AppState, TransformableProps, OnCanvasTextEditorState
} from '../../types';
import { buildPathDFromStructuredPoints, getClosestTOnBezierSegment, splitBezierSegment } from '../../utils/pathUtils';
import { 
    PATH_HITBOX_EXTRA_WIDTH, BEZIER_CLOSING_THRESHOLD, 
    DEFAULT_STROKE_WIDTH, DEFAULT_ELEMENT_STROKE, DEFAULT_PATH_FILL,
    DEFAULT_TEXT_CONTENT, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_FONT_WEIGHT, DEFAULT_FONT_STYLE, DEFAULT_TEXT_ANCHOR, DEFAULT_TEXT_VERTICAL_ALIGN,
    DEFAULT_IMAGE_HREF, DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO, DEFAULT_CIRCLE_R, DEFAULT_TEXT_WRAP, DEFAULT_TEXT_ALIGN_KONVA
} from '../../constants';
import { prepareFillStrokeKonvaAttributes, parseDashArrayKonva } from '../../utils/konvaUtils';
import { getOutermostGroupId } from '../../contexts/appContextUtils';

interface KonvaElementRendererProps {
  artboard: AppState['artboard'];
  elements: SVGElementData[]; 
  initialGradientDefs: AnySVGGradient[];
  frameSpecificGradientUpdates: InterpolatedGradientUpdateData[];
  selectedElementIdProp: string | null; 
  currentTool: AppState['currentTool'];
  isDrawingBezierPath: AppState['isDrawingBezierPath'];
  currentBezierPathData: AppState['currentBezierPathData'];
  isExtendingPathInfo: AppState['isExtendingPathInfo'];
  activeControlPoint: AppState['activeControlPoint'];
  selectedBezierPointId: AppState['selectedBezierPointId'];
  motionPathSelectionTargetElementId: AppState['motionPathSelectionTargetElementId'];
  textOnPathSelectionTargetElementId: AppState['textOnPathSelectionTargetElementId'];
  editingKeyframeShapePreview: AppState['editingKeyframeShapePreview'];
  isAltPressed: boolean;
  isCtrlPressed: boolean; 
  nodeIsBeingDirectlyDraggedRef: React.MutableRefObject<string | null>; 
  stageScale: number; 

  stageRef: React.RefObject<Konva.Stage>;
  layerRef: React.RefObject<Konva.Layer>;
  artboardGroupRef: React.RefObject<Konva.Group>;
  transformerRef: React.RefObject<Konva.Transformer>; 
  elementNodeMapRef: React.MutableRefObject<Map<string, Konva.Node>>;
  imageNodeCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  
  getArtboardRelativeCoords: (stageX: number, stageY: number) => { x: number; y: number };
  handleBezierPointPointerDown: (e: Konva.KonvaEventObject<PointerEvent>, pathId: string, pointId: string, handleType: 'anchor' | 'h1' | 'h2') => void;
  handleKonvaPointerDown: (e: Konva.KonvaEventObject<PointerEvent>, elementIdFromNode: string) => void; 
  onDblClick: (e: Konva.KonvaEventObject<MouseEvent>, konvaNode: Konva.Node) => void; 
  onNodeDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onNodeDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onNodeDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onNodeTransformEnd: (e: Konva.KonvaEventObject<Event>) => void; 
}

const KonvaElementRenderer: React.FC<KonvaElementRendererProps> = (props) => {
  const { 
      artboard, elements: elementsProp, 
      initialGradientDefs, frameSpecificGradientUpdates, selectedElementIdProp, 
      currentTool, isDrawingBezierPath, currentBezierPathData,
      isExtendingPathInfo, activeControlPoint, selectedBezierPointId,
      motionPathSelectionTargetElementId, textOnPathSelectionTargetElementId, editingKeyframeShapePreview, 
      isAltPressed, isCtrlPressed, 
      nodeIsBeingDirectlyDraggedRef, 
      stageScale, 
      stageRef, layerRef, artboardGroupRef, transformerRef, elementNodeMapRef, imageNodeCacheRef,
      getArtboardRelativeCoords, handleBezierPointPointerDown,
      handleKonvaPointerDown, 
      onDblClick,
      onNodeDragStart, onNodeDragMove, onNodeDragEnd, onNodeTransformEnd
  } = props;

  const { state, dispatch } = useContext(AppContext);
  const { onCanvasTextEditor, aiLiveTargets, aiAgentSettings } = state; 
  
  const stateRef = useRef(state); // To access latest state in callbacks
  useEffect(() => { stateRef.current = state; }, [state]);


  const CURSOR_PEN_ADD = 'copy';
  const CURSOR_GRAB = 'grab';
  const CURSOR_GRABBING = 'grabbing';
  const CURSOR_POINTER = 'pointer';
  
  const handleKonvaDragStartInternal = onNodeDragStart;
  const handleKonvaDragMoveInternal = onNodeDragMove;
  const handleKonvaDragEndInternal = onNodeDragEnd;
  const handleKonvaTransformEndInternal = onNodeTransformEnd;
  
  const handleKonvaMouseEnterInternal = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current; if (!stage) return;
      const konvaNode = e.target; const elementId = konvaNode.id().replace('-hitbox','');
      const currentElement = elementsProp.find(el => el.id === elementId); if(!currentElement) return;
      
      if (stateRef.current.currentTool === 'select') { // Use stateRef for latest tool state
        stage.container().style.cursor = konvaNode.draggable() ? CURSOR_GRAB : CURSOR_POINTER;
      } else if (stateRef.current.currentTool === 'bezierPath' && currentElement.type === 'path' && (currentElement as PathElementProps).structuredPoints && stateRef.current.selectedElementId === currentElement.id) {
         stage.container().style.cursor = stateRef.current.isCtrlPressed ? CURSOR_PEN_ADD : stage.container().style.cursor; 
      }
  }, [elementsProp, stageRef, stateRef]); // Added stateRef

  const handleKonvaMouseDownInternal = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (stateRef.current.currentTool === 'select' && e.target.draggable() && stageRef.current && e.evt.button === 0) { // Use stateRef
      stageRef.current.container().style.cursor = CURSOR_GRABBING;
    }
  }, [stageRef, stateRef]); // Added stateRef
  
  const handleKonvaMouseUpInternal = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (stateRef.current.currentTool === 'select' && e.target.draggable() && stageRef.current && e.evt.button === 0) { // Use stateRef
      stageRef.current.container().style.cursor = CURSOR_GRAB;
    }
  }, [stageRef, stateRef]); // Added stateRef
  
  const handleKonvaMouseLeaveInternal = useCallback(() => {
    const stage = stageRef.current;
    if (stage) {
        const currentCanvasCursor = stage.container().style.cursor;
        if(currentCanvasCursor === CURSOR_GRAB || currentCanvasCursor === CURSOR_POINTER || currentCanvasCursor === CURSOR_PEN_ADD) {
             const defaultCursor = stateRef.current.currentTool === 'pencil' || (stateRef.current.currentTool === 'bezierPath' && (stateRef.current.isDrawingBezierPath || stateRef.current.isExtendingPathInfo))
                                ? 'crosshair' 
                                : (stateRef.current.currentTool === 'bezierPath' ? 'crosshair' : 'default'); // Use stateRef
            stage.container().style.cursor = defaultCursor;
        }
    }
  }, [stageRef, stateRef]); // Added stateRef

  const handleKonvaContextMenuInternal = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
      e.evt.preventDefault(); 
      const elementId = e.target.id().replace('-hitbox',''); 
      dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: elementId });
      dispatch({ type: 'SHOW_CONTEXT_MENU', payload: { targetId: elementId, position: { x: e.evt.clientX, y: e.evt.clientY }} });
  }, [dispatch]);

  const mapElementToKonvaShape = useCallback((element: SVGElementData): Konva.Shape | Konva.Group | null => {
    const commonConfig: Konva.NodeConfig = {
      id: element.id,
      name: element.name || element.type,
      listening: true,
      x: 0, 
      y: 0, 
    };
    
    let konvaShape: Konva.Shape | Konva.Group | null = null;

    if (element.type === 'rect') konvaShape = new Konva.Rect({ ...commonConfig });
    else if (element.type === 'circle') {
        const circleEl = element as CircleElementProps;
        konvaShape = new Konva.Ellipse({ 
            ...commonConfig,
            radiusX: circleEl.rx ?? circleEl.r ?? DEFAULT_CIRCLE_R,
            radiusY: circleEl.ry ?? circleEl.r ?? DEFAULT_CIRCLE_R,
            offsetX: 0, 
            offsetY: 0,
        });
    }
    else if (element.type === 'path') konvaShape = new Konva.Path({ ...commonConfig });
    else if (element.type === 'text') konvaShape = new Konva.Text({ ...commonConfig, padding: 0 }); // Ensure padding is 0
    else if (element.type === 'image') konvaShape = new Konva.Image({ ...commonConfig, image: null });
    else if (element.type === 'group') konvaShape = new Konva.Group({ ...commonConfig });

    if (konvaShape) {
      let isNodeDraggable = false;
      if (stateRef.current.currentTool === 'select' && element.id !== artboard.id) { // Use stateRef
          if (element.id === selectedElementIdProp) {
              isNodeDraggable = true;
          }
      }
      konvaShape.draggable(isNodeDraggable);
      
      konvaShape.on('pointerdown.renderer', (evt) => handleKonvaPointerDown(evt, element.id));
      konvaShape.on('dragstart.renderer', handleKonvaDragStartInternal); 
      konvaShape.on('dragmove.renderer', handleKonvaDragMoveInternal); 
      konvaShape.on('dragend.renderer', handleKonvaDragEndInternal);
      konvaShape.on('transformend.renderer', handleKonvaTransformEndInternal); 
      konvaShape.on('dblclick.renderer dbltap.renderer', (evt) => onDblClick(evt, konvaShape!)); 
      konvaShape.on('mouseenter.renderer', handleKonvaMouseEnterInternal); 
      konvaShape.on('mousedown.renderer', handleKonvaMouseDownInternal); 
      konvaShape.on('mouseup.renderer', handleKonvaMouseUpInternal);     
      konvaShape.on('mouseleave.renderer', handleKonvaMouseLeaveInternal); 
      konvaShape.on('contextmenu.renderer', handleKonvaContextMenuInternal);
    }
    return konvaShape;
  }, [
      selectedElementIdProp, artboard.id, stateRef, // Use stateRef instead of individual state props
      handleKonvaPointerDown, 
      handleKonvaDragStartInternal, handleKonvaDragMoveInternal, handleKonvaDragEndInternal, 
      handleKonvaTransformEndInternal, 
      handleKonvaMouseEnterInternal, handleKonvaMouseDownInternal, handleKonvaMouseUpInternal, 
      handleKonvaMouseLeaveInternal, handleKonvaContextMenuInternal, onDblClick
    ]
  ); 

  const nodeIsTransformerDraggingRef = useRef<Set<string>>(new Set()); 

  useEffect(() => { 
    const tr = transformerRef.current;
    if (tr) {
        const handleTrTransformStart = () => {
            tr.nodes().forEach(node => nodeIsTransformerDraggingRef.current.add(node.id()));
        };
        const handleTrTransformEnd = () => {
            tr.nodes().forEach(node => nodeIsTransformerDraggingRef.current.delete(node.id()));
        };
        tr.on('transformstart.renderer', handleTrTransformStart);
        tr.on('transformend.renderer', handleTrTransformEnd); 
        
        return () => {
            if (tr.isListening()) { 
                tr.off('transformstart.renderer');
                tr.off('transformend.renderer');
            }
        };
    }
  }, [transformerRef]);


  useEffect(() => { 
    const layer = layerRef.current; const artboardGrp = artboardGroupRef.current;
    const currentStage = stageRef.current;
    if (!layer || !artboardGrp || !currentStage) return; 

    if (artboardGrp.x() !== 0 || artboardGrp.y() !== 0) {
        artboardGrp.x(0);
        artboardGrp.y(0);
    }

    const localRenderElements = elementsProp; 
    const aiTargetIds = new Set(aiLiveTargets || []);
    const showAiTargets = !!aiAgentSettings?.showTargets && aiTargetIds.size > 0;
    const currentElementIdsInKonva = new Set<string>();
    
    const updateOrCreateNode = (elementData: SVGElementData, parentKonvaGroup: Konva.Group): Konva.Node | null => { 
        currentElementIdsInKonva.add(elementData.id); 
        let konvaNode = elementNodeMapRef.current.get(elementData.id);
        let displayElement = {...elementData}; 
        if (editingKeyframeShapePreview && editingKeyframeShapePreview.pathId === elementData.id && elementData.type === 'path') {
            const pathDataForPreview = { ...displayElement } as PathElementProps;
            pathDataForPreview.structuredPoints = editingKeyframeShapePreview.points;
            (pathDataForPreview as any).d = editingKeyframeShapePreview.points; 
            displayElement = pathDataForPreview;
        }
        const expectedKonvaClassName = 
            displayElement.type === 'rect' ? 'Rect' :
            displayElement.type === 'circle' ? 'Ellipse' : 
            displayElement.type === 'path' ? 'Path' :
            displayElement.type === 'text' ? 'Text' :
            displayElement.type === 'image' ? 'Image' :
            displayElement.type === 'group' ? 'Group' : '';

        if (konvaNode && konvaNode.getClassName() !== expectedKonvaClassName && expectedKonvaClassName !== "") {
            const tr = transformerRef.current;
            if (tr && tr.nodes().includes(konvaNode)) tr.nodes([]); 
            konvaNode.destroy();
            elementNodeMapRef.current.delete(elementData.id);
            konvaNode = undefined; 
        }

        if (!konvaNode) { 
            konvaNode = mapElementToKonvaShape(displayElement); 
            if (konvaNode) { 
                parentKonvaGroup.add(konvaNode as (Konva.Shape | Konva.Group)); 
                elementNodeMapRef.current.set(displayElement.id, konvaNode); 
            } else {
                return null; 
            }
        } else { 
            if (konvaNode.getParent() !== parentKonvaGroup) konvaNode.moveTo(parentKonvaGroup);
            
            let isNodeDraggable = false;
            if (stateRef.current.currentTool === 'select' && displayElement.id !== artboard.id) {
                if (displayElement.id === selectedElementIdProp) {
                     isNodeDraggable = true;
                }
            }
            konvaNode.draggable(isNodeDraggable);
        }
        
        const stageZoom = currentStage.scaleX() || 1; 
        const isMotionPathTarget = !!motionPathSelectionTargetElementId && elementData.id !== motionPathSelectionTargetElementId && ['path', 'rect', 'circle'].includes(elementData.type);
        const isTextPathTarget = !!textOnPathSelectionTargetElementId && elementData.id !== textOnPathSelectionTargetElementId && ['path', 'rect', 'circle'].includes(elementData.type);
        const isAiTarget = showAiTargets && aiTargetIds.has(elementData.id);
        
        if (konvaNode instanceof Konva.Path || konvaNode instanceof Konva.Rect || konvaNode instanceof Konva.Ellipse || konvaNode instanceof Konva.Text || konvaNode instanceof Konva.Image ) {
          konvaNode.hitStrokeWidth(isMotionPathTarget || isTextPathTarget ? (PATH_HITBOX_EXTRA_WIDTH * 3) / stageZoom : PATH_HITBOX_EXTRA_WIDTH / stageZoom);
        }
        
        const directSetAttrs: Konva.NodeConfig = { name: displayElement.name || displayElement.type };
        let opacity = displayElement.opacity ?? 1;
        
        if (displayElement.type === 'text' && onCanvasTextEditor?.isVisible && onCanvasTextEditor.elementId === displayElement.id) {
            opacity = 0; // Make Konva text invisible
        }

        directSetAttrs.visible = Number.isFinite(opacity) ? opacity > 0.001 : true; 
        
        let perfConfig: Konva.NodeConfig = {};
        if (displayElement.type !== 'group') { 
            perfConfig.perfectDrawEnabled = false; 
            perfConfig.shadowForStrokeEnabled = false; 
            const isActiveToolTarget = (stateRef.current.currentTool === 'bezierPath' && stateRef.current.selectedElementId === displayElement.id) ||
                                     (stateRef.current.isDrawingBezierPath && stateRef.current.currentBezierPathData?.id === displayElement.id) ||
                                     (stateRef.current.isExtendingPathInfo && stateRef.current.isExtendingPathInfo.originalPathId === displayElement.id);
            if (stateRef.current.selectedElementId === displayElement.id || isActiveToolTarget) {
                perfConfig.perfectDrawEnabled = true;
            }
        }
        Object.assign(directSetAttrs, perfConfig);

        const fillKonvaDirectAttrs = prepareFillStrokeKonvaAttributes('fill', displayElement, konvaNode, initialGradientDefs, frameSpecificGradientUpdates);
        const strokeKonvaDirectAttrs = prepareFillStrokeKonvaAttributes('stroke', displayElement, konvaNode, initialGradientDefs, frameSpecificGradientUpdates);
        Object.assign(directSetAttrs, fillKonvaDirectAttrs);
        Object.assign(directSetAttrs, strokeKonvaDirectAttrs);

        if (displayElement.type === 'path' || displayElement.type === 'rect' || displayElement.type === 'circle') {
          directSetAttrs.dash = parseDashArrayKonva((displayElement as PathElementProps).strokeDasharray);
        }
        
        const propsForFrame: Konva.NodeConfig = { ...directSetAttrs }; 
        propsForFrame.opacity = Number.isFinite(opacity) ? opacity : 1; 
        
        let tempStrokeWidthNum: number;
        if (displayElement.strokeWidth !== undefined && Number.isFinite(displayElement.strokeWidth)) {
            tempStrokeWidthNum = displayElement.strokeWidth;
        } else {
            tempStrokeWidthNum = DEFAULT_STROKE_WIDTH; 
        }
        
        let finalStrokeWidthKonva: number = tempStrokeWidthNum;
        if (stageZoom !== 0 && Number.isFinite(stageZoom)) { 
            finalStrokeWidthKonva = tempStrokeWidthNum / stageZoom;
        }
        propsForFrame.strokeWidth = finalStrokeWidthKonva;
        
        propsForFrame.dashOffset = Number.isFinite((displayElement as PathElementProps).strokeDashoffset) ? (displayElement as PathElementProps).strokeDashoffset : 0;

        if (typeof fillKonvaDirectAttrs.fill === 'string' && !(fillKonvaDirectAttrs.fillLinearGradientColorStops || fillKonvaDirectAttrs.fillRadialGradientColorStops)) {
            propsForFrame.fill = fillKonvaDirectAttrs.fill;
            propsForFrame.fillEnabled = fillKonvaDirectAttrs.fillEnabled;
        }
        if (typeof strokeKonvaDirectAttrs.stroke === 'string' && !(strokeKonvaDirectAttrs.strokeLinearGradientColorStops || strokeKonvaDirectAttrs.strokeRadialGradientColorStops)) {
            propsForFrame.stroke = strokeKonvaDirectAttrs.stroke;
            propsForFrame.strokeEnabled = strokeKonvaDirectAttrs.strokeEnabled;
        }
        
        if (displayElement.clipPath && artboard.defs?.clipPaths) {
        } else {
            propsForFrame.clipFunc = undefined; 
        }

        if (konvaNode instanceof Konva.Shape && (!showAiTargets || !isAiTarget)) {
            propsForFrame.shadowColor = 'transparent';
            propsForFrame.shadowBlur = 0;
            propsForFrame.shadowOpacity = 0;
            propsForFrame.shadowOffset = { x: 0, y: 0 };
        }
        if (isAiTarget && konvaNode instanceof Konva.Shape) {
            const highlightBlur = Math.max(6, 12 / stageZoom);
            propsForFrame.shadowColor = '#2dd4ff';
            propsForFrame.shadowBlur = highlightBlur;
            propsForFrame.shadowOpacity = 0.9;
            propsForFrame.shadowOffset = { x: 0, y: 0 };
        }

        const modelX = Number.isFinite(displayElement.x) ? displayElement.x : 0;
        const modelY = Number.isFinite(displayElement.y) ? displayElement.y : 0;
        const modelRotation = Number.isFinite(displayElement.rotation) ? displayElement.rotation : 0;
        const modelScale = Number.isFinite(displayElement.scale) && displayElement.scale !== 0 ? displayElement.scale : 1;
        
        const transformPropsToSet: Konva.NodeConfig = {
            rotation: modelRotation, scaleX: modelScale, scaleY: modelScale,
        };

        if (displayElement.type === 'rect') { 
            const rectEl = displayElement as RectElementProps; 
            const intrinsicWidth = Number.isFinite(rectEl.width) && rectEl.width > 0 ? rectEl.width : 1; 
            const intrinsicHeight = Number.isFinite(rectEl.height) && rectEl.height > 0 ? rectEl.height : 1; 
            propsForFrame.width = intrinsicWidth;
            propsForFrame.height = intrinsicHeight;
            propsForFrame.cornerRadius = rectEl.cornerRadius; 
            transformPropsToSet.offsetX = intrinsicWidth / 2;
            transformPropsToSet.offsetY = intrinsicHeight / 2;
            transformPropsToSet.x = modelX + transformPropsToSet.offsetX; 
            transformPropsToSet.y = modelY + transformPropsToSet.offsetY;
        } else if (displayElement.type === 'circle') { 
            const circleEl = displayElement as CircleElementProps;
            propsForFrame.radiusX = circleEl.rx ?? circleEl.r ?? DEFAULT_CIRCLE_R;
            propsForFrame.radiusY = circleEl.ry ?? circleEl.r ?? DEFAULT_CIRCLE_R;

            if (propsForFrame.radiusX! <= 0) propsForFrame.radiusX = 0.1; 
            if (propsForFrame.radiusY! <= 0) propsForFrame.radiusY = 0.1;

            transformPropsToSet.x = modelX; 
            transformPropsToSet.y = modelY;
            transformPropsToSet.offsetX = 0; 
            transformPropsToSet.offsetY = 0;
        } else if (displayElement.type === 'path') { 
            const pathElement = displayElement as PathElementProps;
            if (Array.isArray(pathElement.d)) { 
                propsForFrame.data = buildPathDFromStructuredPoints(pathElement.d, pathElement.closedByJoining);
            } else {
                propsForFrame.data = typeof pathElement.d === 'string' ? pathElement.d : "M0,0"; 
            }
            transformPropsToSet.x = modelX; 
            transformPropsToSet.y = modelY;
            transformPropsToSet.offsetX = 0; 
            transformPropsToSet.offsetY = 0; 
        } else if (displayElement.type === 'text') { 
            const textEl = displayElement as TextElementProps; 
            propsForFrame.text = textEl.text ?? DEFAULT_TEXT_CONTENT; 
            propsForFrame.fontSize = Number.isFinite(textEl.fontSize) && textEl.fontSize > 0 ? textEl.fontSize : DEFAULT_FONT_SIZE; 
            propsForFrame.fontFamily = textEl.fontFamily ?? DEFAULT_FONT_FAMILY; 
            const fontWeight = textEl.fontWeight ?? DEFAULT_FONT_WEIGHT; 
            const fontStyle = textEl.fontStyle ?? DEFAULT_FONT_STYLE; 
            propsForFrame.fontStyle = `${fontStyle} ${fontWeight}`; 
            propsForFrame.letterSpacing = textEl.letterSpacing ?? 0;
            propsForFrame.lineHeight = textEl.lineHeight ?? 1.2;
            propsForFrame.textDecoration = textEl.textDecoration ?? 'none';
            propsForFrame.padding = 0; // Ensure padding is 0 for textarea calculations
            
            propsForFrame.width = textEl.width; 
            propsForFrame.height = textEl.height; 
            propsForFrame.wrap = textEl.wrap ?? DEFAULT_TEXT_WRAP;
            propsForFrame.align = textEl.align ?? DEFAULT_TEXT_ALIGN_KONVA;
            
            const textAnchor = textEl.textAnchor ?? DEFAULT_TEXT_ANCHOR; 
            
            propsForFrame.verticalAlign = textEl.verticalAlign ?? DEFAULT_TEXT_VERTICAL_ALIGN; 
            
            const konvaTextNode = konvaNode as Konva.Text;
            const currentKonvaWidth = konvaTextNode.width(); 
            const currentKonvaHeight = konvaTextNode.height(); 
            
            transformPropsToSet.offsetX = (textEl.width ?? currentKonvaWidth) / 2;
            transformPropsToSet.offsetY = (textEl.height ?? currentKonvaHeight) / 2;
            transformPropsToSet.x = modelX + transformPropsToSet.offsetX;
            transformPropsToSet.y = modelY + transformPropsToSet.offsetY;

        } else if (displayElement.type === 'image') { 
            const imageEl = displayElement as ImageElementProps;
            const konvaImageNode = konvaNode as Konva.Image; 
            
            const currentImageOnNode = konvaImageNode.image();
            let imageNaturalWidth: number | undefined, imageNaturalHeight: number | undefined;
            let imageIsComplete = true; 

            if (currentImageOnNode instanceof HTMLImageElement) {
                imageNaturalWidth = currentImageOnNode.naturalWidth;
                imageNaturalHeight = currentImageOnNode.naturalHeight;
                imageIsComplete = currentImageOnNode.complete;
            } else if (currentImageOnNode instanceof SVGImageElement) { 
                imageNaturalWidth = currentImageOnNode.width.baseVal.value;
                imageNaturalHeight = currentImageOnNode.height.baseVal.value;
            } else if (currentImageOnNode instanceof HTMLVideoElement) { 
                imageNaturalWidth = currentImageOnNode.videoWidth;
                imageNaturalHeight = currentImageOnNode.videoHeight;
                imageIsComplete = currentImageOnNode.readyState >= HTMLMediaElement.HAVE_METADATA;
            } else if (currentImageOnNode) { 
                imageNaturalWidth = (currentImageOnNode as any).width;
                imageNaturalHeight = (currentImageOnNode as any).height;
                imageIsComplete = true; 
            }
            
            const intrinsicWidth = Number.isFinite(imageEl.width) && imageEl.width > 0 ? imageEl.width : (Number.isFinite(imageNaturalWidth) && imageNaturalWidth! > 0 ? imageNaturalWidth : 10); 
            const intrinsicHeight = Number.isFinite(imageEl.height) && imageEl.height > 0 ? imageEl.height : (Number.isFinite(imageNaturalHeight) && imageNaturalHeight! > 0 ? imageNaturalHeight : 10); 
            propsForFrame.width = intrinsicWidth;
            propsForFrame.height = intrinsicHeight;

            const href = imageEl.href || DEFAULT_IMAGE_HREF;
            const currentSrcAttr = konvaImageNode.getAttr('imageSrc'); 
            
            if (currentSrcAttr !== href || !currentImageOnNode || !imageIsComplete) { 
                const cachedImg = imageNodeCacheRef.current.get(href);
                if (cachedImg && cachedImg.complete) {
                    propsForFrame.image = cachedImg;
                    konvaImageNode.setAttr('imageSrc', href); 
                } else if (!cachedImg || !cachedImg.complete) { 
                    const img = new window.Image();
                    img.crossOrigin = 'Anonymous'; 
                    img.onload = () => {
                        imageNodeCacheRef.current.set(href, img);
                        if (konvaNode.id() === imageEl.id) {
                            konvaImageNode.image(img);
                            konvaImageNode.setAttr('imageSrc', href);
                            layerRef.current?.batchDraw();
                        }
                    };
                    img.onerror = (err) => {
                        console.error(`Error loading image ${href}:`, err);
                        imageNodeCacheRef.current.delete(href); 
                        if (konvaNode.id() === imageEl.id) {
                             konvaImageNode.image(null); 
                             konvaImageNode.setAttr('imageSrc', href); 
                             layerRef.current?.batchDraw();
                        }
                    };
                    img.src = href;
                    if (!imageNodeCacheRef.current.has(href) || imageNodeCacheRef.current.get(href) !== img) {
                        imageNodeCacheRef.current.set(href, img);
                    }
                    propsForFrame.image = null; 
                }
            } else {
                propsForFrame.image = currentImageOnNode;
            }
            transformPropsToSet.offsetX = intrinsicWidth / 2;
            transformPropsToSet.offsetY = intrinsicHeight / 2;
            transformPropsToSet.x = modelX + transformPropsToSet.offsetX; 
            transformPropsToSet.y = modelY + transformPropsToSet.offsetY;
        } else if (displayElement.type === 'group') { 
            transformPropsToSet.x = modelX;
            transformPropsToSet.y = modelY;
            transformPropsToSet.offsetX = 0; 
            transformPropsToSet.offsetY = 0;
            
            const isSelectedGroup = selectedElementIdProp === displayElement.id;
            let hitRect = (konvaNode as Konva.Group).findOne('.group-hit-background') as Konva.Rect | undefined;
            if (isSelectedGroup && stateRef.current.currentTool === 'select' && !stateRef.current.isCtrlPressed) { 
                const childrenBounds = (konvaNode as Konva.Group).getClientRect({ skipTransform: true, relativeTo: konvaNode as Konva.Group });
                if (!hitRect) {
                    hitRect = new Konva.Rect({
                        name: 'group-hit-background',
                        fill: 'rgba(0,0,0,0.0001)', 
                        listening: true, 
                    });
                    (konvaNode as Konva.Group).add(hitRect);
                    hitRect.moveToBottom();
                }
                hitRect.setAttrs({
                    x: childrenBounds.width > 0 ? childrenBounds.x : -(artboard.width/2), 
                    y: childrenBounds.height > 0 ? childrenBounds.y : -(artboard.height/2),
                    width: childrenBounds.width > 0 ? childrenBounds.width : artboard.width,
                    height: childrenBounds.height > 0 ? childrenBounds.height : artboard.height,
                    visible: true,
                });
                hitRect.off('pointerdown.renderer'); 
                hitRect.on('pointerdown.renderer', (evt) => {
                    handleKonvaPointerDown(evt, displayElement.id);
                });


            } else if (hitRect) {
                hitRect.visible(false);
                hitRect.off('pointerdown.renderer');
            }
        }
        
        Object.assign(propsForFrame, transformPropsToSet);

        // Motion Path Target Highlighting Logic
        konvaNode.off('mouseenter.motionpath mouseleave.motionpath'); // Clear old listeners
        if (konvaNode instanceof Konva.Shape) {
            konvaNode.shadowColor('transparent'); // Reset shadow by default
        }
        if (isMotionPathTarget || isTextPathTarget) {
          konvaNode.on('mouseenter.motionpath', () => {
              if (!stageRef.current) return;
              stageRef.current.container().style.cursor = 'pointer';
              if (konvaNode instanceof Konva.Shape) {
                konvaNode.stroke('#0AFFAF');
                konvaNode.strokeWidth((konvaNode.strokeWidth() || 1) + 2 / stageZoom);
                konvaNode.dash([10 / stageZoom, 5 / stageZoom]);
                konvaNode.shadowColor('#0AFFAF');
                konvaNode.shadowBlur(10);
                konvaNode.shadowOffset({ x: 0, y: 0 });
              }
              layer.batchDraw();
          });
          konvaNode.on('mouseleave.motionpath', () => {
              if (!stageRef.current) return;
              stageRef.current.container().style.cursor = 'default';
              if (konvaNode instanceof Konva.Shape) {
                // Restore original appearance by re-applying the propsForFrame
                // This is simpler than caching original values for all possible scenarios
                const { shadowColor, shadowBlur, shadowOffset, stroke, strokeWidth, dash, ...rest } = propsForFrame;
                konvaNode.setAttrs({ 
                    shadowColor: 'transparent', 
                    shadowBlur: 0, 
                    shadowOffset: {x:0, y:0},
                    stroke: strokeKonvaDirectAttrs.stroke,
                    strokeWidth: tempStrokeWidthNum,
                    dash: parseDashArrayKonva((displayElement as PathElementProps).strokeDasharray)
                });
              }
              layer.batchDraw();
          });
        }


        try {
            
            const isNodeBeingDirectlyDragged = nodeIsBeingDirectlyDraggedRef.current === elementData.id;
            const isNodeBeingTransformed = nodeIsTransformerDraggingRef.current.has(elementData.id);

            if (isNodeBeingDirectlyDragged || isNodeBeingTransformed) { 
                const { x, y, offsetX, offsetY, rotation, scaleX, scaleY, ...nonTransformAttrs } = propsForFrame;
                konvaNode.setAttrs(nonTransformAttrs);
            } else {
                konvaNode.setAttrs(propsForFrame as Konva.NodeConfig);
            }
        } catch (e) {
            console.error(`Error setting attrs for element ${elementData.id} (${elementData.type}):`, e, propsForFrame);
        }
        return konvaNode;
    };

    function renderHierarchy(currentParentId: string | null, konvaParentGroup: Konva.Group) {
        const childrenModels = localRenderElements
            .filter(el => el.parentId === currentParentId)
            .sort((a, b) => a.order - b.order);

        childrenModels.forEach(childModel => {
            const konvaNode = updateOrCreateNode(childModel, konvaParentGroup);
            if (childModel.type === 'group' && konvaNode instanceof Konva.Group) {
                renderHierarchy(childModel.id, konvaNode);
            }
        });

        childrenModels.forEach(childModel => {
            const konvaChildNode = elementNodeMapRef.current.get(childModel.id);
            if (konvaChildNode && konvaChildNode.getParent() === konvaParentGroup) {
                 konvaChildNode.moveToTop(); 
            }
        });
    }

    renderHierarchy(null, artboardGrp);

    // After standard hierarchy rendering and ordering,
    // explicitly bring the Bezier-edited path and its ancestors to the top.
    // Then, find and bring its handles group (if any) to the top of the same parent.
    if (currentTool === 'bezierPath' && selectedElementIdProp) {
        const pathNode = elementNodeMapRef.current.get(selectedElementIdProp);
        if (pathNode && pathNode.getLayer()) { // Ensure node is on a layer
            pathNode.moveToTop(); // Path to top of its direct parent

            let groupToElevate: Konva.Node | null = pathNode.getParent();
            while (groupToElevate instanceof Konva.Group && groupToElevate !== artboardGrp && artboardGrp) {
                 groupToElevate.moveToTop(); // Parent group to top of its container
                 const parentOfGroup = groupToElevate.getParent();
                 if (!parentOfGroup || parentOfGroup === artboardGrp) break;
                 groupToElevate = parentOfGroup;
            }

            // Now, find and elevate the handles group for this path
            const pathParent = pathNode.getParent();
            if (pathParent) {
                const handlesNodeId = `selected-handles-${selectedElementIdProp}`;
                // Query within the path's parent specifically.
                const handlesNode = pathParent.findOne((node: Konva.Node) => node.id() === handlesNodeId);
                if (handlesNode) {
                    handlesNode.moveToTop(); // Ensure handles are on top of the path
                }
            }
        }
    }

    elementNodeMapRef.current.forEach((node, id) => {
      if (!currentElementIdsInKonva.has(id)) {
        const tr = transformerRef.current;
        if (tr && tr.nodes().includes(node)) tr.nodes([]); 
        node.destroy();
        elementNodeMapRef.current.delete(id);
      }
    });

    layer.batchDraw();
  }, [
      elementsProp, artboard, initialGradientDefs, frameSpecificGradientUpdates, 
      selectedElementIdProp, stateRef, // Use stateRef instead of individual state props like currentTool, isCtrlPressed etc.
      editingKeyframeShapePreview, mapElementToKonvaShape, 
      motionPathSelectionTargetElementId, textOnPathSelectionTargetElementId, stageRef, layerRef, 
      artboardGroupRef, elementNodeMapRef, imageNodeCacheRef, 
      transformerRef, nodeIsBeingDirectlyDraggedRef, 
      onCanvasTextEditor,
      currentTool,
      aiLiveTargets,
      aiAgentSettings
    ]
  ); 
  
  return null; 
};

export default KonvaElementRenderer;
