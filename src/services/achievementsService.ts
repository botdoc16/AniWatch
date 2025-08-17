const API_URL = import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol';

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  exp_reward: number;
}

// Функции для работы с кэшем достижений
const loadAchievementsFromCache = (): Achievement[] | null => {
  const cached = localStorage.getItem('cached_achievements');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
};

const saveAchievementsToCache = (achievements: Achievement[]) => {
  try {
    localStorage.setItem('cached_achievements', JSON.stringify(achievements));
  } catch (e) {
    console.error('Ошибка при сохранении достижений в кэш:', e);
  }
};

export const achievementsService = {
  async getUserAchievements(): Promise<Achievement[]> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    try {
      // Сначала проверяем кэш
      const cached = loadAchievementsFromCache();
      if (cached) {
        return cached;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${API_URL}/achievements`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        });

        if (!response.ok) {
          // В случае ошибки возвращаем кэшированные данные, если есть
          const cached = loadAchievementsFromCache();
          if (cached) {
            return cached;
          }
          throw new Error('Ошибка получения достижений');
        }

        const achievements = await response.json();
        saveAchievementsToCache(achievements);
        return achievements;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Ошибка при получении достижений:', error);
      // В случае ошибки возвращаем кэшированные данные
      const cached = loadAchievementsFromCache();
      if (cached) {
        return cached;
      }
      throw error;
    }
  },
};
