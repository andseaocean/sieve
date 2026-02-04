'use client';

import Link from 'next/link';
import { Candidate } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  getInitials,
  truncate,
  categoryColors,
  categoryLabels,
  getScoreColor,
} from '@/lib/utils';
import { Eye, Mail, Phone, Linkedin, Github, ExternalLink } from 'lucide-react';

const platformInfo: Record<string, { name: string; color: string }> = {
  linkedin: { name: 'LinkedIn', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  github: { name: 'GitHub', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  dou: { name: 'DOU', color: 'bg-green-100 text-green-800 border-green-300' },
  djinni: { name: 'Djinni', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  workua: { name: 'Work.ua', color: 'bg-orange-100 text-orange-800 border-orange-300' },
};

interface CandidateCardProps {
  candidate: Candidate;
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gray-100 text-gray-600">
              {getInitials(candidate.first_name, candidate.last_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg truncate">
                {candidate.first_name} {candidate.last_name}
              </h3>
              {candidate.ai_score && (
                <span className={`text-lg font-bold ${getScoreColor(candidate.ai_score)}`}>
                  {candidate.ai_score}/10
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <a
                href={`mailto:${candidate.email}`}
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                {candidate.email}
              </a>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Category and Platform badges */}
        <div className="flex flex-wrap gap-2">
          {candidate.ai_category && (
            <Badge variant="outline" className={categoryColors[candidate.ai_category]}>
              {categoryLabels[candidate.ai_category]}
            </Badge>
          )}
          {candidate.sourcing_method === 'quick_check' && candidate.platform && (
            <Badge variant="outline" className={platformInfo[candidate.platform]?.color || 'bg-gray-100 text-gray-800'}>
              {platformInfo[candidate.platform]?.name || candidate.platform}
            </Badge>
          )}
          {candidate.sourcing_method === 'quick_check' && (
            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
              Cold Lead
            </Badge>
          )}
        </div>

        {/* Skills */}
        {candidate.key_skills && candidate.key_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {candidate.key_skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {candidate.key_skills.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{candidate.key_skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Summary */}
        {candidate.ai_summary && (
          <p className="text-sm text-muted-foreground">
            {truncate(candidate.ai_summary, 120)}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-2">
            {candidate.phone && (
              <a href={`tel:${candidate.phone}`} className="text-muted-foreground hover:text-primary">
                <Phone className="h-4 w-4" />
              </a>
            )}
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {candidate.platform === 'github' && candidate.profile_url && (
              <a
                href={candidate.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {candidate.profile_url && candidate.platform !== 'github' && candidate.platform !== 'linkedin' && (
              <a
                href={candidate.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <Link href={`/dashboard/candidates/${candidate.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Детальніше
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
