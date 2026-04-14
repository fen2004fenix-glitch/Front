// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { syncedReducer } from './rootReducer';
import { historyMiddleware } from './historyMiddleware';

export const store = configureStore({
  reducer: syncedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['history/captureState'],
        ignoredPaths: ['history.present', 'history.past', 'history.future'],
      },
    }).concat(historyMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;