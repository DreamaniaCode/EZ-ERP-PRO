import React, { useState, useMemo } from 'react';
import { Product, DeliveryNoteBL } from '../../types';
import { findMatchingProduct } from '../../utils/productMatcher';
import { 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Search, 
  FileText, 
  ArrowRight, 
  DollarSign, 
  ShieldAlert, 
  Wrench,
  Sparkles,
  TrendingUp,
  Filter
} from 'lucide-react';

interface PriceDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  deliveryNotes: DeliveryNoteBL[];
  onSyncPrices: () => void;
}

export interface PriceDiscrepancy {
  id: string;
  blId: string;
  blNumber: string;
  clientName: string;
  date: string;
  itemIndex: number;
  productName: string;
  productCode: string;
  blUnitPriceHT: number;
  catalogUnitPriceHT: number;
  priceDiff: number;
  quantityKg: number;
  totalDiffHT: number;
  matchedProductId?: string;
  matchedProductCode?: string;
  reason: 'PRICE_OUTDATED' | 'UNMATCHED_PRODUCT';
}

export const PriceDiagnosticModal: React.FC<PriceDiagnosticModalProps> = ({
  isOpen,
  onClose,
  products,
  deliveryNotes,
  onSyncPrices
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PRICE_OUTDATED' | 'UNMATCHED_PRODUCT'>('ALL');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Compute all price diagnostics
  const diagnostics = useMemo(() => {
    const discrepancies: PriceDiscrepancy[] = [];
    let totalBLsChecked = deliveryNotes.length;
    let totalItemsChecked = 0;
    let outdatedItemsCount = 0;
    let unmatchedItemsCount = 0;
    let totalFinancialImpact = 0;

    deliveryNotes.forEach(bl => {
      (bl.items || []).forEach((item, idx) => {
        totalItemsChecked++;
        const itemCode = (item.productCode || '').toLowerCase().trim();
        const itemName = (item.productName || '').toLowerCase().trim();

        // Cross reference product in catalog
        const prd = findMatchingProduct(item, products);

        if (prd) {
          // Check if BL price differs from catalog selling price
          if (Math.abs(item.unitPriceHT - prd.sellingPriceHT) > 0.001) {
            outdatedItemsCount++;
            const priceDiff = prd.sellingPriceHT - item.unitPriceHT;
            const totalDiff = priceDiff * item.quantityKg;
            totalFinancialImpact += totalDiff;

            discrepancies.push({
              id: `${bl.id}-${idx}`,
              blId: bl.id,
              blNumber: bl.blNumber,
              clientName: bl.clientName,
              date: bl.date,
              itemIndex: idx,
              productName: item.productName,
              productCode: item.productCode || prd.code,
              blUnitPriceHT: item.unitPriceHT,
              catalogUnitPriceHT: prd.sellingPriceHT,
              priceDiff,
              quantityKg: item.quantityKg,
              totalDiffHT: totalDiff,
              matchedProductId: prd.id,
              matchedProductCode: prd.code,
              reason: 'PRICE_OUTDATED',
            });
          }
        } else {
          unmatchedItemsCount++;
          discrepancies.push({
            id: `${bl.id}-${idx}-unmatched`,
            blId: bl.id,
            blNumber: bl.blNumber,
            clientName: bl.clientName,
            date: bl.date,
            itemIndex: idx,
            productName: item.productName,
            productCode: item.productCode || 'INCONNU',
            blUnitPriceHT: item.unitPriceHT,
            catalogUnitPriceHT: 0,
            priceDiff: 0,
            quantityKg: item.quantityKg,
            totalDiffHT: 0,
            reason: 'UNMATCHED_PRODUCT',
          });
        }
      });
    });

    return {
      totalBLsChecked,
      totalItemsChecked,
      outdatedItemsCount,
      unmatchedItemsCount,
      totalFinancialImpact,
      discrepancies,
    };
  }, [deliveryNotes, products]);

  if (!isOpen) return null;

  // Filtered list
  const filteredDiscrepancies = diagnostics.discrepancies.filter(d => {
    const matchesFilter = filterType === 'ALL' || d.reason === filterType;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      d.blNumber.toLowerCase().includes(term) ||
      d.clientName.toLowerCase().includes(term) ||
      d.productName.toLowerCase().includes(term) ||
      d.productCode.toLowerCase().includes(term);

    return matchesFilter && matchesSearch;
  });

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSyncPrices();
      setIsSyncing(false);
      setSyncSuccessMsg(`Synchronisation des prix effectuée ! ${diagnostics.outdatedItemsCount} article(s) de BL ont été mis à jour avec le tarif catalogue.`);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    }, 300);
  };

  const handleOpenBL = (blNumber: string) => {
    window.history.pushState({}, '', `/?bl=${blNumber}`);
    window.dispatchEvent(new Event('popstate'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-[#161616] text-white p-4 flex justify-between items-center border-b border-[#393939] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold shadow">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  DIAGNOSTIC TARIFS
                </span>
                <h2 className="font-bold text-base tracking-wide text-white">
                  Outil de Diagnostic & Synchronisation des Prix BL
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Rapprochement automatique entre le tarif catalogue des produits et l'historique des Bons de Livraison (BLs)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="bg-[#0f62fe] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Synchroniser les Prix (Force Sync)</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg transition hover:bg-[#262626]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">

          {/* Success Banner */}
          {syncSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Diagnostic Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Total Analyzed */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Analysés</span>
                <div className="text-lg font-extrabold font-mono text-gray-900 mt-0.5">
                  {diagnostics.totalBLsChecked} <span className="text-xs font-normal text-gray-500">BLs</span>
                </div>
                <div className="text-xs text-gray-500">{diagnostics.totalItemsChecked} articles inspectés</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0f62fe] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Outdated Prices */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Prix Désynchronisés</span>
                <div className={`text-lg font-extrabold font-mono mt-0.5 ${diagnostics.outdatedItemsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {diagnostics.outdatedItemsCount} <span className="text-xs font-normal text-gray-500">écarts</span>
                </div>
                <div className="text-xs text-gray-500">
                  {diagnostics.outdatedItemsCount > 0 ? 'Mise à jour requise' : 'Tous les prix concordent'}
                </div>
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${diagnostics.outdatedItemsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {diagnostics.outdatedItemsCount > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
            </div>

            {/* Financial Delta */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Impact Financier HT</span>
                <div className="text-lg font-extrabold font-mono text-gray-900 mt-0.5">
                  {diagnostics.totalFinancialImpact > 0 ? `+${diagnostics.totalFinancialImpact.toLocaleString()}` : diagnostics.totalFinancialImpact.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
                </div>
                <div className="text-xs text-gray-500">Écart potentiel sur le chiffre d'affaires</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Unmatched Items */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Non Référencés</span>
                <div className={`text-lg font-extrabold font-mono mt-0.5 ${diagnostics.unmatchedItemsCount > 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                  {diagnostics.unmatchedItemsCount} <span className="text-xs font-normal text-gray-500">inconnus</span>
                </div>
                <div className="text-xs text-gray-500">Codes ou désignations hors-catalogue</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Explanation Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Pourquoi les prix de certains BLs diffèrent-ils du catalogue ?</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Lorsqu'un prix de vente est modifié sur un produit ou qu'un BL ancien est conservé en mémoire, les BLs associés conservent leur tarif historique sauf si vous lancez une synchronisation globale. Cliquez sur le bouton ci-dessous pour aligner l'ensemble des BLs.
                </p>
              </div>
            </div>
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 rounded shrink-0 shadow transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Lancer la Synchronisation</span>
            </button>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="carbon-input text-xs font-semibold"
              >
                <option value="ALL">Tous les événements ({diagnostics.discrepancies.length})</option>
                <option value="PRICE_OUTDATED">Prix désynchronisés ({diagnostics.outdatedItemsCount})</option>
                <option value="UNMATCHED_PRODUCT">Produits hors-catalogue ({diagnostics.unmatchedItemsCount})</option>
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filtrer par N° BL, Client, Produit..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full carbon-input pl-8 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          {/* Discrepancies Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="carbon-table w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-left font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3">Bon de Livraison</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Article dans le BL</th>
                    <th className="py-2.5 px-3 text-right">Prix Actuel BL</th>
                    <th className="py-2.5 px-3 text-right">Prix Catalogue</th>
                    <th className="py-2.5 px-3 text-right">Écart Unitaire</th>
                    <th className="py-2.5 px-3 text-right">Impact Total HT</th>
                    <th className="py-2.5 px-3 text-center">Diagnostic</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDiscrepancies.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-xs text-gray-800">Aucun écart de tarif détecté !</p>
                        <p className="text-[11px] text-gray-500 mt-1">Tous les prix de vos Bons de Livraison sont parfaitement synchronisés avec le catalogue.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDiscrepancies.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        
                        {/* BL Ref & Date */}
                        <td className="font-mono text-gray-900 whitespace-nowrap font-bold">
                          <div>{item.blNumber}</div>
                          <div className="text-[10px] text-gray-500 font-normal">{item.date}</div>
                        </td>

                        {/* Client */}
                        <td className="font-medium text-gray-800 whitespace-nowrap">
                          {item.clientName}
                        </td>

                        {/* Article */}
                        <td>
                          <div className="font-semibold text-gray-900">{item.productName}</div>
                          <div className="text-[10px] font-mono text-gray-500">
                            SKU: {item.productCode} ({item.quantityKg.toLocaleString()} Kg)
                          </div>
                        </td>

                        {/* Price in BL */}
                        <td className="text-right font-mono font-bold text-gray-700">
                          {item.blUnitPriceHT} DH/kg
                        </td>

                        {/* Price in Catalog */}
                        <td className="text-right font-mono font-bold text-blue-600">
                          {item.reason === 'PRICE_OUTDATED' ? `${item.catalogUnitPriceHT} DH/kg` : '-'}
                        </td>

                        {/* Difference per Kg */}
                        <td className="text-right font-mono font-bold">
                          {item.reason === 'PRICE_OUTDATED' ? (
                            <span className={item.priceDiff > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {item.priceDiff > 0 ? `+${item.priceDiff.toFixed(2)}` : item.priceDiff.toFixed(2)} DH
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Total Financial Impact */}
                        <td className="text-right font-mono font-bold">
                          {item.reason === 'PRICE_OUTDATED' ? (
                            <span className={item.totalDiffHT > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {item.totalDiffHT > 0 ? `+${item.totalDiffHT.toLocaleString()}` : item.totalDiffHT.toLocaleString()} DH
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Status / Reason */}
                        <td className="text-center">
                          {item.reason === 'PRICE_OUTDATED' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Prix Obsolète
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              Non Référencé
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenBL(item.blNumber)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#0f62fe] font-bold rounded text-[11px] border border-blue-200 transition inline-flex items-center gap-1"
                            title="Consulter ce Bon de Livraison"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Voir BL</span>
                          </button>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-gray-600 font-mono">
            {diagnostics.outdatedItemsCount} écart(s) tarifaire(s) sur {diagnostics.totalItemsChecked} article(s) de BL
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="bg-[#0f62fe] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-1.5 rounded transition"
            >
              Exécuter la Synchronisation
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
