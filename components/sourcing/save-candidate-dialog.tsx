'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { BookmarkletProfile, RequestMatch } from '@/lib/sourcing/evaluator';
import { AIAnalysisResult } from '@/lib/ai/claude';

interface SaveCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: BookmarkletProfile;
  evaluation: AIAnalysisResult;
  matches: RequestMatch[];
  outreachMessage: string;
}

export function SaveCandidateDialog({
  open,
  onOpenChange,
  profile,
  evaluation,
  matches,
  outreachMessage,
}: SaveCandidateDialogProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/sourcing/save-cold-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          evaluation,
          matches,
          outreach_message: outreachMessage,
          manager_notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save candidate');
      }

      const data = await response.json();

      toast.success('Кандидата збережено!');
      onOpenChange(false);

      // Navigate to candidate profile
      router.push(`/dashboard/candidates/${data.candidate_id}`);
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Помилка збереження кандидата'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Зберегти кандидата
          </DialogTitle>
          <DialogDescription>
            Додати <strong>{profile.name}</strong> як cold lead до бази кандидатів.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What will be saved */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">Буде збережено:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Дані профілю (ім&apos;я, навички, досвід)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                AI оцінка ({evaluation.score}/10, {evaluation.category})
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Matches з запитами ({matches.length})
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Згенероване повідомлення
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                URL профілю ({profile.platform})
              </li>
            </ul>
          </div>

          {/* Manager notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Нотатки (опціонально)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Додаткові нотатки про кандидата..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Збереження...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Зберегти кандидата
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
