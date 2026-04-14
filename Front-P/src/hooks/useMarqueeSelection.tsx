// src/hooks/useMarqueeSelection.tsx
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

type Rect = { left: number; top: number; right: number; bottom: number };
type ElemRect = { id: string; rect: DOMRect };
type SelectionResult = { ids: string[]; additive: boolean; range: boolean };

export function useMarqueeSelection<T extends HTMLElement = HTMLElement>(options: {
  containerRef: RefObject<T | null>;
  getElementsRects: () => ElemRect[];
  onChange?: (sel: SelectionResult) => void;
  threshold?: number;
  centerMode?: boolean;
}) {
  const { containerRef, getElementsRects, onChange, threshold = 6, centerMode = false } = options;

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [active, setActive] = useState(false);
  const modsRef = useRef({ additive: false, range: false });

  const rectsIntersect = (a: Rect, b: Rect) => {
    const ix1 = Math.max(a.left, b.left);
    const iy1 = Math.max(a.top, b.top);
    const ix2 = Math.min(a.right, b.right);
    const iy2 = Math.min(a.bottom, b.bottom);
    const iw = Math.max(0, ix2 - ix1);
    const ih = Math.max(0, iy2 - iy1);
    return iw > 0 && ih > 0;
  };

  const clientRectFromPoints = (x1: number, y1: number, x2: number, y2: number) => {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const right = Math.max(x1, x2);
    const bottom = Math.max(y1, y2);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };

  const computeSelected = useCallback(
    (marqueeRect: { left: number; top: number; width: number; height: number }) => {
      const container = containerRef.current;
      if (!container) return { ids: [], additive: false, range: false };

      const containerRect = container.getBoundingClientRect();
      const marqueeViewport: Rect = {
        left: marqueeRect.left + containerRect.left,
        top: marqueeRect.top + containerRect.top,
        right: marqueeRect.left + containerRect.left + marqueeRect.width,
        bottom: marqueeRect.top + containerRect.top + marqueeRect.height,
      };

      const elems = getElementsRects();
      const ids = elems
        .filter((e) => {
          const er = e.rect;
          if (centerMode) {
            const cx = er.left + er.width / 2;
            const cy = er.top + er.height / 2;
            return (
              cx >= marqueeViewport.left &&
              cx <= marqueeViewport.right &&
              cy >= marqueeViewport.top &&
              cy <= marqueeViewport.bottom
            );
          }
          return rectsIntersect(marqueeViewport, {
            left: er.left,
            top: er.top,
            right: er.right,
            bottom: er.bottom,
          });
        })
        .map((e) => e.id);

      return { ids, additive: modsRef.current.additive, range: modsRef.current.range };
    },
    [containerRef, getElementsRects, centerMode]
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      const container = containerRef.current;
      if (!container) return;

      const cr = container.getBoundingClientRect();
      if (
        e.clientX < cr.left ||
        e.clientX > cr.right ||
        e.clientY < cr.top ||
        e.clientY > cr.bottom
      )
        return;

      modsRef.current.additive = !!(e.ctrlKey || e.metaKey);
      modsRef.current.range = !!e.shiftKey;

      startRef.current = { x: e.clientX - cr.left, y: e.clientY - cr.top };
      setActive(true);
      setMarquee({ left: startRef.current.x, top: startRef.current.y, width: 0, height: 0 });

      try {
        (e.target as Element)?.setPointerCapture?.((e as any).pointerId);
      } catch {}
    },
    [containerRef]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!active || !startRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const cr = container.getBoundingClientRect();
      const sx = startRef.current.x;
      const sy = startRef.current.y;
      const cx = e.clientX - cr.left;
      const cy = e.clientY - cr.top;

      const r = clientRectFromPoints(sx, sy, cx, cy);
      setMarquee({ left: r.left, top: r.top, width: r.width, height: r.height });

      if (r.width >= threshold || r.height >= threshold) {
        const sel = computeSelected({ left: r.left, top: r.top, width: r.width, height: r.height });
        onChange?.(sel);
      }
    },
    [active, containerRef, computeSelected, onChange, threshold]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!active || !startRef.current) {
        modsRef.current.additive = false;
        modsRef.current.range = false;
        return;
      }
      const container = containerRef.current;
      const cr = container?.getBoundingClientRect();
      if (!container || !cr) {
        setActive(false);
        setMarquee(null);
        startRef.current = null;
        return;
      }

      const sx = startRef.current.x;
      const sy = startRef.current.y;
      const cx = e.clientX - cr.left;
      const cy = e.clientY - cr.top;
      const r = clientRectFromPoints(sx, sy, cx, cy);

      if (r.width < threshold && r.height < threshold) {
        setActive(false);
        setMarquee(null);
        startRef.current = null;
        const result = {
          ids: [],
          additive: modsRef.current.additive,
          range: modsRef.current.range,
        };
        modsRef.current.additive = false;
        modsRef.current.range = false;
        onChange?.(result);
        return;
      }

      const sel = computeSelected({ left: r.left, top: r.top, width: r.width, height: r.height });
      setActive(false);
      setMarquee(null);
      startRef.current = null;
      modsRef.current.additive = false;
      modsRef.current.range = false;
      onChange?.(sel);
    },
    [active, containerRef, computeSelected, onChange, threshold]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const down = (e: PointerEvent) => onPointerDown(e);
    const move = (e: PointerEvent) => onPointerMove(e);
    const up = (e: PointerEvent) => onPointerUp(e);

    container.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);

    return () => {
      container.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [containerRef, onPointerDown, onPointerMove, onPointerUp]);

  return {
    marquee,
    active,
    getMarqueeStyle: marquee
      ? {
          position: 'absolute' as const,
          left: `${marquee.left}px`,
          top: `${marquee.top}px`,
          width: `${marquee.width}px`,
          height: `${marquee.height}px`,
        }
      : null,
  };
}