import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import './Player.css';

// Типы для элементов слайдов
interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface BaseElement {
  id: string;
  type: 'text' | 'image';
  position: Position;
  size: Size;
}

interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  color?: string;
}

interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
}

type Element = TextElement | ImageElement;

interface Slide {
  id: string;
  background: string;
  elements?: Element[];
}

/**
 * Component for presentation playback (slideshow mode)
 */
export const Player: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slides } = useAppSelector(state => state.presentation) as { slides: Slide[] };
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  const currentSlide = slides[currentSlideIndex];
  const totalSlides = slides.length;

  // Следим за изменениями полноэкранного режима
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          goToPreviousSlide();
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          goToNextSlide();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else {
            navigate('/editor');
          }
          break;
        case 'F5':
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, totalSlides, isFullscreen]);

  // Handle auto-play
  useEffect(() => {
    if (isPlaying && timerId === null) {
      const id = setInterval(() => {
        goToNextSlide();
      }, 3000);
      setTimerId(id);
    } else if (!isPlaying && timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isPlaying, timerId]);

  // Initialize from location state
  useEffect(() => {
    if (location.state?.startFromSlide) {
      setCurrentSlideIndex(Math.min(location.state.startFromSlide, totalSlides - 1));
    }
  }, [location.state, totalSlides]);

  const goToSlide = (index: number) => {
    const newIndex = Math.max(0, Math.min(index, totalSlides - 1));
    setCurrentSlideIndex(newIndex);
  };

  const goToPreviousSlide = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => {
      if (prev >= totalSlides - 1) {
        if (isPlaying) {
          setIsPlaying(false);
        }
        return totalSlides - 1;
      }
      return prev + 1;
    });
  }, [totalSlides, isPlaying]);

  const toggleFullscreen = () => {
    const element = document.documentElement;
    
    if (!document.fullscreenElement) {
      // Вход в полноэкранный режим
      const requestFullscreen = 
        element.requestFullscreen ||
        (element as Element & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen ||
        (element as Element & { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen ||
        (element as Element & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(element);
      }
      setIsFullscreen(true);
    } else {
      // Выход из полноэкранного режима
      const exitFullscreen = 
        document.exitFullscreen ||
        (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen ||
        (document as Document & { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen ||
        (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen;
      
      if (exitFullscreen) {
        exitFullscreen.call(document);
      }
      setIsFullscreen(false);
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      const exitFullscreen = 
        document.exitFullscreen ||
        (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen ||
        (document as Document & { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen ||
        (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen;
      
      if (exitFullscreen) {
        exitFullscreen.call(document);
      }
      setIsFullscreen(false);
    }
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleBackToEditor = () => {
    navigate('/editor');
  };

  if (slides.length === 0) {
    return (
      <div className="player player-empty">
        <h2>Нет слайдов для отображения</h2>
        <button onClick={handleBackToEditor} className="player-back-btn">
          Вернуться в редактор
        </button>
      </div>
    );
  }

  return (
    <div className={`player ${isFullscreen ? 'player-fullscreen' : ''}`}>
      {/* Header controls */}
      <div className="player-controls">
        <button
          onClick={handleBackToEditor}
          className="player-control-btn"
          title="Вернуться в редактор (Esc)"
        >
          ← Редактор
        </button>
        
        <div className="player-slide-info">
          Слайд {currentSlideIndex + 1} из {totalSlides}
        </div>
        
        <div className="player-controls-right">
          <button
            onClick={() => goToSlide(0)}
            disabled={currentSlideIndex === 0}
            className="player-control-btn"
            title="Первый слайд (Home)"
          >
            ↞
          </button>
          
          <button
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 0}
            className="player-control-btn"
            title="Предыдущий слайд (←)"
          >
            ←
          </button>
          
          <button
            onClick={togglePlay}
            className="player-control-btn player-play-btn"
            title={isPlaying ? 'Пауза' : 'Воспроизвести (Space)'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          
          <button
            onClick={goToNextSlide}
            disabled={currentSlideIndex === totalSlides - 1}
            className="player-control-btn"
            title="Следующий слайд (→)"
          >
            →
          </button>
          
          <button
            onClick={() => goToSlide(totalSlides - 1)}
            disabled={currentSlideIndex === totalSlides - 1}
            className="player-control-btn"
            title="Последний слайд (End)"
          >
            ↠
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="player-control-btn"
            title="Полный экран (F11)"
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      </div>

      {/* Slide display */}
      <div className="player-slide-container">
        <div
          className="player-slide"
          style={{
            background: currentSlide.background,
          }}
        >
          {currentSlide.elements?.map((element: Element) => (
            <div
              key={element.id}
              className="player-element"
              style={{
                position: 'absolute',
                left: `${element.position.x}px`,
                top: `${element.position.y}px`,
                width: `${element.size.width}px`,
                height: `${element.size.height}px`,
                ...(element.type === 'text' && {
                  fontSize: `${(element as TextElement).fontSize}px`,
                  fontFamily: (element as TextElement).fontFamily,
                  color: (element as TextElement).color || '#000000',
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                }),
              }}
            >
              {element.type === 'text' ? (
                <div className="player-text-content" style={{ color: (element as TextElement).color || '#000000' }}>
                  {(element as TextElement).content}
                </div>
              ) : element.type === 'image' ? (
                <img
                  src={(element as ImageElement).src}
                  alt={(element as ImageElement).alt || ''}
                  className="player-image"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Slide thumbnails */}
      <div className="player-thumbnails">
        {slides.map((slide: Slide, index: number) => (
          <button
            key={slide.id}
            onClick={() => goToSlide(index)}
            className={`player-thumb ${index === currentSlideIndex ? 'active' : ''}`}
            style={{ background: slide.background }}
            title={`Слайд ${index + 1}`}
          >
            <span className="player-thumb-number">{index + 1}</span>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="player-progress">
        <div
          className="player-progress-bar"
          style={{
            width: `${((currentSlideIndex + 1) / totalSlides) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default Player;