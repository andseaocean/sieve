'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, X, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getInitials } from '@/lib/utils';

interface ManagerInfo {
  id: string;
  name: string;
  email: string;
}

interface RequestManagerEntry {
  id: string;
  manager_id: string;
  added_at: string;
  manager: ManagerInfo | null;
}

interface RequestTeamProps {
  requestId: string;
  createdBy: string | null;
  createdByManager: ManagerInfo | null;
  initialManagers: RequestManagerEntry[];
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500',
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export function RequestTeam({
  requestId,
  createdBy,
  createdByManager,
  initialManagers,
}: RequestTeamProps) {
  const [managers, setManagers] = useState<RequestManagerEntry[]>(initialManagers);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ManagerInfo[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentManagerIds = new Set(managers.map((m) => m.manager_id));

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`/api/managers/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data: ManagerInfo[] = await res.json();
          setSearchResults(data.filter((m) => !currentManagerIds.has(m.id)));
          setShowDropdown(true);
        }
      } finally {
        setIsSearching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [managers]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(searchQuery), 300);
  }, [searchQuery, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function addManager(manager: ManagerInfo) {
    const res = await fetch(`/api/requests/${requestId}/managers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manager_id: manager.id }),
    });

    if (res.ok) {
      setManagers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          manager_id: manager.id,
          added_at: new Date().toISOString(),
          manager,
        },
      ]);
      setSearchQuery('');
      setShowDropdown(false);
      setShowSearch(false);
      toast.success(`${manager.name} доданий до команди`);
    } else {
      toast.error('Помилка додавання менеджера');
    }
  }

  async function removeManager(entry: RequestManagerEntry) {
    const res = await fetch(`/api/requests/${requestId}/managers/${entry.manager_id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setManagers((prev) => prev.filter((m) => m.manager_id !== entry.manager_id));
      toast.success('Менеджера видалено');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Помилка видалення');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Команда</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Author */}
        {createdByManager && (
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={`text-white text-xs ${colorForId(createdByManager.id)}`}>
                {getInitials(createdByManager.name.split(' ')[0], createdByManager.name.split(' ')[1] || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{createdByManager.name}</p>
              <p className="text-xs text-muted-foreground truncate">{createdByManager.email}</p>
            </div>
            <span title="Автор вакансії, не можна видалити" className="shrink-0">
              <Crown className="h-4 w-4 text-amber-500" />
            </span>
          </div>
        )}

        {/* Other managers */}
        {managers
          .filter((m) => m.manager_id !== createdBy)
          .map((entry) => {
            const mgr = entry.manager;
            if (!mgr) return null;
            const nameParts = mgr.name.split(' ');
            return (
              <div key={entry.manager_id} className="flex items-center gap-3 py-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`text-white text-xs ${colorForId(mgr.id)}`}>
                    {getInitials(nameParts[0], nameParts[1] || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mgr.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{mgr.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-600"
                  onClick={() => removeManager(entry)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

        {/* Add manager */}
        {showSearch ? (
          <div ref={searchRef} className="relative mt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-8 h-8 text-sm"
                placeholder="Пошук за іменем або email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-md">
                {isSearching ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Пошук...</p>
                ) : searchResults.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Нічого не знайдено</p>
                ) : (
                  searchResults.map((m) => (
                    <button
                      key={m.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex flex-col"
                      onClick={() => addManager(m)}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.email}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-7 text-xs text-muted-foreground"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setShowDropdown(false);
              }}
            >
              Скасувати
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowSearch(true)}
          >
            <Plus className="h-3 w-3" />
            Додати менеджера
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
