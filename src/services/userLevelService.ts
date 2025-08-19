const API_URL = import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol';

export interface UserLevel {
  level: number;
  exp: number;
  next_level_exp: number;
}

export const userLevelService = {
  async watchEpisode(userId: string): Promise<UserLevel> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    const response = await fetch(`${API_URL}/user/${userId}/watch-episode`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');

      try {
        const parsed = JSON.parse(errorText);
        console.warn('watchEpisode non-ok response', { status: response.status, parsed });
      } catch {
        console.warn('watchEpisode non-ok response', { status: response.status, errorText });
      }

      if (response.status === 404 || response.status === 401) {
        // Сервер не поддерживает эндпоинт или нет доступа — возвращаем null-значение
        console.warn('watchEpisode endpoint not available or unauthorized', { status: response.status });
        return null as any;
      }

      let errorMessage = 'Ошибка обновления опыта';
      if (errorText) errorMessage += `: ${errorText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.debug('watchEpisode success', data);
    return data;
  },

  async getUserLevel(): Promise<UserLevel | null> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.user_id) {
      throw new Error('Не найден идентификатор пользователя');
    }
    const response = await fetch(`${API_URL}/user/${user.user_id}/progress`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    try {
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        // Если endpoint не найден или пользователь не авторизован — возвращаем null
        if (response.status === 404 || response.status === 401) {
          console.warn('User level endpoint returned', response.status, { errorText });
          return null as any;
        }

        let errorMessage = 'Ошибка получения уровня пользователя';
        if (errorText) errorMessage += `: ${errorText}`;
        console.error('Error response:', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        level: data.level,
        exp: data.exp,
        next_level_exp: data.next_level_exp || (data.level * 100) // Если сервер не вернул next_level_exp, вычисляем примерное значение
      };
    } catch (error) {
      console.error('Error in getUserLevel:', error);
      throw error;
    }
  },
};
