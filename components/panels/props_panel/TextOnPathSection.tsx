
import React, { useContext } from 'react';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, TextElementProps, AnimationTrack, AnimatableProperty, AppAction } from '../../../types';
import { AppContext } from '../../../contexts/AppContext';
import { KeyframeIcon, TrashIcon, PathIcon as SelectPathIcon } from '../../icons/EditorIcons';

interface TextOnPathSectionProps {
  elementFromState: TextElementProps;
  animatedElementProps: TextElementProps;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (elementId: string, property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  dispatch: React.Dispatch<AppAction>;
  availablePathSources: SVGElementData[];
}

const TextOnPathSection: React.FC<TextOnPathSectionProps> = ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  dispatch,
  availablePathSources,
}) => {
  const { state } = useContext(AppContext);
  const { textOnPathSelectionTargetElementId } = state;

  const currentTextPathId = animatedElementProps.textPathId || elementFromState.textPathId || '';
  const isSelectingPathForThisText = textOnPathSelectionTargetElementId === elementFromState.id;
  
  const actualAvailablePaths = availablePathSources.filter(el => el.type === 'path');

  const handleStartPathSelection = () => {
    dispatch({ type: 'SET_TEXT_ON_PATH_SELECTION_TARGET', payload: elementFromState.id });
  };

  const handleClearPath = () => {
    dispatch({ type: 'ASSIGN_TEXT_PATH', payload: { textElementId: elementFromState.id, pathElementId: null } });
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-sm font-medium text-text-secondary capitalize">Path ID</label>
        <button
          onClick={() => onAddKeyframe(elementFromState.id, 'textPath', currentTextPathId)}
          title={`Add/Update Keyframe for Text Path ID at ${currentTime.toFixed(2)}s`}
          className={`p-1.5 rounded-md ${animationTracksForSelected.find(t => t.property === 'textPath')?.keyframes.find(kf => Math.abs(kf.time - currentTime) < 0.001) ? 'bg-accent-color text-dark-bg-primary shadow-[var(--highlight-glow)]' : 'bg-[rgba(var(--accent-rgb),0.1)] hover:bg-[rgba(var(--accent-rgb),0.2)] text-accent-color'} transition-colors`}
          aria-label="Keyframe Text Path ID"
        >
          <KeyframeIcon size={14} />
        </button>
      </div>
      <div className="flex items-center justify-between p-2 glass-input min-h-[38px]">
        <span className="text-text-primary truncate" title={currentTextPathId || 'None'}>
          Path: {currentTextPathId || 'None'}
        </span>
        {currentTextPathId && (
          <button onClick={handleClearPath} className="p-1 text-red-400 hover:text-red-300 rounded-full hover:bg-red-600/30 transition-colors" title="Clear Text Path" aria-label="Clear Text Path">
            <TrashIcon size={16} />
          </button>
        )}
      </div>
      <button 
        onClick={handleStartPathSelection} 
        disabled={isSelectingPathForThisText || actualAvailablePaths.length === 0}
        className="w-full flex items-center justify-center glass-button !bg-[rgba(var(--accent-rgb),0.1)] hover:!bg-[rgba(var(--accent-rgb),0.2)] !border-[var(--glass-highlight-border)] !text-accent-color"
      >
        <SelectPathIcon size={16} className="mr-2" />
        {isSelectingPathForThisText ? "Selecting..." : (actualAvailablePaths.length === 0 ? "No Paths Available" : "Select Path on Canvas")}
      </button>
      {isSelectingPathForThisText && <p className="text-xs text-accent-color text-center opacity-80">Click a path element on the canvas.</p>}
      
      {animationTracksForSelected.find(t => t.property === 'textPath')?.keyframes.map(kf => (
        <div key={`tp-kf-${kf.time}`} className={`flex justify-between items-center text-xs p-1 rounded-md ${Math.abs(kf.time - currentTime) < 0.001 ? 'bg-[rgba(var(--accent-rgb),0.15)] text-accent-color' : 'bg-[rgba(var(--accent-rgb),0.03)] text-text-secondary'}`}>
          <span>T: {kf.time.toFixed(1)}s, V: {String(kf.value).substring(0, 15) || 'None'}</span>
          <button onClick={() => onRemoveKeyframe(elementFromState.id, 'textPath', kf.time)} className="ml-1 text-red-400 hover:text-red-500 transition-colors">
            <TrashIcon size={14} />
          </button>
        </div>
      ))}
       <p className="text-xs text-text-secondary mt-1 p-2 bg-[rgba(var(--accent-rgb),0.03)] rounded-md border border-[var(--glass-border-color)]">
        Note: Text on path ignores its X, Y, Rotation, and Scale.
      </p>
    </div>
  );
};

export default TextOnPathSection;