import { animeVostApi } from './animeVostApi';

export interface WatchStatus {
  animeId: string;
  status: 'planned' | 'watching' | 'completed' | 'dropped';
  episodes: number;
  title: string;
  image_url: string;
}

export interface AnimeResponse {
  id: string;
  title: string;
  image: string;
  rating?: number;
  year?: number;
  status?: string;
  description?: string;
  episodes?: number;
  completedAt?: string;
  lastWatched?: string;
  currentEpisode?: number;
  genres?: string[];
  type?: string;
  popularity?: number;
  updatedAt?: string;
  isFavorite?: boolean;
  episodes_list?: { std: string; hd: string; number: number; name: string; }[];
}

export interface SearchResult {
  animes: AnimeResponse[];
  hasNextPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface UserProgress {
  level: number;
  exp: number;
  next_level_exp: number;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon_path?: string;
  exp_reward: number;
  unlocked_at?: string;
}

class AnimeAPI {
  private readonly API_URL = import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol';

  async searchAnime(query: string, page: number = 1): Promise<SearchResult> {
    try {
      const results = await animeVostApi.searchAnime(query);
      return {
        animes: results.map(anime => ({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          rating: parseFloat(anime.rating) || 0,
          year: parseInt(anime.year) || undefined,
          status: anime.status,
          description: anime.description,
          episodes: parseInt(anime.episodes_count) || 0,
          genres: anime.genres || anime.genre?.split(', ').map(g => g.trim()) || [],
          type: 'tv'
        })),
        hasNextPage: false,
        currentPage: page,
        totalPages: 1
      };
    } catch (error) {
      console.error('Error searching anime:', error);
      return {
        animes: [],
        hasNextPage: false,
        currentPage: page,
        totalPages: 1
      };
    }
  }

  async getPopularAnime(page: number = 1, limit: number = 2000): Promise<SearchResult> {
    try {
      console.log('Запрашиваем полный список аниме (лимит:', limit, ')');
      const results = await animeVostApi.getLatestAnime(limit);
      console.log('Получен список из', results.length, 'аниме');
      
      return {
        animes: results.map(anime => ({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          rating: parseFloat(anime.rating) || 0,
          year: parseInt(anime.year) || undefined,
          status: anime.status,
          description: anime.description,
          episodes: parseInt(anime.episodes_count) || 0,
          genres: anime.genres || anime.genre?.split(', ').map(g => g.trim()) || [],
          type: anime.type || 'tv'
        })),
        hasNextPage: results.length >= limit,
        currentPage: page,
        totalPages: Math.ceil(results.length / 100)
      };
    } catch (error) {
      console.error('Error getting popular anime:', error);
      return {
        animes: [],
        hasNextPage: false,
        currentPage: page,
        totalPages: 1
      };
    }
  }

  async getAnimeById(id: string): Promise<AnimeResponse | null> {
    try {
      console.log('Getting anime details for id:', id);
      const animeVostDetails = await animeVostApi.getAnimeById(id);
      console.log('Received anime details:', animeVostDetails);
      if (!animeVostDetails) return null;

      return {
        id: animeVostDetails.id,
        title: animeVostDetails.title,
        image: animeVostDetails.image,
        rating: parseFloat(animeVostDetails.rating) || 0,
        year: parseInt(animeVostDetails.year) || undefined,
        status: animeVostDetails.status,
        description: animeVostDetails.description,
        episodes: parseInt(animeVostDetails.episodes_count) || 0,
        type: 'tv',
        episodes_list: animeVostDetails.episodes_list || []
      };
    } catch (error) {
      console.error('Error getting anime by id:', error);
      return null;
    }
  }

  async getLatestAnime(page = 1) {
    return await animeVostApi.getLatestAnime(page);
  }

