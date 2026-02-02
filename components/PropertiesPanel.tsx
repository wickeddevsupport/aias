
import React, { useContext, useCallback, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SVGElementData, AnimatableProperty, PathElementProps, AnimationTrack, Artboard, GroupElementProps, RectElementProps, CircleElementProps, AnySVGGradient, BezierPoint, AppState, AppAction, TextElementProps, ImageElementProps } from '../types';
import AccordionGroup from './AccordionGroup';
import FloatingHistoryPanel from './FloatingHistoryPanel';
import { AppContext } from '../contexts/AppContext';
import { calculateShapePathLength } from '../utils/pathUtils';
import { getAccumulatedTransform } from '../utils/transformUtils';

import ElementInfoSection from './panels/props_panel/ElementInfoSection';
import TransformSection from './panels/props_panel/TransformSection';
import AppearanceSection from './panels/props_panel/AppearanceSection';
import GeometrySection from './panels/props_panel/GeometrySection';
import TextPropertiesSection from './panels/props_panel/TextPropertiesSection';
import ImagePropertiesSection from './panels/props_panel/ImagePropertiesSection';
import MotionPathSection from './panels/props_panel/MotionPathSection';
import TextOnPathSection from './panels/props_panel/TextOnPathSection';
import DrawEffectSection from './panels/props_panel/DrawEffectSection';
import ArtboardDetailsSection from './panels/props_panel/ArtboardDetailsSection';
import { ScrollTextIcon, DownloadIcon, GripVerticalIcon } from './icons/EditorIcons';
import PropertyInput from '../PropertyInput'; // PropertyInput needs to be styled separately


interface PropertiesPanelProps {
  elementFromState: SVGElementData | null;
  animatedElementProps: SVGElementData | null;
  allAnimatedElements: SVGElementData[];
  animationTracksForSelected: AnimationTrack[];
  artboardFromState?: Artboard | null;
  onAddKeyframeProp: (elementId: string, property: AnimatableProperty, time: number, value: any | BezierPoint[]) => void;
  onStartMotionPathSelection: (elementId: string) => void;
  onClearMotionPath: (elementId: string) => void;
  isSelectingMotionPath: boolean;
  availableMotionPathSources: SVGElementData[];
  onExport: () => void;
}

interface PanelSectionConfig {
  id: string;
  title: string;
  condition: (element: SVGElementData | null) => boolean;
  contentComponent: React.FC<any>;
}

const commonPropsForSections = (
  elementFromState: SVGElementData,
  animatedElementProps: SVGElementData,
  animationTracksForSelected: AnimationTrack[],
  currentTime: number,
  handleAddKeyframeForCurrentElement: (property: AnimatableProperty, value: any) => void,
  handleRemoveKeyframeFromPanel: (elementId: string, property: AnimatableProperty, time: number) => void,
  dispatch: React.Dispatch<AppAction>,
  shapePathLength?: number,
  onStartMotionPathSelection?: (elementId: string) => void,
  onClearMotionPath?: (elementId: string) => void,
  isSelectingMotionPath?: boolean,
  availableMotionPathSources?: SVGElementData[],
) => ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe: handleAddKeyframeForCurrentElement,
  onRemoveKeyframe: handleRemoveKeyframeFromPanel,
  dispatch,
  shapePathLength,
  onStartMotionPathSelection,
  onClearMotionPath,
  isSelectingMotionPath,
  availableMotionPathSources,
});


