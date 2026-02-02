
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext'; 
import { ScrollTextIcon, RestartIcon, RotateCwIcon } from '../icons/EditorIcons'; 

interface HistoryPanelContentProps {
  // No specific props needed if it only consumes context
}

const HistoryPanelContent: React.FC<HistoryPanelContentProps> = () => {
  const { state, dispatch } = useContext(AppContext);
  const { history, historyIndex } = state;

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    dispatch({ type: 'REDO' });
  };

  const handleGoToState = (index: number) => {
    dispatch({ type: 'GOTO_HISTORY_STATE', payload: index });
  };

  if (history.length === 0) {
    return (
      <div className="p-3 text-xs text-text-secondary text-center">
        No history yet.
      </div>
    );
  }
  
  const controlButtonClass = "p-1.5 glass-button !rounded-md !text-sm disabled:!bg-transparent";

  return (
    <div className="bg-transparent rounded-b-lg"> {/* Parent has glass-panel */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--glass-border-color)]">
        {/* Title removed as it's in FloatingHistoryPanel now */}
        <div className="flex space-x-1">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className={controlButtonClass}
            title="Undo (Ctrl+Z)"
          >
            <RestartIcon size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className={controlButtonClass}
            title="Redo (Ctrl+Shift+Z)"
          >
            <RotateCwIcon size={16} />
          </button>
        </div>
      </div>
      <ul className="max-h-60 overflow-y-auto custom-scrollbar text-xs divide-y divide-[var(--glass-border-color)]">
        {history.map((item, index) => (
          <li key={`${index}-${item.actionDescription.substring(0,10)}`}>
            <button
              onClick={() => handleGoToState(index)}
              className={`w-full text-left px-3 py-2 transition-colors
                ${index === historyIndex
                  ? 'bg-[rgba(var(--accent-rgb),0.15)] text-accent-color font-medium'
                  : 'text-text-secondary hover:bg-[rgba(var(--accent-rgb),0.05)] hover:text-text-primary'
                }
              `}
              title={`Go to: ${item.actionDescription}`}
            >
              <span className="truncate block">
                {index === historyIndex && <span className="mr-1.5">&#9670;</span>} {/* Diamond or circle */}
                {item.actionDescription}
              </span>
            </button>
          </li>
        )).reverse()}
      </ul>
    </div>
  );
};

export default HistoryPanelContent;