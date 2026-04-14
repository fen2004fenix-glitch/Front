import { useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { addElement, removeElement } from '../store/presentationSlice';
import { PresentationService } from '../services/presentationService';
import { getImageDimensions, getImageDimensionsFromUrl } from '../utils/imageUtils';
import type { Element } from '../types';

/**
 * Hook for handling image operations (upload, add by URL, remove)
 */
export const useImageHandling = () => {
  const dispatch = useAppDispatch();
  const { slides, activeSlideIndex } = useAppSelector(state => state.presentation);
  const slide = slides?.[activeSlideIndex];
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  const handleFileSelected = useCallback(async (file: File | null, userId: string | undefined) => {
    if (!file || !slide || !userId) return false;

    try {
      const storageUrl = await PresentationService.uploadImage(file, userId);
      
      let width = 200, height = 150;
      try {
        const dims = await getImageDimensionsFromUrl(storageUrl);
        width = dims.width;
        height = dims.height;
      } catch (error) {
        console.warn('Could not get image dimensions:', error);
      }

      const newImageElement: Element = {
        id: `img_${Date.now()}`,
        type: 'image' as const,
        src: storageUrl,
        position: { x: 50, y: 50 },
        size: { width, height },
      };

      dispatch(addElement({ slideId: slide.id, element: newImageElement }));
      return true;
    } catch (error) {
      console.error('Error uploading image:', error);
      
      try {
        const { width, height, url } = await getImageDimensions(file);
        const newImageElement: Element = {
          id: `img_${Date.now()}`,
          type: 'image' as const,
          src: url,
          position: { x: 50, y: 50 },
          size: { width, height },
        };
        
        dispatch(addElement({ slideId: slide.id, element: newImageElement }));
        if (url) {
          createdBlobUrlsRef.current.add(url);
        }
        return true;
      } catch {
        return false;
      }
    }
  }, [slide, dispatch]);

  const addImageByUrl = useCallback(async (url: string, userId: string | undefined) => {
    if (!slide || !userId) return false;

    try {
      const response = await fetch(url.trim());
      const blob = await response.blob();
      const file = new File([blob], `external_${Date.now()}.jpg`, { type: blob.type });
      
      const storageUrl = await PresentationService.uploadImage(file, userId);
      const dimensions = await getImageDimensionsFromUrl(storageUrl);

      const newImageElement: Element = {
        id: `img_${Date.now()}`,
        type: 'image' as const,
        src: storageUrl,
        position: { x: 50, y: 50 },
        size: { width: dimensions.width, height: dimensions.height },
      };

      dispatch(addElement({ slideId: slide.id, element: newImageElement }));
      return true;
    } catch (error) {
      console.error('Error processing external image:', error);
      
      try {
        const dimensions = await getImageDimensionsFromUrl(url.trim());
        const newImageElement: Element = {
          id: `img_${Date.now()}`,
          type: 'image' as const,
          src: url.trim(),
          position: { x: 50, y: 50 },
          size: { width: dimensions.width, height: dimensions.height },
        };
        
        dispatch(addElement({ slideId: slide.id, element: newImageElement }));
        return true;
      } catch {
        return false;
      }
    }
  }, [slide, dispatch]);

  const removeLastImage = useCallback(async () => {
    if (!slide) return;

    const lastImage = slide.elements
      .slice()
      .reverse()
      .find((el: Element) => el.type === 'image');

    if (lastImage) {
      const src = lastImage.src;
      
      if (typeof src === 'string') {
        if (src.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(src);
            createdBlobUrlsRef.current.delete(src);
          } catch {
            // Ignore cleanup errors
          }
        }
        
        if (src.includes('storage/v1/file')) {
          try {
            await PresentationService.deleteImage(src);
          } catch (error) {
            console.warn('Failed to delete image from storage:', error);
          }
        }
      }
      
      dispatch(removeElement({ slideId: slide.id, elementId: lastImage.id }));
    }
  }, [slide, dispatch]);

  // Cleanup blob URLs on unmount
  const cleanup = useCallback(() => {
    createdBlobUrlsRef.current.forEach((url) => {
      try { 
        URL.revokeObjectURL(url); 
      } catch {
        // Ignore cleanup errors
      }
    });
    createdBlobUrlsRef.current.clear();
  }, []);

  return {
    handleFileSelected,
    addImageByUrl,
    removeLastImage,
    cleanup,
  };
};

