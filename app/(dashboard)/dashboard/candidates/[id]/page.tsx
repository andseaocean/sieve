'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { CommentSection } from '@/components/candidates/comment-section';
import { OutreachPreview } from '@/components/outreach/outreach-preview';
import { TestTaskTimeline } from '@/components/dashboard/test-task/TestTaskTimeline';
import { QuestionnaireSection } from '@/components/dashboard/questionnaire/questionnaire-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Candidate, QuestionnaireStatus, QuestionnaireResponse } from '@/lib/supabase/types';
import {
  getInitials,
  categoryColors,
  categoryLabels,
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
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ResumeViewer } from '@/components/candidates/ResumeViewer';
import { VacancyBlock } from '@/components/candidates/VacancyBlock';
import { MatchedVacancies, MatchedVacancy } from '@/components/candidates/MatchedVacancies';
import { RequestHistory, RequestHistoryEntry } from '@/components/candidates/RequestHistory';
import { FinalDecisionPanel } from '@/components/dashboard/final-decision-panel';
import { PipelineTimeline } from '@/components/dashboard/pipeline-timeline';
import { BlacklistButton } from '@/components/candidates/BlacklistButton';
import { PipelineStageEditor } from '@/components/candidates/PipelineStageEditor';
import { PriorityBlock, getPriorityAbsorbedBlocks } from '@/components/candidates/PriorityBlock';
import { CandidateTOC } from '@/components/candidates/CandidateTOC';
import { AIPortraitTab } from '@/components/candidates/AIPortraitTab';
import { ConversationsTab } from '@/components/candidates/ConversationsTab';
import type { PipelineStage } from '@/lib/supabase/types';
import type { ResumeData } from '@/lib/pdf/types';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  managers: {
    name: string;
  } | null;
}

type CandidateWithTranslation = Candidate;

type TabView = 'main' | 'ai-portrait' | 'history';

