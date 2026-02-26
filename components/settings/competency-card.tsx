'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuestionDialog } from '@/components/settings/question-dialog';
import { ChevronDown, ChevronRight, Edit, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CompetencyWithQuestions } from '@/components/settings/questionnaire-settings';
import type { QuestionnaireQuestion } from '@/lib/supabase/types';

interface CompetencyCardProps {
  competency: CompetencyWithQuestions;
  onEdit: () => void;
  onDelete: () => void;
  onQuestionsChanged: () => void;
}

export function CompetencyCard({ competency, onEdit, onDelete, onQuestionsChanged }: CompetencyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionnaireQuestion | null>(null);

  const activeQuestions = competency.questions.filter(q => q.is_active);

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionDialogOpen(true);
  };

  const handleEditQuestion = (question: QuestionnaireQuestion) => {
    setEditingQuestion(question);
    setQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const res = await fetch(`/api/questionnaire/questions/${questionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Питання видалено');
      onQuestionsChanged();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Помилка видалення питання');
    }
  };

  const handleQuestionSaved = () => {
    setQuestionDialogOpen(false);
    setEditingQuestion(null);
    onQuestionsChanged();
  };

  return (
    <>
      <Card className={!competency.is_active ? 'opacity-60' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <div>
                <CardTitle className="text-base">{competency.name}</CardTitle>
                {competency.description && (
                  <p className="text-sm text-muted-foreground mt-1">{competency.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {activeQuestions.length} питань
              </Badge>
              {!competency.is_active && (
                <Badge variant="outline" className="text-orange-600">Неактивна</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0">
            <div className="space-y-2 ml-8">
              {activeQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Питань ще немає</p>
              ) : (
                activeQuestions.map((question, i) => (
                  <div key={question.id} className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground mr-2">{i + 1}.</span>
                        {question.text}
                      </p>
                      {question.is_universal && (
                        <Badge variant="outline" className="mt-1 text-xs">Універсальне</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(question)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              <Button variant="outline" size="sm" onClick={handleAddQuestion} className="mt-2">
                <Plus className="h-3 w-3 mr-1" />
                Додати питання
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <QuestionDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        competencyId={competency.id}
        question={editingQuestion}
        onSaved={handleQuestionSaved}
      />
    </>
  );
}
