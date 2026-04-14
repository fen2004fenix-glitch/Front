import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setActiveSlideIndex, setSelectedSlideIds, reorderSlides, removeSlide } from '../store/presentationSlice';
import { useDrag } from '../hooks/useDrag';

function arraysEqual(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export const SlideList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { slides, activeSlideIndex, selectedSlideIds } = useAppSelector(state => state.presentation);

  const listRef = useRef<HTMLDivElement | null>(null);
  const [internalLastFocused, setInternalLastFocused] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Удаление выбранных слайдов по Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSlideIds.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        // Находим выбранные слайды для удаления
        const slidesToRemove = slides.filter((slide: { id: any; }) => selectedSlideIds.includes(slide.id));

        slidesToRemove.forEach((slideToRemove: { elements: any[]; id: string; }) => {
          // Удаляем все blob URL изображений в удаляемом слайде
          slideToRemove.elements.forEach((element: any) => {
            if (element.type === 'image' && typeof element.src === 'string' && element.src.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(element.src);
              } catch {}
            }
          });

          dispatch(removeSlide(slideToRemove.id));
        });

        // Сбрасываем выделение слайдов после удаления
        dispatch(setSelectedSlideIds([]));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSlideIds, slides, dispatch]);

  const getThumbRects = useCallback(() => {
    const container = listRef.current;
    if (!container) return [];
    const nodes = Array.from(container.children).filter((n) =>
      n.classList.contains('slide-thumb')
    ) as HTMLElement[];
    return nodes.map((n, i) => {
      const r = n.getBoundingClientRect();
      const slideAtIndex = slides[i];
      const id = slideAtIndex ? slideAtIndex.id : `idx-${i}`;
      return { id, top: r.top, height: r.height };
    });
  }, [slides]);

  const onDragStateChange = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const { onPointerDown: dragOnPointerDown, readState } = useDrag({
    getThumbRects,
    onDrop: (ids, index) => {
      dispatch(reorderSlides({ slideIds: ids, newIndex: index }));
    },
    onStateChange: onDragStateChange,
  });

  const handleThumbPointerDown = (e: React.PointerEvent, slideId: string, index: number) => {
    if ((e as any).button !== 0) return;
    const isMeta = (e as any).metaKey || (e as any).ctrlKey;
    const isShift = (e as any).shiftKey;

    let newSelected: string[] = [];

    if (isShift && internalLastFocused !== null) {
      const start = Math.min(internalLastFocused, index);
      const end = Math.max(internalLastFocused, index);
      newSelected = slides.slice(start, end + 1).map((s: { id: any; }) => s.id);
    } else if (isMeta) {
      newSelected = selectedSlideIds.includes(slideId)
        ? selectedSlideIds.filter((x: string) => x !== slideId)
        : [...selectedSlideIds, slideId];
    } else {
      if (selectedSlideIds.includes(slideId) && selectedSlideIds.length > 1) {
        newSelected = [...selectedSlideIds];
      } else {
        newSelected = [slideId];
      }
    }

    setInternalLastFocused(index);

    if (!arraysEqual(newSelected, selectedSlideIds)) {
      dispatch(setSelectedSlideIds(newSelected));
    }

    if (!isMeta && !isShift) {
      const clickedWasMultiSelected = selectedSlideIds.includes(slideId) && selectedSlideIds.length > 1;
      try {
        e.preventDefault();
      } catch {}
      try {
        e.stopPropagation();
      } catch {}
      if (!clickedWasMultiSelected) {
        dispatch(setActiveSlideIndex(index));
      }
    }

    dragOnPointerDown(e, { id: slideId, index, selectedIds: newSelected });
  };

  const renderThumb = (s: any, i: number) => {
    const dragState = readState();
    const placeholderIndex = dragState.placeholderIndex;
    const dragIds = dragState.dragIds || [];
    const isPlaceholderHere = placeholderIndex === i;
    const selected = selectedSlideIds.includes(s.id);
    const beingDragged = dragIds.includes(s.id);

    return (
      <React.Fragment key={s.id}>
        {isPlaceholderHere && <div className="slide-placeholder" />}
        <div
          onPointerDown={(e) => handleThumbPointerDown(e, s.id, i)}
          className={[
            'slide-thumb',
            i === activeSlideIndex ? 'active' : '',
            selected ? 'selected' : '',
            beingDragged ? 'dragging' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ background: s.background }}
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          data-id={s.id}
        >
          {`Слайд ${i + 1}`}
        </div>
      </React.Fragment>
    );
  };
 // 100-124 вынеси в отдельный компонент
  const dragState = readState();
  const placeholderAtEnd = dragState.placeholderIndex === slides.length;

  return (
    <div className="slide-list" ref={listRef}>
      {slides.map((s: any, i: number) => renderThumb(s, i))}
      {placeholderAtEnd && <div className="slide-placeholder" />}
    </div>
  );
};

export default SlideList;
