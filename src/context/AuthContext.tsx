import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../lib/firebase';
import { 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
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

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // ✅ VALIDERA DOMÄN HÄR - Nu med flera tillåtna domäner
      if (user && user.email) {
        const allowedDomains = ['uropenn.se', 'jetaime.se'];
        const userDomain = user.email.split('@')[1];
        
        if (!allowedDomains.includes(userDomain)) {
          console.error('Unauthorized domain:', userDomain);
          signOut(auth);
          alert(`Endast användare från @uropenn.se och @jetaime.se kan logga in`);
          setCurrentUser(null);
          setLoading(false);
          return;
        }
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
      // ✅ BEGRÄNSA TILL DIN DOMÄN
      hd: 'uropenn.se'
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request') {
        console.log('Popup blocked, trying redirect...');
        await signInWithRedirect(auth, provider);
      } else {
        throw error;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    loginWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
