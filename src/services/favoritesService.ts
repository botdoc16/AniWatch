const API_URL = import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol';

export interface FavoriteAnime {
  id: string;
  title: string;
  image: string;
  rating: number;
  addedAt: string;
}

// Функции для работы с кэшем
const loadFromCache = (): FavoriteAnime[] | null => {
  const cached = localStorage.getItem('cached_favorites');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
};

const saveToCache = (favorites: FavoriteAnime[]) => {
  try {
    localStorage.setItem('cached_favorites', JSON.stringify(favorites));
  } catch (e) {
    console.error('Ошибка при сохранении в кэш:', e);
  }
};

// Кэш для хранения списка избранного
let favoritesCache: FavoriteAnime[] | null = null;

class FavoritesService {
  private userId: string | null = null;

  setUserId(userId: string) {
    this.userId = userId;
  }

  async getFavorites(): Promise<FavoriteAnime[]> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    if (!this.userId) {
      throw new Error('UserId не установлен');
    }

    try {
      // Проверяем кэш
      const cached = loadFromCache();
      if (cached) {
        favoritesCache = cached;
        return cached;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

      try {
        const response = await fetch(`${API_URL}/favorites/${this.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        if (!response.ok) {
          // В случае ошибки пробуем использовать кэш
          if (favoritesCache) {
            return favoritesCache;
          }
          throw new Error(`Ошибка получения избранного: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // Преобразуем и сохраняем в кэш
        const favorites = data.map((item: any) => ({
          id: item.anime_id?.toString() || item.id?.toString(),
          title: item.title,
          image: item.image_url || item.image || '/placeholder.svg',
          rating: item.rating || 0,
          addedAt: item.addedAt || new Date().toISOString()
        }));

        favoritesCache = favorites;
        saveToCache(favorites);
        return favorites;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Ошибка при получении избранного:', error);
      const cached = loadFromCache();
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  async isFavorite(animeId: string | number): Promise<boolean> {
    try {
      if (!favoritesCache) {
        await this.getFavorites();
      }
      return favoritesCache?.some(item => item.id === animeId.toString()) || false;
    } catch (error) {
      console.error('Ошибка при проверке избранного:', error);
      return false;
    }
  }

  async addToFavorites(anime: { 
    id: string | number; 
    title: string; 
    image: string;
    rating?: number;
    year?: number;
  }): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    if (!this.userId) {
      throw new Error('UserId не установлен');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${API_URL}/favorites/${this.userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          animeId: anime.id.toString(),
          action: 'add',
          title: anime.title,
          image_url: anime.image
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Ошибка добавления в избранное: ${response.status} ${response.statusText}`);
      }

      // Инвалидируем кэш
      favoritesCache = null;
      localStorage.removeItem('cached_favorites');

      return true;
    } catch (error) {
      console.error('Ошибка при добавлении в избранное:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async removeFromFavorites(animeId: string | number): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    if (!this.userId) {
      throw new Error('UserId не установлен');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${API_URL}/favorites/${this.userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          animeId: animeId.toString(),
          action: 'remove'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Ошибка удаления из избранного: ${response.status} ${response.statusText}`);
      }

      // Инвалидируем кэш
      favoritesCache = null;
      localStorage.removeItem('cached_favorites');

      return true;
    } catch (error) {
      console.error('Ошибка при удалении из избранного:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const favoritesService = new FavoritesService();
