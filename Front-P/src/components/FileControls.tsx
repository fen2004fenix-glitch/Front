import React, { useRef } from 'react';
import { IconFile, IconLink, IconRemove } from '../icons';

interface FileControlsProps {
  disabled: boolean;
  onFileSelect: (file: File) => Promise<void>;
  onAddByUrl: () => Promise<void>;
  onRemoveLast: () => Promise<void>;
}

// ... existing imports ...

export const FileControls: React.FC<FileControlsProps> = ({
  disabled,
  onFileSelect,
  onAddByUrl,
  onRemoveLast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="file-controls">
      <div className="file-controls-group">
        <div className="file-controls-label">Изображения</div>
        <div className="file-controls-buttons">
          <button
            type="button"
            className="ribbon-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Добавить изображение (файл)"
          >
            <div className="ribbon-icon">
              <IconFile />
            </div>
            <div className="ribbon-label">Файл</div>
          </button>

          <button
            type="button"
            className="ribbon-btn"
            onClick={onAddByUrl}
            disabled={disabled}
            title="Добавить изображение по URL"
          >
            <div className="ribbon-icon">
              <IconLink />
            </div>
            <div className="ribbon-label">URL</div>
          </button>

          <button
            type="button"
            className="ribbon-btn"
            onClick={onRemoveLast}
            disabled={disabled}
            title="Удалить последнее изображение"
          >
            <div className="ribbon-icon">
              <IconRemove />
            </div>
            <div className="ribbon-label">Удалить</div>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="file-input-hidden"
        onChange={async (e) => {
          const file = e.currentTarget.files?.item(0);
          if (file) {
            await onFileSelect(file);
          }
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
};