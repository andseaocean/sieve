'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Briefcase, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getScoreColor } from '@/lib/utils';
import type { PipelineStage } from '@/lib/supabase/types';

interface OpenRequest {
  id: string;
  title: string;
  status: string;
}

interface VacancyBlockProps {
  candidateId: string;
  primaryRequestId: string | null;
  primaryRequestTitle?: string | null;
  primaryMatchScore?: number | null;
  primaryRequestStatus?: string | null;
  pipelineStage: PipelineStage;
  onVacancyChanged?: (newRequestId: string | null) => void;
}

const ACTIVE_STAGES: PipelineStage[] = [
  'outreach_sent',
  'questionnaire_sent',
  'questionnaire_done',
  'test_sent',
  'test_done',
  'interview',
];

export function VacancyBlock({
  candidateId,
  primaryRequestId,
  primaryRequestTitle,
  primaryMatchScore,
  primaryRequestStatus,
  pipelineStage,
  onVacancyChanged,
}: VacancyBlockProps) {
  const [openRequests, setOpenRequests] = useState<OpenRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null | 'none'>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/requests')
      .then((r) => r.json())
      .then((data: OpenRequest[]) => {
        if (Array.isArray(data)) {
          setOpenRequests(data.filter((r) => r.status === 'active'));
        }
      })
      .catch(() => {});
  }, []);

  const isActivePipeline = ACTIVE_STAGES.includes(pipelineStage);
  const isClosedRequest = primaryRequestStatus && primaryRequestStatus !== 'active';

  const handleChangeClick = (newValue: string) => {
    setPendingRequestId(newValue === 'none' ? null : newValue);
    setNotes('');
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const body: { request_id: string | null; notes?: string } = {
        request_id: pendingRequestId === 'none' ? null : pendingRequestId,
        notes: notes || undefined,
      };
      const res = await fetch(`/api/candidates/${candidateId}/primary-request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Вакансію оновлено');
      onVacancyChanged?.(pendingRequestId === 'none' ? null : (pendingRequestId as string));
      setShowModal(false);
    } catch {
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const allOptions: OpenRequest[] = [
    { id: 'none', title: 'Без вакансії', status: 'active' },
    ...openRequests,
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Основна вакансія
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isClosedRequest && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Вакансія закрита. Розгляньте переведення кандидата.
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              {primaryRequestTitle ? (
                <div className="flex items-center gap-3">
                  <span className="font-medium">{primaryRequestTitle}</span>
                  {primaryMatchScore != null && (
                    <Badge variant="outline" className={`${getScoreColor(primaryMatchScore / 10)} border-current`}>
                      AI {primaryMatchScore}/100
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground italic">Без вакансії</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isActivePipeline && !showModal && (
                <p className="text-xs text-muted-foreground">Кандидат в активній воронці</p>
              )}
              <Select
                value={primaryRequestId ?? 'none'}
                onValueChange={handleChangeClick}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Змінити вакансію" />
                </SelectTrigger>
                <SelectContent>
                  {allOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Змінити вакансію</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isActivePipeline && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                Кандидат уже в активній воронці (стадія: {pipelineStage}). Зміна вакансії не скине поточний прогрес.
              </div>
            )}
            <div className="space-y-2">
              <Label>Коментар (необов&apos;язково)</Label>
              <Textarea
                placeholder="Причина зміни вакансії..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Скасувати
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Підтвердити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
