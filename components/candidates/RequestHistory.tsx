'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface RequestHistoryEntry {
  id: string;
  from_request_id: string | null;
  to_request_id: string | null;
  from_request_title?: string | null;
  to_request_title?: string | null;
  changed_by_name?: string | null;
  reason: string;
  notes: string | null;
  created_at: string;
}

const reasonLabels: Record<string, string> = {
  initial_application: 'Подача',
  manager_reassign: 'Змінено менеджером',
  new_request_scan: 'Призначено при скануванні бази',
  auto_best_match: 'Авто (найвищий AI-score)',
};

interface RequestHistoryProps {
  history: RequestHistoryEntry[];
}

export function RequestHistory({ history }: RequestHistoryProps) {
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between h-auto py-0 px-0 hover:bg-transparent"
          onClick={() => setOpen(!open)}
        >
          <span className="font-medium text-sm">
            {open ? <ChevronDown className="h-4 w-4 inline mr-1" /> : <ChevronRight className="h-4 w-4 inline mr-1" />}
            Історія змін вакансії ({history.length})
          </span>
        </Button>

        {open && (
          <div className="mt-4 space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="border-l-2 border-muted pl-3 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                  <span className="text-xs font-medium">{reasonLabels[entry.reason] ?? entry.reason}</span>
                </div>
                <div className="text-sm">
                  {entry.from_request_title && (
                    <span className="text-muted-foreground">{entry.from_request_title} → </span>
                  )}
                  <span className="font-medium">{entry.to_request_title ?? 'Без вакансії'}</span>
                </div>
                {entry.changed_by_name && (
                  <p className="text-xs text-muted-foreground">{entry.changed_by_name}</p>
                )}
                {entry.notes && (
                  <p className="text-xs text-muted-foreground italic">&ldquo;{entry.notes}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
