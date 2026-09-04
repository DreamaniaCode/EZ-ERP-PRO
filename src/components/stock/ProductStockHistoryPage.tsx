import React, { useState, useMemo } from 'react';
import { Product, PurchaseImportInvoice } from '../../types';
import { useERP } from '../../context/ERPContext';
import { ExportButtons } from '../common/ExportButtons';
import { 
  ArrowLeft, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Search, 
  Calendar, 
  Building2, 
  FileText, 
  Plus, 
  Package,
  Layers,
  Clock,
  Pencil,
  Truck,
  Boxes,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { EditPurchaseInvoiceModal } from '../purchases/EditPurchaseInvoiceModal';
import { extractDateAndTime } from '../../utils/frigoStockMovements';

export type MovementType = 'SORTIE_BL' | 'ENTREE_ACHAT' | 'AJUSTEMENT_INVENTAIRE' | 'AJUSTEMENT_MANUEL' | 'TRANSFERT';

export interface StockMovementRecord {
  id: string;
  rawDate: string;
  date: string;
  time: string;
  type: MovementType;
  documentRef: string;
  orderRef?: string;
  frigoId?: string;
  frigoName: string;
  partyName: string;
  changeKg: number;
  changePallets: number;
  unitPriceHT?: number;
  totalHT?: number;
  status?: string;
  notes?: string;
  purchaseInvoiceId?: string;
}

interface ProductStockHistoryPageProps {
  productId: string | null;
  onBack: () => void;
  onNavigateToBL?: (blNumberOrId: string) => void;
  onSelectProduct?: (productId: string) => void;
  onEditPurchase?: (id: string) => void;
}

export const ProductStockHistoryPage: React.FC<ProductStockHistoryPageProps> = ({
  productId,
  onBack,
  onNavigateToBL,
  onSelectProduct,
  onEditPurchase
}) => {
  const erp = useERP();
  const products = erp.products || [];
  const deliveryNotes = erp.deliveryNotes || [];
  const purchaseInvoices = erp.purchaseInvoices || [];
  const inventoryCounts = erp.inventoryCounts || [];
  const stocks = erp.stocks || [];
  const frigos = erp.frigos || [];
  const adjustStock = erp.adjustStock;

  // Selected product state (defaults to productId or first product)
  const [currentProductId, setCurrentProductId] = useState<string>(() => {
    if (productId) return productId;
    return products[0]?.id || '';
  });

  const product = useMemo(() => {
    return products.find(p => p.id === currentProductId || p.code === currentProductId) || products[0] || null;
  }, [products, currentProductId]);

  const [frigoFilter, setFrigoFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState<PurchaseImportInvoice | null>(null);

  // Manual adjustment sub-form toggle
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualData, setManualData] = useState({
    frigoId: frigos[0]?.id || '',
    direction: 'ADD' as 'ADD' | 'REMOVE',
    kg: 500,
    pallets: 1,
    reason: 'Correction d\'inventaire physique',
    date: new Date().toISOString().slice(0, 10),
  });

  // Product stock calculation per frigo
  const productStocks = useMemo(() => {
    if (!product) return [];
    return stocks.filter(s => s.productId === product.id || s.productId === product.code);
  }, [stocks, product]);

  const totalStockKgFromRecords = productStocks.reduce((sum, s) => sum + s.quantityKg, 0);
  const totalStockPallets = productStocks.reduce((sum, s) => sum + s.quantityPallets, 0);

  // Compile all movements for this product chronologically
  const allMovements: StockMovementRecord[] = useMemo(() => {
    if (!product) return [];
    const movements: StockMovementRecord[] = [];

    // 1. Delivery Notes (BLs) -> Stock Exits
    deliveryNotes.forEach(bl => {
      const matchedItem = bl.items.find(it => 
        it.productId === product.id || 
        it.productCode === product.code ||
        (it.productName && it.productName.toLowerCase().includes(product.code.toLowerCase()))
      );

      if (matchedItem) {
        const logTimestamp = bl.logs && bl.logs.length > 0 ? bl.logs[0].timestamp : undefined;
        const { date, time, timestampMs } = extractDateAndTime(bl.date, logTimestamp || bl.frigoApprovedAt);

        movements.push({
          id: `mv-bl-${bl.id}-${matchedItem.productId}`,
          rawDate: new Date(timestampMs).toISOString(),
          date,
          time,
          type: 'SORTIE_BL',
          documentRef: bl.blNumber,
          orderRef: bl.orderNumber,
          frigoId: bl.frigoId,
          frigoName: bl.frigoName || 'Entrepôt Principal',
          partyName: bl.clientName,
          changeKg: -Math.abs(matchedItem.quantityKg),
          changePallets: -Math.abs(matchedItem.quantityPallets),
          unitPriceHT: matchedItem.unitPriceHT,
          totalHT: matchedItem.totalHT,
          status: bl.status,
          notes: `Bon de Livraison - ${bl.clientName}`,
        });
      }
    });

    // 2. Purchase / Import Invoices -> Stock Entries
    purchaseInvoices.forEach(pur => {
      const matchedItem = pur.items?.find(it => 
        it.productId === product.id || 
        it.productCode === product.code
      );

      if (matchedItem) {
        const targetFrigo = frigos.find(f => f.id === pur.targetFrigoId);
        const { date, time, timestampMs } = extractDateAndTime(pur.dateArrival, (pur as any).createdAt || (pur as any).timeArrival || pur.id);

        movements.push({
          id: `mv-pur-${pur.id}-${matchedItem.productId}`,
          rawDate: new Date(timestampMs).toISOString(),
          date,
          time,
          type: 'ENTREE_ACHAT',
          documentRef: pur.invoiceNumber,
          frigoId: pur.targetFrigoId,
          frigoName: targetFrigo ? targetFrigo.name : 'Frigo de Réception',
          partyName: pur.supplierName,
          changeKg: Math.abs(matchedItem.quantityKg),
          changePallets: Math.abs(matchedItem.quantityPallets),
          unitPriceHT: matchedItem.landedCostPerKgHT || matchedItem.purchaseUnitPriceHT,
          totalHT: matchedItem.totalHT,
          status: pur.paymentStatus,
          notes: pur.containerNumber ? `Conteneur : ${pur.containerNumber}` : 'Réception Fournisseur',
          purchaseInvoiceId: pur.id,
        });
      }
    });

    // 3. Inventory Counts -> Stock Adjustments
    inventoryCounts.forEach(count => {
      const matchedItem = count.items?.find(it => it.productId === product.id);
      if (matchedItem) {
        const countFrigo = frigos.find(f => f.id === count.frigoId);
        const palDiff = matchedItem.physicalPallets - matchedItem.theoreticalPallets;
        const { date, time, timestampMs } = extractDateAndTime(count.date);

        movements.push({
          id: `mv-inv-${count.id}-${matchedItem.productId}`,
          rawDate: new Date(timestampMs).toISOString(),
          date,
          time,
          type: 'AJUSTEMENT_INVENTAIRE',
          documentRef: count.countNumber,
          frigoId: count.frigoId,
          frigoName: countFrigo ? countFrigo.name : 'Frigo Site',
          partyName: count.conductedBy || 'Responsable Stock',
          changeKg: matchedItem.differenceKg,
          changePallets: palDiff,
          status: count.status,
          notes: matchedItem.notes || `Écart Inventaire: Theo=${matchedItem.theoreticalKg}kg / Phys=${matchedItem.physicalKg}kg`,
        });
      }
    });

    // Sort chronologically
    movements.sort((a, b) => {
      const dateA = new Date(a.rawDate).getTime();
      const dateB = new Date(b.rawDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return movements;
  }, [deliveryNotes, purchaseInvoices, inventoryCounts, product, frigos, sortOrder]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return allMovements.filter(m => {
      const matchesFrigo = frigoFilter === 'ALL' || m.frigoId === frigoFilter || m.frigoName.includes(frigoFilter);
      const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        m.documentRef.toLowerCase().includes(term) ||
        (m.orderRef && m.orderRef.toLowerCase().includes(term)) ||
        m.partyName.toLowerCase().includes(term) ||
        m.frigoName.toLowerCase().includes(term) ||
        (m.notes && m.notes.toLowerCase().includes(term));

      return matchesFrigo && matchesType && matchesSearch;
    });
  }, [allMovements, frigoFilter, typeFilter, searchTerm]);

  // Totals calculations
  const totalEntriesKg = allMovements
    .filter(m => m.changeKg > 0)
    .reduce((sum, m) => sum + m.changeKg, 0);

  const totalExitsKg = allMovements
    .filter(m => m.changeKg < 0)
    .reduce((sum, m) => sum + Math.abs(m.changeKg), 0);

  const dynamicBalanceKg = Math.max(0, totalEntriesKg - totalExitsKg);
  const effectiveTotalStockKg = totalEntriesKg > 0 ? dynamicBalanceKg : totalStockKgFromRecords;

  // Handle manual adjustment submission
  const handleManualAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    const targetFrigoId = manualData.frigoId || frigos[0]?.id;
    if (!targetFrigoId) return;

    const currentStockLevel = stocks.find(s => s.frigoId === targetFrigoId && s.productId === product.id);
    const currKg = currentStockLevel ? currentStockLevel.quantityKg : 0;
    const currPal = currentStockLevel ? currentStockLevel.quantityPallets : 0;

    const deltaKg = manualData.direction === 'ADD' ? Number(manualData.kg) : -Number(manualData.kg);
    const deltaPal = manualData.direction === 'ADD' ? Number(manualData.pallets) : -Number(manualData.pallets);

    const newKg = Math.max(0, currKg + deltaKg);
    const newPal = Math.max(0, currPal + deltaPal);

    adjustStock(targetFrigoId, product.id, newKg, newPal);
    setShowManualForm(false);
    alert(`Ajustement de stock appliqué avec succès sur le frigo sélectionné ! Nouveaux niveaux: ${newKg.toLocaleString()} Kg (${newPal} Pal)`);
  };

  const handleOpenBL = (blNumber: string) => {
    if (onNavigateToBL) {
      onNavigateToBL(blNumber);
    } else {
      window.history.pushState({}, '', `/?bl=${blNumber}`);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  if (!product) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200 shadow-sm max-w-lg mx-auto">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-800">Aucun produit sélectionné</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">Veuillez sélectionner un produit pour afficher son historique.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#0f62fe] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          Retour au Catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="product-stock-history-page">
      
      {/* 1. Header with Back Button, Product Switcher & Global Actions */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
            title="Retour au catalogue des produits"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#0f62fe] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {product.code}
              </span>
              <h1 className="text-lg font-bold text-gray-900 leading-snug">
                Historique Chronologique des Mouvements
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
              <span className="font-semibold text-gray-800">{product.name}</span>
              <span>•</span>
              <span>{product.category}</span>
              <span>•</span>
              <span>{product.origin || 'Maroc'}</span>
              <span>•</span>
              <span className="font-mono">{product.kgPerCarton} kg/colis • {product.kgPerPallet} kg/pal</span>
            </div>
          </div>
        </div>

        {/* Product Selector Dropdown & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Product Switcher */}
          <div className="relative min-w-[200px] max-w-[260px] flex-1">
            <select
              value={product.id}
              onChange={(e) => {
                setCurrentProductId(e.target.value);
                if (onSelectProduct) onSelectProduct(e.target.value);
              }}
              className="w-full carbon-input text-xs font-bold py-2 bg-gray-50 border-gray-300"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Ajuster Stock</span>
          </button>

          <ExportButtons
            filename={`Historique_Stock_${product.code}`}
            title={`Historique des Mouvements de Stock - ${product.code} (${product.name})`}
            excelData={filteredMovements.map(m => ({
              'Date': m.date,
              'Heure': m.time,
              'Type Mouvement': m.type === 'SORTIE_BL' ? 'Sortie (BL)' : m.type === 'ENTREE_ACHAT' ? 'Entrée (Achat)' : 'Ajustement Inventaire',
              'Référence Document': m.documentRef,
              'Commande Ref': m.orderRef || '-',
              'Frigo / Emplacement': m.frigoName,
              'Tiers (Client / Fournisseur)': m.partyName,
              'Quantité Kg': m.changeKg,
              'Quantité Palettes': m.changePallets,
              'Prix Unitaire HT (DH)': m.unitPriceHT || '-',
              'Montant Total HT (DH)': m.totalHT || '-',
              'Statut Document': m.status || 'OK',
              'Remarques / Notes': m.notes || '-',
            }))}
            pdfElementId="product-stock-history-page"
          />
        </div>

      </div>

      {/* 2. Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Current Stock */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs font-semibold">
            <span className="truncate">Stock Actuel Global</span>
            <Package className="w-4 h-4 text-[#0f62fe] shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-gray-900">
              {effectiveTotalStockKg.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-600">Kg</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs font-mono">
            <span className="font-bold text-purple-700">{totalStockPallets} Palettes</span>
            <span className="text-gray-500">Net Réel</span>
          </div>
        </div>

        {/* Total Exits (BLs) */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs font-semibold">
            <span className="truncate">Cumul Sorties (BLs)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-600">
              -{totalExitsKg.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-600">Kg</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs font-mono">
            <span className="text-rose-700 font-bold">{allMovements.filter(m => m.type === 'SORTIE_BL').length} Bons de livraison</span>
          </div>
        </div>

        {/* Total Entries (Achats) */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs font-semibold">
            <span className="truncate">Cumul Entrées (Achats)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
              +{totalEntriesKg.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-600">Kg</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs font-mono">
            <span className="text-emerald-700 font-bold">{allMovements.filter(m => m.type === 'ENTREE_ACHAT').length} Réceptions</span>
          </div>
        </div>

        {/* Cold Storage Locations */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs font-semibold">
            <span className="truncate">Répartition Frigos</span>
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
          <div className="mt-1 space-y-1 max-h-16 overflow-y-auto pr-1">
            {frigos.map(fr => {
              const fMvs = allMovements.filter(m => m.frigoId === fr.id || (m.frigoName && fr.name && (m.frigoName.includes(fr.name) || fr.name.includes(m.frigoName))));
              const fEntries = fMvs.filter(m => m.changeKg > 0).reduce((sum, m) => sum + m.changeKg, 0);
              const fExits = fMvs.filter(m => m.changeKg < 0).reduce((sum, m) => sum + Math.abs(m.changeKg), 0);
              const st = productStocks.find(s => s.frigoId === fr.id || s.frigoId === fr.code);
              const fKg = fEntries > 0 ? Math.max(0, fEntries - fExits) : (st?.quantityKg || 0);
              const fPal = st && st.quantityPallets > 0 ? st.quantityPallets : (fKg > 0 ? Math.max(1, Math.ceil(fKg / (product.kgPerPallet || 500))) : 0);
              if (fKg <= 0 && (!st || st.quantityKg <= 0)) return null;
              return (
                <div key={fr.id} className="flex justify-between text-[10px] sm:text-[11px] font-mono">
                  <span className="text-gray-600 truncate max-w-[100px]">{fr.name.split('-')[0].trim()}</span>
                  <span className="font-bold text-gray-900">{fKg.toLocaleString()} kg ({fPal}p)</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Manual Stock Adjustment Drawer/Form */}
      {showManualForm && (
        <div className="bg-blue-50/90 border border-blue-200 p-4 rounded-xl shadow-inner space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-blue-900 uppercase tracking-wide">
            <span className="flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#0f62fe]" />
              Ajustement Manuel / Correction directe de stock
            </span>
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="text-gray-500 hover:text-gray-800 text-xs font-bold"
            >
              Annuler
            </button>
          </div>

          <form onSubmit={handleManualAdjustment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Frigo Cible</label>
              <select
                value={manualData.frigoId}
                onChange={e => setManualData({ ...manualData, frigoId: e.target.value })}
                className="w-full carbon-input text-xs"
              >
                {frigos.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Opération</label>
              <select
                value={manualData.direction}
                onChange={e => setManualData({ ...manualData, direction: e.target.value as 'ADD' | 'REMOVE' })}
                className="w-full carbon-input text-xs font-bold"
              >
                <option value="ADD">➕ Ajouter au stock (+)</option>
                <option value="REMOVE">➖ Retirer du stock (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Quantité Kg</label>
              <input
                type="number"
                min="1"
                required
                value={manualData.kg}
                onChange={e => setManualData({ ...manualData, kg: Number(e.target.value) })}
                className="w-full carbon-input text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Palettes</label>
              <input
                type="number"
                min="0"
                required
                value={manualData.pallets}
                onChange={e => setManualData({ ...manualData, pallets: Number(e.target.value) })}
                className="w-full carbon-input text-xs font-mono font-bold"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-[#0f62fe] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow transition cursor-pointer"
              >
                Valider Ajustement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Frigo Filter */}
          <div className="relative">
            <select
              value={frigoFilter}
              onChange={e => setFrigoFilter(e.target.value)}
              className="carbon-input text-xs font-medium py-1.5 pr-6"
            >
              <option value="ALL">Tous les frigos</option>
              {frigos.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="carbon-input text-xs font-medium py-1.5 pr-6"
            >
              <option value="ALL">Tous les mouvements</option>
              <option value="SORTIE_BL">Sorties (Bons de Livraison)</option>
              <option value="ENTREE_ACHAT">Entrées (Achats / Conteneurs)</option>
              <option value="AJUSTEMENT_INVENTAIRE">Ajustements d'inventaire</option>
            </select>
          </div>

          {/* Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            title="Inverser l'ordre chronologique"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Plus récents en premier' : 'Plus anciens en premier'}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher BL, Fournisseur, Client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full carbon-input pl-8 py-1.5 text-xs font-mono"
          />
        </div>

      </div>

      {/* 5. Movements Log - Dual Responsive View (Desktop Table & Mobile Cards) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Table Header Info */}
        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white text-xs">
          <div className="font-bold text-gray-900 flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#0f62fe]" />
            <span>Mouvements Enregistrés ({filteredMovements.length})</span>
          </div>
          <span className="text-[11px] text-gray-500 font-mono">
            {product.code} • {product.name}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="carbon-table w-full text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left font-bold border-b border-gray-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Heure</th>
                <th className="py-2.5 px-3">Type & Référence</th>
                <th className="py-2.5 px-3">Frigo / Emplacement</th>
                <th className="py-2.5 px-3">Tiers (Client / Fournisseur)</th>
                <th className="py-2.5 px-3 text-right">Impact Kg</th>
                <th className="py-2.5 px-3 text-right">Palettes</th>
                <th className="py-2.5 px-3 text-right">Prix Unitaire HT</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">
                    <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-xs">Aucun mouvement enregistré pour les critères sélectionnés.</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const isExit = m.changeKg < 0;
                  const isEntry = m.changeKg > 0;

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      
                      {/* Date */}
                      <td className="font-mono text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{m.date}</span>
                        </div>
                      </td>

                      {/* Heure */}
                      <td className="font-mono text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[11px] font-bold w-max">
                          <Clock className="w-3 h-3 text-[#0f62fe]" />
                          <span>{m.time}</span>
                        </div>
                      </td>

                      {/* Type & Document Ref */}
                      <td>
                        <div className="flex items-center gap-2">
                          {m.type === 'SORTIE_BL' && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200 shrink-0">
                              <ArrowUpRight className="w-3 h-3" />
                              Sortie BL
                            </span>
                          )}
                          {m.type === 'ENTREE_ACHAT' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200 shrink-0">
                              <ArrowDownLeft className="w-3 h-3" />
                              Entrée Achat
                            </span>
                          )}
                          {m.type === 'AJUSTEMENT_INVENTAIRE' && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200 shrink-0">
                              <RefreshCw className="w-3 h-3" />
                              Inventaire
                            </span>
                          )}

                          <span className="font-mono font-bold text-gray-900 underline decoration-dotted">
                            {m.documentRef}
                          </span>
                        </div>
                        {m.notes && (
                          <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                            {m.notes}
                          </div>
                        )}
                      </td>

                      {/* Frigo */}
                      <td className="font-mono text-xs text-gray-800">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span>{m.frigoName}</span>
                        </div>
                      </td>

                      {/* Party Name */}
                      <td className="font-medium text-gray-900 whitespace-nowrap">
                        {m.partyName}
                      </td>

                      {/* Impact Kg */}
                      <td className="text-right font-mono font-bold">
                        <span className={isExit ? 'text-rose-600' : isEntry ? 'text-emerald-600' : 'text-gray-700'}>
                          {m.changeKg > 0 ? `+${m.changeKg.toLocaleString()}` : m.changeKg.toLocaleString()} Kg
                        </span>
                      </td>

                      {/* Impact Pallets */}
                      <td className="text-right font-mono font-semibold text-gray-700">
                        {m.changePallets > 0 ? `+${m.changePallets}` : m.changePallets} Pal.
                      </td>

                      {/* Unit Price HT */}
                      <td className="text-right font-mono text-gray-600">
                        {m.unitPriceHT ? `${m.unitPriceHT} DH/kg` : '-'}
                      </td>

                      {/* Status */}
                      <td className="text-center">
                        {m.type === 'SORTIE_BL' ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.status === 'LIVRÉ' || m.status === 'FACTURÉ' || m.status === 'APPROUVÉ_FRIGO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {m.status || 'EN_COURS'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            {m.status || 'VALIDE'}
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="text-right whitespace-nowrap">
                        {m.type === 'SORTIE_BL' && (
                          <button
                            onClick={() => handleOpenBL(m.documentRef)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#0f62fe] font-bold rounded text-xs border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Voir la fiche détaillée du Bon de Livraison (BL)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Voir BL</span>
                          </button>
                        )}

                        {m.type === 'ENTREE_ACHAT' && m.purchaseInvoiceId && (
                          <button
                            onClick={() => {
                              if (onEditPurchase) {
                                onEditPurchase(m.purchaseInvoiceId!);
                              } else {
                                const pur = purchaseInvoices.find(p => p.id === m.purchaseInvoiceId);
                                if (pur) setEditingPurchaseInvoice(pur);
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded text-xs border border-amber-200 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Modifier cette facture d'achat"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-xs">Aucun mouvement enregistré.</p>
            </div>
          ) : (
            filteredMovements.map(m => {
              const isExit = m.changeKg < 0;
              const isEntry = m.changeKg > 0;

              return (
                <div key={m.id} className="p-3.5 space-y-2.5 bg-white active:bg-gray-50 transition-colors">
                  
                  {/* Top Line: Date & Time + Type Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {m.type === 'SORTIE_BL' && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200 shrink-0">
                          <ArrowUpRight className="w-3 h-3" />
                          Sortie BL
                        </span>
                      )}
                      {m.type === 'ENTREE_ACHAT' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200 shrink-0">
                          <ArrowDownLeft className="w-3 h-3" />
                          Entrée Achat
                        </span>
                      )}
                      {m.type === 'AJUSTEMENT_INVENTAIRE' && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200 shrink-0">
                          <RefreshCw className="w-3 h-3" />
                          Inventaire
                        </span>
                      )}

                      <span className="font-mono font-bold text-xs text-gray-900">
                        {m.documentRef}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-gray-500">
                      {m.date} • {m.time}
                    </div>
                  </div>

                  {/* Party & Frigo */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-gray-800 truncate max-w-[200px]">
                      {m.partyName}
                    </div>
                    <div className="text-[11px] text-gray-600 font-mono flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span>{m.frigoName.split('-')[0].trim()}</span>
                    </div>
                  </div>

                  {/* Impact Summary 2-col */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs font-mono">
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold">Impact Poids</span>
                      <span className={`text-sm font-black ${isExit ? 'text-rose-600' : isEntry ? 'text-emerald-700' : 'text-gray-800'}`}>
                        {m.changeKg > 0 ? `+${m.changeKg.toLocaleString()}` : m.changeKg.toLocaleString()} Kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold">Palettes & Prix</span>
                      <span className="font-bold text-purple-900">
                        {m.changePallets > 0 ? `+${m.changePallets}` : m.changePallets} Pal.
                      </span>
                      {m.unitPriceHT && (
                        <span className="text-gray-600 text-[10px] block">
                          {m.unitPriceHT} DH/kg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {m.type === 'SORTIE_BL' && (
                      <button
                        onClick={() => handleOpenBL(m.documentRef)}
                        className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-[#0f62fe] border border-blue-200 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Consulter BL ({m.documentRef})</span>
                      </button>
                    )}

                    {m.type === 'ENTREE_ACHAT' && m.purchaseInvoiceId && (
                      <button
                        onClick={() => {
                          if (onEditPurchase) {
                            onEditPurchase(m.purchaseInvoiceId!);
                          } else {
                            const pur = purchaseInvoices.find(p => p.id === m.purchaseInvoiceId);
                            if (pur) setEditingPurchaseInvoice(pur);
                          }
                        }}
                        className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modifier Facture Achat</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Edit Purchase Invoice Modal */}
      {editingPurchaseInvoice && (
        <EditPurchaseInvoiceModal
          invoice={editingPurchaseInvoice}
          onClose={() => setEditingPurchaseInvoice(null)}
        />
      )}

    </div>
  );
};
