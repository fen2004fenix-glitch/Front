// store/historyMiddleware.ts (КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ)
import { startBatch, endBatch, captureState, incrementBatchChange } from './historySlice';
import type { Middleware } from '@reduxjs/toolkit';

const TRACKED_ACTIONS = [
  'presentation/setTitle',
  'presentation/setActiveSlideIndex',
  // УБЕРИТЕ отсюда действия выделения/редактирования
  'presentation/addSlide',
  'presentation/removeSlide',
  'presentation/reorderSlides',
  'presentation/updateSlideBackground',
  'presentation/addElement',
  'presentation/removeElement',
  'presentation/updateElementPosition',
  'presentation/updateElementSize',
  'presentation/updateTextContent',
  'presentation/updateTextSize',
  'presentation/updateTextFontFamily',
  'presentation/bringElementToFront',
  'presentation/duplicateSlide',
];

// Действия, которые запускают батчинг
const BATCH_START_ACTIONS = [
  'presentation/updateElementPosition',
  'presentation/updateElementSize',
  'presentation/updateSlideBackground',
];

// Действия, которые не должны сохраняться в историю (полный список)
const IGNORED_ACTIONS = [
  'presentation/setEditingElementId',
  'presentation/setSelectedElementIds',
  'presentation/setSelectedSlideIds',
  // Добавьте ВСЕ действия выделения и навигации
  'history/undo',
  'history/redo',
  'history/captureState',
  'history/startBatch',
  'history/endBatch',
  'history/incrementBatchChange',
  'history/clearHistory',
];

export const historyMiddleware: Middleware = (store) => (next) => (action: any) => {
  // ВАЖНО: игнорируем действия истории и выделения СРАЗУ
  if (IGNORED_ACTIONS.includes(action.type) || action.type.startsWith('history/')) {
    return next(action);
  }
  
  const currentState = store.getState();
  
  // Начинаем батч для соответствующих действий
  if (BATCH_START_ACTIONS.includes(action.type) && !currentState.history.isBatching) {
    store.dispatch(startBatch());
  }
  
  // Выполняем действие
  const result = next(action);
  
  const newState = store.getState();
  
  // Сохраняем в историю только если:
  // 1. Действие отслеживаемое
  // 2. Состояние презентации изменилось
  if (TRACKED_ACTIONS.includes(action.type)) {
    const currentPres = JSON.stringify(currentState.presentation);
    const newPres = JSON.stringify(newState.presentation);
    
    if (currentPres !== newPres) {
      // Для батчевых действий увеличиваем счетчик изменений
      if (BATCH_START_ACTIONS.includes(action.type) && newState.history.isBatching) {
        store.dispatch(incrementBatchChange());
      }
      
      // Сохраняем состояние в историю
      store.dispatch(captureState({ 
        state: newState.presentation 
      }));
    }
  }
  
  // Завершаем батч с задержкой
  if (BATCH_START_ACTIONS.includes(action.type)) {
    // Сбрасываем предыдущий таймер
    const existingTimeout = (window as any).__batchTimeout;
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Устанавливаем новый таймер
    const timeout = setTimeout(() => {
      const state = store.getState();
      if (state.history.isBatching) {
        store.dispatch(endBatch());
      }
    }, 300); // Увеличьте задержку для лучшего батчинга
    
    (window as any).__batchTimeout = timeout;
  }
  
  return result;
};