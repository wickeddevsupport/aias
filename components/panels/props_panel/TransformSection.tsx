import React from 'react';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, AnimationTrack, AnimatableProperty, AppAction } from '../../../types';
import { SLIDER_CONFIGS } from '../../../constants';

interface TransformSectionProps {
  elementFromState: SVGElementData;
  animatedElementProps: SVGElementData;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  dispatch: React.Dispatch<AppAction>;
}

const TransformSection: React.FC<TransformSectionProps> = ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  dispatch,
}) => {
  const transformProps: AnimatableProperty[] = ['x', 'y', 'rotation', 'scale'];

  return (
    <div className="space-y-1">
      {transformProps.map(propKey => {
        const baseValue = (elementFromState as any)[propKey];
        
        let displayValue = (animatedElementProps as any)[propKey];
        if (displayValue === undefined) {
          displayValue = baseValue;
        }
        if (displayValue === undefined) {
          displayValue = (propKey === 'scale') ? 1 : 0;
        }

        let controlStatus: 'motionPath' | 'alignToPath' | null = null;
        if (elementFromState.motionPathId) {
          if (propKey === 'x' || propKey === 'y') {
            controlStatus = 'motionPath';
          } else if (propKey === 'rotation' && elementFromState.alignToPath) {
            controlStatus = 'alignToPath';
          }
        }
        
        return (
          <PropertyInput
            key={propKey}
            label={propKey.charAt(0).toUpperCase() + propKey.slice(1)}
            propKey={propKey}
            value={displayValue}
            baseValue={baseValue ?? ((propKey === 'scale') ? 1 : 0)} 
            inputType="number"
            ownerId={elementFromState.id}
            onAddKeyframe={onAddKeyframe}
            track={animationTracksForSelected.find(t => t.property === propKey)}
            currentTime={currentTime}
            onRemoveKeyframe={onRemoveKeyframe}
            sliderConfig={SLIDER_CONFIGS[propKey as keyof typeof SLIDER_CONFIGS]}
            isControlledBy={controlStatus}
          />
        );
      })}
    </div>
  );
};

export default TransformSection;