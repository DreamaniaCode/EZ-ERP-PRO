import React, { useState, useEffect } from 'react';
import { Smartphone, Download, ExternalLink, CheckCircle2, X, Share, PlusSquare, Monitor, Check, RefreshCw } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}) => {
  const [activeOsTab, setActiveOsTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isForceUpdating, setIsForceUpdating] = useState(false);

  const handleForceUpdate = async () => {
    setIsForceUpdating(true);
    try {
      if ((window as any).forcePWAUpdate) {
        await (window as any).forcePWAUpdate();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Force update error:', err);
      window.location.reload();
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(!!standalone);

      // Detect OS automatically
      const userAgent = navigator.userAgent || '';
      if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        setActiveOsTab('ios');
      } else if (/Android/.test(userAgent)) {
        setActiveOsTab('android');
      } else {
        setActiveOsTab('desktop');
      }
    }
  }, [isOpen]);

  const handleNativePromptInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          if (onInstallSuccess) onInstallSuccess();
        }
      } catch (err) {
        console.error('Erreur installation PWA:', err);
      } finally {
        setInstalling(false);
      }
    } else {
      // Direct instruction popup for PC / Chrome / Edge users
      setActiveOsTab('desktop');
      alert("Sur PC (Chrome / Edge) : Cliquez sur l'icône 💻 ou ⊕ située tout à droite de la barre d'adresse de votre navigateur en haut pour installer EasyERP Pro !");
    }
  };

  const handleOpenNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-[#161616] text-white p-4 flex justify-between items-center border-b border-[#393939]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0f62fe] flex items-center justify-center text-white font-bold shadow">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
                <span>Installer EasyERP Pro</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                  PWA PC & Mobile
                </span>
              </h3>
              <p className="text-xs text-gray-400">Application Web Progressive (Négoce & Frigo)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg transition hover:bg-[#262626]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* Force Update & Clear Cache Section */}
          <div className="bg-[#161616] text-white p-3.5 rounded-xl border border-amber-500/40 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Mise à jour & Purge du Cache Mobile</span>
              </div>
              <span className="text-[10px] font-mono bg-[#262626] text-emerald-400 px-1.5 py-0.5 rounded border border-[#393939] font-bold">
                v2.5 PWA
              </span>
            </div>
            <p className="text-[11px] text-gray-300">
              Si la version mobile installée sur votre écran d'accueil n'est pas à jour ou présente des lenteurs d'affichage, forcez la mise à jour immédiate.
            </p>
            <button
              onClick={handleForceUpdate}
              disabled={isForceUpdating}
              className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isForceUpdating ? 'animate-spin' : ''}`} />
              <span>{isForceUpdating ? 'Réinitialisation du cache...' : '⚡ Forcer la mise à jour (Vider le cache)'}</span>
            </button>
          </div>

          {/* Standalone status banner */}
          {isStandalone ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3 text-emerald-800 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Application déjà installée !</span>
                <p className="text-[11px] text-emerald-700">Vous utilisez actuellement EasyERP Pro en mode natif autonome (standalone).</p>
              </div>
            </div>
          ) : installSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3 text-emerald-800 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Installation réussie !</span>
                <p className="text-[11px] text-emerald-700">L'icône de l'application a été ajoutée à votre écran d'accueil.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Primary 1-Click Install Button - ALWAYS SHOWN */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center space-y-3">
                <div className="text-xs font-semibold text-blue-900">
                  Installer l'application sur cet ordinateur (PC/Mac) ou Smartphone :
                </div>
                <button
                  onClick={handleNativePromptInstall}
                  disabled={installing}
                  className="w-full bg-[#0f62fe] hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-lg shadow-md transition flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  <span>{installing ? 'Installation en cours...' : "Installer EasyERP Pro sur cet appareil"}</span>
                </button>
              </div>


              {/* Standalone New Tab escape option */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs text-gray-700">
                  <span className="font-bold block">Ouvrir dans un onglet dédié ?</span>
                  <span className="text-[11px] text-gray-500">Pour profiter du plein écran et déclencher l'installation du navigateur.</span>
                </div>
                <button
                  onClick={handleOpenNewTab}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded transition flex items-center gap-1.5 shrink-0"
                >
                  <span>Nouvel onglet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* OS Guided Tabs */}
              <div>
                <div className="text-xs font-bold text-gray-800 mb-2">Guide d'installation manuel par appareil :</div>
                
                <div className="flex border-b border-gray-200 bg-gray-100 p-1 rounded-lg text-xs font-semibold mb-3">
                  <button
                    onClick={() => setActiveOsTab('android')}
                    className={`flex-1 py-1.5 px-2 rounded transition flex items-center justify-center gap-1.5 ${
                      activeOsTab === 'android' ? 'bg-white text-[#0f62fe] shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android (Chrome)</span>
                  </button>
                  <button
                    onClick={() => setActiveOsTab('ios')}
                    className={`flex-1 py-1.5 px-2 rounded transition flex items-center justify-center gap-1.5 ${
                      activeOsTab === 'ios' ? 'bg-white text-[#0f62fe] shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Share className="w-3.5 h-3.5" />
                    <span>iPhone / iPad (Safari)</span>
                  </button>
                  <button
                    onClick={() => setActiveOsTab('desktop')}
                    className={`flex-1 py-1.5 px-2 rounded transition flex items-center justify-center gap-1.5 ${
                      activeOsTab === 'desktop' ? 'bg-white text-[#0f62fe] shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>PC / Mac</span>
                  </button>
                </div>

                {/* Tab Instructions Content */}
                {activeOsTab === 'android' && (
                  <div className="space-y-2 text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                      <p>Ouvrez le menu Chrome en appuyant sur les trois points vertical <strong>⋮</strong> en haut à droite.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                      <p>Appuyez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                      <p>Validez le message de confirmation. L'application EasyERP Pro s'ouvrira désormais sans la barre d'adresse.</p>
                    </div>
                  </div>
                )}

                {activeOsTab === 'ios' && (
                  <div className="space-y-2 text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                      <p>Assurez-vous d'ouvrir ce lien dans le navigateur <strong>Safari</strong> sur votre iPhone/iPad.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                      <p className="flex items-center gap-1">
                        Appuyez sur le bouton de partage <strong><Share className="w-3.5 h-3.5 inline text-blue-600" /> Partager</strong> situé dans la barre en bas.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                      <p className="flex items-center gap-1">
                        Faites défiler le menu et sélectionnez <strong><PlusSquare className="w-3.5 h-3.5 inline text-blue-600" /> Sur l'écran d'accueil</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                      <p>Cliquez sur <strong>« Ajouter »</strong> en haut à droite.</p>
                    </div>
                  </div>
                )}

                {activeOsTab === 'desktop' && (
                  <div className="space-y-2 text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                      <p>Dans Chrome ou Edge, repérez l'icône d'installation <strong>⊕ / 💻</strong> située à droite dans la barre d'adresse.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0f62fe] text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                      <p>Cliquez sur <strong>« Installer »</strong> dans la boîte de dialogue qui s'affiche.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Benefits checklist */}
              <div className="border-t border-gray-200 pt-3 text-xs text-gray-600 space-y-1.5">
                <div className="font-bold text-gray-800">Pourquoi installer l'application PWA ?</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Lancement instantané</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Affichage plein écran 100%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Accès rapide caméra QR</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Consultation hors-ligne</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
