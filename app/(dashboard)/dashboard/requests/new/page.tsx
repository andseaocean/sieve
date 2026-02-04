'use client';

import { Header } from '@/components/dashboard/header';
import { RequestForm } from '@/components/requests/request-form';

export default function NewRequestPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Новий запит" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <RequestForm />
        </div>
      </div>
    </div>
  );
}
