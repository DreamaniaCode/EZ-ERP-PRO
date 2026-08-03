import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { ShieldCheck, HardDrive, Wifi, WifiOff, Database } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { deliveryNotes, frigos, stocks } = useERP();
  const pendingCount = deliveryNotes.filter(bl => !bl.frigoEmployeeApproved).length;
  const totalPallets = stocks.reduce((acc, s) => acc + s.quantityPallets, 0);

  const [isOnline, setIsOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className={`h-6 ${isOnline ? 'bg-[#0f62fe]' : 'bg-amber-600'} text-white flex items-center justify-between px-4 text-[10px] font-mono uppercase tracking-wider shrink-0 select-none transition-colors duration-300`}>
      <div className="flex items-center gap-4">
        {isOnline ? (
          <span className="flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            STATUT SYSTÈME: OPTIMAL
          </span>
        ) : (
          <span className="flex items-center gap-1 font-bold text-amber-100 bg-amber-800/80 px-2 py-0.5 rounded border border-amber-400/40">
            <WifiOff className="w-3 h-3 text-amber-200" />
            MODE HORS-LIGNE (STOCKS & BL CACHÉS LOCALEMENT)
          </span>
        )}
        <span className="hidden md:inline text-blue-200">|</span>
        <span className="hidden md:inline text-blue-100 flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-blue-200" />
          {isOnline ? 'BASE: FIRESTORE / ERP DB' : 'STOCKAGE: LOCAL STORAGE (PWA CACHE)'}
        </span>
        <span className="hidden lg:inline text-blue-200">|</span>
        <span className="hidden lg:inline text-blue-100 flex items-center gap-1">
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-300" />
              EN LIGNE
            </>
          ) : (
            <>
              <Database className="w-3 h-3 text-amber-200" />
              CONSULTATION OPTIMISÉE HORS-LIGNE
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-white font-bold bg-blue-700/80 px-2 py-0.5 rounded">
          PALETTES STOCKÉES: {totalPallets} PAL
        </span>
        {pendingCount > 0 ? (
          <span className="bg-amber-400 text-black px-1.5 font-bold rounded">
            {pendingCount} BL EN ATTENTE VAL.
          </span>
        ) : (
          <span className="text-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            TOUS BL VALIDÉS
          </span>
        )}
      </div>
    </footer>
  );
};

