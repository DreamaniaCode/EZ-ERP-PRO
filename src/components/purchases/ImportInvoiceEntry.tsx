import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { PurchaseImportInvoice } from '../../types';
import { QuickProductModal } from '../stock/QuickProductModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { SearchableProductSelect } from '../common/SearchableProductSelect';
import { ExportButtons } from '../common/ExportButtons';
import { generateAndDownloadPurchaseInvoicePdf } from '../../utils/pdfGenerators';
import { exportToExcel } from '../../utils/exportUtils';
import { Ship, Plus, Search, Package, CheckCircle, ChevronDown, ChevronUp, Trash2, CreditCard, DollarSign, Filter, RefreshCw, Pencil, Edit3, X, Save, Sparkles, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { generateAutoSupplierInvoiceNumber } from '../../utils/supplierInvoiceHelper';

export const ImportInvoiceEntry: React.FC = () => {
  const { company, suppliers, products, frigos, purchaseInvoices, createPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice } = useERP();

  const [showAddForm, setShowAddForm] = useState(true);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<PurchaseImportInvoice | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NON_PAYÉ' | 'PARTIEL' | 'PAYÉ'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [dateArrival, setDateArrival] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const s = suppliers[0];
    return generateAutoSupplierInvoiceNumber(s?.companyName || s?.name || s?.code, new Date().toISOString().slice(0, 10), []);
  });
  const [containerNumber, setContainerNumber] = useState('');
  const [targetFrigoId, setTargetFrigoId] = useState(frigos[0]?.id || '');
  const [isImport, setIsImport] = useState(true);

  // Auto-generate invoice number when supplier or arrival date changes (only if in create mode)
  const handleRegenerateInvoiceNumber = (supId?: string, dt?: string) => {
    const targetSupId = supId || selectedSupplierId;
    const targetDate = dt || dateArrival;
    const s = suppliers.find(sup => sup.id === targetSupId);
    const autoNum = generateAutoSupplierInvoiceNumber(s?.companyName || s?.name || s?.code, targetDate, purchaseInvoices);
    setInvoiceNumber(autoNum);
  };
  
  const [customsCostsHT, setCustomsCostsHT] = useState<number | ''>(0);
  const [freightCostsHT, setFreightCostsHT] = useState<number | ''>(0);

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
      productId: products[0]?.id || '',
      quantityCartons: '',
      theoreticalKg: 0,
      weighedKg: '',
      quantityKg: 0,
      quantityPallets: 0,
      purchaseUnitPriceHT: '',
    },
  ]);

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

  const handleStartEdit = (invoice: PurchaseImportInvoice) => {
    setEditingInvoiceId(invoice.id);
    setSelectedSupplierId(invoice.supplierId);
    setInvoiceNumber(invoice.invoiceNumber);
    setContainerNumber(invoice.containerNumber || '');
    setTargetFrigoId(invoice.targetFrigoId);
    setDateArrival(invoice.dateArrival ? invoice.dateArrival.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setIsImport(!!invoice.isImport);
    setCustomsCostsHT(invoice.customsCostsHT || 0);
    setFreightCostsHT(invoice.freightCostsHT || 0);

    if (invoice.items && invoice.items.length > 0) {
      setPurchaseItems(invoice.items.map(it => ({
        productId: it.productId,
        quantityCartons: it.quantityCartons !== undefined ? it.quantityCartons : '',
        theoreticalKg: it.theoreticalKg || it.quantityKg,
        weighedKg: it.weighedKg !== undefined ? it.weighedKg : it.quantityKg,
        quantityKg: it.quantityKg,
        quantityPallets: it.quantityPallets || 1,
        purchaseUnitPriceHT: it.purchaseUnitPriceHT !== undefined ? it.purchaseUnitPriceHT : ''
      })));
    }
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setInvoiceNumber('');
    setContainerNumber('');
    setCustomsCostsHT(0);
    setFreightCostsHT(0);
    const defaultPrd = products[0];
    setPurchaseItems([
      {
        productId: defaultPrd ? defaultPrd.id : '',
        quantityCartons: '',
        theoreticalKg: 0,
        weighedKg: '',
        quantityKg: 0,
        quantityPallets: 0,
        purchaseUnitPriceHT: '',
      }
    ]);
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
        landedCostPerKgHT: Math.round(landedCostPerKgHT),
        totalHT,
      };
    });

    if (editingInvoiceId) {
      updatePurchaseInvoice(editingInvoiceId, {
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

      alert(`Facture Achat N° ${invoiceNumber} MODIFIÉE avec succès ! Les stocks et prix de revient ont été mis à jour.`);
      handleCancelEdit();
      return;
    }

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
    handleCancelEdit();
  };

  const handleExportSingleInvoiceExcel = (pur: PurchaseImportInvoice) => {
    const frigoObj = frigos.find(f => f.id === pur.targetFrigoId);
    const rows = pur.items.map((it, idx) => ({
      'Ligne': idx + 1,
      'N° Facture Fournisseur': pur.invoiceNumber,
      'Fournisseur': pur.supplierName,
      'Date Réception': pur.dateArrival,
      'N° Conteneur': pur.containerNumber || '-',
      'Frigo Destination': frigoObj?.name || pur.targetFrigoId,
      'Code SKU': it.productCode,
      'Désignation Produit': it.productName,
      'Cartons / Colis': it.quantityCartons || 0,
      'Poids Pesé (Kg)': it.quantityKg,
      'Prix Achat HT (DH/Kg)': it.purchaseUnitPriceHT,
      'Coût Revient HT (DH/Kg)': it.landedCostPerKgHT || it.purchaseUnitPriceHT,
      'Total Ligne HT (DH)': it.totalHT,
      'Frais Douane Total (DH)': pur.customsCostsHT,
      'Frais Fret Total (DH)': pur.freightCostsHT,
      'Coût Global Facture HT (DH)': pur.totalLandedCostHT,
      'Montant Réglé (DH)': pur.paidAmount || 0,
      'Solde Restant (DH)': pur.remainingBalance || 0,
      'Statut Paiement': pur.paymentStatus || 'NON_PAYÉ'
    }));

    exportToExcel(rows, `Facture_Achat_${pur.invoiceNumber}_${pur.supplierName}`, {
      title: `FACTURE D'ACHAT & ENTRÉE STOCK - N° ${pur.invoiceNumber}`,
      frigoName: frigoObj?.name,
      includeTotals: true,
      sheetName: `Facture ${pur.invoiceNumber.slice(0, 20)}`
    });
  };

  const handleDownloadInvoicePdf = (pur: PurchaseImportInvoice) => {
    const frigoObj = frigos.find(f => f.id === pur.targetFrigoId);
    generateAndDownloadPurchaseInvoicePdf({ ...pur, frigoName: frigoObj?.name }, company);
  };

  const exportAllInvoicesData = purchaseInvoices
    .filter(pur => {
      const matchesSearch = (pur.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (pur.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (pur.containerNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || pur.paymentStatus === statusFilter;
      const matchesSupplier = supplierFilter === 'ALL' || pur.supplierId === supplierFilter;
      return matchesSearch && matchesStatus && matchesSupplier;
    })
    .map(pur => {
      const frigoObj = frigos.find(f => f.id === pur.targetFrigoId);
      const totalCartons = pur.items.reduce((acc, i) => acc + (i.quantityCartons || 0), 0);
      const totalKg = pur.items.reduce((acc, i) => acc + (i.quantityKg || 0), 0);
      const totalHT = pur.totalLandedCostHT || 0;
      const paid = pur.paidAmount || 0;
      const remaining = pur.remainingBalance !== undefined ? pur.remainingBalance : Math.max(0, totalHT - paid);
      
      return {
        'N° Facture': pur.invoiceNumber,
        'Fournisseur': pur.supplierName,
        'Type': pur.isImport ? 'Importation' : 'Fournisseur Local',
        'N° Conteneur': pur.containerNumber || '-',
        'Date Arrivée': pur.dateArrival,
        'Frigo Destination': frigoObj?.name || 'Frigo',
        'Nbre Articles': pur.items.length,
        'Total Colis': totalCartons,
        'Poids Total (Kg)': totalKg,
        'Total Produits HT (DH)': pur.totalProductsHT,
        'Frais Douane HT (DH)': pur.customsCostsHT,
        'Frais Fret HT (DH)': pur.freightCostsHT,
        'Coût Revient Total HT (DH)': totalHT,
        'Montant Réglé (DH)': paid,
        'Solde Restant (DH)': remaining,
        'Statut Paiement': pur.paymentStatus || (remaining <= 0 ? 'PAYÉ' : paid > 0 ? 'PARTIEL' : 'NON_PAYÉ')
      };
    });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <Ship className="w-5 h-5 text-[#0f62fe]" />
            {editingInvoiceId ? 'Modification Facture Achat / Entrée' : "Saisie des Factures d'Achat & Entrées en Frigo"}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {editingInvoiceId 
              ? `Modification en cours de la facture d'achat N° ${invoiceNumber}` 
              : 'Réception en Cartons/Colis & Pesée Frigo • Calcul du Prix de Revient (Landed Cost)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editingInvoiceId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Annuler Modification
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (editingInvoiceId) handleCancelEdit();
              setShowAddForm(prev => !prev);
            }}
            className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? (editingInvoiceId ? 'Fermer la Modification' : 'Masquer le Formulaire') : 'Nouveau Bon / Arrivée Achat'}
          </button>
        </div>
      </div>

      {/* Main Form Section - Styled exactly as requested */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-900 space-y-6">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header Fields Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  FOURNISSEUR *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={e => {
                    setSelectedSupplierId(e.target.value);
                    if (!editingInvoiceId) handleRegenerateInvoiceNumber(e.target.value, dateArrival);
                  }}
                  className="w-full carbon-input font-bold text-sm bg-gray-100/80 border-gray-900 h-10"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.companyName || s.name} ({s.country || 'Local'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  DATE D'ARRIVÉE / RÉCEPTION *
                </label>
                <input
                  type="date"
                  required
                  value={dateArrival}
                  onChange={e => {
                    setDateArrival(e.target.value);
                    if (!editingInvoiceId) handleRegenerateInvoiceNumber(selectedSupplierId, e.target.value);
                  }}
                  className="w-full carbon-input font-mono font-bold text-sm bg-gray-100/80 border-gray-900 h-10"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                    N° FACTURE FOURNISSEUR *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRegenerateInvoiceNumber(selectedSupplierId, dateArrival)}
                    className="text-[10px] font-bold text-[#0f62fe] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Régénérer automatiquement selon le Fournisseur et la Date"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="ex: MLHMD01-260826"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full carbon-input font-mono font-bold text-sm bg-gray-100/80 border-gray-900 h-10 text-[#0f62fe] pr-16"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 pointer-events-none">
                    AUTO
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  N° CONTENEUR (SI IMPORT)
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
                        <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                          PRODUIT (RECHERCHE PAR CODE / NOM) *
                        </label>
                        <SearchableProductSelect
                          products={products}
                          value={item.productId}
                          onChange={newPrdId => handleItemChange(idx, 'productId', newPrdId)}
                          placeholder="Rechercher produit..."
                        />
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
                onClick={() => {
                  if (editingInvoiceId) handleCancelEdit();
                  setShowAddForm(false);
                }}
                className="px-5 py-2 border border-gray-400 hover:bg-gray-100 text-xs font-bold text-gray-700 rounded-md"
              >
                {editingInvoiceId ? 'Annuler la modification' : 'Fermer'}
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 ${editingInvoiceId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0f62fe] hover:bg-blue-700'} text-white text-xs font-black rounded-md flex items-center gap-2 shadow-md transition-all`}
              >
                {editingInvoiceId ? (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer les Modifications
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Enregistrer & Alimenter le Frigo
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* History & Supplier Invoice Management Table */}
      <div className="carbon-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
          <h2 className="font-bold text-gray-900 text-sm uppercase font-mono flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0f62fe]" />
            Gestion des Factures Fournisseurs & Réceptions ({purchaseInvoices.length})
          </h2>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Supplier Filter */}
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="p-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900 font-semibold"
            >
              <option value="ALL">Tous les Fournisseurs</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.companyName || s.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="p-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900 font-semibold"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="NON_PAYÉ">🔴 Non Payé</option>
              <option value="PARTIEL">🔵 Partiel</option>
              <option value="PAYÉ">🟢 Payé</option>
            </select>

            {/* Export All Filtered Invoices (Excel & PDF) */}
            <ExportButtons
              filename={`Factures_Achats_${new Date().toISOString().slice(0, 10)}`}
              title="REGISTRE DES FACTURES D'ACHAT FOURNISSEURS"
              excelData={exportAllInvoicesData}
              pdfHeaders={['N° Facture', 'Fournisseur', 'Date', 'Frigo', 'Colis', 'Poids Kg', 'Total HT (DH)', 'Statut']}
              pdfRows={exportAllInvoicesData.map(d => [
                d['N° Facture'],
                d['Fournisseur'],
                d['Date Arrivée'],
                d['Frigo Destination'],
                d['Total Colis'],
                `${d['Poids Total (Kg)']} Kg`,
                `${d['Coût Revient Total HT (DH)'].toLocaleString()} DH`,
                d['Statut Paiement']
              ])}
              size="sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>N° Facture / Conteneur</th>
                <th>Fournisseur</th>
                <th>Frigo Dest.</th>
                <th>Colis & Poids</th>
                <th>Total Facture HT</th>
                <th>Réglé / Restant</th>
                <th>Statut Paiement</th>
                <th>Actions & Export</th>
              </tr>
            </thead>
            <tbody>
              {purchaseInvoices
                .filter(pur => {
                  const matchesSearch = (pur.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (pur.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (pur.containerNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesStatus = statusFilter === 'ALL' || pur.paymentStatus === statusFilter;
                  const matchesSupplier = supplierFilter === 'ALL' || pur.supplierId === supplierFilter;
                  return matchesSearch && matchesStatus && matchesSupplier;
                })
                .map(pur => {
                  const frigoObj = frigos.find(f => f.id === pur.targetFrigoId);
                  const totalCartons = pur.items.reduce((acc, i) => acc + (i.quantityCartons || 0), 0);
                  const totalKg = pur.items.reduce((acc, i) => acc + (i.quantityKg || 0), 0);
                  const isExpanded = expandedInvoiceId === pur.id;
                  
                  const totalHT = pur.totalLandedCostHT || 0;
                  const paid = pur.paidAmount || 0;
                  const remaining = pur.remainingBalance !== undefined ? pur.remainingBalance : Math.max(0, totalHT - paid);
                  const status = pur.paymentStatus || (remaining <= 0 ? 'PAYÉ' : paid > 0 ? 'PARTIEL' : 'NON_PAYÉ');

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
                        <td className="font-mono text-xs">
                          <div className="font-bold text-blue-900">{totalCartons.toLocaleString()} Colis</div>
                          <div className="text-[11px] font-semibold text-emerald-800">{totalKg.toLocaleString()} Kg</div>
                        </td>
                        <td className="font-mono font-bold text-gray-900">
                          {totalHT.toLocaleString()} DH
                          <div className="text-[10px] text-gray-400 font-normal">Frais: {(pur.customsCostsHT + pur.freightCostsHT).toLocaleString()} DH</div>
                        </td>
                        <td className="font-mono text-xs">
                          <div className="font-bold text-emerald-700">Réglé: {paid.toLocaleString()} DH</div>
                          <div className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            Solde: {remaining.toLocaleString()} DH
                          </div>
                        </td>
                        <td>
                          <span className={`text-[10px] px-2 py-0.5 font-mono font-bold rounded ${
                            status === 'PAYÉ' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            status === 'PARTIEL' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {status === 'PAYÉ' ? '✓ PAYÉ' : status === 'PARTIEL' ? 'PARTIEL' : 'NON PAYÉ'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            
                            {/* PDF Export button */}
                            <button
                              onClick={() => handleDownloadInvoicePdf(pur)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-xs transition-colors"
                              title="Télécharger la Facture d'Achat en PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>

                            {/* Excel Export button */}
                            <button
                              onClick={() => handleExportSingleInvoiceExcel(pur)}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-xs transition-colors"
                              title="Exporter le détail en Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Excel</span>
                            </button>

                            {status !== 'PAYÉ' && (
                              <button
                                onClick={() => setPaymentModalInvoice(pur)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm transition-colors"
                                title="Enregistrer un règlement fournisseur"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Régler
                              </button>
                            )}

                            <button
                              onClick={() => handleStartEdit(pur)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm transition-colors"
                              title="Modifier cette facture d'achat / entrée"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Modifier
                            </button>

                            <button
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : pur.id)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded flex items-center gap-1 border border-gray-300"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              Détails
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Êtes-vous sûr de vouloir supprimer la facture fournisseur N° ${pur.invoiceNumber} ?`)) {
                                  deletePurchaseInvoice(pur.id);
                                }
                              }}
                              className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 transition-colors"
                              title="Supprimer la facture fournisseur"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Article & Payment Details */}
                      {isExpanded && (
                        <tr className="bg-blue-50/50 border-b-2 border-blue-200">
                          <td colSpan={8} className="p-3 space-y-3">
                            {/* Received Items */}
                            <div className="bg-white p-3 rounded border border-blue-200 space-y-2">
                              <div className="text-xs font-bold text-blue-900 uppercase font-mono border-b pb-1 flex flex-wrap justify-between items-center gap-2">
                                <span>Détails des Produits Reçus - Facture {pur.invoiceNumber}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDownloadInvoicePdf(pur)}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow-xs transition"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>Télécharger Facture PDF</span>
                                  </button>
                                  <button
                                    onClick={() => handleExportSingleInvoiceExcel(pur)}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow-xs transition"
                                  >
                                    <FileSpreadsheet className="w-3 h-3" />
                                    <span>Export Excel (.xlsx)</span>
                                  </button>
                                  <span className="text-gray-500 font-normal ml-1">({pur.items.length} Articles)</span>
                                </div>
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
                                      <td className="py-1 text-center font-bold text-indigo-700">{Math.round(it.landedCostPerKgHT || 0)} DH</td>
                                      <td className="py-1 text-right font-bold">{it.totalHT.toLocaleString()} DH</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Payment History */}
                            <div className="bg-white p-3 rounded border border-emerald-200 space-y-2">
                              <div className="text-xs font-bold text-emerald-900 uppercase font-mono border-b pb-1 flex justify-between items-center">
                                <span>Historique des Règlements Effectués ({pur.payments?.length || 0})</span>
                                <span>Total Réglé: {(pur.paidAmount || 0).toLocaleString()} DH</span>
                              </div>
                              {pur.payments && pur.payments.length > 0 ? (
                                <table className="w-full text-xs font-mono">
                                  <thead>
                                    <tr className="text-gray-500 border-b text-left">
                                      <th className="py-1">Date</th>
                                      <th className="py-1">Mode de Règlement</th>
                                      <th className="py-1">N° Référence / Chèque</th>
                                      <th className="py-1">Banque</th>
                                      <th className="py-1 text-right">Montant Réglé</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pur.payments.map((pItem, pIdx) => (
                                      <tr key={pIdx} className="border-b border-gray-100">
                                        <td className="py-1 font-bold text-gray-900">{pItem.date}</td>
                                        <td className="py-1 font-bold text-indigo-700">{pItem.paymentMethod}</td>
                                        <td className="py-1 text-gray-800">{pItem.reference || '-'}</td>
                                        <td className="py-1 text-gray-700">{pItem.bankName || '-'}</td>
                                        <td className="py-1 text-right font-bold text-emerald-700">{pItem.amount.toLocaleString()} DH</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-xs text-gray-500 italic py-1">
                                  Aucun règlement n'a encore été enregistré pour cette facture fournisseur.
                                </div>
                              )}
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

      {/* Supplier Payment Modal */}
      {paymentModalInvoice && (
        <SupplierPaymentModal
          invoice={paymentModalInvoice}
          onClose={() => setPaymentModalInvoice(null)}
        />
      )}

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
