'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { RecommendedCandidate } from '@/app/api/requests/[id]/recommended-candidates/route';

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new: 'Новий',
  analyzed: 'Проаналізований',
  outreach_sent: 'Аутріч надіслано',
  questionnaire_sent: 'Анкету надіслано',
  questionnaire_done: 'Анкету пройдено',
  test_sent: 'Тестове надіслано',
  test_done: 'Тестове виконано',
  interview: 'Співбесіда',
  rejected: 'Відмовлено',
  hired: 'Найнятий',
  outreach_declined: 'Відмовився від аутрічу',
};

const STAGE_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rejected: 'destructive',
  outreach_declined: 'outline',
};

const VACANCY_HISTORY_STATUS_LABELS: Record<string, string> = {
  new: 'новий',
  reviewed: 'переглянутий',
  interview: 'співбесіда',
  hired: 'найнятий',
  rejected: 'відмовлено',
  on_hold: 'на паузі',
  applied: 'подавався',
};

interface RecommendedCandidatesProps {
  requestId: string;
  requestTitle: string;
}

export function RecommendedCandidates({ requestId, requestTitle }: RecommendedCandidatesProps) {
  const [candidates, setCandidates] = useState<RecommendedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/requests/${requestId}/recommended-candidates`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setCandidates(data.candidates || []);
      } catch {
        toast.error('Помилка завантаження рекомендованих кандидатів');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openAddDialog() {
    const count = selectedIds.size;
    setMessageTemplate(
      `Привіт! У нас з'явилась нова вакансія — ${requestTitle}, і ми одразу подумали про тебе. Було б цікаво обговорити?`
    );
    setDialogOpen(true);
    void count;
  }

  async function handleAddSelected() {
    setSending(true);
    try {
      const competencyScoresByCandidate: Record<string, RecommendedCandidate['competency_scores']> = {};
      for (const id of selectedIds) {
        const candidate = candidates.find((c) => c.id === id);
        if (candidate) {
          competencyScoresByCandidate[id] = candidate.competency_scores;
        }
      }

      const res = await fetch(`/api/requests/${requestId}/add-recommended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_ids: Array.from(selectedIds),
          message_template: messageTemplate,
          competency_scores_by_candidate: competencyScoresByCandidate,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      const successCount = data.results?.filter((r: { success: boolean }) => r.success).length || 0;

      toast.success(`${successCount} кандидатів додано до вакансії та поставлено в чергу аутрічу`);

      // Remove added candidates from the list
      setCandidates((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setDialogOpen(false);
    } catch {
      toast.error('Помилка при додаванні кандидатів');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-2">
        <UserCheck className="w-10 h-10 mx-auto opacity-30" />
        <p className="font-medium">Немає кандидатів з відповідними оцінками по анкеті</p>
        <p className="text-sm">
          Кандидати з'являться тут після проходження анкети по інших вакансіях із відповідними компетенціями.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
          <span className="text-sm font-medium">Вибрано: {selectedIds.size}</span>
          <Button size="sm" onClick={openAddDialog}>
            Додати вибраних до вакансії
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="border rounded-lg p-4 flex gap-3 items-start hover:bg-muted/30 transition-colors"
          >
            <Checkbox
              checked={selectedIds.has(candidate.id)}
              onCheckedChange={() => toggleSelect(candidate.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/dashboard/candidates/${candidate.id}`}
                  className="font-medium text-sm hover:underline"
                >
                  {candidate.first_name} {candidate.last_name}
                </Link>
                <Badge variant={STAGE_VARIANT_MAP[candidate.pipeline_stage] || 'secondary'}>
                  {PIPELINE_STAGE_LABELS[candidate.pipeline_stage] || candidate.pipeline_stage}
                </Badge>
              </div>

              {/* Competency scores */}
              <div className="mt-2 flex flex-wrap gap-2">
                {candidate.competency_scores.map((cs) => (
                  <span
                    key={cs.competency_id}
                    className="inline-flex items-center gap-1 text-xs bg-background border rounded-full px-2.5 py-0.5"
                  >
                    <span className="font-medium text-primary">{cs.score}/10</span>
                    <span className="text-muted-foreground">{cs.competency_name}</span>
                  </span>
                ))}
              </div>

              {/* Vacancy history */}
              {candidate.vacancy_history.length > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Раніше:{' '}
                  {candidate.vacancy_history.slice(0, 2).map((vh, i) => (
                    <span key={vh.request_id}>
                      {i > 0 && ' · '}
                      &ldquo;{vh.request_title}&rdquo;{' '}
                      ({VACANCY_HISTORY_STATUS_LABELS[vh.status] || vh.status})
                    </span>
                  ))}
                  {candidate.vacancy_history.length > 2 && ` +${candidate.vacancy_history.length - 2} ще`}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Додати {selectedIds.size} {selectedIds.size === 1 ? 'кандидата' : 'кандидатів'} до вакансії &ldquo;{requestTitle}&rdquo;
            </DialogTitle>
            <DialogDescription>
              AI згенерує персоналізоване повідомлення для кожного окремо на основі їхніх результатів анкети. Шаблон нижче — відправна точка для генерації.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="message-template">Повідомлення для кандидатів</Label>
            <Textarea
              id="message-template"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={sending}>
              Скасувати
            </Button>
            <Button onClick={handleAddSelected} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Відправка...
                </>
              ) : (
                'Надіслати'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
