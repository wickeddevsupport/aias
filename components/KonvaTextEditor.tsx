
import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { OnCanvasTextEditorState } from '../types';

interface KonvaTextEditorProps {
  editorState: OnCanvasTextEditorState | null;
  onCommit: (text: string, finalWidth: number, finalHeight: number) => void;
  onCancel: () => void;
  onValueChange: (text: string) => void;
}

const KonvaTextEditor: React.FC<KonvaTextEditorProps> = ({
  editorState,
  onCommit,
  onCancel,
  onValueChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (editorState?.isVisible && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editorState?.isVisible]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (editorState?.isVisible && textarea) {
      textarea.value = editorState.text;
      textarea.style.position = 'absolute';
      textarea.style.left = `${editorState.x}px`;
      textarea.style.top = `${editorState.y}px`;
      textarea.style.width = `${editorState.width}px`;
      textarea.style.height = `${editorState.height}px`; // Initial height
      textarea.style.fontSize = `${editorState.fontSize}px`;
      textarea.style.fontFamily = editorState.fontFamily;
      textarea.style.color = editorState.fill;
      textarea.style.lineHeight = String(editorState.lineHeight);
      textarea.style.letterSpacing = `${editorState.letterSpacing}px`;
      textarea.style.textAlign = editorState.textAlign as any; // Cast for common values
      textarea.style.transform = `rotate(${editorState.rotation}deg)`;
      textarea.style.transformOrigin = editorState.transformOrigin;
      
      // Resetting styles to match .on-canvas-text-editor from index.html and ensure consistency
      textarea.style.paddingTop = '0px';
      textarea.style.paddingRight = '0px';
      textarea.style.paddingBottom = '0px';
      textarea.style.paddingLeft = '0px';
      textarea.style.boxSizing = 'border-box';
      textarea.style.border = 'none';
      textarea.style.margin = '0px';
      textarea.style.overflow = 'hidden'; // Important for auto-height
      textarea.style.background = 'none';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.whiteSpace = 'pre-wrap';
      textarea.style.wordWrap = 'break-word';

      // Auto-adjust height based on content
      textarea.style.height = 'auto'; // Temporarily set to auto to measure scrollHeight
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`; // Set to actual scrollHeight

      const handleOutsideClick = (e: MouseEvent) => {
        if (e.target !== textarea) {
          // Pass the current scrollHeight as the final height for commit
          onCommit(textarea.value, parseFloat(textarea.style.width), textarea.scrollHeight);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onCommit(textarea.value, parseFloat(textarea.style.width), textarea.scrollHeight);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      };

      const handleInput = () => {
        onValueChange(textarea.value);
        // Auto-adjust height on input
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };

      textarea.addEventListener('keydown', handleKeyDown);
      textarea.addEventListener('input', handleInput);
      const clickTimeoutId = setTimeout(() => { // Prevent immediate close from the click that opened it
        window.addEventListener('click', handleOutsideClick);
      }, 0);

      return () => {
        clearTimeout(clickTimeoutId);
        textarea.removeEventListener('keydown', handleKeyDown);
        textarea.removeEventListener('input', handleInput);
        window.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [editorState, onCommit, onCancel, onValueChange]);

  if (!editorState?.isVisible) {
    return null;
  }

  return (
    <textarea
      ref={textareaRef}
      className="on-canvas-text-editor" // Class defined in index.html
      style={{
        position: 'absolute',
        zIndex: 10001, 
      }}
      // value and autoFocus are handled imperatively in useLayoutEffect
    />
  );
};

export default KonvaTextEditor;
