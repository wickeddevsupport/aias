import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from './icons/EditorIcons';

interface DialInputProps {
  value: number;
  onUpdate: (newValue: number, isContinuous: boolean) => void;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
  unit?: string;
  isDisabled?: boolean;
}

const DialInput: React.FC<DialInputProps> = ({
  value,
  onUpdate,
  min = 0,
  max = 100,
  step = 1,
  sensitivity = 0.5,
  unit = '',
  isDisabled = false,
}) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, value: 0 });
  const [inputValue, setInputValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const [rulerCenter, setRulerCenter] = useState(0);

  useEffect(() => {
    if (rulerContainerRef.current) {
      setRulerCenter(rulerContainerRef.current.offsetWidth / 2);
    }
  }, []);

  useEffect(() => {
    if (!isDragging && !isEditing) {
      setInputValue(String(value));
    }
  }, [value, isDragging, isEditing]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    e.preventDefault();
    setIsEditing(false);
    document.body.style.cursor = 'ew-resize';
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      value: value,
    };
  }, [value, isDisabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const valueChange = deltaX * sensitivity;
    let newValue = dragStartRef.current.value + valueChange;
    
    // Use Math.round before clamping to ensure step precision
    newValue = Math.round(newValue / step) * step;
    newValue = Math.max(min, Math.min(max, newValue));
    
    setInputValue(String(newValue));
    onUpdate(newValue, true);
  }, [isDragging, min, max, sensitivity, step, onUpdate]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    document.body.style.cursor = 'default';
    setIsDragging(false);
    const finalValue = parseFloat(inputValue);
    if (!isNaN(finalValue)) {
      onUpdate(finalValue, false);
    } else {
      setInputValue(String(value));
    }
  }, [isDragging, onUpdate, inputValue, value]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (document.body.style.cursor === 'ew-resize') {
        document.body.style.cursor = 'default';
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value); // Allow temporary invalid input
  };
  
  const handleTextCommit = () => {
    setIsEditing(false);
    let numericValue = parseFloat(inputValue);
    if (isNaN(numericValue)) {
      numericValue = value;
    }
    numericValue = Math.max(min, Math.min(max, numericValue));
    setInputValue(String(numericValue));
    onUpdate(numericValue, false);
  };
  
  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextCommit();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(String(value));
      e.currentTarget.blur();
    }
  };

  const handleStep = (direction: 'up' | 'down') => {
    if (isDisabled) return;
    const change = direction === 'up' ? step : -step;
    let newValue = parseFloat(inputValue) + change;
    if (isNaN(newValue)) newValue = value + change;
    
    newValue = Math.max(min, Math.min(max, newValue));
    setInputValue(String(newValue));
    onUpdate(newValue, false);
  };

  const rulerSvg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='100' height='20'>
      <line x1='50' y1='20' x2='50' y2='8' stroke='rgba(255,255,255,0.8)' stroke-width='1.5' />
      <line x1='0' y1='20' x2='0' y2='8' stroke='rgba(255,255,255,0.8)' stroke-width='1.5' />
      <line x1='10' y1='20' x2='10' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='20' y1='20' x2='20' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='30' y1='20' x2='30' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='40' y1='20' x2='40' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='60' y1='20' x2='60' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='70' y1='20' x2='70' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='80' y1='20' x2='80' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='90' y1='20' x2='90' y2='12' stroke='rgba(255,255,255,0.6)' stroke-width='1' />
      <line x1='5' y1='20' x2='5' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='15' y1='20' x2='15' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='25' y1='20' x2='25' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='35' y1='20' x2='35' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='45' y1='20' x2='45' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='55' y1='20' x2='55' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='65' y1='20' x2='65' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='75' y1='20' x2='75' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='85' y1='20' x2='85' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
      <line x1='95' y1='20' x2='95' y2='15' stroke='rgba(255,255,255,0.4)' stroke-width='1' />
    </svg>
  `.replace(/\n\s*/g, '');

  const encodedRulerSvg = encodeURIComponent(rulerSvg);
  const bgPosition = rulerCenter - parseFloat(inputValue);

  return (
    <div className="mb-2">
      <div className={`relative group/value-editor flex items-center justify-center mb-2 h-10 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <input
          type="text"
          value={isEditing ? inputValue : parseFloat(inputValue).toFixed(step < 1 ? 2 : 0)}
          onChange={handleTextChange}
          onFocus={() => { if (!isDisabled) setIsEditing(true); }}
          onBlur={handleTextCommit}
          onKeyDown={handleTextKeyDown}
          className="w-full h-full text-center bg-transparent appearance-none focus:outline-none text-xl font-mono text-text-primary focus:text-accent-color focus:bg-dark-bg-tertiary/50 rounded-md transition-colors duration-200 pr-8"
          disabled={isDisabled}
        />
        <span className="absolute right-9 top-1/2 -translate-y-1/2 text-sm text-text-secondary pointer-events-none">{unit}</span>
        <div className={`absolute right-1 h-full w-8 flex flex-col justify-center transition-opacity ${isDisabled ? 'opacity-0' : 'opacity-0 group-hover/value-editor:opacity-100 focus-within:opacity-100'}`}>
          <button onClick={() => handleStep('up')} className="h-1/2 flex items-center justify-center rounded-tr-md text-text-secondary hover:text-accent-color hover:bg-white/5 disabled:text-text-placeholder disabled:hover:bg-transparent" disabled={isDisabled}><ChevronUpIcon size={16} /></button>
          <button onClick={() => handleStep('down')} className="h-1/2 flex items-center justify-center rounded-br-md text-text-secondary hover:text-accent-color hover:bg-white/5 disabled:text-text-placeholder disabled:hover:bg-transparent" disabled={isDisabled}><ChevronDownIcon size={16} /></button>
        </div>
      </div>
      <div 
        ref={dragRef}
        className={`h-8 relative overflow-hidden rounded-md bg-[var(--dark-bg-primary)] border border-[var(--glass-border-color)] select-none group/dial ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div
          ref={rulerContainerRef}
          className={`h-full w-full ${isDragging ? 'cursor-ew-resize' : (isDisabled ? 'cursor-not-allowed' : 'cursor-grab')}`}
          onMouseDown={handleMouseDown}
        >
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `url("data:image/svg+xml,${encodedRulerSvg}")`,
              backgroundRepeat: 'repeat-x',
              backgroundPosition: `${bgPosition}px center`,
              transition: isDragging ? 'none' : 'background-position 0.05s linear'
            }}
          />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <div className="w-px h-1.5 bg-accent-color" />
            <svg width="8" height="5" viewBox="0 0 8 5" className="mt-[-1px]">
              <path d="M4 0L8 5H0L4 0Z" fill="var(--accent-color)" />
            </svg>
        </div>
      </div>
    </div>
  );
};

export default DialInput;
