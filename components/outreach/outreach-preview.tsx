'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import {
  Mail,
  MessageCircle,
  Clock,
  Send,
  Pencil,
  X,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface OutreachPreviewProps {
  candidateId: string;
}

interface OutreachData {
  id: string;
  introMessage: string;
  deliveryMethod: 'email' | 'telegram';
  scheduledFor: string;
  scheduledForDisplay: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
  sentAt: string | null;
  errorMessage: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: {
    label: 'Заплановано',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
  },
  processing: {
    label: 'Відправляється',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Loader2,
  },
  sent: {
    label: 'Відправлено',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Помилка',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Скасовано',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: X,
  },
};

export function OutreachPreview({ candidateId }: OutreachPreviewProps) {
  const [outreach, setOutreach] = useState<OutreachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedMessage, setEditedMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchOutreach();
  }, [candidateId]);

  const fetchOutreach = async () => {
    try {
      const res = await fetch(`/api/outreach/preview?candidateId=${candidateId}`);
      const data = await res.json();

      if (data.hasOutreach) {
        setOutreach(data.outreach);
        setEditedMessage(data.outreach.introMessage);
      } else {
        setOutreach(null);
      }
    } catch (error) {
      console.error('Error fetching outreach:', error);
      setOutreach(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!outreach) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/outreach/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreachId: outreach.id,
          introMessage: editedMessage,
        }),
      });

      if (res.ok) {
        setOutreach({ ...outreach, introMessage: editedMessage });
        setIsEditing(false);
        toast.success('Повідомлення оновлено');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Помилка збереження');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!outreach) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/outreach/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreachId: outreach.id }),
      });

      const data = await res.json();

      if (data.success) {
        setOutreach({ ...outreach, status: 'sent', sentAt: new Date().toISOString() });
        toast.success('Повідомлення відправлено!');
      } else {
        throw new Error(data.error || 'Failed to send');
      }
    } catch (error) {
      console.error('Error sending:', error);
      toast.error('Помилка відправки');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = async () => {
    if (!outreach) return;

    setIsCancelling(true);
    try {
      const res = await fetch('/api/outreach/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreachId: outreach.id }),
      });

      if (res.ok) {
        setOutreach({ ...outreach, status: 'cancelled' });
        setShowCancelDialog(false);
        toast.success('Розсилку скасовано');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
    } catch (error) {
      console.error('Error cancelling:', error);
      toast.error('Помилка скасування');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!outreach) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-4">
            Автоматичну розсилку не заплановано для цього кандидата
          </p>
        </CardContent>
      </Card>
    );
  }

  const canEdit = outreach.status === 'scheduled';
  const status = statusConfig[outreach.status] || statusConfig.scheduled;
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {outreach.deliveryMethod === 'email' ? (
              <Mail className="h-5 w-5" />
            ) : (
              <MessageCircle className="h-5 w-5" />
            )}
            Автоматична розсилка
          </CardTitle>
          <Badge variant="outline" className={status.color}>
            <StatusIcon className={`h-3 w-3 mr-1 ${outreach.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scheduled/Sent time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {outreach.status === 'sent' && outreach.sentAt ? (
            <span>Відправлено: {new Date(outreach.sentAt).toLocaleString('uk-UA')}</span>
          ) : (
            <span>Запланована відправка: {outreach.scheduledForDisplay}</span>
          )}
        </div>

        {/* Error message if failed */}
        {outreach.status === 'failed' && outreach.errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{outreach.errorMessage}</p>
          </div>
        )}

        {/* Delivery method */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Канал:</span>
          <Badge variant="secondary">
            {outreach.deliveryMethod === 'email' ? (
              <>
                <Mail className="h-3 w-3 mr-1" />
                Email
              </>
            ) : (
              <>
                <MessageCircle className="h-3 w-3 mr-1" />
                Telegram
              </>
            )}
          </Badge>
        </div>

        {/* Message preview/edit */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Повідомлення:</label>
          {isEditing ? (
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={10}
              className="resize-none font-mono text-sm"
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {outreach.introMessage}
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {isEditing ? (
              <>
                <Button onClick={handleSaveEdit} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Зберегти
                </Button>
                <Button
                  onClick={() => {
                    setEditedMessage(outreach.introMessage);
                    setIsEditing(false);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Скасувати
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Редагувати
                </Button>
                <Button onClick={handleSendNow} disabled={isSending} size="sm">
                  {isSending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Відправити зараз
                </Button>
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Скасувати
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Скасувати розсилку?</DialogTitle>
                      <DialogDescription>
                        Ви впевнені, що хочете скасувати автоматичну розсилку для цього кандидата?
                        Цю дію не можна буде скасувати.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelDialog(false)}
                        disabled={isCancelling}
                      >
                        Ні, залишити
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Так, скасувати
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
