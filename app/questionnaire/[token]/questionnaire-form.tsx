'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, ClipboardList, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { QuestionnaireQuestionSnapshot } from '@/lib/supabase/types';

type PageState = 'loading' | 'not_found' | 'expired' | 'completed' | 'welcome' | 'active' | 'submitted';

interface QuestionnaireData {
  status: string;
  questions: QuestionnaireQuestionSnapshot[];
  expires_at: string | null;
  company_name: string;
}

interface QuestionnaireFormProps {
  token: string;
}

export function QuestionnaireForm({ token }: QuestionnaireFormProps) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [data, setData] = useState<QuestionnaireData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/questionnaire/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setPageState('not_found');
            return;
          }
          throw new Error('Failed to fetch');
        }

        const result = await res.json();

        if (result.status === 'expired') {
          setPageState('expired');
          return;
        }

        if (result.status === 'completed') {
          setPageState('completed');
          return;
        }

        setData(result);
        // Initialize answers object
        const initialAnswers: Record<string, string> = {};
        (result.questions || []).forEach((q: QuestionnaireQuestionSnapshot) => {
          initialAnswers[q.question_id] = '';
        });
        setAnswers(initialAnswers);

        // If already in_progress, go directly to form
        if (result.status === 'in_progress') {
          setPageState('active');
        } else {
          setPageState('welcome');
        }
      } catch (error) {
        console.error('Error fetching questionnaire:', error);
        setPageState('not_found');
      }
    }

    fetchData();
  }, [token]);

  const handleStart = async () => {
    try {
      await fetch(`/api/questionnaire/${token}/start`, { method: 'POST' });
      setPageState('active');
    } catch (error) {
      console.error('Error starting questionnaire:', error);
    }
  };

  const handleSubmit = async () => {
    if (!data) return;

    // Validate all answers have min 50 chars
    const incomplete = data.questions.filter(q => (answers[q.question_id] || '').trim().length < 50);
    if (incomplete.length > 0) {
      alert(`Будь ласка, дайте розгорнуту відповідь на всі питання (мінімум 50 символів). Залишилось: ${incomplete.length} питань.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/questionnaire/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Submission failed');
      }

      setPageState('submitted');
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Помилка при відправці. Спробуйте ще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Not found
  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Посилання не знайдено</h1>
          <p className="text-gray-600">Перевірте URL і спробуйте знову.</p>
        </div>
      </div>
    );
  }

  // Expired
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-md w-full text-center space-y-4">
          <Clock className="w-16 h-16 text-orange-400 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Час вийшов</h1>
          <p className="text-gray-600">Дедлайн для заповнення анкети минув. Зверніться до рекрутера.</p>
        </div>
      </div>
    );
  }

  // Already completed
  if (pageState === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold">Анкету вже заповнено</h1>
          <p className="text-gray-600">Ви вже надіслали свої відповіді. Дякуємо!</p>
        </div>
      </div>
    );
  }

  // Submitted
  if (pageState === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold">Дякуємо!</h1>
          <p className="text-gray-600">
            Ваші відповіді успішно відправлені. Ми розглянемо їх найближчим часом.
          </p>
          <p className="text-sm text-gray-500">Можете закрити це вікно.</p>
        </div>
      </div>
    );
  }

  // Loading
  if (pageState === 'loading' || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Welcome screen
  if (pageState === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{data.company_name}</h1>
          <p className="text-gray-600">
            Анкета для оцінки soft skills
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <p>{data.questions.length} питань</p>
            <p>Орієнтовний час: 20-30 хвилин</p>
            {data.expires_at && (
              <p>Дедлайн: {new Date(data.expires_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Відповідайте чесно та детально. Ми цінуємо конкретні приклади з вашого досвіду.
          </p>
          <Button onClick={handleStart} size="lg" className="w-full">
            Розпочати
          </Button>
        </div>
      </div>
    );
  }

  // Active form
  // Group questions by competency
  const groupedQuestions: Record<string, QuestionnaireQuestionSnapshot[]> = {};
  data.questions.forEach(q => {
    if (!groupedQuestions[q.competency_name]) {
      groupedQuestions[q.competency_name] = [];
    }
    groupedQuestions[q.competency_name].push(q);
  });

  const totalQuestions = data.questions.length;
  const answeredQuestions = data.questions.filter(q => (answers[q.question_id] || '').trim().length >= 50).length;

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-red-50 to-white">
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Анкета Soft Skills</h1>
              <p className="text-gray-600">
                Заповнено: {answeredQuestions} з {totalQuestions}
              </p>
            </div>
          </div>

          {/* Questions grouped by competency */}
          {Object.entries(groupedQuestions).map(([competencyName, questions]) => (
            <div key={competencyName} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
                {competencyName}
              </h2>

              {questions.map((question) => {
                const answer = answers[question.question_id] || '';
                const charCount = answer.trim().length;
                const isValid = charCount >= 50;

                return (
                  <div key={question.question_id} className="space-y-2">
                    <Label className="text-sm font-medium leading-relaxed">
                      {question.text}
                    </Label>
                    <Textarea
                      value={answer}
                      onChange={(e) => updateAnswer(question.question_id, e.target.value)}
                      rows={5}
                      placeholder="Розкажіть детально, наведіть конкретний приклад з вашого досвіду..."
                    />
                    <p className={`text-xs ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {charCount}/50 символів {isValid ? '✓' : '(мінімум 50)'}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || answeredQuestions < totalQuestions}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Відправляємо...
              </>
            ) : (
              'Надіслати відповіді'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
