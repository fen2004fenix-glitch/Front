import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { App } from './App';
import { AuthProvider } from './providers/AuthProvider'; // Добавьте эту строку
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthProvider> {/* Оберните App в AuthProvider */}
        <App />
      </AuthProvider>
    </Provider>
  </React.StrictMode>
);
