'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, RefreshCw, Check, Mail } from 'lucide-react';

interface MessageGeneratorCardProps {
  message: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function MessageGeneratorCard({
  message,
  onRegenerate,
  isRegenerating,
}: MessageGeneratorCardProps) {
  const [editedMessage, setEditedMessage] = useState(message);
  const [copied, setCopied] = useState(false);

  // Update local state when message prop changes
  if (message !== editedMessage && !copied) {
    setEditedMessage(message);
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedMessage);
      setCopied(true);
      toast.success('Скопійовано в буфер обміну');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Не вдалося скопіювати');
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  const characterCount = editedMessage.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Повідомлення для контакту
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            rows={12}
            className="resize-none font-normal"
            placeholder="Повідомлення буде згенеровано автоматично..."
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{characterCount} символів</span>
            <span>Рекомендовано: 150-200 слів</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant={copied ? 'default' : 'outline'}
            className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Скопійовано!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Копіювати
              </>
            )}
          </Button>

          {onRegenerate && (
            <Button
              onClick={handleRegenerate}
              variant="outline"
              disabled={isRegenerating}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`}
              />
              {isRegenerating ? 'Генерація...' : 'Перегенерувати'}
            </Button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 <strong>Підказка:</strong> Відредагуйте повідомлення за потреби, потім скопіюйте
            та надішліть через LinkedIn або email.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
