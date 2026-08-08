import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../common/CarbonToastContainer';

export const OrderEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { clients, products, frigos, stocks, orders, createOrder, updateOrder } = useERP();
  const { notifySuccess, notifyError } = useToast();

  const [clientId, setClientId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (editId && orders) {
      const order = orders.find(o => o.id === editId);
      if (order) {
        setClientId(order.clientId || '');
        setExpectedDeliveryDate(order.expectedDeliveryDate || new Date().toISOString().slice(0, 10));
        setNotes(order.notes || '');
        setItems(order.items || []);
      }
    }
  }, [editId, orders]);


  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        productId: '',
        frigoId: '',
        quantityKg: 0,
        quantityPallets: 0,
        unitPriceHT: 0,
        vatRate: 20,
        unitCostHT: 0,
        totalHT: 0,
        totalTTC: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'productId') {
      const product = products?.find(p => p.id === value);
      if (product) {
        item.unitPriceHT = product.sellingPriceHT || 0;
        item.vatRate = product.vatRate || 20;
        item.unitCostHT = product.costPriceHT || 0;
        if (item.quantityKg > 0 && product.kgPerPallet) {
          item.quantityPallets = Math.ceil(item.quantityKg / product.kgPerPallet);
        }
      }
    }

    if (field === 'quantityKg') {
      const product = products?.find(p => p.id === item.productId);
      if (product && product.kgPerPallet) {
        item.quantityPallets = Math.ceil(Number(value) / product.kgPerPallet);
      }
    }

    item.totalHT = Number(item.quantityKg) * Number(item.unitPriceHT);
    const rawVat = item.vatRate !== undefined ? item.vatRate : 20;
    const vatRatio = rawVat <= 1 ? rawVat : rawVat / 100;
    item.totalTTC = item.totalHT * (1 + vatRatio);

    newItems[index] = item;
    setItems(newItems);
  };

  const totalHT = items.reduce((sum, item) => sum + Number(item.totalHT || 0), 0);
  const totalTTC = items.reduce((sum, item) => sum + Number(item.totalTTC || 0), 0);
  const totalVAT = totalTTC - totalHT;
  const totalCostHT = items.reduce((sum, item) => sum + (Number(item.quantityKg || 0) * Number(item.unitCostHT || 0)), 0);
  const grossMarginHT = totalHT - totalCostHT;
  const marginPercentage = totalHT > 0 ? (grossMarginHT / totalHT) * 100 : 0;

  const handleSave = () => {
    // Validate stock availability per item & frigo
    for (const it of items) {
      if (!it.productId || !it.frigoId) continue;
      const stk = stocks?.find(s => s.frigoId === it.frigoId && s.productId === it.productId);
      const prd = products?.find(p => p.id === it.productId);
      const frg = frigos?.find(f => f.id === it.frigoId);
      const availKg = stk ? stk.quantityKg : 0;

      if (it.quantityKg > availKg) {
        notifyError(
          `Le stock dans "${frg?.name || 'sélectionné'}" est insuffisant pour "${prd?.name || 'sélectionné'}".\n• Disponible: ${availKg.toLocaleString()} Kg\n• Demandé: ${it.quantityKg.toLocaleString()} Kg`,
          'Commande Bloquée — Stock Insuffisant'
        );
        return;
      }
    }

    const client = clients?.find(c => c.id === clientId);
    const payload = {
      clientId,
      clientName: client?.name || '',
      clientICE: client?.ice || '',
      clientPhone: client?.phone || '',
      clientEmail: client?.email || '',
      expectedDeliveryDate,
      notes,
      items,
      totalHT,
      totalVAT,
      totalTTC,
      totalCostHT,
      grossMarginHT,
      marginPercentage
    };

    if (editId) {
      if (updateOrder) updateOrder(editId, payload);
      notifySuccess('Commande mise à jour avec succès', 'Modifications Enregistrées');
    } else {
      if (createOrder) {
        createOrder({
          ...payload,
          id: `ord-${Date.now()}`,
          orderNumber: `CMD-2026-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          status: 'NOUVEAU',
          date: new Date().toISOString()
        });
        notifySuccess('Nouvelle Commande enregistrée & BLs générés !', 'Commande Créée');
      }
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
            {editId ? t('sales.editOrder', 'Modifier le Bon de Commande / BL') : t('sales.newOrder', 'Saisir un Nouveau Bon de Commande / BL')}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
            <X className="w-4 h-4" />
            {t('common.cancel', 'Annuler')}
          </button>
          <button
            onClick={handleSave}
            disabled={!clientId || items.length === 0}
            className="px-4 py-2 bg-[#0f62fe] text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {t('common.save', 'Enregistrer')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('sales.generalInfo', 'Informations Générales')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.client', 'Client')}</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('common.select', 'Sélectionner...')}</option>
                  {clients?.map((client: any) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.expectedDeliveryDate', 'Date de Livraison Prévue')}</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes', 'Notes / Instructions de Livraison')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">{t('sales.items', 'Articles & Ventilation par Frigo')}</h2>
              <button onClick={handleAddItem} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                <Plus className="w-4 h-4" />
                {t('common.add', 'Ajouter une ligne')}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200 text-sm text-gray-600">
                    <th className="py-3 px-4 font-medium">{t('sales.product', 'Produit')}</th>
                    <th className="py-3 px-4 font-medium">{t('sales.frigo', 'Entrepôt Frigo')}</th>
                    <th className="py-3 px-4 font-medium">{t('sales.quantityKg', 'Quantité (Kg)')}</th>
                    <th className="py-3 px-4 font-medium">{t('sales.unitPriceHT', 'Prix Unitaire HT')}</th>
                    <th className="py-3 px-4 font-medium">{t('sales.totalHT', 'Total HT')}</th>
                    <th className="py-3 px-4 font-medium">{t('sales.totalTTC', 'Total TTC')}</th>
                    <th className="py-3 px-4 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="text-sm">
                      <td className="py-3 px-4">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full border border-gray-300 rounded p-1.5"
                        >
                          <option value="">{t('common.select', 'Sélectionner...')}</option>
                          {products?.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={item.frigoId}
                          onChange={(e) => handleItemChange(index, 'frigoId', e.target.value)}
                          className="w-full border border-gray-300 rounded p-1.5"
                        >
                          <option value="">{t('common.select', 'Sélectionner...')}</option>
                          {frigos?.map((f: any) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={item.quantityKg}
                          onChange={(e) => handleItemChange(index, 'quantityKg', e.target.value)}
                          className="w-full border border-gray-300 rounded p-1.5"
                          min="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={item.unitPriceHT}
                          onChange={(e) => handleItemChange(index, 'unitPriceHT', e.target.value)}
                          className="w-full border border-gray-300 rounded p-1.5"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{item.totalHT.toFixed(2)}</td>
                      <td className="py-3 px-4 font-medium">{item.totalTTC.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500 text-sm">{t('common.noData', 'Aucun article ajouté')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <div className="w-64 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-gray-600">{t('sales.totalHT', 'Total HT')}:</span>
                  <span className="font-semibold">{totalHT.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-gray-600">{t('sales.totalVAT', 'Total TVA')}:</span>
                  <span className="font-semibold">{totalVAT.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-lg text-blue-600">
                  <span>{t('sales.totalTTC', 'Total TTC')}:</span>
                  <span>{totalTTC.toFixed(2)} DH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
