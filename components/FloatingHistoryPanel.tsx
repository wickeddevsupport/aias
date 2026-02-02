
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import HistoryPanelContent from './panels/HistoryPanel'; 
import { ScrollTextIcon } from './icons/EditorIcons';

interface FloatingHistoryPanelProps {
  anchorRef: React.RefObject<HTMLElement>;
}

const PANEL_WIDTH = 280; 
const PANEL_OFFSET = 10;

const FloatingHistoryPanel: React.FC<FloatingHistoryPanelProps> = ({ anchorRef }) => {
  const { dispatch } = useContext(AppContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const newTop = anchorRect.top;
      let newLeft = anchorRect.left - PANEL_WIDTH - PANEL_OFFSET;

      if (newLeft < PANEL_OFFSET) {
        newLeft = anchorRect.right + PANEL_OFFSET;
      }
      if (newLeft + PANEL_WIDTH > window.innerWidth - PANEL_OFFSET) {
        newLeft = window.innerWidth - PANEL_WIDTH - PANEL_OFFSET;
      }
      const finalTop = Math.max(PANEL_OFFSET, newTop);

      setPosition({ top: finalTop, left: newLeft });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        dispatch({ type: 'TOGGLE_HISTORY_PANEL' });
      }
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'TOGGLE_HISTORY_PANEL' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [dispatch, anchorRef]);

  if (!position) return null;

  return (
    <div
      ref={panelRef}
      id="floating-history-panel"
      className="fixed glass-panel z-50 flex flex-col p-0" // Use glass-panel and remove padding
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${PANEL_WIDTH}px`,
        maxHeight: `calc(100vh - ${position.top + PANEL_OFFSET}px)`, 
        minHeight: '150px', 
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="floating-history-title"
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--glass-border-color)] flex-shrink-0">
        <h3 id="floating-history-title" className="text-md font-semibold text-text-primary flex items-center">
          <ScrollTextIcon size={20} className="mr-2 text-accent-color" />
          Action History
        </h3>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_HISTORY_PANEL' })}
          className="p-1 text-text-secondary hover:text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-accent-color"
          aria-label="Close History Panel"
        >
          &times;
        </button>
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        <HistoryPanelContent /> {/* Content itself will handle its internal padding if needed */}
      </div>
    </div>
  );
};

export default FloatingHistoryPanel;