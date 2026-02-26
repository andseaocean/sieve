'use client';

import { Header } from '@/components/dashboard/header';
import { QuestionnaireSettings } from '@/components/settings/questionnaire-settings';

export default function QuestionnaireSettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Банк soft skills питань" />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <QuestionnaireSettings />
        </div>
      </div>
    </div>
  );
}
