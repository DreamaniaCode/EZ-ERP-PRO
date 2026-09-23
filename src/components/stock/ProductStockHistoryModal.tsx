import React, { useState, useMemo, useEffect } from 'react';
import { Product, ColdStorageFrigo } from '../../types';
import { useERP } from '../../context/ERPContext';
import { ExportButtons } from '../common/ExportButtons';
import { exportProductHistoryPdf } from '../../utils/exportUtils';
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
  Pencil,
  DollarSign,
  TrendingUp,
  Boxes,
  Scale,
  ShieldCheck,
  Tag,
  Info
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
  const updateProduct = erp.updateProduct;

  const [activeTab, setActiveTab] = useState<'HISTORY' | 'INFO'>('HISTORY');
  const [frigoFilter, setFrigoFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState<PurchaseImportInvoice | null>(null);

  // Edit Product Sub-Modal State
  const [isEditingProduct, setIsEditingProduct] = useState<boolean>(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    category: 'Dattes Locales' as any,
    origin: 'Maroc',
    sellingPriceHT: 0,
    unitCostHT: 0,
    kgPerCarton: 5,
    cartonsPerPallet: 160,
    minStockAlertKg: 0,
    description: '',
  });

  useEffect(() => {
    if (product) {
      setProductFormData({
        name: product.name,
        category: product.category,
        origin: product.origin || 'Maroc',
        sellingPriceHT: product.sellingPriceHT || 0,
        unitCostHT: product.unitCostHT || 0,
        kgPerCarton: product.kgPerCarton || 5,
        cartonsPerPallet: product.cartonsPerPallet || 160,
        minStockAlertKg: product.minStockAlertKg || 0,
        description: product.description || '',
      });
    }
  }, [product]);

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

  // Financial & Logistics calculations
  const sellingPriceHT = product?.sellingPriceHT || 0;
  const unitCostHT = product?.unitCostHT || 0;
  const marginPerKg = Math.max(0, sellingPriceHT - unitCostHT);
  const marginPct = sellingPriceHT > 0 ? ((marginPerKg / sellingPriceHT) * 100).toFixed(1) : '0';
  const vatRate = product?.vatRate !== undefined ? product.vatRate : 0.20;
  const priceTTC = sellingPriceHT * (1 + vatRate);
  const totalStockCartons = (product?.kgPerCarton || 5) > 0 ? Math.round(effectiveTotalStockKg / (product?.kgPerCarton || 5)) : 0;
  const totalValuationCost = effectiveTotalStockKg * unitCostHT;
  const totalValuationSale = effectiveTotalStockKg * sellingPriceHT;
  const totalGrossMargin = Math.max(0, totalValuationSale - totalValuationCost);

  // Status
  const isOutOfStock = effectiveTotalStockKg <= 0;
  const isLowStock = !isOutOfStock && (product?.minStockAlertKg || 0) > 0 && effectiveTotalStockKg <= (product?.minStockAlertKg || 0);
  const stockStatusLabel = isOutOfStock ? 'RUPTURE DE STOCK' : isLowStock ? 'STOCK FAIBLE' : 'EN STOCK DISPONIBLE';

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    updateProduct(product.id, {
      ...productFormData,
      sellingPriceHT: Number(productFormData.sellingPriceHT),
      unitCostHT: Number(productFormData.unitCostHT),
      kgPerCarton: Number(productFormData.kgPerCarton),
      cartonsPerPallet: Number(productFormData.cartonsPerPallet),
      minStockAlertKg: Number(productFormData.minStockAlertKg),
      kgPerPallet: (Number(productFormData.kgPerCarton) || 5) * (Number(productFormData.cartonsPerPallet) || 160),
    });
    setIsEditingProduct(false);
    alert('Fiche produit et tarifs mis à jour avec succès !');
  };

  const handleExportStockPdf = () => {
    if (!product) return;
    exportProductHistoryPdf(
      product,
      filteredMovements,
      {
        effectiveStockKg: effectiveTotalStockKg,
        totalPallets: totalStockPallets,
        totalEntriesKg,
        totalExitsKg,
        frigoBreakdown: frigos.map(fr => {
          const fMvs = allMovements.filter(m => m.frigoId === fr.id || (m.frigoName && fr.name && (m.frigoName.includes(fr.name) || fr.name.includes(m.frigoName))));
          const fEntries = fMvs.filter(m => m.changeKg > 0).reduce((sum, m) => sum + m.changeKg, 0);
          const fExits = fMvs.filter(m => m.changeKg < 0).reduce((sum, m) => sum + Math.abs(m.changeKg), 0);
          const st = productStocks.find(s => s.frigoId === fr.id || s.frigoId === fr.code);
          const fKg = fEntries > 0 ? Math.max(0, fEntries - fExits) : (st?.quantityKg || 0);
          const fPal = st && st.quantityPallets > 0 ? st.quantityPallets : (fKg > 0 ? Math.max(1, Math.ceil(fKg / (product.kgPerPallet || 500))) : 0);
          return {
            frigoName: fr.name,
            quantityKg: fKg,
            quantityPallets: fPal
          };
        })
      }
    );
  };

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
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  {product.code}
                </span>
                <h2 className="font-bold text-base tracking-wide text-white">
                  Fiche Produit & Historique des Mouvements
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {product.name} ({product.category} • {product.origin || 'Maroc'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajuster Stock</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg transition hover:bg-[#262626] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-[#1f1f1f] text-white px-4 flex items-center justify-between border-b border-[#393939] shrink-0 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`py-2.5 px-4 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'border-[#0f62fe] text-white bg-[#262626]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique des Mouvements ({allMovements.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INFO')}
              className={`py-2.5 px-4 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'INFO'
                  ? 'border-[#0f62fe] text-white bg-[#262626]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Fiche Complète & Tarifs</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-1.5">
            <span className={`text-[10px] px-2.5 py-0.5 font-bold font-mono rounded border ${
              isOutOfStock ? 'bg-red-950 text-red-300 border-red-800' :
              isLowStock ? 'bg-amber-950 text-amber-300 border-amber-800' :
              'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {stockStatusLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingProduct(true)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-2.5 py-1 rounded flex items-center gap-1 transition cursor-pointer"
              title="Modifier les tarifs ou caractéristiques du produit"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Modifier Fiche</span>
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">

          {activeTab === 'HISTORY' && (
            <>

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

              {/* Export Button for Stock History with Direct PDF download */}
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
                onExportPdf={handleExportStockPdf}
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
        </>
      )}

      {/* TAB 2: FICHE COMPLÈTE DU PRODUIT & TARIFS */}
      {activeTab === 'INFO' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Product Identity & Main Specifications Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0f62fe] font-bold">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {product.code}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{product.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {product.category} • Origine: <b>{product.origin || 'Maroc'}</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-700" />
                  <span>Modifier les caractéristiques</span>
                </button>
              </div>
            </div>

            {product.description && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700">
                <span className="font-bold text-gray-900 block mb-1">Description / Notes :</span>
                {product.description}
              </div>
            )}

            {/* 3 Metrics Grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Grid 1: Tarification & Marge */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between text-emerald-900 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Tarification & Marges
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                    {marginPct}% Marge
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-gray-600">Prix Vente HT / kg :</span>
                    <span className="font-black text-sm text-emerald-800">{sellingPriceHT.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-gray-600">Coût Revient HT / kg :</span>
                    <span className="font-bold text-gray-800">{unitCostHT.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-gray-600">Marge Brute HT / kg :</span>
                    <span className="font-bold text-blue-700">+{marginPerKg.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-gray-600">TVA appliquée :</span>
                    <span className="text-gray-800">{(vatRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">Prix Vente TTC estimé :</span>
                    <span className="font-bold text-gray-900">{priceTTC.toFixed(2)} DH / kg</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Valorisation du Stock */}
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between text-purple-900 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    Valorisation du Stock Actuel
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-purple-100">
                    <span className="text-gray-600">Valeur au Coût HT :</span>
                    <span className="font-black text-sm text-purple-900">{totalValuationCost.toLocaleString()} DH</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-purple-100">
                    <span className="text-gray-600">Valeur Vénale Vente HT :</span>
                    <span className="font-bold text-emerald-800">{totalValuationSale.toLocaleString()} DH</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-purple-100">
                    <span className="text-gray-600">Plus-value Brute :</span>
                    <span className="font-bold text-blue-700">+{totalGrossMargin.toLocaleString()} DH</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">Quantité en Stock :</span>
                    <span className="font-bold text-gray-900">{effectiveTotalStockKg.toLocaleString()} Kg</span>
                  </div>
                </div>
              </div>

              {/* Grid 3: Conditionnement & Alertes */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-[#0f62fe]" />
                    Conditionnement & Logistique
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-blue-100">
                    <span className="text-gray-600">Poids par Colis / Carton :</span>
                    <span className="font-bold text-gray-900">{product.kgPerCarton || 5} Kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-blue-100">
                    <span className="text-gray-600">Colis par Palette :</span>
                    <span className="font-bold text-gray-900">{product.cartonsPerPallet || 160} colis</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-blue-100">
                    <span className="text-gray-600">Poids théorique Palette :</span>
                    <span className="font-bold text-purple-700">{product.kgPerPallet || ((product.kgPerCarton || 5) * (product.cartonsPerPallet || 160))} Kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-blue-100">
                    <span className="text-gray-600">Total Colis en Stock :</span>
                    <span className="font-bold text-gray-900">{totalStockCartons.toLocaleString()} colis</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">Seuil d'Alerte Minimum :</span>
                    <span className={`font-bold ${isLowStock ? 'text-amber-700 font-black' : 'text-gray-800'}`}>
                      {(product.minStockAlertKg || 0).toLocaleString()} Kg
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Detailed Breakdown per Cold Storage Frigo */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0f62fe]" />
                Répartition Détaillée par Entrepôt & Frigo
              </h4>
              <span className="text-xs text-gray-500 font-mono">
                {frigos.length} entrepôt(s) configuré(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {frigos.map(fr => {
                const fMvs = allMovements.filter(m => m.frigoId === fr.id || (m.frigoName && fr.name && (m.frigoName.includes(fr.name) || fr.name.includes(m.frigoName))));
                const fEntries = fMvs.filter(m => m.changeKg > 0).reduce((sum, m) => sum + m.changeKg, 0);
                const fExits = fMvs.filter(m => m.changeKg < 0).reduce((sum, m) => sum + Math.abs(m.changeKg), 0);
                const st = productStocks.find(s => s.frigoId === fr.id || s.frigoId === fr.code);
                const fKg = fEntries > 0 ? Math.max(0, fEntries - fExits) : (st?.quantityKg || 0);
                const fPal = st && st.quantityPallets > 0 ? st.quantityPallets : (fKg > 0 ? Math.max(1, Math.ceil(fKg / (product.kgPerPallet || 500))) : 0);
                const fCartons = (product.kgPerCarton || 5) > 0 ? Math.round(fKg / (product.kgPerCarton || 5)) : 0;
                const pctOfTotal = effectiveTotalStockKg > 0 ? Math.min(100, Math.round((fKg / effectiveTotalStockKg) * 100)) : 0;

                return (
                  <div key={fr.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-xs text-gray-900 block">{fr.name}</span>
                        <span className="text-[10px] text-gray-500">{fr.location || 'Site Principal'} • Capacité: {fr.capacityPallets || 500} pal</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${fKg > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                        {fKg > 0 ? `${pctOfTotal}% du stock` : 'Vide (0 kg)'}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#0f62fe] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pctOfTotal}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                      <div className="bg-white p-1.5 rounded border border-gray-200">
                        <span className="text-[9px] text-gray-500 block uppercase font-sans font-bold">Poids Net</span>
                        <span className="font-bold text-gray-900">{fKg.toLocaleString()} kg</span>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-gray-200">
                        <span className="text-[9px] text-gray-500 block uppercase font-sans font-bold">Palettes</span>
                        <span className="font-bold text-purple-700">{fPal} pal.</span>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-gray-200">
                        <span className="text-[9px] text-gray-500 block uppercase font-sans font-bold">Colis</span>
                        <span className="font-bold text-gray-700">{fCartons.toLocaleString()} c.</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-1 border-t border-gray-200/60">
                      <span className="text-emerald-700 font-semibold">+ Entrées: {fEntries.toLocaleString()} kg</span>
                      <span className="text-rose-600 font-semibold">- Sorties: {fExits.toLocaleString()} kg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>

    {/* Modal Footer */}
    <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center shrink-0">
      <span className="text-xs text-gray-600 font-mono">
        {activeTab === 'HISTORY' ? `${filteredMovements.length} mouvement(s) affiché(s)` : `Produit ${product.code} • ${product.name}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExportStockPdf}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          title="Télécharger directement la fiche et l'historique en fichier PDF"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Télécharger PDF</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-xs transition cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>

  </div>

  {/* Edit Purchase Invoice Modal */}
  {editingPurchaseInvoice && (
    <EditPurchaseInvoiceModal
      invoice={editingPurchaseInvoice}
      onClose={() => setEditingPurchaseInvoice(null)}
    />
  )}

  {/* Quick Edit Product Modal */}
  {isEditingProduct && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-300 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in">
        <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
          <h3 className="font-bold text-sm font-mono flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-400" />
            <span>Modifier les Caractéristiques du Produit ({product.code})</span>
          </h3>
          <button 
            type="button"
            onClick={() => setIsEditingProduct(false)}
            className="text-gray-400 hover:text-white font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleUpdateProductSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Désignation *</label>
              <input
                type="text"
                required
                value={productFormData.name}
                onChange={e => setProductFormData({ ...productFormData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Catégorie *</label>
              <select
                value={productFormData.category}
                onChange={e => setProductFormData({ ...productFormData, category: e.target.value as any })}
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
                value={productFormData.origin}
                onChange={e => setProductFormData({ ...productFormData, origin: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
              />
            </div>

            <div>
              <label className="block font-bold text-emerald-900 mb-1">Prix Vente HT / kg (DH) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={productFormData.sellingPriceHT}
                onChange={e => setProductFormData({ ...productFormData, sellingPriceHT: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-lg focus:bg-white focus:outline-none focus:border-emerald-600 font-mono font-bold text-emerald-900"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Coût de Revient Unitaire HT / kg (DH)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={productFormData.unitCostHT}
                onChange={e => setProductFormData({ ...productFormData, unitCostHT: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Seuil Alerte Stock Minimum (Kg)</label>
              <input
                type="number"
                min="0"
                value={productFormData.minStockAlertKg}
                onChange={e => setProductFormData({ ...productFormData, minStockAlertKg: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-lg focus:bg-white focus:outline-none focus:border-amber-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Poids par Colis (Kg)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={productFormData.kgPerCarton}
                onChange={e => setProductFormData({ ...productFormData, kgPerCarton: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Cartons par Palette</label>
              <input
                type="number"
                min="1"
                value={productFormData.cartonsPerPallet}
                onChange={e => setProductFormData({ ...productFormData, cartonsPerPallet: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe] font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Description / Notes</label>
              <textarea
                rows={2}
                value={productFormData.description}
                onChange={e => setProductFormData({ ...productFormData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsEditingProduct(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              Enregistrer les Modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
    </div>
  );
};
