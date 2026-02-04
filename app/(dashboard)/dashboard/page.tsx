'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Stats {
  activeRequests: number;
  totalCandidates: number;
  topTierCandidates: number;
  newThisWeek: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>({
    activeRequests: 0,
    totalCandidates: 0,
    topTierCandidates: 0,
    newThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch active requests count
        const { count: requestsCount } = await supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch total candidates count
        const { count: candidatesCount } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true });

        // Fetch top tier candidates count
        const { count: topTierCount } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .eq('ai_category', 'top_tier');

        // Fetch candidates added this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: newCount } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());

        setStats({
          activeRequests: requestsCount || 0,
          totalCandidates: candidatesCount || 0,
          topTierCandidates: topTierCount || 0,
          newThisWeek: newCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Активні запити',
      value: stats.activeRequests,
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Всього кандидатів',
      value: stats.totalCandidates,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Топ кандидати',
      value: stats.topTierCandidates,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Нові за тиждень',
      value: stats.newThisWeek,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* Welcome message */}
        <div>
          <h2 className="text-2xl font-bold text-black">
            Вітаємо, {session?.user?.name}!
          </h2>
          <p className="text-muted-foreground">
            Ось огляд вашої системи найму
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Швидкі дії</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Link href="/dashboard/requests/new">
              <Button>
                <Briefcase className="mr-2 h-4 w-4" />
                Створити запит
              </Button>
            </Link>
            <Link href="/dashboard/candidates">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Переглянути кандидатів
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
