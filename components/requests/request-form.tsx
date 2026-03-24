'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Request, SoftSkillCompetency, QuestionnaireQuestion } from '@/lib/supabase/types';
import { JobDescriptionGenerator } from '@/components/requests/job-description-generator';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, ChevronRight, Plus, X, AlertTriangle } from 'lucide-react';

interface CompetencyWithQuestions extends SoftSkillCompetency {
  questions: QuestionnaireQuestion[];
}

const requestSchema = z.object({
  title: z.string().min(1, 'Назва обов\'язкова'),
  description: z.string().optional(),
  required_skills: z.string().min(1, 'Обов\'язкові навички обов\'язкові'),
  nice_to_have_skills: z.string().optional(),
  soft_skills: z.string().optional(),
  ai_orientation: z.enum(['critical', 'preferred', 'not_important']).optional(),
  red_flags: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.enum(['full-time', 'part-time', 'contract', 'not_specified']).optional(),
  remote_policy: z.enum(['remote', 'hybrid', 'office', 'not_specified']).optional(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['active', 'paused', 'closed']).optional(),
  test_task_url: z.string().optional(),
  test_task_deadline_days: z.number().min(1).max(14).optional(),
  test_task_message: z.string().optional(),
  test_task_evaluation_criteria: z.string().optional(),
  job_description: z.string().optional(),
  outreach_template: z.string().optional(),
  outreach_template_approved: z.boolean().optional(),
  salary_range: z.string().optional(),
  vacancy_info: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestFormProps {
  request?: Request;
  isEdit?: boolean;
}

export function RequestForm({ request, isEdit = false }: RequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [competencies, setCompetencies] = useState<CompetencyWithQuestions[]>([]);
  // Competencies in "all random" mode
  const [randomCompetencyIds, setRandomCompetencyIds] = useState<string[]>(
    (request as Record<string, unknown>)?.questionnaire_competency_ids as string[] || []
  );
  // Specific question IDs
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    (request as Record<string, unknown>)?.questionnaire_question_ids as string[] || []
  );
  // Per-competency selection mode
  const [competencyModes, setCompetencyModes] = useState<Record<string, 'all' | 'specific'>>({});
  // Custom question input
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  const [newCustomCompetencyId, setNewCustomCompetencyId] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    fetch('/api/questionnaire/competencies')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCompetencies(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Initialize competency modes from saved data
  useEffect(() => {
    if (competencies.length === 0) return;
    const modes: Record<string, 'all' | 'specific'> = {};

    randomCompetencyIds.forEach(id => {
      modes[id] = 'all';
    });

    selectedQuestionIds.forEach(qId => {
      for (const comp of competencies) {
        if (comp.questions.some(q => q.id === qId)) {
          if (!modes[comp.id]) {
            modes[comp.id] = 'specific';
          }
          break;
        }
      }
    });

    setCompetencyModes(modes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencies]);

  const handleToggleCompetency = (compId: string) => {
    const currentMode = competencyModes[compId];
    if (currentMode) {
      // Deselect: remove from modes and clean up
      setCompetencyModes(prev => {
        const next = { ...prev };
        delete next[compId];
        return next;
      });
      setRandomCompetencyIds(ids => ids.filter(id => id !== compId));
      const comp = competencies.find(c => c.id === compId);
      if (comp) {
        const compQIds = comp.questions.map(q => q.id);
        setSelectedQuestionIds(ids => ids.filter(id => !compQIds.includes(id)));
      }
    } else {
      // Select: default to "all"
      setCompetencyModes(prev => ({ ...prev, [compId]: 'all' }));
      setRandomCompetencyIds(ids => [...ids, compId]);
    }
  };

  const handleSetCompetencyMode = (compId: string, mode: 'all' | 'specific') => {
    setCompetencyModes(prev => ({ ...prev, [compId]: mode }));
    const comp = competencies.find(c => c.id === compId);
    if (!comp) return;
    const compQIds = comp.questions.filter(q => q.is_active).map(q => q.id);

    if (mode === 'all') {
      setRandomCompetencyIds(ids => ids.includes(compId) ? ids : [...ids, compId]);
      setSelectedQuestionIds(ids => ids.filter(id => !compQIds.includes(id)));
    } else {
      setRandomCompetencyIds(ids => ids.filter(id => id !== compId));
      // Don't auto-select questions — let the user pick
    }
  };

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    );
  };

  const saveCustomQuestion = async () => {
    if (!newCustomQuestion.trim() || !newCustomCompetencyId) return;
    setSavingCustom(true);
    try {
      const res = await fetch('/api/questionnaire/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competency_id: newCustomCompetencyId, text: newCustomQuestion.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const newQ = await res.json();

      // Add to selected question IDs
      setSelectedQuestionIds(prev => [...prev, newQ.id]);

      // Ensure competency is in specific mode
      setCompetencyModes(prev => {
        if (prev[newCustomCompetencyId] === 'all') {
          // Switch to specific — move all questions to selected
          setRandomCompetencyIds(ids => ids.filter(id => id !== newCustomCompetencyId));
          const comp = competencies.find(c => c.id === newCustomCompetencyId);
          if (comp) {
            const existingQIds = comp.questions.filter(q => q.is_active).map(q => q.id);
            setSelectedQuestionIds(prevIds => [...new Set([...prevIds, ...existingQIds, newQ.id])]);
          }
          return { ...prev, [newCustomCompetencyId]: 'specific' };
        }
        if (!prev[newCustomCompetencyId]) {
          return { ...prev, [newCustomCompetencyId]: 'specific' };
        }
        return prev;
      });

      // Refresh competencies to show the new question
      const compRes = await fetch('/api/questionnaire/competencies');
      if (compRes.ok) {
        const data = await compRes.json();
        setCompetencies(Array.isArray(data) ? data : []);
      }

      setNewCustomQuestion('');
      toast.success('Питання додано до банку');
    } catch (error) {
      console.error('Error saving custom question:', error);
      toast.error('Помилка збереження питання');
    } finally {
      setSavingCustom(false);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: request?.title || '',
      description: request?.description || '',
      required_skills: request?.required_skills || '',
      nice_to_have_skills: request?.nice_to_have_skills || '',
      soft_skills: request?.soft_skills || '',
      ai_orientation: request?.ai_orientation || 'preferred',
      red_flags: request?.red_flags || '',
      location: request?.location || '',
      employment_type: request?.employment_type || 'not_specified',
      remote_policy: request?.remote_policy || 'not_specified',
      priority: request?.priority || 'medium',
      status: request?.status || 'active',
      test_task_url: request?.test_task_url || '',
      test_task_deadline_days: request?.test_task_deadline_days || 3,
      test_task_message: request?.test_task_message || '',
      test_task_evaluation_criteria: request?.test_task_evaluation_criteria || '',
      job_description: request?.job_description || '',
      outreach_template: request?.outreach_template || '',
      outreach_template_approved: request?.outreach_template_approved || false,
      salary_range: request?.salary_range || '',
      vacancy_info: request?.vacancy_info || '',
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    setIsSubmitting(true);

    try {
      const url = isEdit ? `/api/requests/${request?.id}` : '/api/requests';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = {
        ...data,
        test_task_url: data.test_task_url || null,
        test_task_deadline_days: data.test_task_deadline_days || 3,
        test_task_message: data.test_task_message || null,
        test_task_evaluation_criteria: data.test_task_evaluation_criteria || null,
        job_description: data.job_description || null,
        outreach_template: data.outreach_template || null,
        outreach_template_approved: data.outreach_template_approved || false,
        salary_range: data.salary_range || null,
        vacancy_info: data.vacancy_info || null,
        questionnaire_competency_ids: randomCompetencyIds,
        questionnaire_question_ids: selectedQuestionIds,
        questionnaire_custom_questions: [],
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save request');
      }

      toast.success(isEdit ? 'Запит оновлено' : 'Запит створено');
      router.push('/dashboard/requests');
      router.refresh();
    } catch (error) {
      console.error('Error saving request:', error);
      toast.error('Помилка збереження запиту');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 1. Основна інформація */}
      <Card>
        <CardHeader>
          <CardTitle>Основна інформація</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Назва позиції *</Label>
            <Input
              id="title"
              placeholder="e.g., Senior Python Developer, Талановиті люди"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              placeholder="Детальний опис ролі, відповідальності, очікування..."
              rows={4}
              {...register('description')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Вимоги до кандидата */}
      <Card>
        <CardHeader>
          <CardTitle>Вимоги до кандидата</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="required_skills">Обов'язкові навички *</Label>
            <Textarea
              id="required_skills"
              rows={3}
              {...register('required_skills')}
            />
            {errors.required_skills && (
              <p className="text-sm text-red-600">{errors.required_skills.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nice_to_have_skills">Бажані навички</Label>
            <Textarea
              id="nice_to_have_skills"
              rows={2}
              {...register('nice_to_have_skills')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="red_flags">Red Flags</Label>
            <Textarea
              id="red_flags"
              placeholder="e.g., негативне ставлення до нових технологій, токсична поведінка"
              rows={2}
              {...register('red_flags')}
            />
            <p className="text-xs text-muted-foreground">
              Що автоматично дискваліфікує кандидата?
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Soft Skills Оцінка */}
      <Card>
        <CardHeader>
          <CardTitle>Soft Skills Оцінка</CardTitle>
          <p className="text-sm text-muted-foreground">
            Оберіть компетенції та питання. Для кожної компетенції можна обрати &quot;всі (3-4 випадкових)&quot; або вказати конкретні питання.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {competencies.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Компетенції ще не створені. Додайте їх у розділі &quot;Навички&quot; меню.
            </p>
          ) : (
            <div className="space-y-3">
              {competencies.filter(c => c.is_active).map(comp => {
                const activeQs = comp.questions.filter(q => q.is_active);
                const mode = competencyModes[comp.id];
                const isSelected = !!mode;

                return (
                  <div key={comp.id} className="border rounded-lg p-3 space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCompetency(comp.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{comp.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {activeQs.length} питань
                        </Badge>
                        {comp.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{comp.description}</p>
                        )}
                      </div>
                    </label>

                    {isSelected && (
                      <div className="ml-7 space-y-2">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`mode-${comp.id}`}
                              checked={mode === 'all'}
                              onChange={() => handleSetCompetencyMode(comp.id, 'all')}
                            />
                            Всі (3-4 випадкових)
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`mode-${comp.id}`}
                              checked={mode === 'specific'}
                              onChange={() => handleSetCompetencyMode(comp.id, 'specific')}
                            />
                            Обрати конкретні
                          </label>
                        </div>

                        {mode === 'specific' && (
                          <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                            {activeQs.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Питань ще немає</p>
                            ) : (
                              activeQs.map(q => (
                                <label key={q.id} className="flex items-start gap-2 cursor-pointer py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedQuestionIds.includes(q.id)}
                                    onChange={() => handleToggleQuestion(q.id)}
                                    className="mt-0.5"
                                  />
                                  <span className="text-sm">{q.text}</span>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add custom question to bank */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Додати нове питання до банку</Label>
            <div className="flex gap-2">
              <Select value={newCustomCompetencyId} onValueChange={setNewCustomCompetencyId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Компетенція" />
                </SelectTrigger>
                <SelectContent>
                  {competencies.filter(c => c.is_active).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newCustomQuestion}
                onChange={(e) => setNewCustomQuestion(e.target.value)}
                placeholder="Введіть питання..."
                className="flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveCustomQuestion(); } }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={saveCustomQuestion}
                disabled={!newCustomQuestion.trim() || !newCustomCompetencyId || savingCustom}
              >
                {savingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Додати
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Питання буде збережено в банк обраної компетенції та автоматично додано до цієї вакансії.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Деталі позиції */}
      <Card>
        <CardHeader>
          <CardTitle>Деталі позиції</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Локація</Label>
              <Input
                id="location"
                placeholder="e.g., Київ, Remote, Україна"
                {...register('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_range">Зарплатна вилка</Label>
              <Input
                id="salary_range"
                placeholder="напр. $1500–2500 або від $2000"
                {...register('salary_range')}
              />
              <p className="text-xs text-muted-foreground">
                Якщо не вказано — бот повідомить кандидатам, що вилка наразі погоджується
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment_type">Тип зайнятості</Label>
              <Select
                value={watch('employment_type')}
                onValueChange={(value) => setValue('employment_type', value as 'full-time' | 'part-time' | 'contract' | 'not_specified')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Не вказано</SelectItem>
                  <SelectItem value="full-time">Повна зайнятість</SelectItem>
                  <SelectItem value="part-time">Часткова зайнятість</SelectItem>
                  <SelectItem value="contract">Контракт</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remote_policy">Формат роботи</Label>
              <Select
                value={watch('remote_policy')}
                onValueChange={(value) => setValue('remote_policy', value as 'remote' | 'hybrid' | 'office' | 'not_specified')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Не вказано</SelectItem>
                  <SelectItem value="remote">Віддалено</SelectItem>
                  <SelectItem value="hybrid">Гібрид</SelectItem>
                  <SelectItem value="office">Офіс</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Пріоритет</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as 'high' | 'medium' | 'low')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Високий</SelectItem>
                  <SelectItem value="medium">Середній</SelectItem>
                  <SelectItem value="low">Низький</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as 'active' | 'paused' | 'closed')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активний</SelectItem>
                    <SelectItem value="paused">Призупинено</SelectItem>
                    <SelectItem value="closed">Закрито</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Додаткова інформація */}
      <Card>
        <CardHeader>
          <CardTitle>Додаткова інформація</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vacancy_info">Специфічна інформація по вакансії</Label>
            <Textarea
              id="vacancy_info"
              placeholder="Онбординг: перший тиждень у команді. Команда: 5 розробників, 2 QA. Випробувальний термін: 3 місяці. Графік: гнучкий, core-hours 11–17."
              rows={6}
              {...register('vacancy_info')}
            />
            <p className="text-sm text-muted-foreground">
              Бот використає цей текст, щоб відповідати на питання кандидатів про деталі роботи, яких немає у загальному описі вакансії.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Тестове завдання */}
      <Card>
        <CardHeader>
          <CardTitle>Тестове завдання</CardTitle>
          <p className="text-sm text-muted-foreground">
            Опціонально: налаштуйте тестове завдання, яке буде надіслано кандидатам після позитивної відповіді.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test_task_url">Посилання на тестове завдання</Label>
            <Input
              id="test_task_url"
              type="url"
              placeholder="https://notion.so/test-task або https://github.com/..."
              {...register('test_task_url')}
            />
            <p className="text-xs text-muted-foreground">
              Посилання на опис завдання (Notion, GitHub, Google Doc тощо). Залиште порожнім, якщо тестового немає.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_task_deadline_days">Дедлайн (днів після відправки)</Label>
            <Input
              id="test_task_deadline_days"
              type="number"
              min={1}
              max={14}
              {...register('test_task_deadline_days', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Скільки днів кандидат має на виконання завдання (за замовчуванням: 3 дні)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_task_message">Шаблон повідомлення</Label>
            <Textarea
              id="test_task_message"
              rows={6}
              placeholder={`Вітаю! 👋\n\nВаша заявка успішно пройшла попередній відбір. Наступний етап — тестове завдання.\n\nЗавдання: [посилання буде додано автоматично]\nДедлайн: [буде розраховано автоматично]\n\nЯкщо вам потрібно більше часу, напишіть — обговоримо!\n\nУспіхів! 💪`}
              className="font-mono text-sm"
              {...register('test_task_message')}
            />
            <p className="text-xs text-muted-foreground">
              Це повідомлення буде надіслано разом з тестовим завданням. Буде персоналізовано для кожного кандидата.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_task_evaluation_criteria">Критерії оцінювання</Label>
            <Textarea
              id="test_task_evaluation_criteria"
              rows={8}
              placeholder={`На що AI має звертати увагу при оцінці відповідей?\n\nПриклади:\n• Якість коду: чистий, читабельний, відповідає best practices\n• Підхід до вирішення: логічне, ефективне рішення\n• Увага до деталей: edge cases, обробка помилок\n• Комунікація: зрозумілі коментарі, документація\n• Креативність: інноваційні рішення, хороший UX\n\nБудьте конкретними щодо того, що важливо для цієї ролі.`}
              className="font-mono text-sm"
              {...register('test_task_evaluation_criteria')}
            />
            <p className="text-xs text-muted-foreground">
              AI використає ці критерії для оцінки відповідей від 1 до 10. Будьте конкретними та чіткими.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 7. Привітальне повідомлення для outreach */}
      <Card>
        <CardHeader>
          <CardTitle>Привітальне повідомлення для outreach</CardTitle>
          <p className="text-sm text-muted-foreground">
            AI персоналізує це повідомлення під кожного кандидата. Без затвердження шаблону автоматичний outreach не запуститься.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outreach_template">Шаблон повідомлення</Label>
            <Textarea
              id="outreach_template"
              rows={6}
              placeholder={`Привіт! Ми шукаємо {роль} у Vamos — AI-first компанію. Звернули увагу на твій досвід з {навичка}. Хочемо розповісти більше і дізнатись про тебе.`}
              className="font-mono text-sm"
              {...register('outreach_template')}
            />
            <p className="text-xs text-muted-foreground">
              Вкажіть тон, ключові меседжі та що згадати про вакансію. AI використає це як основу для персоналізації.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="outreach_template_approved"
              checked={watch('outreach_template_approved') || false}
              onCheckedChange={(checked) => setValue('outreach_template_approved', checked === true)}
            />
            <Label htmlFor="outreach_template_approved" className="text-sm font-normal cursor-pointer">
              Я підтверджую цей шаблон для автоматичного outreach
            </Label>
          </div>

          {!watch('outreach_template_approved') && watch('outreach_template') && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-md p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Автоматичний outreach не запуститься, поки шаблон не затверджено.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8. Опис вакансії для публікації */}
      <JobDescriptionGenerator
        formData={{
          title: watch('title'),
          required_skills: watch('required_skills'),
          nice_to_have_skills: watch('nice_to_have_skills'),
          soft_skills: watch('soft_skills'),
          description: watch('description'),
          location: watch('location'),
          employment_type: watch('employment_type'),
          remote_policy: watch('remote_policy'),
          ai_orientation: watch('ai_orientation'),
          red_flags: watch('red_flags'),
        }}
        value={watch('job_description') || ''}
        onChange={(description) => setValue('job_description', description)}
      />

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Скасувати
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Зберегти зміни' : 'Створити запит'}
        </Button>
      </div>
    </form>
  );
}
