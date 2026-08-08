import React from 'react';
import { AlertTriangle, CheckCircle2, X, ShieldAlert } from 'lucide-react';

interface CarbonConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const CarbonConfirmModal: React.FC<CarbonConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  let headerColor = 'bg-[#161616] border-b-[#393939]';
  let icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
  let btnColor = 'bg-[#0f62fe] hover:bg-blue-700 text-white';

  if (type === 'danger') {
    icon = <ShieldAlert className="w-5 h-5 text-rose-500" />;
    btnColor = 'bg-[#da1e28] hover:bg-red-700 text-white';
  } else if (type === 'info') {
    icon = <CheckCircle2 className="w-5 h-5 text-blue-400" />;
    btnColor = 'bg-[#0f62fe] hover:bg-blue-700 text-white';
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#161616] border border-[#393939] rounded-lg max-w-lg w-full shadow-2xl overflow-hidden text-white font-sans">
        
        {/* Header */}
        <div className={`px-5 py-4 border-b ${headerColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            {icon}
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-100">
              {title}
            </h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Action Buttons Footer */}
        <div className="bg-[#262626] px-5 py-3 border-t border-[#393939] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#525252] text-gray-300 hover:text-white hover:bg-white/5 rounded text-xs font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-4 py-2 rounded text-xs font-bold transition-colors shadow-md ${btnColor}`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};
