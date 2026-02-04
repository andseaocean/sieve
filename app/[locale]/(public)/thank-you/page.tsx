import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Home, Sparkles } from 'lucide-react';

interface ThankYouPageProps {
  params: { locale: string };
}

export default function ThankYouPage({ params: { locale } }: ThankYouPageProps) {
  const t = useTranslations('thank_you');

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>

          <p className="text-lg text-muted-foreground mb-8">{t('message')}</p>

          {/* AI Processing Card */}
          <Card className="mb-8 text-left">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('next_step_1')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('message')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card className="mb-8 text-left">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">{t('next_steps_title')}</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('next_step_1')}
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('next_step_2')}
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('next_step_3')}
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Back to Home Button */}
          <Link href={`/${locale}`}>
            <Button size="lg" variant="outline">
              <Home className="h-4 w-4 mr-2" />
              {t('button_home')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
