'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ConversationItem {
  id: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string;
  sent_at: string;
  metadata: Record<string, unknown> | null;
}

interface ConversationsTabProps {
  candidateId: string;
}

const messageTypeConfig: Record<string, { icon: string; label: string }> = {
  intro: { icon: '📨', label: 'Надіслано аутріч' },
  outreach: { icon: '📨', label: 'Надіслано аутріч' },
  text: { icon: '💬', label: 'Кандидат написав' },
  candidate_response: { icon: '💬', label: 'Кандидат написав' },
  answer: { icon: '🤖', label: 'Відповідь бота' },
  ai_reply: { icon: '🤖', label: 'Відповідь бота' },
  test_task: { icon: '📋', label: 'Надіслано тестове' },
  test_task_decision: { icon: '✅', label: 'Рішення по тестовому' },
  manual_stage_change: { icon: '🔄', label: 'Зміна статусу' },
  questionnaire_sent: { icon: '📝', label: 'Надіслано анкету' },
  questionnaire_submitted: { icon: '📝', label: 'Анкету заповнено' },
  deadline_extension_request: { icon: '⏰', label: 'Запит на продовження' },
  deadline_extension_granted: { icon: '⏰', label: 'Продовження надано' },
  deadline_extension_denied: { icon: '⏰', label: 'Продовження відхилено' },
};

function getConfig(messageType: string, direction: string) {
  if (messageType === 'text' && direction === 'inbound') {
    return { icon: '💬', label: 'Кандидат написав' };
  }
  return messageTypeConfig[messageType] || { icon: '→', label: 'Системне повідомлення' };
}

function isSystemEvent(messageType: string) {
  return messageType === 'manual_stage_change';
}

export function ConversationsTab({ candidateId }: ConversationsTabProps) {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/candidates/${candidateId}/conversations?sort=${sort}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [candidateId, sort]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Сортування:</span>
        <button
          onClick={() => setSort('asc')}
          className={`text-sm px-3 py-1 rounded-md border transition-colors ${
            sort === 'asc'
              ? 'bg-primary text-white border-primary'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          ↑ Від найдавнішого
        </button>
        <button
          onClick={() => setSort('desc')}
          className={`text-sm px-3 py-1 rounded-md border transition-colors ${
            sort === 'desc'
              ? 'bg-primary text-white border-primary'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          ↓ Від найновішого
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Записів у хронології немає</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const config = getConfig(item.message_type, item.direction);
            const isSystem = isSystemEvent(item.message_type);
            const displayContent = item.content || (item.metadata ? JSON.stringify(item.metadata) : 'Системна подія');

            if (isSystem) {
              return (
                <div key={item.id} className="text-center py-2">
                  <span className="text-xs text-muted-foreground">
                    {config.icon} {config.label}
                    {item.content ? ` — ${item.content}` : ''}
                    {' · '}
                    {formatDateTime(item.sent_at)}
                  </span>
                </div>
              );
            }

            const isInbound = item.direction === 'inbound';

            return (
              <div
                key={item.id}
                className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg border p-3 space-y-1 ${
                    isInbound
                      ? 'bg-gray-50 border-l-4 border-l-gray-400 border-t-gray-200 border-r-gray-200 border-b-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {config.icon} {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.sent_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
