// store/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit';
import presentationReducer from './presentationSlice';
import historyReducer from './historySlice';

const rootReducer = combineReducers({
  presentation: presentationReducer,
  history: historyReducer,
});

export const syncedReducer = (state: any, action: any) => {
  // При undo/redo заменяем состояние presentation на состояние из истории
  if (action.type === 'history/undo' || action.type === 'history/redo') {
    const historyState = historyReducer(state.history, action);
    
    return {
      ...rootReducer(state, action),
      presentation: historyState.present || state.presentation,
      history: historyState,
    };
  }
  
  return rootReducer(state, action);
};

export type RootReducerState = ReturnType<typeof rootReducer>;