import { PresentationService } from '../services/presentationService';
import { extractFileIdFromUrl, isBlobUrl, isAppwriteStorageUrl } from './imageUtils';
import type { Presentation, Slide, Element } from '../types';

/**
 * Process and upload images in a presentation
 */
export const processAndUploadImages = async (
  presentation: Presentation,
  userId: string
): Promise<Presentation> => {
  const processedSlides = await Promise.all(
    presentation.slides.map(async (slide: Slide) => {
      const processedElements = await Promise.all(
        slide.elements.map(async (element: Element) => {
          if (element.type !== 'image') return element;
          
          const src = element.src;
          if (!src) return element;
          
          // If already in Appwrite Storage
          if (isAppwriteStorageUrl(src)) return element;
          
          // If blob URL (local file)
          if (isBlobUrl(src)) {
            try {
              const response = await fetch(src);
              const blob = await response.blob();
              const file = new File([blob], `image_${element.id}.png`, { type: blob.type });
              const storageUrl = await PresentationService.uploadImage(file, userId);
              return { ...element, src: storageUrl };
            } catch (error) {
              console.error('Failed to upload image to storage:', error);
              return element;
            }
          }
          
          // If external URL
          if (src.startsWith('http')) {
            try {
              const response = await fetch(src);
              const blob = await response.blob();
              const file = new File([blob], `external_${element.id}.jpg`, { type: blob.type });
              const storageUrl = await PresentationService.uploadImage(file, userId);
              return { ...element, src: storageUrl };
            } catch (error) {
              console.error('Failed to cache external image:', error);
              return element;
            }
          }
          
          return element;
        })
      );
      
      return { ...slide, elements: processedElements };
    })
  );
  
  return { ...presentation, slides: processedSlides };
};

/**
 * Clean up old images that are no longer used
 */
export const cleanupOldImages = async (
  oldPresentation: Presentation | null,
  newPresentation: Presentation,
  userId: string
): Promise<void> => {
  if (!oldPresentation) return;

  const collectImageUrls = (presentation: Presentation): Set<string> => {
    const urls = new Set<string>();
    presentation.slides.forEach((slide: Slide) => {
      slide.elements.forEach((element: Element) => {
        if (element.type === 'image' && element.src && isAppwriteStorageUrl(element.src)) {
          urls.add(element.src);
        }
      });
    });
    return urls;
  };

  const oldImageUrls = collectImageUrls(oldPresentation);
  const newImageUrls = collectImageUrls(newPresentation);

  for (const oldUrl of oldImageUrls) {
    if (!newImageUrls.has(oldUrl)) {
      try {
        await PresentationService.deleteImage(oldUrl);
        console.log('Deleted old image:', oldUrl);
      } catch (error) {
        console.warn('Failed to delete old image:', error);
      }
    }
  }
};

