
import React, { useContext } from 'react'; 
import PropertyInput from '../../PropertyInput';
import { SVGElementData, RectElementProps, CircleElementProps, PathElementProps, AnimationTrack, AnimatableProperty, AppAction, BezierPoint, ImageElementProps, TextElementProps } from '../../../types';
import { InformationCircleIcon } from '../../icons/EditorIcons'; 
import { AppContext } from '../../../contexts/AppContext'; 
import { SLIDER_CONFIGS, DEFAULT_FONT_SIZE } from '../../../constants'; 
import { buildPathDFromStructuredPoints } from '../../../utils/pathUtils';

interface GeometrySectionProps {
  elementFromState: SVGElementData;
  animatedElementProps: SVGElementData;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (elementId: string, property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  dispatch: React.Dispatch<AppAction>; 
}

const BezierPointCoordinateInput: React.FC<{
    pathId: string;
    pointId: string;
    coordKey: keyof Omit<BezierPoint, 'id' | 'isSmooth' | 'isSelected'>;
    value: number | undefined;
    label: string;
}> = ({ pathId, pointId, coordKey, value, label }) => {
    const { dispatch } = useContext(AppContext);
    const [internalValue, setInternalValue] = React.useState(value !== undefined ? String(value) : '');

    React.useEffect(() => {
        setInternalValue(value !== undefined ? String(value) : '');
    }, [value]);

    const handleCommit = () => {
        const numericValue = parseFloat(internalValue);
        if (!isNaN(numericValue)) {
            dispatch({
                type: 'UPDATE_STRUCTURED_POINT',
                payload: {
                    pathId,
                    pointId,
                    newPointData: { [coordKey]: numericValue },
                },
            });
        } else if (value !== undefined) { 
            setInternalValue(String(value));
        } else { 
            setInternalValue('');
        }
    };
    
    const valueForPropertyInput = value !== undefined ? value : 0; 

    return (
        <PropertyInput
            label={label}
            propKey={coordKey as any} 
            value={valueForPropertyInput} 
            baseValue={valueForPropertyInput} 
            inputType="number"
            ownerId={pathId} 
            sliderConfig={{ min: -10000, max: 10000, step: 0.1 }} 
            onAddKeyframe={undefined} 
        >
             <input
                type="number"
                value={internalValue} 
                onChange={(e) => setInternalValue(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                step="0.1"
                className="w-full glass-input" // Use glass-input class
            />
        </PropertyInput>
    );
};

const GeometrySection: React.FC<GeometrySectionProps> = ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  dispatch,
}) => {
  const { state: appState } = useContext(AppContext); 
  const { selectedBezierPointId } = appState;

  const handleAutoSizeChange = (propKey: 'width' | 'height', isAuto: boolean) => {
    let newValue: number | undefined;
    if (isAuto) {
      newValue = undefined;
    } else {
      const currentAnimatedValue = (animatedElementProps as TextElementProps)[propKey];
      if (typeof currentAnimatedValue === 'number' && Number.isFinite(currentAnimatedValue)) {
        newValue = currentAnimatedValue;
      } else {
        newValue = propKey === 'width' ? 150 : (elementFromState as TextElementProps).fontSize ?? DEFAULT_FONT_SIZE;
      }
    }
    dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: { [propKey]: newValue } } });
  };


  const renderPropertyInputs = () => {
    switch (elementFromState.type) {
      case 'rect':
        const rectElement = elementFromState as RectElementProps;
        const animatedRectProps = animatedElementProps as RectElementProps;
        return (
          <>
            <PropertyInput label="Width" propKey="width" value={animatedRectProps.width ?? rectElement.width} baseValue={rectElement.width} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'width')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.width} />
            <PropertyInput label="Height" propKey="height" value={animatedRectProps.height ?? rectElement.height} baseValue={rectElement.height} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'height')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.height} />
          </>
        );
      case 'circle':
        const circleElement = elementFromState as CircleElementProps;
        const animatedCircleProps = animatedElementProps as CircleElementProps;
        const displayRx = animatedCircleProps.rx ?? circleElement.rx ?? animatedCircleProps.r ?? circleElement.r ?? 0;
        const displayRy = animatedCircleProps.ry ?? circleElement.ry ?? animatedCircleProps.r ?? circleElement.r ?? 0;
        const baseRx = circleElement.rx ?? circleElement.r ?? 0;
        const baseRy = circleElement.ry ?? circleElement.r ?? 0;
        return (
          <>
            <PropertyInput label="Radius X" propKey="rx" value={displayRx} baseValue={baseRx} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'rx')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.rx} />
            <PropertyInput label="Radius Y" propKey="ry" value={displayRy} baseValue={baseRy} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'ry')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.ry} />
          </>
        );
      case 'image':
        const imageElement = elementFromState as ImageElementProps;
        const animatedImageProps = animatedElementProps as ImageElementProps;
        return (
          <>
            <PropertyInput label="Width" propKey="width" value={animatedImageProps.width ?? imageElement.width ?? ''} baseValue={imageElement.width ?? ''} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'width')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.width} />
            <PropertyInput label="Height" propKey="height" value={animatedImageProps.height ?? imageElement.height ?? ''} baseValue={imageElement.height ?? ''} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'height')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.height} />
          </>
        );
      case 'text':
        const textElement = elementFromState as TextElementProps;
        const animatedTextProps = animatedElementProps as TextElementProps;
        const isAutoWidth = textElement.width === undefined;
        const isAutoHeight = textElement.height === undefined;
        const checkboxClass = "form-checkbox h-4 w-4 text-accent-color bg-dark-bg-tertiary border-[var(--glass-border-color)] rounded focus:ring-accent-color focus:ring-offset-[var(--dark-bg-primary)] transition-colors";
        return (
          <>
            <div className="mb-2">
                <label className="flex items-center space-x-2 cursor-pointer group">
                    <input type="checkbox" checked={isAutoWidth} onChange={(e) => handleAutoSizeChange('width', e.target.checked)} className={checkboxClass} />
                    <span className="text-xs text-text-primary group-hover:text-accent-color">Auto Width</span>
                </label>
            </div>
            <PropertyInput label="Width" propKey="width" value={animatedTextProps.width} baseValue={textElement.width} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'width')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.width} isDisabledByParent={isAutoWidth} />
             <div className="my-2"> 
                <label className="flex items-center space-x-2 cursor-pointer group">
                    <input type="checkbox" checked={isAutoHeight} onChange={(e) => handleAutoSizeChange('height', e.target.checked)} className={checkboxClass} />
                    <span className="text-xs text-text-primary group-hover:text-accent-color">Auto Height</span>
                </label>
            </div>
            <PropertyInput label="Height" propKey="height" value={animatedTextProps.height} baseValue={textElement.height} inputType="number" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'height')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} sliderConfig={SLIDER_CONFIGS.height} isDisabledByParent={isAutoHeight} />
             <p className="text-xs text-text-secondary mt-1 p-2 bg-[rgba(var(--accent-rgb),0.03)] rounded-md border border-[var(--glass-border-color)]">
              When Auto is off, Width/Height define the text box.
            </p>
          </>
        );
      case 'path':
        const pathElement = elementFromState as PathElementProps;
        const animatedPathProps = animatedElementProps as PathElementProps; 
        const hasStructuredPoints = !!pathElement.structuredPoints && pathElement.structuredPoints.length > 0;
        let dValueForInput: string | BezierPoint[] = Array.isArray(animatedPathProps.d) ? animatedPathProps.d : (pathElement.structuredPoints || (animatedPathProps.d ?? pathElement.d));
        let dBaseValueForInput: string | BezierPoint[] = pathElement.structuredPoints || pathElement.d;
        const selectedPoint = hasStructuredPoints && selectedBezierPointId ? pathElement.structuredPoints!.find(p => p.id === selectedBezierPointId) : null;
        return (
          <>
            <PropertyInput label="Path Data (d)" propKey="d" value={dValueForInput} baseValue={dBaseValueForInput} inputType="textarea" ownerId={elementFromState.id} onAddKeyframe={onAddKeyframe} track={animationTracksForSelected.find(t => t.property === 'd')} currentTime={currentTime} onRemoveKeyframe={onRemoveKeyframe} isControlledBy={hasStructuredPoints ? 'structuredPoints' : null} />
            {hasStructuredPoints && (
              <div className="mt-3 pt-3 border-t border-[var(--glass-border-color)] space-y-2">
                <h4 className="text-sm font-medium text-text-primary mb-1">Selected Bezier Point</h4>
                {selectedPoint ? (
                  <div className="p-2 bg-[rgba(var(--accent-rgb),0.03)] rounded-md border border-[var(--glass-border-color)] space-y-1.5">
                    <p className="text-xs text-text-secondary">Point ID: <span className="text-accent-color">{selectedPoint.id.substring(0,12)}...</span></p>
                    <BezierPointCoordinateInput pathId={pathElement.id} pointId={selectedPoint.id} coordKey="x" value={selectedPoint.x} label="Anchor X" />
                    <BezierPointCoordinateInput pathId={pathElement.id} pointId={selectedPoint.id} coordKey="y" value={selectedPoint.y} label="Anchor Y" />
                    {selectedPoint.h1x !== undefined && <BezierPointCoordinateInput pathId={pathElement.id} pointId={selectedPoint.id} coordKey="h1x" value={selectedPoint.h1x} label="Handle 1 X" />}
                    {selectedPoint.h1y !== undefined && <BezierPointCoordinateInput pathId={pathElement.id} pointId={selectedPoint.id} coordKey="h1y" value={selectedPoint.h1y} label="Handle 1 Y" />}
                    {selectedPoint.h2x !== undefined && <BezierPointCoordinateInput pathId={pathElement.id} pointId={selectedPoint.id} coordKey="h2x" value={selectedPoint.h2x} label="Handle 2 X" />}
                    {selectedPoint.h2y !== undefined && <BezierPointCoordinateInput pathId={pathElement.id} pointId={selectedPoint.id} coordKey="h2y" value={selectedPoint.h2y} label="Handle 2 Y" />}
                     <button onClick={() => dispatch({ type: 'UPDATE_BEZIER_POINT_TYPE', payload: { pathId: pathElement.id, pointId: selectedPoint.id, isSmooth: !selectedPoint.isSmooth }})}
                        className={`w-full mt-1 glass-button !text-sm ${selectedPoint.isSmooth ? '!bg-[rgba(var(--accent-rgb),0.15)] !text-accent-color' : ''}`} >
                        {selectedPoint.isSmooth ? 'Make Corner' : 'Make Smooth'}
                      </button>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic p-2 bg-[rgba(var(--accent-rgb),0.03)] rounded-md border border-[var(--glass-border-color)] flex items-center">
                    <InformationCircleIcon size={14} className="inline mr-1.5 text-accent-color opacity-80"/>
                    Select a Bezier point on canvas to edit.
                  </p>
                )}
                 <p className="text-xs text-text-secondary mt-1">Path 'd' is derived from these points.</p>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return <div className="space-y-1">{renderPropertyInputs()}</div>;
};

export default GeometrySection;