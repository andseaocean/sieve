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
  Sparkles,
} from 'lucide-react';

interface OutreachPreviewProps {
  candidateId: string;
  candidateName?: string;
  aiScore?: number | null;
  email?: string | null;
  telegramUsername?: string | null;
  preferredContactMethods?: string[] | null;
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

export function OutreachPreview({
  candidateId,
  candidateName,
  aiScore,
  email,
  telegramUsername,
  preferredContactMethods,
}: OutreachPreviewProps) {
  // Existing outreach state
  const [outreach, setOutreach] = useState<OutreachData | null>(null);
  const [loading, setLoading] = useState(true);

  // On-demand generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [detectedContactMethod, setDetectedContactMethod] = useState<'email' | 'telegram' | null>(null);

  // Editing state
  const [editedMessage, setEditedMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Action state
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch existing outreach on mount
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

  // Determine contact method availability
  const getContactMethod = (): 'email' | 'telegram' | null => {
    if (detectedContactMethod) return detectedContactMethod;

    const methods = Array.isArray(preferredContactMethods) ? preferredContactMethods : [];

    if (methods.includes('telegram') && telegramUsername) {
      return 'telegram';
    }
    if (email) {
      return 'email';
    }
    return null;
  };

  const contactMethod = getContactMethod();
  const showAISuggestion = aiScore !== null && aiScore !== undefined && aiScore >= 7;

  // Generate message on-demand
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate message');
      }

      setGeneratedMessage(data.message);
      setEditedMessage(data.message);
      setDetectedContactMethod(data.contactMethod);
      toast.success('Повідомлення згенеровано!');
    } catch (error) {
      console.error('Failed to generate message:', error);
      toast.error(error instanceof Error ? error.message : 'Помилка генерації повідомлення');
    } finally {
      setIsGenerating(false);
    }
  };

  // Schedule or send immediately
  const handleSchedule = async (sendNow: boolean) => {
    const messageToSend = isEditing ? editedMessage : generatedMessage;

    if (!messageToSend) {
      toast.error('Спочатку згенеруйте повідомлення');
      return;
    }

    if (sendNow) {
      setIsSending(true);
    } else {
      setIsScheduling(true);
    }

    try {
      const response = await fetch('/api/outreach/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          message: messageToSend,
          contactMethod: detectedContactMethod || contactMethod,
          sendNow,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule message');
      }

      toast.success(sendNow ? 'Повідомлення відправлено!' : 'Повідомлення заплановано!');

      // Refresh outreach data
      await fetchOutreach();
      setGeneratedMessage(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to schedule message:', error);
      toast.error(error instanceof Error ? error.message : 'Помилка відправки');
    } finally {
      setIsSending(false);
      setIsScheduling(false);
    }
  };

  // Discard generated message
  const handleDiscard = () => {
    setGeneratedMessage(null);
    setEditedMessage('');
    setIsEditing(false);
    setDetectedContactMethod(null);
  };

  // Save edited existing outreach
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

  // Send existing scheduled outreach now
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

  // Cancel scheduled outreach
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

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ==========================================
  // CASE 1: Existing outreach (show read-only or editable based on status)
  // ==========================================
  if (outreach) {
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
              Outreach повідомлення
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

          {/* Actions for existing scheduled outreach */}
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
                          Ви впевнені, що хочете скасувати розсилку для цього кандидата?
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

  // ==========================================
  // CASE 2: No existing outreach - show on-demand generation UI
  // ==========================================

  // No contact method available
  if (!contactMethod) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Outreach повідомлення
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Немає способу зв'язку</h4>
              <p className="text-sm text-gray-600 mt-1">
                Цей кандидат не вказав email або Telegram для зв'язку.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Outreach повідомлення
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {contactMethod === 'email' ? `${email}` : `@${telegramUsername}`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestion banner (for score >= 7) */}
        {showAISuggestion && !generatedMessage && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">AI Рекомендація</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Цей кандидат отримав оцінку {aiScore}/10 і виглядає як сильний кандидат.
                  Рекомендуємо зв'язатися!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No message generated yet */}
        {!generatedMessage && !isGenerating && (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              Згенеруйте персоналізоване повідомлення {candidateName ? `для ${candidateName}` : 'для кандидата'}
            </p>
            <Button
              onClick={handleGenerate}
              className="bg-primary hover:bg-primary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Згенерувати повідомлення
            </Button>
          </div>
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Генеруємо персоналізоване повідомлення...</p>
            <p className="text-sm text-gray-500 mt-1">Це може зайняти кілька секунд</p>
          </div>
        )}

        {/* Message generated - show preview/edit */}
        {generatedMessage && !isGenerating && (
          <div className="space-y-4">
            {/* Delivery method indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Канал:</span>
              <Badge variant="secondary">
                {(detectedContactMethod || contactMethod) === 'email' ? (
                  <>
                    <Mail className="h-3 w-3 mr-1" />
                    Email ({email})
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Telegram (@{telegramUsername})
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
                  {generatedMessage}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Редагувати
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setGeneratedMessage(editedMessage);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Зберегти зміни
                  </Button>
                )}

                <Button
                  onClick={handleDiscard}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Скасувати
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleSchedule(false)}
                  disabled={isScheduling || isSending}
                  variant="outline"
                  size="sm"
                >
                  {isScheduling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  Запланувати
                </Button>

                <Button
                  onClick={() => handleSchedule(true)}
                  disabled={isScheduling || isSending}
                  size="sm"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Відправити зараз
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
