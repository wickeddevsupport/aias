import React from 'react';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, AnimationTrack, AnimatableProperty, AppAction } from '../../../types';
import { KeyframeIcon, TrashIcon, PathIcon as SelectPathIcon } from '../../icons/EditorIcons';
import { MOTION_PATH_SEGMENT_CONFIG, SLIDER_CONFIGS } from '../../../constants';

interface MotionPathSectionProps {
  elementFromState: SVGElementData;
  animatedElementProps: SVGElementData;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  dispatch: React.Dispatch<AppAction>;
  onStartMotionPathSelection: (elementId: string) => void;
  onClearMotionPath: (elementId: string) => void;
  isSelectingMotionPath: boolean;
  availableMotionPathSources: SVGElementData[];
}

const MotionPathSection: React.FC<MotionPathSectionProps> = ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  dispatch,
  onStartMotionPathSelection,
  onClearMotionPath,
  isSelectingMotionPath,
  availableMotionPathSources,
}) => {
  const currentMotionPathId = (animatedElementProps as any).motionPathId || (elementFromState as any).motionPathId || '';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-sm font-medium text-text-secondary capitalize">Path ID</label>
        <button
          onClick={() => onAddKeyframe('motionPath', currentMotionPathId)}
          title={`Add/Update Keyframe for Motion Path ID at ${currentTime.toFixed(2)}s`}
          className={`p-1.5 rounded-md ${animationTracksForSelected.find(t => t.property === 'motionPath')?.keyframes.find(kf => Math.abs(kf.time - currentTime) < 0.001) ? 'bg-accent-color text-dark-bg-primary shadow-[var(--highlight-glow)]' : 'bg-[rgba(var(--accent-rgb),0.1)] hover:bg-[rgba(var(--accent-rgb),0.2)] text-accent-color'} transition-colors`}
          aria-label="Keyframe Motion Path ID"
        >
          <KeyframeIcon size={14} />
        </button>
      </div>
      <div className="flex items-center justify-between p-2 glass-input min-h-[38px]">
        <span className="text-text-primary truncate" title={currentMotionPathId || 'None'}>
          Path: {currentMotionPathId || 'None'}
        </span>
        {currentMotionPathId && (
          <button onClick={() => onClearMotionPath(elementFromState.id)} className="p-1 text-red-400 hover:text-red-300 rounded-full hover:bg-red-600/30 transition-colors" title="Clear Motion Path & Keyframe" aria-label="Clear Motion Path">
            <TrashIcon size={16} />
          </button>
        )}
      </div>
      <button onClick={() => onStartMotionPathSelection(elementFromState.id)} disabled={isSelectingMotionPath || availableMotionPathSources.length === 0}
        className="w-full flex items-center justify-center glass-button !bg-[rgba(var(--accent-rgb),0.1)] hover:!bg-[rgba(var(--accent-rgb),0.2)] !border-[var(--glass-highlight-border)] !text-accent-color"
      >
        <SelectPathIcon size={16} className="mr-2" />
        {isSelectingMotionPath ? "Selecting..." : (availableMotionPathSources.length === 0 ? "No Shapes Available" : "Select Shape on Canvas")}
      </button>
      {isSelectingMotionPath && <p className="text-xs text-accent-color text-center opacity-80">Click a path, rectangle, or circle on the canvas.</p>}
      
      {animationTracksForSelected.find(t => t.property === 'motionPath')?.keyframes.map(kf => (
        <div key={`mp-kf-${kf.time}`} className={`flex justify-between items-center text-xs p-1 rounded-md ${Math.abs(kf.time - currentTime) < 0.001 ? 'bg-[rgba(var(--accent-rgb),0.15)] text-accent-color' : 'bg-[rgba(var(--accent-rgb),0.03)] text-text-secondary'}`}>
          <span>T: {kf.time.toFixed(1)}s, V: {String(kf.value).substring(0, 15) || 'None'}</span>
          <button onClick={() => onRemoveKeyframe(elementFromState.id, 'motionPath', kf.time)} className="ml-1 text-red-400 hover:text-red-300 transition-colors">
            <TrashIcon size={14} />
          </button>
        </div>
      ))}

      <div className="mt-2 pt-2 border-t border-[var(--glass-border-color)]">
        {['alignToPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'].map(propKeyStr => {
          const propKey = propKeyStr as AnimatableProperty | 'alignToPath';
          if (propKey === 'alignToPath') {
            return (
              <div key={propKey} className="my-2">
                <label htmlFor={`alignToPath-${elementFromState.id}`} className="flex items-center space-x-2 cursor-pointer group">
                  <input type="checkbox" id={`alignToPath-${elementFromState.id}`} checked={!!(animatedElementProps as any).alignToPath}
                    onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: { alignToPath: e.target.checked } } })}
                    className="form-checkbox h-4 w-4 text-accent-color bg-dark-bg-tertiary border-[var(--glass-border-color)] rounded focus:ring-accent-color focus:ring-offset-[var(--dark-bg-primary)] transition-colors"
                  />
                  <span className="text-sm text-text-primary group-hover:text-accent-color">Align to Path Direction</span>
                </label>
                <p className="text-xs text-text-secondary mt-1">Rotates element to follow path. Overrides 'rotation' keyframes.</p>
              </div>
            );
          }
          const animProp = propKey as AnimatableProperty;
          const baseValue = (elementFromState as any)[animProp];
          const displayValue = (animatedElementProps as any)[animProp];
          const currentSliderConfigForProp = animProp === 'motionPathStart' || animProp === 'motionPathEnd' ? MOTION_PATH_SEGMENT_CONFIG : SLIDER_CONFIGS[animProp as keyof typeof SLIDER_CONFIGS];

          return (
            <PropertyInput
              key={animProp}
              label={animProp.replace(/([A-Z])/g, ' $1').replace('motion Path', 'Motion Path')}
              propKey={animProp}
              value={displayValue ?? baseValue ?? 0}
              baseValue={baseValue ?? 0}
              inputType={'number'}
              ownerId={elementFromState.id}
              onAddKeyframe={onAddKeyframe}
              track={animationTracksForSelected.find(t => t.property === animProp)}
              currentTime={currentTime}
              onRemoveKeyframe={onRemoveKeyframe}
              sliderConfig={currentSliderConfigForProp}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MotionPathSection;