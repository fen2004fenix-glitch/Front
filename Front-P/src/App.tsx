import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SlideList } from './components/SlideList';
import Workspace from './components/Workspace';
import { Toolbar } from './components/Toolbar';
import { HistoryControls } from './components/HistoryControls';
import { AuthContainer } from './components/AuthContainer';
import { AppHeader } from './components/AppHeader';
import { Player } from './components/Player';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { captureState } from './store/historySlice';
import { useAuth } from './providers/AuthProvider';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePresentationSave } from './hooks/usePresentationSave';
import { useAutoSave } from './hooks/useAutoSave';

/**
 * Main Editor Component
 */
const Editor: React.FC = () => {
  const dispatch = useAppDispatch();
  const presentationState = useAppSelector(state => state.presentation);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const initialCapturedRef = useRef(false);
  const isSavingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const { slides, activeSlideIndex } = presentationState;
  const slide = useMemo(() => slides?.[activeSlideIndex], [slides, activeSlideIndex]);

  // Custom hooks
  useKeyboardShortcuts();
  
  const {
    buildPresentationFromState,
    loadUserPresentation,
    savePresentation: savePresentationInternal,
    previousPresentationRef,
  } = usePresentationSave(user?.$id);

  // Auto-save hook
  const currentPresentation = useMemo(() => {
    if (!user) return null;
    return buildPresentationFromState();
  }, [user, buildPresentationFromState]);

  useAutoSave({
    enabled: !!user && initialCapturedRef.current,
    presentation: currentPresentation,
    previousPresentation: previousPresentationRef.current,
    onSave: async (presentation) => {
      if (isSavingRef.current) return false;
      isSavingRef.current = true;
      try {
        const success = await savePresentationInternal(presentation);
        if (success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
        }
        return success;
      } catch (error) {
        setSaveStatus('error');
        return false;
      } finally {
        isSavingRef.current = false;
      }
    },
  });

  // Загружаем презентацию только при первом монтировании или при смене пользователя
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      loadUserPresentation().then((loaded) => {
        if (loaded) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
        hasLoadedRef.current = true;
      });
    }
  }, [user, loadUserPresentation]);

  // Сбрасываем флаг загрузки при смене пользователя
  useEffect(() => {
    if (!user) {
      hasLoadedRef.current = false;
    }
  }, [user]);

  // Capture initial state for history
  useEffect(() => {
    if (!initialCapturedRef.current && presentationState.slides.length > 0) {
      dispatch(captureState({ state: presentationState }));
      initialCapturedRef.current = true;
    }
  }, [dispatch, presentationState]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    if (!user || isSavingRef.current || !currentPresentation) return;
    
    isSavingRef.current = true;
    setSaveStatus('saving');
    
    try {
      const success = await savePresentationInternal(currentPresentation);
      if (success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Manual save failed:', error);
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [user, currentPresentation, savePresentationInternal]);

  // Navigate to player - с принудительным сохранением
  const handleNavigateToPlayer = useCallback(async () => {
    if (!currentPresentation || !user) {
      // Если нет пользователя или презентации, все равно переходим
      navigate('/player', { 
        state: { startFromSlide: activeSlideIndex }
      });
      return;
    }
    
    // Сохраняем перед переходом в Player
    isSavingRef.current = true;
    setSaveStatus('saving');
    
    try {
      const success = await savePresentationInternal(currentPresentation);
      if (success) {
        setSaveStatus('saved');
        // Сохраняем ссылку на только что сохраненную презентацию
        previousPresentationRef.current = currentPresentation;
        // Переходим в Player
        navigate('/player', { 
          state: { startFromSlide: activeSlideIndex }
        });
      } else {
        setSaveStatus('error');
        alert('Не удалось сохранить презентацию перед переходом в режим воспроизведения');
      }
    } catch (error) {
      console.error('Save before play failed:', error);
      setSaveStatus('error');
      alert('Ошибка при сохранении презентации');
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
        setSaveStatus('idle');
      }, 1000);
    }
  }, [currentPresentation, user, savePresentationInternal, previousPresentationRef, navigate, activeSlideIndex]);

  return (
    <div className="app-root">
      <AppHeader
        userName={user?.name || 'User'}
        saveStatus={saveStatus}
        onSave={handleManualSave}
        onLogout={logout}
        onPlay={handleNavigateToPlayer}
      />

      <main className="app-main">
        <aside className="sidebar">
          <section className="slides-inline">
            <h3 className="slides-title">Slides</h3>
            <SlideList />
          </section>
        </aside>

        <section className="content">
          <div className="top-row">
            <Toolbar />
            <HistoryControls />
          </div>

          <div className="workspace-area">
            <section className="workspace-wrapper">
              <div className="workspace-clip">
                <Workspace />
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

/**
 * Main App Component with Routing
 */
export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthContainer />} />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player"
          element={
            <ProtectedRoute>
              <Player />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route path="*" element={<Navigate to="/editor" replace />} />
      </Routes>
    </Router>
  );
};

export default App;