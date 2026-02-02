
import React from 'react';
import { ChevronDownIconSolid } from './icons/EditorIcons';

interface AccordionGroupProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  headerExtras?: React.ReactNode;
  dragHandleSide?: 'left' | 'right';
}

const AccordionGroup: React.FC<AccordionGroupProps> = ({
    title,
    isOpen,
    onToggle,
    children,
    className = '',
    headerExtras,
    dragHandleSide = 'right'
}) => {
  return (
    <div className={`bg-[rgba(var(--accent-rgb),0.02)] border border-[var(--glass-border-color)] rounded-lg shadow-sm overflow-hidden backdrop-blur-sm ${className}`}>
      <div className={`flex items-center justify-between w-full bg-transparent hover:bg-[rgba(var(--accent-rgb),0.04)] transition-colors`}>
        {dragHandleSide === 'left' && headerExtras && (
          <div className="pl-2 flex-shrink-0">{headerExtras}</div>
        )}
        <button
          type="button"
          className="flex-grow flex items-center px-3 py-2.5 text-left text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-color focus:ring-offset-0"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`accordion-content-${title.replace(/\s+/g, '-')}`}
          draggable="false" 
        >
          <span className="flex-grow">{title}</span>
          <ChevronDownIconSolid
            size={16}
            className={`text-text-secondary transform transition-transform duration-200 group-hover:text-accent-color ${
              isOpen ? 'rotate-0 text-accent-color' : '-rotate-90'
            } ml-2`}
          />
        </button>
        {dragHandleSide === 'right' && headerExtras && (
          <div className="pr-2 flex-shrink-0">{headerExtras}</div>
        )}
      </div>
      {isOpen && (
        <div
          id={`accordion-content-${title.replace(/\s+/g, '-')}`}
          className="p-3 bg-transparent border-t border-[var(--glass-border-color)]" // Content area also transparent
          role="region"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default AccordionGroup;
