'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  label: string;
}

interface CandidateTOCProps {
  outreachVisible: boolean;
  questionnaireVisible: boolean;
  testTaskVisible: boolean;
}

function buildItems(outreachVisible: boolean, questionnaireVisible: boolean, testTaskVisible: boolean): TocItem[] {
  const items: TocItem[] = [
    { id: 'priority-block', label: 'Пріоритет' },
    { id: 'section-profile', label: 'Профіль' },
    { id: 'section-ai-analysis', label: 'AI-аналіз' },
    { id: 'section-vacancy', label: 'Вакансія' },
  ];
  if (outreachVisible) items.push({ id: 'section-outreach', label: 'Аутріч' });
  if (questionnaireVisible) items.push({ id: 'section-questionnaire', label: 'Анкета' });
  if (testTaskVisible) items.push({ id: 'section-test-task', label: 'Тестове завдання' });
  items.push({ id: 'section-comments', label: 'Коментарі' });
  items.push({ id: 'section-history', label: 'Історія змін' });
  return items;
}

export function CandidateTOC({ outreachVisible, questionnaireVisible, testTaskVisible }: CandidateTOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const items = buildItems(outreachVisible, questionnaireVisible, testTaskVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outreachVisible, questionnaireVisible, testTaskVisible]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-4 self-start">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          📋 Зміст
        </p>
        <nav className="space-y-1">
          {items.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
                activeId === id
                  ? 'text-primary font-medium bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
              }`}
            >
              {activeId === id ? '▸ ' : ''}{label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
