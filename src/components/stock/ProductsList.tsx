import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { Product, ProductCategory, ColdStorageFrigo } from '../../types';
import { findMatchingProduct } from '../../utils/productMatcher';
import { ExportButtons } from '../common/ExportButtons';
import { ProductStockHistoryModal } from './ProductStockHistoryModal';
import { PriceDiagnosticModal } from './PriceDiagnosticModal';
import { computeSynchronizedStocks, isMatchingFrigo } from '../../utils/stockReconciler';
import { 
  Plus, 
  Package, 
  Search, 
  Filter, 
  AlertTriangle, 
  ArrowRightLeft, 
  Layers, 
  Edit, 
  Trash2, 
  History, 
  Wrench, 
  RefreshCw, 
  Sparkles,
  Warehouse,
  CheckCircle2,
  TrendingUp,
  Boxes,
  DollarSign,
  Check,
  Building2,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface ProductsListProps {
  onEditProduct?: (id: string) => void;
  onNewProduct?: () => void;
  onViewProductHistory?: (id: string) => void;
}

export const ProductsList: React.FC<ProductsListProps> = ({ onEditProduct, onNewProduct, onViewProductHistory }) => {
  const { t } = useTranslation();
  const { 
    currentUser,
    products, 
    stocks, 
    frigos, 
    deliveryNotes, 
    purchaseInvoices,
    inventoryCounts,
    stockMovements,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    transferStock, 
    syncBLPricesWithProducts,
    mergeProducts,
    recalculateAndSyncAllStocks
  } = useERP();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedFrigoFilter, setSelectedFrigoFilter] = useState<string | 'ALL'>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Product Selection & Merge State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [targetMergeProductId, setTargetMergeProductId] = useState<string>('');
  const [showProductMergeModal, setShowProductMergeModal] = useState<boolean>(false);

  // =========================================================================
  // 1. DYNAMIC & SYNCHRONIZED MULTI-FRIGO STOCK COMPUTATION
  // =========================================================================
  const {
    productStocks,
    totalConsolidatedKg,
    totalConsolidatedPallets,
    totalConsolidatedValuationCostHT,
    totalConsolidatedValuationSaleHT,
    lowStockCount,
    outOfStockCount,
  } = useMemo(() => {
    return computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices,
      deliveryNotes,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: selectedFrigoFilter
    });
  }, [products, frigos, stocks, purchaseInvoices, deliveryNotes, inventoryCounts, stockMovements, selectedFrigoFilter]);

  // Per-frigo stock totals for switcher badges
  const frigoQuickStats = useMemo(() => {
    return frigos.map(f => {
      const frigoProductTotals = computeSynchronizedStocks({
        products,
        frigos,
        stocks,
        purchaseInvoices,
        deliveryNotes,
        inventoryCounts,
        stockMovements,
        selectedFrigoId: f.id
      });
      return {
        ...f,
        totalKg: frigoProductTotals.totalConsolidatedKg,
        totalPallets: frigoProductTotals.totalConsolidatedPallets,
      };
    });
  }, [products, frigos, stocks, purchaseInvoices, deliveryNotes, inventoryCounts, stockMovements]);

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

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (recalculateAndSyncAllStocks) {
        await recalculateAndSyncAllStocks();
      }
      alert('✓ Synchronisation et recalcul intégral des stocks multi-frigos effectués avec succès !');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la synchronisation.');
    } finally {
      setIsSyncing(false);
    }
  };

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
      const prdStock = productStocks.find(p => p.productId === prdId);
      const sourceFrigoInfo = prdStock?.frigoBreakdown.find(fb => fb.frigoId === transferData.sourceFrigoId);
      const kgToMove = selectedProductIds.length > 0 ? (sourceFrigoInfo?.quantityKg || 0) : Number(transferData.kg);
      const palletsToMove = selectedProductIds.length > 0 ? (sourceFrigoInfo?.quantityPallets || 0) : Number(transferData.pallets);

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

  // Filtered Products List
  const filteredProductStocks = useMemo(() => {
    return productStocks.filter(p => {
      // Category filter
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

      // Status filter
      if (stockStatusFilter === 'IN_STOCK' && p.status !== 'DISPONIBLE') return false;
      if (stockStatusFilter === 'LOW_STOCK' && p.status !== 'STOCK_FAIBLE') return false;
      if (stockStatusFilter === 'OUT_OF_STOCK' && p.status !== 'RUPTURE') return false;

      // Text search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.productName.toLowerCase().includes(term);
        const matchesCode = p.productCode.toLowerCase().includes(term);
        const matchesOrigin = p.origin.toLowerCase().includes(term);
        const matchesCat = p.category.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesOrigin && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [productStocks, categoryFilter, stockStatusFilter, searchTerm]);

  // Active Frigo Label
  const activeFrigoObj = useMemo(() => {
    if (selectedFrigoFilter === 'ALL') return null;
    return frigos.find(f => f.id === selectedFrigoFilter) || null;
  }, [frigos, selectedFrigoFilter]);

  const potentialGrossMarginHT = totalConsolidatedValuationSaleHT - totalConsolidatedValuationCostHT;
  const marginPercent = totalConsolidatedValuationCostHT > 0 
    ? Math.round((potentialGrossMarginHT / totalConsolidatedValuationCostHT) * 100) 
    : 0;

  return (
    <div className="space-y-5 animate-in fade-in" id="products-stock-page">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & GLOBAL ACTIONS                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        
        {/* Title */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-[#0f62fe] rounded-xl border border-blue-200 shadow-xs shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">
                Catalogue Produits & État des Stocks Multi-Frigos
              </h1>
              {activeFrigoObj && (
                <span className="text-xs font-mono font-bold text-[#0f62fe] px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                  {activeFrigoObj.name}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Synchronisation temps réel (Achats + BLs + Inventaires) • Prix HT & Coûts de Revient • Palettes & Emplacements
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Synchronize Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Recalculer et synchroniser immédiatement tous les stocks avec les arrivages d'achat et les BLs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser les Stocks'}</span>
          </button>

          {/* Diagnostic Button */}
          {currentUser?.role !== 'RESPONSABLE_FRIGO' && (
            <button
              onClick={() => setShowDiagnosticModal(true)}
              className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-bold transition-all border shadow-xs cursor-pointer ${
                outdatedBLCount > 0 
                  ? 'bg-amber-500 hover:bg-amber-600 text-black border-amber-400 animate-pulse' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
              title="Outil de Diagnostic Tarifaire & Synchronisation des prix BL avec le catalogue"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-800" />
              <span>Diagnostic Prix</span>
              {outdatedBLCount > 0 && (
                <span className="bg-rose-600 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full ml-0.5">
                  {outdatedBLCount}
                </span>
              )}
            </button>
          )}

          {/* Export Buttons */}
          <ExportButtons 
            filename="Catalogue_Produits_Et_Stock"
            title={`CATALOGUE PRODUITS & ÉTAT DU STOCK - ${activeFrigoObj ? activeFrigoObj.name.toUpperCase() : 'TOUS LES FRIGOS'}`}
            excelData={filteredProductStocks.map(p => ({
              'Code SKU': p.productCode,
              'Désignation Produit': p.productName,
              'Catégorie': p.category,
              'Origine': p.origin,
              'Stock Total (Kg)': p.totalStockKg,
              'Stock Total (Palettes)': p.totalStockPallets,
              'Stock Total (Colis)': p.totalStockCartons,
              'Prix Vente HT (DH/Kg)': p.sellingPriceHT,
              'Prix Revient HT (DH/Kg)': p.unitCostHT,
              'Valeur Coût HT (DH)': p.totalValuationCostHT,
              'Valeur Marchande HT (DH)': p.totalValuationSaleHT,
              'Statut Stock': p.status,
            }))}
            pdfElementId="products-stock-page"
          />

          {/* Transfer Button */}
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-3 py-2 rounded-lg transition shadow-xs cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfert Inter-Frigos</span>
          </button>

          {/* New Product */}
          {currentUser?.role !== 'RESPONSABLE_FRIGO' && (
            <button
              onClick={() => onNewProduct ? onNewProduct() : setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-[#0f62fe] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit</span>
            </button>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME SYNCHRONIZED KPI CARDS                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: Total Stock */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs hover:border-blue-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs font-semibold">
              <span className="truncate">Stock Physique</span>
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0f62fe] shrink-0" />
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-gray-900">
                {(totalConsolidatedKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-600">T</span>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs font-mono">
            <span className="font-bold text-emerald-700">{totalConsolidatedKg.toLocaleString()} Kg</span>
            <span className="text-purple-700 font-bold">{totalConsolidatedPallets} Pal.</span>
          </div>
        </div>

        {/* Card 2: Valuation Cost HT */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs hover:border-purple-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs font-semibold">
              <span className="truncate">Valorisation Achat</span>
              <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-black font-mono text-purple-900 truncate">
                {totalConsolidatedValuationCostHT.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-600">DH</span>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-gray-100 text-[10px] sm:text-xs text-gray-500 font-mono truncate">
            Coût de revient réel
          </div>
        </div>

        {/* Card 3: Market Sale Valuation HT */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs font-semibold">
              <span className="truncate">Valeur Vente (HT)</span>
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-black font-mono text-emerald-900 truncate">
                {totalConsolidatedValuationSaleHT.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-600">DH</span>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs font-mono">
            <span className="text-emerald-700 font-bold">+{potentialGrossMarginHT.toLocaleString()} DH</span>
            <span className="text-gray-500 font-semibold">({marginPercent}%)</span>
          </div>
        </div>

        {/* Card 4: Stock Alerts */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-amber-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
              <span>Disponibilité & Alertes</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${outOfStockCount > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                {outOfStockCount}
              </span>
              <span className="text-xs text-rose-600 font-semibold">Rupture(s)</span>
              <span className="text-gray-300">•</span>
              <span className="text-2xl font-black font-mono text-amber-600">
                {lowStockCount}
              </span>
              <span className="text-xs text-amber-600 font-semibold">Faible</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 font-mono">
            {products.length - outOfStockCount - lowStockCount} références disponibles
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. HERO FRIGO SWITCHER STRIP (FILTRE PAR ENTREPÔT)                        */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-[#0f62fe]" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Filtrer l'état des stocks par Entrepôt Frigorifique :
            </h2>
          </div>
          {selectedFrigoFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedFrigoFilter('ALL')}
              className="text-[11px] font-bold text-[#0f62fe] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Afficher Tous les Frigos</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          
          {/* All Frigos Tab Button */}
          <button
            onClick={() => setSelectedFrigoFilter('ALL')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 cursor-pointer ${
              selectedFrigoFilter === 'ALL'
                ? 'bg-blue-50 border-[#0f62fe] text-[#0f62fe] shadow-xs ring-2 ring-blue-500/20'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏢 Tous les Frigos</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-900">
              {(totalConsolidatedKg / 1000).toFixed(1)} T
            </span>
          </button>

          {/* Individual Frigo Tabs */}
          {frigoQuickStats.map(f => {
            const isSelected = selectedFrigoFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFrigoFilter(f.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-[#0f62fe] text-[#0f62fe] shadow-xs font-bold ring-2 ring-blue-500/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-800">
                  {f.code}
                </span>
                <span>🏭 {f.name}</span>
                <span className="font-mono text-[10px] font-bold text-emerald-700">
                  {(f.totalKg / 1000).toFixed(1)} T ({f.totalPallets} pal)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SEARCH & FILTER TOOLBAR                                                */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par Code, Nom, Origine..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category & Status Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:border-[#0f62fe]"
          >
            <option value="ALL">Toutes les catégories</option>
            <option value="Dattes Locales">Dattes Locales</option>
            <option value="Dattes Importées">Dattes Importées</option>
            <option value="Fruits Secs">Fruits Secs</option>
            <option value="Huiles & Condiments">Huiles & Condiments</option>
            <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
          </select>

          {/* Stock Status */}
          <select
            value={stockStatusFilter}
            onChange={e => setStockStatusFilter(e.target.value as any)}
            className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:border-[#0f62fe]"
          >
            <option value="ALL">Tous les statuts stock</option>
            <option value="IN_STOCK">✓ En Stock Disponible</option>
            <option value="LOW_STOCK">⚠️ Stock Faible</option>
            <option value="OUT_OF_STOCK">🔴 En Rupture (0 Kg)</option>
          </select>

          {/* Grouped Actions if checked */}
          {selectedProductIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-xs cursor-pointer animate-pulse"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfert ({selectedProductIds.length})
              </button>

              {selectedProductIds.length >= 2 && (
                <button
                  onClick={() => {
                    setTargetMergeProductId(selectedProductIds[0]);
                    setShowProductMergeModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Fusionner ({selectedProductIds.length})
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PRODUCTS & SYNCHRONIZED STOCKS TABLE                                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white text-xs">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <span>Catalogue des Produits ({filteredProductStocks.length} référence{filteredProductStocks.length > 1 ? 's' : ''})</span>
            {selectedFrigoFilter !== 'ALL' && activeFrigoObj && (
              <span className="text-[11px] font-normal text-gray-500">
                • Stocks dans {activeFrigoObj.name}
              </span>
            )}
          </div>
        </div>

        {/* Desktop & Tablet Full Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="carbon-table text-xs">
            <thead>
              <tr>
                <th className="w-8 text-center">
                  <input 
                    type="checkbox"
                    checked={selectedProductIds.length > 0 && selectedProductIds.length === filteredProductStocks.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedProductIds(filteredProductStocks.map(p => p.productId));
                      else setSelectedProductIds([]);
                    }}
                    className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th>Code SKU</th>
                <th>Nom du Produit</th>
                <th>Catégorie / Origine</th>
                <th className="text-right">Stock Net Réel</th>
                <th className="text-right">Palettes & Colis</th>
                <th>Emplacements / Frigos</th>
                <th className="text-right">Prix Vente HT</th>
                <th className="text-right">Prix Revient HT</th>
                <th className="text-right">Valeur Stock HT</th>
                <th className="text-center">Statut</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProductStocks.map(p => {
                const rawProduct = products.find(prod => prod.id === p.productId || prod.code === p.productCode);
                const isSelected = selectedProductIds.includes(p.productId);

                return (
                  <tr key={p.productId} className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                    
                    {/* Checkbox */}
                    <td onClick={e => e.stopPropagation()} className="text-center">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedProductIds(prev => prev.includes(p.productId) ? prev.filter(id => id !== p.productId) : [...prev, p.productId]);
                        }}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* SKU */}
                    <td className="font-mono font-bold text-[#0f62fe] whitespace-nowrap">
                      {p.productCode}
                    </td>

                    {/* Product Name */}
                    <td>
                      <div className="font-bold text-gray-900">{p.productName}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {p.kgPerCarton} kg/colis • {p.kgPerPallet} kg/pal
                      </div>
                    </td>

                    {/* Category & Origin */}
                    <td>
                      <div className="font-semibold text-gray-800">{p.category}</div>
                      <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.2 rounded font-mono">
                        {p.origin || 'Maroc'}
                      </span>
                    </td>

                    {/* Stock Net Réel (Kg) */}
                    <td className="text-right font-mono whitespace-nowrap">
                      <span className={`text-sm font-black ${
                        p.status === 'RUPTURE' ? 'text-red-600' :
                        p.status === 'STOCK_FAIBLE' ? 'text-amber-600' : 'text-emerald-700'
                      }`}>
                        {p.totalStockKg.toLocaleString()} Kg
                      </span>
                    </td>

                    {/* Palettes & Colis */}
                    <td className="text-right font-mono whitespace-nowrap">
                      <div className="font-bold text-purple-700">{p.totalStockPallets} Pal.</div>
                      <div className="text-[10px] text-gray-500">{p.totalStockCartons.toLocaleString()} Colis</div>
                    </td>

                    {/* Breakdown per Frigo (Active Stock Only) */}
                    <td>
                      <div className="space-y-1.5 text-[11px] font-mono min-w-[170px]">
                        {p.frigoBreakdown.filter(fb => fb.quantityKg > 0).map(fb => (
                          <div key={fb.frigoId} className="flex items-center justify-between gap-2 bg-emerald-50/80 border border-emerald-200 px-2 py-1 rounded-lg">
                            <span className="text-emerald-950 font-bold truncate max-w-[110px]" title={fb.frigoName}>
                              🏭 {fb.frigoName.split('-')[0].trim()}
                            </span>
                            <span className="font-extrabold text-emerald-700 whitespace-nowrap">
                              {fb.quantityKg.toLocaleString()} kg <span className="text-[10px] text-emerald-800/80 font-normal">({fb.quantityPallets} pal)</span>
                            </span>
                          </div>
                        ))}
                        {p.frigoBreakdown.every(fb => fb.quantityKg === 0) && (
                          <span className="text-gray-400 italic text-[10px] block py-1">
                            — Aucun stock frigo
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Selling Price HT */}
                    <td className="text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {p.sellingPriceHT} DH/kg
                    </td>

                    {/* Landed Cost HT */}
                    <td className="text-right font-mono text-gray-700 whitespace-nowrap">
                      {p.unitCostHT} DH/kg
                    </td>

                    {/* Valuation HT */}
                    <td className="text-right font-mono whitespace-nowrap">
                      <div className="font-bold text-purple-900">{p.totalValuationCostHT.toLocaleString()} DH</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">Vente: {p.totalValuationSaleHT.toLocaleString()} DH</div>
                    </td>

                    {/* Status Badge */}
                    <td className="text-center whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 font-mono font-bold rounded ${
                        p.status === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        p.status === 'STOCK_FAIBLE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {p.status === 'DISPONIBLE' ? '✓ EN STOCK' : p.status === 'STOCK_FAIBLE' ? 'STOCK FAIBLE' : 'RUPTURE'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        
                        {/* History Button */}
                        {rawProduct && (
                          <button
                            onClick={() => onViewProductHistory ? onViewProductHistory(rawProduct.id) : setSelectedHistoryProduct(rawProduct)}
                            title="Historique chronologique des mouvements (Achats, BLs, etc.)"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Button */}
                        {currentUser?.role !== 'RESPONSABLE_FRIGO' && rawProduct && (
                          <>
                            <button
                              onClick={() => onEditProduct ? onEditProduct(rawProduct.id) : setEditingProduct(rawProduct)}
                              title="Modifier le Produit & les Prix"
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteProduct(rawProduct)}
                              title="Supprimer ce produit"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer Totals */}
            <tfoot>
              <tr className="bg-gray-100 font-mono font-bold text-gray-900 border-t-2 border-gray-300">
                <td colSpan={4} className="text-right font-bold uppercase text-[11px]">
                  Totaux Consolidés :
                </td>
                <td className="text-right font-black text-emerald-700 text-sm">
                  {totalConsolidatedKg.toLocaleString()} Kg
                </td>
                <td className="text-right font-bold text-purple-700 text-xs">
                  {totalConsolidatedPallets} Pal.
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right font-bold text-purple-900 text-xs">
                  {totalConsolidatedValuationCostHT.toLocaleString()} DH
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredProductStocks.map(p => {
            const rawProduct = products.find(prod => prod.id === p.productId || prod.code === p.productCode);
            const isSelected = selectedProductIds.includes(p.productId);

            return (
              <div key={p.productId} className={`p-3.5 space-y-2.5 transition-colors ${isSelected ? 'bg-indigo-50/60' : 'bg-white'}`}>
                {/* Top Row: SKU + Category + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedProductIds(prev => prev.includes(p.productId) ? prev.filter(id => id !== p.productId) : [...prev, p.productId]);
                      }}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                    />
                    <span className="font-mono font-bold text-xs text-[#0f62fe] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {p.productCode}
                    </span>
                    <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium truncate max-w-[130px]">
                      {p.category}
                    </span>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 font-mono font-bold rounded shrink-0 ${
                    p.status === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    p.status === 'STOCK_FAIBLE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {p.status === 'DISPONIBLE' ? '✓ EN STOCK' : p.status === 'STOCK_FAIBLE' ? 'FAIBLE' : 'RUPTURE'}
                  </span>
                </div>

                {/* Product Name & Packaging Specs */}
                <div>
                  <div className="font-bold text-sm text-gray-900 leading-snug">{p.productName}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {p.origin || 'Origine Locale'} • {p.kgPerCarton} kg/colis • {p.kgPerPallet} kg/pal
                  </div>
                </div>

                {/* Metrics 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Stock Physique</span>
                    <span className={`text-base font-black ${
                      p.status === 'RUPTURE' ? 'text-red-600' :
                      p.status === 'STOCK_FAIBLE' ? 'text-amber-600' : 'text-emerald-700'
                    }`}>
                      {p.totalStockKg.toLocaleString()} Kg
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Palettes / Colis</span>
                    <span className="font-bold text-purple-800 text-sm">
                      {p.totalStockPallets} Pal. <span className="text-gray-500 text-[10px] font-normal">({p.totalStockCartons} C.)</span>
                    </span>
                  </div>

                  <div className="pt-1 border-t border-gray-200/60">
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Prix Vente HT</span>
                    <span className="font-bold text-emerald-800">{p.sellingPriceHT} DH/kg</span>
                  </div>

                  <div className="pt-1 border-t border-gray-200/60">
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Valeur Coût HT</span>
                    <span className="font-bold text-purple-900">{p.totalValuationCostHT.toLocaleString()} DH</span>
                  </div>
                </div>

                {/* Frigo Distribution Mini Pill */}
                {p.frigoBreakdown.length > 0 && (
                  <div className="text-[10px] font-mono text-gray-600 space-y-1 pt-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Emplacements Frigos :</span>
                    <div className="flex flex-wrap gap-1">
                      {p.frigoBreakdown.filter(fb => fb.quantityKg > 0).map(fb => (
                        <span key={fb.frigoId} className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded font-semibold text-[10px]">
                          🏭 {fb.frigoName.split('-')[0].trim()}: <b>{fb.quantityKg.toLocaleString()} kg</b> ({fb.quantityPallets}p)
                        </span>
                      ))}
                      {p.frigoBreakdown.every(fb => fb.quantityKg === 0) && (
                        <span className="text-gray-400 italic text-[10px]">Aucun stock en frigo</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Touch Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  {rawProduct && (
                    <button
                      onClick={() => onViewProductHistory ? onViewProductHistory(rawProduct.id) : setSelectedHistoryProduct(rawProduct)}
                      className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-[#0f62fe] border border-blue-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                    >
                      <History className="w-4 h-4" />
                      <span>Historique</span>
                    </button>
                  )}

                  {currentUser?.role !== 'RESPONSABLE_FRIGO' && rawProduct && (
                    <>
                      <button
                        onClick={() => onEditProduct ? onEditProduct(rawProduct.id) : setEditingProduct(rawProduct)}
                        className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                      >
                        <Edit className="w-4 h-4 text-amber-700" />
                        <span>Modifier</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(rawProduct)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer touch-manipulation"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Mobile Consolidated Totals Card */}
          <div className="p-4 bg-gray-100 border-t-2 border-gray-300 space-y-2 text-xs font-mono">
            <div className="font-bold uppercase text-[11px] text-gray-700">Totaux Consolidés Catalogue :</div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Poids Total :</span>
              <span className="font-black text-emerald-800 text-sm">{totalConsolidatedKg.toLocaleString()} Kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Palettes :</span>
              <span className="font-bold text-purple-800">{totalConsolidatedPallets} Palettes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Valeur Coût HT :</span>
              <span className="font-bold text-purple-900">{totalConsolidatedValuationCostHT.toLocaleString()} DH</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODALS (Add, Edit, Transfer, Diagnostic, Merge, History)               */}
      {/* ========================================================================= */}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-200">
              <h3 className="font-bold text-sm font-mono text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f62fe]" />
                <span>Ajouter un nouveau produit (Code Automatique)</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Désignation du Produit *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Bel7a 3Kg"
                    value={newProd.name}
                    onChange={e => setNewProd({ ...newProd, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Catégorie *</label>
                  <select
                    value={newProd.category}
                    onChange={e => setNewProd({ ...newProd, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  >
                    <option value="Dattes Locales">Dattes Locales</option>
                    <option value="Dattes Importées">Dattes Importées</option>
                    <option value="Fruits Secs">Fruits Secs</option>
                    <option value="Huiles & Condiments">Huiles & Condiments</option>
                    <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Origine / Provenance</label>
                  <input
                    type="text"
                    placeholder="ex: Maroc, Algérie, Tunisie..."
                    value={newProd.origin}
                    onChange={e => setNewProd({ ...newProd, origin: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Poids par Carton (Kg) *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={newProd.kgPerCarton}
                    onChange={e => setNewProd({ ...newProd, kgPerCarton: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cartons par Palette *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProd.cartonsPerPallet}
                    onChange={e => setNewProd({ ...newProd, cartonsPerPallet: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Prix Vente HT / Kg (DH) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={newProd.sellingPriceHT}
                    onChange={e => setNewProd({ ...newProd, sellingPriceHT: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Prix Revient HT / Kg (DH)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newProd.unitCostHT}
                    onChange={e => setNewProd({ ...newProd, unitCostHT: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono text-gray-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Seuil Alerte Stock (Kg)</label>
                  <input
                    type="number"
                    value={newProd.minStockAlertKg}
                    onChange={e => setNewProd({ ...newProd, minStockAlertKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
                  />
                </div>

              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f62fe] text-white rounded-lg font-semibold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Enregistrer le Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-200">
              <h3 className="font-bold text-sm font-mono text-gray-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#0f62fe]" />
                <span>Modifier le Produit ({editingProduct.code})</span>
              </h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Désignation du Produit *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Catégorie *</label>
                  <select
                    value={editingProduct.category}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  >
                    <option value="Dattes Locales">Dattes Locales</option>
                    <option value="Dattes Importées">Dattes Importées</option>
                    <option value="Fruits Secs">Fruits Secs</option>
                    <option value="Huiles & Condiments">Huiles & Condiments</option>
                    <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Origine / Provenance</label>
                  <input
                    type="text"
                    value={editingProduct.origin}
                    onChange={e => setEditingProduct({ ...editingProduct, origin: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Poids par Carton (Kg) *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={editingProduct.kgPerCarton}
                    onChange={e => setEditingProduct({ ...editingProduct, kgPerCarton: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cartons par Palette *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.cartonsPerPallet}
                    onChange={e => setEditingProduct({ ...editingProduct, cartonsPerPallet: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-900 mb-1">Prix Vente HT / Kg (DH) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={editingProduct.sellingPriceHT}
                    onChange={e => setEditingProduct({ ...editingProduct, sellingPriceHT: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-lg focus:bg-white focus:outline-none focus:border-emerald-600 font-mono font-bold text-emerald-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Prix Revient HT / Kg (DH)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingProduct.unitCostHT}
                    onChange={e => setEditingProduct({ ...editingProduct, unitCostHT: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono text-gray-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Seuil Alerte Stock (Kg)</label>
                  <input
                    type="number"
                    value={editingProduct.minStockAlertKg}
                    onChange={e => setEditingProduct({ ...editingProduct, minStockAlertKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
                  />
                </div>

              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f62fe] text-white rounded-lg font-semibold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Mettre à Jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inter-Frigos Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-200">
              <h3 className="font-bold text-sm font-mono text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>{selectedProductIds.length > 0 ? `Transfert Groupé (${selectedProductIds.length} Produits)` : 'Transfert Inter-Frigos'}</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {selectedProductIds.length > 0 ? 'Produits Sélectionnés (Transfert Intégral)' : 'Produit à Transférer'}
                </label>
                {selectedProductIds.length > 0 ? (
                  <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg text-xs font-mono font-bold text-indigo-900 space-y-1">
                    {selectedProductIds.map(id => {
                      const prd = products.find(p => p.id === id);
                      return <div key={id}>• {prd?.code} - {prd?.name}</div>;
                    })}
                  </div>
                ) : (
                  <select
                    value={transferData.productId}
                    onChange={e => setTransferData({ ...transferData, productId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Frigo Source (Départ)</label>
                  <select
                    value={transferData.sourceFrigoId}
                    onChange={e => setTransferData({ ...transferData, sourceFrigoId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  >
                    {frigos.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Frigo Destination (Arrivée)</label>
                  <select
                    value={transferData.targetFrigoId}
                    onChange={e => setTransferData({ ...transferData, targetFrigoId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  >
                    {frigos.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Quantité (Kg)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferData.kg}
                    onChange={e => setTransferData({ ...transferData, kg: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Quantité (Palettes)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferData.pallets}
                    onChange={e => setTransferData({ ...transferData, pallets: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Confirmer le Transfert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Stock History Modal */}
      {selectedHistoryProduct && (
        <ProductStockHistoryModal
          product={selectedHistoryProduct}
          isOpen={!!selectedHistoryProduct}
          onClose={() => setSelectedHistoryProduct(null)}
        />
      )}

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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-xl shadow-2xl border border-gray-300 p-5 space-y-3.5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Fusionner les Produits Sélectionnés</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Sélectionnez le produit principal. Les stocks de tous les entrepôts frigos et l'historique des BLs seront cumulés sous ce produit.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-bold text-gray-700">Produit Principal (Destination):</label>
              {products.filter(p => selectedProductIds.includes(p.id)).map(p => (
                <label key={p.id} className={`flex items-center justify-between p-2.5 border rounded-lg cursor-pointer transition-colors ${targetMergeProductId === p.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
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
                      <div className="text-[10px] text-gray-500 font-mono">{p.code} • Prix: {p.sellingPriceHT} DH/kg</div>
                    </div>
                  </div>
                  {targetMergeProductId === p.id && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">Principal</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button 
                onClick={() => setShowProductMergeModal(false)}
                className="px-3.5 py-1.5 border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
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
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
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
