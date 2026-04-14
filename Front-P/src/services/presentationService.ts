import { databases, storage, ID, Permission, Role } from './appwrite';
import type { Presentation } from '../types';

const DATABASE_ID = 'presentations_db';
const COLLECTION_ID = 'presentations';
const BUCKET_ID = 'images';

export class PresentationService {
  static async savePresentation(presentation: Presentation, userId: string): Promise<boolean> {
    try {
      console.log('Saving presentation to Appwrite...', presentation?.id ?? '(new)');

      const now = new Date().toISOString();
      const documentData = {
        title: presentation.title,
        slides: JSON.stringify(presentation.slides),
        userId,
        updatedAt: now,
      };

      const permissions = [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ];

      if (presentation.id) {
        try {
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            presentation.id,
            documentData
          );
          console.log('Presentation updated successfully:', presentation.id);
          return true;
        } catch (error: any) {
          if (error?.code === 404) {
            console.log('Document not found, creating new one...');
            await databases.createDocument(
              DATABASE_ID,
              COLLECTION_ID,
              presentation.id,
              {
                ...documentData,
                createdAt: now,
              },
              permissions
            );
            console.log('Presentation created successfully with id:', presentation.id);
            return true;
          }
          console.error('Update error:', error);
          return false;
        }
      }

      const newId = ID.unique();
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        newId,
        {
          ...documentData,
          createdAt: now,
        },
        permissions
      );
      console.log('Presentation created successfully with new id:', newId);
      return true;
    } catch (error) {
      console.error('Failed to save presentation:', error);
      return false;
    }
  }

  static async getPresentation(presentationId: string): Promise<Presentation | null> {
    try {
      console.log('Loading presentation from Appwrite...', presentationId);
      const document = await databases.getDocument(DATABASE_ID, COLLECTION_ID, presentationId);

      return {
        id: document.$id,
        title: document.title,
        slides: typeof document.slides === 'string' 
          ? JSON.parse(document.slides) 
          : document.slides,
      } as Presentation;
    } catch (error: any) {
      if (error?.code === 404) {
        console.log('Presentation not found:', presentationId);
        return null;
      }
      console.error('Failed to load presentation:', error);
      return null;
    }
  }

  static async uploadImage(file: File, userId: string): Promise<string> {
    try {
      console.log('Uploading image to Appwrite...', file.name);
      
      const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        throw new Error(`File extension .${fileExtension} not allowed`);
      }

      const fileId = ID.unique();
      
      await storage.createFile(
        BUCKET_ID,
        fileId,
        file,
        [
          Permission.read(Role.any()), // Публичный доступ для чтения
          Permission.delete(Role.user(userId)), // Только владелец может удалить
        ]
      );

      const fileUrl = storage.getFileView(BUCKET_ID, fileId);
      
      console.log('Image uploaded successfully:', fileId);
      return fileUrl.toString();
    } catch (error) {
      console.error('Image upload failed:', error);
      
      // Fallback на локальный URL
      const localUrl = URL.createObjectURL(file);
      console.log('Using local URL as fallback');
      return localUrl;
    }
  }

  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract file ID from Appwrite Storage URL
      // URL format: https://.../storage/v1/file/view/{bucketId}/{fileId}
      const match = imageUrl.match(/\/storage\/v1\/file\/view\/[^/]+\/([^/?]+)/);
      if (!match || !match[1]) {
        console.warn('Could not extract file ID from URL:', imageUrl);
        return;
      }
      
      const fileId = match[1];
      await storage.deleteFile(BUCKET_ID, fileId);
      console.log('Image deleted:', fileId);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  // Новая функция для получения URL изображения
  static getImageUrl(fileId: string): string {
    return storage.getFileView(BUCKET_ID, fileId).toString();
  }
}