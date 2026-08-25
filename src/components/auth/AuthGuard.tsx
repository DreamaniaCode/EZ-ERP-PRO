import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { AppUser, DEFAULT_ROLE_PERMISSIONS } from '../../types/permissions';
import { api } from '../../lib/api';
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
          // 1. Check PostgreSQL Database users first (Single Source of Truth)
          let pgUser: any = null;
          try {
            const dbUsers = await api.getUsers();
            if (Array.isArray(dbUsers)) {
              pgUser = dbUsers.find(
                (u: any) => u.email?.toLowerCase() === (firebaseUser.email || '').toLowerCase()
              );
            }
          } catch (dbErr) {
            console.warn('Could not fetch users from database API:', dbErr);
          }

          if (pgUser) {
            const userFromDb: AppUser = {
              uid: firebaseUser.uid,
              email: pgUser.email || firebaseUser.email || '',
              displayName: pgUser.name || pgUser.displayName || firebaseUser.displayName || 'Utilisateur',
              role: pgUser.role || 'RESPONSABLE_FRIGO',
              assignedFrigoId: pgUser.assignedFrigoId || undefined,
              permissions: DEFAULT_ROLE_PERMISSIONS[pgUser.role] || DEFAULT_ROLE_PERMISSIONS['RESPONSABLE_FRIGO'],
              isActive: pgUser.isActive !== false,
              createdAt: pgUser.createdAt || new Date().toISOString(),
            };
            setAppUser(userFromDb);
            localStorage.setItem('erp_local_session', JSON.stringify(userFromDb));
            setLoading(false);
            return;
          }

          // 2. Check Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            setAppUser(userData);
            localStorage.setItem('erp_local_session', JSON.stringify(userData));
          } else {
            // 3. Check local users list
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

            // 4. Default by email pattern (safe defaults)
            const emailLower = (firebaseUser.email || '').toLowerCase();
            const inferredRole = 
              emailLower.includes('admin') || emailLower.includes('gerant') ? 'SUPER_ADMIN' :
              emailLower.includes('frigo') || emailLower.includes('quai') || emailLower.includes('depot') ? 'RESPONSABLE_FRIGO' :
              emailLower.includes('commercial') || emailLower.includes('vente') ? 'COMMERCIAL' :
              emailLower.includes('comptab') || emailLower.includes('facture') ? 'COMPTABLE_FACTURES' :
              emailLower.includes('stock') ? 'AGENT_STOCK' : 'CONTROLEUR';

            const userToSave: AppUser = foundLocalUser || {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
              role: inferredRole as any,
              assignedFrigoId: inferredRole === 'RESPONSABLE_FRIGO' ? 'frigo-1' : undefined,
              permissions: DEFAULT_ROLE_PERMISSIONS[inferredRole] || DEFAULT_ROLE_PERMISSIONS['CONTROLEUR'],
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
          const emailLower = (firebaseUser.email || '').toLowerCase();
          const fallbackRole = 
            emailLower.includes('admin') || emailLower.includes('gerant') ? 'SUPER_ADMIN' :
            emailLower.includes('frigo') || emailLower.includes('quai') ? 'RESPONSABLE_FRIGO' :
            emailLower.includes('commercial') ? 'COMMERCIAL' :
            emailLower.includes('comptab') ? 'COMPTABLE_FACTURES' : 'CONTROLEUR';

          const fallbackUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
            role: fallbackRole as any,
            assignedFrigoId: fallbackRole === 'RESPONSABLE_FRIGO' ? 'frigo-1' : undefined,
            permissions: DEFAULT_ROLE_PERMISSIONS[fallbackRole] || DEFAULT_ROLE_PERMISSIONS['CONTROLEUR'],
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
