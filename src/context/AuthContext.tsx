import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log('[AUTH] Initializing auth...');
    let isMounted = true;
    let authProcessed = false;

    const handleUser = async (user: FirebaseUser | null, source: string) => {
      // Undvik att processa samma auth state flera gånger
      if (authProcessed && source === 'onAuthStateChanged') {
        console.log('[AUTH] Already processed from redirect, skipping onAuthStateChanged');
        return;
      }

      console.log(`[AUTH] Processing user from ${source}:`, user?.email || 'null');

      if (!isMounted) {
        console.log('[AUTH] Component unmounted, skipping');
        return;
      }

      if (user && user.email) {
        const allowedDomains = ['uropenn.se', 'jetaime.se'];
        const userDomain = user.email.split('@')[1];

        console.log('[AUTH] Checking domain:', userDomain);

        if (!allowedDomains.includes(userDomain)) {
          console.error('[AUTH] Unauthorized domain:', userDomain);
          await signOut(auth);
          alert(`Endast användare från @uropenn.se eller @jetaime.se kan logga in`);
          setCurrentUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        console.log('[AUTH] Domain authorized, checking admin status...');

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const isAdminUser = userData?.isAdmin === true;
          console.log('[AUTH] Admin status:', isAdminUser, 'User data:', userData);

          if (isMounted) {
            setIsAdmin(isAdminUser);
            setCurrentUser(user);
            authProcessed = true;
          }
        } catch (error) {
          console.error('[AUTH] Error checking admin status:', error);
          if (isMounted) {
            setIsAdmin(false);
            setCurrentUser(user);
            authProcessed = true;
          }
        }
      } else {
        console.log('[AUTH] No user, clearing state');
        if (isMounted) {
          setIsAdmin(false);
          setCurrentUser(null);
        }
      }

      if (isMounted) {
        setLoading(false);
        console.log('[AUTH] Loading complete');
      }
    };

    // Sätt upp auth state listener FÖRST - detta är kritiskt för session persistence
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] onAuthStateChanged triggered:', user?.email || 'null');
      await handleUser(user, 'onAuthStateChanged');
    });

    // Hantera redirect-resultat separat
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          console.log('[AUTH] Redirect result found:', result.user.email);
          await handleUser(result.user, 'redirect');
        } else {
          console.log('[AUTH] No redirect result');
        }
      })
      .catch((error: any) => {
        console.error('[AUTH] Redirect error:', error.code, error.message);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    console.log('[AUTH] Starting Google login...');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    await signInWithRedirect(auth, provider);
  };

  const logout = async () => {
    console.log('[AUTH] Logging out...');
    setIsAdmin(false);
    await signOut(auth);
  };

  const value = {
    currentUser,
    loginWithGoogle,
    logout,
    loading,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
