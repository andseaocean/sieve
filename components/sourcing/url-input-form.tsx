'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { detectPlatform, isValidUrl, platformInfo, Platform } from '@/lib/sourcing/platform-detector';
import { Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface URLInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function URLInputForm({ onSubmit, isLoading }: URLInputFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError('');

    if (value.trim()) {
      const platform = detectPlatform(value);
      setDetectedPlatform(platform);
    } else {
      setDetectedPlatform(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Введіть URL профілю');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Невірний формат URL');
      return;
    }

    const platform = detectPlatform(url);
    if (!platform) {
      setError('Платформа не підтримується. Використовуйте LinkedIn, DOU, Djinni, Work.ua або GitHub.');
      return;
    }

    onSubmit(url);
  };

  const supportedPlatforms = Object.values(platformInfo);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Quick Profile Check
        </CardTitle>
        <CardDescription>
          Вставте URL профілю кандидата для швидкого аналізу
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-url">URL профілю *</Label>
            <div className="relative">
              <Input
                id="profile-url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://github.com/username"
                className={error ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={isLoading}
              />
              {detectedPlatform && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Badge
                    variant="outline"
                    className={platformInfo[detectedPlatform].color}
                  >
                    {platformInfo[detectedPlatform].icon} {platformInfo[detectedPlatform].name}
                  </Badge>
                </div>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Підтримувані платформи:
            </p>
            <div className="flex flex-wrap gap-2">
              {supportedPlatforms.map((p) => (
                <Badge
                  key={p.platform}
                  variant="outline"
                  className={`${p.color} cursor-default`}
                >
                  {p.icon} {p.name}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Аналіз профілю...
              </>
            ) : (
              'Аналізувати профіль'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
