'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StepIndicator } from '@/components/public/step-indicator';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, title: 'Контакти' },
  { id: 2, title: 'Про себе' },
  { id: 3, title: 'Навички' },
  { id: 4, title: 'Резюме' },
];

// Validation schema
const applicationSchema = z.object({
  // Step 1: Basic info
  first_name: z.string().min(2, "Ім'я повинно містити мінімум 2 символи"),
  last_name: z.string().min(2, 'Прізвище повинно містити мінімум 2 символи'),
  email: z.string().email('Невірний формат email'),
  phone: z.string().optional(),
  preferred_contact_methods: z.array(z.enum(['email', 'telegram']))
    .min(1, 'Оберіть хоча б один спосіб зв\'язку'),
  telegram_username: z.string().optional(),

  // Step 2: About
  about_text: z.string().min(50, 'Розкажіть про себе детальніше (мінімум 50 символів)'),
  why_vamos: z.string().min(30, 'Розкажіть, чому хочете працювати у Vamos (мінімум 30 символів)'),

  // Step 3: Additional
  key_skills: z.string().optional(),
  linkedin_url: z.string().url('Невірний формат URL').optional().or(z.literal('')),
  portfolio_url: z.string().url('Невірний формат URL').optional().or(z.literal('')),

  // Step 4: Resume
  resume: z.any().optional(),
}).refine((data) => {
  // If telegram is selected, username is required
  if (data.preferred_contact_methods.includes('telegram')) {
    return data.telegram_username && data.telegram_username.trim().length > 0;
  }
  return true;
}, {
  message: 'Введіть ваш Telegram username',
  path: ['telegram_username'],
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function ApplyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    watch,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    mode: 'onChange',
  });

  const watchContactMethods = watch('preferred_contact_methods');

  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof ApplicationFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['first_name', 'last_name', 'email', 'preferred_contact_methods'];
        // Also validate telegram_username if telegram is selected
        if (watchContactMethods?.includes('telegram')) {
          fieldsToValidate.push('telegram_username');
        }
        break;
      case 2:
        fieldsToValidate = ['about_text', 'why_vamos'];
        break;
      case 3:
        fieldsToValidate = ['linkedin_url', 'portfolio_url'];
        break;
      case 4:
        return true; // Resume is optional
    }

    const result = await trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Будь ласка, завантажте файл у форматі PDF');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Розмір файлу не повинен перевищувати 5MB');
        return;
      }
      setResumeFile(file);
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('first_name', data.first_name);
      formData.append('last_name', data.last_name);
      formData.append('email', data.email);
      if (data.phone) formData.append('phone', data.phone);
      formData.append('about_text', data.about_text);
      formData.append('why_vamos', data.why_vamos);
      if (data.key_skills) formData.append('key_skills', data.key_skills);
      if (data.linkedin_url) formData.append('linkedin_url', data.linkedin_url);
      if (data.portfolio_url) formData.append('portfolio_url', data.portfolio_url);
      if (resumeFile) formData.append('resume', resumeFile);
      // Contact preferences
      formData.append('preferred_contact_methods', JSON.stringify(data.preferred_contact_methods));
      if (data.telegram_username) {
        formData.append('telegram_username', data.telegram_username);
      }

      const response = await fetch('/api/candidates/apply', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      router.push('/thank-you');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Помилка при відправці заявки. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Подати заявку</h1>
            <p className="text-muted-foreground">
              Заповніть форму, щоб приєднатися до команди Vamos
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

          {/* Form Card */}
          <Card>
            <form onSubmit={(e) => e.preventDefault()}>
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <>
                  <CardHeader>
                    <CardTitle>Контактна інформація</CardTitle>
                    <CardDescription>
                      Введіть ваші контактні дані
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Ім&apos;я *</Label>
                        <Input
                          id="first_name"
                          placeholder="Іван"
                          {...register('first_name')}
                          className={errors.first_name ? 'border-red-500' : ''}
                        />
                        {errors.first_name && (
                          <p className="text-sm text-red-500">{errors.first_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Прізвище *</Label>
                        <Input
                          id="last_name"
                          placeholder="Петренко"
                          {...register('last_name')}
                          className={errors.last_name ? 'border-red-500' : ''}
                        />
                        {errors.last_name && (
                          <p className="text-sm text-red-500">{errors.last_name.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ivan@example.com"
                        {...register('email')}
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Телефон</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+380 XX XXX XX XX"
                        {...register('phone')}
                      />
                    </div>

                    {/* Contact Preferences */}
                    <div className="space-y-3 pt-4 border-t">
                      <Label>Як з вами зв&apos;язатися? *</Label>
                      <p className="text-xs text-muted-foreground">
                        Оберіть зручний спосіб для отримання повідомлень від нас
                      </p>

                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            value="email"
                            {...register('preferred_contact_methods')}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>Email</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            value="telegram"
                            {...register('preferred_contact_methods')}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span>Telegram</span>
                        </label>
                      </div>

                      {errors.preferred_contact_methods && (
                        <p className="text-sm text-red-500">{errors.preferred_contact_methods.message}</p>
                      )}
                    </div>

                    {/* Telegram Username - conditional */}
                    {watchContactMethods?.includes('telegram') && (
                      <div className="space-y-2">
                        <Label htmlFor="telegram_username">Telegram username *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                          <Input
                            id="telegram_username"
                            placeholder="your_username"
                            {...register('telegram_username')}
                            className={cn("pl-8", errors.telegram_username && 'border-red-500')}
                          />
                        </div>
                        {errors.telegram_username && (
                          <p className="text-sm text-red-500">{errors.telegram_username.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Без символу @. Приклад: ivan_petrov
                        </p>
                      </div>
                    )}
                  </CardContent>
                </>
              )}

              {/* Step 2: About */}
              {currentStep === 2 && (
                <>
                  <CardHeader>
                    <CardTitle>Про себе</CardTitle>
                    <CardDescription>
                      Розкажіть про свій досвід та мотивацію
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="about_text">Розкажіть про себе *</Label>
                      <Textarea
                        id="about_text"
                        placeholder="Опишіть свій досвід, освіту, попередні місця роботи..."
                        rows={5}
                        {...register('about_text')}
                        className={errors.about_text ? 'border-red-500' : ''}
                      />
                      {errors.about_text && (
                        <p className="text-sm text-red-500">{errors.about_text.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Мінімум 50 символів. Написано: {watch('about_text')?.length || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="why_vamos">Чому хочете працювати у Vamos? *</Label>
                      <Textarea
                        id="why_vamos"
                        placeholder="Що вас приваблює в нашій компанії..."
                        rows={4}
                        {...register('why_vamos')}
                        className={errors.why_vamos ? 'border-red-500' : ''}
                      />
                      {errors.why_vamos && (
                        <p className="text-sm text-red-500">{errors.why_vamos.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Мінімум 30 символів. Написано: {watch('why_vamos')?.length || 0}
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 3: Additional */}
              {currentStep === 3 && (
                <>
                  <CardHeader>
                    <CardTitle>Додаткова інформація</CardTitle>
                    <CardDescription>
                      Навички та посилання на профілі
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="key_skills">Ключові навички</Label>
                      <Textarea
                        id="key_skills"
                        placeholder="JavaScript, React, Node.js, TypeScript..."
                        rows={3}
                        {...register('key_skills')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Введіть навички через кому
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn профіль</Label>
                      <Input
                        id="linkedin_url"
                        type="url"
                        placeholder="https://linkedin.com/in/yourprofile"
                        {...register('linkedin_url')}
                        className={errors.linkedin_url ? 'border-red-500' : ''}
                      />
                      {errors.linkedin_url && (
                        <p className="text-sm text-red-500">{errors.linkedin_url.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio_url">Портфоліо / GitHub</Label>
                      <Input
                        id="portfolio_url"
                        type="url"
                        placeholder="https://github.com/yourusername"
                        {...register('portfolio_url')}
                        className={errors.portfolio_url ? 'border-red-500' : ''}
                      />
                      {errors.portfolio_url && (
                        <p className="text-sm text-red-500">{errors.portfolio_url.message}</p>
                      )}
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 4: Resume */}
              {currentStep === 4 && (
                <>
                  <CardHeader>
                    <CardTitle>Резюме</CardTitle>
                    <CardDescription>
                      Завантажте ваше резюме (опціонально)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resume">Резюме (PDF)</Label>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <input
                          type="file"
                          id="resume"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="resume"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          {resumeFile ? (
                            <>
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <svg
                                  className="w-6 h-6 text-primary"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <p className="font-medium">{resumeFile.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <p className="text-sm text-primary mt-2">
                                Натисніть, щоб змінити файл
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg
                                  className="w-6 h-6 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                              </div>
                              <p className="font-medium">Натисніть, щоб завантажити</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                PDF до 5MB
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Summary before submit */}
                    <div className="bg-gray-50 rounded-lg p-4 mt-6">
                      <h4 className="font-medium mb-2">Перед відправкою:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Перевірте правильність введених даних</li>
                        <li>• Після відправки ви отримаєте підтвердження</li>
                        <li>• Ваша заявка буде автоматично проаналізована AI</li>
                      </ul>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Navigation buttons */}
              <CardContent className="flex justify-between pt-0">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <Button type="button" onClick={handleNext}>
                    Далі
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit(onSubmit)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Відправка...
                      </>
                    ) : (
                      'Відправити заявку'
                    )}
                  </Button>
                )}
              </CardContent>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
