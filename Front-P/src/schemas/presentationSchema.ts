import type { JSONSchemaType } from 'ajv';
import type { Presentation, Slide, Element } from '../types';

export const elementSchema: JSONSchemaType<Element> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['text', 'image', 'shape'] },
    position: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['x', 'y'],
    },
    size: {
      type: 'object',
      properties: {
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['width', 'height'],
    },
    content: { type: 'string', nullable: true },
    fontSize: { type: 'number', nullable: true },
    fontFamily: { type: 'string', nullable: true },
    src: { type: 'string', nullable: true },
    color: { type: 'string', nullable: true },
    shape: { type: 'string', nullable: true },
    fillColor: { type: 'string', nullable: true },
    borderColor: { type: 'string', nullable: true },
    borderWidth: { type: 'number', nullable: true },
  },
  required: ['id', 'type', 'position', 'size'],
  additionalProperties: false,
};

export const slideSchema: JSONSchemaType<Slide> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string', nullable: true },
    background: { type: 'string', nullable: true },
    elements: { type: 'array', items: elementSchema },
  },
  required: ['id', 'elements'],
  additionalProperties: false,
};

export const presentationSchema: JSONSchemaType<Presentation> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    slides: { type: 'array', items: slideSchema },
  },
  required: ['id', 'title', 'slides'],
  additionalProperties: false,
};