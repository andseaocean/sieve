'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BookmarkletProfile } from '@/lib/sourcing/evaluator';
import {
  MapPin,
  Briefcase,
  Clock,
  ExternalLink,
  Code,
  BookOpen,
  Linkedin,
  Github,
} from 'lucide-react';

const platformInfo: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  linkedin: {
    name: 'LinkedIn',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Linkedin className="h-3 w-3" />,
  },
  github: {
    name: 'GitHub',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: <Github className="h-3 w-3" />,
  },
  dou: {
    name: 'DOU',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <span>🇺🇦</span>,
  },
  djinni: {
    name: 'Djinni',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: <span>👨‍💻</span>,
  },
  workua: {
    name: 'Work.ua',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: <span>💼</span>,
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface ProfilePreviewProps {
  profile: BookmarkletProfile;
}

export function ProfilePreview({ profile }: ProfilePreviewProps) {
  const platform = platformInfo[profile.platform] || {
    name: profile.platform,
    color: 'bg-gray-100 text-gray-800',
    icon: null,
  };

  const position = profile.position || profile.headline;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Профіль</CardTitle>
          <Badge variant="outline" className={platform.color}>
            {platform.icon} {platform.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header with avatar and name */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{profile.name}</h3>
            {position && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {position}
              </p>
            )}
            {profile.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {/* Experience */}
        {profile.experience_years && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{profile.experience_years}+ років досвіду</span>
          </div>
        )}

        {/* English level (Djinni) */}
        {profile.english_level && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">English:</span>
            <Badge variant="outline">{profile.english_level}</Badge>
          </div>
        )}

        {/* GitHub specific stats */}
        {profile.platform === 'github' && profile.repo_count && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{profile.repo_count} repos</span>
            </div>
          </div>
        )}

        {/* Work experience (LinkedIn) */}
        {profile.experiences && profile.experiences.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Досвід роботи</p>
            <div className="space-y-2">
              {profile.experiences.slice(0, 3).map((exp, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium">{exp.title}</p>
                  <p className="text-muted-foreground">{exp.company}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Code className="h-4 w-4" />
              Навички
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* About */}
        {(profile.about || profile.bio) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Про себе</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {profile.about || profile.bio}
            </p>
          </div>
        )}

        {/* View original profile button */}
        {profile.url && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(profile.url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Відкрити оригінальний профіль
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
