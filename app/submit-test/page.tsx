'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, FileText } from 'lucide-react';

function SubmitTestForm() {
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('id');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      alert('Будь ласка, введіть ваше рішення');
      return;
    }

    if (!feedback.trim()) {
      alert('Будь ласка, поділіться враженнями про тестове');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/test-task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          submissionText,
          candidateFeedback: feedback,
        }),
      });

      if (!response.ok) throw new Error('Submission failed');

      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Помилка при відправці. Спробуйте ще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!candidateId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Помилка</h1>
          <p className="text-gray-600">Невалідне посилання. Перевірте URL і спробуйте знову.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold">Дякуємо!</h1>
          <p className="text-gray-600">
            Ваше тестове завдання успішно відправлено. Ми перевіримо його найближчим часом і зв&apos;яжемося з вами.
          </p>
          <p className="text-sm text-gray-500">
            Можете закрити це вікно.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-red-50 to-white">
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Здача тестового завдання
              </h1>
              <p className="text-gray-600">
                Вставте ваше рішення нижче або надайте посилання на документ/репозиторій.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="submission">Ваше рішення *</Label>
              <Textarea
                id="submission"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={12}
                placeholder={`Вставте текст вашого рішення або посилання на Google Doc / GitHub / Figma...\n\nЯкщо це посилання, переконайтеся що доступ відкритий для перегляду.`}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="feedback">Ваші враження про тестове *</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="Як вам тестове? Складно було? Скільки часу витратили? Що сподобалось/не сподобалось?"
              />
              <p className="text-sm text-gray-500 mt-1">
                Ваш фідбек допоможе нам покращити тестові завдання
              </p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Відправляємо...
              </>
            ) : (
              'Відправити тестове'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SubmitTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <SubmitTestForm />
    </Suspense>
  );
}
