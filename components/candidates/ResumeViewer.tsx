'use client';

import { useState } from 'react';
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ResumeViewerProps {
  candidateId: string;
  candidateName: string;
  resumeUrl?: string | null;
}

export function ResumeViewer({
  candidateId,
  candidateName,
  resumeUrl,
}: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!resumeUrl) {
    return (
      <div className="text-sm text-muted-foreground">
        Резюме не надано
      </div>
    );
  }

  const pdfProxyUrl = `/api/candidates/${candidateId}/resume`;

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(pdfProxyUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidateName}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-red-600" />
        <span className="text-sm font-medium">Резюме (PDF)</span>
      </div>

      <div className="flex gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Переглянути
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Резюме: {candidateName}</DialogTitle>
            </DialogHeader>
            <iframe
              src={pdfProxyUrl}
              className="w-full h-full border-0"
              title="Resume PDF"
            />
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Завантажити
        </Button>
      </div>
    </div>
  );
}