  // Методы для работы с избранным
  async addToFavorites(userId: string, animeId: string, title: string, imageUrl: string) {
    return await fetch(`${this.API_URL}/favorites/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        animeId,
        action: 'add',
        title,
        image_url: imageUrl
      })
    }).then(res => res.json());
  }

  async removeFromFavorites(userId: string, animeId: string) {
    return await fetch(`${this.API_URL}/favorites/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        animeId,
        action: 'remove'
      })
    }).then(res => res.json());
  }

  async getFavorites(userId: string) {
    return await fetch(`${this.API_URL}/favorites/${userId}`).then(res => res.json());
  }

  // Методы для работы с прогрессом просмотра
  async updateWatchStatus(userId: string, data: WatchStatus) {
    return await fetch(`${this.API_URL}/watch-status/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json());
  }

  async getWatchedList(userId: string) {
    return await fetch(`${this.API_URL}/watched/${userId}`).then(res => res.json());
  }

  async getWatchedDetailedList(userId: string) {
    return await fetch(`${this.API_URL}/user/${userId}/watched-detailed`).then(res => res.json());
  }

  // Методы для работы с недавно просмотренными
  async addToRecent(userId: string, animeId: string, title: string, imageUrl?: string) {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('anime_id', animeId);
    formData.append('title', title);
    if (imageUrl) formData.append('image_url', imageUrl);

    return await fetch(`${this.API_URL}/recent`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }

  async getRecentAnime(userId: string) {
    return await fetch(`${this.API_URL}/recent/${userId}`).then(res => res.json());
  }

  // Методы для работы с достижениями и уровнями
  async getUserProgress(userId: string): Promise<UserProgress> {
    return await fetch(`${this.API_URL}/user/${userId}/progress`).then(res => res.json());
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return await fetch(`${this.API_URL}/user/${userId}/achievements`).then(res => res.json());
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return await fetch(`${this.API_URL}/achievements`).then(res => res.json());
  }

  // Методы для работы со статистикой
  async getUserStats(userId: string) {
    return await fetch(`${this.API_URL}/stats/${userId}`).then(res => res.json());
  }

  // Глобальная статистика
  async getGlobalWatchedAnime(limit: number = 10) {
    return await fetch(`${this.API_URL}/watched-anime/global?limit=${limit}`).then(res => res.json());
  }

  async getGlobalFavorites(limit: number = 10) {
    return await fetch(`${this.API_URL}/favorites/global?limit=${limit}`).then(res => res.json());
  }

  async getWatchedAnime(userId: string): Promise<AnimeResponse[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

      try {
        const response = await fetch(`${this.API_URL}/users/${userId}/watched`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.map((anime: any) => ({
          id: anime.id,
          title: anime.title,
          image: anime.image_url || anime.image || '/placeholder.svg',
          rating: parseFloat(anime.rating) || 0,
          episodes: parseInt(anime.episodes) || 0,
          status: 'completed',
          completedAt: anime.completed_at || new Date().toISOString()
        }));
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error fetching watched anime:', error);
      // Если API недоступно, возвращаем данные из локального хранилища
      return this.getWatchedAnimeFromLocal();
    }
  }

  private getWatchedAnimeFromLocal(): AnimeResponse[] {
    const watchHistory = localStorage.getItem('animewatch_history');
    if (!watchHistory) return [];

    try {
      const history = JSON.parse(watchHistory);
      return history
        .filter((item: any) => item.isCompleted)
        .map((item: any) => ({
          id: item.animeId,
          title: item.title,
          image: item.image,
          episodes: item.totalEpisodes,
          status: 'completed'
        }));
    } catch {
      return [];
    }
  }

  async getInProgressAnime(userId: string): Promise<AnimeResponse[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

      try {
        const response = await fetch(`${this.API_URL}/users/${userId}/watching`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.map((anime: any) => ({
          id: anime.id,
          title: anime.title,
          image: anime.image_url || anime.image || '/placeholder.svg',
          rating: parseFloat(anime.rating) || 0,
          episodes: parseInt(anime.episodes) || 0,
          currentEpisode: parseInt(anime.current_episode) || 0,
          status: 'watching',
          lastWatched: anime.last_watched || new Date().toISOString()
        }));
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error fetching in-progress anime:', error);
      // Если API недоступно, возвращаем данные из локального хранилища
      return this.getInProgressAnimeFromLocal();
    }
  }

  private getInProgressAnimeFromLocal(): AnimeResponse[] {
    const watchHistory = localStorage.getItem('animewatch_history');
    if (!watchHistory) return [];

    try {
      const history = JSON.parse(watchHistory);
      return history
        .filter((item: any) => !item.isCompleted && item.currentEpisode < item.totalEpisodes)
        .map((item: any) => ({
          id: item.animeId,
          title: item.title,
          image: item.image || '/placeholder.svg',
          episodes: item.totalEpisodes,
          currentEpisode: item.currentEpisode,
          status: 'watching',
          lastWatched: item.lastWatched || new Date().toISOString()
        }));
    } catch {
      return [];
    }
  }

  async getAnimeInfo(id: string): Promise<AnimeResponse> {
    // Сначала пытаемся получить из основного API
    try {
      const data = await animeVostApi.getAnimeInfo(id);
      if (data) {
        return {
          id: data.id.toString(),
          title: data.title,
          image: data.image || '/placeholder.svg',
          description: data.description,
          episodes: parseInt(data.episodes_count) || 0,
          year: parseInt(data.year) || undefined,
          status: data.status,
          genres: data.genre?.split(', '),
          rating: parseFloat(data.rating) || 0,
          type: data.type
        };
      }
    } catch (error) {
      console.error('Error fetching anime info from main API:', error);
    }

    // Если не удалось получить данные из основного API, пытаемся получить из локального хранилища
    try {
      const watchHistory = localStorage.getItem('animewatch_history');
      if (watchHistory) {
        const history = JSON.parse(watchHistory);
        const localData = history.find((item: any) => item.animeId === id);
        if (localData) {
          return {
            id: localData.animeId,
            title: localData.title,
            image: localData.image || '/placeholder.svg',
            episodes: localData.totalEpisodes || 0,
            currentEpisode: localData.currentEpisode,
            status: localData.isCompleted ? 'completed' : 'watching'
          };
        }
      }
    } catch (error) {
      console.error('Error fetching anime info from local storage:', error);
    }

    throw new Error('Failed to fetch anime info');
  }
}

export const animeApi = new AnimeAPI();
