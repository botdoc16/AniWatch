import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { animeApi } from '@/services/animeApi';
import * as backendApi from '@/services/backendApi';
import { userLevelService } from '@/services/userLevelService';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoPlayerProps {
  animeId: string;
  title: string;
  totalEpisodes: number;
  imageUrl: string;
}

interface EpisodeProgress {
  episodeId: string;
  watchedPercentage: number;
  isCompleted: boolean;
  progress: number;
  episodeNumber: number;
}

interface WatchProgress {
  animeId: string;
  episodes: EpisodeProgress[];
  currentEpisode: number;
  totalEpisodes: number;
  lastWatched: string;
  status: 'watching' | 'completed';
}

export const VideoPlayer = ({ animeId, title, totalEpisodes, imageUrl }: VideoPlayerProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<{ std: string; hd: string; }[]>([]);
  const [quality, setQuality] = useState<'std' | 'hd'>('hd');
  const [isWatched, setIsWatched] = useState(false);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);
  const [episodeProgress, setEpisodeProgress] = useState<EpisodeProgress | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const updateWatchProgress = useCallback(async () => {
    if (!user) {
      toast({
        title: "Ошибка сохранения прогресса",
        description: "Необходимо войти в систему для сохранения прогресса просмотра",
        variant: "destructive",
      });
      return;
    }

    if (!videoRef.current || !animeId || !currentEpisode || !totalEpisodes) {
      console.error('Мissing required data:', {
        videoRef: !!videoRef.current,
        animeId,
        currentEpisode,
        totalEpisodes
      });
      return;
    }

    try {
      toast({
        title: "Сохранение прогресса...",
        description: `Эпизод ${currentEpisode}`,
      });

      const isLastEpisode = currentEpisode === totalEpisodes;
      await backendApi.updateWatchProgress({
        user_id: user.user_id,
        anime_id: String(animeId),
        episode_number: currentEpisode,
        total_episodes: totalEpisodes,
        status: isLastEpisode ? 'completed' : 'watching',
        title: title || '',
        image_url: imageUrl || ''
      });

      toast({
        title: isLastEpisode ? "Аниме просмотрено!" : "Прогресс сохранен",
        description: isLastEpisode 
          ? `Поздравляем! Вы завершили просмотр ${title}`
          : `Эпизод ${currentEpisode} отмечен как просмотренный`,
        variant: isLastEpisode ? "default" : "default",
      });

      await userLevelService.watchEpisode(user.user_id);
    } catch (error) {
      console.error('Error updating watch progress:', error);
      let errorMessage = 'Не удалось сохранить прогресс просмотра';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Ошибка сохранения прогресса",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [user, animeId, currentEpisode, totalEpisodes, title, imageUrl, toast]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    const progress = video.currentTime / video.duration;

    setEpisodeProgress({
      episodeId: `${animeId}_${currentEpisode}`,
      episodeNumber: currentEpisode,
      watchedPercentage: progress * 100,
      progress,
      isCompleted: progress > 0.9
    });

    if (progress > 0.9 && user && !episodeProgress?.isCompleted) {
      updateWatchProgress();
    }
  }, [animeId, currentEpisode, user, episodeProgress, updateWatchProgress]);

  const handleEpisodeChange = useCallback((value: string) => {
    const newEpisode = Number(value);
    if (newEpisode !== currentEpisode) {
      updateWatchProgress().then(() => {
        setCurrentEpisode(newEpisode);
      });
    }
  }, [currentEpisode, updateWatchProgress]);

  const handlePreviousEpisode = useCallback(async () => {
    if (currentEpisode > 1) {
      await updateWatchProgress();
      setCurrentEpisode(prev => prev - 1);
    }
  }, [currentEpisode, updateWatchProgress]);

  const handleNextEpisode = useCallback(async () => {
    if (currentEpisode < totalEpisodes) {
      await updateWatchProgress();
      setCurrentEpisode(prev => prev + 1);
    }
  }, [currentEpisode, totalEpisodes, updateWatchProgress]);

  const handleQualityChange = useCallback((value: 'std' | 'hd') => {
    setQuality(value);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const loadEpisodes = async () => {
      try {
        const animeDetails = await animeApi.getAnimeById(animeId);
        if (animeDetails?.episodes_list) {
          setEpisodes(animeDetails.episodes_list);
        }
      } catch (error) {
        console.error('Error loading episodes:', error);
      }
    };

    loadEpisodes();
  }, [animeId]);

  useEffect(() => {
    if (videoRef.current && episodes[currentEpisode - 1]) {
      videoRef.current.src = episodes[currentEpisode - 1][quality];
      videoRef.current.load();
    }
  }, [currentEpisode, episodes, quality]);

  const handleVideoEnded = useCallback(async () => {
    try {
      await updateWatchProgress();

      if (currentEpisode === totalEpisodes) {
        setIsWatched(true);
      } else if (currentEpisode < totalEpisodes) {
        handleNextEpisode();
      }
    } catch (error) {
      console.error('Error in handleVideoEnded:', error);
    }
  }, [currentEpisode, totalEpisodes, updateWatchProgress, handleNextEpisode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleVideoEnded);
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {watchProgress && (
        <div className="mb-4 p-4 bg-secondary/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Текущий прогресс: {watchProgress.currentEpisode} из {watchProgress.totalEpisodes} эпизодов
              </p>
              {watchProgress.lastWatched && (
                <p className="text-xs text-muted-foreground">
                  Последний просмотр: {new Date(watchProgress.lastWatched).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-sm">
              Статус: {watchProgress.status === 'completed' ? 'Просмотрено' : 'Смотрю'}
            </div>
          </div>
        </div>
      )}

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls={false}
          autoPlay
          onEnded={handleVideoEnded}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-16 w-16"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8" />
            )}
          </Button>

          <div className="absolute bottom-16 left-0 right-0 px-4">
            <div className="w-full bg-white/30 rounded-full h-1">
              <div
                className="bg-primary h-1 rounded-full transition-all"
                style={{ width: `${(episodeProgress?.progress || 0) * 100}%` }}
              />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousEpisode}
              disabled={currentEpisode <= 1}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="flex-1 flex items-center gap-2">
              <Select value={currentEpisode.toString()} onValueChange={handleEpisodeChange}>
                <SelectTrigger className="h-8 bg-black/50 border-0 text-white hover:bg-black/70 min-w-[120px]">
                  <SelectValue placeholder={`Эпизод ${currentEpisode}`} />
                </SelectTrigger>
                <SelectContent className="max-h-[40vh]">
                  {Array.from({ length: totalEpisodes }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Эпизод {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-white text-sm">
                из {totalEpisodes}
              </span>
            </div>

            <Select value={quality} onValueChange={handleQualityChange}>
              <SelectTrigger className="h-8 w-[80px] bg-black/50 border-0 text-white hover:bg-black/70">
                <SelectValue placeholder={quality === 'hd' ? '720p' : '480p'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="std">480p</SelectItem>
                <SelectItem value="hd">720p</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextEpisode}
              disabled={currentEpisode >= totalEpisodes}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {isWatched && (
        <div className="text-green-500 text-center mt-4">
          Поздравляем! Вы посмотрели все эпизоды этого аниме.
        </div>
      )}
    </div>
  );
}
