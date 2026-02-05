'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { CommentSection } from '@/components/candidates/comment-section';
import { OutreachPreview } from '@/components/outreach/outreach-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Candidate } from '@/lib/supabase/types';
import {
  getInitials,
  categoryColors,
  categoryLabels,
  statusColors,
  statusLabels,
  getScoreColor,
  formatDate,
} from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  Globe,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  managers: {
    name: string;
  } | null;
}

// Extended Candidate type with translation fields (already in base Candidate type)
type CandidateWithTranslation = Candidate;

export default function CandidateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateWithTranslation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('new');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const candidateId = params.id as string;

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch candidate
        const candidateRes = await fetch(`/api/candidates/${candidateId}`);
        if (!candidateRes.ok) {
          toast.error('Кандидата не знайдено');
          router.push('/dashboard/candidates');
          return;
        }
        const candidateData = await candidateRes.json();
        setCandidate(candidateData);

        // Fetch comments
        const commentsRes = await fetch(`/api/candidates/${candidateId}/comments`);
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Помилка завантаження');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [candidateId, router]);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    toast.success(`Статус змінено на: ${statusLabels[newStatus]}`);
  };

  const handleCommentAdded = (comment: Comment) => {
    setComments([comment, ...comments]);
  };

  const handleRunAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId }),
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const result = await response.json();

      // Update local state with full AI results
      if (candidate) {
        setCandidate({
          ...candidate,
          ai_score: result.analysis.score,
          ai_category: result.analysis.category,
          ai_summary: result.analysis.summary,
          ai_strengths: result.analysis.strengths || [],
          ai_concerns: result.analysis.concerns || [],
          ai_recommendation: result.analysis.recommendation || null,
          ai_reasoning: result.analysis.reasoning || null,
        });
      }

      toast.success('AI аналіз завершено');
    } catch (error) {
      console.error('Error running AI analysis:', error);
      toast.error('Помилка AI аналізу');
    } finally {
      setIsAnalyzing(false);
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

  if (!candidate) {
    return null;
  }

  // Use original content directly
  const displayAboutText = candidate.about_text;
  const displayWhyVamos = candidate.why_vamos;

  return (
    <div className="flex flex-col h-full">
      <Header title={`${candidate.first_name} ${candidate.last_name}`} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back button and AI action */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard/candidates">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад до списку
              </Button>
            </Link>

            <Button
              onClick={handleRunAIAnalysis}
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing ? 'Аналіз...' : 'Запустити AI аналіз'}
            </Button>
          </div>

          {/* Main info card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {getInitials(candidate.first_name, candidate.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {candidate.first_name} {candidate.last_name}
                      </h2>

                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <a
                          href={`mailto:${candidate.email}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Mail className="h-4 w-4" />
                          {candidate.email}
                        </a>
                        {candidate.phone && (
                          <a
                            href={`tel:${candidate.phone}`}
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            <Phone className="h-4 w-4" />
                            {candidate.phone}
                          </a>
                        )}
                        {candidate.linkedin_url && (
                          <a
                            href={candidate.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </a>
                        )}
                        {candidate.portfolio_url && (
                          <a
                            href={candidate.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            <Globe className="h-4 w-4" />
                            Portfolio
                          </a>
                        )}
                      </div>
                    </div>

                    {/* AI Score */}
                    {candidate.ai_score && (
                      <div className="text-right">
                        <div className={`text-4xl font-bold ${getScoreColor(candidate.ai_score)}`}>
                          {candidate.ai_score}
                        </div>
                        <div className="text-sm text-muted-foreground">AI Score</div>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 mt-4">
                    {candidate.ai_category && (
                      <Badge variant="outline" className={categoryColors[candidate.ai_category]}>
                        {categoryLabels[candidate.ai_category]}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {candidate.source === 'warm' ? 'Warm Lead' : 'Cold Lead'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Аналіз
              </CardTitle>
              {candidate.ai_recommendation && (
                <Badge variant={candidate.ai_recommendation === 'yes' ? 'default' : 'destructive'}>
                  {candidate.ai_recommendation === 'yes' ? '✓ Рекомендовано' : '✗ Не рекомендовано'}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.ai_summary ? (
                <>
                  {/* Summary */}
                  <div>
                    <p className="text-sm whitespace-pre-wrap">{candidate.ai_summary}</p>
                  </div>

                  {/* Strengths */}
                  {candidate.ai_strengths && candidate.ai_strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2">💪 Сильні сторони</h4>
                      <ul className="text-sm space-y-1">
                        {candidate.ai_strengths.map((strength: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concerns */}
                  {candidate.ai_concerns && candidate.ai_concerns.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-700 mb-2">⚠️ Зони для уваги</h4>
                      <ul className="text-sm space-y-1">
                        {candidate.ai_concerns.map((concern: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-600">•</span>
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reasoning */}
                  {candidate.ai_reasoning && (
                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-semibold mb-2">📝 Обґрунтування</h4>
                      <p className="text-sm text-muted-foreground">{candidate.ai_reasoning}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  AI аналіз ще не проводився. Натисніть кнопку "Запустити AI аналіз" вище.
                </p>
              )}
            </CardContent>
          </Card>

          {/* About & Why Vamos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayAboutText && (
              <Card>
                <CardHeader>
                  <CardTitle>Про себе</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{displayAboutText}</p>
                </CardContent>
              </Card>
            )}

            {displayWhyVamos && (
              <Card>
                <CardHeader>
                  <CardTitle>Чому Vamos?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{displayWhyVamos}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Skills */}
          {candidate.key_skills && candidate.key_skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Навички</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {candidate.key_skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status management */}
          <Card>
            <CardHeader>
              <CardTitle>Статус кандидата</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новий</SelectItem>
                    <SelectItem value="reviewed">Переглянуто</SelectItem>
                    <SelectItem value="interview">Інтерв'ю</SelectItem>
                    <SelectItem value="hired">Найнято</SelectItem>
                    <SelectItem value="rejected">Відхилено</SelectItem>
                    <SelectItem value="on_hold">На паузі</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="outline" className={statusColors[status]}>
                  {statusLabels[status]}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resume link */}
          {candidate.resume_url && (
            <Card>
              <CardContent className="pt-6">
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-5 w-5" />
                  Переглянути резюме
                </a>
              </CardContent>
            </Card>
          )}

          {/* Outreach section - only for warm candidates */}
          {candidate.source === 'warm' && (
            <OutreachPreview candidateId={candidateId} />
          )}

          {/* Comments section */}
          <CommentSection
            candidateId={candidateId}
            comments={comments}
            onCommentAdded={handleCommentAdded}
          />

          {/* Meta info */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Додано: {formatDate(candidate.created_at)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
