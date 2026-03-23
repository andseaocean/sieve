'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { RequestCard } from '@/components/requests/request-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Request } from '@/lib/supabase/types';
import { Plus, Briefcase } from 'lucide-react';

interface ManagerRef {
  id: string;
  name: string;
}

type RequestWithTeam = Request & {
  created_by_manager: ManagerRef | null;
  request_managers: { manager_id: string }[];
};

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') ?? 'all') as 'all' | 'mine';

  const [requests, setRequests] = useState<RequestWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === 'mine' ? '/api/requests?filter=mine' : '/api/requests';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function handleTabChange(value: string) {
    router.push(`/dashboard/requests?tab=${value}`);
  }

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="Вакансії" />

      <div className="flex-1 p-6 space-y-6">
        {/* Tabs + Actions bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all">Всі вакансії</TabsTrigger>
                <TabsTrigger value="mine">Мої вакансії</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Фільтр за статусом" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі статуси</SelectItem>
                <SelectItem value="active">Активні</SelectItem>
                <SelectItem value="paused">Призупинені</SelectItem>
                <SelectItem value="closed">Закриті</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Link href="/dashboard/requests/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Створити запит
            </Button>
          </Link>
        </div>

        {/* Requests list */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Завантаження...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="p-4 rounded-full bg-gray-100">
              <Briefcase className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">Немає запитів</h3>
              <p className="text-muted-foreground">
                {tab === 'mine'
                  ? 'Вакансій, де ви є автором або менеджером, не знайдено'
                  : statusFilter === 'all'
                  ? 'Створіть свій перший запит на найм'
                  : 'Немає запитів з таким статусом'}
              </p>
            </div>
            {tab === 'all' && statusFilter === 'all' && (
              <Link href="/dashboard/requests/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Створити запит
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
