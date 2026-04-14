// store/historySlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PresentationState } from './presentationSlice';

export interface HistoryState {
  past: PresentationState[];
  present: PresentationState | null;
  future: PresentationState[];
  lastAction: string | null;
  isBatching: boolean;
  batchStartState: PresentationState | null;
  batchChangeCount: number;
}

const initialState: HistoryState = {
  past: [],
  present: null,
  future: [],
  lastAction: null,
  isBatching: false,
  batchStartState: null,
  batchChangeCount: 0,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    startBatch: (state) => {
      if (!state.isBatching && state.present) {
        state.isBatching = true;
        state.batchStartState = state.present;
        state.batchChangeCount = 0;
      }
    },
    
    endBatch: (state) => {
      if (state.isBatching && state.present && state.batchStartState) {
        // Сохраняем только если были реальные изменения
        if (state.batchChangeCount > 0) {
          // Сравниваем состояния
          const startStateJson = JSON.stringify(state.batchStartState);
          const currentStateJson = JSON.stringify(state.present);
          
          if (startStateJson !== currentStateJson) {
            state.past.push(state.batchStartState);
            if (state.past.length > 100) {
              state.past.shift();
            }
            state.future = [];
          }
        }
        state.isBatching = false;
        state.batchStartState = null;
        state.batchChangeCount = 0;
      }
    },
    
    incrementBatchChange: (state) => {
      if (state.isBatching) {
        state.batchChangeCount += 1;
      }
    },
    
    captureState: (state, action: PayloadAction<{ state: PresentationState }>) => {
      // Если в режиме батчинга, только обновляем present и увеличиваем счетчик
      if (state.isBatching) {
        state.present = action.payload.state;
        state.batchChangeCount += 1;
        return;
      }
      
      // Не сохраняем состояние, если оно идентично текущему
      const currentStateJson = state.present ? JSON.stringify(state.present) : null;
      const newStateJson = JSON.stringify(action.payload.state);
      
      if (currentStateJson === newStateJson) return;
      
      if (state.present) {
        state.past.push(state.present);
        if (state.past.length > 100) {
          state.past.shift();
        }
      }
      
      state.present = action.payload.state;
      state.future = [];
    },
    
    undo: (state) => {
      if (state.past.length === 0 || !state.present) return;
      
      const previous = state.past[state.past.length - 1]!; // Добавлен non-null assertion
      const newPast = state.past.slice(0, state.past.length - 1);
      
      state.future = [state.present, ...state.future];
      
      state.past = newPast;
      state.present = previous;
      state.lastAction = 'undo';
    },
    
    redo: (state) => {
      if (state.future.length === 0 || !state.present) return;
      
      const next = state.future[0]!; // Добавлен non-null assertion
      const newFuture = state.future.slice(1);
      
      state.past = [...state.past, state.present];
      
      state.present = next;
      state.future = newFuture;
      state.lastAction = 'redo';
    },
    
    clearHistory: (state) => {
      state.past = [];
      state.future = [];
      state.lastAction = null;
      state.isBatching = false;
      state.batchStartState = null;
      state.batchChangeCount = 0;
    },
  },
});

export const { 
  startBatch, 
  endBatch, 
  incrementBatchChange,
  captureState, 
  undo, 
  redo, 
  clearHistory 
} = historySlice.actions;
export default historySlice.reducer;