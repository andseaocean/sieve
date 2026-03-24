'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { UsersSettings } from '@/components/settings/users-settings';
import { Header } from '@/components/dashboard/header';

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

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
    <div className="flex flex-col h-full">
      <Header title="Налаштування" />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="company">
            <TabsList>
              <TabsTrigger value="company">Company Info</TabsTrigger>
              {isAdmin && <TabsTrigger value="users">Користувачі</TabsTrigger>}
            </TabsList>

            <TabsContent value="company" className="mt-6">
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
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users" className="mt-6">
                <UsersSettings />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
