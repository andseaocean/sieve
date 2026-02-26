'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { QuestionnaireForm } from './questionnaire-form';
import { useParams } from 'next/navigation';

function QuestionnaireContent() {
  const params = useParams();
  const token = params.token as string;

  return <QuestionnaireForm token={token} />;
}

export default function QuestionnairePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <QuestionnaireContent />
    </Suspense>
  );
}
