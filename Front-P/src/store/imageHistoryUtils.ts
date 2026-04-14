// imageHistoryUtils.ts
interface ImageHistoryEntry {
  imageUrl: string | null;
  timestamp: number;
  slideId: string;
}

class ImageHistoryManager {
  private history: ImageHistoryEntry[] = [];
  private currentIndex = -1;

  addEntry(slideId: string, imageUrl: string | null): void {
    // Удаляем все записи после текущего индекса
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    const entry: ImageHistoryEntry = {
      imageUrl,
      timestamp: Date.now(),
      slideId,
    };
    
    this.history.push(entry);
    this.currentIndex = this.history.length - 1;
  }

  undo(slideId: string): string | null {
    if (this.canUndo()) {
      this.currentIndex--;
      
      // Ищем предыдущую запись для этого слайда
      for (let i = this.currentIndex; i >= 0; i--) {
        const entry = this.history[i];
        if (entry && entry.slideId === slideId) {
          return entry.imageUrl;
        }
      }
    }
    return null; // Нет предыдущих записей для этого слайда
  }

  redo(slideId: string): string | null {
    if (this.canRedo()) {
      this.currentIndex++;
      
      // Ищем следующую запись для этого слайда
      for (let i = this.currentIndex; i < this.history.length; i++) {
        const entry = this.history[i];
        if (entry && entry.slideId === slideId) {
          return entry.imageUrl;
        }
      }
    }
    return null;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getCurrent(slideId: string): string | null {
    for (let i = this.currentIndex; i >= 0; i--) {
      const entry = this.history[i];
      if (entry && entry.slideId === slideId) {
        return entry.imageUrl;
      }
    }
    return null;
  }
}

export const imageHistoryManager = new ImageHistoryManager();