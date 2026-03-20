'use client';

import { cn } from '@/lib/utils';
import { MapPin, Briefcase, DollarSign } from 'lucide-react';

export interface OpenVacancy {
  id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  salary_range: string | null;
}

const employmentTypeLabels: Record<string, string> = {
  'full-time': 'Повна зайнятість',
  'part-time': 'Часткова зайнятість',
  contract: 'Контракт',
  not_specified: '',
};

interface VacancySelectorProps {
  vacancies: OpenVacancy[];
  selected: string[]; // UUID[]
  onChange: (ids: string[]) => void;
  allowUnknown?: boolean;
  error?: string;
}

export function VacancySelector({
  vacancies,
  selected,
  onChange,
  allowUnknown = true,
  error,
}: VacancySelectorProps) {
  const isUnknown = selected.length === 0 && allowUnknown;

  const handleVacancyToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleUnknownToggle = () => {
    if (isUnknown) {
      // De-select "unknown" — nothing to do, just stay empty
      // (user needs to pick a vacancy)
    } else {
      onChange([]);
    }
  };

  if (vacancies.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg border text-sm text-muted-foreground">
        Наразі немає відкритих вакансій. Ваша заявка буде розглянута для майбутніх позицій.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {vacancies.map((vacancy) => {
        const isSelected = selected.includes(vacancy.id);
        return (
          <label
            key={vacancy.id}
            className={cn(
              'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-gray-50',
            )}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleVacancyToggle(vacancy.id)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{vacancy.title}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                {vacancy.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {vacancy.location}
                  </span>
                )}
                {vacancy.employment_type && vacancy.employment_type !== 'not_specified' && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {employmentTypeLabels[vacancy.employment_type] || vacancy.employment_type}
                  </span>
                )}
                {vacancy.salary_range && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {vacancy.salary_range}
                  </span>
                )}
              </div>
            </div>
          </label>
        );
      })}

      {allowUnknown && (
        <label
          className={cn(
            'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors border-dashed',
            isUnknown
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-gray-50',
          )}
        >
          <input
            type="checkbox"
            checked={isUnknown}
            onChange={handleUnknownToggle}
            className="h-4 w-4 rounded border-gray-300 text-primary"
          />
          <span className="text-sm text-muted-foreground">
            Ще не знаю, на яку вакансію хочу — але хочу залишити резюме
          </span>
        </label>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
