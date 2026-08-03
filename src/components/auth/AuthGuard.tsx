import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { AppUser, DEFAULT_ROLE_PERMISSIONS } from '../../types/permissions';
import { LoginPage } from './LoginPage';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: (appUser: AppUser) => React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  useEffect(() => {
    // Check if local session bypass exists
    const localSession = localStorage.getItem('erp_local_session');
    if (localSession) {
      try {
        const parsed = JSON.parse(localSession);
        setUser({ uid: parsed.uid, email: parsed.email });
        setAppUser(parsed);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('erp_local_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            setAppUser(userData);
            localStorage.setItem('erp_local_session', JSON.stringify(userData));
          } else {
            // Create default admin profile if none exists
            const defaultAdmin: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'admin@easyerp.com',
              displayName: firebaseUser.displayName || 'Super Admin',
              role: 'ADMIN',
              permissions: DEFAULT_ROLE_PERMISSIONS['ADMIN'],
              isActive: true,
              createdAt: new Date().toISOString(),
            };
            
            try {
              await setDoc(userDocRef, defaultAdmin);
            } catch (e) {
              console.warn("Could not save admin profile to Firestore:", e);
            }
            setAppUser(defaultAdmin);
            localStorage.setItem('erp_local_session', JSON.stringify(defaultAdmin));
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback admin
          const fallbackAdmin: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'admin@easyerp.com',
            displayName: 'Super Admin',
            role: 'ADMIN',
            permissions: DEFAULT_ROLE_PERMISSIONS['ADMIN'],
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          setAppUser(fallbackAdmin);
          localStorage.setItem('erp_local_session', JSON.stringify(fallbackAdmin));
        }
      } else {
        if (!localStorage.getItem('erp_local_session')) {
          setUser(null);
          setAppUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (customUser?: AppUser) => {
    if (customUser) {
      setUser({ uid: customUser.uid, email: customUser.email });
      setAppUser(customUser);
      localStorage.setItem('erp_local_session', JSON.stringify(customUser));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#161616] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#0f62fe] animate-spin mb-4" />
        <div className="text-white text-lg font-medium">Chargement de EasyERP Pro...</div>
      </div>
    );
  }

  if (!user || !appUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <>{children(appUser)}</>;
};
