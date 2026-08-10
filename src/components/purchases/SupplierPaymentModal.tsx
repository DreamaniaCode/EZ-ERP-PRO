import React, { useState } from 'react';
import { PurchaseImportInvoice, PaymentMethod } from '../../types';
import { useERP } from '../../context/ERPContext';
import { CreditCard, DollarSign, X, CheckCircle, Building2, Calendar, FileText } from 'lucide-react';

interface SupplierPaymentModalProps {
  invoice: PurchaseImportInvoice;
  onClose: () => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({ invoice, onClose }) => {
  const { addPurchasePayment } = useERP();

  const totalAmount = invoice.totalLandedCostHT || 0;
  const currentPaid = invoice.paidAmount || 0;
  const initialRemaining = invoice.remainingBalance !== undefined ? invoice.remainingBalance : Math.max(0, totalAmount - currentPaid);

  const [amount, setAmount] = useState<number | ''>(initialRemaining);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIREMENT');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('BMCE');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert('Veuillez saisir un montant de règlement valide supérieur à 0 DH.');
      return;
    }

    if (numericAmount > initialRemaining + 0.01) {
      if (!window.confirm(`Le montant saisi (${numericAmount.toLocaleString()} DH) dépasse le solde restant dû (${initialRemaining.toLocaleString()} DH). Voulez-vous continuer ?`)) {
        return;
      }
    }

    addPurchasePayment(invoice.id, {
      amount: numericAmount,
      paymentMethod,
      date,
      reference,
      bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'EFFET' || paymentMethod === 'VIREMENT') ? bankName : undefined,
      notes
    });

    alert(`✓ Règlement de ${numericAmount.toLocaleString()} DH enregistré avec succès pour la facture ${invoice.invoiceNumber} !`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0f62fe] rounded-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Nouveau Règlement Fournisseur</h3>
              <p className="text-xs text-gray-300 font-mono">Facture N° {invoice.invoiceNumber} • {invoice.supplierName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Invoice Financial Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Facture</span>
              <span className="text-sm font-black font-mono text-gray-900">{totalAmount.toLocaleString()} DH</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Déjà Réglé</span>
              <span className="text-sm font-black font-mono text-emerald-700">{currentPaid.toLocaleString()} DH</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Solde Restant</span>
              <span className="text-sm font-black font-mono text-red-600">{initialRemaining.toLocaleString()} DH</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Montant du Règlement (DH) *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-3 pr-12 py-2.5 border-2 border-indigo-500 rounded-lg font-mono font-black text-lg text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-3 font-bold text-xs text-gray-400">DH</span>
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Mode de Règlement *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-xs font-bold bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VIREMENT">Virement Bancaire</option>
                <option value="CHEQUE">Chèque Fournisseur</option>
                <option value="EFFET">Effet à Payer (LCN)</option>
                <option value="ESPECES">Espèces / Caisse</option>
                <option value="PRELEVEMENT">Prélèvement Bancaire</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Date de Règlement *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-xs font-bold font-mono text-gray-900"
              />
            </div>
          </div>

          {/* Reference & Bank Details for Check / Draft / Wire */}
          {(paymentMethod === 'CHEQUE' || paymentMethod === 'EFFET' || paymentMethod === 'VIREMENT') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase mb-1">
                  N° Référence / Chèque
                </label>
                <input
                  type="text"
                  placeholder="ex: CHQ-987456"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-xs font-mono font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase mb-1">
                  Banque
                </label>
                <input
                  type="text"
                  placeholder="ex: BMCE, Attijariwafa"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-xs font-bold text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Notes & Observations
            </label>
            <input
              type="text"
              placeholder="Remarques complémentaires sur le virement/règlement..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-xs text-gray-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Valider & Enregistrer le Règlement
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
