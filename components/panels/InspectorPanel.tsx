
import React, { useRef, useCallback, useState, useEffect, useContext } from 'react';
import { SVGElementData, Artboard, GroupElementProps, SVGElementType } from '../../types';
import { FolderIcon, ChevronDownIconSolid, ChevronRightIcon, TypeIcon, ImageIcon, GripVerticalIcon, PlusIcon, TrashIcon, RectangleHorizontalIcon, CircleIcon, PathIcon as ElementPathIcon, LayersIcon, SquareIcon, ShapesIcon, TagIcon } from '../icons/EditorIcons';
import { AppContext } from '../../contexts/AppContext';

interface StructurePanelProps {
  onAddGroup: () => void;
  onMoveElement: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void;
  onUpdateElementName: (elementId: string, newName: string) => void;
}

const getElementIcon = (elementType: SVGElementType, isSelected: boolean, isGroupExpanded?: boolean) => {
  const baseIconClass = `mr-1.5 flex-shrink-0`;
  const iconColorClass = isSelected ? 'text-accent-color' : 'text-text-secondary group-hover/item:text-accent-color transition-colors';
  const iconSize = 14;

  switch (elementType) {
    case 'rect': return <ShapesIcon size={iconSize} className={`${baseIconClass} ${iconColorClass}`} />;
    case 'circle': return <ShapesIcon size={iconSize} className={`${baseIconClass} ${iconColorClass}`} />; // Using ShapesIcon for consistency
    case 'path': return <ElementPathIcon size={iconSize} className={`${baseIconClass} ${iconColorClass}`} />;
    case 'text': return <TypeIcon size={iconSize} className={`${baseIconClass} ${iconColorClass}`} />;
    case 'image': return <ShapesIcon size={iconSize} className={`${baseIconClass} ${iconColorClass}`} />; // Using ShapesIcon
    case 'group': return <LayersIcon size={iconSize} className={`${baseIconClass} ${iconColorClass}`} />;
    default: return <ShapesIcon size={iconSize} className={`${baseIconClass} ${iconColorClass}`} />; // Default to ShapesIcon
  }
};

const isDescendant = (potentialChildId: string, potentialParentId: string, allElements: SVGElementData[]): boolean => {
  if (potentialChildId === potentialParentId) return true; 
  let currentElement = allElements.find(el => el.id === potentialChildId);
  while (currentElement?.parentId) {
    if (currentElement.parentId === potentialParentId) return true;
    const parent = allElements.find(el => el.id === currentElement!.parentId);
    if (!parent || parent.id === potentialChildId) return true; 
    currentElement = parent;
  }
  return false;
};

type DropIndicatorPosition = 'before' | 'after' | 'inside' | null;


