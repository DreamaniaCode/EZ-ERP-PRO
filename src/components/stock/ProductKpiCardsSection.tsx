import React, { useState } from 'react';
import { ProductAccumulationSummary } from '../../utils/frigoStockMovements';
import { Product } from '../../types';
import { 
  Package, 
  Layers, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History, 
  Check, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Boxes,
  Eye,
  LayoutGrid,
  LayoutList,
  Sparkles,
  ChevronRight,
  Filter,
  BarChart2
} from 'lucide-react';

interface ProductKpiCardsSectionProps {
  productSummaries: ProductAccumulationSummary[];
  selectedProductId: string | 'ALL';
  onSelectProduct: (productId: string | 'ALL') => void;
  onOpenProductHistory?: (product: Product) => void;
  products: Product[];
  warehouseName?: string;
  onlyInStock?: boolean;
  onToggleOnlyInStock?: (onlyInStock: boolean) => void;
}

const PRODUCT_PALETTE = [
  { badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
  { badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
  { badgeBg: 'bg-amber-100', badgeText: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  { badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  { badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  { badgeBg: 'bg-rose-100', badgeText: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' }
];

export const ProductKpiCardsSection: React.FC<ProductKpiCardsSectionProps> = ({
  productSummaries,
  selectedProductId,
  onSelectProduct,
  onOpenProductHistory,
  products,
  warehouseName = 'Tous les Frigos',
  onlyInStock: externalOnlyInStock,
  onToggleOnlyInStock
}) => {
  const [internalOnlyInStock, setInternalOnlyInStock] = useState<boolean>(true);
  const onlyInStock = externalOnlyInStock !== undefined ? externalOnlyInStock : internalOnlyInStock;

  // View mode: 'SYNTHESIS' (compact clean pills + executive metrics) vs 'GRID' (expanded cards)
  const [viewMode, setViewMode] = useState<'SYNTHESIS' | 'GRID'>(() => {
    try {
      const saved = localStorage.getItem('erp_frigo_view_mode');
      return (saved === 'GRID' || saved === 'SYNTHESIS') ? saved : 'SYNTHESIS';
    } catch {
      return 'SYNTHESIS';
    }
  });

  const handleSetViewMode = (mode: 'SYNTHESIS' | 'GRID') => {
    setViewMode(mode);
    try {
      localStorage.setItem('erp_frigo_view_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleOnlyInStock = () => {
    const nextVal = !onlyInStock;
    if (onToggleOnlyInStock) {
      onToggleOnlyInStock(nextVal);
    } else {
      setInternalOnlyInStock(nextVal);
    }
  };

  const inStockSummaries = productSummaries.filter(p => p.currentStockKg > 0);
  const displayedSummaries = onlyInStock ? inStockSummaries : productSummaries;

  // Global aggregate metrics across displayed products
  const globalTotalStockKg = displayedSummaries.reduce((sum, p) => sum + p.currentStockKg, 0);
  const globalTotalPallets = displayedSummaries.reduce((sum, p) => sum + p.currentStockPallets, 0);
  const globalTotalCartons = displayedSummaries.reduce((sum, p) => sum + p.currentStockCartons, 0);
  const globalTotalEntriesKg = displayedSummaries.reduce((sum, p) => sum + p.totalEntriesKg, 0);
  const globalTotalExitsKg = displayedSummaries.reduce((sum, p) => sum + p.totalExitsKg, 0);
  const globalTotalValuationCostHT = displayedSummaries.reduce((sum, p) => sum + p.totalValuationCostHT, 0);
  const globalTotalValuationSaleHT = displayedSummaries.reduce((sum, p) => sum + p.totalValuationSaleHT, 0);

  const selectedSummary = productSummaries.find(p => p.productId === selectedProductId);
  const selectedProductRaw = selectedSummary ? products.find(p => p.id === selectedSummary.productId) : null;

  // Effective metrics currently displayed (either for the single selected product or global consolidated)
  const effectiveStockKg = selectedSummary ? selectedSummary.currentStockKg : globalTotalStockKg;
  const effectivePallets = selectedSummary ? selectedSummary.currentStockPallets : globalTotalPallets;
  const effectiveCartons = selectedSummary ? selectedSummary.currentStockCartons : globalTotalCartons;
  const effectiveEntriesKg = selectedSummary ? selectedSummary.totalEntriesKg : globalTotalEntriesKg;
  const effectiveExitsKg = selectedSummary ? selectedSummary.totalExitsKg : globalTotalExitsKg;
  const effectiveValuationCostHT = selectedSummary ? selectedSummary.totalValuationCostHT : globalTotalValuationCostHT;
  const effectiveValuationSaleHT = selectedSummary ? selectedSummary.totalValuationSaleHT : globalTotalValuationSaleHT;

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar with Title & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-[#0f62fe] rounded-lg border border-blue-200">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>Situation & Répartition par Produit</span>
              <span className="text-[11px] font-mono text-[#0f62fe] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                {warehouseName}
              </span>
            </h2>
            <p className="text-[11px] text-gray-500 font-mono">
              {onlyInStock 
                ? `${inStockSummaries.length} référence${inStockSummaries.length > 1 ? 's' : ''} active(s) en stock`
                : `${productSummaries.length} référence(s) au catalogue`}
            </p>
          </div>
        </div>

        {/* Action Controls: View Switcher, Filter & Quick Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Product Filter Pill (if any) */}
          {selectedProductId !== 'ALL' && selectedSummary && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg text-xs animate-in fade-in">
              <span className="text-blue-900 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0f62fe] animate-pulse"></span>
                <span>Filtré sur : <strong>{selectedSummary.productName}</strong></span>
              </span>
              <button
                onClick={() => onSelectProduct('ALL')}
                className="text-gray-500 hover:text-red-600 p-0.5 rounded hover:bg-blue-100 transition-colors"
                title="Afficher tous les produits"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* In-Stock Filter Toggle */}
          <button
            type="button"
            onClick={handleToggleOnlyInStock}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              onlyInStock
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
            title="Basculer entre afficher uniquement les produits en stock ou tous les produits"
          >
            <span className={`w-2 h-2 rounded-full ${onlyInStock ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            <span>{onlyInStock ? `En Stock (${inStockSummaries.length})` : `Tous (${productSummaries.length})`}</span>
          </button>

          {/* View Mode Toggle: SYNTHESIS vs GRID */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('SYNTHESIS')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold transition-all ${
                viewMode === 'SYNTHESIS'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Affichage compact & bandeau distinct (recommandé pour éviter trop de cartes)"
            >
              <LayoutList className="w-3.5 h-3.5 text-[#0f62fe]" />
              <span className="hidden sm:inline">Vue Synthétique</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode('GRID')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Affichage en cartes individuelles étendues"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-gray-600" />
              <span className="hidden sm:inline">Grille de Cartes</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Strip (4 High-Contrast Compact Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Stock Disponible */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-blue-400 transition-colors">
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <span>Stock Quai Disponible</span>
              {selectedSummary && <span className="text-[#0f62fe] font-bold">• 1 Réf</span>}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono tracking-tight text-gray-900">
                {effectiveStockKg.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-gray-500">Kg</span>
            </div>
            <div className="text-[11px] font-mono text-gray-600 flex items-center gap-2">
              <span><b>{effectivePallets.toLocaleString()}</b> Palettes</span>
              <span>•</span>
              <span><b>{effectiveCartons.toLocaleString()}</b> Colis</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-[#0f62fe] rounded-xl border border-blue-200 shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Flux Entrées & Sorties */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-colors">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
            <span>Flux Quai & Rotation</span>
            <span className="text-emerald-700 font-bold">
              Solde: +{(effectiveEntriesKg - effectiveExitsKg).toLocaleString()} Kg
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t border-gray-100 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="text-[9px] text-gray-500 font-normal uppercase">Entrées</div>
                <div>+{effectiveEntriesKg.toLocaleString()} Kg</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-rose-700 font-bold">
              <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <div className="text-[9px] text-gray-500 font-normal uppercase">Sorties</div>
                <div>-{effectiveExitsKg.toLocaleString()} Kg</div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Valorisation Financière */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between hover:border-purple-300 transition-colors">
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700">
              Valorisation Financière (HT)
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono tracking-tight text-purple-900">
                {effectiveValuationCostHT.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-purple-700">DH</span>
            </div>
            <div className="text-[11px] font-mono text-gray-600">
              <span>Potentiel Vente : <b>{effectiveValuationSaleHT.toLocaleString()} DH</b></span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Références & Statut */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between hover:border-emerald-300 transition-colors">
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
              {selectedSummary ? 'Conditionnement & Prix' : 'Couverture Catalogue'}
            </div>
            {selectedSummary ? (
              <>
                <div className="text-sm font-bold font-mono text-gray-900 truncate">
                  {selectedSummary.kgPerCarton} kg/colis • {selectedSummary.unitCostHT} DH/kg
                </div>
                <div className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Statut : {selectedSummary.currentStockKg > 0 ? 'En Stock' : 'Épuisé'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black font-mono tracking-tight text-gray-900">
                  {inStockSummaries.length} / {productSummaries.length}
                </div>
                <div className="text-[11px] font-mono text-gray-600">
                  <span>Références actives en quai</span>
                </div>
              </>
            )}
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: SYNTHESIS (Sélecteur de Produits Distinct & Compact - PAR DÉFAUT) */}
      {/* ========================================================================= */}
      {viewMode === 'SYNTHESIS' && (
        <div className="space-y-3">
          {/* Distinct Product Selection Strip */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#0f62fe]" />
                Sélection Rapide du Produit (Cliquez pour isoler les mouvements) :
              </span>
              <span className="text-gray-400 font-mono text-[11px]">
                {displayedSummaries.length} référence{displayedSummaries.length > 1 ? 's' : ''} disponible{displayedSummaries.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Horizontal Segmented Grid of Distinct Product Capsules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              
              {/* Master Button: All Products */}
              <button
                type="button"
                onClick={() => onSelectProduct('ALL')}
                className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 select-none cursor-pointer ${
                  selectedProductId === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    selectedProductId === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    TOUS
                  </span>
                  <span className="font-bold text-xs truncate">Tous les Produits</span>
                </div>
                <div className="text-right font-mono shrink-0">
                  <div className={`text-xs font-black ${selectedProductId === 'ALL' ? 'text-blue-300' : 'text-emerald-700'}`}>
                    {globalTotalStockKg.toLocaleString()} Kg
                  </div>
                  <div className={`text-[10px] ${selectedProductId === 'ALL' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {globalTotalPallets} Pal.
                  </div>
                </div>
              </button>

              {/* Individual Distinct Product Capsules */}
              {displayedSummaries.map((summary, idx) => {
                const isSelected = selectedProductId === summary.productId;
                const palette = PRODUCT_PALETTE[idx % PRODUCT_PALETTE.length];
                const rawProduct = products.find(p => p.id === summary.productId);

                return (
                  <div
                    key={summary.productId}
                    onClick={() => onSelectProduct(isSelected ? 'ALL' : summary.productId)}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2.5 select-none cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-50/90 border-[#0f62fe] shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${palette.badgeBg} ${palette.badgeText}`}>
                          {summary.productCode}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${summary.currentStockKg > 0 ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {isSelected && (
                          <span className="bg-[#0f62fe] text-white text-[9px] px-1 py-0.2 rounded font-bold">
                            Actif
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-xs text-gray-900 truncate group-hover:text-[#0f62fe] transition-colors" title={summary.productName}>
                        {summary.productName}
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0 flex items-center gap-1.5">
                      <div>
                        <div className={`text-xs font-black ${
                          summary.currentStockKg <= 0 ? 'text-red-600' : isSelected ? 'text-[#0f62fe]' : 'text-gray-900'
                        }`}>
                          {summary.currentStockKg.toLocaleString()} Kg
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {summary.currentStockPallets} Pal.
                        </div>
                      </div>

                      {rawProduct && onOpenProductHistory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProductHistory(rawProduct);
                          }}
                          className="p-1 text-gray-400 hover:text-[#0f62fe] hover:bg-blue-50 rounded transition-colors"
                          title="Historique chronologique"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Detailed Focus Panel (Displays when a single product is selected) */}
          {selectedSummary && (
            <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-xl shadow-md space-y-4 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-blue-500/30 border border-blue-400/40 text-blue-200 px-2 py-0.5 rounded">
                        {selectedSummary.productCode}
                      </span>
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {selectedSummary.currentStockKg > 0 ? 'Disponible en Quai' : 'Rupture'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {selectedSummary.productName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedProductRaw && onOpenProductHistory && (
                    <button
                      type="button"
                      onClick={() => onOpenProductHistory(selectedProductRaw)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Historique Chronologique</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectProduct('ALL')}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Fermer le Focus</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-white/5 border border-white/10 p-3 rounded-lg space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Stock Net & Format</div>
                  <div className="text-lg font-black text-white">{selectedSummary.currentStockKg.toLocaleString()} Kg</div>
                  <div className="text-gray-300 text-[11px]">{selectedSummary.currentStockPallets} Pal. • {selectedSummary.currentStockCartons.toLocaleString()} Colis ({selectedSummary.kgPerCarton} kg/colis)</div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-lg space-y-1">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Entrées Réceptionnées</div>
                  <div className="text-lg font-black text-emerald-400">+{selectedSummary.totalEntriesKg.toLocaleString()} Kg</div>
                  <div className="text-gray-300 text-[11px]">{selectedSummary.entriesCount} arrivages / factures d'achat</div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-lg space-y-1">
                  <div className="text-[10px] uppercase font-bold text-rose-400">Sorties Livrées (BLs)</div>
                  <div className="text-lg font-black text-rose-400">-{selectedSummary.totalExitsKg.toLocaleString()} Kg</div>
                  <div className="text-gray-300 text-[11px]">{selectedSummary.exitsCount} Bons de Livraison expédiés</div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-lg space-y-1">
                  <div className="text-[10px] uppercase font-bold text-purple-300">Valorisation & Tarifs</div>
                  <div className="text-lg font-black text-purple-300">{selectedSummary.totalValuationCostHT.toLocaleString()} DH</div>
                  <div className="text-gray-300 text-[11px]">Revient : {selectedSummary.unitCostHT} DH • Vente : {selectedSummary.sellingPriceHT} DH</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: GRID (Grille classique de cartes pour ceux qui souhaitent la vue dépliée) */}
      {/* ========================================================================= */}
      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          
          {/* CARD 0: CONSOLIDATED */}
          <div
            onClick={() => onSelectProduct('ALL')}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between select-none ${
              selectedProductId === 'ALL'
                ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white ring-2 ring-blue-500 shadow-lg scale-[1.01]'
                : 'bg-white border border-gray-200 hover:border-slate-400 hover:shadow-md text-gray-900'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedProductId === 'ALL'
                      ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    TOUS PRODUITS
                  </span>
                  <span className={`text-[10px] font-semibold ${selectedProductId === 'ALL' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {displayedSummaries.length} Réf.
                  </span>
                </div>
                <h3 className={`text-sm font-bold truncate ${selectedProductId === 'ALL' ? 'text-white' : 'text-gray-900'}`}>
                  Stock Global Consolidé
                </h3>
              </div>

              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                selectedProductId === 'ALL' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600'
              }`}>
                {selectedProductId === 'ALL' ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              </div>
            </div>

            <div className="my-3 space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono tracking-tight ${selectedProductId === 'ALL' ? 'text-white' : 'text-gray-900'}`}>
                  {globalTotalStockKg.toLocaleString()}
                </span>
                <span className={`text-xs font-semibold ${selectedProductId === 'ALL' ? 'text-blue-300' : 'text-gray-500'}`}>
                  Kg en Stock
                </span>
              </div>
              <div className={`text-[11px] font-mono flex items-center gap-2 ${selectedProductId === 'ALL' ? 'text-gray-300' : 'text-gray-600'}`}>
                <span><b>{globalTotalPallets.toLocaleString()}</b> Palettes</span>
                <span>•</span>
                <span><b>{globalTotalCartons.toLocaleString()}</b> Colis</span>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-2 p-2 rounded-lg text-[11px] font-mono ${
              selectedProductId === 'ALL' ? 'bg-black/30 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div>
                <div className={`text-[9px] uppercase font-bold flex items-center gap-1 ${
                  selectedProductId === 'ALL' ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  <ArrowDownLeft className="w-3 h-3" />
                  Cumul Entrées
                </div>
                <div className="font-bold text-emerald-500 mt-0.5">
                  +{globalTotalEntriesKg.toLocaleString()} Kg
                </div>
              </div>

              <div>
                <div className={`text-[9px] uppercase font-bold flex items-center gap-1 ${
                  selectedProductId === 'ALL' ? 'text-rose-400' : 'text-rose-700'
                }`}>
                  <ArrowUpRight className="w-3 h-3" />
                  Cumul Sorties
                </div>
                <div className="font-bold text-rose-500 mt-0.5">
                  -{globalTotalExitsKg.toLocaleString()} Kg
                </div>
              </div>
            </div>

            <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono ${
              selectedProductId === 'ALL' ? 'border-white/10 text-gray-300' : 'border-gray-100 text-gray-500'
            }`}>
              <span>Valeur Coût HT:</span>
              <span className={`font-bold ${selectedProductId === 'ALL' ? 'text-purple-300' : 'text-purple-700'}`}>
                {globalTotalValuationCostHT.toLocaleString()} DH
              </span>
            </div>
          </div>

          {/* Individual Product Cards */}
          {displayedSummaries.map(summary => {
            const isSelected = selectedProductId === summary.productId;
            const rawProduct = products.find(p => p.id === summary.productId);

            return (
              <div
                key={summary.productId}
                onClick={() => onSelectProduct(isSelected ? 'ALL' : summary.productId)}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between select-none group border ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50/80 border-[#0f62fe] ring-2 ring-blue-500/30 shadow-md scale-[1.01]'
                    : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isSelected 
                            ? 'bg-[#0f62fe] text-white shadow-xs' 
                            : 'bg-blue-50 text-[#0f62fe] border border-blue-200'
                        }`}>
                          {summary.productCode}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate font-mono">
                          {summary.kgPerCarton} kg/colis
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-[#0f62fe] transition-colors" title={summary.productName}>
                        {summary.productName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {rawProduct && onOpenProductHistory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProductHistory(rawProduct);
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#0f62fe] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ouvrir l'historique chronologique"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                        isSelected
                          ? 'bg-[#0f62fe] text-white'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                      }`}>
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  <div className="my-2.5 space-y-0.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black font-mono tracking-tight ${
                        summary.currentStockKg <= 0 
                          ? 'text-red-600' 
                          : isSelected 
                            ? 'text-[#0f62fe]' 
                            : 'text-gray-900'
                      }`}>
                        {summary.currentStockKg.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        Kg
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-gray-600 flex items-center gap-2">
                      <span><b>{summary.currentStockPallets}</b> Pal.</span>
                      <span>•</span>
                      <span><b>{summary.currentStockCartons.toLocaleString()}</b> Colis</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-1">
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 text-[11px] font-mono">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                        Entrées
                      </div>
                      <div className="font-bold text-emerald-700 mt-0.5">
                        +{summary.totalEntriesKg.toLocaleString()} Kg
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {summary.entriesCount} récept.
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] uppercase font-bold text-rose-700 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-rose-600" />
                        Sorties
                      </div>
                      <div className="font-bold text-rose-700 mt-0.5">
                        -{summary.totalExitsKg.toLocaleString()} Kg
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {summary.exitsCount} BLs
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                      <span>Taux Sortie : <b>{summary.turnoverRatePercent}%</b></span>
                      <span className={`font-semibold ${
                        summary.stockStatus === 'EN_STOCK' ? 'text-emerald-700' :
                        summary.stockStatus === 'STOCK_FAIBLE' ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {summary.stockStatus === 'EN_STOCK' ? '✓ En Stock' :
                         summary.stockStatus === 'STOCK_FAIBLE' ? '⚠️ Stock Bas' : '🔴 Rupture'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          summary.turnoverRatePercent >= 85 ? 'bg-amber-500' : 'bg-[#0f62fe]'
                        }`}
                        style={{ width: `${Math.min(100, summary.turnoverRatePercent)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-gray-500">Valorisation HT :</span>
                    <span className="font-bold text-purple-700">
                      {summary.totalValuationCostHT.toLocaleString()} DH
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
