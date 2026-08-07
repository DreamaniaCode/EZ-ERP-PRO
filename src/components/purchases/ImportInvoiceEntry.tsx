import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PurchaseImportInvoice } from '../../types';
import { QuickProductModal } from '../stock/QuickProductModal';
import { Ship, Plus, Search, Building2, Package, Calculator, CheckCircle } from 'lucide-react';


export const ImportInvoiceEntry: React.FC = () => {
  const { suppliers, products, frigos, purchaseInvoices, createPurchaseInvoice } = useERP();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [targetFrigoId, setTargetFrigoId] = useState(frigos[0]?.id || '');
  const [dateArrival, setDateArrival] = useState(new Date().toISOString().slice(0, 10));
  const [isImport, setIsImport] = useState(true);
  
  const [customsCostsHT, setCustomsCostsHT] = useState(15000); // Frais de douane / transit
  const [freightCostsHT, setFreightCostsHT] = useState(8500); // Frais de transport

  // Items
  const [purchaseItems, setPurchaseItems] = useState<{
    productId: string;
    quantityKg: number;
    quantityPallets: number;
    purchaseUnitPriceHT: number;
  }[]>([
    {
      productId: products[1]?.id || products[0]?.id || '',
      quantityKg: 9000,
      quantityPallets: 10,
      purchaseUnitPriceHT: 28,
    },
  ]);

  const handleAddItem = () => {
    setPurchaseItems(prev => [
      ...prev,
      {
        productId: products[0].id,
        quantityKg: 8000,
        quantityPallets: 10,
        purchaseUnitPriceHT: 35,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setPurchaseItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: val };
      const prd = products.find(p => p.id === updated.productId);
      const kgPerPallet = prd ? prd.kgPerPallet : 800;
      if (field === 'quantityKg') {
        updated.quantityPallets = Math.ceil(Number(val) / kgPerPallet);
      }
      return updated;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier || !invoiceNumber) return;

    const totalProductsHT = purchaseItems.reduce((acc, i) => acc + (i.quantityKg * i.purchaseUnitPriceHT), 0);
    const totalAdditionalCosts = Number(customsCostsHT) + Number(freightCostsHT);
    const totalLandedCostHT = totalProductsHT + totalAdditionalCosts;
    const totalKgSum = purchaseItems.reduce((acc, i) => acc + i.quantityKg, 0);

    // Landed cost overhead ratio per kg
    const costOverheadPerKg = totalKgSum > 0 ? totalAdditionalCosts / totalKgSum : 0;

    const items = purchaseItems.map(it => {
      const prd = products.find(p => p.id === it.productId)!;
      const totalHT = it.quantityKg * it.purchaseUnitPriceHT;
      const landedCostPerKgHT = it.purchaseUnitPriceHT + costOverheadPerKg;

      return {
        productId: prd.id,
        productName: prd.name,
        productCode: prd.code,
        quantityKg: Number(it.quantityKg),
        quantityPallets: Number(it.quantityPallets),
        purchaseUnitPriceHT: Number(it.purchaseUnitPriceHT),
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
      customsCostsHT: Number(customsCostsHT),
      freightCostsHT: Number(freightCostsHT),
      totalProductsHT,
      totalLandedCostHT,
      items,
      paymentStatus: 'NON_PAYÉ',
    });

    setShowAddModal(false);
    alert(`Facture Achat / Conteneur ${invoiceNumber} enregistrée avec succès ! Le stock a été directement injecté dans le frigo sélectionné.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <Ship className="w-5 h-5 text-[#0f62fe]" />
            Saisie des Factures d'Importation & Entrées en Frigo
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Arrivée de Conteneurs (Port/Douane), Affectation Directe du Stock aux Frigos & Calcul du Prix de Revient (Landed Cost)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
        >
          <Plus className="w-4 h-4" />
          Saisir Arrivée Facture / Conteneur
        </button>
      </div>

      {/* History Table */}
      <div className="carbon-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-sm uppercase font-mono">
            Historique des Réceptions & Entrées en Stock
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>N° Facture / Conteneur</th>
                <th>Fournisseur</th>
                <th>Frigo de Destination</th>
                <th>Date d'Arrivée</th>
                <th>Frais Douane & Transit</th>
                <th>Total Landed Cost HT</th>
                <th>Statut Paiement</th>
              </tr>
            </thead>
            <tbody>
              {purchaseInvoices.map(pur => {
                const frigoObj = frigos.find(f => f.id === pur.targetFrigoId);
                return (
                  <tr key={pur.id}>
                    <td className="font-mono font-bold text-[#0f62fe]">
                      {pur.invoiceNumber}
                      {pur.containerNumber && <div className="text-[10px] text-gray-500">Conteneur: {pur.containerNumber}</div>}
                    </td>
                    <td>
                      <div className="font-bold text-gray-900">{pur.supplierName}</div>
                      <div className="text-[10px] text-gray-500">{pur.isImport ? 'Importation' : 'Fournisseur Local'}</div>
                    </td>
                    <td className="font-mono text-xs font-bold text-emerald-700">
                      {frigoObj?.name || 'Frigo'}
                    </td>
                    <td className="font-mono text-xs">{pur.dateArrival}</td>
                    <td className="font-mono text-gray-600">
                      {(pur.customsCostsHT + pur.freightCostsHT).toLocaleString()} DH
                    </td>
                    <td className="font-mono font-bold text-gray-900">
                      {pur.totalLandedCostHT.toLocaleString()} DH
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 font-mono font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                        {pur.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {purchaseInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-xs text-gray-500 italic">
                    Aucune facture d'achat ou conteneur enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Section (Inline Page Flow) */}
      {showAddModal && (
        <div className="carbon-card p-6 border-2 border-[#0f62fe] space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <h3 className="font-bold text-base font-mono uppercase flex items-center gap-2 text-gray-900">
              <Ship className="w-5 h-5 text-[#0f62fe]" />
              Saisie de Facture Achat / Conteneur d'Importation
            </h3>
            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-900 font-bold text-xs bg-gray-100 px-3 py-1 rounded">Fermer</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fournisseur *</label>
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full carbon-input font-bold"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">N° Facture Fournisseur *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: FAC-SA-2026-991"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full carbon-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">N° Conteneur (Si Importation)</label>
                <input
                  type="text"
                  placeholder="ex: MSCU-4892019"
                  value={containerNumber}
                  onChange={e => setContainerNumber(e.target.value)}
                  className="w-full carbon-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 font-bold text-emerald-800">
                  Frigo de Destination du Stock *
                </label>
                <select
                  value={targetFrigoId}
                  onChange={e => setTargetFrigoId(e.target.value)}
                  className="w-full carbon-input font-bold text-emerald-700"
                >
                  {frigos.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frais de Douane & Transit (DH HT)</label>
                <input
                  type="number"
                  value={customsCostsHT}
                  onChange={e => setCustomsCostsHT(Number(e.target.value))}
                  className="w-full carbon-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frais de Transport Maritime/Routier (DH HT)</label>
                <input
                  type="number"
                  value={freightCostsHT}
                  onChange={e => setFreightCostsHT(Number(e.target.value))}
                  className="w-full carbon-input font-mono"
                />
              </div>

            </div>

            {/* Items */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold text-gray-900 uppercase">Produits Reçus dans le Conteneur (Saisie en Kg)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickProductModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1 shadow-sm transition-colors"
                    title="Créer rapidement un nouveau produit au catalogue"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Nouveau Produit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Ligne Produit</span>
                  </button>
                </div>
              </div>


              {purchaseItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-300 rounded grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Produit</label>
                    <select
                      value={item.productId}
                      onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      className="w-full carbon-input text-xs font-mono font-bold"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Poids Reçu (Quantité en Kg) *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantityKg}
                      onChange={e => handleItemChange(idx, 'quantityKg', Number(e.target.value))}
                      className="w-full carbon-input font-mono text-xs font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Prix Achat HT / Kg (DH) *</label>
                    <input
                      type="number"
                      value={item.purchaseUnitPriceHT}
                      onChange={e => handleItemChange(idx, 'purchaseUnitPriceHT', Number(e.target.value))}
                      className="w-full carbon-input font-mono text-xs font-bold text-blue-700"
                    />
                  </div>

                  <div className="text-right flex items-center justify-between sm:justify-end gap-3">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">Total HT</div>
                      <div className="font-mono text-xs font-bold text-gray-900">{(item.quantityKg * item.purchaseUnitPriceHT).toLocaleString()} DH</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-600 hover:text-red-800 p-1 text-xs font-bold"
                      title="Supprimer la ligne"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-xs font-semibold rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
              >
                <CheckCircle className="w-4 h-4" /> Enregistrer & Alimenter le Frigo
              </button>
            </div>

          </form>
        </div>
      )}

      {showQuickProductModal && (
        <QuickProductModal
          onClose={() => setShowQuickProductModal(false)}
          onProductCreated={(newProdId) => {
            const prd = products.find(p => p.id === newProdId);
            if (prd) {
              setPurchaseItems(prev => [
                ...prev,
                {
                  productId: prd.id,
                  quantityKg: 8000,
                  quantityPallets: Math.ceil(8000 / ((prd.kgPerCarton || 10) * (prd.cartonsPerPallet || 100))),
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