const StructurePanel: React.FC<StructurePanelProps> = (props) => {
  const { state, dispatch } = useContext(AppContext);
  const { artboard, elements, selectedElementId, expandedGroupIds } = state;
  const { onAddGroup, onMoveElement, onUpdateElementName } = props;

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<DropIndicatorPosition>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [currentEditName, setCurrentEditName] = useState<string>('');

  useEffect(() => {
    if (editingItemId && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingItemId]);

  const onSelectElement = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: id });
  }, [dispatch]);

  const onDeleteElement = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ELEMENT', payload: id });
  }, [dispatch]);
  

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, itemId: string | null) => {
    if (!itemId || editingItemId) { e.preventDefault(); return; }
    setDraggedItemId(itemId); e.dataTransfer.setData('text/plain', itemId); e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, targetItemId: string | null) => {
    e.preventDefault();
    if (!draggedItemId || editingItemId) return;
    const draggedItem = elements.find(el => el.id === draggedItemId);
    const targetItem = targetItemId ? elements.find(el => el.id === targetItemId) : null; 
    if (!draggedItem) return;

    let position: DropIndicatorPosition = null;
    
    if (targetItem && draggedItem.type === 'group' && isDescendant(targetItem.id, draggedItem.id, elements)) {
        setDragOverItemId(null); setDropIndicatorPosition(null); e.dataTransfer.dropEffect = 'none'; return;
    }
     if (draggedItemId === targetItemId) {
        setDragOverItemId(null); setDropIndicatorPosition(null); e.dataTransfer.dropEffect = 'none'; return;
    }

    if (targetItemId === null || targetItemId === artboard.id) { 
        setDragOverItemId(artboard.id); 
        position = 'inside'; 
    } else if (targetItem) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clientY = e.clientY;
        const thresholdRatio = 0.33; 

        if (targetItem.type === 'group') {
            if (clientY < rect.top + rect.height * thresholdRatio) {
                position = 'before';
            } else if (clientY > rect.bottom - rect.height * thresholdRatio) {
                position = 'after';
            } else {
                position = 'inside';
            }
        } else {
            if (clientY < rect.top + rect.height / 2) {
                position = 'before';
            } else {
                position = 'after';
            }
        }
    }
    setDragOverItemId(targetItemId); setDropIndicatorPosition(position); e.dataTransfer.dropEffect = position ? 'move' : 'none';
  };

  const handleDragLeave = () => { setDragOverItemId(null); setDropIndicatorPosition(null); };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetId: string | null) => {
    e.preventDefault();
    const draggedIdFromTransfer = e.dataTransfer.getData('text/plain');
    if (!draggedIdFromTransfer || !dropIndicatorPosition) { cleanupDragState(); return; }
    
    const finalTargetId = (targetId === artboard.id) ? null : targetId;

    if (draggedItemId && draggedItemId === draggedIdFromTransfer) {
        onMoveElement(draggedItemId, finalTargetId, dropIndicatorPosition);
    }
    cleanupDragState();
  };
  const handleDragEnd = () => cleanupDragState();
  const cleanupDragState = () => { setDraggedItemId(null); setDragOverItemId(null); setDropIndicatorPosition(null); };

  const startNameEdit = (item: SVGElementData | Artboard, isArtboardNode: boolean) => {
    if (isArtboardNode) return; 
    const element = item as SVGElementData;
    setEditingItemId(element.id); setCurrentEditName(element.name || '');
  };

  const commitNameEdit = (itemId: string) => {
    if (itemId && currentEditName.trim() !== (elements.find(el=>el.id === itemId)?.name || '')) {
        const elementToUpdate = elements.find(el => el.id === itemId);
        if (elementToUpdate) onUpdateElementName(itemId, currentEditName);
    }
    setEditingItemId(null);
  };
  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setCurrentEditName(e.target.value);
  const handleNameInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, itemId: string) => {
    if (e.key === 'Enter') commitNameEdit(itemId);
    else if (e.key === 'Escape') setEditingItemId(null);
  };

  const handleToggleGroupExpansion = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_GROUP_EXPANSION', payload: groupId });
  };

  const renderListItemRecursive = (
    item: SVGElementData | Artboard, 
    level: number, 
    isLastChildInLevel: boolean,
    parentLineage: boolean[], // true if ancestor at this level has more siblings
    isArtboardNode: boolean = false
  ): React.ReactNode => {
    const id = item.id; const type = isArtboardNode ? 'artboard' : (item as SVGElementData).type; const name = isArtboardNode ? (item as Artboard).name : (item as SVGElementData).name;
    const isSelected = selectedElementId === id; 
    const isBeingDragged = draggedItemId === id; const isEditingThisItem = editingItemId === id;
    const isGroup = type === 'group';
    const isExpanded = isGroup && expandedGroupIds.has(id);

    let itemBaseClasses = `py-1.5 px-2 text-xs rounded-md cursor-pointer flex justify-between items-center transition-all duration-150 group/item relative`; 
    let dropIndicatorStyle: React.CSSProperties = {};

    if (isBeingDragged) itemBaseClasses += ' opacity-40 ';

    const dropTargetId = isArtboardNode ? artboard.id : id;
    if (dragOverItemId === dropTargetId && dropIndicatorPosition) {
      const accentColorVar = 'var(--accent-color)';
      if (dropIndicatorPosition === 'before') dropIndicatorStyle = { borderTop: `2px solid ${accentColorVar}`};
      else if (dropIndicatorPosition === 'after') dropIndicatorStyle = { borderBottom: `2px solid ${accentColorVar}`};
      else if (dropIndicatorPosition === 'inside' && (isGroup || isArtboardNode)) itemBaseClasses += ' bg-[rgba(var(--accent-rgb),0.08)]';
    }
    
    let textAndBgClasses = '';
    if (isSelected && !isEditingThisItem) { textAndBgClasses = `text-accent-color bg-[rgba(var(--accent-rgb),0.1)] font-medium`; }
    else if (!isEditingThisItem) textAndBgClasses = `text-text-primary hover:bg-[rgba(var(--accent-rgb),0.03)] `;
    else textAndBgClasses = `bg-[rgba(var(--accent-rgb),0.08)] `;

    const nameDisplay = (isEditingThisItem && !isArtboardNode ? (
        <input ref={nameInputRef} type="text" value={currentEditName} onChange={handleNameInputChange} onKeyDown={(e) => handleNameInputKeyDown(e, id)} onBlur={() => commitNameEdit(id)}
          className="flex-grow bg-transparent text-text-primary outline-none border-none p-0 m-0 text-xs focus:ring-0" onClick={(e) => e.stopPropagation()} />
      ) : ( <span className="truncate" onDoubleClick={(e) => { if (!isArtboardNode) { e.stopPropagation(); startNameEdit(item, isArtboardNode); }}}>
            {isArtboardNode ? (item as Artboard).name : name} </span> ));
    
    const lineStyle: React.CSSProperties = { position: 'absolute', top: 0, left: 0, width: '1px', height: '100%', backgroundColor: 'var(--glass-border-color)', opacity: 0.6 };

    return (
      <li key={id} draggable={!isArtboardNode && !isEditingThisItem} onDragStart={(e) => !isArtboardNode && handleDragStart(e, id)}
        onDragOver={(e) => handleDragOver(e, isArtboardNode ? artboard.id : id)} 
        onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, isArtboardNode ? artboard.id : id)}
        onDragEnd={() => !isArtboardNode && handleDragEnd()} onClick={() => { if (!isEditingThisItem) onSelectElement(id); }}
        onContextMenu={(e) => {
          e.preventDefault(); e.stopPropagation();
          dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload: id });
          dispatch({ type: 'SHOW_CONTEXT_MENU', payload: { targetId: id, position: { x: e.clientX, y: e.clientY } } });
        }}
        className={`${itemBaseClasses} ${textAndBgClasses}`} style={{ ...dropIndicatorStyle }}
        title={`${type}: ${name} (${isArtboardNode || isEditingThisItem ? 'Click to select' : 'Double-click name to edit, Drag to reorder/reparent, Right-click for menu'})`}
        role="button" tabIndex={0} onKeyDown={(e) => { if (!isEditingThisItem && e.key === 'Enter') onSelectElement(id); }} aria-selected={isSelected} aria-expanded={isGroup ? isExpanded : undefined} >
        
        <div className="flex items-center truncate min-w-0" style={{ paddingLeft: `${level * 12}px`}}> {/* 12px = 0.75rem */}
          {/* Tree Lines */}
          {!isArtboardNode && Array.from({ length: level }).map((_, i) => (
            parentLineage[i] && <div key={`vl-${i}`} style={{ ...lineStyle, left: `${i * 12 + 6}px` }} />
          ))}
          {!isArtboardNode && level > 0 && (
            <div style={{ ...lineStyle, left: `${(level - 1) * 12 + 6}px`, top: 0, height: '50%', width: '7px', borderLeft: '1px solid var(--glass-border-color)', borderBottom: '1px solid var(--glass-border-color)', backgroundColor: 'transparent', borderBottomLeftRadius: '4px' }} />
          )}
          {!isArtboardNode && level > 0 && !isLastChildInLevel && (
            <div style={{ ...lineStyle, left: `${(level - 1) * 12 + 6}px`, top: '50%', height: '50%'}} />
          )}
          
          {/* Content: Expander, Icon, Name */}
          <div className="flex items-center pl-1"> {/* Small padding to offset from line */}
            {isGroup && (
                <button onClick={(e) => handleToggleGroupExpansion(e, id)} 
                        className="p-0.5 rounded-full hover:bg-[rgba(var(--accent-rgb),0.1)] focus:outline-none mr-1 flex items-center justify-center border border-slate-600 bg-dark-bg-tertiary"
                        style={{width: '16px', height: '16px'}}
                        aria-label={isExpanded ? "Collapse group" : "Expand group"} >
                {isExpanded ? <ChevronDownIconSolid size={10} className="text-text-secondary group-hover/item:text-accent-color" /> : <ChevronRightIcon size={10} className="text-text-secondary group-hover/item:text-accent-color" />}
                </button>
            )}
            {!isArtboardNode && getElementIcon(type as SVGElementType, isSelected && !isEditingThisItem)}
            {isArtboardNode && <SquareIcon size={14} className={`mr-1.5 flex-shrink-0 ${isSelected && !isEditingThisItem ? 'text-accent-color' : 'text-accent-color opacity-80'}`} />}
            <span className={`ml-0.5 ${isGroup && !isArtboardNode ? 'font-medium' : ''}`}>{nameDisplay}</span>
          </div>
        </div>
         <div className="flex items-center">
          {isArtboardNode && <TagIcon size={14} className="text-text-secondary opacity-70 mr-1" />}
          {!isArtboardNode && !isEditingThisItem && (
            <button onClick={(e) => { e.stopPropagation(); onDeleteElement(id); }}
              className={`p-0.5 rounded-full flex-shrink-0 ${isSelected ? 'text-accent-color hover:text-white hover:bg-red-500/70' : 'text-text-secondary hover:text-red-400 hover:bg-red-700/50'} opacity-0 group-hover/item:opacity-70 hover:opacity-100 focus:opacity-100 transition-all`}
              title={`Delete ${type}`} aria-label={`Delete ${type} ${name}`} > <TrashIcon size={14} /> </button> )}
         </div>
      </li>
    );
  };

  const renderHierarchyNodesRecursive = (currentParentId: string | null, currentLevel: number, parentLineageSoFar: boolean[]): React.ReactNode[] => {
    const children = elements
      .filter(el => el.parentId === currentParentId && el.artboardId === artboard.id)
      .sort((a, b) => a.order - b.order);
      
    return children.map((el, index) => {
      const isLast = index === children.length - 1;
      const itemIsExpanded = el.type === 'group' && expandedGroupIds.has(el.id);
      const currentLineage = [...parentLineageSoFar, !isLast];

      return (
        <React.Fragment key={el.id}>
          {renderListItemRecursive(el, currentLevel, isLast, parentLineageSoFar)}
          {el.type === 'group' && itemIsExpanded && (
             renderHierarchyNodesRecursive(el.id, currentLevel + 1, currentLineage)
          )}
        </React.Fragment>
      );
    });
  };

  const addGroupButtonClass = "flex items-center justify-center glass-button !bg-[rgba(var(--accent-rgb),0.15)] hover:!bg-[rgba(var(--accent-rgb),0.25)] !text-accent-color text-xs px-3 py-1.5";

  return (
    <div className="p-3 space-y-3 h-full flex flex-col bg-transparent">
      <div> <h3 className="text-base font-semibold mb-2 text-text-primary flex items-center">
        <FolderIcon size={20} className="mr-2 text-accent-color" /> Hierarchy</h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-[var(--glass-border-color)] pt-2">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-semibold text-text-primary">Layers</h4>
          <button onClick={onAddGroup} className={addGroupButtonClass} title="Add New Group">
            <LayersIcon size={14} className="mr-1"/> Group <PlusIcon size={14} className="ml-1"/>
          </button>
        </div>
        {artboard ? (
          <ul className="space-y-px"> {/* Use space-y-px for very thin separators or rely on item borders */}
            {renderListItemRecursive(artboard, 0, elements.filter(el => el.parentId === null).length === 0, [], true)}
            {renderHierarchyNodesRecursive(null, 1, [])}
            {elements.filter(el => el.artboardId === artboard.id && el.parentId === null).length === 0 && (
              <p className="pl-4 pt-1 text-xs text-text-placeholder italic">No top-level elements.</p>
            )}
          </ul>
        ) : (
          <p className="text-xs text-text-placeholder">Artboard not loaded.</p>
        )}
      </div> 
    </div> 
  );
};
export default StructurePanel;
