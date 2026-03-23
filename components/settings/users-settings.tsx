'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserDialog } from './user-dialog';
import { Plus, Pencil, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ManagerRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager';
  is_active: boolean;
  created_at: string;
}

export function UsersSettings() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';

  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagerRow | null>(null);

  useEffect(() => {
    fetchManagers();
  }, []);

  async function fetchManagers() {
    setLoading(true);
    try {
      const res = await fetch('/api/managers');
      if (res.ok) setManagers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(manager: ManagerRow) {
    const res = await fetch(`/api/managers/${manager.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !manager.is_active }),
    });

    if (res.ok) {
      const updated: ManagerRow = await res.json();
      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(updated.is_active ? 'Користувача активовано' : 'Користувача деактивовано');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Помилка');
    }
  }

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(manager: ManagerRow) {
    setEditTarget(manager);
    setDialogOpen(true);
  }

  function handleSaved(updated: ManagerRow) {
    setManagers((prev) => {
      const idx = prev.findIndex((m) => m.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  }

  if (loading) {
    return <p className="text-muted-foreground p-4">Завантаження...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Користувачі</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Додати користувача
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ім&apos;я</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Роль</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => {
              const isSelf = m.id === currentUserId;
              return (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium">
                    {m.name}
                    {isSelf && <span className="ml-1 text-xs text-muted-foreground">(ви)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={m.role === 'admin' ? 'border-purple-300 text-purple-700' : ''}>
                      {m.role === 'admin' ? 'Admin' : 'Manager'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={m.is_active
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-gray-300 text-gray-500 bg-gray-50'}
                    >
                      {m.is_active ? 'Активний' : 'Неактивний'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(m)}
                        title="Редагувати"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {m.is_active ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => toggleActive(m)}
                          disabled={isSelf}
                          title={isSelf ? 'Не можна деактивувати себе' : 'Деактивувати'}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-green-600"
                          onClick={() => toggleActive(m)}
                          title="Активувати"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        manager={editTarget}
        currentUserId={currentUserId}
      />
    </div>
  );
}
