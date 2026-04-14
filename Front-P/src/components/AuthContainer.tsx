import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

/**
 * Container component for authentication (login/register)
 */
export const AuthContainer: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { user } = useAuth();
  const location = useLocation();

  // If user is already authenticated, redirect to editor
  if (user) {
    const from = (location.state as any)?.from?.pathname || '/editor';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>PRESENTATION MAKER</h1>
      </div>
      <div className="auth-content">
        <div className="auth-tabs">
          <button 
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => setAuthMode('login')}
          >
            Вход
          </button>
          <button 
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => setAuthMode('register')}
          >
            Регистрация
          </button>
        </div>
        {authMode === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
};