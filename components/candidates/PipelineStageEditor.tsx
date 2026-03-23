'use client';

import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { PipelineStage } from '@/lib/supabase/types';

const STAGE_LABELS: Record<PipelineStage, string> = {
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

const ALL_STAGES: PipelineStage[] = [
  'new', 'analyzed', 'outreach_sent', 'questionnaire_sent', 'questionnaire_done',
  'test_sent', 'test_done', 'interview', 'rejected', 'hired', 'outreach_declined',
];

interface PipelineStageEditorProps {
  candidateId: string;
  currentStage: PipelineStage;
  isBlacklisted: boolean;
  onStageChanged: (newStage: PipelineStage) => void;
}

export function PipelineStageEditor({
  candidateId,
  currentStage,
  isBlacklisted,
  onStageChanged,
}: PipelineStageEditorProps) {
  const [open, setOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!selectedStage) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/pipeline-stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: selectedStage, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast.success(`Статус змінено на "${STAGE_LABELS[selectedStage]}"`);
      onStageChanged(selectedStage);
      setOpen(false);
      setSelectedStage(null);
      setReason('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Помилка зміни статусу');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isBlacklisted}>
          <Settings2 className="w-4 h-4 mr-1" />
          Змінити статус
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Змінити статус вручну</DialogTitle>
          <DialogDescription>
            Поточний статус: <strong>{STAGE_LABELS[currentStage]}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ALL_STAGES.map((stage) => (
              <button
                key={stage}
                onClick={() => stage !== currentStage && setSelectedStage(stage)}
                disabled={stage === currentStage}
                className={`text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                  stage === currentStage
                    ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-60'
                    : selectedStage === stage
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-border cursor-pointer'
                }`}
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage-reason">Причина зміни (необов&apos;язково)</Label>
            <Textarea
              id="stage-reason"
              placeholder="Наприклад: кандидат сам попросив повернути на попередній етап"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={!selectedStage || loading}>
            {loading ? 'Збереження...' : 'Зберегти'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
