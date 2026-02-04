'use client';

import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();

  const userName = session?.user?.name || 'User';
  const nameParts = userName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts[1] || '';

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-black">{title}</h1>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{userName}</span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-white text-xs">
            {getInitials(firstName, lastName || firstName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
