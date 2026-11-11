import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { clearAllCaches } from '@/platform/query';

import { getCurrentSession, onSessionChange } from './api';

type SessionState = { session: Session | null; loading: boolean };

const SessionContext = createContext<SessionState>({ session: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });

  useEffect(() => {
    let currentUser: string | null = null;
    getCurrentSession().then((session) => {
      currentUser = session?.user.id ?? null;
      setState({ session, loading: false });
    });
    return onSessionChange((session) => {
      const nextUser = session?.user.id ?? null;
      // ইউজার বদলালে (সাইন-আউট/অন্যজন লগইন) আগের জনের ক্যাশ মুছে ফেলা (§২০.২)
      if (nextUser !== currentUser) void clearAllCaches();
      currentUser = nextUser;
      setState({ session, loading: false });
    });
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
