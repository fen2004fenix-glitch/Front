// presentationSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Presentation, Slide, Element } from '../types';
import { normalizeHexColor } from '../utils/colorUtils';

export interface PresentationState extends Presentation {
  activeSlideIndex: number;
  editingElementId: string | null;
  selectedElementIds: string[];
  selectedSlideIds: string[];
}

const initialState: PresentationState = {
  id: 'p1',
  title: 'Новая презентация',
  slides: [],
  activeSlideIndex: 0,
  editingElementId: null,
  selectedElementIds: [],
  selectedSlideIds: [],
};

const presentationSlice = createSlice({
  name: 'presentation',
  initialState,
  reducers: {
    setPresentation: (state, action: PayloadAction<PresentationState>) => {
      return { ...action.payload };
    },

    setTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload;
    },

    setActiveSlideIndex: (state, action: PayloadAction<number>) => {
      state.activeSlideIndex = action.payload;
    },

    setEditingElementId: (state, action: PayloadAction<string | null>) => {
      state.editingElementId = action.payload;
    },

    setSelectedElementIds: (state, action: PayloadAction<string[]>) => {
      state.selectedElementIds = action.payload;
    },

    setSelectedSlideIds: (state, action: PayloadAction<string[]>) => {
      state.selectedSlideIds = action.payload;
    },

    addSlide: (state, action: PayloadAction<{ slide: Slide; index?: number }>) => {
      const { slide, index } = action.payload;
      const normalizedSlide = {
        ...slide,
        background: normalizeHexColor(slide.background),
      };

      if (index === undefined || index < 0 || index >= state.slides.length) {
        state.slides.push(normalizedSlide);
      } else {
        state.slides.splice(index, 0, normalizedSlide);
      }
    },

    removeSlide: (state, action: PayloadAction<string>) => {
      const slideIndex = state.slides.findIndex(slide => slide.id === action.payload);
      if (slideIndex !== -1) {
        state.slides.splice(slideIndex, 1);
        if (state.activeSlideIndex >= state.slides.length) {
          state.activeSlideIndex = Math.max(0, state.slides.length - 1);
        }
        state.selectedSlideIds = state.selectedSlideIds.filter(id => id !== action.payload);
      }
    },

    reorderSlides: (state, action: PayloadAction<{ slideIds: string[]; newIndex: number }>) => {
      const { slideIds, newIndex } = action.payload;
      const slidesToMove = state.slides.filter(slide => slideIds.includes(slide.id));
      const remainingSlides = state.slides.filter(slide => !slideIds.includes(slide.id));
      const adjustedIndex = Math.max(0, Math.min(newIndex, remainingSlides.length));
      state.slides = [
        ...remainingSlides.slice(0, adjustedIndex),
        ...slidesToMove,
        ...remainingSlides.slice(adjustedIndex),
      ];
    },

    updateSlideBackground: (state, action: PayloadAction<{ slideId: string; background: string }>) => {
      const { slideId, background } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        slide.background = normalizeHexColor(background);
      }
    },

    addElement: (state, action: PayloadAction<{ slideId: string; element: Element }>) => {
      const { slideId, element } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        slide.elements.push(element);
      }
    },

    removeElement: (state, action: PayloadAction<{ slideId: string; elementId: string }>) => {
      const { slideId, elementId } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        slide.elements = slide.elements.filter(el => el.id !== elementId);
        state.selectedElementIds = state.selectedElementIds.filter(id => id !== elementId);
        if (state.editingElementId === elementId) {
          state.editingElementId = null;
        }
      }
    },

    updateElementPosition: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      position: { x: number; y: number };
    }>) => {
      const { slideId, elementId, position } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        const element = slide.elements.find(el => el.id === elementId);
        if (element) {
          // ФИКС: Проверяем, действительно ли позиция изменилась
          if (element.position.x === position.x && element.position.y === position.y) {
            return; // Позиция не изменилась - выходим
          }
          element.position = position;
        }
      }
    },

    updateElementSize: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      size: { width: number; height: number };
    }>) => {
      const { slideId, elementId, size } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        const element = slide.elements.find(el => el.id === elementId);
        if (element) {
          // ФИКС: Проверяем, действительно ли размер изменился
          if (element.size.width === size.width && element.size.height === size.height) {
            return; // Размер не изменился - выходим
          }
          element.size = size;
        }
      }
    },

    updateTextContent: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      content: string;
    }>) => {
      const { slideId, elementId, content } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        const element = slide.elements.find(el => el.id === elementId);
        if (element && element.type === 'text') {
          element.content = content;
        }
      }
    },

    updateTextSize: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      fontSize: number;
    }>) => {
      const { slideId, elementId, fontSize } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        const element = slide.elements.find(el => el.id === elementId);
        if (element && element.type === 'text') {
          element.fontSize = fontSize;
        }
      }
    },

    updateTextFontFamily: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      fontFamily: string;
    }>) => {
      const { slideId, elementId, fontFamily } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        const element = slide.elements.find(el => el.id === elementId);
        if (element && element.type === 'text') {
          element.fontFamily = fontFamily;
        }
      }
    },

    // NEW: Update font size for multiple elements at once
    updateTextSizeForMultiple: (state, action: PayloadAction<{
      slideId: string;
      elementIds: string[];
      fontSize: number;
    }>) => {
      const { slideId, elementIds, fontSize } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        elementIds.forEach(elementId => {
          const element = slide.elements.find(el => el.id === elementId);
          if (element && element.type === 'text') {
            element.fontSize = fontSize;
          }
        });
      }
    },

    // NEW: Update font family for multiple elements at once
    updateTextFontFamilyForMultiple: (state, action: PayloadAction<{
      slideId: string;
      elementIds: string[];
      fontFamily: string;
    }>) => {
      const { slideId, elementIds, fontFamily } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        elementIds.forEach(elementId => {
          const element = slide.elements.find(el => el.id === elementId);
          if (element && element.type === 'text') {
            element.fontFamily = fontFamily;
          }
        });
      }
    },

    // NEW: Update text color for single element
    updateTextColor: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      color: string;
    }>) => {
      const { slideId, elementId, color } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        const element = slide.elements.find(el => el.id === elementId);
        if (element && element.type === 'text') {
          element.color = color;
        }
      }
    },

    // NEW: Update text color for multiple elements at once
    updateTextColorForMultiple: (state, action: PayloadAction<{
      slideId: string;
      elementIds: string[];
      color: string;
    }>) => {
      const { slideId, elementIds, color } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (slide) {
        elementIds.forEach(elementId => {
          const element = slide.elements.find(el => el.id === elementId);
          if (element && element.type === 'text') {
            element.color = color;
          }
        });
      }
    },

    // NEW: bring element to front by moving it to the end of slide.elements
    bringElementToFront: (state, action: PayloadAction<{ slideId: string; elementId: string }>) => {
      const { slideId, elementId } = action.payload;
      const slide = state.slides.find(s => s.id === slideId);
      if (!slide) return;
      const idx = slide.elements.findIndex(el => el.id === elementId);
      if (idx === -1) return;
      const [el] = slide.elements.splice(idx, 1);
      slide.elements.push(el!);
    },

    exportSlide: (state, action: PayloadAction<{ slideId: string }>) => {
      // Placeholder for export logic
    },

    duplicateSlide: (state, action: PayloadAction<{ slideId: string }>) => {
      const { slideId } = action.payload;
      const slideToDuplicate = state.slides.find(s => s.id === slideId);
      if (!slideToDuplicate) return;

      const timestamp = Date.now();
      const newSlide: Slide = {
        ...slideToDuplicate,
        id: `s_${timestamp}`,
        elements: slideToDuplicate.elements.map(el => ({
          ...el,
          id: `${el.type}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      const currentIndex = state.slides.findIndex(s => s.id === slideId);
      state.slides.splice(currentIndex + 1, 0, newSlide);
    },
  },
});

export const {
  setPresentation,
  setTitle,
  setActiveSlideIndex,
  setEditingElementId,
  setSelectedElementIds,
  setSelectedSlideIds,
  addSlide,
  removeSlide,
  reorderSlides,
  updateSlideBackground,
  addElement,
  removeElement,
  updateElementPosition,
  updateElementSize,
  updateTextContent,
  updateTextSize,
  updateTextFontFamily,
  updateTextSizeForMultiple,
  updateTextFontFamilyForMultiple,
  updateTextColor,
  updateTextColorForMultiple,
  bringElementToFront,
  exportSlide,
  duplicateSlide,
} = presentationSlice.actions;

export default presentationSlice.reducer;