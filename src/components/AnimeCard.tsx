import { Heart, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ParsedTitle {
  mainTitle: string;
  originalTitle?: string;
  currentEpisode?: number;
  totalEpisodes?: number;
}

interface AnimeCardProps {
  id: string;
  title: string;
  image: string;
  description?: string;
  rating?: number;
  year?: number;
  episodesCount?: number;
  status?: string;
  isFavorite?: boolean;
  className?: string;
  onClick?: () => void;
  onToggleFavorite?: () => void;
}

function parseAnimeTitle(title: string): ParsedTitle {
  const result: ParsedTitle = {
    mainTitle: title
  };

  // Разделяем по "/"
  const parts = title.split('/').map(part => part.trim());
  if (parts.length > 1) {
    result.mainTitle = parts[0];

    // Ищем информацию о сериях в последней части
    const lastPart = parts[parts.length - 1];
    const episodeMatch = lastPart.match(/\[(\d+)(?:-(\d+))?\s+из\s+(\d+)(?:\+)?\]/);

    if (episodeMatch) {
      // В формате [1-4 из 12+], берем число после тире как текущее количество серий
      if (episodeMatch[2]) {
        result.currentEpisode = parseInt(episodeMatch[2]); // Берем число после тире как текущие серии
      } else {
        result.currentEpisode = parseInt(episodeMatch[1]); // Если нет тире, берем единственное число
      }
      result.totalEpisodes = parseInt(episodeMatch[3]); // Общее количество серий (число после "из")

      // Убираем информацию о сериях из оригинального названия
      const originalTitle = lastPart.replace(/\s*\[\d+(?:-\d+)?\s+из\s+\d+\]/, '').trim();
      if (originalTitle) {
        result.originalTitle = originalTitle;
      }
    } else {
      // Если нет информации о сериях, берём последнюю часть как оригинальное название
      result.originalTitle = lastPart;
    }
  }

  return result;
}

export function AnimeCard({
  id,
  title,
  image,
  rating,
  year,
  episodesCount,
  status,
  isFavorite = false,
  className,
  onClick,
  onToggleFavorite
}: AnimeCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const parsedTitle = parseAnimeTitle(title);
  const displayedEpisodesCount = parsedTitle.currentEpisode && parsedTitle.totalEpisodes
    ? `${parsedTitle.currentEpisode}/${parsedTitle.totalEpisodes}`
    : episodesCount !== undefined ? `${episodesCount} эп.` : 'Нет данных';

  return (
    <div className={cn("anime-card group cursor-pointer", className)} onClick={onClick}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-xl">
        {/* Loading placeholder */}
        <div className={cn(
          "absolute inset-0 bg-card transition-opacity duration-300",
          isLoading ? "opacity-100" : "opacity-0"
        )}>
          <div className="w-full h-full bg-muted/10 animate-pulse" />
        </div>

        {/* Main image */}
        <img
          src={image}
          alt={title}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-300",
            isLoading ? "scale-110 blur-sm" : "scale-100 blur-0"
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setIsError(true);
          }}
        />

        {/* Overlay with play button */}
        <div className="anime-card-overlay">
          <div className="play-button">
            <Play className="w-6 h-6" fill="currentColor" />
          </div>
        </div>

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
            <span className="text-xs font-medium text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
          className="absolute top-2 right-2 p-2 bg-black/70 backdrop-blur-sm rounded-full transition-colors duration-300 hover:bg-black/80"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors duration-300",
              isFavorite ? "text-red-500 fill-current" : "text-white"
            )}
          />
        </button>

        {/* Status badge */}
        {status && (
          <div className="absolute bottom-2 left-2 bg-primary px-2 py-1 rounded-md">
            <span className="text-xs font-medium text-white">{status}</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4 space-y-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-300">
            {parsedTitle.mainTitle}
          </h3>
          {parsedTitle.originalTitle && (
            <p className="text-xs text-muted-foreground line-clamp-1 italic">
              {parsedTitle.originalTitle}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{year || "Нет данных"}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary/50" />
            {displayedEpisodesCount}
          </span>
        </div>
      </div>
    </div>
  );
}
