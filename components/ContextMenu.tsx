
import React, { useContext, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { TrashIcon, CopyIcon, ClipboardPasteIcon, BringToFrontIcon, SendToBackIcon, ChevronUpSquareIcon, ChevronDownSquareIcon, LayersIcon as GroupIcon, UngroupIcon, RefreshCwIcon as ConvertIcon } from './icons/EditorIcons';
import { AppState, SVGElementData, CircleElementProps, RectElementProps, PathElementProps } from '../types'; 

interface ContextMenuComponentProps {
  animatedElementsForMenu: SVGElementData[];
}

const ContextMenu = React.forwardRef<HTMLDivElement, ContextMenuComponentProps>((props, ref) => {
  const { state, dispatch } = useContext(AppContext);
  const { contextMenuVisible, contextMenuPosition, contextMenuTargetId, selectedElementId, clipboard, artboard, elements } = state;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'HIDE_CONTEXT_MENU' });
      }
    };
    if (contextMenuVisible) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenuVisible, dispatch]);

  if (!contextMenuVisible || !contextMenuPosition) {
    return null;
  }

  const isArtboardTargeted = contextMenuTargetId === artboard.id;
  const targetElement = elements.find(el => el.id === contextMenuTargetId);
  const isElementTargeted = !!targetElement && !isArtboardTargeted;
  const isTargetSelected = contextMenuTargetId === selectedElementId;

  const siblings = targetElement ? elements.filter(el => el.parentId === targetElement.parentId && el.artboardId === targetElement.artboardId).sort((a, b) => a.order - b.order) : [];
  const currentOrderIndex = targetElement ? siblings.findIndex(el => el.id === targetElement.id) : -1;
  
  const canBringForward = targetElement ? currentOrderIndex < siblings.length - 1 : false;
  const canSendBackward = targetElement ? currentOrderIndex > 0 : false;
  const isGroupTarget = targetElement?.type === 'group';
  const canUngroup = isGroupTarget && elements.some(el => el.parentId === targetElement.id);
  const canConvertToEditablePath = targetElement && (targetElement.type === 'rect' || targetElement.type === 'circle');


  const handleDelete = () => {
    if (isElementTargeted && contextMenuTargetId) {
      dispatch({ type: 'DELETE_ELEMENT', payload: contextMenuTargetId });
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };

  const handleCopy = () => {
    if (isElementTargeted && isTargetSelected) {
      dispatch({ type: 'COPY_SELECTED_ELEMENT' });
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };

  const handlePaste = () => {
    if (clipboard && clipboard.length > 0) {
      dispatch({ type: 'PASTE_FROM_CLIPBOARD' });
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };

  const handleBringToFront = () => {
    if (targetElement) dispatch({ type: 'BRING_TO_FRONT', payload: targetElement.id });
    dispatch({ type: 'HIDE_CONTEXT_MENU' });
  };
  const handleSendToBack = () => {
    if (targetElement) dispatch({ type: 'SEND_TO_BACK', payload: targetElement.id });
    dispatch({ type: 'HIDE_CONTEXT_MENU' });
  };
  const handleBringForward = () => {
    if (targetElement && canBringForward) dispatch({ type: 'BRING_FORWARD', payload: targetElement.id });
    dispatch({ type: 'HIDE_CONTEXT_MENU' });
  };
  const handleSendBackward = () => {
    if (targetElement && canSendBackward) dispatch({ type: 'SEND_BACKWARD', payload: targetElement.id });
    dispatch({ type: 'HIDE_CONTEXT_MENU' });
  };
  const handleGroupElement = () => {
    if (targetElement && targetElement.type !== 'group') {
      dispatch({ type: 'GROUP_ELEMENT', payload: { elementId: targetElement.id } });
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };
  const handleUngroupElement = () => {
    if (targetElement && targetElement.type === 'group' && canUngroup) {
      dispatch({ type: 'UNGROUP_ELEMENT', payload: { groupId: targetElement.id } });
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };
  
  const handleConvertToEditablePath = () => {
    if (targetElement && canConvertToEditablePath && contextMenuTargetId) {
      dispatch({ type: 'CONVERT_TO_EDITABLE_PATH', payload: { elementId: contextMenuTargetId } });
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };


  const menuItems = [];

  if (isElementTargeted) {
    if (canConvertToEditablePath) { 
        menuItems.push({
            label: 'Convert to Editable Path',
            action: handleConvertToEditablePath,
            icon: <ConvertIcon size={16} className="mr-2" />,
            disabled: false,
        });
    }
    if (!isGroupTarget) {
        menuItems.push({
            label: 'Group Element',
            action: handleGroupElement,
            icon: <GroupIcon size={16} className="mr-2" />,
            disabled: false,
        });
    }
    if (isGroupTarget) {
        menuItems.push({
            label: 'Ungroup',
            action: handleUngroupElement,
            icon: <UngroupIcon size={16} className="mr-2" />,
            disabled: !canUngroup,
        });
    }
    if (menuItems.length > 0 && (canConvertToEditablePath || !isGroupTarget || isGroupTarget) ) menuItems.push({ type: 'divider' });


    menuItems.push(
      { label: 'Bring to Front', action: handleBringToFront, icon: <BringToFrontIcon size={16} className="mr-2" />, disabled: !canBringForward },
      { label: 'Bring Forward', action: handleBringForward, icon: <ChevronUpSquareIcon size={16} className="mr-2" />, disabled: !canBringForward },
      { label: 'Send Backward', action: handleSendBackward, icon: <ChevronDownSquareIcon size={16} className="mr-2" />, disabled: !canSendBackward },
      { label: 'Send to Back', action: handleSendToBack, icon: <SendToBackIcon size={16} className="mr-2" />, disabled: !canSendBackward },
      { type: 'divider' },
      { label: 'Delete Element', action: handleDelete, icon: <TrashIcon size={16} className="mr-2" />, disabled: false }
    );
  }
  
  if (isElementTargeted) { 
     menuItems.push({ label: 'Copy', action: handleCopy, icon: <CopyIcon size={16} className="mr-2" />, disabled: !isTargetSelected });
   }

  menuItems.push({ label: 'Paste', action: handlePaste, icon: <ClipboardPasteIcon size={16} className="mr-2" />, disabled: !clipboard || clipboard.length === 0 });
  

  return (
    <div
      ref={ref}
      className="fixed glass-panel py-1.5 text-sm text-text-primary z-[100] shadow-[0_10px_50px_rgba(0,0,0,0.5)]" // Enhanced shadow
      style={{
        top: `${contextMenuPosition.y}px`,
        left: `${contextMenuPosition.x}px`,
        minWidth: '230px', // Increased min-width
      }}
      onClick={(e) => e.stopPropagation()} 
      onContextMenu={(e) => e.preventDefault()} 
    >
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return <hr key={`divider-${index}`} className="my-1 border-[var(--glass-border-color)] opacity-50" />;
        }
        return (
          <button
            key={index}
            onClick={item.action}
            disabled={item.disabled}
            className="w-full flex items-center px-3 py-2 text-left hover:bg-[rgba(var(--accent-rgb),0.15)] hover:text-accent-color focus:bg-[rgba(var(--accent-rgb),0.2)] focus:text-accent-color focus:outline-none disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary disabled:cursor-not-allowed transition-colors duration-150"
            role="menuitem"
          >
            {item.icon && React.cloneElement(item.icon, { className: `${item.icon.props.className} ${item.disabled ? 'text-text-placeholder' : 'group-hover:text-accent-color transition-colors'}` })}
            <span className={item.disabled ? 'text-text-placeholder' : ''}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
});

ContextMenu.displayName = 'ContextMenu';
export default ContextMenu;