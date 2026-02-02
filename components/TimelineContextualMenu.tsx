
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AnimatableProperty, Keyframe, SVGElementData, RectElementProps, CircleElementProps, PathElementProps, EASING_FUNCTIONS, CustomBezierPoints, STANDARD_EASE_TO_BEZIER_MAP } from '../types';
import { getElementAnimatableProperties } from '../utils/animationUtils';
import PropertyInput from './PropertyInput'; 
import EasingCurvePreview from './EasingCurvePreview';
import { ChevronDownIconSolid, RefreshCwIcon, RepeatIcon } from './icons/EditorIcons'; 
import { DEFAULT_KEYFRAME_EASING, SLIDER_CONFIGS } from '../constants';

const TimelineContextualMenu: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { selectedTimelineContextItem, elements, animation, currentTime } = state;

  const [localKeyframeTime, setLocalKeyframeTime] = useState<string>('');
  const [localKeyframeValue, setLocalKeyframeValue] = useState<any>(null);
  const [currentCustomBezier, setCurrentCustomBezier] = useState<CustomBezierPoints>(
    STANDARD_EASE_TO_BEZIER_MAP['linear'] 
  );


  const [segmentCycleRepeats, setSegmentCycleRepeats] = useState<string>("1");
  const [segmentIsInfinite, setSegmentIsInfinite] = useState<boolean>(false);
  const [segmentBeginEnabled, setSegmentBeginEnabled] = useState<boolean>(true);
  const [segmentBeginTimeType, setSegmentBeginTimeType] = useState<string>("Time");
  const [segmentBeginTimeValue, setSegmentBeginTimeValue] = useState<string>("0.52s");
  const [segmentEndEnabled, setSegmentEndEnabled] = useState<boolean>(false);
  const [segmentMaxDurationEnabled, setSegmentMaxDurationEnabled] = useState<boolean>(false);
  const [segmentEasingEnabled, setSegmentEasingEnabled] = useState<boolean>(true);
  const [segmentEasingFunction, setSegmentEasingFunction] = useState<string>("linear");
  const [segmentRestartPolicy, setSegmentRestartPolicy] = useState<string>("Always");


  const selectedElement = selectedTimelineContextItem ? elements.find(el => el.id === selectedTimelineContextItem.elementId) : null;
  const selectedTrack = selectedTimelineContextItem ? animation.tracks.find(t => t.elementId === selectedTimelineContextItem.elementId && t.property === selectedTimelineContextItem.property) : null;
  
  let currentKeyframe: Keyframe | undefined = undefined;
  if (selectedTimelineContextItem?.type === 'keyframe' && selectedTrack) {
    currentKeyframe = selectedTrack.keyframes.find(kf => kf.time === selectedTimelineContextItem.time);
  }


  useEffect(() => {
    if (selectedTimelineContextItem?.type === 'keyframe' && currentKeyframe) {
      setLocalKeyframeTime(currentKeyframe.time.toFixed(2));
      setLocalKeyframeValue(currentKeyframe.value);
      
      const easing = currentKeyframe.easing || DEFAULT_KEYFRAME_EASING;
      if (easing.startsWith('cubic-bezier(')) {
        try {
          const paramsMatch = easing.match(/cubic-bezier\(([^)]+)\)/);
          if (paramsMatch && paramsMatch[1]) {
            const params = paramsMatch[1].split(',').map(p => parseFloat(p.trim()));
            if (params.length === 4) {
              setCurrentCustomBezier({ p1x: params[0], p1y: params[1], p2x: params[2], p2y: params[3] });
              return;
            }
          }
        } catch (e) { console.error("Error parsing existing bezier string:", e); }
      } else {
        const initialPoints = STANDARD_EASE_TO_BEZIER_MAP[easing] || STANDARD_EASE_TO_BEZIER_MAP['easeInOutCubic'];
        setCurrentCustomBezier(initialPoints);
      }
    } else {
      setLocalKeyframeTime('');
      setLocalKeyframeValue(null);
      setCurrentCustomBezier(STANDARD_EASE_TO_BEZIER_MAP['linear']); 
    }
  }, [selectedTimelineContextItem, currentKeyframe]);


  const handleKeyframeTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalKeyframeTime(e.target.value);
  };

  const handleKeyframeTimeBlur = () => {
    if (selectedTimelineContextItem?.type === 'keyframe' && currentKeyframe) {
      const newTimeNum = parseFloat(localKeyframeTime);
      if (!isNaN(newTimeNum) && newTimeNum !== currentKeyframe.time) {
        const clampedTime = Math.max(0, Math.min(animation.duration, newTimeNum));
        dispatch({
          type: 'UPDATE_KEYFRAME_TIME',
          payload: {
            elementId: selectedTimelineContextItem.elementId,
            property: selectedTimelineContextItem.property,
            oldTime: currentKeyframe.time,
            newTime: clampedTime,
          },
        });
        dispatch({
            type: 'SET_TIMELINE_CONTEXT_ITEM',
            payload: { ...selectedTimelineContextItem, time: clampedTime }
        });
      } else {
        setLocalKeyframeTime(currentKeyframe.time.toFixed(2)); 
      }
    }
  };

  const handleKeyframePropertyUpdate = (prop: keyof Omit<Keyframe, 'time' | 'value'>, value: any) => {
    if (selectedTimelineContextItem?.type === 'keyframe' && currentKeyframe) {
      dispatch({
        type: 'UPDATE_KEYFRAME_PROPERTIES',
        payload: {
          elementId: selectedTimelineContextItem.elementId,
          property: selectedTimelineContextItem.property,
          time: currentKeyframe.time,
          newKeyframeProps: { [prop]: value },
        },
      });
      if (prop === 'easing') {
        if (value === 'custom') {
          const prevEasing = currentKeyframe.easing || DEFAULT_KEYFRAME_EASING;
          const initialPoints = STANDARD_EASE_TO_BEZIER_MAP[prevEasing] || STANDARD_EASE_TO_BEZIER_MAP['easeInOutCubic'];
          setCurrentCustomBezier(initialPoints);
           dispatch({
            type: 'UPDATE_KEYFRAME_PROPERTIES',
            payload: {
              elementId: selectedTimelineContextItem.elementId,
              property: selectedTimelineContextItem.property,
              time: currentKeyframe.time,
              newKeyframeProps: { easing: `cubic-bezier(${initialPoints.p1x.toFixed(3)},${initialPoints.p1y.toFixed(3)},${initialPoints.p2x.toFixed(3)},${initialPoints.p2y.toFixed(3)})` },
            },
          });

        } else if (value.startsWith('cubic-bezier(')) {
        } else { 
            const newStandardPoints = STANDARD_EASE_TO_BEZIER_MAP[value] || STANDARD_EASE_TO_BEZIER_MAP['easeInOutCubic'];
            setCurrentCustomBezier(newStandardPoints);
        }
      }
    }
  };

  const handleCustomBezierPointsChange = useCallback((points: CustomBezierPoints) => {
    if (selectedTimelineContextItem?.type === 'keyframe' && currentKeyframe) {
        const bezierString = `cubic-bezier(${points.p1x.toFixed(3)},${points.p1y.toFixed(3)},${points.p2x.toFixed(3)},${points.p2y.toFixed(3)})`;
        setCurrentCustomBezier(points); 
        
        const isInitiatingCustomEdit = !currentKeyframe.easing?.startsWith('cubic-bezier(') && currentKeyframe.easing !== 'custom';

        dispatch({
            type: 'UPDATE_KEYFRAME_PROPERTIES',
            payload: {
                elementId: selectedTimelineContextItem.elementId,
                property: selectedTimelineContextItem.property,
                time: currentKeyframe.time,
                newKeyframeProps: { easing: bezierString },
            },
        });
    }
  }, [selectedTimelineContextItem, currentKeyframe, dispatch]);
  
  const handleKeyframeValueUpdateCommit = () => {
     if (selectedTimelineContextItem?.type === 'keyframe' && currentKeyframe) {
        dispatch({
            type: 'ADD_KEYFRAME',
            payload: {
                elementId: selectedTimelineContextItem.elementId,
                property: selectedTimelineContextItem.property,
                time: currentKeyframe.time,
                value: localKeyframeValue 
            }
        });
     }
  };

  const renderKeyframeValueInputs = () => {
    if (!selectedElement || !selectedTimelineContextItem || selectedTimelineContextItem.type !== 'keyframe' || !currentKeyframe) return null;
    
    const prop = selectedTimelineContextItem.property;
    let inputType = "text";
    let step: string | number = "any";

    const numericProps: AnimatableProperty[] = ['x', 'y', 'width', 'height', 'r', 'rx', 'ry', 'opacity', 'rotation', 'scale', 'strokeWidth', 'strokeDashoffset', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY', 'drawStartPercent', 'drawEndPercent', 'fontSize', 'letterSpacing', 'lineHeight'];
    if (numericProps.includes(prop)) {
        inputType = "number";
        if (prop === 'opacity' || prop === 'scale' || prop === 'motionPathStart' || prop === 'motionPathEnd' || prop === 'drawStartPercent' || prop === 'drawEndPercent' || prop === 'lineHeight') {
            step = "0.01";
        } else {
            step = "1";
        }
    } else if (prop === 'd') {
        inputType = "textarea";
    }
    
    if (typeof localKeyframeValue === 'object' && localKeyframeValue !== null) {
        return <p className="text-xs text-text-secondary p-1.5 bg-[rgba(var(--accent-rgb),0.03)] border border-[var(--glass-border-color)] rounded-md">Gradient Value (Edit in Properties Panel)</p>;
    }

    if (inputType === 'textarea') {
        return (
            <textarea
                id={`kf-value-${prop}`}
                value={String(localKeyframeValue)}
                onChange={(e) => setLocalKeyframeValue(e.target.value)}
                onBlur={handleKeyframeValueUpdateCommit}
                className="w-full p-1.5 glass-textarea min-h-[60px] custom-scrollbar"
            />
        );
    }

    return (
        <input
            id={`kf-value-${prop}`}
            type={inputType}
            value={String(localKeyframeValue)}
            onChange={(e) => {
                const val = inputType === 'number' ? parseFloat(e.target.value) : e.target.value;
                setLocalKeyframeValue(val);
            }}
            onBlur={handleKeyframeValueUpdateCommit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            step={inputType === 'number' ? step : undefined}
            className="w-full p-1.5 glass-input"
        />
    );
  };


  if (!selectedTimelineContextItem || !selectedElement) {
    return (
      <div className="p-3 text-xs text-text-secondary text-center h-full flex items-center justify-center">
        Select a keyframe or animation segment to see its properties.
      </div>
    );
  }

  if (selectedTimelineContextItem.type === 'keyframe' && currentKeyframe) {
    const { property } = selectedTimelineContextItem;
    let kfEasing = currentKeyframe.easing || DEFAULT_KEYFRAME_EASING;
    const kfFreeze = currentKeyframe.freeze || false;

    const isCustomEasingSelectedInDropdown = EASING_FUNCTIONS.find(ef => ef.id === kfEasing)?.id === 'custom';
    let displayedEasingValueInDropdown = kfEasing;
    if (kfEasing.startsWith('cubic-bezier(') && !isCustomEasingSelectedInDropdown) {
        displayedEasingValueInDropdown = 'custom'; 
    }


    return (
      <div className="h-full flex flex-col space-y-3 text-xs text-text-primary custom-scrollbar overflow-y-auto p-1">
        <h4 className="text-sm font-semibold text-accent-color border-b border-[var(--glass-border-color)] pb-1.5 mb-1.5">
          Keyframe: {property}
        </h4>
        
        <div className="space-y-1 p-2 border border-[var(--glass-border-color)] rounded-md bg-[rgba(var(--accent-rgb),0.02)]">
            <label htmlFor={`kf-value-${property}`} className="block text-xs font-medium text-text-secondary mb-1">Value</label>
            {renderKeyframeValueInputs()}
        </div>

        <div>
          <label htmlFor="kf-time" className="block text-xs font-medium text-text-secondary mb-1">Time (s)</label>
          <input
            id="kf-time"
            type="number"
            value={localKeyframeTime}
            onChange={handleKeyframeTimeChange}
            onBlur={handleKeyframeTimeBlur}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            step="0.01"
            className="w-full p-1.5 glass-input"
          />
        </div>

        <div className="relative">
          <label htmlFor="kf-easing" className="block text-xs font-medium text-text-secondary mb-1">Easing Function</label>
          <select
            id="kf-easing"
            value={displayedEasingValueInDropdown}
            onChange={(e) => handleKeyframePropertyUpdate('easing', e.target.value)}
            className="w-full p-1.5 glass-select custom-scrollbar"
          >
            {EASING_FUNCTIONS.map(ef => <option key={ef.id} value={ef.id}>{ef.label}</option>)}
          </select>
        </div>
        <EasingCurvePreview 
            easingFunction={kfEasing} 
            customBezierPoints={currentCustomBezier} 
            onCustomBezierChange={handleCustomBezierPointsChange} 
            width={220} 
            height={120}
        />

        <div className="flex items-center space-x-2 mt-2">
          <input
            type="checkbox"
            id="kf-freeze"
            checked={kfFreeze}
            onChange={(e) => handleKeyframePropertyUpdate('freeze', e.target.checked)}
            className="form-checkbox h-3.5 w-3.5 text-accent-color bg-dark-bg-tertiary border-[var(--glass-border-color)] rounded focus:ring-accent-color focus:ring-offset-[var(--dark-bg-primary)] transition-colors"
          />
          <label htmlFor="kf-freeze" className="text-xs text-text-primary cursor-pointer">Freeze Value (Step End)</label>
        </div>
      </div>
    );
  }

  if (selectedTimelineContextItem.type === 'segment') {
    const { property, startTime, endTime } = selectedTimelineContextItem;
    const duration = endTime - startTime;
    
    return (
      <div className="h-full flex flex-col space-y-3 text-xs text-text-primary custom-scrollbar overflow-y-auto p-1">
        <h4 className="text-sm font-semibold text-accent-color border-b border-[var(--glass-border-color)] pb-1.5 mb-1.5">
          Animation: {property}
        </h4>
        
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-0.5">Cycle duration</label>
          <input
            type="text"
            value={`${duration.toFixed(2)}s`}
            readOnly
            className="w-full p-1.5 glass-input !bg-[var(--dark-bg-tertiary)] !cursor-default"
          />
        </div>

        <div>
          <label htmlFor="segment-repeats" className="block text-xs font-medium text-text-secondary mb-0.5">Cycle repeats</label>
          <div className="flex items-center space-x-1.5">
            <input
              id="segment-repeats"
              type="number"
              value={segmentCycleRepeats}
              onChange={(e)=> setSegmentCycleRepeats(e.target.value)}
              disabled={segmentIsInfinite}
              className="flex-grow p-1.5 glass-input disabled:!bg-[var(--dark-bg-tertiary)] disabled:!text-text-placeholder"
              min="1"
              step="1"
            />
            <button 
              onClick={() => setSegmentIsInfinite(!segmentIsInfinite)}
              className={`p-1.5 glass-button !rounded-md ${segmentIsInfinite ? '!bg-[rgba(var(--accent-rgb),0.25)] !text-accent-color' : ''}`}
              title="Toggle infinite repeats"
            >
              <RepeatIcon size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <label htmlFor="segment-begin-toggle" className="text-xs font-medium text-text-secondary">Begin</label>
                <button onClick={() => setSegmentBeginEnabled(!segmentBeginEnabled)} className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${segmentBeginEnabled ? 'bg-accent-color justify-end' : 'bg-gray-600 justify-start'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform`}/>
                </button>
            </div>
            {segmentBeginEnabled && (
                <div className="pl-2 space-y-1">
                     <div className="relative">
                        <select value={segmentBeginTimeType} onChange={(e) => setSegmentBeginTimeType(e.target.value)} className="w-full p-1.5 glass-select">
                            <option value="Time">Time</option>
                        </select>
                    </div>
                    <input type="text" value={segmentBeginTimeValue} onChange={(e) => setSegmentBeginTimeValue(e.target.value)} className="w-full p-1.5 glass-input" placeholder="e.g. 0.52s"/>
                </div>
            )}
        </div>
        
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <label htmlFor="segment-end-toggle" className="text-xs font-medium text-text-secondary">End</label>
                 <button onClick={() => setSegmentEndEnabled(!segmentEndEnabled)} className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${segmentEndEnabled ? 'bg-accent-color justify-end' : 'bg-gray-600 justify-start'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform`}/>
                </button>
            </div>
        </div>

        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <label htmlFor="segment-easing-toggle" className="text-xs font-medium text-text-secondary">Easing</label>
                 <button onClick={() => setSegmentEasingEnabled(!segmentEasingEnabled)} className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${segmentEasingEnabled ? 'bg-accent-color justify-end' : 'bg-gray-600 justify-start'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform`}/>
                </button>
            </div>
            {segmentEasingEnabled && (
                <div className="pl-2 relative">
                    <select value={segmentEasingFunction} onChange={(e) => setSegmentEasingFunction(e.target.value)} className="w-full p-1.5 glass-select">
                         {EASING_FUNCTIONS.map(ef => <option key={ef.id} value={ef.id}>{ef.label}</option>)}
                    </select>
                </div>
            )}
        </div>
        
        <div className="relative">
          <label htmlFor="segment-restart" className="block text-xs font-medium text-text-secondary mb-0.5">Restart</label>
          <select
            id="segment-restart"
            value={segmentRestartPolicy}
            onChange={(e) => setSegmentRestartPolicy(e.target.value)}
            className="w-full p-1.5 glass-select"
          >
            <option value="Always">Always</option>
            <option value="WhenNotActive">When Not Active</option>
            <option value="Never">Never</option>
          </select>
        </div>

        <p className="text-text-placeholder text-center mt-3 text-[10px]">Segment animation controls are UI placeholders.</p>

      </div>
    );
  }

  return null; 
};

export default TimelineContextualMenu;
