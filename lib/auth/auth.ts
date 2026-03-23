import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
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
          return null;
        }

        const supabase = createServerClient();

        const { data, error } = await supabase
          .from('managers')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (error || !data) {
          return null;
        }

        const manager = data as Manager & { is_active?: boolean };

        if (manager.is_active === false) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, manager.password_hash);
        if (!isValid) {
          return null;
        }

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
