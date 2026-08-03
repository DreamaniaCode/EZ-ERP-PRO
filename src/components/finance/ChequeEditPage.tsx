import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X } from 'lucide-react';

export const ChequeEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { clients, addChequeEffet } = useERP();

  const [type, setType] = useState<'CHEQUE' | 'EFFET'>('CHEQUE');
  const [direction, setDirection] = useState<'RECETTE_CLIENT' | 'DEPENSE_FOURNISSEUR'>('RECETTE_CLIENT');
  const [partyId, setPartyId] = useState('');
  const [reference, setReference] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('EN_PORTEFEUILLE');
  const [invoiceLink, setInvoiceLink] = useState('');
  const [notes, setNotes] = useState('');

  const statuses = ['EN_PORTEFEUILLE', 'DEPOSE', 'ENCAISSE', 'IMPAYE_REJETE'];

  const handleSave = () => {
    const payload = {
      type,
      direction,
      partyId,
      reference,
      bank,
      amount: Number(amount),
      issueDate,
      dueDate,
      status,
      invoiceLink,
      notes,
      id: editId || `chq-${Date.now()}`
    };

    if (editId) {
      // Assuming update method exists or handles
    } else {
      if (addChequeEffet) addChequeEffet(payload as any);
    }
    onBack();
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {editId ? t('finance.editCheque') : t('finance.newCheque')}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
            <X className="w-4 h-4" />
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!reference || !amount}
            className="px-4 py-2 bg-[#0f62fe] text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('finance.type')}</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={type === 'CHEQUE'} onChange={() => setType('CHEQUE')} className="text-blue-600" />
                    <span>{t('finance.cheque')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={type === 'EFFET'} onChange={() => setType('EFFET')} className="text-blue-600" />
                    <span>{t('finance.effet')}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('finance.direction')}</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={direction === 'RECETTE_CLIENT'} onChange={() => setDirection('RECETTE_CLIENT')} className="text-blue-600" />
                    <span>{t('finance.receipt')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={direction === 'DEPENSE_FOURNISSEUR'} onChange={() => setDirection('DEPENSE_FOURNISSEUR')} className="text-blue-600" />
                    <span>{t('finance.payment')}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {direction === 'RECETTE_CLIENT' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.client')}</label>
                  <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full border border-gray-300 rounded-md p-2">
                    <option value="">{t('common.select')}</option>
                    {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.supplier')}</label>
                  <input type="text" value={partyId} onChange={(e) => setPartyId(e.target.value)} placeholder={t('finance.supplierName')} className="w-full border border-gray-300 rounded-md p-2" />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.reference')}</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bank')}</label>
                <input type="text" value={bank} onChange={(e) => setBank(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.amount')}</label>
                <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full border border-gray-300 rounded-md p-2" min="0" step="0.01" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.issueDate')}</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.dueDate')}</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded-md p-2">
                  {statuses.map(s => <option key={s} value={s}>{t(`finance.status_${s}`)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.invoiceLink')}</label>
                <input type="text" value={invoiceLink} onChange={(e) => setInvoiceLink(e.target.value)} placeholder={t('common.optional')} className="w-full border border-gray-300 rounded-md p-2" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md p-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
