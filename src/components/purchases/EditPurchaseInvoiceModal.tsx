import React, { useState } from 'react';
import { PurchaseImportInvoice } from '../../types';
import { useERP } from '../../context/ERPContext';
import { Ship, X, Plus, Trash2, CheckCircle, Save, Package, Building2, Calendar, FileText, RefreshCw } from 'lucide-react';
import { generateAutoSupplierInvoiceNumber } from '../../utils/supplierInvoiceHelper';

interface EditPurchaseInvoiceModalProps {
  invoice: PurchaseImportInvoice;
  onClose: () => void;
  onSaved?: () => void;
}

export const EditPurchaseInvoiceModal: React.FC<EditPurchaseInvoiceModalProps> = ({ 
  invoice, 
  onClose,
  onSaved 
}) => {
  const { suppliers, products, frigos, updatePurchaseInvoice, purchaseInvoices } = useERP();

  const [selectedSupplierId, setSelectedSupplierId] = useState(invoice.supplierId || suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber || '');

  const handleAutoGenerateInvoiceNumber = () => {
    const s = suppliers.find(sup => sup.id === selectedSupplierId);
    const autoNum = generateAutoSupplierInvoiceNumber(s?.companyName || s?.name || s?.code, dateArrival, purchaseInvoices.filter(p => p.id !== invoice.id));
    setInvoiceNumber(autoNum);
  };
  const [containerNumber, setContainerNumber] = useState(invoice.containerNumber || '');
  const [targetFrigoId, setTargetFrigoId] = useState(invoice.targetFrigoId || frigos[0]?.id || '');
  const [dateArrival, setDateArrival] = useState(invoice.dateArrival ? invoice.dateArrival.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [isImport, setIsImport] = useState(invoice.isImport !== undefined ? invoice.isImport : true);
  
  const [customsCostsHT, setCustomsCostsHT] = useState<number | ''>(invoice.customsCostsHT || 0);
  const [freightCostsHT, setFreightCostsHT] = useState<number | ''>(invoice.freightCostsHT || 0);

  const [purchaseItems, setPurchaseItems] = useState<{
    productId: string;
    quantityCartons: number | '';
    theoreticalKg: number;
    weighedKg: number | '';
    quantityKg: number;
    quantityPallets: number;
    purchaseUnitPriceHT: number | '';
  }[]>(() => {
    if (invoice.items && invoice.items.length > 0) {
      return invoice.items.map(it => ({
        productId: it.productId,
        quantityCartons: it.quantityCartons !== undefined ? it.quantityCartons : '',
        theoreticalKg: it.theoreticalKg || it.quantityKg,
        weighedKg: it.weighedKg !== undefined ? it.weighedKg : it.quantityKg,
        quantityKg: it.quantityKg,
        quantityPallets: it.quantityPallets || 1,
        purchaseUnitPriceHT: it.purchaseUnitPriceHT !== undefined ? it.purchaseUnitPriceHT : ''
      }));
    }
    const defaultPrd = products[0];
    return [{
      productId: defaultPrd ? defaultPrd.id : '',
      quantityCartons: '',
      theoreticalKg: 0,
      weighedKg: '',
      quantityKg: 0,
      quantityPallets: 0,
      purchaseUnitPriceHT: defaultPrd ? (defaultPrd.unitCostHT || 0) : 0,
    }];
  });

  const handleAddItem = () => {
    const defaultPrd = products[0];
    setPurchaseItems(prev => [
      ...prev,
      {
        productId: defaultPrd ? defaultPrd.id : '',
        quantityCartons: '',
        theoreticalKg: 0,
        weighedKg: '',
        quantityKg: 0,
        quantityPallets: 0,
        purchaseUnitPriceHT: defaultPrd ? (defaultPrd.unitCostHT || 0) : 0,
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
      alert('Veuillez renseigner le fournisseur et le N° de facture.');
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
        landedCostPerKgHT: Math.round(landedCostPerKgHT),
        totalHT,
      };
    });

    updatePurchaseInvoice(invoice.id, {
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
    });

    alert(`✓ Facture d'Achat N° ${invoiceNumber} MODIFIÉE avec succès !\nLe stock dans le frigo et les prix de revient ont été actualisés.`);
    if (onSaved) onSaved();
    onClose();
  };

  const totalKgAll = purchaseItems.reduce((acc, i) => acc + (Number(i.quantityKg) || 0), 0);
  const totalCartonsAll = purchaseItems.reduce((acc, i) => acc + (Number(i.quantityCartons) || 0), 0);
  const totalPalletsAll = purchaseItems.reduce((acc, i) => acc + (Number(i.quantityPallets) || 0), 0);
  const totalProductsCost = purchaseItems.reduce((acc, i) => acc + ((Number(i.quantityKg) || 0) * (Number(i.purchaseUnitPriceHT) || 0)), 0);
  const totalFrais = (Number(customsCostsHT) || 0) + (Number(freightCostsHT) || 0);
  const totalLandedCost = totalProductsCost + totalFrais;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono">
                  Modifier la Facture d'Achat / Entrée
                </h2>
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-400/30">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Ajustement des quantités reçues, du frigo récepteur et des coûts de revient
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Header Fields Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                FOURNISSEUR *
              </label>
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full carbon-input font-semibold text-sm bg-gray-50 border-gray-300 h-10"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.companyName || s.name} ({s.country || 'Local'})</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  N° FACTURE FOURNISSEUR *
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateInvoiceNumber}
                  className="text-[10px] font-bold text-[#0f62fe] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Générer automatiquement selon le Fournisseur et la Date"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>N° Auto (Date)</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full carbon-input font-mono text-sm bg-gray-50 border-gray-300 h-10 font-bold text-[#0f62fe] pr-14"
                />
                <button
                  type="button"
                  onClick={handleAutoGenerateInvoiceNumber}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-200 transition"
                  title="Générer automatiquement"
                >
                  AUTO
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                N° CONTENEUR (SI IMPORT)
              </label>
              <input
                type="text"
                value={containerNumber}
                onChange={e => setContainerNumber(e.target.value)}
                placeholder="ex: MSCU-4892019"
                className="w-full carbon-input font-mono text-sm bg-gray-50 border-gray-300 h-10"
              />
            </div>
          </div>

          {/* Header Fields Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                FRIGO DE DESTINATION DU STOCK *
              </label>
              <select
                value={targetFrigoId}
                onChange={e => setTargetFrigoId(e.target.value)}
                className="w-full carbon-input font-bold text-sm bg-blue-50/50 border-blue-300 text-blue-900 h-10"
              >
                {frigos.map(f => (
                  <option key={f.id} value={f.id}>🏢 {f.code} - {f.name} ({f.location || ''})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                DATE D'ARRIVÉE / ENTRÉE *
              </label>
              <input
                type="date"
                required
                value={dateArrival}
                onChange={e => setDateArrival(e.target.value)}
                className="w-full carbon-input font-mono text-sm bg-gray-50 border-gray-300 h-10 font-bold text-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  DOUANE (DH HT)
                </label>
                <input
                  type="number"
                  value={customsCostsHT}
                  onChange={e => setCustomsCostsHT(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full carbon-input font-mono text-xs bg-gray-50 border-gray-300 h-10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  FRET (DH HT)
                </label>
                <input
                  type="number"
                  value={freightCostsHT}
                  onChange={e => setFreightCostsHT(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full carbon-input font-mono text-xs bg-gray-50 border-gray-300 h-10"
                />
              </div>
            </div>
          </div>

          {/* Products Section Header */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-xs text-gray-900 uppercase font-mono flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#0f62fe]" />
                Articles & Quantités Reçues
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                + Ligne Produit
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {purchaseItems.map((item, idx) => {
                const prd = products.find(p => p.id === item.productId);
                const price = Number(item.purchaseUnitPriceHT) || 0;
                const kg = Number(item.quantityKg) || 0;
                const totalLineHT = kg * price;

                return (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    
                    {/* Product Selector */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                        PRODUIT
                      </label>
                      <select
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full carbon-input text-xs font-bold bg-white border-gray-300 h-9"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Cartons */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                        COLIS / CARTONS
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Cartons"
                        value={item.quantityCartons}
                        onChange={e => handleItemChange(idx, 'quantityCartons', e.target.value)}
                        className="w-full carbon-input font-mono text-xs font-bold text-blue-900 bg-white border-gray-300 h-9"
                      />
                    </div>

                    {/* Poids Pesé Input */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">
                        POIDS PESÉ (KG) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Kg"
                        value={item.weighedKg}
                        onChange={e => handleItemChange(idx, 'weighedKg', e.target.value)}
                        className="w-full carbon-input font-mono text-xs font-black text-emerald-800 bg-emerald-50/50 border-emerald-300 h-9"
                      />
                    </div>

                    {/* Prix Achat HT / Kg */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                        PRIX ACHAT HT / KG
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="DH/Kg"
                        value={item.purchaseUnitPriceHT}
                        onChange={e => handleItemChange(idx, 'purchaseUnitPriceHT', e.target.value)}
                        className="w-full carbon-input font-mono text-xs font-bold text-gray-900 bg-white border-gray-300 h-9"
                      />
                    </div>

                    {/* Total Line & Delete */}
                    <div className="sm:col-span-2 flex items-center justify-between gap-2">
                      <div className="text-right flex-1">
                        <div className="text-[10px] text-gray-400">Total HT</div>
                        <div className="text-xs font-mono font-bold text-gray-900">{totalLineHT.toLocaleString()} DH</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Summary Footer */}
          <div className="bg-gray-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-400 text-[10px] block">TOTAL POIDS</span>
                <span className="font-bold text-emerald-400 text-sm">{totalKgAll.toLocaleString()} Kg</span>
              </div>
              <div className="border-l border-gray-700 pl-4">
                <span className="text-gray-400 text-[10px] block">TOTAL COLIS</span>
                <span className="font-bold text-blue-300">{totalCartonsAll.toLocaleString()} Colis</span>
              </div>
              <div className="border-l border-gray-700 pl-4">
                <span className="text-gray-400 text-[10px] block">PALETTES ESTIMÉES</span>
                <span className="font-bold text-amber-300">{totalPalletsAll} Pal.</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-gray-400 text-[10px] block">TOTAL COÛT DE REVIENT (LANDED COST HT)</span>
              <span className="text-base font-extrabold text-white">{totalLandedCost.toLocaleString()} DH</span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-3 items-center pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-md transition"
            >
              <Save className="w-4 h-4" />
              Enregistrer les Modifications
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
