import React from 'react';
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
  Eye
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
  const [internalOnlyInStock, setInternalOnlyInStock] = React.useState<boolean>(true);
  const onlyInStock = externalOnlyInStock !== undefined ? externalOnlyInStock : internalOnlyInStock;

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

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-[#0f62fe] rounded border border-blue-200">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>Cartes KPI & Situation par Produit</span>
              <span className="text-[11px] font-normal text-gray-500 font-mono">({warehouseName})</span>
            </h2>
            <p className="text-[11px] text-gray-500">
              {onlyInStock 
                ? `Affichage exclusif des produits disponibles en stock (${inStockSummaries.length} référence${inStockSummaries.length > 1 ? 's' : ''})`
                : `Affichage de toutes les références catalogue (${productSummaries.length})`}
            </p>
          </div>
        </div>

        {/* In-Stock Filter Toggle & Quick Filter Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleOnlyInStock}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              onlyInStock
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
            title="Basculer entre afficher uniquement les produits en stock ou tous les produits"
          >
            <span className={`w-2 h-2 rounded-full ${onlyInStock ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            <span>{onlyInStock ? `En Stock Uniquement (${inStockSummaries.length})` : `Tous les Produits (${productSummaries.length})`}</span>
          </button>

          {selectedProductId !== 'ALL' && selectedSummary && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-xs animate-in fade-in">
              <span className="text-blue-800 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0f62fe] animate-pulse"></span>
                Filtre : <b>{selectedSummary.productName}</b>
              </span>
              <button
                onClick={() => onSelectProduct('ALL')}
                className="text-gray-500 hover:text-red-600 p-0.5 rounded-full hover:bg-blue-100 transition-colors"
                title="Réinitialiser le filtre produit"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        
        {/* ========================================================================= */}
        {/* CARD 0: MASTER CONSOLIDATED CARD ("TOUS LES PRODUITS")                    */}
        {/* ========================================================================= */}
        <div
          onClick={() => onSelectProduct('ALL')}
          className={`cursor-pointer rounded-xl p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between select-none ${
            selectedProductId === 'ALL'
              ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white ring-2 ring-blue-500 shadow-lg scale-[1.01]'
              : 'bg-white border border-gray-200 hover:border-slate-400 hover:shadow-md text-gray-900'
          }`}
        >
          {/* Top Banner & Badge */}
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
              selectedProductId === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {selectedProductId === 'ALL' ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </div>
          </div>

          {/* Main Key Figures */}
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

          {/* Dual Flow Pill (Entrées vs Sorties) */}
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

          {/* Card Footer Valuation */}
          <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono ${
            selectedProductId === 'ALL' ? 'border-white/10 text-gray-300' : 'border-gray-100 text-gray-500'
          }`}>
            <span>Valeur Coût HT:</span>
            <span className={`font-bold ${selectedProductId === 'ALL' ? 'text-purple-300' : 'text-purple-700'}`}>
              {globalTotalValuationCostHT.toLocaleString()} DH
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INDIVIDUAL PRODUCT KPI CARDS (CLICKABLE)                                  */}
        {/* ========================================================================= */}
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
              {/* Top Banner & SKU */}
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

                  {/* Selection Indicator & History Icon */}
                  <div className="flex items-center gap-1 shrink-0">
                    {rawProduct && onOpenProductHistory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProductHistory(rawProduct);
                        }}
                        className="p-1.5 text-gray-400 hover:text-[#0f62fe] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ouvrir l'historique complet chronologique"
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

                {/* Stock Level Key Numbers */}
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

              {/* Flow Metrics Box (Entrées vs Sorties) */}
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

                {/* Progress Bar (Turnover / Stock Remaining) */}
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

                {/* Card Bottom Valuation */}
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
    </div>
  );
};
