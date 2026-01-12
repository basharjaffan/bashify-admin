import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
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

    const handleUser = async (user: FirebaseUser | null) => {
      console.log('[AUTH] Processing user:', user?.email || 'null');

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
          }
        } catch (error) {
          console.error('[AUTH] Error checking admin status:', error);
          if (isMounted) {
            setIsAdmin(false);
            setCurrentUser(user);
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

    // Sätt upp auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] onAuthStateChanged triggered:', user?.email || 'null');
      await handleUser(user);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    console.log('[AUTH] Starting Google login with popup...');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged kommer automatiskt triggas med den nya användaren
    } catch (error: any) {
      console.error('[AUTH] Popup login error:', error.code, error.message);
      throw error;
    }
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
