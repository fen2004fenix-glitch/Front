import { useCallback, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { setPresentation } from '../store/presentationSlice';
import { PresentationService } from '../services/presentationService';
import { validatePresentationData } from '../utils/validator';
import { normalizeHexColor } from '../utils/colorUtils';
import { processAndUploadImages, cleanupOldImages } from '../utils/presentationImageUtils';
import type { Presentation, Slide } from '../types';

/**
 * Hook for managing presentation save and load operations
 */
export const usePresentationSave = (userId: string | undefined) => {
  const dispatch = useAppDispatch();
  const presentationState = useAppSelector(state => state.presentation);
  const previousPresentationRef = useRef<Presentation | null>(null);

  const buildPresentationFromState = useCallback((): Presentation => ({
    id: userId || 'temp',
    title: presentationState.title,
    slides: presentationState.slides.map((slide: Slide) => ({
      ...slide,
      background: normalizeHexColor(slide.background)
    }))
  }), [presentationState, userId]);

  const createNewPresentation = useCallback((newUserId: string) => {
    const newPresentation: Presentation = {
      id: newUserId,
      title: 'Новая презентация',
      slides: [{
        id: 'slide_1',
        elements: [],
        background: '#ffffffff'
      }]
    };
    
    previousPresentationRef.current = newPresentation;
    
    const state = {
      ...newPresentation,
      activeSlideIndex: 0,
      editingElementId: null,
      selectedElementIds: [],
      selectedSlideIds: [],
    };
    
    dispatch(setPresentation(state));
  }, [dispatch]);

  const loadUserPresentation = useCallback(async () => {
    if (!userId) return;

    try {
      const savedPresentation = await PresentationService.getPresentation(userId);
      
      if (savedPresentation && validatePresentationData(savedPresentation)) {
        const state = {
          ...savedPresentation,
          activeSlideIndex: 0,
          editingElementId: null,
          selectedElementIds: [],
          selectedSlideIds: [],
        };
        
        state.slides = state.slides.map(slide => ({
          ...slide,
          background: normalizeHexColor(slide.background)
        }));
        
        previousPresentationRef.current = {
          id: userId,
          title: state.title,
          slides: state.slides
        };
        
        dispatch(setPresentation(state));
        return true;
      } else {
        createNewPresentation(userId);
        return false;
      }
    } catch (error) {
      console.error('Error loading presentation:', error);
      createNewPresentation(userId);
      return false;
    }
  }, [userId, dispatch, createNewPresentation]);

  const savePresentation = useCallback(async (presentationData: Presentation): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      if (!validatePresentationData(presentationData)) {
        console.warn('Invalid presentation data, skipping save');
        return false;
      }
      
      const oldPresentation = previousPresentationRef.current;
      const processedPresentation = await processAndUploadImages(presentationData, userId);
      
      await cleanupOldImages(oldPresentation, processedPresentation, userId);
      await PresentationService.savePresentation(processedPresentation, userId);
      
      previousPresentationRef.current = processedPresentation;
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    }
  }, [userId]);

  return {
    buildPresentationFromState,
    createNewPresentation,
    loadUserPresentation,
    savePresentation,
    previousPresentationRef,
  };
};

