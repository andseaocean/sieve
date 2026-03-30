'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface InboxItem {
  id: string;
  first_name: string;
  last_name: string;
  ai_score?: number | null;
  ai_category?: string | null;
  pipeline_stage: string;
  primary_request_title?: string | null;
  event_at: string;
}

interface InboxData {
  new: InboxItem[];
  analyzed: InboxItem[];
  questionnaire: InboxItem[];
  test: InboxItem[];
}

type TabKey = 'new' | 'analyzed' | 'questionnaire' | 'test';

const tabConfig: Record<TabKey, { label: string; emoji: string; hint: string }> = {
  new: { label: 'Нові заявки', emoji: '🔴', hint: 'Запустити AI аналіз' },
  analyzed: { label: 'Після аналізу', emoji: '🟡', hint: 'Надіслати аутріч' },
  questionnaire: { label: 'Анкети', emoji: '🟢', hint: 'Переглянути, надіслати тестове' },
  test: { label: 'Тестові', emoji: '🔵', hint: 'Прийняти рішення' },
};

const categoryLabels: Record<string, string> = {
  top_tier: 'Топ',
  strong: 'Сильний',
  potential: 'Потенційний',
  not_fit: 'Не підходить',
};

function formatRelative(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'щойно';
  if (mins < 60) return `${mins} хв тому`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  return `${days} дн тому`;
}

function InboxItemRow({ item, hint }: { item: InboxItem; hint: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {item.first_name} {item.last_name}
          </span>
          {item.ai_score != null && (
            <Badge variant="outline" className="text-xs">
              {item.ai_score}/10
            </Badge>
          )}
          {item.ai_category && (
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[item.ai_category] ?? item.ai_category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.primary_request_title && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {item.primary_request_title}
            </span>
          )}
          {item.event_at && (
            <span className="text-xs text-muted-foreground">
              · {formatRelative(item.event_at)}
            </span>
          )}
        </div>
      </div>
      <Link
        href={`/dashboard/candidates/${item.id}`}
        className="ml-3 text-xs text-primary hover:underline whitespace-nowrap"
      >
        → Картка
      </Link>
    </div>
  );
}

export function InboxBlock() {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('new');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/candidates/inbox');
        if (res.ok) {
          const json = await res.json();
          setData(json);
          // Auto-select first non-empty tab
          const tabs: TabKey[] = ['new', 'analyzed', 'questionnaire', 'test'];
          for (const t of tabs) {
            if (json[t]?.length > 0) {
              setActiveTab(t);
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error loading inbox:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allEmpty = data && data.new.length === 0 && data.analyzed.length === 0 && data.questionnaire.length === 0 && data.test.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          📥 Потребують уваги
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : allEmpty ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">✅ Усе переглянуто, нічого не очікує на увагу</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 flex-wrap mb-4">
              {(Object.keys(tabConfig) as TabKey[]).map((tab) => {
                const count = data?.[tab]?.length ?? 0;
                const cfg = tabConfig[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-primary text-white'
                        : count === 0
                        ? 'text-muted-foreground bg-gray-100'
                        : 'text-foreground bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {cfg.emoji} {cfg.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Hint */}
            <p className="text-xs text-muted-foreground mb-3">
              Дія: {tabConfig[activeTab].hint}
            </p>

            {/* Items */}
            <div>
              {(data?.[activeTab] ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  У цій категорії нічого немає
                </p>
              ) : (
                (data?.[activeTab] ?? []).map((item) => (
                  <InboxItemRow key={item.id} item={item} hint={tabConfig[activeTab].hint} />
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
