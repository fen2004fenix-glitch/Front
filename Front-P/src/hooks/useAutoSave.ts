import { useEffect, useRef } from 'react';
import type { Presentation } from '../types';

interface UseAutoSaveOptions {
  enabled: boolean;
  presentation: Presentation | null;
  previousPresentation: Presentation | null;
  onSave: (presentation: Presentation) => Promise<boolean>;
  delay?: number;
}

/**
 * Hook for auto-saving presentations with debouncing
 */
export const useAutoSave = ({
  enabled,
  presentation,
  previousPresentation,
  onSave,
  delay = 3000,
}: UseAutoSaveOptions) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled || isInitialMountRef.current || !presentation || isSavingRef.current) {
      return;
    }

    // Skip if presentation hasn't changed
    if (JSON.stringify(presentation) === JSON.stringify(previousPresentation)) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      
      try {
        await onSave(presentation);
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, presentation, previousPresentation, onSave, delay]);
};

