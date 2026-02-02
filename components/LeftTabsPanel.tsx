
import React, { useState, useContext } from 'react';
import StructurePanel from './panels/InspectorPanel'; 
import SvgCodeEditorPanel from './panels/SvgCodeEditorPanel';
import AssetsPanel from './panels/AssetsPanel'; 
// DataPanel import removed
import { FolderIcon, CodeBracketSquareIcon, ImageIcon } from './icons/EditorIcons'; 
import { AppContext } from '../contexts/AppContext'; 

interface LeftTabsPanelProps {
  onAddGroup: () => void;
  onMoveElement: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void;
  onUpdateElementName: (elementId: string, newName: string) => void;
}

type ActiveTab = 'hierarchy' | 'assets' | 'code'; // Updated 'data' to 'code'

const LeftTabsPanel: React.FC<LeftTabsPanelProps> = ({
  onAddGroup,
  onMoveElement,
  onUpdateElementName,
}) => {
  const { dispatch } = useContext(AppContext); 
  const [activeTab, setActiveTab] = useState<ActiveTab>('hierarchy');

  const tabButtonClass = (tabName: ActiveTab) =>
    `flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium border-t-2 transition-colors focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-accent-color
    ${
      activeTab === tabName
        ? 'border-accent-color text-accent-color bg-[rgba(var(--accent-rgb),0.05)]' // Active tab has accent top border
        : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-[rgba(var(--accent-rgb),0.02)]' // Inactive tabs have transparent top border
    }`;

  const handleSvgImport = (svgString: string) => {
    dispatch({ type: 'IMPORT_SVG_STRING', payload: svgString });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden glass-panel p-0">
      <div className="flex border-b border-[var(--glass-border-color)] flex-shrink-0">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`${tabButtonClass('hierarchy')} rounded-tl-lg`} 
          aria-selected={activeTab === 'hierarchy'}
          role="tab"
        >
          <FolderIcon size={16} className="mr-1.5" /> {/* Adjusted icon size slightly */}
          Hierarchy
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`${tabButtonClass('assets')}`}
          aria-selected={activeTab === 'assets'}
          role="tab"
        >
          <ImageIcon size={16} className="mr-1.5" /> {/* Adjusted icon size slightly */}
          Assets
        </button>
        <button
          onClick={() => setActiveTab('code')} // Changed from 'data' to 'code'
          className={`${tabButtonClass('code')} rounded-tr-lg`} // Changed from 'data' to 'code'
          aria-selected={activeTab === 'code'} // Changed from 'data' to 'code'
          role="tab"
        >
          <CodeBracketSquareIcon size={16} className="mr-1.5" /> {/* Icon remains the same */}
          Code {/* Changed label from "Data" to "Code" */}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'hierarchy' && (
          <StructurePanel
            onAddGroup={onAddGroup}
            onMoveElement={onMoveElement}
            onUpdateElementName={onUpdateElementName}
          />
        )}
        {activeTab === 'assets' && <AssetsPanel onSvgImport={handleSvgImport} />}
        {activeTab === 'code' && <SvgCodeEditorPanel />} {/* Changed from DataPanel to SvgCodeEditorPanel */}
      </div>
    </div>
  );
};

export default LeftTabsPanel;
