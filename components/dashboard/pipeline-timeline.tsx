'use client';

import type { PipelineStage } from '@/lib/supabase/types';

interface PipelineTimelineProps {
  currentStage: PipelineStage;
}

const stages: { key: PipelineStage; label: string }[] = [
  { key: 'new', label: 'Заявка' },
  { key: 'analyzed', label: 'AI аналіз' },
  { key: 'outreach_sent', label: 'Outreach' },
  { key: 'questionnaire_sent', label: 'Анкета' },
  { key: 'test_sent', label: 'Тестове' },
  { key: 'interview', label: "Інтерв'ю" },
];

const terminalStages: Record<string, string> = {
  outreach_declined: 'Відмовився від outreach',
  rejected: 'Відхилено',
  hired: 'Найнято',
};

function getStageIndex(stage: PipelineStage): number {
  // Map intermediate stages to their parent
  const mapping: Record<string, string> = {
    questionnaire_done: 'questionnaire_sent',
    test_done: 'test_sent',
  };
  const mapped = mapping[stage] || stage;
  return stages.findIndex(s => s.key === mapped);
}

export function PipelineTimeline({ currentStage }: PipelineTimelineProps) {
  const isTerminal = currentStage in terminalStages;
  const currentIndex = isTerminal ? stages.length : getStageIndex(currentStage);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex && !isTerminal;
        const isFuture = index > currentIndex;

        return (
          <div key={stage.key} className="flex items-center">
            {/* Stage dot + label */}
            <div className="flex flex-col items-center min-w-[60px]">
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  isCompleted
                    ? 'bg-green-500 border-green-500'
                    : isCurrent
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-300'
                }`}
              />
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  isCurrent
                    ? 'font-semibold text-blue-600'
                    : isCompleted
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line */}
            {index < stages.length - 1 && (
              <div
                className={`h-0.5 w-6 mx-0.5 ${
                  isCompleted && !isFuture ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}

      {/* Terminal state badge */}
      {isTerminal && (
        <div className="ml-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              currentStage === 'hired'
                ? 'bg-emerald-100 text-emerald-700'
                : currentStage === 'rejected'
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {terminalStages[currentStage]}
          </span>
        </div>
      )}
    </div>
  );
}
