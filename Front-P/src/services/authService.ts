// src/services/authService.ts
import { account, ID } from './appwrite';

export interface User {
  $id: string;
  email: string;
  name?: string;
}

export class AuthService {
  // Удаляет текущую сессию, если она есть. Игнорирует ошибки.
  async ensureNoActiveSession(): Promise<void> {
    try {
      await account.deleteSession('current');
      // console.debug('ensureNoActiveSession: deleted current session');
    } catch (e) {
      // Игнорируем ошибки удаления (сессии могло не быть)
      // console.debug('ensureNoActiveSession:', e);
    }
  }

  // Возвращает текущего пользователя, полагаясь на account.get()
  async getCurrentUser(silent: boolean = true): Promise<User | null> {
    try {
      const response = await account.get();
      return response as User;
    } catch (error: any) {
      const isUnauthorized =
        error?.code === 401 ||
        String(error?.message || '').toLowerCase().includes('unauthorized') ||
        String(error?.message || '').includes('401');

      if (!silent && !isUnauthorized) {
        console.warn('Auth check warning:', error);
      }
      return null;
    }
  }

  // Безопасный login с повторной попыткой при конфликте сессий
  async login(email: string, password: string): Promise<User> {
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      return user as User;
    } catch (error: any) {
      const msg = String(error?.message || error || '').toLowerCase();
      const isSessionActiveError =
        msg.includes('creation of a session is prohibited') ||
        msg.includes('session is active') ||
        msg.includes('already active');

      if (isSessionActiveError) {
        try {
          await this.ensureNoActiveSession();
          await account.createEmailPasswordSession(email, password);
          const user = await account.get();
          return user as User;
        } catch (retryError: any) {
          throw new Error(retryError?.message || 'Ошибка входа после очистки сессии');
        }
      }

      let errorMessage = 'Ошибка входа';
      if (msg.includes('invalid credentials') || msg.includes('invalid')) errorMessage = 'Неверный email или пароль';
      else if (msg.includes('user_not_found')) errorMessage = 'Пользователь не найден';
      else errorMessage = error?.message || errorMessage;

      throw new Error(errorMessage);
    }
  }

  // Регистрация с попыткой автоматического логина
  async register(email: string, password: string, name: string): Promise<User> {
    try {
      // Попробуем удалить возможную активную сессию перед созданием аккаунта
      await this.ensureNoActiveSession();

      await account.create(ID.unique(), email, password, name);

      try {
        await account.createEmailPasswordSession(email, password);
        const user = await account.get();
        return user as User;
      } catch (loginError: any) {
        const msg = String(loginError?.message || loginError || '').toLowerCase();
        const isSessionActiveError =
          msg.includes('creation of a session is prohibited') || msg.includes('session is active');

        if (isSessionActiveError) {
          try {
            await this.ensureNoActiveSession();
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();
            return user as User;
          } catch {
            throw new Error('Регистрация успешна. Теперь вы можете войти.');
          }
        }

        throw new Error('Регистрация успешна. Теперь вы можете войти.');
      }
    } catch (error: any) {
      const msg = String(error?.message || error || '').toLowerCase();
      let errorMessage = 'Ошибка регистрации';
      if (msg.includes('409') || msg.includes('already exists')) errorMessage = 'Пользователь с таким email уже существует';
      else if (msg.includes('weak_password')) errorMessage = 'Пароль слишком слабый. Используйте минимум 8 символов';
      else if (msg.includes('invalid_email') || msg.includes('invalid')) errorMessage = 'Некорректный email адрес';
      else errorMessage = error?.message || errorMessage;

      throw new Error(errorMessage);
    }
  }

  // Logout — удаляем текущую сессию
  async logout(): Promise<void> {
    try {
      await account.deleteSession('current');
    } catch (error: any) {
      // Логируем предупреждение, но не ломаем UX
      console.warn('Logout warning:', error);
    }
  }

  // Удобный метод для проверки статуса
  async isLoggedIn(): Promise<boolean> {
    const user = await this.getCurrentUser(true);
    return !!user;
  }
}

export const authService = new AuthService();
