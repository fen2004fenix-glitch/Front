import { useEffect } from 'react';
import { useAppDispatch } from './redux';
import { undo, redo } from '../store/historySlice';

/**
 * Hook for handling keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
 */
export const useKeyboardShortcuts = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (!ctrlKey) return;
      
      const key = e.key.toLowerCase();
      
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch(undo());
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        dispatch(redo());
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [dispatch]);
};

