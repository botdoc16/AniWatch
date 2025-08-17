import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { Achievement } from "@/services/animeApi";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface UserProgressProps {
  level: number;
  exp: number;
  next_level_exp: number;
  achievements?: Achievement[];
}

export function UserProgress({ level, exp, next_level_exp, achievements = [] }: UserProgressProps) {
  const progress = (exp / next_level_exp) * 100;
  const expToNext = next_level_exp - exp;

  return (
    <div className="space-y-4">
      <div className="relative p-4 bg-card rounded-lg border border-border">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <span className="text-lg font-bold text-primary">Ур. {level}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              До следующего уровня: <span className="font-medium text-foreground">{expToNext} EXP</span>
            </div>
          </div>
          <div className="text-sm font-medium">
            <span className="text-primary">{exp}</span>
            <span className="text-muted-foreground"> / </span>
            <span className="text-foreground">{next_level_exp}</span>
            <span className="text-muted-foreground ml-1">EXP</span>
          </div>
        </div>

        <div className="relative">
          <Progress
            value={progress}
            className="h-3 bg-primary/20"
          />
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
              background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)"
            }}
          />
        </div>

        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-primary rounded text-xs font-medium text-primary-foreground">
          {progress.toFixed(1)}%
        </div>
      </div>

      {achievements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Достижения</h4>
          <div className="flex flex-wrap gap-2">
            {achievements.map((achievement) => (
              <HoverCard key={achievement.id}>
                <HoverCardTrigger>
                  <Badge variant="outline" className="cursor-help">
                    <Trophy className="w-3 h-3 mr-1" />
                    {achievement.name}
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{achievement.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Trophy className="w-3 h-3 mr-1" />
                      +{achievement.exp_reward} EXP
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
