'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { RequestCard } from '@/components/requests/request-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Request } from '@/lib/supabase/types';
import { Plus, Briefcase } from 'lucide-react';

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchRequests() {
      try {
        const response = await fetch('/api/requests');
        if (response.ok) {
          const data = await response.json();
          setRequests(data);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="Hiring Requests" />

      <div className="flex-1 p-6 space-y-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
                {statusFilter === 'all'
                  ? 'Створіть свій перший запит на найм'
                  : 'Немає запитів з таким статусом'}
              </p>
            </div>
            {statusFilter === 'all' && (
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
