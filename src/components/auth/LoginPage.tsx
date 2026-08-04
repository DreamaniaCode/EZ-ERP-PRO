import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Loader2, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { AppUser, DEFAULT_ROLE_PERMISSIONS } from '../../types/permissions';
import '../../i18n';

interface LoginPageProps {
  onLoginSuccess: (user?: AppUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);


  const toggleLanguage = (lang?: string) => {
    const newLang = lang || (i18n.language === 'fr' ? 'ar' : 'fr');
    i18n.changeLanguage(newLang);
    document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', newLang);
    localStorage.setItem('erp_language', newLang);
  };

  const executeLocalFallbackLogin = (emailInput: string) => {
    // Try to find the user in the ERP users list (localStorage) to respect their actual role
    let matchedRole: 'ADMIN' | 'COMMERCIAL' | 'RESPONSABLE_FRIGO' | 'COMPTABLE' = 'ADMIN';
    let matchedName = 'Super Admin';
    let matchedFrigoId: string | undefined = undefined;
    let matchedUid = 'local-uid-' + Date.now();

    try {
      // 1. Check erp_app_users (AppUser format from UserManagement)
      const savedAppUsers = localStorage.getItem('erp_app_users');
      if (savedAppUsers) {
        const appUsers = JSON.parse(savedAppUsers);
        const found = appUsers.find((u: any) => u.email?.toLowerCase() === emailInput.toLowerCase());
        if (found) {
          matchedRole = found.role || 'ADMIN';
          matchedName = found.displayName || found.name || emailInput;
          matchedFrigoId = found.assignedFrigoId;
          matchedUid = found.uid || found.id || matchedUid;
        }
      }

      // 2. Fallback: check erp_current_user (UserProfile format, last known login)
      if (matchedName === 'Super Admin' && matchedRole === 'ADMIN') {
        const savedCurrentUser = localStorage.getItem('erp_current_user');
        if (savedCurrentUser) {
          const cu = JSON.parse(savedCurrentUser);
          if (cu.email?.toLowerCase() === emailInput.toLowerCase()) {
            matchedRole = cu.role || 'ADMIN';
            matchedName = cu.name || cu.displayName || emailInput;
            matchedFrigoId = cu.assignedFrigoId;
            matchedUid = cu.id || matchedUid;
          }
        }
      }
      // 3. Fallback heuristic by email address name
      if (matchedName === 'Super Admin' && matchedRole === 'ADMIN' && emailInput.toLowerCase().includes('frigo')) {
        matchedRole = 'RESPONSABLE_FRIGO';
        matchedName = 'Responsable Frigo MFADEL';
        matchedFrigoId = 'frigo-1';
      }
    } catch (e) {
      console.warn('Could not look up local user list:', e);
    }

    const localUser: AppUser = {
      uid: matchedUid,
      email: emailInput,
      displayName: matchedName,
      role: matchedRole,
      assignedFrigoId: matchedFrigoId,
      permissions: DEFAULT_ROLE_PERMISSIONS[matchedRole] || DEFAULT_ROLE_PERMISSIONS['ADMIN'],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    onLoginSuccess(localUser);
  };

  const handleLoginSubmit = async (emailToUse: string, passwordToUse: string) => {
    setError(null);
    setLoading(true);

    try {
      // 1. Attempt standard Firebase sign in
      await signInWithEmailAndPassword(auth, emailToUse, passwordToUse);
      onLoginSuccess();
      return;
    } catch (err: any) {
      console.warn('Firebase sign-in response code:', err?.code);

      // 2. If user account does not exist in Firebase, auto-create it
      try {
        await createUserWithEmailAndPassword(auth, emailToUse, passwordToUse);
        onLoginSuccess();
        return;
      } catch (createErr: any) {
        console.warn('Firebase user creation response code:', createErr?.code);
        
        // 3. Fallback when Firebase Auth Email/Password provider is disabled (auth/operation-not-allowed) or offline:
        if (
          createErr?.code === 'auth/operation-not-allowed' || 
          err?.code === 'auth/operation-not-allowed' ||
          createErr?.code === 'auth/network-request-failed' ||
          err?.code === 'auth/network-request-failed'
        ) {
          executeLocalFallbackLogin(emailToUse);
          return;
        }

        setError(t('auth.loginError', 'Email ou mot de passe incorrect (ou service non configuré)'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginSubmit(email, password);
  };

  const handleDemoAdminLogin = () => {
    setEmail('admin@easyerp.com');
    setPassword('admin123456');
    handleLoginSubmit('admin@easyerp.com', 'admin123456');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-950 select-none">

      
      {/* Dynamic Modern Abstract Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/25 rounded-full blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse delay-500"></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ 
            backgroundImage: `radial-gradient(#0f62fe 1px, transparent 1px)`, 
            backgroundSize: '24px 24px' 
          }}
        ></div>
      </div>

      {/* Top Header: Language Switcher */}
      <div className="absolute top-5 right-5 rtl:left-5 rtl:right-auto z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleLanguage('fr')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            i18n.language === 'fr' 
              ? 'bg-[#0f62fe] text-white shadow-lg shadow-blue-500/50 scale-105 border border-blue-400/40' 
              : 'bg-white/10 text-gray-300 hover:bg-white/20 backdrop-blur-md border border-white/10'
          }`}
        >
          🇫🇷 Français
        </button>

        <button
          type="button"
          onClick={() => toggleLanguage('ar')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            i18n.language === 'ar' 
              ? 'bg-[#0f62fe] text-white shadow-lg shadow-blue-500/50 scale-105 border border-blue-400/40' 
              : 'bg-white/10 text-gray-300 hover:bg-white/20 backdrop-blur-md border border-white/10'
          }`}
        >
          🇸🇦 العربية
        </button>
      </div>

      {/* Main Logo & Title Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-5">
          <div className="relative group">
            {/* Glowing animated aura behind logo */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 blur-lg opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            
            <div className="relative p-1.5 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl">
              <img 
                src="/ez_erp_logo.jpg" 
                alt="EasyERP Pro Logo" 
                className="w-20 h-20 rounded-xl object-cover shadow-inner"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        <h2 className="text-center text-3xl font-black text-white tracking-tight drop-shadow-md font-sans bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
          {t('app.name', 'EasyERP Pro')}
        </h2>
        <p className="mt-1.5 text-center text-xs text-cyan-200/90 font-medium drop-shadow max-w-xs mx-auto">
          {t('auth.subtitle', 'Connectez-vous pour accéder à votre espace de gestion')}
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-2xl py-8 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] sm:rounded-3xl sm:px-10 border border-blue-500/20">



          {error && (
            <div className="mb-6 bg-red-950/90 border-l-4 border-red-500 p-3.5 rounded-r-xl">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="ml-3 rtl:ml-0 rtl:mr-3 text-xs font-medium text-red-200">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-200 uppercase tracking-wider mb-1.5">
                {t('auth.email', 'Adresse email')}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 rtl:pl-3.5 rtl:pr-10 bg-white/10 border border-white/20 rounded-xl py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent text-sm transition-all"
                  placeholder="admin@easyerp.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-200 uppercase tracking-wider mb-1.5">
                {t('auth.password', 'Mot de passe')}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 rtl:pl-3.5 rtl:pr-10 bg-white/10 border border-white/20 rounded-xl py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent text-sm transition-all"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#0f62fe] focus:ring-[#0f62fe] border-gray-600 rounded bg-white/10 cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 rtl:ml-0 rtl:mr-2 block text-xs text-gray-300 cursor-pointer">
                  {t('auth.rememberMe', 'Se souvenir de moi')}
                </label>
              </div>

              <div className="text-xs">
                <a href="#" onClick={(e) => e.preventDefault()} className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  {t('auth.forgotPassword', 'Mot de passe oublié ?')}
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-blue-400/30 rounded-xl shadow-xl text-sm font-bold text-white bg-[#0f62fe] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f62fe] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t('auth.loginButton', 'Se connecter')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
