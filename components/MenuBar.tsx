


import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext';
import {
  UndoIcon, RedoIcon, CopyIcon, ClipboardPasteIcon, TrashIcon,
  LayersIcon, UngroupIcon, BringToFrontIcon, SendToBackIcon, ChevronUpSquareIcon,
  ChevronDownSquareIcon, RefreshCwIcon, ZoomInIcon, ZoomOutIcon, MaximizeIcon,
  PanelLeftIcon, PanelRightIcon, PanelBottomIcon, DownloadIcon, DocumentArrowUpIcon,
  PlusIcon
} from './icons/EditorIcons';

interface MenuItemProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  icon?: React.ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, onClick, disabled, shortcut, icon }) => (
  <button onClick={onClick} disabled={disabled} className="menu-item" role="menuitem">
    <div className="flex items-center">
      {icon && <span className="mr-2 w-4 h-4">{icon}</span>}
      {label}
    </div>
    {shortcut && <span className="menu-item-shortcut">{shortcut}</span>}
  </button>
);

const MenuSeparator: React.FC = () => <div className="menu-separator" role="separator" />;

interface MenuProps {
  title: string;
  children: React.ReactNode;
}

const Menu: React.FC<MenuProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="menu-bar-item" ref={menuRef}>
      <button className={`menu-bar-button ${isOpen ? 'open' : ''}`} onClick={handleToggle}>
        {title}
      </button>
      {isOpen && (
        <div className="dropdown-menu" role="menu">
          {React.Children.map(children, child => {
              if (React.isValidElement<MenuItemProps>(child) && child.type === MenuItem) {
                // This is a MenuItem component. We'll clone it and wrap its onClick to close the menu.
                return React.cloneElement(child, {
                  onClick: () => {
                    child.props.onClick();
                    setIsOpen(false);
                  },
                });
              }
              // For other elements like MenuSeparator, just return them as is.
              return child;
            }
          )}
        </div>
      )}
    </div>
  );
};


