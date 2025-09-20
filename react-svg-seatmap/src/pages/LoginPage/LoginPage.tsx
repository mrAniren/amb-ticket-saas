import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './LoginPage.scss';

export const LoginPage: React.FC = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(credentials.username, credentials.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="login-page">
      <div className="login-page__container">
        <div className="login-page__header">
          <img src="/logo.png" alt="Логотип" className="login-page__logo" />
          <h1>Вход в систему</h1>
          <p>Система управления залами</p>
        </div>

        <form onSubmit={handleSubmit} className="login-page__form">
          {error && (
            <div className="login-page__error">
              {error}
            </div>
          )}

          <div className="login-page__field">
            <label htmlFor="username">Логин</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="Введите логин"
              required
              disabled={isLoading}
            />
          </div>

          <div className="login-page__field">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Введите пароль"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className="login-page__submit"
            disabled={isLoading}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>


        </form>
      </div>
    </div>
  );
};