const ELEMENT_PANEL_SECTIONS_CONFIG: PanelSectionConfig[] = [
  { id: 'Info', title: 'Info', condition: (el) => !!el, contentComponent: ElementInfoSection },
  { id: 'Transform', title: 'Transform', condition: (el) => !!el, contentComponent: TransformSection },
  { id: 'Appearance', title: 'Appearance', condition: (el) => !!el, contentComponent: AppearanceSection },
  { id: 'Text Properties', title: 'Text Properties', condition: (el) => el?.type === 'text', contentComponent: TextPropertiesSection },
  { id: 'Text Path', title: 'Text Path', condition: (el) => el?.type === 'text', contentComponent: TextOnPathSection },
  { id: 'Image Properties', title: 'Image Properties', condition: (el) => el?.type === 'image', contentComponent: ImagePropertiesSection },
  { id: 'Geometry', title: 'Geometry', condition: (el) => !!el && ['rect', 'circle', 'path', 'image', 'text'].includes(el.type), contentComponent: GeometrySection },
  { id: 'Motion Path', title: 'Motion Path', condition: (el) => !!el && el.type !== 'path' && el.type !== 'text', contentComponent: MotionPathSection },
  { id: 'Draw SVG Effect', title: 'Draw SVG Effect', condition: (el) => !!el && ['rect', 'circle', 'path'].includes(el.type), contentComponent: DrawEffectSection },
];

const DEFAULT_SECTION_ORDER = ELEMENT_PANEL_SECTIONS_CONFIG.map(s => s.id);


