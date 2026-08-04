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
    const newLang = i18n.language === 'ar' ? 'fr' : 'ar';
    i18n.changeLanguage(newLang);
    localStorage.setItem('erp_language', newLang);
  };

  return (
    <header className="bg-[#161616] border-b border-[#393939] text-white sticky top-0 z-40 select-none">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 gap-1.5">
        
        {/* Brand & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 text-gray-300 hover:text-white hover:bg-[#262626] rounded-lg transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          )}

          <div className="w-8 h-8 sm:w-9 sm:h-9 p-0.5 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 shrink-0 shadow-md">
            <img src="/ez_erp_logo.jpg" alt="Logo" className="w-full h-full rounded object-cover" />
          </div>
          <div className="hidden min-[380px]:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-wide uppercase text-white font-mono">
                EasyERP <span className="text-[#0f62fe]">PRO</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] bg-[#262626] text-gray-300 border border-[#393939] px-1 py-0.5 rounded font-mono">
                v2.4 PWA
              </span>
            </div>
            <div className="hidden sm:flex text-[10px] text-gray-400 items-center gap-1">
              <Snowflake className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Stock Multi-Frigos & Négoce</span>
            </div>
          </div>
        </div>

        {/* Global Quick Search */}
        <div className="flex items-center flex-1 max-w-[140px] sm:max-w-xs md:max-w-md mx-1 sm:mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full bg-[#262626] border border-[#525252] hover:border-[#0f62fe] text-xs text-gray-300 pl-7 sm:pl-9 pr-2 py-1 sm:py-1.5 rounded text-left relative flex items-center justify-between transition group"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 group-hover:text-[#0f62fe]" />
            <span className="truncate font-mono text-[10px] sm:text-[11px] text-gray-400">{t('common.search')}...</span>
            <span className="hidden md:inline-block text-[10px] bg-[#161616] px-1.5 py-0.5 rounded border border-[#393939] text-gray-400 font-mono">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Right Section: Camera QR + PWA Install + Lang Switcher + Alerts */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Quick Camera QR Code Scanner */}
          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2 py-1 sm:px-2.5 sm:py-1.5 rounded flex items-center gap-1 shadow transition-all"
            title="Ouvrir la caméra mobile pour scanner un QR Code BL"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">Scanner QR</span>
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
            className="bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-semibold px-2 py-1 sm:px-2.5 sm:py-1.5 rounded flex items-center gap-1 shadow transition-all relative group"
            title="Installer l'application PWA sur Smartphone / Tablette / PC"
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-200" />
            <span className="hidden sm:inline font-medium">Installer PWA</span>
            <span className="inline sm:hidden font-medium text-[10px]">PWA</span>
          </button>

          {/* Language Toggle (FR / AR) */}
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 bg-[#262626] hover:bg-[#393939] text-gray-300 hover:text-white border border-[#393939] rounded text-[11px] font-bold font-mono transition-colors"
            title="Changer de langue (FR / AR)"
          >
            {i18n.language === 'ar' ? 'FR' : 'العربية'}
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
              className="relative p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-[#262626] rounded transition-colors"
              title="Notifications & Alertes ERP"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalAlerts > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalAlerts}
                </span>
              )}
            </button>            {showNotifications && (

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

