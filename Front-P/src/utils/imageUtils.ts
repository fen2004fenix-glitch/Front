/**
 * Utility functions for image handling
 */

export interface ImageDimensions {
  width: number;
  height: number;
  url?: string;
}

/**
 * Get image dimensions from a File object
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, url });
    img.onerror = () => {
      try { 
        URL.revokeObjectURL(url); 
      } catch {
        // Ignore cleanup errors
      }
      reject(new Error('Image load error'));
    };
    img.src = url;
  });
};

/**
 * Get image dimensions from a URL
 */
export const getImageDimensionsFromUrl = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image from URL'));
    img.src = url;
  });
};

/**
 * Check if a URL is a blob URL
 */
export const isBlobUrl = (url: string): boolean => {
  return url.startsWith('blob:');
};

/**
 * Check if a URL is from Appwrite Storage
 */
export const isAppwriteStorageUrl = (url: string): boolean => {
  return url.includes('storage/v1/file');
};

/**
 * Extract file ID from Appwrite Storage URL
 */
export const extractFileIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/storage\/v1\/file\/view\/[^/]+\/([^/?]+)/);
  return match && match[1] ? match[1] : null;
};

