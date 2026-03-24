'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThankYouPage() {
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      setIsTelegram(true);
      tg.ready();
    }
  }, []);

  const handleClose = () => {
    window.Telegram?.WebApp?.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Заявку отримано!</h1>
        <p className="text-muted-foreground mb-6">
          Дякуємо за інтерес до Vamos. Ми розглянемо вашу заявку та звʼяжемося з вами найближчим часом.
        </p>

        {isTelegram ? (
          <Button onClick={handleClose} className="w-full">
            Закрити та повернутися в Telegram
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Повернутися на головну</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
