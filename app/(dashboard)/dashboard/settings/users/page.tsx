import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Header } from '@/components/dashboard/header';
import { UsersSettings } from '@/components/settings/users-settings';

export default async function UsersSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as { role?: string }).role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Користувачі" />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <UsersSettings />
        </div>
      </div>
    </div>
  );
}
