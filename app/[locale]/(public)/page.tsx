import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

interface LandingPageProps {
  params: { locale: string };
}

export default function LandingPage({ params: { locale } }: LandingPageProps) {
  const t = useTranslations('landing');

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-white to-primary/10 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              {t('hero_title').split('Vamos')[0]}
              <span className="text-primary">Vamos</span>
              {t('hero_title').split('Vamos')[1] || ''}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/${locale}/apply`}>
                <Button size="lg" className="text-lg px-8">
                  {t('cta_button')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  {t('process_title')}
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
            <h2 className="text-3xl font-bold mb-4">{t('about_title')}</h2>
            <p className="text-lg text-muted-foreground">{t('about_desc')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {t('feature2_title')}
                </h3>
                <p className="text-muted-foreground">{t('feature2_desc')}</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {t('feature1_title')}
                </h3>
                <p className="text-muted-foreground">{t('feature1_desc')}</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {t('feature3_title')}
                </h3>
                <p className="text-muted-foreground">{t('feature3_desc')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('process_title')}</h2>
            <p className="text-lg text-muted-foreground">{t('hero_description')}</p>
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
                  <h3 className="font-semibold text-lg mb-2">
                    {t('process_step1_title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('process_step1_desc')}
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
                  <h3 className="font-semibold text-lg mb-2">
                    {t('process_step2_title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('process_step2_desc')}
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
                  <h3 className="font-semibold text-lg mb-2">
                    {t('process_step3_title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('process_step3_desc')}
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
                  <h3 className="font-semibold text-lg mb-2">
                    {t('process_step4_title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('process_step4_desc')}
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
                    <h3 className="font-semibold text-lg mb-2">
                      {t('process_step2_title')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t('process_step2_desc')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {t('process_step4_desc')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('benefits_title')}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <p className="text-gray-700">{t('benefit_1')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⏰</div>
              <p className="text-gray-700">{t('benefit_2')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🌍</div>
              <p className="text-gray-700">{t('benefit_3')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <p className="text-gray-700">{t('benefit_4')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('hero_title')}
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            {t('hero_subtitle')}
          </p>
          <Link href={`/${locale}/apply`}>
            <Button size="lg" variant="secondary" className="text-lg px-8">
              <FileText className="mr-2 h-5 w-5" />
              {t('cta_button')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
