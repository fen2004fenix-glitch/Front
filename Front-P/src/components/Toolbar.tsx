import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
  addSlide,
  removeSlide,
  addElement,
  removeElement,
  updateElementPosition,
  updateSlideBackground,
  updateTextSizeForMultiple,
  updateTextFontFamilyForMultiple,
} from '../store/presentationSlice';
import { startBatch, endBatch } from '../store/historySlice';
import { PresentationService } from '../services/presentationService';
import { useAuth } from '../providers/AuthProvider';

const FONT_FAMILIES = [
  { label: 'Default', value: 'inherit' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times', value: "'Times New Roman', Times, serif" },
  { label: 'Courier', value: "'Courier New', Courier, monospace" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

export const Toolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const {
    slides,
    activeSlideIndex,
    selectedElementIds,
  } = useAppSelector(state => state.presentation);

  const slide = slides[activeSlideIndex];
  const currentBackground = slide?.background || '#ffffff';
  const elements = slide?.elements || [];

  const [fontSizeInput, setFontSizeInput] = useState<string>('16');
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0]?.value ?? '');
  
  // Состояния для раскрывающихся меню
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  
  // Рефы для отслеживания кликов вне меню
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastBackgroundRef = React.useRef<string>(currentBackground);

  const canRemoveSlide = slides.length > 0;
  const canAddElement = !!slide;
  const canRemoveAnySelected = !!slide && selectedElementIds.length > 0;
  const hasSelectedTextElements = selectedElementIds.length > 0 && 
    selectedElementIds.some((id: any) => {
      const el = slide?.elements.find((e: any) => e.id === id);
      return el?.type === 'text';
    });

  // Закрытие меню при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(event.target as Node)) {
        setShapeMenuOpen(false);
      }
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target as Node)) {
        setImageMenuOpen(false);
      }
      if (alignMenuRef.current && !alignMenuRef.current.contains(event.target as Node)) {
        setAlignMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Обновляем реф при изменении фона
  useEffect(() => {
    lastBackgroundRef.current = currentBackground;
  }, [currentBackground]);

  // Функции для управления слайдами
  const handleAddSlide = () => {
    const newSlide = {
      id: `s_${Date.now()}`,
      background: '#ffffff',
      elements: [],
    };
    dispatch(addSlide({ slide: newSlide, index: activeSlideIndex + 1 }));
  };

  const handleRemoveSlide = () => {
    if (slide) {
      dispatch(removeSlide(slide.id));
    }
  };

  const handleDuplicateSlide = () => {
    if (slide) {
      const duplicatedSlide = {
        ...slide,
        id: `s_${Date.now()}`,
        elements: slide.elements.map((el: any) => ({
          ...el,
          id: `${el.id}_copy_${Date.now()}`,
        })),
      };
      dispatch(addSlide({ slide: duplicatedSlide, index: activeSlideIndex + 1 }));
    }
  };

  // Функции для добавления элементов
  const handleAddTextElement = () => {
    if (!slide) return;
    const newElement = {
      id: `t_${Date.now()}`,
      type: 'text' as const,
      content: 'Новый текст',
      fontSize: 16,
      fontFamily: 'inherit',
      position: { x: 20, y: 20 },
      size: { width: 160, height: 40 },
    };
    dispatch(addElement({ slideId: slide.id, element: newElement }));
  };

  const handleAddShapeElement = (shape: 'rectangle' | 'circle' | 'triangle') => {
    if (!slide) return;
    setShapeMenuOpen(false); // Закрываем меню после выбора
    
    const newElement = {
      id: `shape_${Date.now()}`,
      type: 'shape' as const,
      shape,
      color: '#007acc',
      borderColor: '#005fa3',
      borderWidth: 2,
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
    };
    dispatch(addElement({ slideId: slide.id, element: newElement }));
  };

  const handleRemoveSelectedElements = () => {
    if (!slide) return;
    const idsToRemove = [...selectedElementIds];
    idsToRemove.forEach((elementId) => {
      const el = slide.elements.find((e: { id: any; }) => e.id === elementId);
      const src = (el as any)?.src;
      if (typeof src === 'string' && src.startsWith('blob:')) {
        try { URL.revokeObjectURL(src); } catch {}
      }
      dispatch(removeElement({ slideId: slide.id, elementId }));
    });
  };

  // Функции для выравнивания
  const handleAlignElements = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!slide || selectedElementIds.length < 2) return;
    setAlignMenuOpen(false); // Закрываем меню после выбора
    
    const selectedElements = slide.elements.filter((el: any) => 
      selectedElementIds.includes(el.id)
    );
    
    if (selectedElements.length === 0) return;
    
    // Для горизонтального выравнивания
    if (['left', 'center', 'right'].includes(alignment)) {
      let referenceX = selectedElements[0].position.x;
      
      if (alignment === 'center') {
        const minX = Math.min(...selectedElements.map((el: any) => el.position.x));
        const maxX = Math.max(...selectedElements.map((el: any) => el.position.x));
        referenceX = minX + (maxX - minX) / 2;
      } else if (alignment === 'right') {
        referenceX = Math.max(...selectedElements.map((el: any) => el.position.x));
      }
      
      selectedElements.forEach((element: any) => {
        dispatch(updateElementPosition({
          slideId: slide.id,
          elementId: element.id,
          position: { 
            x: referenceX, 
            y: element.position.y 
          }
        }));
      });
    }
    
    // Для вертикального выравнивания
    if (['top', 'middle', 'bottom'].includes(alignment)) {
      let referenceY = selectedElements[0].position.y;
      
      if (alignment === 'middle') {
        const minY = Math.min(...selectedElements.map((el: any) => el.position.y));
        const maxY = Math.max(...selectedElements.map((el: any) => el.position.y));
        referenceY = minY + (maxY - minY) / 2;
      } else if (alignment === 'bottom') {
        referenceY = Math.max(...selectedElements.map((el: any) => el.position.y));
      }
      
      selectedElements.forEach((element: any) => {
        dispatch(updateElementPosition({
          slideId: slide.id,
          elementId: element.id,
          position: { 
            x: element.position.x, 
            y: referenceY 
          }
        }));
      });
    }
  };

  // Функции для настройки внешнего вида
  const handleChangeBackground = (bg: string) => {
    if (slide && bg !== lastBackgroundRef.current) {
      lastBackgroundRef.current = bg;
      dispatch(updateSlideBackground({ slideId: slide.id, background: bg }));
    }
  };

  const handleChangeFontSize = (size: number) => {
    if (!slide || !hasSelectedTextElements) return;
    
    const textElementIds = selectedElementIds.filter((id: any) => {
      const el = slide.elements.find((e: any) => e.id === id);
      return el && el.type === 'text';
    });
    
    if (textElementIds.length > 0) {
      dispatch(startBatch());
      dispatch(updateTextSizeForMultiple({ 
        slideId: slide.id, 
        elementIds: textElementIds, 
        fontSize: size 
      }));
      dispatch(endBatch());
    }
  };

  const handleChangeFontFamily = (family: string) => {
    if (!slide || !hasSelectedTextElements) return;
    
    const textElementIds = selectedElementIds.filter((id: any) => {
      const el = slide.elements.find((e: any) => e.id === id);
      return el && el.type === 'text';
    });
    
    if (textElementIds.length > 0) {
      dispatch(startBatch());
      dispatch(updateTextFontFamilyForMultiple({ 
        slideId: slide.id, 
        elementIds: textElementIds, 
        fontFamily: family 
      }));
      dispatch(endBatch());
    }
  };

  // Обработчики для элементов управления
  const applyFontSize = (delta: number) => {
    const current = parseInt(fontSizeInput || '16', 10);
    const next = Math.max(8, Math.min(200, current + delta));
    setFontSizeInput(String(next));
    handleChangeFontSize(next);
  };

  const applyFontFamily = (value: string) => {
    setFontFamily(value);
    handleChangeFontFamily(value);
  };

  const handleFontSizeInputChange = (value: string) => {
    setFontSizeInput(value);
    const size = parseInt(value, 10);
    if (!isNaN(size) && size >= 8 && size <= 200) {
      handleChangeFontSize(size);
    }
  };

  // Обработчики для изображений
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !slide) return;

    try {
      const imageUrl = await PresentationService.uploadImage(file, user.$id);
      const newElement = {
        id: `img_${Date.now()}`,
        type: 'image' as const,
        src: imageUrl,
        position: { x: 50, y: 50 },
        size: { width: 200, height: 150 },
      };
      dispatch(addElement({ slideId: slide.id, element: newElement }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Не удалось загрузить изображение. Попробуйте другой файл.');
    }
  };

  const handleAddImageByUrl = () => {
    setImageMenuOpen(false); // Закрываем меню перед запросом URL
    setTimeout(() => {
      const url = prompt('Введите URL изображения:');
      if (url && slide && user) {
        // Здесь должна быть логика добавления по URL
        console.log('Add image by URL:', url);
        // Временная реализация - добавление напрямую
        const newElement = {
          id: `img_${Date.now()}`,
          type: 'image' as const,
          src: url,
          position: { x: 50, y: 50 },
          size: { width: 200, height: 150 },
        };
        dispatch(addElement({ slideId: slide.id, element: newElement }));
      }
    }, 100);
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Инструменты презентации">
      {/* Левая часть: Управление слайдами */}
      <div className="toolbar-section">
        <div className="toolbar-group">
          <h3 className="toolbar-group-title">Слайды</h3>
          <div className="toolbar-button-group">
            <button
              type="button"
              onClick={handleAddSlide}
              className="toolbar-button primary"
              title="Добавить новый слайд (Ctrl+N)"
            >
              <span className="button-icon">＋</span>
              <span className="button-label">Добавить</span>
            </button>
            
            <button
              type="button"
              onClick={handleDuplicateSlide}
              disabled={!slide}
              className="toolbar-button"
              title="Дублировать текущий слайд"
            >
              <span className="button-icon">⎘</span>
              <span className="button-label">Дублировать</span>
            </button>
            
            <button
              type="button"
              onClick={handleRemoveSlide}
              disabled={!canRemoveSlide}
              className="toolbar-button danger"
              title="Удалить текущий слайд (Del)"
            >
              <span className="button-icon">✕</span>
              <span className="button-label">Удалить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Центральная часть: Элементы */}
      <div className="toolbar-section">
        <div className="toolbar-group">
          <h3 className="toolbar-group-title">Элементы</h3>
          <div className="toolbar-button-group">
            {/* Кнопка Текст */}
            <button
              type="button"
              onClick={handleAddTextElement}
              disabled={!slide}
              className="toolbar-button"
              title="Добавить текстовое поле (T)"
            >
              <span className="button-icon"></span>
              <span className="button-label">Текст</span>
            </button>
            
            {/* Кнопка Фигура с раскрывающимся меню */}
            <div className="dropdown-container" ref={shapeMenuRef}>
              <button
                type="button"
                onClick={() => setShapeMenuOpen(!shapeMenuOpen)}
                disabled={!slide}
                className={`toolbar-button ${shapeMenuOpen ? 'active' : ''}`}
                title="Добавить фигуру"
              >
                <span className="button-icon"></span>
                <span className="button-label">Фигура</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {shapeMenuOpen && (
                <div className="dropdown-menu">
                  <button
                    type="button"
                    onClick={() => handleAddShapeElement('rectangle')}
                    className="dropdown-item"
                  >
                    <span className="dropdown-icon">□</span>
                    Прямоугольник
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddShapeElement('circle')}
                    className="dropdown-item"
                  >
                    <span className="dropdown-icon">○</span>
                    Круг
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddShapeElement('triangle')}
                    className="dropdown-item"
                  >
                    <span className="dropdown-icon">△</span>
                    Треугольник
                  </button>
                </div>
              )}
            </div>
            
            {/* Кнопка Изображение с раскрывающимся меню */}
            <div className="dropdown-container" ref={imageMenuRef}>
              <button
                type="button"
                onClick={() => setImageMenuOpen(!imageMenuOpen)}
                disabled={!user || !slide}
                className={`toolbar-button ${imageMenuOpen ? 'active' : ''}`}
                title="Добавить изображение"
              >
                <span className="button-icon"></span>
                <span className="button-label">Изображение</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {imageMenuOpen && (
                <div className="dropdown-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setImageMenuOpen(false);
                      setTimeout(() => fileInputRef.current?.click(), 100);
                    }}
                    className="dropdown-item"
                  >
                    <span className="dropdown-icon">📁</span>
                    Загрузить с компьютера
                  </button>
                  <button
                    type="button"
                    onClick={handleAddImageByUrl}
                    className="dropdown-item"
                  >
                    <span className="dropdown-icon">🔗</span>
                    Добавить по ссылке
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input-hidden"
            />
          </div>
        </div>
      </div>

      {/* Правая часть: Настройки */}
      <div className="toolbar-section">
        <div className="toolbar-group">
          <h3 className="toolbar-group-title">Настройки</h3>
          
          <div className="toolbar-controls-grid">
            {/* Цвет фона */}
            <div className="control-item">
              <label className="control-label">Фон слайда</label>
              <div className="control-input-group">
                <input
                  type="color"
                  value={currentBackground}
                  onChange={(e) => handleChangeBackground(e.target.value)}
                  className="color-input"
                  title="Выберите цвет фона"
                />
                <input
                  type="text"
                  value={currentBackground}
                  onChange={(e) => handleChangeBackground(e.target.value)}
                  className="color-text-input"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Выравнивание с раскрывающимся меню */}
            <div className="control-item">
              <label className="control-label">Выравнивание</label>
              <div className="dropdown-container" ref={alignMenuRef}>
                <button
                  type="button"
                  onClick={() => setAlignMenuOpen(!alignMenuOpen)}
                  disabled={selectedElementIds.length < 2}
                  className={`toolbar-button ${alignMenuOpen ? 'active' : ''}`}
                  title="Выровнять элементы"
                >
                  <span className="button-icon">⎸⎹</span>
                  <span className="button-label">Выровнять</span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                {alignMenuOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-subtitle">Горизонтально</div>
                    <button
                      type="button"
                      onClick={() => handleAlignElements('left')}
                      className="dropdown-item"
                    >
                      ⎸ По левому краю
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlignElements('center')}
                      className="dropdown-item"
                    >
                      ⎹ По центру
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlignElements('right')}
                      className="dropdown-item"
                    >
                      ⎸ По правому краю
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-subtitle">Вертикально</div>
                    <button
                      type="button"
                      onClick={() => handleAlignElements('top')}
                      className="dropdown-item"
                    >
                      ⇑ По верхнему краю
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlignElements('middle')}
                      className="dropdown-item"
                    >
                      ⇕ По центру
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlignElements('bottom')}
                      className="dropdown-item"
                    >
                      ⇓ По нижнему краю
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Настройки шрифта */}
            <div className="control-item">
              <label className="control-label">Шрифт</label>
              <div className="font-controls">
                <div className="font-size-controls">
                  <button
                    type="button"
                    onClick={() => applyFontSize(-2)}
                    disabled={!hasSelectedTextElements}
                    className="font-size-btn"
                    title="Уменьшить размер"
                  >
                    A-
                  </button>
                  <input
                    type="number"
                    min={8}
                    max={200}
                    value={fontSizeInput}
                    onChange={(e) => handleFontSizeInputChange(e.target.value)}
                    className="font-size-input"
                    disabled={!hasSelectedTextElements}
                    aria-label="Размер шрифта"
                  />
                  <button
                    type="button"
                    onClick={() => applyFontSize(2)}
                    disabled={!hasSelectedTextElements}
                    className="font-size-btn"
                    title="Увеличить размер"
                  >
                    A+
                  </button>
                </div>
                
                <select
                  value={fontFamily}
                  onChange={(e) => applyFontFamily(e.target.value)}
                  disabled={!hasSelectedTextElements}
                  className="font-family-select"
                  title="Выберите шрифт"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Действия с элементами */}
            <div className="control-item">
              <label className="control-label">Действия</label>
              <div className="button-group">
                <button
                  type="button"
                  onClick={handleRemoveSelectedElements}
                  disabled={!canRemoveAnySelected}
                  className="danger-button"
                  title="Удалить выбранные элементы"
                >
                  <span className="button-icon">🗑️</span>
                  <span className="button-label">Удалить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;