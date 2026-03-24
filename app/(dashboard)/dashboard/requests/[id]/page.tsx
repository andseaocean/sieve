'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { RequestForm } from '@/components/requests/request-form';
import { RequestTeam } from '@/components/requests/request-team';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Request } from '@/lib/supabase/types';
import {
  formatDate,
  requestStatusColors,
  requestStatusLabels,
  priorityColors,
  priorityLabels,
  aiOrientationLabels,
  employmentTypeLabels,
  remotePolicyLabels,
} from '@/lib/utils';
import { toast } from 'sonner';
import { Pencil, Trash2, ArrowLeft, MapPin, Briefcase, Clock, AlertTriangle, Info } from 'lucide-react';
import { CandidateScanResults } from '@/components/requests/CandidateScanResults';
import { RecommendedCandidates } from '@/components/requests/RecommendedCandidates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ManagerInfo {
  id: string;
  name: string;
  email: string;
}

interface RequestManagerEntry {
  id: string;
  manager_id: string;
  added_at: string;
  manager: ManagerInfo | null;
}

interface RequestWithTeam extends Request {
  created_by_manager: ManagerInfo | null;
  request_managers: RequestManagerEntry[];
}


export default function RequestDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [request, setRequest] = useState<RequestWithTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isEdit = searchParams.get('edit') === 'true';
  const requestId = params.id as string;

  useEffect(() => {
    async function fetchRequest() {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        if (response.ok) {
          const data = await response.json();
          setRequest(data);
        } else {
          const errData = await response.json().catch(() => ({}));
          console.error('Failed to fetch request:', response.status, errData);
          toast.error(`Запит не знайдено (${response.status}: ${errData?.error ?? 'unknown'})`);
          router.push('/dashboard/requests');
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        toast.error('Помилка завантаження');
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [requestId, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Запит видалено');
        router.push('/dashboard/requests');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Помилка видалення');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleFieldUpdate = async (field: 'status' | 'priority', value: string) => {
    if (!request) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Failed to update');
      const updated = await response.json();
      setRequest((prev) => prev ? { ...prev, ...updated } : prev);
      toast.success('Збережено');
    } catch {
      toast.error('Помилка збереження');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Завантаження..." />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  if (isEdit) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Редагувати запит" />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <RequestForm request={request} isEdit />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={request.title} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Back and actions */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard/requests">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад до списку
              </Button>
            </Link>

            <div className="flex gap-2">
              <Link href={`/dashboard/requests/${request.id}?edit=true`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Редагувати
                </Button>
              </Link>

              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Видалити
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Видалити запит?</DialogTitle>
                    <DialogDescription>
                      Ви впевнені, що хочете видалити цей запит? Цю дію неможливо скасувати.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                      disabled={isDeleting}
                    >
                      Скасувати
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Видалення...' : 'Видалити'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Status and priority — inline selects */}
          <div className="flex gap-3 items-center">
            <Select
              value={request.status}
              onValueChange={(v) => handleFieldUpdate('status', v)}
              disabled={isUpdating}
            >
              <SelectTrigger className={`w-36 h-8 text-xs font-medium border ${requestStatusColors[request.status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{requestStatusLabels['active']}</SelectItem>
                <SelectItem value="paused">{requestStatusLabels['paused']}</SelectItem>
                <SelectItem value="closed">{requestStatusLabels['closed']}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={request.priority}
              onValueChange={(v) => handleFieldUpdate('priority', v)}
              disabled={isUpdating}
            >
              <SelectTrigger className={`w-36 h-8 text-xs font-medium border ${priorityColors[request.priority]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{priorityLabels['high']}</SelectItem>
                <SelectItem value="medium">{priorityLabels['medium']}</SelectItem>
                <SelectItem value="low">{priorityLabels['low']}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Two-column layout: main content + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Candidate tabs */}
              <Tabs defaultValue="matched">
                <TabsList>
                  <TabsTrigger value="matched">Підібрані</TabsTrigger>
                  <TabsTrigger value="recommended">Рекомендовані</TabsTrigger>
                </TabsList>

                <TabsContent value="matched" className="mt-4 space-y-6">
                  <CandidateScanResults requestId={request.id} requestTitle={request.title} />
                </TabsContent>

                <TabsContent value="recommended" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <RecommendedCandidates requestId={request.id} requestTitle={request.title} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Деталі вакансії button */}
              <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" size="sm">
                    <Info className="h-4 w-4 mr-2" />
                    Деталі вакансії
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{request.title}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 py-2">
                    {/* Опис позиції */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Опис позиції</h3>
                      {request.description ? (
                        <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Опис не вказано</p>
                      )}
                      <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
                        {request.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {request.location}
                          </span>
                        )}
                        {request.employment_type && request.employment_type !== 'not_specified' && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {employmentTypeLabels[request.employment_type]}
                          </span>
                        )}
                        {request.remote_policy && request.remote_policy !== 'not_specified' && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {remotePolicyLabels[request.remote_policy]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Додаткова інформація */}
                    {request.vacancy_info && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Додаткова інформація</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {request.vacancy_info}
                        </p>
                      </div>
                    )}

                    {/* Вимоги */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">Вимоги</h3>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Обов&apos;язкові навички</h4>
                        <p className="text-sm whitespace-pre-wrap">{request.required_skills}</p>
                      </div>
                      {request.nice_to_have_skills && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Бажані навички</h4>
                          <p className="text-sm whitespace-pre-wrap">{request.nice_to_have_skills}</p>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium mb-1">Soft Skills</h4>
                        <p className="text-sm whitespace-pre-wrap">{request.soft_skills}</p>
                      </div>
                      {request.ai_orientation && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">AI Орієнтація</h4>
                          <p className="text-sm">{aiOrientationLabels[request.ai_orientation]}</p>
                        </div>
                      )}
                      {request.red_flags && (
                        <div>
                          <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            Red Flags
                          </h4>
                          <p className="text-sm whitespace-pre-wrap">{request.red_flags}</p>
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>Створено: {formatDate(request.created_at)}</span>
                      <span>Оновлено: {formatDate(request.updated_at)}</span>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <RequestTeam
                requestId={request.id}
                createdBy={request.created_by}
                createdByManager={request.created_by_manager}
                initialManagers={request.request_managers}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
