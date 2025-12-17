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

    // Sätt upp auth state listener FÖRST - detta är kritiskt!
    // onAuthStateChanged triggas automatiskt när Firebase har återställt auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] Auth state changed. User:', user?.email || 'null');

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

        // Kolla admin-status EN gång vid inloggning och cacha
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const isAdminUser = userData?.isAdmin === true;
          console.log('[AUTH] Admin status:', isAdminUser, 'User data:', userData);
          setIsAdmin(isAdminUser);
        } catch (error) {
          console.error('[AUTH] Error checking admin status:', error);
          setIsAdmin(false);
        }

        console.log('[AUTH] Setting current user');
        setCurrentUser(user);
      } else {
        console.log('[AUTH] No user, clearing state');
        setIsAdmin(false);
        setCurrentUser(null);
      }

      setLoading(false);
      console.log('[AUTH] Loading complete');
    });

    // Hantera redirect-resultat separat för att fånga eventuella errors
    // Detta behövs INTE för att sätta user state - det gör onAuthStateChanged
    // Men det kan ge oss information om redirect-errors
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('[AUTH] Redirect result received:', result.user.email);
        } else {
          console.log('[AUTH] No pending redirect result');
        }
      })
      .catch((error) => {
        console.error('[AUTH] Redirect error:', error);
        // Om redirect failar, sätt loading till false så användaren kan försöka igen
        setLoading(false);
      });

    return () => {
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    await signInWithRedirect(auth, provider);
  };

  const logout = async () => {
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
