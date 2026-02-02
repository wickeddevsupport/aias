import React from 'react';
import PropertyInput from '../../PropertyInput';
import { AnimationTrack, AnimatableProperty, AppAction, RectElementProps, CircleElementProps, PathElementProps } from '../../../types';
import { InformationCircleIcon } from '../../icons/EditorIcons';
import { SLIDER_CONFIGS } from '../../../constants';
import DialInput from '../../DialInput';

interface DrawEffectSectionProps {
  elementFromState: RectElementProps | CircleElementProps | PathElementProps;
  animatedElementProps: RectElementProps | CircleElementProps | PathElementProps;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  dispatch: React.Dispatch<AppAction>;
  shapePathLength?: number;
}

const DrawEffectSection: React.FC<DrawEffectSectionProps> = ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  dispatch,
  shapePathLength,
}) => {
  const note = "Use Draw Start/End % for segment drawing. These override direct Dasharray/Offset for this effect if active (i.e. not default 0% to 100%).";

  const drawStartPercentTrack = animationTracksForSelected.find(t => t.property === 'drawStartPercent');
  const drawEndPercentTrack = animationTracksForSelected.find(t => t.property === 'drawEndPercent');
  
  const isPercentageDrawActive =
    (drawStartPercentTrack && drawStartPercentTrack.keyframes.length > 0) ||
    (drawEndPercentTrack && drawEndPercentTrack.keyframes.length > 0) ||
    (elementFromState.drawStartPercent !== undefined && elementFromState.drawStartPercent !== 0) ||
    (elementFromState.drawEndPercent !== undefined && elementFromState.drawEndPercent !== 1);

  const properties: AnimatableProperty[] = ['drawStartPercent', 'drawEndPercent', 'strokeDasharray', 'strokeDashoffset'];

  return (
    <div className="space-y-1">
      <p className="text-xs text-text-secondary mb-2 p-2 bg-[rgba(var(--accent-rgb),0.03)] rounded-md border border-[var(--glass-border-color)] flex items-start">
        <InformationCircleIcon size={16} className="mr-1.5 flex-shrink-0 text-accent-color opacity-80" />
        {note}
      </p>
      {properties.map(propKey => {
        if (propKey === 'strokeDasharray') {
          const dashArrayString = (animatedElementProps as any).strokeDasharray ?? (elementFromState as any).strokeDasharray ?? '';
          const parts = typeof dashArrayString === 'string' ? dashArrayString.split(/[\s,]+/).map(s => parseFloat(s)).filter(n => !isNaN(n)) : [];
          const dashVal = parts[0] ?? 0;
          const gapVal = parts[1] ?? dashVal;

          const handleDashChange = (newDash: number, isContinuous: boolean) => {
            const payloadProps = { strokeDasharray: `${newDash.toFixed(1)} ${gapVal.toFixed(1)}` };
            dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: payloadProps, skipHistory: isContinuous } });
          };
      
          const handleGapChange = (newGap: number, isContinuous: boolean) => {
            const payloadProps = { strokeDasharray: `${dashVal.toFixed(1)} ${newGap.toFixed(1)}` };
            dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: payloadProps, skipHistory: isContinuous } });
          };

          return (
            <PropertyInput
              key="strokeDasharray"
              label="Dash Array"
              propKey="strokeDasharray"
              value={dashArrayString}
              baseValue={(elementFromState as any).strokeDasharray ?? ''}
              inputType="custom"
              ownerId={elementFromState.id}
              onAddKeyframe={onAddKeyframe}
              track={animationTracksForSelected.find(t => t.property === 'strokeDasharray')}
              currentTime={currentTime}
              onRemoveKeyframe={onRemoveKeyframe}
              isControlledBy={isPercentageDrawActive ? 'drawEffect' : null}
            >
              <div className="grid grid-cols-2 gap-2">
                  <div>
                      <label className="text-xs text-text-secondary pl-1 mb-1 block">Dash</label>
                      <DialInput value={dashVal} onUpdate={handleDashChange} isDisabled={isPercentageDrawActive} min={0} max={shapePathLength || 1000} step={1} unit="px" />
                  </div>
                  <div>
                      <label className="text-xs text-text-secondary pl-1 mb-1 block">Gap</label>
                      <DialInput value={gapVal} onUpdate={handleGapChange} isDisabled={isPercentageDrawActive} min={0} max={shapePathLength || 1000} step={1} unit="px" />
                  </div>
              </div>
            </PropertyInput>
          );
        }

        const baseValue = (elementFromState as any)[propKey];
        const displayValue = (animatedElementProps as any)[propKey];
        const inputType = "number";

        let currentSliderConfig = SLIDER_CONFIGS[propKey as keyof typeof SLIDER_CONFIGS];
        if (propKey === 'strokeDashoffset' && shapePathLength !== undefined && shapePathLength > 0) {
            currentSliderConfig = { min: -Math.ceil(shapePathLength * 1.5), max: Math.ceil(shapePathLength * 1.5), step: 1 };
        }
        
        const finalDisplayValue = displayValue ?? baseValue ?? (propKey === 'drawEndPercent' ? 1 : 0);
        const finalBaseValue = baseValue ?? (propKey === 'drawEndPercent' ? 1 : 0);

        return (
          <PropertyInput
            key={propKey}
            label={propKey.replace(/([A-Z])/g, ' $1')}
            propKey={propKey}
            value={finalDisplayValue}
            baseValue={finalBaseValue}
            inputType={inputType}
            ownerId={elementFromState.id}
            onAddKeyframe={onAddKeyframe}
            track={animationTracksForSelected.find(t => t.property === propKey)}
            currentTime={currentTime}
            onRemoveKeyframe={onRemoveKeyframe}
            sliderConfig={currentSliderConfig}
            isControlledBy={(propKey === 'strokeDashoffset' && isPercentageDrawActive) ? 'drawEffect' : null}
          />
        );
      })}
    </div>
  );
};

export default DrawEffectSection;