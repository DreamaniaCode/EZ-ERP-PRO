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
            // Check local users list before defaulting to admin
            let foundLocalUser: AppUser | null = null;
            try {
              const saved = localStorage.getItem('erp_app_users');
              if (saved) {
                const list = JSON.parse(saved);
                const match = list.find((u: any) => u.email?.toLowerCase() === (firebaseUser.email || '').toLowerCase());
                if (match) {
                  foundLocalUser = {
                    uid: firebaseUser.uid,
                    email: match.email,
                    displayName: match.displayName || match.name || 'Utilisateur',
                    role: match.role || 'RESPONSABLE_FRIGO',
                    assignedFrigoId: match.assignedFrigoId || 'frigo-1',
                    permissions: DEFAULT_ROLE_PERMISSIONS[match.role || 'RESPONSABLE_FRIGO'] || DEFAULT_ROLE_PERMISSIONS['RESPONSABLE_FRIGO'],
                    isActive: true,
                    createdAt: new Date().toISOString(),
                  };
                }
              }
            } catch (e) { console.warn("Error reading local user list:", e); }

            const userToSave: AppUser = foundLocalUser || {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
              role: 'ADMIN',
              assignedFrigoId: undefined,
              permissions: DEFAULT_ROLE_PERMISSIONS['ADMIN'],
              isActive: true,
              createdAt: new Date().toISOString(),
            };
            
            try {
              await setDoc(userDocRef, userToSave);
            } catch (e) {
              console.warn("Could not save user profile to Firestore:", e);
            }
            setAppUser(userToSave);
            localStorage.setItem('erp_local_session', JSON.stringify(userToSave));
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          let foundLocalUser: AppUser | null = null;
          try {
            const saved = localStorage.getItem('erp_app_users');
            if (saved) {
              const list = JSON.parse(saved);
              const match = list.find((u: any) => u.email?.toLowerCase() === (firebaseUser.email || '').toLowerCase());
              if (match) {
                foundLocalUser = {
                  uid: firebaseUser.uid,
                  email: match.email,
                  displayName: match.displayName || match.name || 'Utilisateur',
                  role: match.role || 'ADMIN',
                  assignedFrigoId: match.assignedFrigoId,
                  permissions: DEFAULT_ROLE_PERMISSIONS[match.role || 'ADMIN'] || DEFAULT_ROLE_PERMISSIONS['ADMIN'],
                  isActive: true,
                  createdAt: new Date().toISOString(),
                };
              }
            }
          } catch (e) { /* ignore */ }

          const fallbackUser: AppUser = foundLocalUser || {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
            role: 'ADMIN',
            assignedFrigoId: undefined,
            permissions: DEFAULT_ROLE_PERMISSIONS['ADMIN'],
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          setAppUser(fallbackUser);
          localStorage.setItem('erp_local_session', JSON.stringify(fallbackUser));
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
