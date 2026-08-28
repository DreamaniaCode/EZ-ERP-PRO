import React, { useState, useMemo } from 'react';
import { Product, ColdStorageFrigo } from '../../types';
import { useERP } from '../../context/ERPContext';
import { ExportButtons } from '../common/ExportButtons';
import { 
  X, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  SlidersHorizontal, 
  Search, 
  Calendar, 
  Building2, 
  FileText, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  Clock,
  Pencil
} from 'lucide-react';
import { EditPurchaseInvoiceModal } from '../purchases/EditPurchaseInvoiceModal';
import { PurchaseImportInvoice } from '../../types';

interface ProductStockHistoryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBL?: (blNumber: string) => void;
}

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
  partyName: string; // Client, Supplier, or Author
  changeKg: number; // positive for entry, negative for exit
  changePallets: number; // positive for entry, negative for exit
  unitPriceHT?: number;
  totalHT?: number;
  status?: string;
  notes?: string;
  purchaseInvoiceId?: string;
}

export const ProductStockHistoryModal: React.FC<ProductStockHistoryModalProps> = ({
  product,
  isOpen,
  onClose,
  onNavigateToBL
}) => {
  const erp = useERP();
  const deliveryNotes = erp.deliveryNotes || [];
  const purchaseInvoices = erp.purchaseInvoices || [];
  const inventoryCounts = erp.inventoryCounts || [];
  const stocks = erp.stocks || [];
  const frigos = erp.frigos || [];
  const adjustStock = erp.adjustStock;

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
  const productStocks = (product ? stocks.filter(s => s.productId === product.id || s.productId === product.code) : []);
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

  // *** GUARD: Must come AFTER all hooks ***
  if (!isOpen || !product) return null;

  // Handle manual adjustment submission
  const handleManualAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
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
    window.history.pushState({}, '', `/?bl=${blNumber}`);
    if (onNavigateToBL) {
      onNavigateToBL(blNumber);
      onClose();
    } else {
      window.dispatchEvent(new Event('popstate'));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Modal Header */}
        <div className="bg-[#161616] text-white p-4 flex justify-between items-center border-b border-[#393939] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0f62fe] flex items-center justify-center text-white font-bold shadow">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  {product.code}
                </span>
                <h2 className="font-bold text-base tracking-wide text-white">
                  Historique Chronologique des Mouvements & BLs
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {product.name} ({product.category} • {product.origin})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Ajuster Stock</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg transition hover:bg-[#262626]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">

          {/* Top KPI Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Current Stock */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Stock Actuel Global</span>
                <div className="text-lg font-extrabold font-mono text-gray-900 mt-0.5">
                  {effectiveTotalStockKg.toLocaleString()} <span className="text-xs font-normal text-gray-500">Kg</span>
                </div>
                <div className="text-xs text-gray-600 font-semibold">{totalStockPallets} Palettes</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0f62fe] flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>

            {/* Total Exits (BLs) */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Cumul Sorties (BLs)</span>
                <div className="text-lg font-extrabold font-mono text-rose-600 mt-0.5">
                  - {totalExitsKg.toLocaleString()} <span className="text-xs font-normal text-gray-500">Kg</span>
                </div>
                <div className="text-xs text-gray-500">
                  {allMovements.filter(m => m.type === 'SORTIE_BL').length} Bons de livraison
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* Total Entries */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Cumul Entrées (Achats)</span>
                <div className="text-lg font-extrabold font-mono text-emerald-600 mt-0.5">
                  + {totalEntriesKg.toLocaleString()} <span className="text-xs font-normal text-gray-500">Kg</span>
                </div>
                <div className="text-xs text-gray-500">
                  {allMovements.filter(m => m.type === 'ENTREE_ACHAT').length} Réceptions / Conteneurs
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            {/* Cold Storage Locations */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Répartition Frigos</span>
              <div className="mt-1 space-y-1 max-h-12 overflow-y-auto pr-1">
                {frigos.map(fr => {
                  const fMvs = allMovements.filter(m => m.frigoId === fr.id || (m.frigoName && fr.name && (m.frigoName.includes(fr.name) || fr.name.includes(m.frigoName))));
                  const fEntries = fMvs.filter(m => m.changeKg > 0).reduce((sum, m) => sum + m.changeKg, 0);
                  const fExits = fMvs.filter(m => m.changeKg < 0).reduce((sum, m) => sum + Math.abs(m.changeKg), 0);
                  const st = productStocks.find(s => s.frigoId === fr.id || s.frigoId === fr.code);
                  const fKg = fEntries > 0 ? Math.max(0, fEntries - fExits) : (st?.quantityKg || 0);
                  const fPal = st && st.quantityPallets > 0 ? st.quantityPallets : (fKg > 0 ? Math.max(1, Math.ceil(fKg / (product.kgPerPallet || 500))) : 0);
                  if (fKg <= 0 && (!st || st.quantityKg <= 0)) return null;
                  return (
                    <div key={fr.id} className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-600 truncate max-w-[110px]">{fr.name.split('-')[0].trim()}</span>
                      <span className="font-bold text-gray-900">{fKg.toLocaleString()} kg ({fPal} pal)</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Manual Stock Adjustment Drawer/Form */}
          {showManualForm && (
            <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl shadow-inner animate-fade-in space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-blue-900 uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#0f62fe]" />
                  Ajustement Manuel / Correction directe de stock
                </span>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="text-gray-500 hover:text-gray-800 text-xs"
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
                    className="w-full bg-[#0f62fe] hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded shadow transition"
                  >
                    Valider Ajustement
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            
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
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded text-xs font-semibold transition flex items-center gap-1"
                title="Inverser l'ordre chronologique"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                <span>{sortOrder === 'desc' ? 'Plus récents en premier' : 'Plus anciens en premier'}</span>
              </button>
            </div>

            {/* Search Input & Export */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher par BL, Client, Supplier..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full carbon-input pl-8 py-1.5 text-xs font-mono"
                />
              </div>

              {/* Export Button for Stock History */}
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
              />
            </div>

          </div>

          {/* Movements Log Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#0f62fe] font-bold rounded text-[11px] border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                                title="Voir la fiche détaillée du Bon de Livraison (BL)"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Voir BL</span>
                              </button>
                            )}

                            {m.type === 'ENTREE_ACHAT' && m.purchaseInvoiceId && (
                              <button
                                onClick={() => {
                                  const pur = purchaseInvoices.find(p => p.id === m.purchaseInvoiceId);
                                  if (pur) setEditingPurchaseInvoice(pur);
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded text-[11px] border border-amber-200 transition inline-flex items-center gap-1 cursor-pointer"
                                title="Modifier cette facture d'achat"
                              >
                                <Pencil className="w-3 h-3" />
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
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-gray-600 font-mono">
            {filteredMovements.length} mouvement(s) affiché(s)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-xs transition cursor-pointer"
          >
            Fermer
          </button>
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
