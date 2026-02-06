'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Home, Sparkles, X } from 'lucide-react';
import '@/lib/telegram/types';

export default function ThankYouPage() {
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      setIsTelegram(true);
    }
  }, []);

  const handleCloseMiniApp = () => {
    window.Telegram?.WebApp.close();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold mb-4">
            Дякуємо за вашу заявку!
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            Ми отримали вашу заявку та почнемо її розгляд найближчим часом.
            Ви отримаєте повідомлення на вказаний email.
          </p>

          {/* AI Processing Card */}
          <Card className="mb-8 text-left">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">AI аналізує вашу заявку</h3>
                  <p className="text-sm text-muted-foreground">
                    Наша система автоматично аналізує ваш профіль та підбирає
                    найбільш відповідні вакансії. Це допоможе нам швидше
                    знайти ідеальну позицію саме для вас.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card className="mb-8 text-left">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Що далі?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ваша заявка буде проаналізована нашою AI системою
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    HR менеджер перегляне ваш профіль та AI рекомендації
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    За позитивного рішення ми зв&apos;яжемося з вами для інтерв&apos;ю
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-3">
            {/* Close Mini App — only in Telegram */}
            {isTelegram && (
              <Button size="lg" onClick={handleCloseMiniApp}>
                <X className="h-4 w-4 mr-2" />
                Закрити та повернутися в Telegram
              </Button>
            )}

            {/* Back to Home — only on web */}
            {!isTelegram && (
              <Link href="/">
                <Button size="lg" variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Повернутися на головну
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
