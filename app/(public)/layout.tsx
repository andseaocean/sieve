'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import '@/lib/telegram/types';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      setIsTelegram(true);

      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      console.log('Running in Telegram Mini App');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — hidden in Telegram Mini App */}
      {!isTelegram && (
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="font-bold text-xl">Vamos</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link href="/apply">
                <Button>Подати заявку</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost">Вхід для менеджерів</Button>
              </Link>
            </nav>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer — hidden in Telegram Mini App */}
      {!isTelegram && (
        <footer className="border-t bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="font-semibold">Vamos</span>
              </div>

              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Vamos. Всі права захищені.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