interface MenuBarProps {
    onExport: () => void;
    onImport: () => void;
    toggleLeftPanel: () => void;
    toggleRightPanel: () => void;
    toggleTimelinePanel: () => void;
    isLeftPanelVisible: boolean;
    isRightPanelVisible: boolean;
    isTimelineVisible: boolean;
    resetView: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({
    onExport, onImport, toggleLeftPanel, toggleRightPanel, toggleTimelinePanel,
    isLeftPanelVisible, isRightPanelVisible, isTimelineVisible,
    resetView, zoomIn, zoomOut
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { historyIndex, history, selectedElementId, artboard, clipboard, elements } = state;

  const handleNewProject = () => {
    dispatch({ type: 'SHOW_NEW_PROJECT_DIALOG' });
  };

  const undoDisabled = historyIndex <= 0;
  const redoDisabled = historyIndex >= history.length - 1;
  const selectedElement = elements.find(el => el.id === selectedElementId);
  const isElementSelected = !!selectedElement && selectedElementId !== artboard.id;
  
  const siblings = isElementSelected ? elements.filter(el => el.parentId === selectedElement!.parentId).sort((a,b) => a.order - b.order) : [];
  const currentOrderIndex = isElementSelected ? siblings.findIndex(el => el.id === selectedElementId) : -1;
  
  const canBringForward = isElementSelected ? currentOrderIndex < siblings.length - 1 : false;
  const canSendBackward = isElementSelected ? currentOrderIndex > 0 : false;
  const canGroup = isElementSelected && selectedElement?.type !== 'group';
  const canUngroup = isElementSelected && selectedElement?.type === 'group';
  const canConvertToPath = isElementSelected && ['rect', 'circle'].includes(selectedElement!.type);

  return (
    <div className="menu-bar">
      <Menu title="File">
        <MenuItem label="New Project" onClick={handleNewProject} icon={<PlusIcon size={16} />} />
        <MenuSeparator />
        <MenuItem label="Import File..." onClick={onImport} icon={<DocumentArrowUpIcon size={16} />} />
        <MenuItem label="Export to HTML" onClick={onExport} icon={<DownloadIcon size={16} />} />
      </Menu>
      <Menu title="Edit">
        <MenuItem label="Undo" onClick={() => dispatch({ type: 'UNDO' })} disabled={undoDisabled} shortcut="Ctrl+Z" icon={<UndoIcon size={16} />} />
        <MenuItem label="Redo" onClick={() => dispatch({ type: 'REDO' })} disabled={redoDisabled} shortcut="Ctrl+Y" icon={<RedoIcon size={16} />} />
        <MenuSeparator />
        <MenuItem label="Copy" onClick={() => dispatch({ type: 'COPY_SELECTED_ELEMENT' })} disabled={!isElementSelected} shortcut="Ctrl+C" icon={<CopyIcon size={16} />} />
        <MenuItem label="Paste" onClick={() => dispatch({ type: 'PASTE_FROM_CLIPBOARD' })} disabled={!clipboard} shortcut="Ctrl+V" icon={<ClipboardPasteIcon size={16} />} />
        <MenuSeparator />
        <MenuItem label="Delete" onClick={() => { if(isElementSelected) dispatch({ type: 'DELETE_ELEMENT', payload: selectedElementId! }) }} disabled={!isElementSelected} shortcut="Del" icon={<TrashIcon size={16} />} />
      </Menu>
      <Menu title="Object">
         <MenuItem label="Group" onClick={() => { if(canGroup) dispatch({ type: 'GROUP_ELEMENT', payload: { elementId: selectedElementId! } }) }} disabled={!canGroup} shortcut="Ctrl+G" icon={<LayersIcon size={16} />} />
         <MenuItem label="Ungroup" onClick={() => { if(canUngroup) dispatch({ type: 'UNGROUP_ELEMENT', payload: { groupId: selectedElementId! } }) }} disabled={!canUngroup} shortcut="Ctrl+Shift+G" icon={<UngroupIcon size={16} />} />
         <MenuSeparator />
         <MenuItem label="Bring to Front" onClick={() => { if(isElementSelected) dispatch({ type: 'BRING_TO_FRONT', payload: selectedElementId! }) }} disabled={!canBringForward} icon={<BringToFrontIcon size={16} />} />
         <MenuItem label="Bring Forward" onClick={() => { if(isElementSelected) dispatch({ type: 'BRING_FORWARD', payload: selectedElementId! }) }} disabled={!canBringForward} icon={<ChevronUpSquareIcon size={16} />} />
         <MenuItem label="Send Backward" onClick={() => { if(isElementSelected) dispatch({ type: 'SEND_BACKWARD', payload: selectedElementId! }) }} disabled={!canSendBackward} icon={<ChevronDownSquareIcon size={16} />} />
         <MenuItem label="Send to Back" onClick={() => { if(isElementSelected) dispatch({ type: 'SEND_TO_BACK', payload: selectedElementId! }) }} disabled={!canSendBackward} icon={<SendToBackIcon size={16} />} />
         <MenuSeparator />
         <MenuItem label="Convert to Editable Path" onClick={() => { if(canConvertToPath) dispatch({ type: 'CONVERT_TO_EDITABLE_PATH', payload: { elementId: selectedElementId! } }) }} disabled={!canConvertToPath} icon={<RefreshCwIcon size={16} />} />
      </Menu>
      <Menu title="View">
        <MenuItem label="Zoom In" onClick={zoomIn} shortcut="Ctrl++" icon={<ZoomInIcon size={16} />} />
        <MenuItem label="Zoom Out" onClick={zoomOut} shortcut="Ctrl+-" icon={<ZoomOutIcon size={16} />} />
        <MenuItem label="Fit to View" onClick={resetView} shortcut="Ctrl+0" icon={<MaximizeIcon size={16} />} />
      </Menu>
       <Menu title="Window">
        <MenuItem label={isLeftPanelVisible ? "Hide Left Panel" : "Show Left Panel"} onClick={toggleLeftPanel} icon={<PanelLeftIcon size={16} />} />
        <MenuItem label={isRightPanelVisible ? "Hide Right Panel" : "Show Right Panel"} onClick={toggleRightPanel} icon={<PanelRightIcon size={16} />} />
        <MenuItem label={isTimelineVisible ? "Hide Timeline" : "Show Timeline"} onClick={toggleTimelinePanel} icon={<PanelBottomIcon size={16} />} />
      </Menu>
    </div>
  );
};

export default MenuBar;
