import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  notifySuccess: (message: string, title?: string) => void;
  notifyError: (message: string, title?: string) => void;
  notifyWarning: (message: string, title?: string) => void;
  notifyInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, message, type, title, duration };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Keep max 5 active toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const notifySuccess = useCallback((message: string, title = 'Succès') => showToast(message, 'success', title), [showToast]);
  const notifyError = useCallback((message: string, title = 'Erreur') => showToast(message, 'error', title, 6000), [showToast]);
  const notifyWarning = useCallback((message: string, title = 'Attention') => showToast(message, 'warning', title, 5000), [showToast]);
  const notifyInfo = useCallback((message: string, title = 'Information') => showToast(message, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, notifySuccess, notifyError, notifyWarning, notifyInfo }}>
      {children}
      
      {/* Carbon Toast Floating Stack */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none p-2">
        {toasts.map(toast => {
          let borderAccent = 'border-l-[#0f62fe]';
          let icon = <Info className="w-5 h-5 text-[#0f62fe] shrink-0" />;
          let badgeText = 'INFO';
          let badgeBg = 'bg-[#0f62fe]/20 text-blue-300';

          if (toast.type === 'success') {
            borderAccent = 'border-l-[#24a148]';
            icon = <CheckCircle2 className="w-5 h-5 text-[#24a148] shrink-0" />;
            badgeText = 'SUCCÈS';
            badgeBg = 'bg-[#24a148]/20 text-emerald-300';
          } else if (toast.type === 'error') {
            borderAccent = 'border-l-[#da1e28]';
            icon = <AlertCircle className="w-5 h-5 text-[#da1e28] shrink-0" />;
            badgeText = 'ERREUR';
            badgeBg = 'bg-[#da1e28]/20 text-rose-300';
          } else if (toast.type === 'warning') {
            borderAccent = 'border-l-[#f1c21b]';
            icon = <AlertTriangle className="w-5 h-5 text-[#f1c21b] shrink-0" />;
            badgeText = 'ATTENTION';
            badgeBg = 'bg-[#f1c21b]/20 text-amber-300';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-[#161616] text-white border-l-4 ${borderAccent} border-y border-r border-[#393939] shadow-2xl rounded-r p-4 transition-all duration-300 animate-in slide-in-from-top-4 flex items-start gap-3 relative`}
            >
              {icon}
              <div className="flex-1 pr-6 font-sans">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${badgeBg}`}>
                    {badgeText}
                  </span>
                  {toast.title && (
                    <span className="font-bold text-xs tracking-wide uppercase text-gray-200">
                      {toast.title}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-line">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
