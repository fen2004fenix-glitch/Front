import Ajv from 'ajv';
import { presentationSchema } from '../schemas/presentationSchema';
import type { Presentation } from '../types';

const ajv = new Ajv();
const validatePresentation = ajv.compile(presentationSchema);

export const validatePresentationData = (data: any): data is Presentation => {
  return validatePresentation(data);
};

export const getValidationErrors = (data: any): string[] => {
  validatePresentation(data);
  return validatePresentation.errors?.map(error => 
    `${error.instancePath} ${error.message}`
  ) || [];
};