import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CustomerAuthData } from '@/utils/customerAuth';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  currentUserInfo: CustomerAuthData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  loginAsCustomer: (userData: CustomerAuthData) => void;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isOperator: boolean;
}

const CUSTOMER_SESSION_KEY = 'tlift_customer_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<CustomerAuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ۱. بررسی نشست کاربری ذخیره‌شده مشتری در مرورگر
    const savedCustomer = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (savedCustomer) {
      try {
        const saved = JSON.parse(savedCustomer) as CustomerAuthData;
        const isOwnerPhone = saved.phone?.replace(/\D/g, '').endsWith('9192868509');
        const parsed: CustomerAuthData = isOwnerPhone
          ? { ...saved, id: 'system_admin_mohsen_emami', name: 'محسن امامی برسری', phone: '09192868509', role: 'admin', userType: 'مدیر شرکت و تکنسین سرویس', activity: 'مدیریت شرکت و سرویس آسانسور' }
          : saved;
        if (isOwnerPhone) localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(parsed));
        setCurrentUserInfo(parsed);
        const isSystemAdmin =
          parsed.role === 'admin' ||
          isOwnerPhone ||
          parsed.name?.includes('محسن امامی');

        setUser({
          id: parsed.id,
          app_metadata: { provider: 'phone' },
          user_metadata: {
            full_name: parsed.name,
            phone: parsed.phone,
            role: parsed.role,
            userType: parsed.userType,
          },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          phone: parsed.phone,
          role: 'authenticated',
        } as unknown as User);

        setProfile({
          id: parsed.id,
          email: '',
          full_name: parsed.name,
          role: isSystemAdmin ? 'admin' : parsed.role === 'staff' ? 'operator' : 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to parse customer session', err);
      }
    }

    // ۲. شنونده وضعیت احراز هویت Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setSession(session);
          setUser(session.user);

          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileData) {
              setProfile(profileData);
            }
          }, 0);
        }
        setLoading(false);
      }
    );

    // ۳. بررسی نشست فعال قبلی Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginAsCustomer = (incomingData: CustomerAuthData) => {
    const isOwnerPhone = incomingData.phone?.replace(/\D/g, '').endsWith('9192868509');
    const userData: CustomerAuthData = isOwnerPhone
      ? { ...incomingData, id: 'system_admin_mohsen_emami', name: 'محسن امامی برسری', phone: '09192868509', role: 'admin', userType: 'مدیر شرکت و تکنسین سرویس', activity: 'مدیریت شرکت و سرویس آسانسور' }
      : incomingData;
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(userData));
    setCurrentUserInfo(userData);

    const isSystemAdmin =
      userData.role === 'admin' ||
      isOwnerPhone ||
      userData.name?.includes('محسن امامی');

    const simUser = {
      id: userData.id,
      app_metadata: { provider: 'phone' },
      user_metadata: {
        full_name: userData.name,
        phone: userData.phone,
        role: userData.role,
        userType: userData.userType,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      phone: userData.phone,
      role: 'authenticated',
    } as unknown as User;

    setUser(simUser);
    setProfile({
      id: userData.id,
      email: '',
      full_name: userData.name,
      role: isSystemAdmin ? 'admin' : userData.role === 'staff' ? 'operator' : 'customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
      setCurrentUserInfo(null);
      setUser(null);
      setSession(null);
      setProfile(null);
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isAdmin =
    profile?.role === 'admin' ||
    currentUserInfo?.role === 'admin' ||
    currentUserInfo?.phone?.includes('09192868509') === true;

  const isOperator =
    isAdmin ||
    profile?.role === 'operator' ||
    currentUserInfo?.role === 'staff' ||
    currentUserInfo?.role === 'operator';

  const value = {
    user,
    session,
    profile,
    currentUserInfo,
    loading,
    signIn,
    signUp,
    loginAsCustomer,
    signOut,
    isAdmin,
    isOperator,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
