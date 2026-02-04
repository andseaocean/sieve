'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { RequestForm } from '@/components/requests/request-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Request, Candidate } from '@/lib/supabase/types';
import {
  formatDate,
  requestStatusColors,
  requestStatusLabels,
  priorityColors,
  priorityLabels,
  aiOrientationLabels,
  employmentTypeLabels,
  remotePolicyLabels,
  getMatchScoreColor,
  getMatchScoreBg,
  categoryColors,
  categoryLabels,
  statusColors,
  statusLabels,
  getInitials,
} from '@/lib/utils';
import { toast } from 'sonner';
import { Pencil, Trash2, ArrowLeft, MapPin, Briefcase, Clock, AlertTriangle, Users, ExternalLink } from 'lucide-react';

interface MatchedCandidate {
  id: string;
  match_score: number | null;
  match_explanation: string | null;
  status: string;
  manager_notes: string | null;
  created_at: string;
  updated_at: string;
  candidate: Candidate | null;
}

export default function RequestDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [matches, setMatches] = useState<MatchedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEdit = searchParams.get('edit') === 'true';
  const requestId = params.id as string;

  useEffect(() => {
    async function fetchRequest() {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        if (response.ok) {
          const data = await response.json();
          setRequest(data);
        } else {
          toast.error('Запит не знайдено');
          router.push('/dashboard/requests');
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        toast.error('Помилка завантаження');
      } finally {
        setLoading(false);
      }
    }

    async function fetchMatches() {
      try {
        const response = await fetch(`/api/requests/${requestId}/matches`);
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setMatchesLoading(false);
      }
    }

    fetchRequest();
    fetchMatches();
  }, [requestId, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Запит видалено');
        router.push('/dashboard/requests');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Помилка видалення');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Завантаження..." />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  if (isEdit) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Редагувати запит" />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <RequestForm request={request} isEdit />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={request.title} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back and actions */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard/requests">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад до списку
              </Button>
            </Link>

            <div className="flex gap-2">
              <Link href={`/dashboard/requests/${request.id}?edit=true`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Редагувати
                </Button>
              </Link>

              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Видалити
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Видалити запит?</DialogTitle>
                    <DialogDescription>
                      Ви впевнені, що хочете видалити цей запит? Цю дію неможливо скасувати.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                      disabled={isDeleting}
                    >
                      Скасувати
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Видалення...' : 'Видалити'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2">
            <Badge variant="outline" className={requestStatusColors[request.status]}>
              {requestStatusLabels[request.status]}
            </Badge>
            <Badge variant="outline" className={priorityColors[request.priority]}>
              {priorityLabels[request.priority]}
            </Badge>
          </div>

          {/* Matched Candidates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Топ кандидати для цього запиту
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchesLoading ? (
                <p className="text-sm text-muted-foreground">Завантаження кандидатів...</p>
              ) : matches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground">
                    Поки немає кандидатів для цього запиту
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Кандидати з&apos;являться після подачі заявок через публічну форму
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match) => {
                    if (!match.candidate) return null;
                    const candidate = match.candidate;
                    const matchScore = match.match_score || 0;

                    return (
                      <div
                        key={match.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {/* Match Score */}
                        <div className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center ${getMatchScoreBg(matchScore)}`}>
                          <span className={`text-2xl font-bold ${getMatchScoreColor(matchScore)}`}>
                            {matchScore}
                          </span>
                          <span className="text-xs text-muted-foreground">match</span>
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(candidate.first_name, candidate.last_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {candidate.first_name} {candidate.last_name}
                            </h4>
                            {candidate.ai_category && (
                              <Badge variant="outline" className={`text-xs ${categoryColors[candidate.ai_category]}`}>
                                {categoryLabels[candidate.ai_category]}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-xs ${statusColors[match.status]}`}>
                              {statusLabels[match.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {candidate.email}
                          </p>
                          {candidate.key_skills && candidate.key_skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {candidate.key_skills.slice(0, 4).map((skill) => (
                                <span
                                  key={skill}
                                  className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                              {candidate.key_skills.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{candidate.key_skills.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* AI Score */}
                        {candidate.ai_score && (
                          <div className="text-right">
                            <span className="text-lg font-semibold text-muted-foreground">
                              {candidate.ai_score}/10
                            </span>
                            <p className="text-xs text-muted-foreground">AI score</p>
                          </div>
                        )}

                        {/* Link to candidate */}
                        <Link href={`/dashboard/candidates/${candidate.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main info */}
          <Card>
            <CardHeader>
              <CardTitle>Опис позиції</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.description ? (
                <p className="text-sm whitespace-pre-wrap">{request.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Опис не вказано</p>
              )}

              <div className="flex flex-wrap gap-4 pt-4 border-t text-sm text-muted-foreground">
                {request.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {request.location}
                  </span>
                )}
                {request.employment_type && request.employment_type !== 'not_specified' && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {employmentTypeLabels[request.employment_type]}
                  </span>
                )}
                {request.remote_policy && request.remote_policy !== 'not_specified' && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {remotePolicyLabels[request.remote_policy]}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Вимоги</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Обов&apos;язкові навички</h4>
                <p className="text-sm whitespace-pre-wrap">{request.required_skills}</p>
              </div>

              {request.nice_to_have_skills && (
                <div>
                  <h4 className="font-medium mb-2">Бажані навички</h4>
                  <p className="text-sm whitespace-pre-wrap">{request.nice_to_have_skills}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Soft Skills</h4>
                <p className="text-sm whitespace-pre-wrap">{request.soft_skills}</p>
              </div>

              {request.ai_orientation && (
                <div>
                  <h4 className="font-medium mb-2">AI Орієнтація</h4>
                  <p className="text-sm">{aiOrientationLabels[request.ai_orientation]}</p>
                </div>
              )}

              {request.red_flags && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Red Flags
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{request.red_flags}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Створено: {formatDate(request.created_at)}</span>
                <span>Оновлено: {formatDate(request.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
