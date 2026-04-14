// useResize.tsx
import { useRef, useCallback, useEffect } from 'react';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ResizePayload {
  width: number;
  height: number;
  left: number;
  top: number;
  handle: ResizeHandle | undefined;
}

export type ClampAdjustParams = {
  startRect: { left: number; top: number; width: number; height: number };
  handle: ResizeHandle;
  unclampedWidth: number;
  unclampedHeight: number;
  clampedWidth: number;
  clampedHeight: number;
};

export type ClampAdjustResult = {
  left?: number;
  top?: number;
} | void;

export type UseResizeOptions = {
  corner: ResizeHandle;
  getInitial: () => { left: number; top: number; width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  preserveAspect?: boolean;
  onResize?: (p: ResizePayload) => void;
  onEnd?: () => void;
  clampAdjust?: (p: ClampAdjustParams) => ClampAdjustResult;
};

export function useResize(options: UseResizeOptions) {
  const optsRef = useRef<UseResizeOptions>(options);
  optsRef.current = options;

  const stateRef = useRef<{
    startX: number;
    startY: number;
    startRect: { left: number; top: number; width: number; height: number } | null;
    handle: ResizeHandle | null;
    aspect?: number | undefined;
  } | null>(null);

  const clamp = useCallback((val: number, min?: number, max?: number) => {
    if (typeof min === 'number' && val < min) val = min;
    if (typeof max === 'number' && val > max) val = max;
    return val;
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const s = stateRef.current;
      if (!s || !s.startRect) return;
      const { startX, startY, startRect, handle, aspect } = s;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newWidth = startRect.width;
      let newHeight = startRect.height;
      let newLeft = startRect.left;
      let newTop = startRect.top;

      switch (handle) {
        case 'se':
          newWidth = startRect.width + dx;
          newHeight = startRect.height + dy;
          break;
        case 'sw':
          newWidth = startRect.width - dx;
          newHeight = startRect.height + dy;
          newLeft = startRect.left + dx;
          break;
        case 'ne':
          newWidth = startRect.width + dx;
          newHeight = startRect.height - dy;
          newTop = startRect.top + dy;
          break;
        case 'nw':
          newWidth = startRect.width - dx;
          newHeight = startRect.height - dy;
          newLeft = startRect.left + dx;
          newTop = startRect.top + dy;
          break;
        case 'n':
          newHeight = startRect.height - dy;
          newTop = startRect.top + dy;
          break;
        case 's':
          newHeight = startRect.height + dy;
          break;
        case 'e':
          newWidth = startRect.width + dx;
          break;
        case 'w':
          newWidth = startRect.width - dx;
          newLeft = startRect.left + dx;
          break;
      }

      const o = optsRef.current;

      if (o.preserveAspect && typeof aspect === 'number' && aspect > 0) {
        if (handle === 'n' || handle === 's') {
          newWidth = Math.max(1, Math.round(newHeight * aspect));
          if (handle === 'n')
            newLeft = startRect.left + Math.round((startRect.width - newWidth) / 2);
        } else if (handle === 'e' || handle === 'w') {
          newHeight = Math.max(1, Math.round(newWidth / aspect));
          if (handle === 'w')
            newTop = startRect.top + Math.round((startRect.height - newHeight) / 2);
        } else {
          const byWidth = Math.abs(newWidth - startRect.width);
          const byHeight = Math.abs(newHeight - startRect.height);
          if (byWidth > byHeight) {
            newHeight = Math.max(1, Math.round(newWidth / aspect));
            if (handle === 'nw' || handle === 'ne')
              newTop = startRect.top + (startRect.height - newHeight);
          } else {
            newWidth = Math.max(1, Math.round(newHeight * aspect));
            if (handle === 'nw' || handle === 'sw')
              newLeft = startRect.left + (startRect.width - newWidth);
          }
        }
      }

      const unclampedWidth = Math.round(newWidth);
      const unclampedHeight = Math.round(newHeight);

      const clampedWidth = clamp(unclampedWidth, o.minWidth ?? 10, o.maxWidth);
      const clampedHeight = clamp(unclampedHeight, o.minHeight ?? 10, o.maxHeight);

      if (
        (clampedWidth !== unclampedWidth || clampedHeight !== unclampedHeight) &&
        o.clampAdjust &&
        handle
      ) {
        try {
          const adjust = o.clampAdjust({
            startRect,
            handle,
            unclampedWidth,
            unclampedHeight,
            clampedWidth,
            clampedHeight,
          });
          if (adjust) {
            if (typeof adjust.left === 'number') newLeft = Math.round(adjust.left);
            if (typeof adjust.top === 'number') newTop = Math.round(adjust.top);
          }
        } catch (err) {
          console.warn('[useResize] clampAdjust error', err);
        }
      } else {
        if (clampedWidth !== unclampedWidth) {
          if (handle === 'w' || handle === 'nw' || handle === 'sw') {
            newLeft = startRect.left + (startRect.width - clampedWidth);
          }
        }
        if (clampedHeight !== unclampedHeight) {
          if (handle === 'n' || handle === 'nw' || handle === 'ne') {
            newTop = startRect.top + (startRect.height - clampedHeight);
          }
        }
      }

      const payload: ResizePayload = {
        width: Math.max(0, Math.round(clampedWidth)),
        height: Math.max(0, Math.round(clampedHeight)),
        left: Math.round(newLeft),
        top: Math.round(newTop),
        handle: handle ?? undefined,
      };

      console.log('[useResize] onPointerMove (preview only)', payload);

      // ИСПРАВЛЕНО: Вызываем onResize только для preview, без диспатчей в store
      o.onResize?.(payload);
      
      try {
        e.preventDefault();
      } catch {}
      try {
        e.stopPropagation();
      } catch {}
    },
    [clamp]
  );

  // ИСПРАВЛЕНО: Добавлен вызов onResize с финальными значениями перед onEnd
  const onPointerUp = useCallback(() => {
    const o = optsRef.current;
    const s = stateRef.current;
    
    // Вызываем onResize с финальными значениями перед завершением
    if (s && s.startRect) {
      const currentRect = o.getInitial();
      const finalPayload: ResizePayload = {
        width: currentRect.width,
        height: currentRect.height,
        left: currentRect.left,
        top: currentRect.top,
        handle: s.handle ?? undefined,
      };
      o.onResize?.(finalPayload);
    }
    
    Promise.resolve().then(() => {
      stateRef.current = null;
      try {
        window.removeEventListener('pointermove', onPointerMove, true);
        window.removeEventListener('pointerup', onPointerUp, true);
        window.removeEventListener('pointercancel', onPointerUp, true);
      } catch {}

      console.log('[useResize] onPointerUp -> onEnd');
      o.onEnd?.();
    });
  }, [onPointerMove]);

  const onMouseDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e as any).button !== 0) return;
      try {
        e.preventDefault();
      } catch {}
      try {
        e.stopPropagation();
      } catch {}

      const o = optsRef.current;
      const rect = o.getInitial();

      stateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startRect: rect,
        handle: o.corner,
        aspect: rect.width > 0 && rect.height > 0 ? rect.width / rect.height : undefined,
      };

      console.log('[useResize] onMouseDown start', o.corner, rect);

      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', onPointerUp, true);
      window.addEventListener('pointercancel', onPointerUp, true);

      try {
        (e.target as Element)?.setPointerCapture?.((e as any).pointerId);
      } catch (err) {
        // ignore
      }
      try {
        document.body.style.userSelect = 'none';
      } catch {}
    },
    [onPointerMove, onPointerUp]
  );

  useEffect(() => {
    return () => {
      try {
        window.removeEventListener('pointermove', onPointerMove, true);
        window.removeEventListener('pointerup', onPointerUp, true);
        window.removeEventListener('pointercancel', onPointerUp, true);
      } catch {}
      stateRef.current = null;
    };
  }, [onPointerMove, onPointerUp]);

  const dispose = useCallback(() => {
    stateRef.current = null;
    try {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
    } catch {}
  }, [onPointerMove, onPointerUp]);

  return {
    onMouseDown,
    dispose,
  };
}

export default useResize;