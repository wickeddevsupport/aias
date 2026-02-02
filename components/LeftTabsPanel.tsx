
import React, { useState, useContext } from 'react';
import StructurePanel from './panels/InspectorPanel'; 
import AssetsPanel from './panels/AssetsPanel';
import MaestroPanel from './panels/MaestroPanel';
import { FolderIcon, ImageIcon, SparklesIcon } from './icons/EditorIcons'; 
import { AppContext } from '../contexts/AppContext'; 
import { ActiveLeftTab } from '../types';

interface LeftTabsPanelProps {
  onAddGroup: () => void;
  onMoveElement: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void;
  onUpdateElementName: (elementId: string, newName: string) => void;
  onGenerateAiResponse: () => void;
}

const LeftTabsPanel: React.FC<LeftTabsPanelProps> = ({
  onAddGroup,
  onMoveElement,
  onUpdateElementName,
  onGenerateAiResponse,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { activeLeftTab } = state;

  const handleTabClick = (tab: ActiveLeftTab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  const tabButtonClass = (tabName: ActiveLeftTab) =>
    `flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium border-t-2 transition-colors focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-accent-color
    ${
      activeLeftTab === tabName
        ? 'border-accent-color text-accent-color bg-[rgba(var(--accent-rgb),0.05)]' // Active tab has accent top border
        : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-[rgba(var(--accent-rgb),0.02)]' // Inactive tabs have transparent top border
    }`;

  return (
    <div className="h-full flex flex-col overflow-hidden glass-panel p-0">
      <div className="flex border-b border-[var(--glass-border-color)] flex-shrink-0">
        <button
          onClick={() => handleTabClick('maestro')}
          className={`${tabButtonClass('maestro')} rounded-tl-lg`}
          aria-selected={activeLeftTab === 'maestro'}
          role="tab"
        >
          <SparklesIcon size={16} className="mr-1.5" />
          Maestro
        </button>
        <button
          onClick={() => handleTabClick('hierarchy')}
          className={`${tabButtonClass('hierarchy')}`} 
          aria-selected={activeLeftTab === 'hierarchy'}
          role="tab"
        >
          <FolderIcon size={16} className="mr-1.5" />
          Hierarchy
        </button>
        <button
          onClick={() => handleTabClick('assets')}
          className={`${tabButtonClass('assets')} rounded-tr-lg`}
          aria-selected={activeLeftTab === 'assets'}
          role="tab"
        >
          <ImageIcon size={16} className="mr-1.5" />
          Assets
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeLeftTab === 'maestro' && <MaestroPanel onGenerateAiResponse={onGenerateAiResponse} />}
        {activeLeftTab === 'hierarchy' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <StructurePanel
              onAddGroup={onAddGroup}
              onMoveElement={onMoveElement}
              onUpdateElementName={onUpdateElementName}
            />
          </div>
        )}
        {activeLeftTab === 'assets' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <AssetsPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftTabsPanel;
