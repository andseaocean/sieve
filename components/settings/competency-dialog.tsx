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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SoftSkillCompetency } from '@/lib/supabase/types';

interface CompetencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competency: SoftSkillCompetency | null;
  onSaved: () => void;
}

export function CompetencyDialog({ open, onOpenChange, competency, onSaved }: CompetencyDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!competency;

  useEffect(() => {
    if (open) {
      setName(competency?.name || '');
      setDescription(competency?.description || '');
    }
  }, [open, competency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Назва обов\'язкова');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/questionnaire/competencies/${competency.id}`
        : '/api/questionnaire/competencies';

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(isEdit ? 'Компетенцію оновлено' : 'Компетенцію створено');
      onSaved();
    } catch (error) {
      console.error('Error saving competency:', error);
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати компетенцію' : 'Нова компетенція'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comp-name">Назва *</Label>
            <Input
              id="comp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Комунікація"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-desc">Опис</Label>
            <Textarea
              id="comp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Що ця компетенція оцінює?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
