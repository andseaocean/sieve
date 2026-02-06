'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Request } from '@/lib/supabase/types';
import { Loader2 } from 'lucide-react';

const requestSchema = z.object({
  title: z.string().min(1, 'Назва обов\'язкова'),
  description: z.string().optional(),
  required_skills: z.string().min(1, 'Обов\'язкові навички обов\'язкові'),
  nice_to_have_skills: z.string().optional(),
  soft_skills: z.string().min(1, 'Soft skills обов\'язкові'),
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
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestFormProps {
  request?: Request;
  isEdit?: boolean;
}

export function RequestForm({ request, isEdit = false }: RequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      <Card>
        <CardHeader>
          <CardTitle>Вимоги до кандидата</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="required_skills">Обов'язкові навички *</Label>
            <Textarea
              id="required_skills"
              placeholder="e.g., Python 3+ років, React, досвід з REST API"
              rows={3}
              {...register('required_skills')}
            />
            <p className="text-xs text-muted-foreground">
              Перелічіть обов'язкові технічні навички
            </p>
            {errors.required_skills && (
              <p className="text-sm text-red-600">{errors.required_skills.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nice_to_have_skills">Бажані навички</Label>
            <Textarea
              id="nice_to_have_skills"
              placeholder="e.g., TypeScript, Docker, AWS"
              rows={2}
              {...register('nice_to_have_skills')}
            />
            <p className="text-xs text-muted-foreground">
              Додаткові навички, які були б плюсом
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="soft_skills">Soft Skills *</Label>
            <Textarea
              id="soft_skills"
              placeholder="e.g., самостійність, швидке навчання, вміння працювати в команді"
              rows={2}
              {...register('soft_skills')}
            />
            <p className="text-xs text-muted-foreground">
              Які особисті якості важливі для цієї ролі?
            </p>
            {errors.soft_skills && (
              <p className="text-sm text-red-600">{errors.soft_skills.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai_orientation">AI Орієнтація</Label>
            <Select
              value={watch('ai_orientation')}
              onValueChange={(value) => setValue('ai_orientation', value as 'critical' | 'preferred' | 'not_important')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Критично важливо</SelectItem>
                <SelectItem value="preferred">Бажано</SelectItem>
                <SelectItem value="not_important">Не важливо</SelectItem>
              </SelectContent>
            </Select>
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

          {watch('test_task_url') && (
            <>
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
            </>
          )}
        </CardContent>
      </Card>

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
