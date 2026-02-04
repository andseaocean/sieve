'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProfilePreview } from '@/components/sourcing/profile-preview';
import { EvaluationCard } from '@/components/sourcing/evaluation-card';
import { MessageGeneratorCard } from '@/components/sourcing/message-generator-card';
import { SaveCandidateDialog } from '@/components/sourcing/save-candidate-dialog';
import { toast } from 'sonner';
import { AIAnalysisResult } from '@/lib/ai/claude';
import { BookmarkletProfile, RequestMatch } from '@/lib/sourcing/evaluator';
import {
  ArrowLeft,
  UserPlus,
  Search,
  Sparkles,
  BookmarkIcon,
  Settings,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface AnalysisResult {
  profile: BookmarkletProfile;
  evaluation: AIAnalysisResult;
  matches: RequestMatch[];
  bestMatch?: {
    request_id: string;
    request_title: string;
    match_score: number;
  };
  outreachMessage: string;
}

function SourcingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const encodedData = searchParams.get('data');

  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [profileData, setProfileData] = useState<BookmarkletProfile | null>(null);
  const hasProcessedData = useRef(false);

  // Process bookmarklet data when it arrives
  useEffect(() => {
    if (encodedData && !hasProcessedData.current) {
      hasProcessedData.current = true;
      try {
        // Decode URL-safe base64 from bookmarklet
        // 1. Convert URL-safe base64 back to regular base64
        let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
        // 2. Add padding if needed
        while (base64.length % 4) {
          base64 += '=';
        }
        // 3. Decode base64 and handle UTF-8/Cyrillic
        const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
        setProfileData(decoded);
        analyzeProfile(decoded);
      } catch (error) {
        console.error('Failed to decode profile data:', error);
        toast.error('Помилка декодування даних профілю');
        hasProcessedData.current = false;
      }
    }
  }, [encodedData]);

  async function analyzeProfile(data: BookmarkletProfile) {
    setIsLoading(true);

    try {
      toast.success(`Профіль ${data.name} отримано з ${data.platform}`);

      const evalResponse = await fetch('/api/sourcing/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: data }),
      });

      if (!evalResponse.ok) {
        const errorData = await evalResponse.json();
        throw new Error(errorData.error || 'Failed to evaluate profile');
      }

      const evalData = await evalResponse.json();

      setResult({
        profile: data,
        evaluation: evalData.evaluation,
        matches: evalData.matches,
        bestMatch: evalData.best_match,
        outreachMessage: evalData.outreach_message,
      });

      toast.success('AI аналіз завершено');
    } catch (error) {
      console.error('Error analyzing profile:', error);
      toast.error(
        error instanceof Error ? error.message : 'Помилка аналізу профілю'
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleRegenerate = async () => {
    if (!result) return;

    setIsRegenerating(true);

    try {
      const evalResponse = await fetch('/api/sourcing/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: result.profile }),
      });

      if (!evalResponse.ok) {
        throw new Error('Failed to regenerate message');
      }

      const evalData = await evalResponse.json();

      setResult({
        ...result,
        outreachMessage: evalData.outreach_message,
      });

      toast.success('Повідомлення перегенеровано');
    } catch (error) {
      console.error('Error regenerating message:', error);
      toast.error('Помилка перегенерації');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleStartOver = () => {
    setResult(null);
    setProfileData(null);
    hasProcessedData.current = false;
    // Clear the URL parameter
    router.push('/dashboard/sourcing');
  };

  // Show empty state if no data
  const showEmptyState = !encodedData && !result && !isLoading;

  return (
    <div className="flex flex-col h-full">
      <Header title="Sourcing" />

      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="quick-check" className="max-w-7xl mx-auto">
          <TabsList className="mb-6">
            <TabsTrigger value="quick-check" className="gap-2">
              <Search className="h-4 w-4" />
              Quick Profile Check
            </TabsTrigger>
            <TabsTrigger value="auto-search" disabled className="gap-2">
              <Sparkles className="h-4 w-4" />
              Auto Search
              <Badge variant="secondary" className="ml-1 text-xs">
                Coming Soon
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick-check">
            {/* Empty State - Show instructions */}
            {showEmptyState && (
              <div className="max-w-2xl mx-auto text-center py-12">
                <div className="text-6xl mb-6">📊</div>
                <h2 className="text-3xl font-bold mb-4">Quick Profile Check</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Використовуйте букмарклет Vamos для аналізу профілів кандидатів
                  з LinkedIn, GitHub, DOU, Djinni та Work.ua
                </p>

                {/* Setup CTA */}
                <Card className="mb-8 border-2 border-dashed border-primary/50 bg-primary/5">
                  <CardContent className="py-8">
                    <BookmarkIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Ще не встановили букмарклет?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Встановіть букмарклет один раз і аналізуйте профілі одним кліком
                    </p>
                    <Link href="/dashboard/sourcing/setup">
                      <Button size="lg" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Перейти до налаштування
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* How it works */}
                <div className="text-left max-w-xl mx-auto">
                  <h3 className="font-semibold text-lg mb-4">Як це працює:</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Відкрийте профіль кандидата</p>
                        <p className="text-sm text-muted-foreground">
                          LinkedIn, GitHub, DOU, Djinni або Work.ua
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Натисніть букмарклет</p>
                        <p className="text-sm text-muted-foreground">
                          "Vamos Quick Check" на панелі закладок
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium">Отримайте AI-аналіз</p>
                        <p className="text-sm text-muted-foreground">
                          Оцінка, матчинг з запитами та готове повідомлення
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test links */}
                <div className="mt-8 pt-8 border-t">
                  <p className="text-sm text-muted-foreground mb-4">
                    Тестові профілі для перевірки:
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <a
                      href="https://www.linkedin.com/in/satlonavash/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-2">
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                    <a
                      href="https://github.com/torvalds"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-2">
                        GitHub
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && profileData && (
              <div className="max-w-2xl mx-auto text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  Аналізую профіль {profileData.name}
                </h2>
                <p className="text-muted-foreground">
                  AI оцінює кандидата та порівнює з активними запитами...
                </p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-6">
                {/* Results header */}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={handleStartOver}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Аналізувати інший профіль
                  </Button>

                  <div className="flex gap-2">
                    <Link href="/dashboard/sourcing/setup">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Налаштування
                      </Button>
                    </Link>
                    <Button onClick={() => setShowSaveDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Зберегти кандидата
                    </Button>
                  </div>
                </div>

                {/* Platform badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    Профіль з {result.profile.platform.toUpperCase()}
                  </Badge>
                  {result.profile.url && (
                    <a
                      href={result.profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      Відкрити оригінал
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Three-column layout */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Profile */}
                  <ProfilePreview profile={result.profile} />

                  {/* Evaluation */}
                  <EvaluationCard
                    evaluation={result.evaluation}
                    matches={result.matches}
                    bestMatch={result.bestMatch}
                  />

                  {/* Message */}
                  <MessageGeneratorCard
                    message={result.outreachMessage}
                    onRegenerate={handleRegenerate}
                    isRegenerating={isRegenerating}
                  />
                </div>

                {/* Save dialog */}
                <SaveCandidateDialog
                  open={showSaveDialog}
                  onOpenChange={setShowSaveDialog}
                  profile={result.profile}
                  evaluation={result.evaluation}
                  matches={result.matches}
                  outreachMessage={result.outreachMessage}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="auto-search">
            <Card>
              <CardHeader>
                <CardTitle>Auto Search</CardTitle>
                <CardDescription>
                  Автоматичний пошук кандидатів скоро буде доступний
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ця функція дозволить автоматично знаходити кандидатів на основі
                  ваших запитів та критеріїв пошуку.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function SourcingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SourcingPageContent />
    </Suspense>
  );
}
