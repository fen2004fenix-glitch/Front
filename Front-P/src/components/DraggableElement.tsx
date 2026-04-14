// DraggableElement.tsx
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { updateElementPosition, updateElementSize, updateTextContent } from '../store/presentationSlice';
import type { Element as ElementT } from '../types';
import useResize from '../hooks/useResize';
import { useDrag } from '../hooks/useDrag';
import { PLACEHOLDER_IMAGE } from '../icons/PlaceholderImage';

type Props = {
  el: ElementT;
  slideIndex: number;
  editing: boolean;
  selected?: boolean;
  selectedIds?: string[];
  selectedPositions?: Record<string, { x: number; y: number }>;
  onSelect?: (id: string, e?: React.PointerEvent | React.MouseEvent | null) => void;
  onStartEdit?: (id: string) => void;
  bringToFront?: () => void;
};

const normalizeResource = (s?: unknown) => {
  const v = String(s ?? '').trim();
  if (!v) return '';
  return /^(data:|https?:|blob:|\/)/i.test(v) ? v : '/' + v;
};

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export default React.memo(function DraggableElement({
  el,
  slideIndex,
  editing,
  selected = false,
  selectedIds = [],
  selectedPositions = {},
  onSelect,
  onStartEdit,
  bringToFront,
}: Props) {
  const dispatch = useAppDispatch();
  const slideFromStore = useAppSelector((s) => s.presentation.slides[slideIndex] ?? null);

  const { x: L, y: T } = el.position;
  const { width: W, height: Ht } = el.size;
  
  const root = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const previewRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const groupInitRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  const [, setTick] = useState(0);
  const [imgErr, setImgErr] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  const hasMoved = useRef(false);

  const setPreview = useCallback(
    (p: { left: number; top: number; width: number; height: number } | null) => {
      previewRef.current = p;
      setTick((t) => t + 1);
    },
    []
  );

  const getInit = useCallback(
    (base: { left: number; top: number; width: number; height: number }) => {
      const b = previewRef.current ?? base;
      return { left: b.left, top: b.top, width: b.width, height: b.height };
    },
    []
  );

  const getThumbRects = useCallback(() => {
    const rects: { id: string; top: number; height: number }[] = [];
    try {
      const containerNode = root.current;
      if (containerNode) {
        const r = containerNode.getBoundingClientRect();
        rects.push({ id: el.id, top: r.top, height: r.height });
      } else {
        rects.push({ id: el.id, top: T, height: Ht });
      }
    } catch {
      rects.push({ id: el.id, top: T, height: Ht });
    }
    return rects;
  }, [el.id, T, Ht]);

  const { onPointerDown: dragOnPointerDown } = useDrag({
    getThumbRects,
    onDrop: () => {},
    onStateChange: () => {},
  });

  const getCurrentSlideId = useCallback(() => slideFromStore?.id ?? null, [slideFromStore]);

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      
      const l = last.current!;
      const dx = e.clientX - l.x;
      const dy = e.clientY - l.y;
      
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasMoved.current = true;
      }
      
      last.current = { x: e.clientX, y: e.clientY };

      const cur = previewRef.current ?? { left: L, top: T, width: W, height: Ht };
      const newMain = { ...cur, left: Math.round(cur.left + dx), top: Math.round(cur.top + dy) };
      setPreview(newMain);

      try {
        e.preventDefault();
      } catch {}
      try {
        e.stopPropagation();
      } catch {}
    },
    [L, T, W, Ht, setPreview]
  );

  const onUp = useCallback(() => {
    if (!dragging.current) return;
    
    const f = previewRef.current;
    const slideId = getCurrentSlideId();
    
    let hasRealChange = false;
    
    if (slideId && f && hasMoved.current) {
      const groupInit = groupInitRef.current;
      
      if (groupInit) {
        const dxTotal = f.left - el.position.x;
        const dyTotal = f.top - el.position.y;
        
        hasRealChange = Object.keys(groupInit).some(id => {
          const init = groupInit[id];
          if (!init) return false;
          
          const finalX = Math.round(init.x + dxTotal);
          const finalY = Math.round(init.y + dyTotal);
          
          return finalX !== init.x || finalY !== init.y;
        });
        
        if (hasRealChange) {
          const updates = Object.keys(groupInit).map((id) => {
            const init = groupInit[id];
            if (init) {
              return {
                slideId,
                elementId: id,
                position: {
                  x: Math.round(init.x + dxTotal),
                  y: Math.round(init.y + dyTotal),
                },
              };
            }
            return null;
          }).filter(Boolean);

          updates.forEach(update => {
            if (update) {
              dispatch(updateElementPosition(update));
            }
          });
          
          bringToFront?.();
        }
      } else {
        const newX = f.left;
        const newY = f.top;
        const oldX = el.position.x;
        const oldY = el.position.y;
        
        hasRealChange = newX !== oldX || newY !== oldY;
        
        if (hasRealChange) {
          dispatch(updateElementPosition({ 
            slideId, 
            elementId: el.id, 
            position: { x: newX, y: newY } 
          }));
          
          bringToFront?.();
        }
      }
    }

    dragging.current = false;
    hasMoved.current = false;
    setPreview(null);
    groupInitRef.current = null;
    
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onUp, true);
  }, [el, slideIndex, setPreview, onMove, bringToFront, dispatch, getCurrentSlideId]);

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e as any).button !== 0) return;
      const target = e.target as Element | null;
      if (target?.closest && target.closest('.handle')) return;
      if (editing) return;
      e.stopPropagation();
      e.preventDefault();

      hasMoved.current = false;

      onSelect?.(el.id, e);

      const selIds = selectedIds ?? [];
      if (selIds.length > 1 && selIds.includes(el.id)) {
        const snapshot: Record<string, { x: number; y: number }> = {};
        selIds.forEach((id) => {
          const p = selectedPositions?.[id];
          if (p) snapshot[id] = { x: p.x, y: p.y };
          else if (id === el.id) snapshot[id] = { x: el.position.x, y: el.position.y };
        });
        groupInitRef.current = snapshot;
      } else {
        groupInitRef.current = null;
      }

      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      setPreview(getInit({ left: L, top: T, width: W, height: Ht }));
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);

      try {
        dragOnPointerDown(e, {
          id: el.id,
          index: 0,
          selectedIds: groupInitRef.current ? Object.keys(groupInitRef.current) : selIds,
        });
      } catch {}
    },
    [
      editing,
      onSelect,
      el,
      selectedIds,
      selectedPositions,
      getInit,
      L,
      T,
      W,
      Ht,
      onMove,
      onUp,
      setPreview,
      dragOnPointerDown,
    ]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      el.type === 'text' && onStartEdit?.(el.id);
    },
    [el, onStartEdit]
  );

  useEffect(() => {
    setImgErr(false);
  }, [(el as any).src]);

  const src = imgErr ? PLACEHOLDER_IMAGE : normalizeResource((el as any).src) || PLACEHOLDER_IMAGE;

  const onResize = useCallback(
    (p: { left: number; top: number; width: number; height: number }) => {
      setPreview(p);
    },
    [setPreview]
  );

  const onResizeEnd = useCallback(() => {
    const f = previewRef.current;
    const slideId = getCurrentSlideId();
    if (!slideId) return;

    if (f) {
      const hasSizeChange = f.width !== el.size.width || f.height !== el.size.height;
      const hasPositionChange = f.left !== el.position.x || f.top !== el.position.y;
      
      if (hasSizeChange) {
        dispatch(
          updateElementSize({ slideId, elementId: el.id, size: { width: f.width, height: f.height } })
        );
      }
      
      if (hasPositionChange) {
        dispatch(
          updateElementPosition({ slideId, elementId: el.id, position: { x: f.left, y: f.top } })
        );
      }
    }
    setPreview(null);
  }, [el.id, el.size.width, el.size.height, el.position.x, el.position.y, dispatch, getCurrentSlideId, setPreview]);

  const clampAdjust = useCallback((p: any) => {
    const { startRect, handle, unclampedWidth, clampedWidth, unclampedHeight, clampedHeight } = p;
    const res: any = {};
    if (clampedWidth !== unclampedWidth && /^(w|nw|sw)$/.test(handle))
      res.left = Math.round(startRect.left + (startRect.width - clampedWidth));
    if (clampedHeight !== unclampedHeight && /^(n|nw|ne)$/.test(handle))
      res.top = Math.round(startRect.top + (startRect.height - clampedHeight));
    return res;
  }, []);

  const corners: HandleType[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const resizeHandlers = corners.map((c) =>
    useResize({
      corner: c,
      getInitial: () => getInit({ left: L, top: T, width: W, height: Ht }),
      minWidth: 20,
      minHeight: 20,
      preserveAspect: false,
      onResize,
      onEnd: onResizeEnd,
      clampAdjust,
    })
  );

  const getHandleHandler = (n: HandleType) => resizeHandlers[corners.indexOf(n)]?.onMouseDown ?? (() => {});

  const final = previewRef.current ?? { left: L, top: T, width: W, height: Ht };
  const cls = ['el', el.type === 'text' ? 'text' : '', selected ? 'selected' : '', '']
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setTick((t) => t + 0);
  }, [final.left, final.top, final.width, final.height]);

  const textColor = el.type === 'text' && el.color ? el.color : '#000000';

  return (
    <div
      ref={root}
      key={el.id}
      className={cls}
      draggable={false}
      onDragStart={(ev) => ev.preventDefault()}
      data-id={el.id}
      data-type={el.type}
      style={{
        ['--el-left' as any]: `${final.left}px`,
        ['--el-top' as any]: `${final.top}px`,
        ['--el-width' as any]: `${final.width}px`,
        ['--el-height' as any]: `${final.height}px`,
      }}
      onPointerDownCapture={onDown}
      tabIndex={0}
      onDoubleClick={handleDoubleClick}
    >
      {el.type === 'text' ? (
        editing ? (
          <input
            ref={input}
            className="inline-edit"
            defaultValue={el.content}
            onBlur={(e) => {
              const slideId = getCurrentSlideId();
              if (!slideId) return;
              dispatch(updateTextContent({ slideId, elementId: el.id, content: e.currentTarget.value }));
            }}
            style={{ 
              fontSize: el.fontSize,
              color: textColor
            }}
          />
        ) : (
          <div
            className="content"
            style={{ 
              fontSize: el.fontSize, 
              fontFamily: el.fontFamily,
              color: textColor
            }}
          >
            {el.content}
          </div>
        )
      ) : (
        <img
          className="content"
          src={src}
          alt=""
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onError={() => setImgErr(true)}
        />
      )}

      {(selected || editing) &&
        corners.map((n) => (
          <div key={n} className={`handle handle-${n}`} onPointerDownCapture={getHandleHandler(n)} />
        ))}
    </div>
  );
});