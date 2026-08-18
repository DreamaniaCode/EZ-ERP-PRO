import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const PWAUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      console.log('[PWA Banner] pwa-update-available event caught!');
      if (e.detail && e.detail.registration) {
        setSwRegistration(e.detail.registration);
      }
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa-update-available', handleUpdate);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    try {
      if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        swRegistration.waiting.postMessage({ type: 'CLEAR_CACHE' });
      }
      if ((window as any).forcePWAUpdate) {
        await (window as any).forcePWAUpdate();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to trigger PWA update:', err);
      window.location.reload();
    }
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-50 w-[92%] sm:w-auto max-w-md animate-bounce-short">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-[#161616] text-white p-3.5 sm:p-4 rounded-xl shadow-2xl border border-blue-500/40 backdrop-blur-md flex items-center gap-3">
        
        <div className="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0">
          <Sparkles className="w-5 h-5 text-blue-300 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-xs sm:text-sm text-white truncate">
              Mise à jour disponible !
            </h4>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase font-bold shrink-0">
              Prêt
            </span>
          </div>
          <p className="text-[11px] text-blue-200/90 truncate">
            Une nouvelle version d'EasyERP Pro est prête.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="bg-[#0f62fe] hover:bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-all flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isUpdating ? 'Chargement...' : 'Mettre à jour'}</span>
            <span className="inline sm:hidden">{isUpdating ? '...' : 'MAJ'}</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition hover:bg-white/10"
            title="Ignorer pour cette session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

