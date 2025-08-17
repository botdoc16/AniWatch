import { useState, useEffect } from 'react';
import { User, Award, TrendingUp, Calendar, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth, User as UserType } from '@/contexts/AuthContext';
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserStats {
  favorites_count: number;
  watched_count: number;
  in_progress_count: number;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  points: number;
  earned_at?: string;
}

interface UserLevel {
  level: number;
  experience: number;
  next_level_exp: number;
  progress: number;
}

interface UserProfileProps {
  user: UserType;
}

export function UserProfile() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>({ level: 1, experience: 0, next_level_exp: 100, progress: 0 });

  const API_BASE_URL = 'https://api.aniwatch.lollol/';

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchUserAchievements();
      fetchUserLevel();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/stats/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const fetchUserAchievements = async () => {
    if (!user) return;
    // Заглушка для достижений
    const mockAchievements: Achievement[] = [
      { id: 1, name: "Первые шаги", description: "Зарегистрировались на сайте", points: 10, earned_at: "2024-01-01" },
      { id: 2, name: "Любитель аниме", description: "Посмотрели 5 аниме", points: 25, earned_at: stats.watched_count >= 5 ? "2024-01-02" : undefined },
      { id: 3, name: "Истинный отаку", description: "Посмотрели 20 аниме", points: 50, earned_at: stats.watched_count >= 20 ? "2024-01-03" : undefined },
      { id: 4, name: "Коллекционер", description: "Добавили 10 аниме в избранное", points: 30, earned_at: stats.favorites_count >= 10 ? "2024-01-04" : undefined },
    ];
    setAchievements(mockAchievements);
  };

  const fetchUserLevel = async () => {
    if (!user) return;
    // Расчет уровня на основе статистики
    const totalExp = (stats.watched_count * 50) + (stats.favorites_count * 10) + (achievements.filter(a => a.earned_at).length * 20);
    const level = Math.floor(totalExp / 100) + 1;
    const currentLevelExp = totalExp % 100;
    const nextLevelExp = 100;
    const progress = (currentLevelExp / nextLevelExp) * 100;

    setUserLevel({
      level,
      experience: totalExp,
      next_level_exp: nextLevelExp,
      progress
    });
  };

  useEffect(() => {
    fetchUserLevel();
  }, [stats, achievements]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Войдите в аккаунт</h2>
        <p className="text-muted-foreground">Для просмотра профиля необходимо войти в систему</p>
      </div>
    );
  }

  const earnedAchievements = achievements.filter(a => a.earned_at);
  const unearnedAchievements = achievements.filter(a => !a.earned_at);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Профиль пользователя */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <CardTitle className="gradient-text text-2xl">{user.username}</CardTitle>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  Уровень {userLevel.level}
                </Badge>
                <Badge variant="outline">
                  {earnedAchievements.length} достижений
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Опыт: {userLevel.experience}</span>
                <span>До следующего уровня: {userLevel.next_level_exp - (userLevel.experience % userLevel.next_level_exp)}</span>
              </div>
              <Progress value={userLevel.progress} className="h-2 progress-anime" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card text-center">
          <CardContent className="pt-6">
            <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.favorites_count}</div>
            <p className="text-sm text-muted-foreground">Избранное</p>
          </CardContent>
        </Card>

        <Card className="glass-card text-center">
          <CardContent className="pt-6">
            <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.watched_count}</div>
            <p className="text-sm text-muted-foreground">Просмотрено</p>
          </CardContent>
        </Card>

        <Card className="glass-card text-center">
          <CardContent className="pt-6">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.in_progress_count}</div>
            <p className="text-sm text-muted-foreground">Смотрю</p>
          </CardContent>
        </Card>
      </div>

      {/* Достижения */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Достижения ({earnedAchievements.length}/{achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  achievement.earned_at
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-muted/50 border-border opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{achievement.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {achievement.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        +{achievement.points} опыта
                      </Badge>
                      {achievement.earned_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(achievement.earned_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    achievement.earned_at ? 'bg-primary' : 'bg-muted-foreground'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
