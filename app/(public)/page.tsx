import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  FileText,
  Clock,
  Users,
  CheckCircle2,
} from 'lucide-react';

const TelegramIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="flex-shrink-0"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
  </svg>
);

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-white to-primary/10 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Приєднуйся до команди{' '}
              <span className="text-primary">Vamos</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Ми шукаємо талановитих людей, які хочуть розвиватися разом з нами.
              Подай заявку та отримай персоналізовану оцінку твоїх навичок за допомогою AI.
            </p>
            {/* Dual CTA: Telegram + Web Form */}
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto px-4 sm:px-0">
              {/* Primary CTA - Telegram */}
              <a
                href="https://t.me/vamos_hiring_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-4
                           rounded-lg font-semibold flex items-center justify-center gap-3
                           transition-all shadow-lg hover:shadow-xl"
              >
                <TelegramIcon />
                Подати заявку через Telegram
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  Швидше
                </span>
              </a>

              {/* Benefits */}
              <p className="text-sm text-gray-500">
                ⚡ Миттєва відповідь • 💬 Зручна комунікація
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full my-2">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-gray-400 text-sm">або</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {/* Secondary CTA - Web Form */}
              <Link
                href="/apply"
                className="w-full border-2 border-gray-300 hover:border-gray-400
                           text-gray-700 px-8 py-4 rounded-lg font-semibold
                           transition-all flex items-center justify-center gap-2"
              >
                📝 Подати заявку на сайті
              </Link>

              {/* Subtitle */}
              <p className="text-xs text-gray-500 text-center mt-2">
                📧 Зв&apos;яжемося через email
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Про Vamos</h2>
            <p className="text-lg text-muted-foreground">
              Vamos — це інноваційна компанія, яка використовує сучасні технології
              для створення найкращого досвіду для клієнтів та співробітників.
              Ми цінуємо креативність, відповідальність та прагнення до розвитку.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Команда</h3>
                <p className="text-muted-foreground">
                  Дружній колектив професіоналів, які підтримують один одного
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Інновації</h3>
                <p className="text-muted-foreground">
                  Використовуємо AI та сучасні технології у щоденній роботі
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Розвиток</h3>
                <p className="text-muted-foreground">
                  Можливості для кар&apos;єрного та професійного росту
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Як подати заявку?</h2>
            <p className="text-lg text-muted-foreground">
              Простий та швидкий процес подачі заявки за 4 кроки
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Базова інформація</h3>
                  <p className="text-muted-foreground">
                    Введіть своє ім&apos;я, email та контактний телефон
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Про себе</h3>
                  <p className="text-muted-foreground">
                    Розкажіть про свій досвід та чому хочете працювати у Vamos
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Додаткова інформація</h3>
                  <p className="text-muted-foreground">
                    Вкажіть свої ключові навички та посилання на LinkedIn/портфоліо
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Завантаження резюме</h3>
                  <p className="text-muted-foreground">
                    Прикріпіть своє резюме у форматі PDF (опціонально)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Feature */}
          <div className="max-w-2xl mx-auto mt-16">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">AI-аналіз твоєї заявки</h3>
                    <p className="text-muted-foreground mb-4">
                      Після подачі заявки наша система автоматично проаналізує твій профіль
                      та підбере найбільш відповідні вакансії. Це допомагає нам швидше
                      знайти ідеальну позицію саме для тебе.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Швидкий зворотній зв&apos;язок
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Готовий приєднатися до команди?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Подай заявку зараз і зроби перший крок до нових можливостей
          </p>
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto px-4 sm:px-0">
            {/* Primary CTA - Telegram */}
            <a
              href="https://t.me/vamos_hiring_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white text-red-600 hover:bg-gray-100 px-8 py-4
                         rounded-lg font-semibold flex items-center justify-center gap-3
                         transition-all shadow-lg hover:shadow-xl"
            >
              <TelegramIcon />
              Подати заявку через Telegram
              <span className="text-xs bg-red-600/10 px-2 py-1 rounded">
                Швидше
              </span>
            </a>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full my-2">
              <div className="flex-1 h-px bg-white/30" />
              <span className="text-white/60 text-sm">або</span>
              <div className="flex-1 h-px bg-white/30" />
            </div>

            {/* Secondary CTA - Web Form */}
            <Link
              href="/apply"
              className="w-full border-2 border-white/40 hover:border-white/70
                         text-white px-8 py-4 rounded-lg font-semibold
                         transition-all flex items-center justify-center gap-2"
            >
              📝 Подати заявку на сайті
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
