import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServerClient } from '@/lib/supabase/client';
import { Manager } from '@/lib/supabase/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Auth: Missing credentials');
          return null;
        }

        const supabase = createServerClient();

        // Find manager by email
        const { data, error } = await supabase
          .from('managers')
          .select('*')
          .eq('email', credentials.email)
          .single();

        console.log('Auth: Supabase response:', { data, error });

        if (error || !data) {
          console.log('Auth: No manager found or error:', error);
          return null;
        }

        const manager = data as Manager;

        console.log('Auth: Checking password:', {
          stored: manager.password_hash,
          provided: credentials.password,
          match: manager.password_hash === credentials.password
        });

        // For MVP: simple password check (in production, use proper hashing)
        if (manager.password_hash !== credentials.password) {
          console.log('Auth: Password mismatch');
          return null;
        }

        console.log('Auth: Success!');
        return {
          id: manager.id,
          email: manager.email,
          name: manager.name,
          role: manager.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
