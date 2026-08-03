import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { RoleSwitcher } from './RoleSwitcher';
import { signOut } from '../../lib/firebase';
import { AppUser } from '../../types/permissions';
import { 
  Boxes, 
  Bell, 
  Search, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Snowflake,
  Menu,
  X,
  Download,
  Camera,
  QrCode,
  Smartphone
} from 'lucide-react';
import { QRScannerModal } from '../common/QRScannerModal';
import { PWAInstallModal } from '../common/PWAInstallModal';

interface NavbarProps {
  onNavigateToBL: () => void;
  onNavigateToCheques: () => void;
  onOpenSearch?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onNavigateToTab?: (tab: any) => void;
  appUser?: AppUser;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onNavigateToBL, 
  onNavigateToCheques,
  onOpenSearch,
  isMobileMenuOpen,
  onToggleMobileMenu,
  appUser
}) => {
  const { t, i18n } = useTranslation();
  const { deliveryNotes, chequesEffets, currentUser, frigos } = useERP();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('erp_local_session');
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('erp_local_session');
      window.location.href = '/';
    }
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const handleQrCodeScanned = (scannedText: string) => {
    setIsQrScannerOpen(false);
    let code = scannedText.trim();
    if (scannedText.includes('bl=')) {
      const match = scannedText.match(/bl=([^&]+)/);
      if (match) code = match[1];
    }
    window.history.pushState({}, '', `/?bl=${code}`);
    onNavigateToBL();
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  // Pending BLs needing frigo approval
  const pendingBLs = deliveryNotes.filter(bl => {
    if (currentUser.role === 'RESPONSABLE_FRIGO' && currentUser.assignedFrigoId) {
      return !bl.frigoEmployeeApproved && bl.frigoId === currentUser.assignedFrigoId;
    }
    return !bl.frigoEmployeeApproved;
  });

  // Cheques due in next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chequesDueSoon = chequesEffets.filter(c => {
    if (c.status === 'ENCAISSE' || c.status === 'IMPAYE_REJETE') return false;
    const dueDate = new Date(c.dueDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 7;
  });

  const totalAlerts = pendingBLs.length + chequesDueSoon.length;

  return (
    <header className="bg-[#161616] border-b border-[#393939] text-white sticky top-0 z-40 select-none">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2">
        
        {/* Brand & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-[#262626] rounded-lg transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          )}

          <div className="w-9 h-9 p-0.5 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 shrink-0 shadow-md">
            <img src="/ez_erp_logo.jpg" alt="Logo" className="w-full h-full rounded object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-xs sm:text-sm tracking-wide uppercase text-white font-mono">
                EasyERP <span className="text-[#0f62fe]">PRO</span>
              </span>
              <span className="text-[9px] sm:text-[10px] bg-[#262626] text-gray-300 border border-[#393939] px-1 py-0.5 rounded font-mono">
                v2.4 PWA
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
              <Snowflake className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Stock Multi-Frigos & Négoce</span>
            </div>
          </div>
        </div>

        {/* Global Quick Search */}
        <div className="flex items-center flex-1 max-w-xs md:max-w-md mx-2 sm:mx-6">
          <button
            onClick={onOpenSearch}
            className="w-full bg-[#262626] border border-[#525252] hover:border-[#0f62fe] text-xs text-gray-300 pl-9 pr-3 py-1.5 rounded text-left relative flex items-center justify-between transition group"
          >
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-hover:text-[#0f62fe]" />
            <span className="truncate font-mono text-[11px] text-gray-400">{t('common.search')}...</span>
            <span className="hidden sm:inline-block text-[10px] bg-[#161616] px-1.5 py-0.5 rounded border border-[#393939] text-gray-400 font-mono">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Right Section: Camera QR + PWA Install + Alerts + Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* Quick Camera QR Code Scanner */}
          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 shadow transition-all"
            title="Ouvrir la caméra mobile pour scanner un QR Code BL"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Scanner QR</span>
          </button>

          {/* Camera Scanner Modal */}
          <QRScannerModal
            isOpen={isQrScannerOpen}
            onClose={() => setIsQrScannerOpen(false)}
            onScanSuccess={handleQrCodeScanned}
          />
          
          {/* PWA Install Button */}
          <button
            onClick={() => setIsPwaModalOpen(true)}
            className="bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 shadow transition-all relative group"
            title="Installer l'application PWA sur Smartphone / Tablette / PC"
          >
            <Smartphone className="w-4 h-4 text-blue-200" />
            <span className="hidden sm:inline font-medium">Installer PWA</span>
            <span className="inline sm:hidden font-medium">PWA</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-300"></span>
            </span>
          </button>

          {/* PWA Installation Modal */}
          <PWAInstallModal
            isOpen={isPwaModalOpen}
            onClose={() => setIsPwaModalOpen(false)}
            deferredPrompt={deferredPrompt}
            onInstallSuccess={() => setIsInstalled(true)}
          />

          {/* Notifications Drawer */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-300 hover:text-white hover:bg-[#262626] rounded transition-colors"
              title="Notifications & Alertes ERP"
            >
              <Bell className="w-5 h-5" />
              {totalAlerts > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalAlerts}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#161616] border border-[#393939] shadow-2xl z-50 rounded divide-y divide-[#262626]">
                <div className="p-3 text-xs font-semibold text-gray-200 flex items-center justify-between">
                  <span>Centre des Notifications ({totalAlerts})</span>
                  <span className="text-[10px] text-gray-400 font-normal">Temps Réel</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[#262626]">
                  {pendingBLs.length > 0 && (
                    <div className="p-3 bg-amber-950/30">
                      <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-1.5">
                        <Truck className="w-4 h-4" />
                        {pendingBLs.length} BL en attente de validation Frigo
                      </div>
                      <div className="space-y-1">
                        {pendingBLs.slice(0, 3).map(bl => (
                          <div
                            key={bl.id}
                            onClick={() => {
                              onNavigateToBL();
                              setShowNotifications(false);
                            }}
                            className="p-1.5 bg-[#262626] hover:bg-[#393939] rounded cursor-pointer text-[11px] text-gray-200 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-mono text-amber-300">{bl.blNumber}</span> - {bl.clientName}
                              <div className="text-[10px] text-gray-400">{bl.frigoName}</div>
                            </div>
                            <span className="text-[10px] bg-amber-900/60 text-amber-200 px-1 py-0.5 rounded">
                              Validation
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentUser?.role !== 'RESPONSABLE_FRIGO' && chequesDueSoon.length > 0 && (
                    <div className="p-3 bg-blue-950/30">
                      <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-4 h-4" />
                        {chequesDueSoon.length} Chèques / Effets à échéance proche
                      </div>
                      <div className="space-y-1">
                        {chequesDueSoon.slice(0, 3).map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              onNavigateToCheques();
                              setShowNotifications(false);
                            }}
                            className="p-1.5 bg-[#262626] hover:bg-[#393939] rounded cursor-pointer text-[11px] text-gray-200 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-mono text-blue-300">{c.referenceNumber}</span> ({c.partyName})
                              <div className="text-[10px] text-gray-400">Échéance: {c.dueDate}</div>
                            </div>
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              {c.amount.toLocaleString()} DH
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {totalAlerts === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      Aucune alerte urgente pour le moment.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher with Flags */}
          <div className="flex items-center bg-[#262626] border border-[#525252] rounded p-0.5 space-x-1 rtl:space-x-reverse">
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('fr');
                document.documentElement.setAttribute('dir', 'ltr');
                document.documentElement.setAttribute('lang', 'fr');
              }}
              className={`px-2 py-1 text-[11px] font-bold rounded transition-all flex items-center gap-1 ${
                i18n.language === 'fr' 
                  ? 'bg-[#0f62fe] text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-[#393939]'
              }`}
              title="Passer en Français"
            >
              <span>🇫🇷</span>
              <span className="hidden sm:inline">FR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('ar');
                document.documentElement.setAttribute('dir', 'rtl');
                document.documentElement.setAttribute('lang', 'ar');
              }}
              className={`px-2 py-1 text-[11px] font-bold rounded transition-all flex items-center gap-1 ${
                i18n.language === 'ar' 
                  ? 'bg-[#0f62fe] text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-[#393939]'
              }`}
              title="التحويل إلى العربية"
            >
              <span>🇲🇦</span>
              <span className="hidden sm:inline">العربية</span>
            </button>
          </div>

          {/* Role Switcher */}
          <RoleSwitcher />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="px-2 py-1.5 text-[11px] font-semibold rounded transition-colors bg-red-900/40 hover:bg-red-900/70 text-red-300 hover:text-white border border-red-800/40"
            title={t('auth.logout')}
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </header>
  );
};

