'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ManagerRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager';
  is_active: boolean;
  created_at: string;
}

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (manager: ManagerRow) => void;
  manager?: ManagerRow | null; // null = create mode
  currentUserId: string;
}

function generatePassword() {
  const adjectives = ['river', 'stone', 'silver', 'bright', 'swift', 'calm', 'bold', 'clear'];
  const nouns = ['fox', 'lake', 'wind', 'tree', 'star', 'hill', 'wave', 'sky'];
  const num = Math.floor(Math.random() * 90) + 10;
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}-${num}`;
}

export function UserDialog({ open, onClose, onSaved, manager, currentUserId }: UserDialogProps) {
  const isEdit = !!manager;

  const [name, setName] = useState(manager?.name ?? '');
  const [email, setEmail] = useState(manager?.email ?? '');
  const [role, setRole] = useState<'admin' | 'manager'>(manager?.role ?? 'manager');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSelf = isEdit && manager?.id === currentUserId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isEdit ? `/api/managers/${manager!.id}` : '/api/managers';
      const method = isEdit ? 'PUT' : 'POST';

      const body: Record<string, unknown> = { name, email, role };
      if (!isEdit) {
        body.password = password;
      } else if (password) {
        body.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Помилка збереження');
        return;
      }

      if (!isEdit) {
        toast.success('Користувача створено. Збережіть пароль — він більше не буде показаний.');
      } else {
        toast.success('Збережено');
      }

      onSaved(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleGenerate() {
    setPassword(generatePassword());
    setShowPassword(true);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати користувача' : 'Створити користувача'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Ім&apos;я *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Марічка Іванова"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="manager@vamos.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Роль *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="manager"
                  checked={role === 'manager'}
                  onChange={() => setRole('manager')}
                  disabled={isSelf}
                />
                <span className="text-sm">Manager</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  disabled={isSelf}
                />
                <span className="text-sm">Admin</span>
              </label>
            </div>
            {isSelf && (
              <p className="text-xs text-muted-foreground">Не можна змінити власну роль</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {isEdit ? 'Новий пароль (залишити порожнім щоб не змінювати)' : 'Пароль *'}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isEdit}
                  minLength={isEdit ? undefined : 8}
                  placeholder={isEdit ? '••••••••' : 'Мін. 8 символів'}
                  className="pr-9"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerate} className="shrink-0">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Згенерувати
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Скасувати
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Збереження...' : isEdit ? 'Зберегти' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
