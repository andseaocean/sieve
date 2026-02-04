'use client';

import Link from 'next/link';
import { Request } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatDate,
  truncate,
  requestStatusColors,
  requestStatusLabels,
  priorityColors,
  priorityLabels,
} from '@/lib/utils';
import { Eye, Pencil, MapPin, Briefcase } from 'lucide-react';

interface RequestCardProps {
  request: Request;
}

export function RequestCard({ request }: RequestCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{request.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {request.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {request.location}
                </span>
              )}
              {request.employment_type && request.employment_type !== 'not_specified' && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {request.employment_type}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className={requestStatusColors[request.status]}
            >
              {requestStatusLabels[request.status]}
            </Badge>
            <Badge
              variant="outline"
              className={priorityColors[request.priority]}
            >
              {priorityLabels[request.priority]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.description && (
          <p className="text-sm text-muted-foreground">
            {truncate(request.description, 150)}
          </p>
        )}

        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Обов'язкові навички:
            </span>
            <p className="text-sm">{truncate(request.required_skills, 100)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            Створено: {formatDate(request.created_at)}
          </span>
          <div className="flex gap-2">
            <Link href={`/dashboard/requests/${request.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Переглянути
              </Button>
            </Link>
            <Link href={`/dashboard/requests/${request.id}?edit=true`}>
              <Button variant="ghost" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
