// src/testData.ts
import type { Presentation } from './types';

/**
 * Empty presentation — useful for edge-case tests (no slides)
 */
export const emptyPresentation: Presentation = {
  id: 'p_empty',
  title: 'Empty Presentation',
  slides: [],
};

/**
 * Minimal presentation with an empty slide (collections are empty)
 */
export const minimalPresentationEmptySlide: Presentation = {
  id: 'p_min_emptySlide',
  title: 'Минимал. слайд без элементов',
  slides: [
    {
      id: 's_min_1',
      background: '#ffffffff',
      elements: [],
    },
  ],
};

/**
 * Minimal presentation with a single text element (practical minimal case)
 */
export const minimalPresentation: Presentation = {
  id: 'p1',
  title: 'Моя первая презентация',
  slides: [
    {
      id: 's1',
      background: '#ffffff',
      elements: [
        {
          id: 't1',
          type: 'text',
          content: 'Заголовок',
          fontSize: 24,
          fontFamily: 'Arial',
          position: { x: 50, y: 50 },
          size: { width: 200, height: 50 },
        },
      ],
    },
  ],
};

/**
 * Maximal extended presentation — >=2 slides, each with >=2 elements,
 * includes text and image elements and varied properties
 */
export const maximalPresentationExtended: Presentation = {
  id: 'p_max_ext',
  title: 'Полная тестовая презентация',
  slides: [
    {
      id: 's1',
      background: '#ffffff',
      elements: [
        {
          id: 't1',
          type: 'text',
          content: 'Заголовок 1',
          fontSize: 32,
          fontFamily: 'Times New Roman',
          position: { x: 10, y: 10 },
          size: { width: 300, height: 60 },
        },
        {
          id: 'i1',
          type: 'image',
          src: 'https://via.placeholder.com/150',
          position: { x: 50, y: 100 },
          size: { width: 150, height: 150 },
        },
        {
          id: 't1b',
          type: 'text',
          content: 'Подзаголовок',
          fontSize: 20,
          fontFamily: 'Verdana',
          position: { x: 20, y: 80 },
          size: { width: 250, height: 40 },
        },
      ],
    },
    {
      id: 's2',
      background: '#ffffffff',
      elements: [
        {
          id: 't2',
          type: 'text',
          content: 'Подпись',
          fontSize: 14,
          fontFamily: 'Arial',
          position: { x: 20, y: 20 },
          size: { width: 200, height: 30 },
        },
        {
          id: 'i2',
          type: 'image',
          src: 'https://via.placeholder.com/100',
          position: { x: 40, y: 80 },
          size: { width: 100, height: 100 },
        },
        {
          id: 'i2b',
          type: 'image',
          src: 'https://via.placeholder.com/80',
          position: { x: 150, y: 60 },
          size: { width: 80, height: 80 },
        },
      ],
    },
  ],
};

/**
 * Another maximal/full presentation variant with multiple slides and diverse elements
 */
export const maximalPresentationFull: Presentation = {
  id: 'p_max_full',
  title: 'Максимальная полная презентация',
  slides: [
    {
      id: 'sA',
      background: '#ffffffff',
      elements: [
        {
          id: 'tA1',
          type: 'text',
          content: 'Header A',
          fontSize: 36,
          fontFamily: 'Georgia',
          position: { x: 12, y: 12 },
          size: { width: 200, height: 80 },
        },
      ],
    },
    {
      id: 'sB',
      background: '#ffffff',
      elements: [
        {
          id: 'tB1',
          type: 'text',
          content: 'Title B',
          fontSize: 28,
          fontFamily: 'Helvetica',
          position: { x: 30, y: 30 },
          size: { width: 400, height: 60 },
        },
        {
          id: 'tB2',
          type: 'text',
          content: 'Subtitle B',
          fontSize: 18,
          fontFamily: 'Helvetica',
          position: { x: 30, y: 100 },
          size: { width: 380, height: 40 },
        },
      ],
    },
    {
      id: 'sC',
      background: '#ffffffff',
      elements: [],
    },
  ],
};

/**
 * Backwards-compatible alias: many modules expect `maximalPresentation`
 * so export an alias for convenience
 */
export const maximalPresentation = maximalPresentationFull;
