'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [companyInfo, setCompanyInfo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings?key=company_info')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.value) setCompanyInfo(data.value);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'company_info', value: companyInfo }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Збережено');
    } catch {
      toast.error('Помилка збереження');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Налаштування</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Інформація про компанію</CardTitle>
          <CardDescription>
            Цей текст використовується ботом для відповідей на питання кандидатів у Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Textarea
                value={companyInfo}
                onChange={(e) => setCompanyInfo(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Інформація про компанію..."
              />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Зберегти
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
