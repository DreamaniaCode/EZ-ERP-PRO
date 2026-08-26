import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X, Plus, Trash2, RefreshCw, Sparkles, Truck } from 'lucide-react';
import { QuickProductModal } from '../stock/QuickProductModal';
import { generateWhatsAppBLLink } from '../../utils/whatsappUtils';
import { useToast } from '../common/CarbonToastContainer';

export const BLEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { clients, frigos, products, stocks, deliveryNotes, addBL, updateBL, activeCompanyId, activeCompany, companies } = useERP();
  const { notifySuccess, notifyError, notifyWarning } = useToast();

  const [companyId, setCompanyId] = useState<string>(activeCompanyId !== 'ALL' ? activeCompanyId : companies[0]?.id || 'STE_1');
  const [clientId, setClientId] = useState('');
  const [frigoId, setFrigoId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<any[]>([]);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);

  // Load existing BL data when editId is provided
  useEffect(() => {
    if (editId && deliveryNotes) {
      const bl = (deliveryNotes || []).find((b: any) => b.id === editId);
      if (bl) {
        if (bl.companyId) setCompanyId(bl.companyId);
        setClientId(bl.clientId || '');
        setFrigoId(bl.frigoId || '');
        setDate(bl.date || new Date().toISOString().slice(0, 10));
        setItems(bl.items ? bl.items.map((it: any) => {
          const prd = products?.find(p => p.id === it.productId || p.code === it.productCode);
          const kgCarton = prd?.kgPerCarton || 10;
          return {
            ...it,
            quantityKg: Number(it.quantityKg || 0),
            quantityCartons: Number(it.quantityCartons || (it.quantityKg ? Math.round(it.quantityKg / kgCarton) : 0)),
            quantityPallets: Number(it.quantityPallets || 0),
            unitPriceHT: Number(it.unitPriceHT || 0),
            totalHT: Number(it.totalHT || (it.quantityKg * it.unitPriceHT)),
            totalTTC: Number(it.totalTTC || (it.quantityKg * it.unitPriceHT))
          };
        }) : []);
      }
    }
  }, [editId, deliveryNotes, products]);

  const handleAddItem = () => {
    const defaultProduct = products && products.length > 0 ? products[0] : null;
    const initialPrice = defaultProduct ? defaultProduct.sellingPriceHT : 0;
    const kgCarton = defaultProduct?.kgPerCarton || 10;
    
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        productId: defaultProduct ? defaultProduct.id : '',
        productName: defaultProduct ? defaultProduct.name : '',
        productCode: defaultProduct ? defaultProduct.code : '',
        quantityKg: 100,
        quantityCartons: Math.round(100 / kgCarton),
        quantityPallets: defaultProduct && defaultProduct.kgPerPallet ? Math.ceil(100 / defaultProduct.kgPerPallet) : 1,
        unitPriceHT: initialPrice,
        totalHT: 100 * initialPrice,
        totalTTC: 100 * initialPrice
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    const product = products?.find(p => p.id === item.productId);
    const kgCarton = product?.kgPerCarton || 10;

    if (field === 'productId') {
      if (product) {
        item.productName = product.name;
        item.productCode = product.code;
        item.unitPriceHT = product.sellingPriceHT || 0;
        const cartons = Number(item.quantityCartons) || 0;
        item.theoreticalKg = cartons * kgCarton;
        item.quantityKg = (item.weighedKg !== undefined && item.weighedKg !== '' && Number(item.weighedKg) > 0) ? Number(item.weighedKg) : item.theoreticalKg;
        if (product.kgPerPallet) {
          item.quantityPallets = Math.ceil(item.quantityKg / product.kgPerPallet);
        }
      }
    }

    if (field === 'quantityCartons') {
      const cartonsVal = Number(value) || 0;
      item.quantityCartons = cartonsVal;
      item.theoreticalKg = cartonsVal * kgCarton;
      item.quantityKg = (item.weighedKg !== undefined && item.weighedKg !== '' && Number(item.weighedKg) > 0) ? Number(item.weighedKg) : item.theoreticalKg;
      if (product && product.kgPerPallet) {
        item.quantityPallets = Math.ceil(item.quantityKg / product.kgPerPallet);
      }
    }

    if (field === 'weighedKg') {
      const weighedVal = value !== '' ? Number(value) : undefined;
      item.weighedKg = weighedVal;
      item.isWeighed = weighedVal !== undefined && weighedVal > 0;
      const cartonsVal = Number(item.quantityCartons) || 0;
      item.theoreticalKg = cartonsVal * kgCarton;
      item.quantityKg = (weighedVal !== undefined && weighedVal > 0) ? weighedVal : (item.theoreticalKg || Number(item.quantityKg));
      if (product && product.kgPerPallet) {
        item.quantityPallets = Math.ceil(item.quantityKg / product.kgPerPallet);
      }
    }

    if (field === 'quantityKg') {
      const kgVal = Number(value) || 0;
      item.quantityKg = kgVal;
      if (product && product.kgPerPallet) {
        item.quantityPallets = Math.ceil(kgVal / product.kgPerPallet);
      }
    }

    // Explicit Calculation by Kilogram: Total HT = Kg * Unit Price HT/Kg (No VAT)
    item.totalHT = Number(item.quantityKg) * Number(item.unitPriceHT);
    item.totalTTC = item.totalHT;

    newItems[index] = item;
    setItems(newItems);
  };

  // Synchronize item prices with product catalog
  const handleSyncProductPrices = () => {
    const updatedItems = items.map(item => {
      const prd = products?.find(p => p.id === item.productId || p.name === item.productName);
      if (prd) {
        const unitPriceHT = prd.sellingPriceHT || 0;
        const totalHT = Number(item.quantityKg) * unitPriceHT;
        return {
          ...item,
          productId: prd.id,
          productCode: prd.code,
          productName: prd.name,
          unitPriceHT,
          totalHT,
          totalTTC: totalHT
        };
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Totals calculations based on Kg & Cartons
  const totalKg = items.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);
  const totalCartons = items.reduce((sum, item) => sum + Number(item.quantityCartons || (item.quantityKg ? Math.round(item.quantityKg / 10) : 0)), 0);
  const totalPallets = items.reduce((sum, item) => sum + Number(item.quantityPallets || 0), 0);
  const totalHT = items.reduce((sum, item) => sum + Number(item.totalHT || 0), 0);
  const totalTTC = items.reduce((sum, item) => sum + Number(item.totalTTC || 0), 0);

  const selectedClient = clients?.find(c => c.id === clientId);
  const selectedFrigo = frigos?.find(f => f.id === frigoId);

  const handleSave = () => {
    // Validate stock availability before creating/saving BL
    for (const it of items) {
      if (!it.productId) continue;
      const stk = stocks?.find(s => s.frigoId === frigoId && s.productId === it.productId);
      const availKg = stk ? stk.quantityKg : 0;
      if (it.quantityKg > availKg) {
        notifyError(
          `Le stock dans le frigo "${selectedFrigo?.name || 'sélectionné'}" est insuffisant pour "${it.productName}".\n• Stock disponible: ${availKg.toLocaleString()} Kg\n• Demandé: ${it.quantityKg.toLocaleString()} Kg`,
          'BL Bloqué — Stock Insuffisant'
        );
        return;
      }
    }


    const payload = {
      clientId,
      clientName: selectedClient ? (selectedClient.name || selectedClient.companyName) : 'Client',
      clientAddress: selectedClient?.address || '',
      clientPhone: selectedClient?.phone || '',
      clientEmail: selectedClient?.email || '',
      frigoId,
      frigoName: selectedFrigo ? selectedFrigo.name : 'Frigo',
      date,
      items,
      totalKg,
      totalCartons,
      totalPallets,
      totalHT,
      totalTTC
    };


    if (editId) {
      if (updateBL) {
        updateBL(editId, { ...payload, companyId });
      }
    } else {
      if (addBL) {
        const chosenComp = companies.find(c => c.id === companyId) || activeCompany || companies[0];
        const prefix = chosenComp?.blPrefix || 'BL';
        const blNumber = `${prefix}-2026-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const newBL = {
          ...payload,
          id: `bl-${Date.now()}`,
          companyId: companyId || chosenComp?.id || 'STE_1',
          blNumber,
          orderId: '',
          orderNumber: '',
          status: 'EN_ATTENTE_FRIGO' as const,

          frigoEmployeeApproved: false,
          whatsappSent: false,
          emailSent: false,
          logs: [{
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
            action: 'Création manuelle du Bon de Livraison',
            author: 'Système'
          }]
        };
        addBL(newBL);
        notifySuccess(`Bon de Livraison ${blNumber} créé avec succès !`, 'BL Enregistré');

        const waLink = generateWhatsAppBLLink(newBL, selectedFrigo?.whatsappGroup);
        if (window.confirm(`Bon de Livraison ${blNumber} créé avec succès !\n\nVoulez-vous transmettre l'ordre de chargement au groupe WhatsApp du frigo "${selectedFrigo?.name}" dès maintenant ?`)) {
          window.open(waLink, '_blank');
        }
      }
    }
    onBack();
  };


  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] text-[#161616]">
      {/* Header */}
      <div className="bg-white border-b border-[#e0e0e0] px-6 py-4 flex flex-wrap items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe]"
          >
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#0f62fe]" />
              <span>{editId ? 'Modifier le Bon de Livraison (BL)' : 'Nouveau Bon de Livraison (BL)'}</span>
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Calcul par Kg • Prix HT & TTC • Synchronisation Produits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncProductPrices}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="Mettre à jour les prix unitaires selon le catalogue produits actuel"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Synchroniser Prix Catalogue</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-[#393939] text-[#161616] bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!clientId || !frigoId || items.length === 0}
            className="px-4 py-2 bg-[#0f62fe] text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* General Parameters */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#e0e0e0]">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 pb-2 border-b border-[#e0e0e0] flex items-center justify-between">
              <span>{t('sales.generalInfo', 'Informations Générales BL')}</span>
              <span className="text-xs font-mono font-normal text-gray-500">Société Émettrice & Quai</span>
            </h2>

            {/* Sister Company Selection Cards */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                🏢 Société Émettrice (Sociétés Sœurs) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companies.map((comp) => {
                  const isSelected = companyId === comp.id;
                  return (
                    <div
                      key={comp.id}
                      onClick={() => setCompanyId(comp.id)}
                      className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center justify-between select-none ${
                        isSelected
                          ? 'bg-blue-50/90 border-[#0f62fe] ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-gray-50/80 border-gray-200 hover:border-gray-300 hover:bg-gray-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-[#0f62fe] text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {comp.code}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900 leading-snug">{comp.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            N° {comp.blPrefix} • {comp.invoicePrefix}
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        isSelected ? 'bg-[#0f62fe] text-white' : 'border-2 border-gray-300'
                      }`}>
                        {isSelected && '✓'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  {t('sales.client', 'Client Destinataire')} *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full border border-[#e0e0e0] rounded p-2 text-sm focus:ring-2 focus:ring-[#0f62fe] focus:outline-none"
                >
                  <option value="">-- Sélectionner un Client --</option>
                  {clients?.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.companyName ? `(${client.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  {t('sales.frigo', 'Frigo d\'Expédition')} *
                </label>
                <select
                  value={frigoId}
                  onChange={(e) => setFrigoId(e.target.value)}
                  className="w-full border border-[#e0e0e0] rounded p-2 text-sm focus:ring-2 focus:ring-[#0f62fe] focus:outline-none"
                >
                  <option value="">-- Sélectionner un Frigo --</option>
                  {frigos?.map((frigo: any) => (
                    <option key={frigo.id} value={frigo.id}>{frigo.name} - {frigo.location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  {t('common.date', 'Date d\'Émission')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-[#e0e0e0] rounded p-2 text-sm focus:ring-2 focus:ring-[#0f62fe] focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Item Lines Table */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#e0e0e0]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#e0e0e0]">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                {t('sales.items', 'Articles & Quantités (Kg)')}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickProductModal(true)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                  title="Créer rapidement un nouveau produit au catalogue"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nouveau Produit</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-[#0f62fe] text-white hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une Ligne</span>
                </button>
              </div>

            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full carbon-table min-w-[580px]">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th className="w-32">Nbr Cartons</th>
                    <th className="w-44">Poids Pesé Réel (Kg)</th>
                    <th className="w-36">Prix Unitaire (DH/Kg)</th>
                    <th className="w-40">Montant Total (DH)</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const stk = stocks?.find(s => s.frigoId === frigoId && s.productId === item.productId);
                    const availKg = stk ? stk.quantityKg : 0;
                    const prd = products?.find(p => p.id === item.productId);
                    const kgCarton = prd?.kgPerCarton || 10;
                    const cartons = Number(item.quantityCartons) || 0;
                    const theoreticalKg = item.theoreticalKg || (cartons * kgCarton);
                    const isWeighed = item.weighedKg !== undefined && item.weighedKg !== '' && Number(item.weighedKg) > 0;
                    const weightDiff = isWeighed ? (Number(item.weighedKg) - theoreticalKg) : 0;
                    const isStockOk = item.quantityKg <= availKg;

                    return (
                      <tr key={item.id || index} className={!isStockOk ? 'bg-red-50/70' : ''}>
                        <td>
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                            className="w-full border border-[#e0e0e0] rounded p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#0f62fe]"
                          >
                            <option value="">-- Sélectionner Produit --</option>
                            {products?.map((p: any) => {
                              const pStk = stocks?.find(s => s.frigoId === frigoId && s.productId === p.id);
                              const pKg = pStk ? pStk.quantityKg : 0;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} — [Stock: {pKg.toLocaleString()} Kg | {p.kgPerCarton || 10} kg/carton] ({p.sellingPriceHT} DH/kg)
                                </option>
                              );
                            })}
                          </select>
                        </td>

                        <td>
                          <input
                            type="number"
                            value={item.quantityCartons || ''}
                            onChange={(e) => handleItemChange(index, 'quantityCartons', e.target.value)}
                            className="w-full border border-[#e0e0e0] rounded p-1.5 text-xs font-mono font-bold text-amber-800 focus:ring-1 focus:ring-[#0f62fe]"
                            min="0"
                            step="1"
                            placeholder="Cartons"
                          />
                          <div className="mt-0.5 text-[10px] text-gray-500 font-mono">
                            Théorique: {theoreticalKg.toLocaleString()} Kg
                          </div>
                        </td>

                        <td>
                          <div className="relative">
                            <input
                              type="number"
                              placeholder={`${theoreticalKg} Kg`}
                              value={item.weighedKg !== undefined ? item.weighedKg : ''}
                              onChange={(e) => handleItemChange(index, 'weighedKg', e.target.value)}
                              className={`w-full border rounded p-1.5 text-xs font-mono font-bold focus:ring-1 ${!isStockOk ? 'border-red-500 text-red-600 bg-red-100/50' : 'border-emerald-500 text-emerald-800 bg-emerald-50/40'}`}
                              min="0"
                              step="0.1"
                            />
                            {isWeighed && weightDiff !== 0 && (
                              <span className={`text-[9px] font-bold px-1 py-0.2 rounded inline-block mt-0.5 ${weightDiff < 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                Écart: {weightDiff > 0 ? `+${weightDiff}` : weightDiff} Kg
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[10px] font-mono font-bold flex items-center justify-between">
                            <span className={isStockOk ? 'text-emerald-700' : 'text-red-600 font-extrabold'}>
                              Stock Dispo: {availKg.toLocaleString()} Kg
                            </span>
                            {!isStockOk && (
                              <span className="text-red-600 font-bold bg-red-100 px-1 rounded">⚠️ INSUFFISANT</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <input
                            type="number"
                            value={item.unitPriceHT}
                            onChange={(e) => handleItemChange(index, 'unitPriceHT', e.target.value)}
                            className="w-full border border-[#e0e0e0] rounded p-1.5 text-xs font-mono font-bold text-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
                            min="0"
                            step="0.01"
                          />
                        </td>

                        <td className="font-mono font-bold text-gray-900">
                          {item.totalHT ? item.totalHT.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'} DH
                        </td>

                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                        Aucun article ajouté. Cliquez sur "Ajouter une Ligne" ci-dessus.
                      </td>
                    </tr>
                  )}
                </tbody>

                {items.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold border-t-2 border-[#e0e0e0]">
                    <tr>
                      <td className="py-3 px-4 font-bold text-gray-700 uppercase text-xs">Total Général:</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-800 text-sm">{totalCartons.toLocaleString()} Ctn</td>
                      <td className="py-3 px-4 font-mono font-bold text-black text-sm">{totalKg.toLocaleString()} Kg ({totalPallets.toFixed(1)} Pal)</td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0f62fe] text-base">{totalHT.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {showQuickProductModal && (
        <QuickProductModal
          onClose={() => setShowQuickProductModal(false)}
          onProductCreated={(newProdId) => {
            const prd = products.find(p => p.id === newProdId);
            if (prd) {
              setItems(prev => [
                ...prev,
                {
                  id: `item-${Date.now()}`,
                  productId: prd.id,
                  productName: prd.name,
                  productCode: prd.code,
                  quantityKg: 100,
                  quantityPallets: Math.ceil(100 / ((prd.kgPerCarton || 10) * (prd.cartonsPerPallet || 100))),
                  unitPriceHT: prd.sellingPriceHT,
                  totalHT: 100 * prd.sellingPriceHT,
                  totalTTC: 100 * prd.sellingPriceHT * 1.2
                }
              ]);
            }
          }}
        />
      )}

    </div>
  );
};

