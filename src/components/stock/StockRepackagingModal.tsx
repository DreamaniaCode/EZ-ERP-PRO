import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { SearchableProductSelect } from '../common/SearchableProductSelect';
import { QuickProductModal } from './QuickProductModal';
import { useToast } from '../common/CarbonToastContainer';
import { 
  Scissors, 
  Warehouse, 
  Package, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';

interface StockRepackagingModalProps {
  onClose: () => void;
  defaultFrigoId?: string;
  defaultSourceProductId?: string;
}

interface TargetItem {
  productId: string;
  quantityPacks: number | '';
  quantityKg: number | '';
}

export const StockRepackagingModal: React.FC<StockRepackagingModalProps> = ({
  onClose,
  defaultFrigoId = '',
  defaultSourceProductId = '',
}) => {
  const { frigos, products, stocks, repackageStock, currentUser } = useERP();
  const { notifySuccess, notifyError } = useToast();

  const [frigoId, setFrigoId] = useState<string>(
    defaultFrigoId || (frigos[0]?.id || '')
  );

  // Source Product (Bulk / Gross)
  const [sourceProductId, setSourceProductId] = useState<string>(defaultSourceProductId || (products[0]?.id || ''));
  const [sourceCartons, setSourceCartons] = useState<number | ''>('');
  const [sourceKg, setSourceKg] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  // Target Products (Retail packs)
  const [targetItems, setTargetItems] = useState<TargetItem[]>([
    { productId: '', quantityPacks: '', quantityKg: '' }
  ]);

  // Modal for quick creating target products on the fly
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [targetItemIndexForNewPrd, setTargetItemIndexForNewPrd] = useState<number | null>(null);

  const [isSuccess, setIsSuccess] = useState(false);
  const [operationRef, setOperationRef] = useState('');

  // Metadata
  const sourceProduct = products.find(p => p.id === sourceProductId);
  const sourceFrigo = frigos.find(f => f.id === frigoId);
  const sourceStock = stocks.find(s => s.frigoId === frigoId && s.productId === sourceProductId);
  const availableSourceKg = sourceStock ? sourceStock.quantityKg : 0;
  const availableSourcePallets = sourceStock ? sourceStock.quantityPallets : 0;

  // Source kg calculation on carton change
  const handleSourceCartonsChange = (val: number | '') => {
    setSourceCartons(val);
    if (val !== '' && sourceProduct) {
      const kgRatio = sourceProduct.kgPerCarton || 10;
      setSourceKg(Number(val) * kgRatio);
    }
  };

  // Add target item line
  const handleAddTargetItem = () => {
    setTargetItems(prev => [
      ...prev,
      { productId: '', quantityPacks: '', quantityKg: '' }
    ]);
  };

  // Remove target item line
  const handleRemoveTargetItem = (index: number) => {
    if (targetItems.length === 1) {
      alert('Il faut au moins un produit dérivé en résultat de la division.');
      return;
    }
    setTargetItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Update target item
  const handleTargetItemChange = (index: number, field: keyof TargetItem, val: any) => {
    setTargetItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: val };
      const prd = products.find(p => p.id === (field === 'productId' ? val : updated.productId));

      if (field === 'productId') {
        const kgRatio = prd ? (prd.kgPerCarton || 1) : 1;
        const packs = typeof updated.quantityPacks === 'number' ? updated.quantityPacks : 0;
        if (packs > 0) {
          updated.quantityKg = packs * kgRatio;
        }
      } else if (field === 'quantityPacks') {
        const kgRatio = prd ? (prd.kgPerCarton || 1) : 1;
        if (val !== '') {
          updated.quantityKg = Number(val) * kgRatio;
        }
      }

      return updated;
    }));
  };

  // Calculate totals
  const numSourceKg = typeof sourceKg === 'number' ? sourceKg : (Number(sourceKg) || 0);
  const totalTargetKg = targetItems.reduce((acc, it) => acc + (typeof it.quantityKg === 'number' ? it.quantityKg : (Number(it.quantityKg) || 0)), 0);
  const totalTargetPacks = targetItems.reduce((acc, it) => acc + (typeof it.quantityPacks === 'number' ? it.quantityPacks : (Number(it.quantityPacks) || 0)), 0);
  const wasteOrDiffKg = numSourceKg - totalTargetKg;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!frigoId) {
      notifyError('Veuillez sélectionner un frigo.');
      return;
    }

    if (!sourceProductId) {
      notifyError('Veuillez sélectionner le produit source à diviser.');
      return;
    }

    if (numSourceKg <= 0) {
      notifyError('Le poids source à prélever doit être supérieur à 0 Kg.');
      return;
    }

    if (numSourceKg > availableSourceKg) {
      notifyError(`Stock insuffisant. Disponible dans ${sourceFrigo?.name || 'le frigo'}: ${availableSourceKg.toLocaleString()} Kg.`);
      return;
    }

    const invalidTargets = targetItems.filter(it => !it.productId || (Number(it.quantityKg) || 0) <= 0);
    if (invalidTargets.length > 0) {
      notifyError('Veuillez renseigner les produits dérivés et leurs quantités obtenues.');
      return;
    }

    if (totalTargetKg > numSourceKg) {
      notifyError(`Le poids total obtenu (${totalTargetKg} Kg) ne peut pas dépasser le poids source prélevé (${numSourceKg} Kg).`);
      return;
    }

    const ref = `RECOND-${Date.now().toString().slice(-6)}`;
    setOperationRef(ref);

    // Call repackageStock from ERPContext
    repackageStock({
      frigoId,
      sourceProductId,
      sourceKg: numSourceKg,
      sourceCartons: typeof sourceCartons === 'number' ? sourceCartons : undefined,
      targetItems: targetItems.map(it => {
        const prd = products.find(p => p.id === it.productId);
        const kgs = Number(it.quantityKg) || 0;
        const pallets = Math.max(1, Math.ceil(kgs / (prd?.kgPerPallet || 600)));
        return {
          productId: it.productId,
          quantityPacks: Number(it.quantityPacks) || 0,
          quantityKg: kgs,
          quantityPallets: pallets
        };
      }),
      wasteKg: Math.max(0, wasteOrDiffKg),
      notes: notes || `Reconditionnement / Division de ${sourceProduct?.name} en ${targetItems.length} sous-lots détail`
    });

    setIsSuccess(true);
    notifySuccess(`Reconditionnement validé avec succès (${ref}) !`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-900 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-gray-900 bg-[#161616] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600 rounded-lg text-white">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide font-mono uppercase">
                Reconditionnement & Division de Stock
              </h2>
              <p className="text-xs text-gray-300">
                Divisez un produit vrac/gros (ex: Datte 12KG) en paquets détail (ex: 3KG, 2KG, 1KG) avec mise à jour automatique des stocks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {isSuccess ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-gray-900 uppercase font-mono">
                Opération de Reconditionnement Enregistrée !
              </h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                Référence : <span className="font-mono font-bold text-blue-600">{operationRef}</span>. Le stock source a été déduit et les nouveaux paquets ont été ajoutés dans le frigo <span className="font-bold text-gray-900">{sourceFrigo?.name}</span>.
              </p>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs hover:bg-gray-800 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Frigo Selector Bar */}
              <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-purple-700 shrink-0" />
                  <div>
                    <label className="block text-xs font-black text-purple-950 uppercase">
                      FRIGO D'EXÉCUTION DU RECONDITIONNEMENT *
                    </label>
                    <p className="text-[11px] text-purple-800">
                      L'opération prélève et stocke les nouveaux paquets dans ce frigo
                    </p>
                  </div>
                </div>

                <select
                  value={frigoId}
                  onChange={e => setFrigoId(e.target.value)}
                  className="carbon-input font-bold text-sm bg-white border-purple-300 text-purple-950 h-10 w-full sm:w-64"
                >
                  {frigos.map(f => (
                    <option key={f.id} value={f.id}>🏢 {f.code} - {f.name} ({f.location || ''})</option>
                  ))}
                </select>
              </div>

              {/* Grid 2 Columns: Source vs Target */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. PRODUIT SOURCE (VRAC / CARTON D'ORIGINE) */}
                <div className="lg:col-span-5 bg-gray-50 p-4 rounded-xl border-2 border-gray-300 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-900 uppercase font-mono flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">1</span>
                      Produit Source (À Diviser)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                      SORTIE STOCK
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Sélectionner le Produit Source *
                    </label>
                    <SearchableProductSelect
                      products={products}
                      value={sourceProductId}
                      onChange={pId => {
                        setSourceProductId(pId);
                        const prd = products.find(p => p.id === pId);
                        if (prd && sourceCartons) {
                          setSourceKg(Number(sourceCartons) * (prd.kgPerCarton || 10));
                        }
                      }}
                      stocks={stocks}
                      frigoId={frigoId}
                      placeholder="Choisir le produit vrac (ex: Datte 12KG)..."
                    />
                  </div>

                  {/* Stock Availability Info */}
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-xs font-mono flex justify-between items-center">
                    <span className="text-gray-500">Stock Actuel Frigo:</span>
                    <span className={`font-bold ${availableSourceKg > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {availableSourceKg.toLocaleString()} Kg ({availableSourcePallets} pal)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Nb Cartons / Caisses
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="ex: 10"
                        value={sourceCartons}
                        onChange={e => handleSourceCartonsChange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full carbon-input font-mono font-bold text-sm bg-white border-gray-300 h-9"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-900 uppercase mb-1">
                        Poids Total Prélevé (Kg) *
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        required
                        placeholder="ex: 120"
                        value={sourceKg}
                        onChange={e => setSourceKg(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full carbon-input font-mono font-black text-sm text-red-600 bg-white border-red-300 h-9"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-500 italic">
                    * Ce poids sera déduit du stock de {sourceProduct?.name || 'ce produit'}.
                  </div>
                </div>

                {/* Arrow Icon on Desktop */}
                <div className="hidden lg:flex lg:col-span-1 justify-center pt-24 text-gray-400">
                  <ArrowRight className="w-8 h-8 text-purple-600" />
                </div>

                {/* 2. PRODUITS CIBLES (PAQUETS / LOTS DÉTAIL OBTENUS) */}
                <div className="lg:col-span-6 bg-purple-50/50 p-4 rounded-xl border-2 border-purple-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="text-xs font-black text-purple-950 uppercase font-mono flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                      Produits Cibles Obtenus (Conditionnement)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickProductModal(true)}
                      className="text-[10px] font-bold bg-[#00a66c] text-white px-2 py-1 rounded hover:bg-emerald-700 transition"
                    >
                      + Créer Nouveau Produit
                    </button>
                  </div>

                  <div className="space-y-3">
                    {targetItems.map((item, idx) => {
                      const prd = products.find(p => p.id === item.productId);
                      const kgRatio = prd?.kgPerCarton || 1;

                      return (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] font-bold text-gray-600 uppercase">
                              Produit Obtenu #{idx + 1}
                            </label>
                            {targetItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTargetItem(idx)}
                                className="text-red-500 hover:text-red-700 p-0.5"
                                title="Supprimer cette ligne"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <SearchableProductSelect
                            products={products.filter(p => p.id !== sourceProductId)}
                            value={item.productId}
                            onChange={pId => handleTargetItemChange(idx, 'productId', pId)}
                            placeholder="Choisir paquet détail (ex: Datte Paquet 3KG)..."
                          />

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                                Nb Paquets / Colis
                              </label>
                              <input
                                type="number"
                                min="1"
                                placeholder="ex: 20"
                                value={item.quantityPacks}
                                onChange={e => handleTargetItemChange(idx, 'quantityPacks', e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full carbon-input font-mono text-xs font-bold text-blue-900 bg-gray-50 border-gray-300 h-8"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-emerald-800 uppercase">
                                Poids Obtenu (Kg) *
                              </label>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                required
                                placeholder="ex: 60"
                                value={item.quantityKg}
                                onChange={e => handleTargetItemChange(idx, 'quantityKg', e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full carbon-input font-mono font-black text-xs text-emerald-700 bg-gray-50 border-emerald-300 h-8"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddTargetItem}
                    className="w-full py-1.5 border border-dashed border-purple-400 bg-white hover:bg-purple-50 text-purple-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Ajouter un Autre Format / Paquet (ex: Paquet 2KG)</span>
                  </button>
                </div>

              </div>

              {/* Summary & Balance Box */}
              <div className="bg-gray-900 text-white p-4 rounded-xl space-y-3 font-mono">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Bilan Poids & Écart de Transformation
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700">
                    <span className="text-gray-400 block text-[10px]">Poids Prélevé (Source)</span>
                    <span className="text-red-400 font-bold text-sm">
                      -{numSourceKg.toLocaleString()} Kg
                    </span>
                  </div>

                  <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700">
                    <span className="text-gray-400 block text-[10px]">Poids Obtenu (Packs)</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      +{totalTargetKg.toLocaleString()} Kg
                    </span>
                  </div>

                  <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700">
                    <span className="text-gray-400 block text-[10px]">Total Paquets Produits</span>
                    <span className="text-blue-400 font-bold text-sm">
                      {totalTargetPacks.toLocaleString()} Paquets
                    </span>
                  </div>

                  <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700">
                    <span className="text-gray-400 block text-[10px]">Perte / Déchets (Tri)</span>
                    <span className={`font-bold text-sm ${wasteOrDiffKg > 0 ? 'text-amber-400' : wasteOrDiffKg === 0 ? 'text-gray-300' : 'text-red-400'}`}>
                      {wasteOrDiffKg > 0 ? `${wasteOrDiffKg.toLocaleString()} Kg (Perte)` : wasteOrDiffKg === 0 ? '0 Kg (Équilibré)' : 'Erreur dépassement'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notes / Observations de Reconditionnement
                </label>
                <input
                  type="text"
                  placeholder="ex: Reconditionnement pour vente en détail Ramadan / Client X"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full carbon-input text-xs bg-gray-50 border-gray-300 h-9"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-lg flex items-center gap-2 shadow-md transition"
                >
                  <Scissors className="w-4 h-4" />
                  <span>Valider le Reconditionnement & Mettre à Jour le Stock</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

      {/* Quick product creator modal */}
      {showQuickProductModal && (
        <QuickProductModal
          onClose={() => setShowQuickProductModal(false)}
          onProductCreated={newPrd => {
            setShowQuickProductModal(false);
            if (targetItems.length > 0) {
              const emptyIdx = targetItems.findIndex(t => !t.productId);
              if (emptyIdx !== -1) {
                handleTargetItemChange(emptyIdx, 'productId', newPrd.id);
              } else {
                setTargetItems(prev => [
                  ...prev,
                  { productId: newPrd.id, quantityPacks: '', quantityKg: '' }
                ]);
              }
            }
          }}
        />
      )}

    </div>
  );
};
