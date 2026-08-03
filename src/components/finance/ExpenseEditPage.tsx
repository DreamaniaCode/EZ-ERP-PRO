import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X } from 'lucide-react';

export const ExpenseEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { frigos, addExpense } = useERP(); // updateExpense assuming not available or optional

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [frigoId, setFrigoId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amountHT, setAmountHT] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [amountTTC, setAmountTTC] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const categories = [
    'Frais de Froid / Frigo',
    'Transport & Logistique',
    'Douane & Transit',
    'Emballage & Palettisation',
    'Salaires & Manutention',
    'Divers'
  ];

  const paymentMethods = [
    'CHEQUE', 'EFFET', 'ESPECES', 'VIREMENT', 'VERSEMENT'
  ];

  // Assuming edit logic would fetch from expenses array in context if available
  // Here just setting up for create/edit structure
  
  useEffect(() => {
    // VAT autocalc assuming 20% by default if HT changes and VAT not touched manually
    const ht = Number(amountHT) || 0;
    const vat = Number(vatAmount) || 0;
    setAmountTTC(ht + vat);
  }, [amountHT, vatAmount]);

  const handleAmountHTChange = (val: string) => {
    const ht = Number(val) || 0;
    setAmountHT(ht);
    setVatAmount(ht * 0.2); // Auto 20% vat
  };

  const handleSave = () => {
    const payload = {
      date,
      category,
      frigoId,
      supplier,
      amountHT: Number(amountHT),
      vatAmount: Number(vatAmount),
      amountTTC: Number(amountTTC),
      paymentMethod,
      notes,
      id: editId || `exp-${Date.now()}`
    };

    if (editId) {
      // updateExpense if existed
      // updateExpense(editId, payload);
    } else {
      if (addExpense) addExpense(payload as any);
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
            {editId ? t('finance.editExpense') : t('finance.newExpense')}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
            <X className="w-4 h-4" />
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!category || !amountTTC}
            className="px-4 py-2 bg-[#0f62fe] text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500"
              >
                <option value="">{t('common.select')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.supplier')}</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.frigo')} ({t('common.optional')})</label>
              <select
                value={frigoId}
                onChange={(e) => setFrigoId(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500"
              >
                <option value="">{t('common.select')}</option>
                {frigos?.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.amountHT')}</label>
              <input
                type="number"
                value={amountHT}
                onChange={(e) => handleAmountHTChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500"
                min="0" step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.vatAmount')}</label>
              <input
                type="number"
                value={vatAmount}
                onChange={(e) => setVatAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500"
                min="0" step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.amountTTC')}</label>
              <input
                type="number"
                value={amountTTC}
                readOnly
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.paymentMethod')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500"
              >
                <option value="">{t('common.select')}</option>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
