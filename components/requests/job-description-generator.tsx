'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bot, Loader2, Copy, RefreshCw, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface JobDescriptionGeneratorProps {
  formData: {
    title?: string;
    required_skills?: string;
    nice_to_have_skills?: string;
    soft_skills?: string;
    description?: string;
    location?: string;
    employment_type?: string;
    remote_policy?: string;
    ai_orientation?: string;
    red_flags?: string;
  };
  value: string;
  onChange: (description: string) => void;
}

export function JobDescriptionGenerator({
  formData,
  value,
  onChange,
}: JobDescriptionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const canGenerate = !!(formData.title && formData.required_skills);
  const hasContent = !!value.trim();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/requests/generate-job-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate');
      }

      onChange(data.jobDescription);
      toast.success('Опис вакансії згенеровано');
    } catch (error) {
      console.error('Error generating job description:', error);
      toast.error('Не вдалося згенерувати опис. Спробуйте ще раз.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateClick = () => {
    if (hasContent) {
      setShowRegenerateDialog(true);
    } else {
      handleGenerate();
    }
  };

  const handleConfirmRegenerate = () => {
    setShowRegenerateDialog(false);
    handleGenerate();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success('Скопійовано в буфер обміну');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Не вдалося скопіювати');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Опис вакансії для публікації
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI згенерує текст вакансії на основі заповнених полів для публікації на DOU, Djinni, LinkedIn тощо.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Згенерований опис вакансії з'явиться тут..."
            rows={12}
            className="min-h-[300px] text-sm font-mono"
            disabled={isGenerating}
          />

          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Генерація опису вакансії...
            </div>
          )}

          <div className="flex gap-2">
            {!hasContent ? (
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="bg-red-600 hover:bg-red-700 text-white"
                title={
                  !canGenerate
                    ? 'Заповніть назву позиції та обов\'язкові навички'
                    : ''
                }
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? 'Генерація...' : 'Згенерувати опис вакансії'}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateClick}
                  disabled={!canGenerate || isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isGenerating ? 'Генерація...' : 'Перегенерувати'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isGenerating}
                >
                  {isCopied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {isCopied ? 'Скопійовано!' : 'Копіювати'}
                </Button>
              </>
            )}
          </div>

          {!canGenerate && (
            <p className="text-xs text-muted-foreground">
              Заповніть &quot;Назва позиції&quot; та &quot;Обов&apos;язкові навички&quot; для генерації опису
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перегенерувати опис?</DialogTitle>
            <DialogDescription>
              Поточний текст буде замінено новим згенерованим описом. Ваші зміни будуть втрачені.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
            >
              Скасувати
            </Button>
            <Button
              onClick={handleConfirmRegenerate}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Перегенерувати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
