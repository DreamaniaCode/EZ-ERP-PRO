import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { DeliveryNoteBL } from '../../types';
import { Building2, Check, FileText, X, ShieldCheck, ArrowRight } from 'lucide-react';

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bl: DeliveryNoteBL | null;
  onConfirmGenerate: (blId: string, selectedCompanyId: string) => void;
}

export const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({
  isOpen,
  onClose,
  bl,
  onConfirmGenerate,
}) => {
  const { companies, activeCompanyId, clients } = useERP();

  const [selectedCompId, setSelectedCompId] = useState<string>(() => {
    if (bl?.companyId && companies.some(c => c.id === bl.companyId)) {
      return bl.companyId;
    }
    if (activeCompanyId !== 'ALL' && companies.some(c => c.id === activeCompanyId)) {
      return activeCompanyId;
    }
    return companies[0]?.id || 'STE_1';
  });

  if (!isOpen || !bl) return null;

  const client = clients.find(c => c.id === bl.clientId);
  const clientICE = client?.ice || '';
  const hasValidIce = Boolean(clientICE && clientICE.trim() !== '' && clientICE !== '000000000000000');
  const vatRate = hasValidIce ? 0.20 : 0.00;
  const totalVAT = bl.totalHT * vatRate;
  const totalTTC = bl.totalHT + totalVAT;

  const selectedCompany = companies.find(c => c.id === selectedCompId) || companies[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmGenerate(bl.id, selectedCompId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
        
        {/* Modal Header */}
        <div className="bg-[#161616] text-white p-4 flex justify-between items-center border-b border-[#393939]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0f62fe] flex items-center justify-center text-white font-bold shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">
                Génération de Facture
              </h3>
              <p className="text-[11px] text-gray-400">
                Depuis le BL {bl.blNumber} • {bl.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* BL & Client Info Recap */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Client :</span>
              <span className="font-bold text-gray-900">{bl.clientName}</span>
            </div>
            <div className="flex justify-between items-center font-mono">
              <span className="text-gray-500 font-medium">ICE Client :</span>
              <span className={`font-semibold ${hasValidIce ? 'text-emerald-700' : 'text-amber-700'}`}>
                {clientICE || 'Non renseigné (TVA 0%)'}
              </span>
            </div>
            <div className="flex justify-between items-center font-mono pt-1.5 border-t border-gray-200">
              <span className="text-gray-500 font-medium">Montant Total :</span>
              <span className="font-bold text-gray-900 text-sm">
                {totalTTC.toLocaleString()} DH TTC <span className="text-[11px] text-gray-500 font-normal">({bl.totalHT.toLocaleString()} DH HT)</span>
              </span>
            </div>
          </div>

          {/* Section: Choose between the 2 Sister Companies */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
              🏢 Société Émettrice de la Facture (Sociétés Sœurs) *
            </label>
            <p className="text-[11px] text-gray-500 mb-3">
              Choisissez sous quelle entité juridique cette facture doit être émise et comptabilisée.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {companies.map((comp) => {
                const isSelected = selectedCompId === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompId(comp.id)}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 relative flex flex-col justify-between select-none ${
                      isSelected
                        ? 'bg-blue-50/90 border-[#0f62fe] ring-2 ring-blue-500/20 shadow-md scale-[1.01]'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          isSelected ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {comp.code}
                        </span>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${
                          isSelected
                            ? 'bg-[#0f62fe] text-white shadow-xs'
                            : 'border-2 border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-gray-900 leading-snug">
                        {comp.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">
                        ICE : {comp.ice || 'Non défini'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-200/70 text-[10px] font-mono flex items-center justify-between text-gray-600">
                      <span>Préfixe :</span>
                      <span className="font-bold text-[#0f62fe]">{comp.invoicePrefix || 'FAC'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 px-4 bg-[#0f62fe] hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Émettre Facture ({selectedCompany?.shortName || selectedCompany?.name})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
