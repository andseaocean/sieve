'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompetencyCard } from '@/components/settings/competency-card';
import { CompetencyDialog } from '@/components/settings/competency-dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { SoftSkillCompetency, QuestionnaireQuestion } from '@/lib/supabase/types';

export interface CompetencyWithQuestions extends SoftSkillCompetency {
  questions: QuestionnaireQuestion[];
}

export function QuestionnaireSettings() {
  const [competencies, setCompetencies] = useState<CompetencyWithQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<SoftSkillCompetency | null>(null);

  const fetchCompetencies = async () => {
    try {
      const res = await fetch('/api/questionnaire/competencies');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCompetencies(data);
    } catch (error) {
      console.error('Error fetching competencies:', error);
      toast.error('Помилка завантаження компетенцій');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetencies();
  }, []);

  const handleCreate = () => {
    setEditingCompetency(null);
    setDialogOpen(true);
  };

  const handleEdit = (competency: SoftSkillCompetency) => {
    setEditingCompetency(competency);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditingCompetency(null);
    fetchCompetencies();
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/questionnaire/competencies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Компетенцію видалено');
      fetchCompetencies();
    } catch (error) {
      console.error('Error deleting competency:', error);
      toast.error('Помилка видалення');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Управління компетенціями та питаннями для soft skills анкети кандидатів.
        </p>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Додати компетенцію
        </Button>
      </div>

      {competencies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Компетенцій ще немає. Додайте першу компетенцію.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {competencies.map((comp) => (
            <CompetencyCard
              key={comp.id}
              competency={comp}
              onEdit={() => handleEdit(comp)}
              onDelete={() => handleDelete(comp.id)}
              onQuestionsChanged={fetchCompetencies}
            />
          ))}
        </div>
      )}

      <CompetencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        competency={editingCompetency}
        onSaved={handleSaved}
      />
    </div>
  );
}
