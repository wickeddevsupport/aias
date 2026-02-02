
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COMMON_FONT_FAMILIES } from '../../../constants';
import { ChevronUpDownIcon } from '../../icons/EditorIcons';

interface FontFamilyPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

const cleanFontName = (fontFamily: string) => {
  return fontFamily.split(',')[0].replace(/['"]/g, '').trim();
};

const FontFamilyPicker: React.FC<FontFamilyPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredFonts = COMMON_FONT_FAMILIES.filter(font =>
    cleanFontName(font).toLowerCase().includes(filter.toLowerCase())
  );

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const handleSelectFont = (font: string) => {
    onChange(font);
    setFilter(cleanFontName(font)); // Update filter to show selected font, but onFocus will clear it
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
    setIsOpen(true); 
  };
  
  const handleInputFocus = () => {
     setFilter(''); 
     setIsOpen(true);
  };

  const displayedValue = cleanFontName(value);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={filter || displayedValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-full glass-input pr-8" // Use glass-input
          placeholder="Select Font"
        />
        <ChevronUpDownIcon 
            size={18} 
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" // Adjusted position
            onClick={() => setIsOpen(!isOpen)} // Allow click on icon too
        />
      </div>
      {isOpen && (
        <ul className="absolute z-20 w-full mt-1 bg-dark-bg-secondary border border-[var(--glass-border-color)] rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {filteredFonts.length > 0 ? (
            filteredFonts.map(font => (
              <li
                key={font}
                onClick={() => handleSelectFont(font)}
                className="px-3 py-2 text-sm text-text-primary hover:bg-[rgba(var(--accent-rgb),0.1)] hover:text-accent-color cursor-pointer"
                style={{ fontFamily: font }} 
              >
                {cleanFontName(font)}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-text-placeholder italic">No fonts match "{filter}"</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default FontFamilyPicker;