import React from 'react';
import { EditorState } from '../../types/Editor.types';
import './EditorToolbar.scss';

interface EditorToolbarProps {
  editorState: EditorState;
  onModeChange: (mode: 'selection' | 'navigation') => void;
  onExport: () => void;
  onImport?: (file: File) => void;
  onClearAll?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editorState,
  onModeChange,
  onExport,
  onImport,
  onClearAll
}) => {
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  };

  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar__section">
        <div className="editor-toolbar__group">
          <button 
            className={`btn ${editorState.mode === 'selection' ? 'btn--active' : ''}`}
            onClick={() => onModeChange('selection')}
          >
            Выделение
          </button>
          <button 
            className={`btn ${editorState.mode === 'navigation' ? 'btn--active' : ''}`}
            onClick={() => onModeChange('navigation')}
          >
            Навигация
          </button>
        </div>
      </div>

      <div className="editor-toolbar__section">
        <div className="editor-toolbar__stats">
          <span>Выделено: {editorState.selectedSeats.length}</span>
          <span>Временных: {Array.from(editorState.tempSeats.keys()).length}</span>
        </div>
      </div>

      <div className="editor-toolbar__section">
        <div className="editor-toolbar__group">
          <button className="btn btn--primary" onClick={onExport}>
            Экспорт
          </button>
          
          <label className="btn btn--secondary">
            Импорт
            <input 
              type="file" 
              accept=".json"
              onChange={handleImportFile}
              style={{ display: 'none' }}
            />
          </label>
          
          {onClearAll && (
            <button className="btn btn--danger" onClick={onClearAll}>
              Очистить всё
            </button>
          )}
        </div>
      </div>
    </div>
  );
};