import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { Product, ProductCategory } from '../../types';
import { findMatchingProduct } from '../../utils/productMatcher';
import { ExportButtons } from '../common/ExportButtons';
import { ProductStockHistoryModal } from './ProductStockHistoryModal';
import { PriceDiagnosticModal } from './PriceDiagnosticModal';
import { Plus, Package, Search, Filter, AlertTriangle, ArrowRightLeft, Layers, Edit, Trash2, History, Wrench, RefreshCw, Sparkles } from 'lucide-react';

interface ProductsListProps {
  onEditProduct?: (id: string) => void;
  onNewProduct?: () => void;
}

export const ProductsList: React.FC<ProductsListProps> = ({ onEditProduct, onNewProduct }) => {
  const { t } = useTranslation();
  const { 
    currentUser,
    products, 
    stocks, 
    frigos, 
    deliveryNotes, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    transferStock, 
    syncBLPricesWithProducts,
    mergeProducts
  } = useERP();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);

  // Product Selection & Merge State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [targetMergeProductId, setTargetMergeProductId] = useState<string>('');
  const [showProductMergeModal, setShowProductMergeModal] = useState<boolean>(false);

  // Quick diagnostic count of outdated BL items
  const outdatedBLCount = useMemo(() => {
    let count = 0;
    deliveryNotes.forEach(bl => {
      (bl.items || []).forEach(item => {
        const prd = findMatchingProduct(item, products);
        if (prd && Math.abs(item.unitPriceHT - prd.sellingPriceHT) > 0.001) {
          count++;
        }
      });
    });
    return count;
  }, [deliveryNotes, products]);

  // Transfer state
  const [transferData, setTransferData] = useState({
    productId: products[0]?.id || '',
    sourceFrigoId: frigos[0]?.id || '',
    targetFrigoId: frigos[1]?.id || '',
    kg: 800,
    pallets: 1,
  });

  // Form State for new Product
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'Dattes Locales' as ProductCategory,
    origin: 'Maroc',
    sellingPriceHT: 0,
    unitCostHT: 0,
    vatRate: 0.20,
    kgPerCarton: 5,
    cartonsPerPallet: 160,
    minStockAlertKg: 0,
    description: '',
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name) return;
    addProduct(newProd);
    setShowAddModal(false);
    setNewProd({
      name: '',
      category: 'Dattes Locales',
      origin: 'Maroc',
      sellingPriceHT: 0,
      unitCostHT: 0,
      vatRate: 0.20,
      kgPerCarton: 5,
      cartonsPerPallet: 160,
      minStockAlertKg: 0,
      description: '',
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct.id, editingProduct);
    setEditingProduct(null);
    alert('Produit et prix de vente mis à jour avec succès !');
  };

  const handleDeleteProduct = (prd: Product) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le produit ${prd.code} - ${prd.name} ?`)) {
      deleteProduct(prd.id);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.sourceFrigoId === transferData.targetFrigoId) {
      alert('Veuillez sélectionner des frigos différents pour le transfert.');
      return;
    }

    const targetProductsToTransfer = selectedProductIds.length > 0 
      ? selectedProductIds 
      : [transferData.productId];

    targetProductsToTransfer.forEach(prdId => {
      // Find stock level for this product in source frigo
      const sourceStock = stocks.find(s => s.productId === prdId && s.frigoId === transferData.sourceFrigoId);
      const kgToMove = selectedProductIds.length > 0 ? (sourceStock?.quantityKg || 0) : Number(transferData.kg);
      const palletsToMove = selectedProductIds.length > 0 ? (sourceStock?.quantityPallets || 0) : Number(transferData.pallets);

      if (kgToMove > 0) {
        transferStock(
          transferData.sourceFrigoId,
          transferData.targetFrigoId,
          prdId,
          kgToMove,
          palletsToMove
        );
      }
    });

    setShowTransferModal(false);
    setSelectedProductIds([]);
    alert(`Transfert inter-frigo de ${targetProductsToTransfer.length} produit(s) effectué avec succès !`);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.origin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0f62fe]" />
            Catalogue Produits & Suivi du Stock par Palettes / Kg
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Codes Automatiques (PRD-DAT-XXX), Calcul Logistique Unitaire (Kg & Palettes) et Emplacements Frigos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.role !== 'RESPONSABLE_FRIGO' && (
            <button
              onClick={() => setShowDiagnosticModal(true)}
              className={`text-xs px-3 py-2 rounded flex items-center gap-1.5 font-bold transition-all border shadow ${
                outdatedBLCount > 0 
                  ? 'bg-amber-500 hover:bg-amber-600 text-black border-amber-400 animate-pulse' 
                  : 'bg-[#262626] hover:bg-[#393939] text-gray-200 border-[#525252]'
              }`}
              title="Outil de Diagnostic Tarifaire & Synchronisation des prix BL avec le catalogue"
            >
              <Wrench className="w-4 h-4 text-amber-300" />
              <span>Diagnostic & Synchro Prix</span>
              {outdatedBLCount > 0 && (
                <span className="bg-rose-600 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full ml-0.5">
                  {outdatedBLCount}
                </span>
              )}
            </button>
          )}

          <ExportButtons 
            filename="Catalogue_Produits_Et_Stock"
            title="CATALOGUE DES PRODUITS & SITUATION DU STOCK MULTI-FRIGOS"
            frigoName={currentUser?.assignedFrigoId ? frigos.find(f => f.id === currentUser.assignedFrigoId)?.name : 'Tous les Frigos'}
            excelData={products.map(p => {
              const pStocks = stocks.filter(s => s.productId === p.id);
              const totalKg = pStocks.reduce((sum, s) => sum + s.quantityKg, 0);
              const totalPal = pStocks.reduce((sum, s) => sum + s.quantityPallets, 0);
              const valHT = totalKg * p.sellingPriceHT;
              return {
                'Code SKU': p.code,
                'Désignation Produit': p.name,
                'Catégorie': p.category,
                'Origine': p.origin,
                'Prix Vente HT (DH/Kg)': p.sellingPriceHT,
                'Prix Revient HT (DH/Kg)': p.unitCostHT,
                'Stock Total (Kg)': totalKg,
                'Stock Total (Palettes)': totalPal,
                'Valeur Stock HT (DH)': valHT,
                'Conditionnement (Kg/Pal)': p.kgPerPallet,
              };
            })}
          />

          {selectedProductIds.length > 0 && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded font-bold flex items-center gap-1.5 transition-colors shadow-md animate-pulse"
              title="Transférer les produits sélectionnés d'un frigo vers un autre"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transfert Groupé ({selectedProductIds.length}) Produits
            </button>
          )}

          {selectedProductIds.length >= 2 && (
            <button
              onClick={() => {
                setTargetMergeProductId(selectedProductIds[0]);
                setShowProductMergeModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded font-bold flex items-center gap-1.5 transition-colors shadow-md"
              title="Fusionner les produits sélectionnés et réunir leurs stocks"
            >
              <Layers className="w-4 h-4" />
              Fusionner ({selectedProductIds.length}) Produits Sélectionnés
            </button>
          )}

          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-[#262626] hover:bg-[#393939] text-gray-200 border border-[#525252] text-xs px-3 py-2 rounded flex items-center gap-1.5 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            Transfert Inter-Frigos
          </button>
          {currentUser?.role !== 'RESPONSABLE_FRIGO' && (
            <button
              onClick={() => onNewProduct ? onNewProduct() : setShowAddModal(true)}
              className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
            >
              <Plus className="w-4 h-4" />
              Nouveau Produit (Code Auto)
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="carbon-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par Code, Nom, Origine..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full carbon-input pl-9 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="carbon-input text-xs"
          >
            <option value="ALL">Toutes les catégories</option>
            <option value="Dattes Locales">Dattes Locales</option>
            <option value="Dattes Importées">Dattes Importées</option>
            <option value="Fruits Secs">Fruits Secs</option>
            <option value="Huiles & Condiments">Huiles & Condiments</option>
            <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="carbon-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th className="w-10 text-center">
                  <input 
                    type="checkbox"
                    checked={selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedProductIds(filteredProducts.map(p => p.id));
                      else setSelectedProductIds([]);
                    }}
                    className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th>Code Auto</th>
                <th>Nom du Produit</th>
                <th>Catégorie / Origine</th>
                <th>Carton & Palette</th>
                <th>Poids par Palette</th>
                <th>Prix Vente HT</th>
                <th>Prix Revient HT</th>
                <th>Stock Total</th>
                <th>Répartition par Frigo</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(prd => {
                const prdStocks = stocks.filter(s => s.productId === prd.id);
                const totalKg = prdStocks.reduce((acc, s) => acc + s.quantityKg, 0);
                const totalPallets = prdStocks.reduce((acc, s) => acc + s.quantityPallets, 0);
                const isAlert = totalKg <= prd.minStockAlertKg;
                const isSelected = selectedProductIds.includes(prd.id);

                return (
                  <tr key={prd.id} className={isSelected ? 'bg-indigo-50/40' : ''}>
                    <td onClick={e => e.stopPropagation()} className="text-center">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedProductIds(prev => prev.includes(prd.id) ? prev.filter(id => id !== prd.id) : [...prev, prd.id]);
                        }}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="font-mono font-bold text-[#0f62fe] whitespace-nowrap">
                      {prd.code}
                    </td>
                    <td>
                      <div className="font-bold text-gray-900">{prd.name}</div>
                      {prd.description && !prd.description.toLowerCase().includes('produit principal') && <div className="text-[11px] text-gray-500 line-clamp-1">{prd.description}</div>}
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-gray-800">{prd.category}</div>
                      <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                        {prd.origin}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-gray-700">
                      <div>{prd.kgPerCarton} kg / carton</div>
                      <div className="text-gray-500">{prd.cartonsPerPallet} cartons / palette</div>
                    </td>
                    <td className="font-mono font-bold text-gray-900">
                      {prd.kgPerPallet} Kg / Pal.
                    </td>
                    <td className="font-mono font-bold text-emerald-700 bg-emerald-50/50 px-2 py-1 rounded border border-emerald-100">
                      {prd.sellingPriceHT} DH <span className="text-[10px] text-gray-500 font-normal">/kg</span>
                    </td>
                    <td className="font-mono text-gray-600">
                      {prd.unitCostHT} DH <span className="text-[10px] text-gray-500 font-normal">/kg</span>
                    </td>
                    <td>
                      <div className="font-mono">
                        <span className={`font-bold ${isAlert ? 'text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded' : 'text-gray-900'}`}>
                          {totalKg.toLocaleString()} Kg
                        </span>
                        <div className="text-[11px] text-gray-500">
                          {totalPallets} Palettes
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1 text-[11px] font-mono">
                        {frigos.map(f => {
                          const st = prdStocks.find(s => s.frigoId === f.id);
                          const kg = st ? st.quantityKg : 0;
                          const pal = st ? st.quantityPallets : 0;
                          return (
                            <div key={f.id} className="flex justify-between items-center gap-2 border-b border-gray-100 pb-0.5">
                              <span className="text-gray-600 text-[10px] truncate w-24">{f.name.split('-')[0].trim()}</span>
                              <span className={`font-semibold ${kg > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                {kg.toLocaleString()} kg ({pal} pal)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedHistoryProduct(prd)}
                          title="Consulter l'historique détaillé des mouvements de stock et BLs"
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                        >
                          <History className="w-3.5 h-3.5 text-amber-600" />
                          <span>Historique</span>
                        </button>
                        {currentUser?.role !== 'RESPONSABLE_FRIGO' && (
                          <>
                            <button
                              onClick={() => onEditProduct ? onEditProduct(prd.id) : setEditingProduct(prd)}
                              title="Éditer Produit & Prix de Vente"
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Prix / Éditer</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prd)}
                              title="Supprimer Produit du catalogue"
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-2xl rounded shadow-2xl overflow-hidden animate-in fade-in">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f62fe]" />
                Ajouter un nouveau produit avec Code Automatique
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Désignation du Produit *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Dattes Majhoul Premium Medjool"
                    value={newProd.name}
                    onChange={e => setNewProd({ ...newProd, name: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={newProd.category}
                    onChange={e => setNewProd({ ...newProd, category: e.target.value as ProductCategory })}
                    className="w-full carbon-input"
                  >
                    <option value="Dattes Locales">Dattes Locales</option>
                    <option value="Dattes Importées">Dattes Importées</option>
                    <option value="Fruits Secs">Fruits Secs</option>
                    <option value="Huiles & Condiments">Huiles & Condiments</option>
                    <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Origine / Provenance
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Maroc (Errachidia) ou Tunisie"
                    value={newProd.origin}
                    onChange={e => setNewProd({ ...newProd, origin: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Poids par Carton (Kg) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProd.kgPerCarton}
                    onChange={e => setNewProd({ ...newProd, kgPerCarton: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Cartons par Palette *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProd.cartonsPerPallet}
                    onChange={e => setNewProd({ ...newProd, cartonsPerPallet: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 font-mono">
                    Poids Dérivé par Palette (Calculé)
                  </label>
                  <div className="carbon-input bg-gray-100 font-mono font-bold text-blue-700">
                    {newProd.kgPerCarton * newProd.cartonsPerPallet} Kg / Palette
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Prix Vente HT / Kg (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={newProd.sellingPriceHT}
                    onChange={e => setNewProd({ ...newProd, sellingPriceHT: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Prix Revient HT / Kg (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={newProd.unitCostHT}
                    onChange={e => setNewProd({ ...newProd, unitCostHT: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>

              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Stock d'alerte Seuil Minimal (Kg)
                </label>
                <input
                  type="number"
                  value={newProd.minStockAlertKg}
                  onChange={e => setNewProd({ ...newProd, minStockAlertKg: Number(e.target.value) })}
                  className="w-full carbon-input font-mono"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary text-xs"
                >
                  Enregistrer & Générer Code Auto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inter-Frigos Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-lg rounded shadow-2xl overflow-hidden">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                {selectedProductIds.length > 0 ? `Transfert Groupé (${selectedProductIds.length} Produits)` : 'Transfert Inter-Frigos'}
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {selectedProductIds.length > 0 ? 'Produits Sélectionnés (Transfert Intégral)' : 'Produit à Transférer'}
                </label>
                {selectedProductIds.length > 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs font-mono font-bold text-emerald-900 space-y-1">
                    {selectedProductIds.map(id => {
                      const prd = products.find(p => p.id === id);
                      return <div key={id}>• {prd?.code} - {prd?.name}</div>;
                    })}
                  </div>
                ) : (
                  <select
                    value={transferData.productId}
                    onChange={e => setTransferData({ ...transferData, productId: e.target.value })}
                    className="w-full carbon-input font-mono"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frigo Source (Départ)</label>
                  <select
                    value={transferData.sourceFrigoId}
                    onChange={e => setTransferData({ ...transferData, sourceFrigoId: e.target.value })}
                    className="w-full carbon-input"
                  >
                    {frigos.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frigo Destination (Arrivée)</label>
                  <select
                    value={transferData.targetFrigoId}
                    onChange={e => setTransferData({ ...transferData, targetFrigoId: e.target.value })}
                    className="w-full carbon-input"
                  >
                    {frigos.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quantité (Kg)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferData.kg}
                    onChange={e => setTransferData({ ...transferData, kg: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quantité (Palettes)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferData.pallets}
                    onChange={e => setTransferData({ ...transferData, pallets: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary text-xs"
                >
                  Confirmer le Transfert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product & Custom Price Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-2xl rounded shadow-2xl overflow-hidden animate-in fade-in">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#0f62fe]" />
                Modifier le Produit & Personnaliser le Prix ({editingProduct.code})
              </h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Désignation du Produit *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as ProductCategory })}
                    className="w-full carbon-input"
                  >
                    <option value="Dattes Locales">Dattes Locales</option>
                    <option value="Dattes Importées">Dattes Importées</option>
                    <option value="Fruits Secs">Fruits Secs</option>
                    <option value="Huiles & Condiments">Huiles & Condiments</option>
                    <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Origine / Provenance
                  </label>
                  <input
                    type="text"
                    value={editingProduct.origin}
                    onChange={e => setEditingProduct({ ...editingProduct, origin: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Poids par Carton (Kg) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.kgPerCarton}
                    onChange={e => setEditingProduct({ ...editingProduct, kgPerCarton: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Cartons par Palette *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.cartonsPerPallet}
                    onChange={e => setEditingProduct({ ...editingProduct, cartonsPerPallet: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 font-mono">
                    Poids Dérivé par Palette
                  </label>
                  <div className="carbon-input bg-gray-100 font-mono font-bold text-blue-700">
                    {editingProduct.kgPerCarton * editingProduct.cartonsPerPallet} Kg / Palette
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded border border-emerald-200 col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">
                      Prix Vente HT / Kg (DH) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={editingProduct.sellingPriceHT}
                      onChange={e => setEditingProduct({ ...editingProduct, sellingPriceHT: Number(e.target.value) })}
                      className="w-full carbon-input font-mono font-bold text-emerald-900 bg-white"
                    />
                    <div className="text-[10px] text-emerald-700 mt-1">Personnalisez le prix de vente standard par Kg.</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Prix Revient HT / Kg (DH) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={editingProduct.unitCostHT}
                      onChange={e => setEditingProduct({ ...editingProduct, unitCostHT: Number(e.target.value) })}
                      className="w-full carbon-input font-mono"
                    />
                    <div className="text-[10px] text-gray-500 mt-1">Coût de revient d'achat ou d'importation.</div>
                  </div>
                </div>

              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Stock d'alerte Seuil Minimal (Kg)
                </label>
                <input
                  type="number"
                  value={editingProduct.minStockAlertKg}
                  onChange={e => setEditingProduct({ ...editingProduct, minStockAlertKg: Number(e.target.value) })}
                  className="w-full carbon-input font-mono"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary text-xs"
                >
                  Mettre à Jour Produit & Prix
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Stock History Modal */}
      <ProductStockHistoryModal
        product={selectedHistoryProduct}
        isOpen={!!selectedHistoryProduct}
        onClose={() => setSelectedHistoryProduct(null)}
      />

      {/* Price Diagnostic & Sync Modal */}
      <PriceDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        products={products}
        deliveryNotes={deliveryNotes}
        onSyncPrices={syncBLPricesWithProducts}
      />

      {/* Product Merge Modal */}
      {showProductMergeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-lg shadow-2xl border border-gray-300 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Fusionner les Produits Sélectionnés
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Sélectionnez le produit principal. Les stocks de tous les entrepôts frigos et l'historique des BLs seront cumulés sous ce produit.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Produit Principal (Destination):</label>
              {products.filter(p => selectedProductIds.includes(p.id)).map(p => (
                <label key={p.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${targetMergeProductId === p.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="targetMergeProduct" 
                      checked={targetMergeProductId === p.id} 
                      onChange={() => setTargetMergeProductId(p.id)}
                      className="text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-xs text-gray-900">{p.name}</div>
                      <div className="text-[10px] text-gray-500">{p.code} • Prix: {p.sellingPriceHT} DH/kg</div>
                    </div>
                  </div>
                  {targetMergeProductId === p.id && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">Principal</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button 
                onClick={() => setShowProductMergeModal(false)}
                className="px-4 py-2 border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (!targetMergeProductId) return;
                  mergeProducts(targetMergeProductId, selectedProductIds);
                  setSelectedProductIds([]);
                  setShowProductMergeModal(false);
                  alert('Fusion des produits réussie ! Les stocks et l\'historique ont été regroupés.');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-md"
              >
                Confirmer la Fusion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
