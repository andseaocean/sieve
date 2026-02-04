import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  FileText,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/apply">
                <Button size="lg" className="text-lg px-8">
                  Подати заявку
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Як це працює?
                </Button>
              </Link>
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
          <Link href="/apply">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              <FileText className="mr-2 h-5 w-5" />
              Подати заявку
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
