'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { Platform } from '@/lib/sourcing/platform-detector';

const manualProfileSchema = z.object({
  name: z.string().min(2, 'Введіть ім\'я'),
  platform: z.enum(['linkedin', 'github', 'dou', 'djinni', 'workua', 'other']),
  profile_url: z.string().optional(),
  current_position: z.string().optional(),
  location: z.string().optional(),
  skills: z.string().optional(),
  experience_years: z.string().optional(),
  about: z.string().optional(),
  email: z.string().optional(),
});

type ManualProfileFormData = z.infer<typeof manualProfileSchema>;

interface ManualProfileFormProps {
  onSubmit: (data: ManualProfileFormData) => void;
  isLoading: boolean;
  defaultPlatform?: Platform | 'other';
  defaultUrl?: string;
}

export function ManualProfileForm({
  onSubmit,
  isLoading,
  defaultPlatform,
  defaultUrl,
}: ManualProfileFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManualProfileFormData>({
    resolver: zodResolver(manualProfileSchema),
    defaultValues: {
      platform: defaultPlatform || 'other',
      profile_url: defaultUrl || '',
    },
  });

  const platform = watch('platform');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Ручне введення профілю
        </CardTitle>
        <CardDescription>
          Введіть дані кандидата вручну, якщо автоматичний парсинг не працює
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Ім'я *</Label>
              <Input
                id="name"
                placeholder="Іван Петренко"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label htmlFor="platform">Платформа *</Label>
              <Select
                value={platform}
                onValueChange={(value) => setValue('platform', value as ManualProfileFormData['platform'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Виберіть платформу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="dou">DOU</SelectItem>
                  <SelectItem value="djinni">Djinni</SelectItem>
                  <SelectItem value="workua">Work.ua</SelectItem>
                  <SelectItem value="other">Інше</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Profile URL */}
            <div className="space-y-2">
              <Label htmlFor="profile_url">URL профілю</Label>
              <Input
                id="profile_url"
                type="url"
                placeholder="https://..."
                {...register('profile_url')}
              />
              {errors.profile_url && (
                <p className="text-sm text-red-500">{errors.profile_url.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ivan@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Current Position */}
            <div className="space-y-2">
              <Label htmlFor="current_position">Поточна позиція</Label>
              <Input
                id="current_position"
                placeholder="Senior Software Engineer"
                {...register('current_position')}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Локація</Label>
              <Input
                id="location"
                placeholder="Київ, Україна"
                {...register('location')}
              />
            </div>

            {/* Experience Years */}
            <div className="space-y-2">
              <Label htmlFor="experience_years">Років досвіду</Label>
              <Input
                id="experience_years"
                type="number"
                min={0}
                max={50}
                placeholder="5"
                {...register('experience_years')}
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label htmlFor="skills">Навички (через кому)</Label>
            <Input
              id="skills"
              placeholder="React, TypeScript, Node.js, PostgreSQL"
              {...register('skills')}
            />
          </div>

          {/* About */}
          <div className="space-y-2">
            <Label htmlFor="about">Про кандидата</Label>
            <Textarea
              id="about"
              placeholder="Короткий опис досвіду та навичок..."
              rows={4}
              {...register('about')}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Аналізую...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Аналізувати профіль
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
