import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'seller' | 'agent';
export type UserStatus = 'pending' | 'approved' | 'blocked';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  telegram_username: string | null;
  paypal: string | null;
  payment_details: string | null;
  about: string | null;
  recommendations: string | null;
  status: UserStatus;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  countries: string[];
  loading: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isAgent: boolean;
  primaryRole: AppRole | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, rolesRes, countriesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('user_countries').select('country').eq('user_id', userId),
      ]);

      if (profileRes.data) setProfile(profileRes.data as UserProfile);
      if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role as AppRole));
      if (countriesRes.data) setCountries(countriesRes.data.map((c) => c.country));
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  useEffect(() => {
    // Set up auth listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          await fetchUserData(sess.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setCountries([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchUserData(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setCountries([]);
  };

  const isAdmin = roles.includes('admin');
  const isSeller = roles.includes('seller');
  const isAgent = roles.includes('agent');

  const primaryRole: AppRole | null = isAdmin
    ? 'admin'
    : isSeller
    ? 'seller'
    : isAgent
    ? 'agent'
    : null;

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, countries, loading,
      isAdmin, isSeller, isAgent, primaryRole,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
