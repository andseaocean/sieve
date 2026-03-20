'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getScoreColor } from '@/lib/utils';

export interface MatchedVacancy {
  request_id: string;
  request_title: string;
  match_score: number;
}

interface MatchedVacanciesProps {
  candidateId: string;
  matches: MatchedVacancy[];
  primaryRequestId: string | null;
  onVacancyChanged?: (newRequestId: string) => void;
}

export function MatchedVacancies({
  candidateId,
  matches,
  primaryRequestId,
  onVacancyChanged,
}: MatchedVacanciesProps) {
  const [showModal, setShowModal] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const alternatives = matches.filter(
    (m) => m.request_id !== primaryRequestId && m.match_score >= 70,
  );

  if (alternatives.length === 0) return null;

  const handleAssign = (m: MatchedVacancy) => {
    setPendingRequestId(m.request_id);
    setPendingTitle(m.request_title);
    setNotes('');
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingRequestId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/primary-request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: pendingRequestId, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Вакансію змінено на «${pendingTitle}»`);
      onVacancyChanged?.(pendingRequestId);
      setShowModal(false);
    } catch {
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Також може підійти</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alternatives.map((m) => (
              <div key={m.request_id} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{m.request_title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${getScoreColor(m.match_score / 10)} border-current text-xs`}>
                    {m.match_score}/100
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => handleAssign(m)}>
                    Призначити
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Призначити вакансію «{pendingTitle}»?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Коментар (необов&apos;язково)</Label>
            <Textarea
              placeholder="Причина зміни..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Скасувати</Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Призначити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
