// src/context/AuthContext.tsx
//
// This is the app's memory of "who is logged in right now." Any screen can ask
// it for the current session/user, and the whole app re-renders automatically
// when someone logs in or out. App.tsx uses this to decide whether to show the
// login screen or the home screen.

import { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  // The logged-in session, or null if logged out.
  session: Session | null;
  // True only while we're first checking for an existing session on launch,
  // so we can show a spinner instead of flashing the login screen.
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. On launch, check whether there's already a saved session on the phone.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // 2. Then listen for any change (login, logout, token refresh) and update.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    // 3. Pause/resume the background token refresh as the app goes to the
    //    background and comes back (recommended by Supabase for React Native).
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    // Clean up the listeners when the app unmounts.
    return () => {
      listener.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// A small helper so screens can read the auth state with one line:
//   const { session } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
