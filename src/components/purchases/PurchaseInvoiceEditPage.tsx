import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Ship, 
  Calendar, 
  Building2, 
  Package, 
  RefreshCw, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Calculator,
  Warehouse,
  Truck
} from 'lucide-react';
import { generateAutoSupplierInvoiceNumber } from '../../utils/supplierInvoiceHelper';

interface PurchaseInvoiceEditPageProps {
  editId: string | null;
  onBack: () => void;
}

interface PurchaseItemRow {
  productId: string;
  quantityCartons: number | '';
  theoreticalKg: number;
  weighedKg: number | '';
  quantityKg: number;
  quantityPallets: number;
  purchaseUnitPriceHT: number | '';
}

export const PurchaseInvoiceEditPage: React.FC<PurchaseInvoiceEditPageProps> = ({ 
  editId, 
  onBack 
}) => {
  const { t } = useTranslation();
  const { 
    suppliers, 
    products, 
    frigos, 
    purchaseInvoices, 
    updatePurchaseInvoice, 
    createPurchaseInvoice 
  } = useERP();

  const isInitializedRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form states
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [containerNumber, setContainerNumber] = useState<string>('');
  const [targetFrigoId, setTargetFrigoId] = useState<string>('');
  const [dateArrival, setDateArrival] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isImport, setIsImport] = useState<boolean>(true);
  const [customsCostsHT, setCustomsCostsHT] = useState<number | ''>(0);
  const [freightCostsHT, setFreightCostsHT] = useState<number | ''>(0);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemRow[]>([]);

  // Initialize data on mount
  useEffect(() => {
    if (isInitializedRef.current) return;

    if (editId) {
      const invoice = (purchaseInvoices || []).find(p => p.id === editId);
      if (invoice) {
        setSelectedSupplierId(invoice.supplierId || suppliers[0]?.id || '');
        setInvoiceNumber(invoice.invoiceNumber || '');
        setContainerNumber(invoice.containerNumber || '');
        setTargetFrigoId(invoice.targetFrigoId || frigos[0]?.id || '');
        setDateArrival(invoice.dateArrival ? invoice.dateArrival.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setIsImport(invoice.isImport !== undefined ? invoice.isImport : true);
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
        } else {
          const defaultPrd = products[0];
          setPurchaseItems([{
            productId: defaultPrd ? defaultPrd.id : '',
            quantityCartons: '',
            theoreticalKg: 0,
            weighedKg: '',
            quantityKg: 0,
            quantityPallets: 0,
            purchaseUnitPriceHT: defaultPrd ? (defaultPrd.unitCostHT || 0) : 0,
          }]);
        }
        isInitializedRef.current = true;
      }
    } else {
      // Creation mode defaults
      const defaultSupplier = suppliers[0];
      const defaultFrigo = frigos[0];
      const defaultPrd = products[0];
      const today = new Date().toISOString().slice(0, 10);

      setSelectedSupplierId(defaultSupplier ? defaultSupplier.id : '');
      setTargetFrigoId(defaultFrigo ? defaultFrigo.id : '');
      setDateArrival(today);
      setIsImport(true);
      setCustomsCostsHT(0);
      setFreightCostsHT(0);

      const autoNum = defaultSupplier 
        ? generateAutoSupplierInvoiceNumber(defaultSupplier.companyName || defaultSupplier.name, today, purchaseInvoices)
        : '';
      setInvoiceNumber(autoNum);

      setPurchaseItems([{
        productId: defaultPrd ? defaultPrd.id : '',
        quantityCartons: '',
        theoreticalKg: 0,
        weighedKg: '',
        quantityKg: 0,
        quantityPallets: 0,
        purchaseUnitPriceHT: defaultPrd ? (defaultPrd.unitCostHT || 0) : 0,
      }]);
      isInitializedRef.current = true;
    }
  }, [editId, purchaseInvoices, suppliers, frigos, products]);

  const handleAutoGenerateInvoiceNumber = () => {
    const s = suppliers.find(sup => sup.id === selectedSupplierId);
    const autoNum = generateAutoSupplierInvoiceNumber(
      s?.companyName || s?.name || s?.code, 
      dateArrival, 
      purchaseInvoices.filter(p => p.id !== editId)
    );
    setInvoiceNumber(autoNum);
  };

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
      alert('Une facture d\'achat doit contenir au moins un produit.');
      return;
    }
    setPurchaseItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemRow, val: any) => {
    setPurchaseItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: val };
      const prd = products.find(p => p.id === updated.productId);
      const kgCarton = prd ? (prd.kgPerCarton || 5) : 5;
      const kgPerPallet = prd ? (prd.kgPerPallet || 500) : 500;

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

  // Financial Calculations
  const customs = Number(customsCostsHT) || 0;
  const freight = Number(freightCostsHT) || 0;
  const totalAdditionalCosts = customs + freight;

  const totalProductsHT = purchaseItems.reduce((acc, i) => {
    const price = Number(i.purchaseUnitPriceHT) || 0;
    const kg = Number(i.quantityKg) || 0;
    return acc + (kg * price);
  }, 0);

  const totalLandedCostHT = totalProductsHT + totalAdditionalCosts;
  const totalKgSum = purchaseItems.reduce((acc, i) => acc + (Number(i.quantityKg) || 0), 0);
  const totalCartonsSum = purchaseItems.reduce((acc, i) => acc + (Number(i.quantityCartons) || 0), 0);
  const totalPalletsSum = purchaseItems.reduce((acc, i) => acc + (Number(i.quantityPallets) || 0), 0);
  const costOverheadPerKg = totalKgSum > 0 ? totalAdditionalCosts / totalKgSum : 0;

  const currentSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const currentFrigo = frigos.find(f => f.id === targetFrigoId);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedSupplierId) {
      alert('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (!invoiceNumber.trim()) {
      alert('Veuillez saisir le N° de facture fournisseur.');
      return;
    }
    if (!targetFrigoId) {
      alert('Veuillez sélectionner le frigo de réception.');
      return;
    }
    if (purchaseItems.length === 0) {
      alert('Veuillez ajouter au moins une ligne de produit.');
      return;
    }

    const items = purchaseItems.map(it => {
      const prd = products.find(p => p.id === it.productId);
      const kg = Number(it.quantityKg) || 0;
      const price = Number(it.purchaseUnitPriceHT) || 0;
      const cartons = Number(it.quantityCartons) || 0;
      const totalHT = kg * price;
      const landedCostPerKgHT = price + costOverheadPerKg;

      return {
        productId: prd?.id || it.productId,
        productName: prd?.name || 'Produit',
        productCode: prd?.code || 'SKU',
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

    setIsSaving(true);
    setSaveError(null);

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      supplierId: currentSupplier?.id || selectedSupplierId,
      supplierName: currentSupplier?.companyName || currentSupplier?.name || 'Fournisseur',
      dateArrival,
      targetFrigoId,
      isImport,
      containerNumber: containerNumber.trim(),
      customsCostsHT: customs,
      freightCostsHT: freight,
      totalProductsHT,
      totalLandedCostHT,
      items,
    };

    try {
      if (editId) {
        await updatePurchaseInvoice(editId, payload);
      } else {
        await createPurchaseInvoice({
          ...payload,
          paymentStatus: 'NON_PAYÉ',
        });
      }
      onBack();
    } catch (err: any) {
      console.error('Erreur enregistrement facture achat:', err);
      const msg = err.message || 'Impossible d\'enregistrer la facture d\'achat.';
      setSaveError(msg);
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f4f4f4] text-[#161616]">
      {/* 1. Top Executive Action Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 py-4 border-b border-[#e0e0e0] shadow-sm">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button 
            type="button" 
            onClick={onBack} 
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe] disabled:opacity-50 cursor-pointer"
            title="Retour à la liste des factures"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-[#0f62fe] rounded border border-blue-200">
                <Ship className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight">
                {editId 
                  ? `Modifier Facture d'Achat • N° ${invoiceNumber}` 
                  : "Nouvelle Facture d'Achat / Arrivée en Frigo"}
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentSupplier ? `Fournisseur : ${currentSupplier.companyName || currentSupplier.name}` : 'Saisie Fournisseur'} 
              {currentFrigo ? ` • Frigo de Réception : ${currentFrigo.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button 
            type="button" 
            onClick={onBack}
            disabled={isSaving}
            className="flex items-center px-4 py-2 border border-[#393939] text-[#161616] bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('common.cancel', 'Annuler')}
          </button>
          
          <button 
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="flex items-center px-5 py-2 bg-[#0f62fe] text-white hover:bg-blue-700 rounded text-sm font-bold transition-colors shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                <span>{editId ? 'Enregistrer les Modifications' : 'Créer & Entrer en Stock'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Scrollable Form Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Section 1: Informations Générales & Frigo */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0f62fe]" />
                1. Fournisseur & Paramètres de Réception
              </h2>
              <span className="text-xs font-mono text-gray-500">
                Date : {dateArrival}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Fournisseur */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Fournisseur *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={e => {
                    setSelectedSupplierId(e.target.value);
                    const s = suppliers.find(sup => sup.id === e.target.value);
                    if (!editId && s) {
                      setInvoiceNumber(generateAutoSupplierInvoiceNumber(s.companyName || s.name, dateArrival, purchaseInvoices));
                    }
                  }}
                  className="w-full carbon-input text-sm font-bold bg-gray-50 border-gray-300 rounded"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.companyName || s.name} ({s.country || 'Local'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date d'arrivée */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Date Réception / Arrivée *
                </label>
                <input
                  type="date"
                  required
                  value={dateArrival}
                  onChange={e => {
                    setDateArrival(e.target.value);
                    if (!editId && currentSupplier) {
                      setInvoiceNumber(generateAutoSupplierInvoiceNumber(currentSupplier.companyName || currentSupplier.name, e.target.value, purchaseInvoices));
                    }
                  }}
                  className="w-full carbon-input text-sm font-mono font-bold bg-gray-50 border-gray-300 rounded"
                />
              </div>

              {/* N° Facture Fournisseur */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-gray-700">
                    N° Facture Fournisseur *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateInvoiceNumber}
                    className="text-[10px] font-bold text-[#0f62fe] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Générer automatiquement"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="ex: HAYTAM01-170225"
                  className="w-full carbon-input text-sm font-mono font-bold uppercase border-blue-300 rounded focus:border-[#0f62fe]"
                />
              </div>

              {/* Frigo de Réception */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1 flex items-center gap-1">
                  <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                  Frigo de Réception *
                </label>
                <select
                  value={targetFrigoId}
                  onChange={e => setTargetFrigoId(e.target.value)}
                  className="w-full carbon-input text-sm font-bold bg-blue-50/50 border-blue-300 text-blue-950 rounded"
                >
                  {frigos.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Type Achat & Conteneur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Type d'Opération
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImport(true)}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isImport 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Ship className="w-3.5 h-3.5" />
                    <span>Importation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImport(false)}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isImport 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Achat Local</span>
                  </button>
                </div>
              </div>

              {isImport && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    N° Conteneur
                  </label>
                  <input
                    type="text"
                    value={containerNumber}
                    onChange={e => setContainerNumber(e.target.value)}
                    placeholder="ex: MSCU1234567"
                    className="w-full carbon-input text-sm font-mono uppercase bg-gray-50 border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Frais d'Approche (Douane & Transport) */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#0f62fe]" />
                2. Frais d'Approche & Douane (Landed Cost)
              </h2>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Overhead : {costOverheadPerKg.toFixed(2)} DH / Kg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Frais de Douane HT (DH)
                </label>
                <input
                  type="number"
                  min="0"
                  value={customsCostsHT}
                  onChange={e => setCustomsCostsHT(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full carbon-input text-sm font-mono font-bold bg-gray-50 border-gray-300 rounded"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Frais de Fret / Transport HT (DH)
                </label>
                <input
                  type="number"
                  min="0"
                  value={freightCostsHT}
                  onChange={e => setFreightCostsHT(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full carbon-input text-sm font-mono font-bold bg-gray-50 border-gray-300 rounded"
                  placeholder="0"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-center">
                <div className="text-[11px] text-gray-500 font-bold uppercase">Total Frais d'Approche</div>
                <div className="text-base font-black font-mono text-gray-900">
                  {totalAdditionalCosts.toLocaleString()} DH
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Lignes de Produits & Pesée Réception */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#0f62fe]" />
                  3. Articles Reçus & Pesée Quai
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Saisissez les colis et les poids pesés. Le prix de revient par ligne est calculé en temps réel.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Produit</span>
              </button>
            </div>

            {/* Product items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 uppercase font-mono text-[10px] border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Produit (SKU)</th>
                    <th className="py-2.5 px-3 text-right">Colis / Cartons</th>
                    <th className="py-2.5 px-3 text-right">Kg Théorique</th>
                    <th className="py-2.5 px-3 text-right">Poids Pesé (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Palettes</th>
                    <th className="py-2.5 px-3 text-right">Prix Achat HT (DH/Kg)</th>
                    <th className="py-2.5 px-3 text-right">Coût Revient (DH/Kg)</th>
                    <th className="py-2.5 px-3 text-right">Total HT</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchaseItems.map((item, idx) => {
                    const prd = products.find(p => p.id === item.productId);
                    const unitPrice = Number(item.purchaseUnitPriceHT) || 0;
                    const lineKg = Number(item.quantityKg) || 0;
                    const lineTotal = lineKg * unitPrice;
                    const landedLineCost = unitPrice + costOverheadPerKg;

                    return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        {/* Produit */}
                        <td className="py-2.5 px-3 min-w-[200px]">
                          <select
                            value={item.productId}
                            onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                            className="w-full carbon-input text-xs font-bold bg-white border-gray-300 rounded"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Cartons */}
                        <td className="py-2.5 px-3 w-28 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.quantityCartons}
                            onChange={e => handleItemChange(idx, 'quantityCartons', e.target.value)}
                            placeholder="0"
                            className="w-full carbon-input text-right text-xs font-mono font-bold bg-white border-gray-300 rounded"
                          />
                        </td>

                        {/* Kg Théorique */}
                        <td className="py-2.5 px-3 text-right font-mono text-gray-500">
                          {item.theoreticalKg.toLocaleString()} Kg
                        </td>

                        {/* Poids Pesé Réel */}
                        <td className="py-2.5 px-3 w-32 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.weighedKg}
                            onChange={e => handleItemChange(idx, 'weighedKg', e.target.value)}
                            placeholder={String(item.theoreticalKg)}
                            className="w-full carbon-input text-right text-xs font-mono font-bold bg-blue-50/50 border-blue-300 text-blue-900 rounded"
                          />
                        </td>

                        {/* Palettes */}
                        <td className="py-2.5 px-3 w-20 text-right font-mono font-bold text-gray-700">
                          {item.quantityPallets}
                        </td>

                        {/* Prix Achat HT */}
                        <td className="py-2.5 px-3 w-28 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.purchaseUnitPriceHT}
                            onChange={e => handleItemChange(idx, 'purchaseUnitPriceHT', e.target.value)}
                            placeholder="0"
                            className="w-full carbon-input text-right text-xs font-mono font-bold bg-white border-gray-300 rounded"
                          />
                        </td>

                        {/* Coût Revient HT (Landed Cost) */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700">
                          {landedLineCost.toFixed(2)} DH
                        </td>

                        {/* Total Ligne HT */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                          {lineTotal.toLocaleString()} DH
                        </td>

                        {/* Action suppression */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Récapitulatif Financier (Synthèse Exécutive) */}
          <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <div className="text-gray-400 text-xs uppercase font-mono font-bold">Volumes Reçus</div>
              <div className="text-xl font-black font-mono text-white mt-1">
                {totalKgSum.toLocaleString()} Kg
              </div>
              <div className="text-xs text-blue-300 font-mono mt-0.5">
                {totalCartonsSum.toLocaleString()} Colis • {totalPalletsSum} Palettes
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs uppercase font-mono font-bold">Montant Produits HT</div>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                {totalProductsHT.toLocaleString()} DH
              </div>
              <div className="text-xs text-gray-400 font-mono mt-0.5">
                Hors frais d'approche
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs uppercase font-mono font-bold">Frais d'Approche HT</div>
              <div className="text-xl font-black font-mono text-amber-400 mt-1">
                {totalAdditionalCosts.toLocaleString()} DH
              </div>
              <div className="text-xs text-gray-400 font-mono mt-0.5">
                Douane : {customs.toLocaleString()} DH • Fret : {freight.toLocaleString()} DH
              </div>
            </div>

            <div className="border-l border-slate-700 pl-4">
              <div className="text-blue-400 text-xs uppercase font-mono font-bold">Coût Global Facture (Landed)</div>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {totalLandedCostHT.toLocaleString()} DH
              </div>
              <div className="text-xs text-emerald-400 font-mono mt-0.5">
                Coût moyen : {totalKgSum > 0 ? (totalLandedCostHT / totalKgSum).toFixed(2) : '0.00'} DH / Kg
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
