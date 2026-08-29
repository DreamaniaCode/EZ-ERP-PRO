import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, ColdStorageFrigo } from '../../types';
import { SearchableProductSelect } from '../common/SearchableProductSelect';
import { QuickProductModal } from './QuickProductModal';
import { 
  Scissors, 
  ArrowLeft, 
  Building2, 
  Package, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  Scale, 
  Boxes, 
  TrendingDown, 
  History,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface StockRepackagingPageProps {
  initialFrigoId?: string | null;
  initialProductId?: string | null;
  onBack: () => void;
}

interface TargetItemRow {
  id: string;
  productId: string;
  quantityPacks: number | '';
  kgPerPack: number;
  totalKg: number;
}

export const StockRepackagingPage: React.FC<StockRepackagingPageProps> = ({
  initialFrigoId,
  initialProductId,
  onBack
}) => {
  const { 
    products, 
    frigos, 
    stocks, 
    repackageStock, 
    currentUser,
    addProduct,
    stockMovements
  } = useERP();

  // Selected Frigo
  const [selectedFrigoId, setSelectedFrigoId] = useState<string>(() => {
    if (initialFrigoId && frigos.some(f => f.id === initialFrigoId)) return initialFrigoId;
    if (currentUser?.assignedFrigoId && frigos.some(f => f.id === currentUser.assignedFrigoId)) {
      return currentUser.assignedFrigoId;
    }
    return frigos[0]?.id || '';
  });

  // Source Product (Bulk / Vrac)
  const [sourceProductId, setSourceProductId] = useState<string>(initialProductId || '');
  const [sourceCartons, setSourceCartons] = useState<number | ''>('');
  const [sourceKgInput, setSourceKgInput] = useState<number | ''>('');
  const [useExactKg, setUseExactKg] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Target Products (Retail packs)
  const [targetItems, setTargetItems] = useState<TargetItemRow[]>([
    { id: '1', productId: '', quantityPacks: '', kgPerPack: 3, totalKg: 0 },
    { id: '2', productId: '', quantityPacks: '', kgPerPack: 2, totalKg: 0 }
  ]);

  // Quick Product creation modal
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [quickProductTargetIndex, setQuickProductTargetIndex] = useState<number | null>(null);

  // Success notification state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected Source Product details
  const sourceProduct = useMemo(() => {
    return products.find(p => p.id === sourceProductId);
  }, [products, sourceProductId]);

  // Real-time stock available in selected frigo
  const sourceStock = useMemo(() => {
    if (!sourceProductId || !selectedFrigoId) return null;
    const st = stocks.find(s => s.frigoId === selectedFrigoId && s.productId === sourceProductId);
    const kg = st ? st.quantityKg : 0;
    const kgPerCtn = sourceProduct?.kgPerCarton || 12;
    const cartons = Math.floor(kg / (kgPerCtn > 0 ? kgPerCtn : 1));
    const pallets = st ? st.quantityPallets : 0;
    return { kg, cartons, pallets, kgPerCtn };
  }, [stocks, sourceProductId, selectedFrigoId, sourceProduct]);

  // Computed source total Kg taken
  const totalSourceKg = useMemo(() => {
    if (useExactKg) {
      return Number(sourceKgInput) || 0;
    }
    const ctn = Number(sourceCartons) || 0;
    const kgPerCtn = sourceStock?.kgPerCtn || 12;
    return ctn * kgPerCtn;
  }, [useExactKg, sourceKgInput, sourceCartons, sourceStock]);

  // Computed target total Kg obtained
  const totalTargetKg = useMemo(() => {
    return targetItems.reduce((sum, item) => sum + (Number(item.totalKg) || 0), 0);
  }, [targetItems]);

  const totalTargetPacks = useMemo(() => {
    return targetItems.reduce((sum, item) => sum + (Number(item.quantityPacks) || 0), 0);
  }, [targetItems]);

  // Shrinkage / Waste / Yield
  const wasteKg = useMemo(() => {
    return Math.max(0, totalSourceKg - totalTargetKg);
  }, [totalSourceKg, totalTargetKg]);

  const yieldPercentage = useMemo(() => {
    if (totalSourceKg <= 0) return 100;
    return Math.min(100, Math.round((totalTargetKg / totalSourceKg) * 1000) / 10);
  }, [totalSourceKg, totalTargetKg]);

  // Validation
  const isValid = useMemo(() => {
    if (!selectedFrigoId) return false;
    if (!sourceProductId) return false;
    if (totalSourceKg <= 0) return false;
    if (sourceStock && totalSourceKg > sourceStock.kg) return false;
    const validTargets = targetItems.filter(t => t.productId && Number(t.quantityPacks) > 0 && t.totalKg > 0);
    if (validTargets.length === 0) return false;
    if (totalTargetKg > totalSourceKg) return false;
    return true;
  }, [selectedFrigoId, sourceProductId, totalSourceKg, sourceStock, targetItems, totalTargetKg]);

  // Handle Target Item row changes
  const handleTargetProductChange = (index: number, newPrdId: string) => {
    const prd = products.find(p => p.id === newPrdId);
    let detectedKg = 1;

    if (prd) {
      const match = prd.name.match(/(\d+(?:[.,]\d+)?)\s*kg/i) || prd.code.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
      if (match) {
        detectedKg = parseFloat(match[1].replace(',', '.'));
      } else if (prd.kgPerCarton && prd.kgPerCarton > 0) {
        detectedKg = prd.kgPerCarton;
      }
    }

    setTargetItems(prev => {
      const updated = [...prev];
      const packs = Number(updated[index].quantityPacks) || 0;
      updated[index] = {
        ...updated[index],
        productId: newPrdId,
        kgPerPack: detectedKg,
        totalKg: Math.round(packs * detectedKg * 100) / 100
      };
      return updated;
    });
  };

  const handleTargetPacksChange = (index: number, packsVal: string) => {
    const packs = packsVal === '' ? '' : Math.max(0, parseInt(packsVal, 10) || 0);
    setTargetItems(prev => {
      const updated = [...prev];
      const kgPerPk = updated[index].kgPerPack || 1;
      const numPacks = Number(packs) || 0;
      updated[index] = {
        ...updated[index],
        quantityPacks: packs,
        totalKg: Math.round(numPacks * kgPerPk * 100) / 100
      };
      return updated;
    });
  };

  const handleTargetKgPerPackChange = (index: number, kgVal: string) => {
    const kg = Math.max(0.1, parseFloat(kgVal) || 1);
    setTargetItems(prev => {
      const updated = [...prev];
      const numPacks = Number(updated[index].quantityPacks) || 0;
      updated[index] = {
        ...updated[index],
        kgPerPack: kg,
        totalKg: Math.round(numPacks * kg * 100) / 100
      };
      return updated;
    });
  };

  const addTargetRow = () => {
    setTargetItems(prev => [
      ...prev,
      { id: Date.now().toString(), productId: '', quantityPacks: '', kgPerPack: 1, totalKg: 0 }
    ]);
  };

  const removeTargetRow = (index: number) => {
    if (targetItems.length <= 1) return;
    setTargetItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Repackaging Operation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const validTargets = targetItems.filter(t => t.productId && Number(t.quantityPacks) > 0);

    const sourcePrdName = sourceProduct?.name || 'Produit Vrac';
    const frigoName = frigos.find(f => f.id === selectedFrigoId)?.name || 'Entrepôt';

    const confirmMsg = `Confirmer le reconditionnement dans "${frigoName}" ?\n\n` +
      `• Sortie : ${totalSourceKg} Kg de "${sourcePrdName}"\n` +
      `• Entrée : ${validTargets.map(t => `${t.quantityPacks} paquets de ${products.find(p => p.id === t.productId)?.name || t.productId} (${t.totalKg} Kg)`).join('\n  ')}\n` +
      (wasteKg > 0 ? `• Perte / Déchet de tri : ${wasteKg.toFixed(2)} Kg\n` : '') +
      `\nCette action va ajuster immédiatement les stocks physiques.`;

    if (!window.confirm(confirmMsg)) return;

    repackageStock({
      frigoId: selectedFrigoId,
      sourceProductId,
      sourceKg: totalSourceKg,
      sourceCartons: Number(sourceCartons) || undefined,
      targetItems: validTargets.map(t => ({
        productId: t.productId,
        quantityPacks: Number(t.quantityPacks),
        quantityKg: t.totalKg
      })),
      wasteKg,
      notes: notes || `Reconditionnement ${sourcePrdName} -> ${validTargets.length} formats détail`
    });

    setSuccessMessage(`✅ Reconditionnement effectué avec succès ! ${totalSourceKg} Kg de ${sourcePrdName} ont été divisés en ${totalTargetPacks} paquets.`);

    // Reset fields for next operation
    setSourceCartons('');
    setSourceKgInput('');
    setNotes('');
    setTargetItems([
      { id: '1', productId: '', quantityPacks: '', kgPerPack: 3, totalKg: 0 },
      { id: '2', productId: '', quantityPacks: '', kgPerPack: 2, totalKg: 0 }
    ]);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 6000);
  };

  const selectedFrigo = frigos.find(f => f.id === selectedFrigoId);

  // Filter recent reconditioning movements
  const recentRepackagingMovements = useMemo(() => {
    return (stockMovements || [])
      .filter(m => m.movementType === 'ADJUSTMENT' && (m.notes?.toLowerCase().includes('reconditionnement') || m.reference?.toLowerCase().includes('reconditionnement')))
      .slice(0, 8);
  }, [stockMovements]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Header Bar */}
      <div className="bg-[#161616] p-4 sm:p-6 border border-[#393939] text-white rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2 bg-[#262626] hover:bg-[#393939] active:bg-[#4a4a4a] text-gray-300 hover:text-white rounded-lg transition-all border border-gray-700 cursor-pointer"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-purple-600/30 border border-purple-500/50 rounded-lg text-purple-400">
                <Scissors className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold font-mono uppercase tracking-wide">
                Reconditionnement & Division de Stock
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Transformation de caisses de gros / vrac (ex: 12 KG) vers des formats détail (ex: Paquets 3 KG, 2 KG, 1 KG)
            </p>
          </div>
        </div>

        {/* Frigo Selector */}
        <div className="flex items-center gap-2 bg-[#262626] px-3 py-2 border border-gray-700 rounded-lg">
          <Building2 className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-gray-400 font-medium">Entrepôt :</span>
          <select
            value={selectedFrigoId}
            onChange={(e) => setSelectedFrigoId(e.target.value)}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
          >
            {frigos.map(f => (
              <option key={f.id} value={f.id} className="bg-[#161616] text-white">
                {f.name} ({f.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="bg-emerald-900/80 border border-emerald-500 text-emerald-100 p-4 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold px-2 py-1 bg-emerald-800/60 rounded"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ========================================================================= */}
          {/* STEP 1: SOURCE PRODUCT (VRAC / GROS)                                     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Produit Source (Sortie Vrac)
                </h2>
              </div>
              <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                Prélèvement Stock
              </span>
            </div>

            {/* Product Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Article Vrac / Caisse d'origine *
              </label>
              <SearchableProductSelect
                products={products}
                value={sourceProductId}
                onChange={setSourceProductId}
                stocks={stocks}
                frigoId={selectedFrigoId}
                placeholder="Sélectionner le produit vrac (ex: Datte 12 KG)..."
              />
            </div>

            {/* Source Stock Badge */}
            {sourceStock && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    Stock Actuel au Frigo :
                  </span>
                  <span className="font-mono font-black text-amber-900 text-sm">
                    {sourceStock.kg.toLocaleString()} Kg
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-800 font-mono pt-1 border-t border-amber-200/60">
                  <span>~ {sourceStock.cartons.toLocaleString()} Caisses ({sourceStock.kgPerCtn} Kg/caisse)</span>
                  <span>{sourceStock.pallets} Palettes</span>
                </div>
              </div>
            )}

            {/* Quantity to take */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Quantité à Reconditionner *
                </label>
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUseExactKg(false)}
                    className={`px-2 py-0.5 rounded transition ${!useExactKg ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                  >
                    Par Caisses
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseExactKg(true)}
                    className={`px-2 py-0.5 rounded transition ${useExactKg ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                  >
                    En Kg Direct
                  </button>
                </div>
              </div>

              {!useExactKg ? (
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      value={sourceCartons}
                      onChange={(e) => setSourceCartons(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="Ex: 10 caisses"
                      min="1"
                      step="1"
                      className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm font-mono font-bold text-gray-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">Caisses</span>
                  </div>
                  <div className="mt-1.5 text-xs font-mono text-gray-600 flex items-center justify-between">
                    <span>Poids calculé :</span>
                    <span className="font-bold text-amber-700">{totalSourceKg.toLocaleString()} Kg</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      value={sourceKgInput}
                      onChange={(e) => setSourceKgInput(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Ex: 120 Kg"
                      min="0.1"
                      step="0.1"
                      className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm font-mono font-bold text-gray-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">Kg</span>
                  </div>
                </div>
              )}

              {/* Over-stock Warning */}
              {sourceStock && totalSourceKg > sourceStock.kg && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>Stock insuffisant ! Stock dispo : {sourceStock.kg.toLocaleString()} Kg</span>
                </div>
              )}
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Notes & Remarques (Optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Division pour commande Carrefour / Supermarché..."
                className="w-full border border-gray-300 rounded-lg p-2 text-xs text-gray-800 focus:ring-1 focus:ring-purple-600"
              />
            </div>

          </div>


          {/* ========================================================================= */}
          {/* STEP 2: TARGET PRODUCTS (PAQUETS / FORMATS OBTENUS)                      */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Formats & Paquets Obtenus (Entrée Détail)
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setQuickProductTargetIndex(null);
                    setShowQuickProductModal(true);
                  }}
                  className="text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition border border-purple-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouveau format catalogue</span>
                </button>
              </div>

              {/* Target items list */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {targetItems.map((item, idx) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 transition hover:border-purple-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-600" />
                        Ligne {idx + 1}
                      </span>
                      {targetItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTargetRow(idx)}
                          className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      
                      {/* Product Selector */}
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                          Article Produit Paquet *
                        </label>
                        <SearchableProductSelect
                          products={products}
                          value={item.productId}
                          onChange={(newId) => handleTargetProductChange(idx, newId)}
                          stocks={stocks}
                          frigoId={selectedFrigoId}
                          placeholder="Choisir paquet (ex: Paquet 3 KG)..."
                        />
                      </div>

                      {/* Number of Packs */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                          Nbr Paquets
                        </label>
                        <input
                          type="number"
                          value={item.quantityPacks}
                          onChange={(e) => handleTargetPacksChange(idx, e.target.value)}
                          placeholder="Ex: 20"
                          min="1"
                          step="1"
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold text-purple-700 bg-white focus:ring-1 focus:ring-purple-600"
                        />
                      </div>

                      {/* Unit Pack Weight (Kg) */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                          Kg / Paquet
                        </label>
                        <input
                          type="number"
                          value={item.kgPerPack}
                          onChange={(e) => handleTargetKgPerPackChange(idx, e.target.value)}
                          placeholder="Ex: 3"
                          min="0.1"
                          step="0.1"
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold text-gray-700 bg-white focus:ring-1 focus:ring-purple-600"
                        />
                      </div>

                    </div>

                    {/* Output calculation subtotal */}
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-gray-500 border-t border-gray-200/50">
                      <span>Total généré : {Number(item.quantityPacks) || 0} paquets × {item.kgPerPack} Kg</span>
                      <span className="font-bold text-purple-700 text-xs">
                        = {item.totalKg.toLocaleString()} Kg
                      </span>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add line button */}
              <button
                type="button"
                onClick={addTargetRow}
                className="w-full py-2.5 border-2 border-dashed border-purple-300 hover:border-purple-500 text-purple-700 hover:bg-purple-50/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un autre format de paquet (ex: 2 KG, 1 KG...)</span>
              </button>
            </div>

            {/* Total Target Obtained Summary */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-purple-600" />
                Total Produits Finis Obtenus :
              </span>
              <span className="font-mono font-black text-purple-900 text-sm">
                {totalTargetPacks} Paquets ({totalTargetKg.toLocaleString()} Kg)
              </span>
            </div>

          </div>

        </div>


        {/* ========================================================================= */}
        {/* STEP 3: RECAPITULATIF & BILAN MATIÈRE (PERTE / DÉCHET DE TRI)             */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
              3
            </span>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Bilan Matière & Contrôle de Poids
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            
            {/* Box 1: Prelevé */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div className="text-[11px] font-bold uppercase text-gray-500">
                1. Prélevé (Vrac Sortie)
              </div>
              <div className="text-base sm:text-lg font-mono font-black text-gray-900 mt-1">
                {totalSourceKg.toLocaleString()} Kg
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                {sourceProduct?.name || 'Non sélectionné'}
              </div>
            </div>

            {/* Box 2: Obtenu */}
            <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
              <div className="text-[11px] font-bold uppercase text-purple-700">
                2. Obtenu (Paquets Entrée)
              </div>
              <div className="text-base sm:text-lg font-mono font-black text-purple-900 mt-1">
                {totalTargetKg.toLocaleString()} Kg
              </div>
              <div className="text-[10px] text-purple-700 font-mono mt-0.5">
                {totalTargetPacks} paquets prêts pour vente
              </div>
            </div>

            {/* Box 3: Perte / Déchet */}
            <div className={`p-3.5 rounded-xl border ${wasteKg > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`text-[11px] font-bold uppercase ${wasteKg > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                3. Perte / Déchet de tri
              </div>
              <div className={`text-base sm:text-lg font-mono font-black mt-1 ${wasteKg > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                {wasteKg.toFixed(2)} Kg
              </div>
              <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                {wasteKg > 0 ? `${((wasteKg / (totalSourceKg || 1)) * 100).toFixed(1)}% perte normale` : '0% perte (Équilibre exact)'}
              </div>
            </div>

            {/* Box 4: Rendement */}
            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
              <div className="text-[11px] font-bold uppercase text-blue-700">
                4. Taux de Rendement
              </div>
              <div className="text-base sm:text-lg font-mono font-black text-blue-900 mt-1">
                {yieldPercentage}%
              </div>
              <div className="text-[10px] text-blue-700 font-mono mt-0.5">
                Efficacité de division
              </div>
            </div>

          </div>

          {/* Error if output is greater than input */}
          {totalTargetKg > totalSourceKg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                Attention : Le poids total des paquets obtenus ({totalTargetKg} Kg) dépasse le poids prélevé ({totalSourceKg} Kg) !
              </span>
            </div>
          )}
        </div>


        {/* ========================================================================= */}
        {/* ACTION BUTTONS BAR                                                        */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Annuler / Retour
          </button>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Scissors className="w-4 h-4 text-yellow-300" />
            <span>Valider le Reconditionnement & Mettre à jour les Stocks</span>
          </button>
        </div>

      </form>


      {/* ========================================================================= */}
      {/* SECTION 4: HISTORIQUE RÉCENT DES RECONDITIONNEMENTS                       */}
      {/* ========================================================================= */}
      {recentRepackagingMovements.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-700 pb-2 border-b border-gray-100">
            <History className="w-4 h-4 text-purple-600" />
            <span>Historique Récent des Reconditionnements</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Date & Heure</th>
                  <th className="p-2.5">Entrepôt</th>
                  <th className="p-2.5">Produit</th>
                  <th className="p-2.5">Quantité (Kg)</th>
                  <th className="p-2.5">Opérateur</th>
                  <th className="p-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRepackagingMovements.map((mov, i) => (
                  <tr key={mov.id || i} className="hover:bg-gray-50/80">
                    <td className="p-2.5 font-mono text-gray-600">{mov.date} {mov.time}</td>
                    <td className="p-2.5 font-semibold text-gray-800">{mov.frigoName}</td>
                    <td className="p-2.5 font-bold text-gray-900">{mov.productName}</td>
                    <td className="p-2.5 font-mono font-bold text-purple-700">
                      {mov.quantityKg > 0 ? `+${mov.quantityKg}` : mov.quantityKg} Kg
                    </td>
                    <td className="p-2.5 text-gray-600">{mov.performedBy || 'Admin'}</td>
                    <td className="p-2.5 text-gray-500 text-[11px]">{mov.notes || mov.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Product Modal */}
      {showQuickProductModal && (
        <QuickProductModal
          onClose={() => setShowQuickProductModal(false)}
          onProductCreated={(newPrd) => {
            setShowQuickProductModal(false);
            if (quickProductTargetIndex !== null && quickProductTargetIndex < targetItems.length) {
              handleTargetProductChange(quickProductTargetIndex, newPrd.id);
            } else {
              // Add as a new target row
              setTargetItems(prev => [
                ...prev,
                { id: Date.now().toString(), productId: newPrd.id, quantityPacks: '', kgPerPack: newPrd.kgPerCarton || 1, totalKg: 0 }
              ]);
            }
          }}
        />
      )}

    </div>
  );
};