const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  elementFromState, animatedElementProps, allAnimatedElements, animationTracksForSelected,
  artboardFromState, onAddKeyframeProp, onStartMotionPathSelection, onClearMotionPath,
  isSelectingMotionPath, availableMotionPathSources, onExport,
}) => {
  const { state, dispatch } = useContext(AppContext) as { state: AppState, dispatch: React.Dispatch<AppAction> };
  const { currentTime, elements: allContextElements, isHistoryPanelOpen, selectedElementId } = state;
  const historyButtonRef = useRef<HTMLButtonElement>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Info': true, 'Transform': false, 'Appearance': false, 'Text Properties': false,
    'Text Path': false, 'Image Properties': false, 'Geometry': false,
    'Motion Path': false, 'Draw SVG Effect': false, 'Artboard Details': false,
  });

  const [shapePathLength, setShapePathLength] = useState<number | undefined>(undefined);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ targetId: string; position: 'before' | 'after' } | null>(null);


  useEffect(() => {
    if (elementFromState && (elementFromState.type === 'path' || elementFromState.type === 'rect' || elementFromState.type === 'circle')) {
      const length = calculateShapePathLength(elementFromState as RectElementProps | CircleElementProps | PathElementProps);
      setShapePathLength(length);
    } else {
      setShapePathLength(undefined);
    }
  }, [elementFromState]);

  useEffect(() => {
    if (artboardFromState && selectedElementId === artboardFromState.id) {
        setOpenSections(prev => ({ ...prev, 'Artboard Details': true, 'Info': false }));
    } else if (elementFromState) {
        setOpenSections(prev => ({ ...prev, 'Artboard Details': false, 'Info': prev['Info'] ?? true }));
    } else {
         setOpenSections(prev => ({ ...prev, 'Artboard Details': false, 'Info': true }));
    }
  }, [selectedElementId, artboardFromState, elementFromState]);


  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleAddKeyframeForCurrentElement = useCallback((property: AnimatableProperty, value: string | number | AnySVGGradient | BezierPoint[]) => {
    if (elementFromState && elementFromState.id) {
      let finalValueToKeyframe = value;
      if (property === 'd' && elementFromState.type === 'path' && (elementFromState as PathElementProps).structuredPoints) {
        finalValueToKeyframe = (elementFromState as PathElementProps).structuredPoints!;
      }
      onAddKeyframeProp(elementFromState.id, property, currentTime, finalValueToKeyframe);
    }
  }, [elementFromState, currentTime, onAddKeyframeProp]);

  const handleRemoveKeyframeFromPanel = useCallback((elementId: string, property: AnimatableProperty, time: number) => {
    dispatch({ type: 'REMOVE_KEYFRAME', payload: { elementId, property, time } });
  }, [dispatch]);

  const toggleHistoryPanel = () => {
    dispatch({ type: 'TOGGLE_HISTORY_PANEL' });
  };

  let animatedArtboardRelX: number | undefined;
  let animatedArtboardRelY: number | undefined;
  if (elementFromState && allAnimatedElements.length > 0) {
    const globalPos = getAccumulatedTransform(elementFromState.id, allAnimatedElements);
    animatedArtboardRelX = globalPos.x;
    animatedArtboardRelY = globalPos.y;
  }

  const isArtboardSelected = artboardFromState && selectedElementId === artboardFromState.id;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    setDraggedSectionId(sectionId); // This triggers the opacity change on the original section
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);

    const draggableHandleDiv = e.currentTarget as HTMLDivElement;
    // Find the main section div by traversing up from the handle
    const sectionDivToDrag = draggableHandleDiv.closest('.property-section-draggable') as HTMLElement | null;

    if (sectionDivToDrag) {
      const sectionRect = sectionDivToDrag.getBoundingClientRect();
      // Calculate offset from top-left of the sectionDivToDrag to where the mouse cursor is
      // This ensures the preview image is positioned relative to the cursor as if dragging by that point
      const offsetX = e.clientX - sectionRect.left;
      const offsetY = e.clientY - sectionRect.top;

      e.dataTransfer.setDragImage(sectionDivToDrag, offsetX, offsetY);
    } else {
      // Fallback: if somehow the sectionDiv cannot be found, make the handle itself semi-transparent
      // This is less likely to be needed now but good for robustness
      draggableHandleDiv.style.opacity = '0.7';
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, sectionId: string) => {
    setDraggedSectionId(sectionId);
    // Note: dataTransfer.setDragImage is not available for touch events.
    // The visual feedback for touch will rely on the opacity change of the section in its original place.
    (e.currentTarget as HTMLDivElement).style.opacity = '0.7';
  };


  const handleDragOver = (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, overSectionId: string) => {
    e.preventDefault();
    if ('dataTransfer' in e && e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    else if (e.cancelable) e.preventDefault(); 
    if (!draggedSectionId || draggedSectionId === overSectionId) { setDropIndicator(null); return; }
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const isAfter = clientY > rect.top + rect.height / 2;
    setDropIndicator({ targetId: overSectionId, position: isAfter ? 'after' : 'before' });
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, dropTargetSectionId: string) => {
    e.preventDefault();
    if (!draggedSectionId || !dropIndicator || draggedSectionId === dropIndicator.targetId) { cleanupDragState(); return; }
    const newSectionOrder = [...sectionOrder];
    const draggedItemIndex = newSectionOrder.indexOf(draggedSectionId);
    if (draggedItemIndex === -1) { cleanupDragState(); return; }
    const [draggedItem] = newSectionOrder.splice(draggedItemIndex, 1);
    let dropIndex = newSectionOrder.indexOf(dropIndicator.targetId);
    if (dropIndex === -1) newSectionOrder.push(draggedItem);
    else if (dropIndicator.position === 'after') newSectionOrder.splice(dropIndex + 1, 0, draggedItem);
    else newSectionOrder.splice(dropIndex, 0, draggedItem);
    setSectionOrder(newSectionOrder);
    cleanupDragState();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if ('currentTarget' in e && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'; // Reset opacity for the handle itself
    }
    cleanupDragState();
  };

  const cleanupDragState = () => {
    setDraggedSectionId(null); setDropIndicator(null);
  };

  const commonProps = commonPropsForSections(
    elementFromState!, animatedElementProps!, animationTracksForSelected, currentTime,
    handleAddKeyframeForCurrentElement, handleRemoveKeyframeFromPanel, dispatch,
    shapePathLength,
    onStartMotionPathSelection, onClearMotionPath, isSelectingMotionPath, availableMotionPathSources
  );

  const infoSectionCommonProps = {
    elementFromState: elementFromState!, animatedElementProps: animatedElementProps!,
    allContextElements, animatedArtboardRelX, animatedArtboardRelY, dispatch, shapePathLength,
  };


  if (!elementFromState && !isArtboardSelected) {
    return <div className="p-4 text-center text-text-secondary">Select an element or the Artboard to view its properties.</div>;
  }

  const topBarButtonClass = "flex flex-1 items-center justify-center glass-button text-sm";

  return (
    <div className="p-0 h-full flex flex-col relative glass-panel">
      <div className="sticky top-0 z-10 p-3 border-b border-[var(--glass-border-color)] shadow-sm flex items-center space-x-2 bg-[var(--glass-bg)] rounded-t-lg">
        <button
          ref={historyButtonRef}
          onClick={toggleHistoryPanel}
          className={`${topBarButtonClass} ${isHistoryPanelOpen ? 'active' : ''}`}
          aria-expanded={isHistoryPanelOpen}
          aria-controls="floating-history-panel"
        >
          <ScrollTextIcon size={18} className="mr-2" />
          History
        </button>
        <button onClick={onExport} className={`${topBarButtonClass} !bg-[rgba(var(--accent-rgb),0.1)] hover:!bg-[rgba(var(--accent-rgb),0.2)] !border-[var(--glass-highlight-border)]`} title="Export Animation to HTML">
          <DownloadIcon size={18} className="mr-2" /> Export
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-grow">
        {isArtboardSelected && artboardFromState && (
          <AccordionGroup
            key="ArtboardDetails"
            title="Artboard Details"
            isOpen={openSections['Artboard Details']}
            onToggle={() => toggleSection('Artboard Details')}
          >
            <ArtboardDetailsSection artboardFromState={artboardFromState} dispatch={dispatch} />
          </AccordionGroup>
        )}

        {!isArtboardSelected && elementFromState && animatedElementProps && (
          sectionOrder.map(sectionId => {
            const sectionConfig = ELEMENT_PANEL_SECTIONS_CONFIG.find(s => s.id === sectionId);
            if (!sectionConfig || !sectionConfig.condition(elementFromState)) return null;
            const ContentComponent = sectionConfig.contentComponent;
            const isDragged = draggedSectionId === sectionConfig.id;
            let borderClass = "border-transparent";
            if (dropIndicator && dropIndicator.targetId === sectionConfig.id) {
                if (dropIndicator.position === 'before') borderClass = "border-t-accent-color";
                else borderClass = "border-b-accent-color";
            }

            return (
              <div
                key={sectionConfig.id}
                className={`property-section-draggable transition-all duration-150 ${borderClass} border-y-2`}
                style={{ opacity: isDragged ? 0.4 : 1 }}
                onDragOver={(e) => handleDragOver(e, sectionConfig.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, sectionConfig.id)}
                onTouchMove={(e) => handleDragOver(e, sectionConfig.id)}
                onTouchEnd={(e) => handleDrop(e, sectionConfig.id)}
              >
                <AccordionGroup
                  title={sectionConfig.title}
                  isOpen={openSections[sectionConfig.id] || false}
                  onToggle={() => toggleSection(sectionConfig.id)}
                  headerExtras={
                    <div
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, sectionConfig.id)}
                      onDragEnd={(e) => handleDragEnd(e)}
                      onTouchStart={(e) => handleTouchStart(e, sectionConfig.id)}
                      onTouchEnd={(e) => handleDragEnd(e)}
                      style={{ touchAction: 'none' }}
                      className="cursor-grab p-1 mr-1 text-text-secondary hover:text-text-primary"
                      title={`Drag to reorder ${sectionConfig.title}`}
                    >
                      <GripVerticalIcon size={16} style={{ pointerEvents: 'none' }} />
                    </div>
                  }
                  dragHandleSide="left"
                >
                  <ContentComponent {...(sectionConfig.id === 'Info' ? infoSectionCommonProps : commonProps)} />
                </AccordionGroup>
              </div>
            );
          })
        )}
      </div>
      {isHistoryPanelOpen && historyButtonRef.current && createPortal(
        <FloatingHistoryPanel anchorRef={historyButtonRef} />,
        document.body
      )}
    </div>
  );
};

export default PropertiesPanel;

