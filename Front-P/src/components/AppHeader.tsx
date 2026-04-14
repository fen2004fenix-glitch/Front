import React, { useState } from 'react';
import { TitleEditor } from './TitleEditor';

interface AppHeaderProps {
  userName: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSave: () => void;
  onLogout: () => void;
  onPlay: () => void;
}

/**
 * Header component for the main application
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  saveStatus,
  onSave,
  onLogout,
  onPlay,
}) => {
  const [isSaveClicked, setIsSaveClicked] = useState(false);

  const handleSaveClick = () => {
    setIsSaveClicked(true);
    onSave();
    
    // Сбросить цвет через 1.5 секунды
    setTimeout(() => {
      setIsSaveClicked(false);
    }, 1500);
  };

  return (
    <header className="app-header">
      <div className="app-header-left">
        <h1 className="app-title">PRESENTATION MAKER</h1>
      </div>
      <div className="app-header-center">
        <div className="app-title-editor">
          <TitleEditor />
        </div>
      </div>
      <div className="app-header-right">
        <div className="user-info">
          <span className="user-name">Welcome, {userName}</span>
          <div className="save-controls">
            <div className="save-buttons" style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              alignItems: 'center'
            }}>
              <button 
                onClick={handleSaveClick} 
                disabled={saveStatus === 'saving'}
                className={`save-button ${saveStatus}`}
                title="Сохранить презентацию"
                style={{
                  background: isSaveClicked || saveStatus === 'saved' 
                    ? 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)' 
                    : saveStatus === 'saving'
                    ? 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
                    : saveStatus === 'error'
                    ? 'linear-gradient(135deg, #dc3545 0%, #bd2130 100%)'
                    : 'linear-gradient(135deg, #007acc 0%, #0056a3 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  minWidth: '90px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  transition: 'background 0.3s ease'
                }}
              >
                {saveStatus === 'saving' ? '⏳ Сохранение...' : '💾 Save'}
              </button>
              <button 
                onClick={onPlay}
                className="play-button"
                title="Запустить презентацию"
                disabled={saveStatus === 'saving'}
                style={{
                  background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  minWidth: '90px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                ▶️ Play
              </button>
            </div>
          </div>
          <button className="logout-button" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
};