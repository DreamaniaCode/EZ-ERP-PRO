import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PurchaseImportInvoice } from '../../types';
import { QuickProductModal } from '../stock/QuickProductModal';
import { Ship, Plus, Search, Package, CheckCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export const ImportInvoiceEntry: React.FC = () => {
  const { suppliers, products, frigos, purchaseInvoices, createPurchaseInvoice } = useERP();

  const [showAddForm, setShowAddForm] = useState(true);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [targetFrigoId, setTargetFrigoId] = useState(frigos[0]?.id || '');
  const [dateArrival, setDateArrival] = useState(new Date().toISOString().slice(0, 10));
  const [isImport, setIsImport] = useState(true);
  
  const [customsCostsHT, setCustomsCostsHT] = useState<number | ''>(15000);
  const [freightCostsHT, setFreightCostsHT] = useState<number | ''>(8500);

  // Items State
  const [purchaseItems, setPurchaseItems] = useState<{
    productId: string;
    quantityCartons: number | '';
    theoreticalKg: number;
    weighedKg: number | '';
    quantityKg: number;
    quantityPallets: number;
    purchaseUnitPriceHT: number | '';
  }[]>([
    {
      productId: products[1]?.id || products[0]?.id || '',
      quantityCartons: 900,
      theoreticalKg: 9000,
      weighedKg: 9000,
      quantityKg: 9000,
      quantityPallets: 10,
      purchaseUnitPriceHT: 28,
    },
  ]);

  const handleAddItem = () => {
    const defaultPrd = products[0];
    const kgCarton = defaultPrd?.kgPerCarton || 10;
    const initialCartons = 800;
    const initialTheoKg = initialCartons * kgCarton;
    setPurchaseItems(prev => [
      ...prev,
      {
        productId: defaultPrd ? defaultPrd.id : '',
        quantityCartons: initialCartons,
        theoreticalKg: initialTheoKg,
        weighedKg: initialTheoKg,
        quantityKg: initialTheoKg,
        quantityPallets: defaultPrd && defaultPrd.kgPerPallet ? Math.ceil(initialTheoKg / defaultPrd.kgPerPallet) : 10,
        purchaseUnitPriceHT: defaultPrd ? (defaultPrd.unitCostHT || 35) : 35,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (purchaseItems.length === 1) {
      alert('Une facture doit contenir au moins une ligne produit.');
      return;
    }
    setPurchaseItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setPurchaseItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: val };
      const prd = products.find(p => p.id === updated.productId);
      const kgCarton = prd ? (prd.kgPerCarton || 10) : 10;
      const kgPerPallet = prd ? (prd.kgPerPallet || 800) : 800;

      if (field === 'productId') {
        const cartonsNum = typeof updated.quantityCartons === 'number' ? updated.quantityCartons : (Number(updated.quantityCartons) || 0);
        updated.theoreticalKg = cartonsNum * kgCarton;
        const weighed = updated.weighedKg !== '' ? Number(updated.weighedKg) : updated.theoreticalKg;
        updated.quantityKg = weighed > 0 ? weighed : updated.theoreticalKg;
        updated.quantityPallets = Math.ceil((updated.quantityKg || 1) / kgPerPallet);
      } else if (field === 'quantityCartons') {
        const cartonsVal = val === '' ? '' : Math.max(0, Number(val));
        updated.quantityCartons = cartonsVal;
        const numCartons = typeof cartonsVal === 'number' ? cartonsVal : 0;
        updated.theoreticalKg = numCartons * kgCarton;
        if (updated.weighedKg === '' || updated.weighedKg === item.theoreticalKg) {
          updated.weighedKg = updated.theoreticalKg;
          updated.quantityKg = updated.theoreticalKg;
        } else {
          updated.quantityKg = Number(updated.weighedKg) || updated.theoreticalKg;
        }
        updated.quantityPallets = Math.ceil((updated.quantityKg || 1) / kgPerPallet);
      } else if (field === 'weighedKg') {
        updated.weighedKg = val === '' ? '' : Math.max(0, Number(val));
        const weighedNum = typeof updated.weighedKg === 'number' ? updated.weighedKg : 0;
        const cartonsNum = typeof item.quantityCartons === 'number' ? item.quantityCartons : (Number(item.quantityCartons) || 0);
        const theoKg = cartonsNum * kgCarton;
        updated.theoreticalKg = theoKg;
        updated.quantityKg = weighedNum > 0 ? weighedNum : theoKg;
        updated.quantityPallets = Math.ceil((updated.quantityKg || 1) / kgPerPallet);
      } else if (field === 'purchaseUnitPriceHT') {
        updated.purchaseUnitPriceHT = val === '' ? '' : Math.max(0, Number(val));
      }
      return updated;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier || !invoiceNumber) {
      alert('Veuillez remplir le fournisseur et le N° de facture.');
      return;
    }

    const customs = Number(customsCostsHT) || 0;
    const freight = Number(freightCostsHT) || 0;

    const totalProductsHT = purchaseItems.reduce((acc, i) => {
      const price = Number(i.purchaseUnitPriceHT) || 0;
      const kg = Number(i.quantityKg) || 0;
      return acc + (kg * price);
    }, 0);

    const totalAdditionalCosts = customs + freight;
    const totalLandedCostHT = totalProductsHT + totalAdditionalCosts;
    const totalKgSum = purchaseItems.reduce((acc, i) => acc + (Number(i.quantityKg) || 0), 0);

    const costOverheadPerKg = totalKgSum > 0 ? totalAdditionalCosts / totalKgSum : 0;

    const items = purchaseItems.map(it => {
      const prd = products.find(p => p.id === it.productId)!;
      const kg = Number(it.quantityKg) || 0;
      const price = Number(it.purchaseUnitPriceHT) || 0;
      const cartons = Number(it.quantityCartons) || 0;
      const totalHT = kg * price;
      const landedCostPerKgHT = price + costOverheadPerKg;

      return {
        productId: prd.id,
        productName: prd.name,
        productCode: prd.code,
        quantityCartons: cartons,
        theoreticalKg: Number(it.theoreticalKg || kg),
        weighedKg: it.weighedKg !== '' ? Number(it.weighedKg) : undefined,
        isWeighed: it.weighedKg !== '' && Number(it.weighedKg) > 0,
        quantityKg: kg,
        quantityPallets: Number(it.quantityPallets || 1),
        purchaseUnitPriceHT: price,
        landedCostPerKgHT: Math.round(landedCostPerKgHT * 100) / 100,
        totalHT,
      };
    });

    createPurchaseInvoice({
      invoiceNumber,
      supplierId: supplier.id,
      supplierName: supplier.companyName || supplier.name,
      dateArrival,
      targetFrigoId,
      isImport,
      containerNumber,
      customsCostsHT: customs,
      freightCostsHT: freight,
      totalProductsHT,
      totalLandedCostHT,
      items,
      paymentStatus: 'NON_PAYÉ',
    });

    alert(`Facture Achat N° ${invoiceNumber} enregistrée avec succès ! Le stock a été directement injecté dans le frigo.`);
    
    // Reset form
    setInvoiceNumber('');
    setContainerNumber('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <Ship className="w-5 h-5 text-[#0f62fe]" />
            Saisie des Factures d'Achat & Entrées en Frigo
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Réception en Cartons/Colis & Pesée Frigo • Calcul du Prix de Revient (Landed Cost)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(prev => !prev)}
          className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Masquer le Formulaire' : 'Nouveau Bon / Arrivée Achat'}
        </button>
      </div>

      {/* Main Form Section - Styled exactly as requested */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-900 space-y-6">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header Fields Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  FOURNISSEUR *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full carbon-input font-bold text-sm bg-gray-100/80 border-gray-900 h-10"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.country || 'Local'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  N° FACTURE FOURNISSEUR *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: FAC-SA-2026-991"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full carbon-input font-mono text-sm bg-gray-100/80 border-gray-900 h-10"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  N° CONTENEUR (SI IMPORTATION)
                </label>
                <input
                  type="text"
                  placeholder="ex: MSCU-4892019"
                  value={containerNumber}
                  onChange={e => setContainerNumber(e.target.value)}
                  className="w-full carbon-input font-mono text-sm bg-gray-100/80 border-gray-900 h-10"
                />
              </div>
            </div>

            {/* Header Fields Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  FRIGO DE DESTINATION DU STOCK *
                </label>
                <select
                  value={targetFrigoId}
                  onChange={e => setTargetFrigoId(e.target.value)}
                  className="w-full carbon-input font-black text-sm bg-gray-100/80 border-gray-900 h-10 text-gray-900"
                >
                  {frigos.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.location || ''})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  FRAIS DE DOUANE & TRANSIT (DH HT)
                </label>
                <input
                  type="number"
                  value={customsCostsHT}
                  onChange={e => setCustomsCostsHT(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full carbon-input font-mono text-sm bg-gray-100/80 border-gray-900 h-10"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  FRAIS DE TRANSPORT MARITIME/ROUTIER (DH HT)
                </label>
                <input
                  type="number"
                  value={freightCostsHT}
                  onChange={e => setFreightCostsHT(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full carbon-input font-mono text-sm bg-gray-100/80 border-gray-900 h-10"
                />
              </div>
            </div>

            {/* Products Section Header */}
            <div className="pt-4 border-t border-gray-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="font-black text-sm text-gray-900 uppercase tracking-wide">
                  PRODUITS REÇUS (SAISIE EN CARTONS & POIDS PESÉ)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickProductModal(true)}
                    className="px-3.5 py-2 bg-[#00a66c] hover:bg-[#008f5d] text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    + Nouveau Produit
                  </button>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3.5 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    + Ligne Produit
                  </button>
                </div>
              </div>

              {/* Items Card List */}
              <div className="space-y-3">
                {purchaseItems.map((item, idx) => {
                  const prd = products.find(p => p.id === item.productId);
                  const kgCartonRatio = prd ? (prd.kgPerCarton || 10) : 10;
                  const price = Number(item.purchaseUnitPriceHT) || 0;
                  const kg = Number(item.quantityKg) || 0;
                  const totalLineHT = kg * price;
                  const cartonsDisplay = item.quantityCartons !== '' ? item.quantityCartons : '';

                  return (
                    <div key={idx} className="p-4 bg-gray-50/90 border border-gray-300 rounded-md grid grid-cols-1 sm:grid-cols-12 gap-4 items-center shadow-xs">
                      
                      {/* Product Selector */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                          PRODUIT
                        </label>
                        <select
                          value={item.productId}
                          onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full carbon-input text-xs font-mono font-bold bg-white border-gray-900 h-9"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                          ))}
                        </select>
                        <div className="text-[10px] text-gray-500 font-medium mt-1">
                          Ratio: {kgCartonRatio} kg / carton
                        </div>
                      </div>

                      {/* Cartons / Colis Input */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                          CARTONS / COLIS
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="900"
                          value={cartonsDisplay}
                          onChange={e => handleItemChange(idx, 'quantityCartons', e.target.value)}
                          className="w-full carbon-input font-mono text-xs font-extrabold text-blue-900 bg-gray-100/90 border-gray-900 h-9"
                        />
                        <div className="text-[10px] text-gray-500 font-medium mt-1">
                          Estimé: {item.theoreticalKg.toLocaleString()} Kg
                        </div>
                      </div>

                      {/* Poids Pesé Input */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-900 uppercase mb-1">
                          POIDS PESÉ (KG)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder={`${item.theoreticalKg}`}
                          value={item.weighedKg}
                          onChange={e => handleItemChange(idx, 'weighedKg', e.target.value)}
                          className="w-full carbon-input font-mono text-xs font-black text-emerald-800 bg-gray-100/90 border-gray-900 h-9"
                        />
                      </div>

                      {/* Prix Achat HT / Kg Input */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                          PRIX ACHAT HT / KG (DH)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchaseUnitPriceHT}
                          onChange={e => handleItemChange(idx, 'purchaseUnitPriceHT', e.target.value)}
                          className="w-full carbon-input font-mono text-xs font-extrabold text-gray-900 bg-gray-100/90 border-gray-900 h-9"
                        />
                      </div>

                      {/* Total Line HT & Delete */}
                      <div className="sm:col-span-2 text-right flex items-center justify-between sm:justify-end gap-3">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">TOTAL HT (PESÉ)</div>
                          <div className="font-mono text-xs font-black text-gray-900">
                            {totalLineHT.toLocaleString()} DH
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-600 hover:text-red-800 p-1 text-sm font-bold shrink-0 ml-2"
                          title="Supprimer cette ligne"
                        >
                          ✕
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-gray-200 flex justify-end gap-3 items-center">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2 border border-gray-400 hover:bg-gray-100 text-xs font-bold text-gray-700 rounded-md"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0f62fe] hover:bg-blue-700 text-white text-xs font-black rounded-md flex items-center gap-2 shadow-md transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                Enregistrer & Alimenter le Frigo
              </button>
            </div>

          </form>

        </div>
      )}

      {/* History Table with Colis/Cartons Column */}
      <div className="carbon-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-900 text-sm uppercase font-mono flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0f62fe]" />
            Historique des Réceptions & Entrées en Stock ({purchaseInvoices.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>N° Facture / Conteneur</th>
                <th>Fournisseur</th>
                <th>Frigo Destination</th>
                <th>Total Cartons / Colis</th>
                <th>Poids Total (Kg)</th>
                <th>Frais Douane & Transit</th>
                <th>Total Landed Cost HT</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {purchaseInvoices.map(pur => {
                const frigoObj = frigos.find(f => f.id === pur.targetFrigoId);
                const totalCartons = pur.items.reduce((acc, i) => acc + (i.quantityCartons || 0), 0);
                const totalKg = pur.items.reduce((acc, i) => acc + (i.quantityKg || 0), 0);
                const isExpanded = expandedInvoiceId === pur.id;

                return (
                  <React.Fragment key={pur.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="font-mono font-bold text-[#0f62fe]">
                        {pur.invoiceNumber}
                        {pur.containerNumber && <div className="text-[10px] text-gray-500 font-normal">Conteneur: {pur.containerNumber}</div>}
                      </td>
                      <td>
                        <div className="font-bold text-gray-900">{pur.supplierName}</div>
                        <div className="text-[10px] text-gray-500">{pur.isImport ? 'Importation' : 'Fournisseur Local'}</div>
                      </td>
                      <td className="font-mono text-xs font-bold text-emerald-700">
                        {frigoObj?.name || 'Frigo'}
                      </td>
                      <td className="font-mono font-bold text-blue-900">
                        {totalCartons.toLocaleString()} Colis
                      </td>
                      <td className="font-mono font-bold text-emerald-800">
                        {totalKg.toLocaleString()} Kg
                      </td>
                      <td className="font-mono text-gray-600">
                        {(pur.customsCostsHT + pur.freightCostsHT).toLocaleString()} DH
                      </td>
                      <td className="font-mono font-bold text-gray-900">
                        {pur.totalLandedCostHT.toLocaleString()} DH
                      </td>
                      <td>
                        <button
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : pur.id)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded flex items-center gap-1 border border-gray-300"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? 'Masquer' : 'Voir Articles'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Article Line Details */}
                    {isExpanded && (
                      <tr className="bg-blue-50/50 border-b-2 border-blue-200">
                        <td colSpan={8} className="p-3">
                          <div className="bg-white p-3 rounded border border-blue-200 space-y-2">
                            <div className="text-xs font-bold text-blue-900 uppercase font-mono border-b pb-1">
                              Détails des Produits Réçus - Facture {pur.invoiceNumber}
                            </div>
                            <table className="w-full text-xs font-mono">
                              <thead>
                                <tr className="text-gray-500 border-b text-left">
                                  <th className="py-1">Code SKU</th>
                                  <th className="py-1">Désignation</th>
                                  <th className="py-1 text-center">Cartons / Colis</th>
                                  <th className="py-1 text-center">Poids Pesé (Kg)</th>
                                  <th className="py-1 text-center">Prix Achat HT</th>
                                  <th className="py-1 text-center">Prix Revient (Landed)</th>
                                  <th className="py-1 text-right">Total HT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pur.items.map((it, iIdx) => (
                                  <tr key={iIdx} className="border-b border-gray-100">
                                    <td className="py-1 font-bold text-blue-700">{it.productCode}</td>
                                    <td className="py-1 font-bold text-gray-900">{it.productName}</td>
                                    <td className="py-1 text-center font-bold text-blue-900">{it.quantityCartons?.toLocaleString() || '0'} Colis</td>
                                    <td className="py-1 text-center font-bold text-emerald-700">{it.quantityKg.toLocaleString()} Kg</td>
                                    <td className="py-1 text-center">{it.purchaseUnitPriceHT} DH</td>
                                    <td className="py-1 text-center font-bold text-indigo-700">{it.landedCostPerKgHT} DH</td>
                                    <td className="py-1 text-right font-bold">{it.totalHT.toLocaleString()} DH</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {purchaseInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-xs text-gray-500 italic">
                    Aucune facture d'achat ou conteneur enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showQuickProductModal && (
        <QuickProductModal
          onClose={() => setShowQuickProductModal(false)}
          onProductCreated={(newProdId) => {
            const prd = products.find(p => p.id === newProdId);
            if (prd) {
              const kgCarton = prd.kgPerCarton || 10;
              const cartons = 800;
              const theoKg = cartons * kgCarton;
              setPurchaseItems(prev => [
                ...prev,
                {
                  productId: prd.id,
                  quantityCartons: cartons,
                  theoreticalKg: theoKg,
                  weighedKg: theoKg,
                  quantityKg: theoKg,
                  quantityPallets: Math.ceil(theoKg / (prd.kgPerPallet || 800)),
                  purchaseUnitPriceHT: prd.unitCostHT || 30
                }
              ]);
            }
          }}
        />
      )}

    </div>
  );
};