export default function CandidateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [candidate, setCandidate] = useState<CandidateWithTranslation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [primaryRequestId, setPrimaryRequestId] = useState<string | null>(null);
  const [primaryRequestTitle, setPrimaryRequestTitle] = useState<string | null>(null);
  const [primaryMatchScore, setPrimaryMatchScore] = useState<number | null>(null);
  const [primaryRequestStatus, setPrimaryRequestStatus] = useState<string | null>(null);
  const [matchedVacancies, setMatchedVacancies] = useState<MatchedVacancy[]>([]);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryEntry[]>([]);
  const [questionnaireResponse, setQuestionnaireResponse] = useState<QuestionnaireResponse | null>(null);

  const candidateId = params.id as string;

  // Tab state persisted in URL
  const viewParam = searchParams.get('view') as TabView | null;
  const activeTab: TabView = viewParam === 'ai-portrait' ? 'ai-portrait' : viewParam === 'history' ? 'history' : 'main';

  const setTab = (tab: TabView) => {
    const p = new URLSearchParams(searchParams.toString());
    if (tab === 'main') {
      p.delete('view');
    } else {
      p.set('view', tab);
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const candidateRes = await fetch(`/api/candidates/${candidateId}`);
        if (!candidateRes.ok) {
          toast.error('Кандидата не знайдено');
          router.push('/dashboard/candidates');
          return;
        }
        const candidateData = await candidateRes.json();
        setCandidate(candidateData);

        const cData = candidateData as Candidate & { primary_request_id?: string | null };
        setPrimaryRequestId(cData.primary_request_id ?? null);

        const [commentsRes, vacancyRes, matchesRes, historyRes, questionnaireRes] = await Promise.all([
          fetch(`/api/candidates/${candidateId}/comments`),
          cData.primary_request_id
            ? fetch(`/api/requests/${cData.primary_request_id}`)
            : Promise.resolve(null),
          fetch(`/api/candidates/${candidateId}/vacancy-matches`),
          fetch(`/api/candidates/${candidateId}/request-history`),
          fetch(`/api/questionnaire/response/${candidateId}`),
        ]);

        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }

        if (vacancyRes?.ok) {
          const vData = await vacancyRes.json();
          setPrimaryRequestTitle(vData.title ?? null);
          setPrimaryRequestStatus(vData.status ?? null);
        }

        if (matchesRes.ok) {
          const mData = await matchesRes.json() as MatchedVacancy[];
          setMatchedVacancies(mData);
          if (cData.primary_request_id) {
            const primary = mData.find((m) => m.request_id === cData.primary_request_id);
            setPrimaryMatchScore(primary?.match_score ?? null);
          }
        }

        if (historyRes.ok) {
          setRequestHistory(await historyRes.json() as RequestHistoryEntry[]);
        }

        if (questionnaireRes.ok) {
          const qData = await questionnaireRes.json();
          setQuestionnaireResponse(qData?.response ?? null);
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

      if (!response.ok) throw new Error('AI analysis failed');

      const result = await response.json();

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

  if (!candidate) return null;

  const displayAboutText = candidate.about_text;
  const displayWhyVamos = candidate.why_vamos;
  const questionnaireStatus = (candidate as Record<string, unknown>).questionnaire_status as QuestionnaireStatus | null;
  const questionnaireCompleted = questionnaireStatus === 'completed';
  const testTaskStatus = candidate.test_task_status;
  const pipelineStage = candidate.pipeline_stage || 'new';
  const absorbedBlocks = getPriorityAbsorbedBlocks(pipelineStage);

  const outreachVisible = !!(candidate.outreach_sent_at || candidate.outreach_message) && candidate.source === 'warm';
  const questionnaireVisibleInToc = !!questionnaireStatus;
  const testTaskVisibleInToc = testTaskStatus !== 'not_sent' && !!testTaskStatus;

  return (
    <div className="flex flex-col h-full">
      <Header title={`${candidate.first_name} ${candidate.last_name}`} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Back + actions */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard/candidates">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад до списку
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BlacklistButton
                candidateId={candidateId}
                isBlacklisted={candidate.is_blacklisted ?? false}
                blacklistReason={candidate.blacklist_reason}
              />
              <Button onClick={handleRunAIAnalysis} disabled={isAnalyzing} variant="outline">
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isAnalyzing ? 'Аналіз...' : 'Запустити AI аналіз'}
              </Button>
            </div>
          </div>

          {/* Pipeline Timeline */}
          {candidate.pipeline_stage && (
            <Card className="mb-6">
              <CardContent className="pt-4 pb-2">
                <PipelineTimeline currentStage={candidate.pipeline_stage as PipelineStage} />
                <div className="mt-3 flex justify-end">
                  <PipelineStageEditor
                    candidateId={candidateId}
                    currentStage={candidate.pipeline_stage as PipelineStage}
                    isBlacklisted={candidate.is_blacklisted ?? false}
                    onStageChanged={(newStage) => {
                      setCandidate({ ...candidate, pipeline_stage: newStage });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b mb-6">
            {(['main', 'ai-portrait', 'history'] as TabView[]).map((tab) => {
              const labels: Record<TabView, string> = {
                'main': 'Основне',
                'ai-portrait': 'AI-портрет',
                'history': 'Хронологія',
              };
              return (
                <button
                  key={tab}
                  onClick={() => setTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* AI-Portrait tab */}
          {activeTab === 'ai-portrait' && (
            <AIPortraitTab
              candidate={candidate}
              questionnaireResponse={questionnaireResponse}
            />
          )}

          {/* History tab */}
          {activeTab === 'history' && (
            <ConversationsTab candidateId={candidateId} />
          )}

          {/* Main tab */}
          {activeTab === 'main' && (
            <div className="flex gap-6">
              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-6">
                {/* Priority block */}
                <div id="priority-block">
                  <PriorityBlock
                    candidate={candidate}
                    pipelineStage={pipelineStage}
                    questionnaireCompleted={questionnaireCompleted}
                    onRunAnalysis={handleRunAIAnalysis}
                    isAnalyzing={isAnalyzing}
                  />
                </div>

                {/* Vacancy Block */}
                <div id="section-vacancy">
                  <VacancyBlock
                    candidateId={candidateId}
                    primaryRequestId={primaryRequestId}
                    primaryRequestTitle={primaryRequestTitle}
                    primaryMatchScore={primaryMatchScore}
                    primaryRequestStatus={primaryRequestStatus}
                    pipelineStage={candidate.pipeline_stage as PipelineStage}
                    onVacancyChanged={(newId) => {
                      setPrimaryRequestId(newId);
                      if (!newId) {
                        setPrimaryRequestTitle(null);
                        setPrimaryMatchScore(null);
                        setPrimaryRequestStatus(null);
                      }
                    }}
                  />
                </div>

                {/* Also matches */}
                <MatchedVacancies
                  candidateId={candidateId}
                  matches={matchedVacancies}
                  primaryRequestId={primaryRequestId}
                  onVacancyChanged={(newId) => setPrimaryRequestId(newId)}
                />

                {/* Request history */}
                <div id="section-history">
                  <RequestHistory history={requestHistory} />
                </div>

                {/* Profile card */}
                <div id="section-profile">
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
                                <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-primary">
                                  <Mail className="h-4 w-4" />{candidate.email}
                                </a>
                                {candidate.phone && (
                                  <a href={`tel:${candidate.phone}`} className="flex items-center gap-1 hover:text-primary">
                                    <Phone className="h-4 w-4" />{candidate.phone}
                                  </a>
                                )}
                                {candidate.linkedin_url && (
                                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                                    <Linkedin className="h-4 w-4" />LinkedIn
                                  </a>
                                )}
                                {candidate.portfolio_url && (
                                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                                    <Globe className="h-4 w-4" />Portfolio
                                  </a>
                                )}
                              </div>
                            </div>
                            {candidate.ai_score && (
                              <div className="text-right">
                                <div className={`text-4xl font-bold ${getScoreColor(candidate.ai_score)}`}>
                                  {candidate.ai_score}
                                </div>
                                <div className="text-sm text-muted-foreground">AI Score</div>
                              </div>
                            )}
                          </div>
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
                </div>

                {/* AI Analysis */}
                <div id="section-ai-analysis">
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
                          <p className="text-sm whitespace-pre-wrap">{candidate.ai_summary}</p>
                          {candidate.ai_strengths && candidate.ai_strengths.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-green-700 mb-2">💪 Сильні сторони</h4>
                              <ul className="text-sm space-y-1">
                                {candidate.ai_strengths.map((strength: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600">•</span>{strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {candidate.ai_concerns && candidate.ai_concerns.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-amber-700 mb-2">⚠️ Зони для уваги</h4>
                              <ul className="text-sm space-y-1">
                                {candidate.ai_concerns.map((concern: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-amber-600">•</span>{concern}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {candidate.ai_reasoning && (
                            <div className="pt-2 border-t">
                              <h4 className="text-sm font-semibold mb-2">📝 Обґрунтування</h4>
                              <p className="text-sm text-muted-foreground">{candidate.ai_reasoning}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          AI аналіз ще не проводився. Натисніть кнопку &quot;Запустити AI аналіз&quot; вище.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* About & Why Vamos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayAboutText && (
                    <Card>
                      <CardHeader><CardTitle>Про себе</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{displayAboutText}</p>
                      </CardContent>
                    </Card>
                  )}
                  {displayWhyVamos && (
                    <Card>
                      <CardHeader><CardTitle>Чому Vamos?</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{displayWhyVamos}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Skills */}
                {candidate.key_skills && candidate.key_skills.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Навички</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.key_skills.map((skill) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Resume */}
                <Card>
                  <CardHeader><CardTitle>Резюме</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <ResumeViewer
                      candidateId={candidateId}
                      candidateName={`${candidate.first_name} ${candidate.last_name}`}
                      resumeUrl={candidate.resume_url}
                    />
                    {(() => {
                      const resumeData = (candidate as Candidate & { resume_extracted_data?: ResumeData | null }).resume_extracted_data;
                      if (!resumeData?.extracted) return null;
                      const { extracted } = resumeData;
                      const hasData = extracted.skills.length > 0 || extracted.experience.length > 0 || extracted.education.length > 0;
                      if (!hasData) return null;
                      return (
                        <div className="border-t pt-4 space-y-4">
                          <h4 className="text-sm font-semibold text-muted-foreground">Інформація з резюме</h4>
                          {extracted.skills.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Технічні навички</h5>
                              <div className="flex flex-wrap gap-2">
                                {extracted.skills.map((skill: string, i: number) => (
                                  <Badge key={i} variant="secondary">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {extracted.experience.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Досвід роботи</h5>
                              <ul className="space-y-1 text-sm">
                                {extracted.experience.map((exp: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>{exp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {extracted.education.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Освіта</h5>
                              <ul className="space-y-1 text-sm">
                                {extracted.education.map((edu: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>{edu}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Outreach section */}
                {candidate.source === 'warm' && (
                  <div id="section-outreach">
                    <OutreachPreview
                      candidateId={candidateId}
                      candidateName={`${candidate.first_name} ${candidate.last_name}`}
                      aiScore={candidate.ai_score}
                      telegramChatId={candidate.telegram_chat_id}
                      telegramUsername={candidate.telegram_username}
                      preferredContactMethods={candidate.preferred_contact_methods}
                      outreachSentAt={candidate.outreach_sent_at}
                      outreachMessage={candidate.outreach_message}
                    />
                  </div>
                )}

                {/* Questionnaire — only if not absorbed by PriorityBlock */}
                {!absorbedBlocks.includes('questionnaire') && (
                  <div id="section-questionnaire">
                    <QuestionnaireSection
                      candidateId={candidateId}
                      questionnaireStatus={questionnaireStatus}
                    />
                  </div>
                )}

                {/* Test Task — only if not absorbed by PriorityBlock */}
                {!absorbedBlocks.includes('test-task') && (
                  <div id="section-test-task">
                    <TestTaskTimeline
                      candidate={candidate}
                      questionnaireCompleted={questionnaireCompleted}
                    />
                  </div>
                )}

                {/* Final Decision Panel */}
                <FinalDecisionPanel
                  candidateId={candidateId}
                  testTaskStatus={candidate.test_task_status}
                  testTaskAiScore={candidate.test_task_ai_score}
                />

                {/* Comments */}
                <div id="section-comments">
                  <CommentSection
                    candidateId={candidateId}
                    comments={comments}
                    onCommentAdded={handleCommentAdded}
                  />
                </div>

                {/* Meta */}
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      Додано: {formatDate(candidate.created_at)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* TOC sidebar */}
              <div className="w-48 flex-shrink-0 hidden lg:block">
                <CandidateTOC
                  outreachVisible={outreachVisible}
                  questionnaireVisible={questionnaireVisibleInToc}
                  testTaskVisible={testTaskVisibleInToc}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
