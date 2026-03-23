'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface BlacklistButtonProps {
  candidateId: string;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
}

export function BlacklistButton({ candidateId, isBlacklisted, blacklistReason }: BlacklistButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAddToBlacklist() {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Кандидата додано до чорного списку');
      setOpen(false);
      setReason('');
      router.refresh();
    } catch {
      toast.error('Помилка при додаванні до чорного списку');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveFromBlacklist() {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/blacklist`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Кандидата знято з чорного списку');
      router.refresh();
    } catch {
      toast.error('Помилка при знятті з чорного списку');
    } finally {
      setLoading(false);
    }
  }

  if (isBlacklisted) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="destructive"
          className="cursor-default"
          title={blacklistReason ? `Причина: ${blacklistReason}` : undefined}
        >
          <Ban className="w-3 h-3 mr-1" />
          Чорний список
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemoveFromBlacklist}
          disabled={loading}
        >
          <ShieldOff className="w-4 h-4 mr-1" />
          Зняти з чорного списку
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
          <Ban className="w-4 h-4 mr-1" />
          Чорний список
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Додати до чорного списку</DialogTitle>
          <DialogDescription>
            Кандидат не отримуватиме жодних автоматичних повідомлень. Його можна знайти в базі, але всі автоматичні дії будуть скасовані.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="blacklist-reason">Причина (необов&apos;язково)</Label>
          <Textarea
            id="blacklist-reason"
            placeholder="Наприклад: небажана поведінка під час співбесіди"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Скасувати
          </Button>
          <Button variant="destructive" onClick={handleAddToBlacklist} disabled={loading}>
            {loading ? 'Збереження...' : 'Додати до чорного списку'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
