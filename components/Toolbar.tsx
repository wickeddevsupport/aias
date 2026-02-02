
import React, { useContext } from 'react';
import { SVGElementData, Artboard, AppState, AppAction, SVGElementType, CurrentTool } from '../types'; 
import { AppContext } from '../contexts/AppContext';
import { PlusIcon, TrashIcon, RectangleHorizontalIcon, CircleIcon, CopyIcon, ClipboardPasteIcon, MousePointerIcon, PenLineIcon, PathIcon, LayersIcon, TypeIcon, ImageIcon } from './icons/EditorIcons'; 
import { DEFAULT_ELEMENT_FILL, DEFAULT_FONT_SIZE, DEFAULT_TEXT_ANCHOR, DEFAULT_TEXT_VERTICAL_ALIGN, DEFAULT_TEXT_WRAP, DEFAULT_TEXT_ALIGN_KONVA } from '../constants';

interface ToolbarProps {
  onAddElement: (type: SVGElementType, initialProps?: Partial<SVGElementData>, targetParentId?: string | null, andInitiateEdit?: boolean) => void;
  onDeleteElement?: () => void;
  artboardIsPresent?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddElement,
  onDeleteElement,
  artboardIsPresent = true,
}) => {
  const { state, dispatch } = useContext(AppContext) as { state: AppState, dispatch: React.Dispatch<AppAction> };
  const { selectedElementId, clipboard, currentTool, artboard, elements } = state; 

  const toolButtonClass = (isActive: boolean, isDisabled: boolean = false) => 
    `p-2.5 rounded-lg flex items-center justify-center transition-all duration-200 focus:outline-none glass-button
     ${isActive ? '!bg-[rgba(var(--accent-rgb),0.25)] !text-accent-color !border-accent-color shadow-[var(--highlight-glow)]' 
                : (isDisabled ? 'opacity-40 cursor-not-allowed !bg-transparent !shadow-none' 
                               : 'hover:!bg-[rgba(var(--accent-rgb),0.1)] hover:!border-[var(--glass-highlight-border)]')}`;
  
  const actionButtonClass = (isDisabled: boolean) =>
    `p-2.5 rounded-lg flex items-center justify-center glass-button
     ${isDisabled ? 'opacity-40 cursor-not-allowed !bg-transparent !shadow-none' 
                   : 'hover:!bg-[rgba(var(--accent-rgb),0.1)] hover:!border-[var(--glass-highlight-border)]'}`;

  const destructiveButtonClass = (isDisabled: boolean) =>
    `p-2.5 rounded-lg flex items-center justify-center glass-button
     ${isDisabled ? 'opacity-40 cursor-not-allowed !bg-transparent !shadow-none' 
                   : 'hover:!bg-red-500/20 hover:!border-red-500/50 text-red-400 hover:text-red-300'}`;


  const handleCopy = () => {
    if (selectedElementId) {
      dispatch({ type: 'COPY_SELECTED_ELEMENT' });
    }
  };

  const handlePaste = () => {
    if (clipboard && clipboard.length > 0) {
      dispatch({ type: 'PASTE_FROM_CLIPBOARD' });
    }
  };

  const handleSetTool = (tool: CurrentTool) => { 
    dispatch({ type: 'SET_CURRENT_TOOL', payload: tool });
  };

  const handleAddTextElement = () => {
    const defaultX = 20 + Math.floor(Math.random() * (artboard.width / 10));
    const defaultY = 20 + Math.floor(Math.random() * (artboard.height / 10));
    onAddElement(
      'text', 
      { 
        text: "Type here...",
        x: defaultX,
        y: defaultY,
        fill: DEFAULT_ELEMENT_FILL,
        fontSize: DEFAULT_FONT_SIZE,
        textAnchor: DEFAULT_TEXT_ANCHOR,
        verticalAlign: DEFAULT_TEXT_VERTICAL_ALIGN,
        width: 150, 
        wrap: DEFAULT_TEXT_WRAP,
        align: DEFAULT_TEXT_ALIGN_KONVA,
      }, 
      null, 
      true // andInitiateEdit to true for text tool
    );
    // No need to explicitly set currentTool to 'text' here, ADD_ELEMENT reducer handles it.
  };

  return (
    <div className="p-2 flex flex-col items-stretch space-y-1.5 glass-panel w-max">
      {/* Tools */}
      <div className="flex flex-col space-y-1.5">
        <button 
          onClick={() => handleSetTool('select')} 
          className={toolButtonClass(currentTool === 'select')} 
          title="Select Tool (V)"
          aria-pressed={currentTool === 'select'}
        >
          <MousePointerIcon size={20} />
        </button>
        <button 
          onClick={() => handleSetTool('pencil')} 
          className={toolButtonClass(currentTool === 'pencil', !artboardIsPresent)} 
          title="Pencil Tool (P)"
          aria-pressed={currentTool === 'pencil'}
          disabled={!artboardIsPresent}
        >
          <PenLineIcon size={20} />
        </button>
        <button 
          onClick={() => handleSetTool('bezierPath')} 
          className={toolButtonClass(currentTool === 'bezierPath', !artboardIsPresent)} 
          title="Bezier Path Tool (B)"
          aria-pressed={currentTool === 'bezierPath'}
          disabled={!artboardIsPresent}
        >
          <PathIcon size={20} /> 
        </button>
         <button 
          onClick={handleAddTextElement}
          className={toolButtonClass(currentTool === 'text', !artboardIsPresent)}
          title="Text Tool (T)"
          aria-pressed={currentTool === 'text'}
          disabled={!artboardIsPresent}
        >
          <TypeIcon size={20} /> 
        </button>
      </div>
      
      <div className="w-full border-b border-[var(--glass-border-color)] my-1.5"></div>

      {/* Add Shapes */}
      <div className="flex flex-col space-y-1.5">
        <button onClick={() => onAddElement('rect', {}, null, false)} className={actionButtonClass(!artboardIsPresent)} title="Add Rectangle" disabled={!artboardIsPresent}>
          <RectangleHorizontalIcon size={20} />
        </button>
        <button onClick={() => onAddElement('circle', {}, null, false)} className={actionButtonClass(!artboardIsPresent)} title="Add Circle" disabled={!artboardIsPresent}>
          <CircleIcon size={20} />
        </button>
      </div>
      
      <div className="w-full border-b border-[var(--glass-border-color)] my-1.5"></div>

      {/* Edit Actions */}
      <div className="flex flex-col space-y-1.5">
       <button 
          onClick={handleCopy} 
          className={actionButtonClass(!selectedElementId || selectedElementId === artboard.id)} 
          title="Copy Selected (Ctrl+C)"
          disabled={!selectedElementId || selectedElementId === artboard.id}
        >
          <CopyIcon size={18} />
      </button>
       <button 
          onClick={handlePaste} 
          className={actionButtonClass(!clipboard || clipboard.length === 0)} 
          title="Paste (Ctrl+V)"
          disabled={!clipboard || clipboard.length === 0}
        >
          <ClipboardPasteIcon size={18} />
      </button>

      {onDeleteElement && (
         <button 
            onClick={onDeleteElement} 
            className={destructiveButtonClass(!selectedElementId || selectedElementId === artboard.id)} 
            title="Delete Selected (Del/Backspace)"
            disabled={!selectedElementId || selectedElementId === artboard.id}
          >
            <TrashIcon size={18} /> 
        </button>
      )}
      </div>
    </div>
  );
};

export default Toolbar;
