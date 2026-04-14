// components/Workspace.tsx
import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
  setEditingElementId,
  setSelectedElementIds,
  bringElementToFront,
  removeElement,
  updateTextContent,
} from '../store/presentationSlice';
import DraggableElement from './DraggableElement';
import { useMarqueeSelection } from '../hooks/useMarqueeSelection';
import './Workspace.css';
import '../styles.css';

export const Workspace: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    slides,
    activeSlideIndex,
    editingElementId,
    selectedElementIds,
  } = useAppSelector((state: any) => state.presentation);

  const slide = slides[activeSlideIndex];
  const elements = slide?.elements || [];
  const background = slide?.background || '#ffffff';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSelectionRef = useRef<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.keyCode === 46) {
        if (editingElementId === null && selectedElementIds.length > 0 && slide) {
          e.preventDefault();
          const idsToRemove = [...selectedElementIds];
          idsToRemove.forEach((elementId) => {
            const el = slide.elements.find((e: any) => e.id === elementId);
            const src = (el as any)?.src;
            if (typeof src === 'string' && src.startsWith('blob:')) {
              try { URL.revokeObjectURL(src); } catch {}
            }
            dispatch(removeElement({ slideId: slide.id, elementId }));
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingElementId, selectedElementIds, slide, dispatch]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.style.setProperty('--workspace-bg', background);
    }
  }, [background]);

  const getElementsRects = useCallback(() => {
    const root = containerRef.current;
    if (!root) return [];
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.el'));
    return nodes
      .map((n) => {
        const id = n.dataset.id ?? '';
        return { id, rect: n.getBoundingClientRect() };
      })
      .filter((x) => x.id);
  }, []);

  const arraysEqual = (a: string[], b: string[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const onMarqueeChange = useCallback(
    (sel: { ids: string[]; additive: boolean; range: boolean }) => {
      const ids = sel.ids ?? [];

      if (ids.length === 0) {
        if (!sel.additive && !sel.range) {
          if (lastSelectionRef.current.length > 0) {
            lastSelectionRef.current = [];
            dispatch(setSelectedElementIds([]));
          }
        }
        return;
      }

      const hasChanged = !arraysEqual(ids, lastSelectionRef.current);
      if (!hasChanged) return;

      lastSelectionRef.current = ids;

      if (sel.additive) {
        const newSelection = [...new Set([...selectedElementIds, ...ids])];
        dispatch(setSelectedElementIds(newSelection));
        return;
      }

      if (sel.range) {
        dispatch(setSelectedElementIds(ids));
        return;
      }

      dispatch(setSelectedElementIds(ids));
    },
    [selectedElementIds, dispatch]
  );

  const handleSelectElement = (id: string, e?: React.PointerEvent | React.MouseEvent | null) => {
    const additive = e?.ctrlKey || e?.metaKey;
    const range = e?.shiftKey;

    const isSimpleClick = !additive && !range;
    const isAlreadySingleSelected = selectedElementIds.length === 1 && selectedElementIds[0] === id;
    
    if (isSimpleClick && isAlreadySingleSelected) return;

    if (additive) {
      const newSelection = selectedElementIds.includes(id)
        ? selectedElementIds.filter((x: string) => x !== id)
        : [...selectedElementIds, id];
      if (!arraysEqual(newSelection, selectedElementIds)) {
        dispatch(setSelectedElementIds(newSelection));
      }
    } else if (range) {
      const elementIndex = elements.findIndex((el: any) => el.id === id);
      const lastSelectedId = selectedElementIds[selectedElementIds.length - 1];
      const lastSelectedIndex = elements.findIndex((el: any) => el.id === lastSelectedId);

      if (lastSelectedIndex !== -1) {
        const start = Math.min(lastSelectedIndex, elementIndex);
        const end = Math.max(lastSelectedIndex, elementIndex);
        const rangeIds = elements.slice(start, end + 1).map((el: any) => el.id);
        if (!arraysEqual(rangeIds, selectedElementIds)) {
          dispatch(setSelectedElementIds(rangeIds));
        }
      }
    } else {
      if (!arraysEqual([id], selectedElementIds)) {
        dispatch(setSelectedElementIds([id]));
      }
    }
  };

  const handleStartEdit = (elementId: string) => {
    dispatch(setEditingElementId(elementId));
  };

  const { marquee, getMarqueeStyle } = useMarqueeSelection({
    containerRef,
    getElementsRects,
    onChange: onMarqueeChange,
  });

  const selectedPositions = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    if (!elements || elements.length === 0) return m;
    for (const el of elements) {
      if (selectedElementIds.includes(el.id)) {
        m[el.id] = { x: el.position.x, y: el.position.y };
      }
    }
    return m;
  }, [elements, selectedElementIds]);

  // Сохраняем текст редактируемого элемента (используется как запасной вариант)
  const saveEditingText = useCallback(
    (elementId: string | null) => {
      if (!elementId || !slide) return;
      const editingElement = elements.find((it: any) => it.id === elementId);
      if (!editingElement || editingElement.type !== 'text') return;

      const inputElement = document.querySelector(
        `[data-id="${elementId}"] textarea.inline-edit, [data-id="${elementId}"] input.inline-edit`
      ) as HTMLTextAreaElement | HTMLInputElement | null;

      const content = (inputElement?.value ?? editingElement.content ?? '').trim();
      const original = (editingElement.content ?? '').trim();

      if (content !== original) {
        dispatch(updateTextContent({ slideId: slide.id, elementId, content }));
      }
    },
    [elements, slide, dispatch]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!editingElementId || !slide) return;

      const target = e.target as HTMLElement;
      const clickedElement = target.closest?.('.el');
      const clickedElementId = clickedElement?.getAttribute('data-id');

      if (clickedElementId !== editingElementId) {
        saveEditingText(editingElementId);
        dispatch(setEditingElementId(null));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingElementId, slide, saveEditingText, dispatch]);

  const handleWorkspacePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e as any).button !== 0) return;

      const container = containerRef.current;
      if (!container) return;

      const closestEl = (e.target as Element | null)?.closest?.('.el');

      if (closestEl) {
        const clickedElementId = closestEl.getAttribute('data-id');

        if (editingElementId && clickedElementId !== editingElementId) {
          saveEditingText(editingElementId);
          dispatch(setEditingElementId(null));
          return;
        }

        return;
      }

      if (editingElementId) {
        const editingElement = elements.find((it: any) => it.id === editingElementId);

        if (editingElement) {
          if ((editingElement as any).type === 'text') {
            const content = (editingElement as any).content;
            const isEmpty = content == null || String(content).trim() === '';
            if (isEmpty) {
              const src = (editingElement as any).src;
              if (typeof src === 'string' && src.startsWith('blob:')) {
                try { URL.revokeObjectURL(src); } catch {}
              }
              dispatch(removeElement({ slideId: slide!.id, elementId: editingElementId }));
              dispatch(setEditingElementId(null));
              if (selectedElementIds.length > 0) {
                dispatch(setSelectedElementIds([]));
              }
              return;
            } else {
              saveEditingText(editingElementId);
              dispatch(setEditingElementId(null));
              return;
            }
          }

          dispatch(setEditingElementId(null));
          return;
        } else {
          dispatch(setEditingElementId(null));
          return;
        }
      }

      if (selectedElementIds.length > 0) {
        dispatch(setSelectedElementIds([]));
      }
    },
    [editingElementId, elements, dispatch, slide, selectedElementIds, saveEditingText]
  );

  if (!slide) {
    return <div className="workspace" />;
  }

  return (
    <div
      className="workspace"
      ref={containerRef}
      onPointerDown={handleWorkspacePointerDown}
      aria-label="Workspace"
    >
      {elements.map((el: any) => {
        const isSelected = selectedElementIds.includes(el.id);

        return (
          <DraggableElement
            key={el.id}
            el={el}
            slideIndex={activeSlideIndex}
            editing={editingElementId === el.id}
            selected={isSelected}
            selectedIds={selectedElementIds}
            selectedPositions={selectedPositions}
            onSelect={handleSelectElement}
            onStartEdit={handleStartEdit}
            bringToFront={() => {
              if (!slide) return;
              dispatch(bringElementToFront({ slideId: slide.id, elementId: el.id }));
            }}
          />
        );
      })}

      {getMarqueeStyle && marquee && (
        <div
          className="marquee-selection"
          style={getMarqueeStyle}
          aria-hidden
        />
      )}
    </div>
  );
};

export default Workspace;
