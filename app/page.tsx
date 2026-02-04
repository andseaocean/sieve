import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-black tracking-tight">
            Vamos
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-Powered Hiring Platform
          </p>
        </div>

        {/* Decorative line */}
        <div className="w-16 h-1 bg-primary mx-auto rounded-full" />

        {/* Login button */}
        <Link href="/login">
          <Button size="lg" className="px-8">
            Login
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 text-sm text-muted-foreground">
        Hiring System MVP
      </p>
    </div>
  );
}
