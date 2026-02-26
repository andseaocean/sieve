'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { QuestionnaireQuestion } from '@/lib/supabase/types';

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competencyId: string;
  question: QuestionnaireQuestion | null;
  onSaved: () => void;
}

export function QuestionDialog({ open, onOpenChange, competencyId, question, onSaved }: QuestionDialogProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!question;

  useEffect(() => {
    if (open) {
      setText(question?.text || '');
    }
  }, [open, question]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      toast.error('Текст питання обов\'язковий');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/questionnaire/questions/${question.id}`
        : '/api/questionnaire/questions';

      const body = isEdit
        ? { text }
        : { competency_id: competencyId, text };

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(isEdit ? 'Питання оновлено' : 'Питання додано');
      onSaved();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати питання' : 'Нове питання'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="q-text">Текст питання *</Label>
            <Textarea
              id="q-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Наприклад: Розкажіть про ситуацію, коли вам довелося вирішувати конфлікт у команді..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Питання повинно спонукати кандидата розповісти про конкретний досвід.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Зберегти' : 'Додати'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
