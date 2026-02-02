
import React from 'react';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, AnimationTrack, AnimatableProperty, AppAction } from '../../../types';
import { InformationCircleIcon } from '../../icons/EditorIcons';
import { SLIDER_CONFIGS } from '../../../constants';

interface DrawEffectSectionProps {
  elementFromState: SVGElementData;
  animatedElementProps: SVGElementData;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (elementId: string, property: AnimatableProperty, value: any) => void;
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
  const note = "Use Draw Start/End % for segment drawing. These override direct Dasharray/Offset for this effect if active (not 0%-100%).";

  const properties: AnimatableProperty[] = ['drawStartPercent', 'drawEndPercent', 'strokeDasharray', 'strokeDashoffset'];

  return (
    <div className="space-y-1">
      <p className="text-xs text-text-secondary mb-2 p-2 bg-[rgba(var(--accent-rgb),0.03)] rounded-md border border-[var(--glass-border-color)] flex items-start">
        <InformationCircleIcon size={16} className="mr-1.5 flex-shrink-0 text-accent-color opacity-80" />
        {note}
      </p>
      {properties.map(propKey => {
        const baseValue = (elementFromState as any)[propKey];
        const displayValue = (animatedElementProps as any)[propKey];
        
        let inputType = "number";
        if (propKey === 'strokeDasharray') inputType = 'text';

        let currentSliderConfig = SLIDER_CONFIGS[propKey as keyof typeof SLIDER_CONFIGS];
        if (propKey === 'strokeDashoffset' && shapePathLength !== undefined && shapePathLength > 0) {
            currentSliderConfig = { min: -Math.ceil(shapePathLength * 1.5), max: Math.ceil(shapePathLength * 1.5), step: 1 };
        } else if (propKey === 'strokeDasharray' && shapePathLength !== undefined && shapePathLength > 0) {
            currentSliderConfig = { min: 0, max: Math.ceil(shapePathLength) +2, step: 1 };
        }
        
        const finalDisplayValue = displayValue ?? baseValue ?? (inputType === 'number' ? (propKey === 'drawEndPercent' ? 1 : 0) : '');
        const finalBaseValue = baseValue ?? (inputType === 'number' ? (propKey === 'drawEndPercent' ? 1 : 0) : '');


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
            shapePathLength={propKey === 'strokeDasharray' ? shapePathLength : undefined}
          />
        );
      })}
    </div>
  );
};

export default DrawEffectSection;