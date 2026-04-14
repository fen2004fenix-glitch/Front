// components/HistoryControls.tsx
import React from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { undo, redo } from '../store/historySlice';

export const HistoryControls: React.FC = () => {
  const dispatch = useAppDispatch();
  const { past, future, present } = useAppSelector(state => state.history);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const handleUndo = () => {
    console.log('Undo clicked, canUndo:', canUndo, 'past length:', past.length);
    if (canUndo) {
      dispatch(undo());
      
      // Восстанавливаем контекст после undo
      const previousState = past[past.length - 1];
      if (previousState) {
        // Прокручиваем к активному слайду
        const activeSlideElement = document.querySelector(`[data-slide-id="${previousState.activeSlideIndex}"]`);
        if (activeSlideElement) {
          activeSlideElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  const handleRedo = () => {
    console.log('Redo clicked, canRedo:', canRedo, 'future length:', future.length);
    if (canRedo) {
      dispatch(redo());
      
      // Восстанавливаем контекст после redo
      const nextState = future[0];
      if (nextState) {
        // Прокручиваем к активному слайду
        const activeSlideElement = document.querySelector(`[data-slide-id="${nextState.activeSlideIndex}"]`);
        if (activeSlideElement) {
          activeSlideElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  // Отладочная информация
  React.useEffect(() => {
    console.log('History state updated:', {
      past: past.length,
      future: future.length,
      present: present ? 'exists' : 'null'
    });
  }, [past, future, present]);

  return (
    <div className="history-controls">
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo}
        title="Отменить (Ctrl+Z / Cmd+Z)"
        aria-label="Отменить последнее действие"
        className="history-btn"
      >
        <span className="history-icon">↶</span>
        Undo ({past.length})
      </button>
      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo}
        title="Повторить (Ctrl+Y / Cmd+Y)"
        aria-label="Повторить последнее отмененное действие"
        className="history-btn"
      >
        <span className="history-icon">↷</span>
        Redo ({future.length})
      </button>
    </div>
  );
};

export default HistoryControls;