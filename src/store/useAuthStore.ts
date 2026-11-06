import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const NATIVE_AUTH_CALLBACK = 'com.ivanb905.finanza://auth/callback';
let authInitialization: Promise<void> | null = null;
let authStateSubscription: { unsubscribe: () => void } | null = null;

async function completeNativeOAuth(url: string) {
  const callback = new URL(url);
  if (callback.protocol !== 'com.ivanb905.finanza:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') return;

  try {
    const code = callback.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    }
  } finally {
    await Browser.close().catch(() => undefined);
  }
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  initAuth: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, nombre: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthModalOpen: false,
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

  initAuth: async () => {
    if (authInitialization) return authInitialization;
    authInitialization = (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await App.addListener('appUrlOpen', ({ url }) => void completeNativeOAuth(url).catch(() => undefined));
          const launch = await App.getLaunchUrl();
          if (launch?.url) await completeNativeOAuth(launch.url);
        }

        const { data: { session } } = await supabase.auth.getSession();
        set({ session, user: session?.user || null, isLoading: false });

        if (!authStateSubscription) {
          const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            set({ session: nextSession, user: nextSession?.user || null, isLoading: false });
          });
          authStateSubscription = data.subscription;
        }
      } catch {
        set({ isLoading: false });
        authInitialization = null;
      }
    })();
    return authInitialization;
  },

  signInWithGoogle: async () => {
    try {
      const isNative = Capacitor.isNativePlatform();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: isNative ? NATIVE_AUTH_CALLBACK : window.location.origin,
          skipBrowserRedirect: isNative,
        },
      });
      if (error) return { error: error as Error };

      if (isNative) {
        if (!data.url) return { error: new Error('No se pudo iniciar el acceso con Google.') };
        await Browser.open({ url: data.url });
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  signInWithEmail: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  signUpWithEmail: async (email, password, nombre) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre,
          },
          emailRedirectTo: Capacitor.isNativePlatform() ? NATIVE_AUTH_CALLBACK : undefined,
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
