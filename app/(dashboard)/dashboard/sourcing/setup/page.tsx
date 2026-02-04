'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  BookmarkIcon,
  CheckCircle2,
  ExternalLink,
  Play,
  Linkedin,
  Github,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

export default function SetupPage() {
  const [bookmarkletCode, setBookmarkletCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const bookmarkletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/bookmarklet')
      .then((res) => res.json())
      .then((data) => {
        setBookmarkletCode(data.bookmarklet);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load bookmarklet:', error);
        setIsLoading(false);
      });
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopied(true);
      toast.success('Код скопійовано!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Не вдалося скопіювати');
    }
  };

  // Render the bookmarklet link outside of React using a ref
  useEffect(() => {
    if (bookmarkletCode && bookmarkletRef.current) {
      // Create the link element manually to bypass React's XSS protection
      bookmarkletRef.current.innerHTML = `
        <a
          href="${bookmarkletCode}"
          onclick="event.preventDefault(); alert('Перетягніть цю кнопку на панель закладок браузера.\\n\\nАбо скористайтесь інструкцією нижче для ручного створення закладки.');"
          style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: hsl(var(--primary)); color: white; border-radius: 8px; font-weight: 600; font-size: 18px; text-decoration: none; cursor: grab; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
          draggable="true"
        >
          <span style="font-size: 20px;">📊</span>
          Vamos Quick Check
        </a>
      `;
    }
  }, [bookmarkletCode]);

  return (
    <div className="flex flex-col h-full">
      <Header title="Налаштування Quick Check" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Vamos Quick Check</h1>
            <p className="text-muted-foreground text-lg">
              Аналізуйте профілі кандидатів з LinkedIn, GitHub, DOU, Djinni та Work.ua одним кліком
            </p>
          </div>

          {/* Main Installation Card */}
          <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookmarkIcon className="h-5 w-5 text-primary" />
                Крок 1: Встановіть букмарклет
              </CardTitle>
              <CardDescription>
                Перетягніть кнопку нижче на панель закладок вашого браузера
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bookmarklet Button - Method 1: Drag */}
              <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg border">
                <Badge variant="secondary" className="mb-2">Спосіб 1: Перетягування</Badge>
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Перетягніть кнопку нижче на панель закладок
                </p>

                {isLoading ? (
                  <div className="px-6 py-3 bg-gray-200 rounded-lg animate-pulse">
                    Завантаження...
                  </div>
                ) : (
                  <div ref={bookmarkletRef} className="bookmarklet-container">
                    {/* Bookmarklet link will be inserted here via useEffect */}
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Якщо перетягування не працює, скористайтесь способом 2 нижче
                </p>
              </div>

              {/* Method 2: Manual */}
              <div className="p-6 bg-gray-50 rounded-lg border">
                <Badge variant="outline" className="mb-4">Спосіб 2: Ручне створення</Badge>
                <ol className="text-sm space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Натисніть кнопку нижче, щоб скопіювати код букмарклету</span>
                  </li>
                  <li>
                    <Button
                      onClick={handleCopyCode}
                      variant={copied ? "default" : "secondary"}
                      className="w-full gap-2 my-2"
                      disabled={isLoading}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Скопійовано!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Копіювати код букмарклету
                        </>
                      )}
                    </Button>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>Створіть нову закладку в браузері (Ctrl+D / Cmd+D)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Назвіть її <strong>"Vamos Quick Check"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>У поле URL вставте скопійований код (Ctrl+V / Cmd+V)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">5.</span>
                    <span>Збережіть закладку</span>
                  </li>
                </ol>
              </div>

              {/* Browser Instructions */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Chrome / Edge / Opera</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Натисніть Ctrl+Shift+B щоб показати панель закладок</li>
                    <li>2. Перетягніть кнопку вище на панель</li>
                    <li>3. Готово!</li>
                  </ol>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Safari / Firefox</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Показати панель закладок (View → Show Bookmarks Bar)</li>
                    <li>2. Перетягніть кнопку на панель</li>
                    <li>3. Готово!</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Крок 2: Підтримувані платформи
              </CardTitle>
              <CardDescription>
                Букмарклет працює на профільних сторінках цих платформ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Linkedin className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-xs text-muted-foreground">Повні профілі з навичками</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Github className="h-8 w-8 text-gray-800" />
                  <div>
                    <p className="font-medium">GitHub</p>
                    <p className="text-xs text-muted-foreground">Профілі розробників</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <span className="text-2xl">🇺🇦</span>
                  <div>
                    <p className="font-medium">DOU.ua</p>
                    <p className="text-xs text-muted-foreground">Українські IT-спеціалісти</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <span className="text-2xl">👨‍💻</span>
                  <div>
                    <p className="font-medium">Djinni.co</p>
                    <p className="text-xs text-muted-foreground">IT-рекрутинг</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <span className="text-2xl">💼</span>
                  <div>
                    <p className="font-medium">Work.ua</p>
                    <p className="text-xs text-muted-foreground">Резюме кандидатів</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Крок 3: Як використовувати
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Відкрийте профіль кандидата</p>
                    <p className="text-sm text-muted-foreground">
                      Перейдіть на сторінку профілю на будь-якій підтримуваній платформі
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Натисніть букмарклет</p>
                    <p className="text-sm text-muted-foreground">
                      Клацніть "Vamos Quick Check" на панелі закладок
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Зачекайте 2-3 секунди</p>
                    <p className="text-sm text-muted-foreground">
                      Букмарклет зчитає дані з профілю та відкриє аналіз у новій вкладці
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Отримайте AI-аналіз</p>
                    <p className="text-sm text-muted-foreground">
                      Побачите оцінку кандидата, матчинг з запитами та готове повідомлення для аутрічу
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Вирішення проблем
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-medium text-amber-800">Букмарклет не працює?</p>
                  <ul className="mt-2 text-sm text-amber-700 space-y-1">
                    <li>• Переконайтесь, що ви на сторінці профілю (не пошуку)</li>
                    <li>• Оновіть сторінку та спробуйте ще раз</li>
                    <li>• Перевірте, що ви залогінені на платформі</li>
                    <li>• Деякі профілі можуть бути приватними</li>
                  </ul>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium mb-2">LinkedIn</p>
                    <p className="text-sm text-muted-foreground">
                      Працює найкраще на повних профілях. Букмарклет автоматично розгортає приховані секції.
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium mb-2">GitHub</p>
                    <p className="text-sm text-muted-foreground">
                      Працює на сторінках профілю користувача (не репозиторіїв).
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Встановили букмарклет? Перевірте, як він працює!
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="https://www.linkedin.com/in/satlonavash/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="gap-2">
                  <Linkedin className="h-4 w-4" />
                  Тестовий LinkedIn профіль
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
              <a
                href="https://github.com/torvalds"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="gap-2">
                  <Github className="h-4 w-4" />
                  Тестовий GitHub профіль
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            </div>
          </div>

          {/* Back to Quick Check */}
          <div className="text-center pb-8">
            <Link href="/dashboard/sourcing">
              <Button className="gap-2">
                Перейти до Quick Check
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
