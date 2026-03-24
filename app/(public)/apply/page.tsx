'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VacancySelector, type OpenVacancy } from '@/components/candidates/VacancySelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function ApplyPage() {
  const router = useRouter();
  const [isTelegram, setIsTelegram] = useState(false);
  const [vacancies, setVacancies] = useState<OpenVacancy[]>([]);
  const [selectedVacancies, setSelectedVacancies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    about_text: '',
    why_vamos: '',
    key_skills: '',
    linkedin_url: '',
    portfolio_url: '',
    telegram_username: '',
    preferred_contact_methods: ['email'] as ('email' | 'telegram')[],
  });

  useEffect(() => {
    // Detect Telegram Mini App
    const tg = window.Telegram?.WebApp;
    const inTelegram = !!tg?.initData;
    setIsTelegram(inTelegram);

    if (inTelegram) {
      tg.ready();
      tg.expand();
      const username = tg.initDataUnsafe?.user?.username || '';
      const firstName = tg.initDataUnsafe?.user?.first_name || '';
      const lastName = tg.initDataUnsafe?.user?.last_name || '';
      setForm((prev) => ({
        ...prev,
        telegram_username: username,
        first_name: firstName,
        last_name: lastName,
        preferred_contact_methods: ['telegram'],
      }));
    }

    // Fetch open vacancies
    fetch('/api/requests/open')
      .then((r) => r.json())
      .then((data: OpenVacancy[]) => setVacancies(Array.isArray(data) ? data : []))
      .catch(() => setVacancies([]));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Вкажіть ім'я та прізвище");
      return;
    }
    if (!form.email.trim()) {
      setError('Вкажіть email');
      return;
    }
    if (!form.about_text.trim()) {
      setError('Розкажіть про себе');
      return;
    }
    if (!form.why_vamos.trim()) {
      setError('Вкажіть, чому хочете у Vamos');
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('first_name', form.first_name.trim());
      fd.append('last_name', form.last_name.trim());
      fd.append('email', form.email.trim());
      fd.append('phone', form.phone.trim());
      fd.append('about_text', form.about_text.trim());
      fd.append('why_vamos', form.why_vamos.trim());
      fd.append('key_skills', form.key_skills.trim());
      fd.append('linkedin_url', form.linkedin_url.trim());
      fd.append('portfolio_url', form.portfolio_url.trim());
      fd.append('telegram_username', form.telegram_username.trim());
      fd.append('preferred_contact_methods', JSON.stringify(form.preferred_contact_methods));
      fd.append('applied_request_ids', JSON.stringify(selectedVacancies));
      fd.append('original_language', 'uk');

      const resumeFile = fileRef.current?.files?.[0];
      if (resumeFile) {
        fd.append('resume', resumeFile);
      }

      const res = await fetch('/api/candidates/apply', { method: 'POST', body: fd });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error || 'Сталася помилка. Спробуйте ще раз.');
        return;
      }

      router.push('/thank-you');
    } catch {
      setError('Сталася помилка. Перевірте зʼєднання і спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Подати заявку до Vamos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Заповніть форму — ми звʼяжемося з вами найближчим часом
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl shadow-sm p-6">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="first_name">Імʼя *</Label>
              <Input
                id="first_name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Іван"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Прізвище *</Label>
              <Input
                id="last_name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Петренко"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ivan@example.com"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+380 XX XXX XX XX"
            />
          </div>

          {/* Contact method — hidden in Telegram */}
          {!isTelegram && (
            <div className="space-y-1">
              <Label>Як з вами зв&apos;язатися?</Label>
              <div className="flex gap-4 mt-1">
                {(['email', 'telegram'] as const).map((method) => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.preferred_contact_methods.includes(method)}
                      onChange={() => {
                        setForm((prev) => {
                          const current = prev.preferred_contact_methods;
                          const next = current.includes(method)
                            ? current.filter((m) => m !== method)
                            : [...current, method];
                          return { ...prev, preferred_contact_methods: next.length ? next : [method] };
                        });
                      }}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm capitalize">{method === 'email' ? 'Email' : 'Telegram'}</span>
                  </label>
                ))}
              </div>

              {form.preferred_contact_methods.includes('telegram') && (
                <div className="mt-2 space-y-1">
                  <Label htmlFor="telegram_username">Telegram username</Label>
                  <Input
                    id="telegram_username"
                    name="telegram_username"
                    value={form.telegram_username}
                    onChange={handleChange}
                    placeholder="@username"
                  />
                </div>
              )}
            </div>
          )}

          {/* About */}
          <div className="space-y-1">
            <Label htmlFor="about_text">Про себе *</Label>
            <Textarea
              id="about_text"
              name="about_text"
              value={form.about_text}
              onChange={handleChange}
              placeholder="Розкажіть про свій досвід та навички..."
              rows={4}
              required
            />
          </div>

          {/* Why Vamos */}
          <div className="space-y-1">
            <Label htmlFor="why_vamos">Чому Vamos? *</Label>
            <Textarea
              id="why_vamos"
              name="why_vamos"
              value={form.why_vamos}
              onChange={handleChange}
              placeholder="Чому хочете працювати саме у нас?"
              rows={3}
              required
            />
          </div>

          {/* Key Skills */}
          <div className="space-y-1">
            <Label htmlFor="key_skills">Ключові навички</Label>
            <Input
              id="key_skills"
              name="key_skills"
              value={form.key_skills}
              onChange={handleChange}
              placeholder="React, TypeScript, Node.js (через кому)"
            />
          </div>

          {/* LinkedIn */}
          <div className="space-y-1">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              type="url"
              value={form.linkedin_url}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          {/* Portfolio */}
          <div className="space-y-1">
            <Label htmlFor="portfolio_url">Портфоліо / GitHub</Label>
            <Input
              id="portfolio_url"
              name="portfolio_url"
              type="url"
              value={form.portfolio_url}
              onChange={handleChange}
              placeholder="https://github.com/..."
            />
          </div>

          {/* Resume */}
          <div className="space-y-1">
            <Label htmlFor="resume">Резюме (PDF)</Label>
            <Input
              id="resume"
              type="file"
              accept="application/pdf"
              ref={fileRef}
              className="cursor-pointer"
            />
          </div>

          {/* Vacancies */}
          {vacancies.length > 0 && (
            <div className="space-y-2">
              <Label>На яку вакансію подаєте заявку?</Label>
              <VacancySelector
                vacancies={vacancies}
                selected={selectedVacancies}
                onChange={setSelectedVacancies}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Надсилаємо...
              </>
            ) : (
              'Надіслати заявку'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
