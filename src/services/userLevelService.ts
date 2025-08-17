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
      const errorText = await response.text();
      let errorMessage = 'Ошибка обновления опыта';

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorMessage += `: ${errorData.detail}`;
        }
      } catch (e) {
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      }

      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getUserLevel(): Promise<UserLevel> {
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
        const errorText = await response.text();
        let errorMessage = 'Ошибка получения уровня пользователя';

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage += `: ${errorData.detail}`;
          }
        } catch (e) {
          // Если не удалось распарсить JSON, используем текст как есть
          if (errorText) {
            errorMessage += `: ${errorText}`;
          }
        }

        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });

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
