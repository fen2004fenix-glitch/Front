// src/hooks/useDrag.ts
import { useCallback, useRef, useState } from 'react';

type ThumbRect = { id: string; top: number; height: number };
type GetThumbRects = () => ThumbRect[];
type OnDrop = (ids: string[], index: number) => void;
type OnStateChange = () => void;

type DragPayload = {
  id: string;
  index: number;
  selectedIds?: string[]; // если передан — перетаскиваем группу
};

type DragState = {
  dragging: boolean;
  dragIds: string[]; // ids being dragged (group or single)
  originIndex: number; // index where drag started (first dragged's index)
  pointerStartY: number;
  placeholderIndex: number | null; // insertion index relative to full list (raw)
};

export function useDrag(opts: {
  getThumbRects: GetThumbRects;
  onDrop?: OnDrop;
  onStateChange?: OnStateChange;
}) {
  const { getThumbRects, onDrop, onStateChange } = opts;
  const stateRef = useRef<DragState>({
    dragging: false,
    dragIds: [],
    originIndex: -1,
    pointerStartY: 0,
    placeholderIndex: null,
  });

  // tick to force re-render observers and call optional onStateChange
  const [, setTick] = useState(0);
  const fireStateChange = useCallback(() => {
    setTick((t) => t + 1);
    try {
      onStateChange?.();
    } catch {}
  }, [onStateChange]);

  // compute insertion index by pointer Y using centers of items
  const computePlaceholder = useCallback((y: number, rects: ThumbRect[]) => {
    if (!rects || rects.length === 0) return 0;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r) { // Add null check
        const mid = r.top + r.height / 2;
        if (y < mid) return i;
      }
    }
    return rects.length;
  }, []);

  // update placeholder based on pointer Y (raw index relative to full list)
  const updatePlaceholderByPointer = useCallback(
    (clientY: number) => {
      const rects = getThumbRects();
      const rawIndex = computePlaceholder(clientY, rects);
      stateRef.current.placeholderIndex = rawIndex;
      fireStateChange();
    },
    [computePlaceholder, getThumbRects, fireStateChange]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!stateRef.current.dragging) return;
      updatePlaceholderByPointer(e.clientY);
      try {
        e.preventDefault();
      } catch {}
    },
    [updatePlaceholderByPointer]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!stateRef.current.dragging) return;

      const dragIds = stateRef.current.dragIds.slice();
      const placeholder = stateRef.current.placeholderIndex;

      // compute finalIndex: if placeholder null -> end
      const rects = getThumbRects();
      const rawFinal = placeholder === null ? rects.length : placeholder;

      // Adjust final index to account for removing dragged items from the list:
      // count how many dragged items are located before rawFinal in current rect order.
      // We use rects order (which matches slides order) and rects[i].id to find positions.
      const idOrder = rects.map((r) => r.id).filter(Boolean) as string[]; // Filter out undefined and cast to string[]
      const draggedPositions = dragIds
        .map((id) => idOrder.indexOf(id))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b);
      const removedBeforeTarget = draggedPositions.filter((pos) => pos < rawFinal).length;
      const adjustedIndex = Math.max(0, rawFinal - removedBeforeTarget);

      // clear state
      stateRef.current.dragging = false;
      stateRef.current.dragIds = [];
      stateRef.current.originIndex = -1;
      stateRef.current.pointerStartY = 0;
      stateRef.current.placeholderIndex = null;
      fireStateChange();

      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);

      try {
        onDrop?.(dragIds, adjustedIndex);
      } catch {}
      try {
        e.preventDefault();
      } catch {}
    },
    [fireStateChange, getThumbRects, onDrop, onPointerMove]
  );

  const onPointerDown = useCallback(
    (ev: React.PointerEvent, payload: DragPayload) => {
      // only left button
      if ((ev as any).button !== 0) return;

      const { id, index, selectedIds } = payload;
      // prefer passed selectedIds (group); fallback to single id
      const dragIds = selectedIds && selectedIds.length > 0 ? selectedIds.slice() : [id];

      // initialize drag
      stateRef.current.dragging = true;
      stateRef.current.dragIds = dragIds;
      // originIndex — first dragged index: either index of first id in order or provided index
      const rects = getThumbRects();
      const order = rects.map((r) => r.id).filter(Boolean) as string[]; // Filter out undefined and cast to string[]
      
      // Safe handling of first index
      let firstIndex = index;
      if (dragIds.length > 0) {
        const firstId = dragIds[0];
        if (firstId) {
          firstIndex = Math.max(0, order.indexOf(firstId));
        }
      }
      
      stateRef.current.originIndex = firstIndex >= 0 ? firstIndex : index;
      stateRef.current.pointerStartY = (ev as any).clientY ?? 0;

      // initial placeholder computed with current pointer Y
      const clientY = (ev as any).clientY ?? 0;
      updatePlaceholderByPointer(clientY);

      // attach listeners
      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', onPointerUp, true);

      fireStateChange();

      try {
        (ev.target as Element).setPointerCapture?.((ev as any).pointerId);
      } catch {}
      try {
        ev.preventDefault();
      } catch {}
    },
    [fireStateChange, getThumbRects, onPointerMove, onPointerUp, updatePlaceholderByPointer]
  );

  const readState = useCallback(() => {
    return {
      dragging: stateRef.current.dragging,
      dragIds: stateRef.current.dragIds.slice(),
      originIndex: stateRef.current.originIndex,
      placeholderIndex:
        stateRef.current.placeholderIndex === null ? -1 : stateRef.current.placeholderIndex,
    };
  }, []);

  return {
    onPointerDown,
    readState,
  };
}

export default useDrag;