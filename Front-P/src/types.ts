// src/types.ts

export type SlideId = string;
export type ElementId = string;

export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Presentation = {
  id: string;
  title: string;
  slides: Slide[];
};

export type Slide = {
  id: SlideId;
  title?: string;
  background?: string;
  elements: Element[];
};

/* --- Общий тип элементов --- */
export interface Element {
  id: ElementId;
  type: 'text' | 'image' | 'shape';
  position: Position;
  size: Size;
  // Общие поля
  color?: string | undefined;
  // Для текстовых элементов
  content?: string | undefined;
  fontSize?: number | undefined;
  fontFamily?: string | undefined;
  // Для изображений
  src?: string | undefined; // URL из Appwrite Storage
  // Для фигур
  shape?: 'rectangle' | 'circle' | 'triangle' | undefined;
  fillColor?: string | undefined;
  borderColor?: string | undefined;
  borderWidth?: number | undefined;
}