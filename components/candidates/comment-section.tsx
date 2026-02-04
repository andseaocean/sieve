'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDateTime, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  managers: {
    name: string;
  } | null;
}

interface CommentSectionProps {
  candidateId: string;
  comments: Comment[];
  onCommentAdded: (comment: Comment) => void;
}

export function CommentSection({
  candidateId,
  comments,
  onCommentAdded,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/candidates/${candidateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const comment = await response.json();
      onCommentAdded(comment);
      setNewComment('');
      toast.success('Коментар додано');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Помилка додавання коментаря');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Коментарі ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Додайте коментар..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Надіслати
          </Button>
        </form>

        {/* Comments list */}
        {comments.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            {comments.map((comment) => {
              const managerName = comment.managers?.name || 'Unknown';
              const nameParts = managerName.split(' ');

              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      {getInitials(nameParts[0], nameParts[1] || nameParts[0])}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{managerName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ще немає коментарів
          </p>
        )}
      </CardContent>
    </Card>
  );
}
