'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { StepIndicator } from '@/components/public/step-indicator';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ApplyPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('apply');

  const steps = [
    { id: 1, title: t('step1_title') },
    { id: 2, title: t('step2_title') },
    { id: 3, title: t('step3_title') },
    { id: 4, title: t('step4_title') },
  ];

  // Validation schema with translated messages
  const applicationSchema = z.object({
    // Step 1: Basic info
    first_name: z.string().min(2, t('validation_min_length', { min: 2 })),
    last_name: z.string().min(2, t('validation_min_length', { min: 2 })),
    email: z.string().email(t('validation_email')),
    phone: z.string().optional(),

    // Step 2: About
    about_text: z.string().min(50, t('validation_min_length', { min: 50 })),
    why_vamos: z.string().min(30, t('validation_min_length', { min: 30 })),

    // Step 3: Additional
    key_skills: z.string().optional(),
    linkedin_url: z
      .string()
      .url(t('validation_url'))
      .optional()
      .or(z.literal('')),
    portfolio_url: z
      .string()
      .url(t('validation_url'))
      .optional()
      .or(z.literal('')),

    // Step 4: Resume
    resume: z.any().optional(),
  });

  type ApplicationFormData = z.infer<typeof applicationSchema>;

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

  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof ApplicationFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['first_name', 'last_name', 'email'];
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
        toast.error(t('validation_file_type'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('validation_file_size'));
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
      if (data.portfolio_url)
        formData.append('portfolio_url', data.portfolio_url);
      if (resumeFile) formData.append('resume', resumeFile);

      // Include the language information
      formData.append('original_language', locale);

      const response = await fetch('/api/candidates/apply', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      router.push(`/${locale}/thank-you`);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(t('validation_required'));
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
            <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
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
                    <CardTitle>{t('step1_title')}</CardTitle>
                    <CardDescription>{t('subtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">{t('field_name')} *</Label>
                        <Input
                          id="first_name"
                          placeholder={t('field_name_placeholder')}
                          {...register('first_name')}
                          className={errors.first_name ? 'border-red-500' : ''}
                        />
                        {errors.first_name && (
                          <p className="text-sm text-red-500">
                            {errors.first_name.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">{t('field_name')} *</Label>
                        <Input
                          id="last_name"
                          placeholder={t('field_name_placeholder')}
                          {...register('last_name')}
                          className={errors.last_name ? 'border-red-500' : ''}
                        />
                        {errors.last_name && (
                          <p className="text-sm text-red-500">
                            {errors.last_name.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('field_email')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('field_email_placeholder')}
                        {...register('email')}
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('field_phone')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t('field_phone_placeholder')}
                        {...register('phone')}
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 2: About */}
              {currentStep === 2 && (
                <>
                  <CardHeader>
                    <CardTitle>{t('step2_title')}</CardTitle>
                    <CardDescription>{t('subtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="about_text">{t('field_bio')} *</Label>
                      <Textarea
                        id="about_text"
                        placeholder={t('field_bio_placeholder')}
                        rows={5}
                        {...register('about_text')}
                        className={errors.about_text ? 'border-red-500' : ''}
                      />
                      {errors.about_text && (
                        <p className="text-sm text-red-500">
                          {errors.about_text.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('field_bio_hint')} ({watch('about_text')?.length || 0}
                        )
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="why_vamos">{t('field_why_vamos')} *</Label>
                      <Textarea
                        id="why_vamos"
                        placeholder={t('field_why_vamos_placeholder')}
                        rows={4}
                        {...register('why_vamos')}
                        className={errors.why_vamos ? 'border-red-500' : ''}
                      />
                      {errors.why_vamos && (
                        <p className="text-sm text-red-500">
                          {errors.why_vamos.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('validation_min_length', { min: 30 })} (
                        {watch('why_vamos')?.length || 0})
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 3: Additional */}
              {currentStep === 3 && (
                <>
                  <CardHeader>
                    <CardTitle>{t('step3_title')}</CardTitle>
                    <CardDescription>{t('subtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="key_skills">{t('field_skills')}</Label>
                      <Textarea
                        id="key_skills"
                        placeholder={t('field_skills_placeholder')}
                        rows={3}
                        {...register('key_skills')}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('field_skills_hint')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">{t('field_linkedin')}</Label>
                      <Input
                        id="linkedin_url"
                        type="url"
                        placeholder={t('field_linkedin_placeholder')}
                        {...register('linkedin_url')}
                        className={errors.linkedin_url ? 'border-red-500' : ''}
                      />
                      {errors.linkedin_url && (
                        <p className="text-sm text-red-500">
                          {errors.linkedin_url.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio_url">
                        {t('field_portfolio')}
                      </Label>
                      <Input
                        id="portfolio_url"
                        type="url"
                        placeholder={t('field_portfolio_placeholder')}
                        {...register('portfolio_url')}
                        className={errors.portfolio_url ? 'border-red-500' : ''}
                      />
                      {errors.portfolio_url && (
                        <p className="text-sm text-red-500">
                          {errors.portfolio_url.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 4: Resume */}
              {currentStep === 4 && (
                <>
                  <CardHeader>
                    <CardTitle>{t('step4_title')}</CardTitle>
                    <CardDescription>{t('field_resume_optional')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resume">{t('field_resume')}</Label>
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
                              <p className="font-medium">
                                {t('field_resume_upload')}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                PDF, max 5MB
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Summary before submit */}
                    <div className="bg-gray-50 rounded-lg p-4 mt-6">
                      <h4 className="font-medium mb-2">{t('field_consent')}:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• {t('validation_required')}</li>
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
                    {t('button_back')}
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <Button type="button" onClick={handleNext}>
                    {t('button_next')}
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
                        {t('button_submitting')}
                      </>
                    ) : (
                      t('button_submit')
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
