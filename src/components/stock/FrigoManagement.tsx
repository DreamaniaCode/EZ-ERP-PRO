import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { ColdStorageFrigo, Product, PurchaseImportInvoice } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { StockTransferModal } from './StockTransferModal';
import { FrigoDetailPage } from './FrigoDetailPage';
import { ProductKpiCardsSection } from './ProductKpiCardsSection';
import { ProductStockHistoryModal } from './ProductStockHistoryModal';
import { EditPurchaseInvoiceModal } from '../purchases/EditPurchaseInvoiceModal';
import { SupplierPaymentModal } from '../purchases/SupplierPaymentModal';
import { 
  compileUnifiedFrigoMovements, 
  calculateProductAccumulation,
  UnifiedFrigoMovement,
  ProductAccumulationSummary 
} from '../../utils/frigoStockMovements';
import { computeSynchronizedStocks, isMatchingFrigo } from '../../utils/stockReconciler';

import { 
  Warehouse, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Phone, 
  MessageSquare, 
  MapPin, 
  UserCheck, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Layers, 
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  Filter,
  FileText,
  Boxes,
  RotateCcw,
  Camera,
  History,
  TrendingUp,
  X,
  Ship,
  CreditCard,
  Pencil,
  Building2,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Upload
} from 'lucide-react';

interface FrigoManagementProps {
  onEditFrigo?: (id: string) => void;
  onNewFrigo?: () => void;
  onViewFrigoDetail?: (id: string) => void;
  onViewProductHistory?: (productId: string) => void;
  onViewClient?: (clientId: string) => void;
  onNavigateToImport?: (frigoId?: string) => void;
  initialFrigoId?: string | null;
}

export const FrigoManagement: React.FC<FrigoManagementProps> = ({ 
  onEditFrigo, 
  onNewFrigo, 
  onViewFrigoDetail,
  onViewProductHistory, 
  onViewClient,
  onNavigateToImport,
  initialFrigoId 
}) => {
  const { 
    frigos, 
    stocks, 
    products, 
    deliveryNotes, 
    purchaseInvoices,
    inventoryCounts,
    stockMovements,
    addFrigo, 
    updateFrigo, 
    deleteFrigo, 
    clearStocks,
    deletePurchaseInvoice
  } = useERP();

  // Selected Frigo Filter ('ALL' or a specific frigo.id)
  const [selectedFrigoId, setSelectedFrigoId] = useState<string | 'ALL'>(initialFrigoId || 'ALL');

  // Selected Product Filter ('ALL' or a specific product.id - updated by clicking KPI cards)
  const [selectedProductId, setSelectedProductId] = useState<string | 'ALL'>('ALL');

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'MOVEMENTS' | 'CUMUL_PRODUCTS' | 'PURCHASE_INVOICES' | 'WAREHOUSES'>('MOVEMENTS');

  // Movement Type Filter
  const [movementTypeFilter, setMovementTypeFilter] = useState<'ALL' | 'ENTREES' | 'SORTIES' | 'TRANSFERTS'>('ALL');

  // Search Term
  const [searchTerm, setSearchTerm] = useState('');

  // Date filters
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingFrigo, setEditingFrigo] = useState<ColdStorageFrigo | null>(null);
  const [selectedFrigoDetailId, setSelectedFrigoDetailId] = useState<string | null>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState<PurchaseImportInvoice | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<PurchaseImportInvoice | null>(null);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(true);

  // Form State for Add / Edit Frigo
  const [formData, setFormData] = useState<Omit<ColdStorageFrigo, 'id' | 'code'>>({
    name: '',
    location: '',
    managerName: '',
    managerPhone: '',
    whatsappGroup: '',
    whatsappGroupLink: '',
    capacityPallets: 1000,
  });

  // Target Active Frigo object if specific
  const activeFrigoObj = useMemo(() => {
    if (!selectedFrigoId || selectedFrigoId === 'ALL') return null;
    return frigos.find(f => f.id === selectedFrigoId) || null;
  }, [frigos, selectedFrigoId]);

  // Warehouse display label
  const warehouseDisplayLabel = activeFrigoObj ? activeFrigoObj.name : 'Tous les Entrepôts Frigorifiques';

  // =========================================================================
  // 1. UNIFIED MOVEMENTS COMPILATION (Entrées, Sorties, Date, Heure, Quantité)
  // =========================================================================
  const allFrigoMovements = useMemo(() => {
    return compileUnifiedFrigoMovements({
      frigos,
      products,
      stocks,
      deliveryNotes,
      purchaseInvoices,
      inventoryCounts,
      stockMovements,
      targetFrigoId: selectedFrigoId,
      targetProductId: 'ALL' // We compile all and filter later for smooth KPI counts
    });
  }, [frigos, products, stocks, deliveryNotes, purchaseInvoices, inventoryCounts, stockMovements, selectedFrigoId]);

  // =========================================================================
  // 2. PRODUCT ACCUMULATION SUMMARY ("CUMULE EN PRODUITS")
  // =========================================================================
  const productSummaries = useMemo(() => {
    return calculateProductAccumulation({
      products,
      stocks,
      movements: allFrigoMovements,
      frigos,
      targetFrigoId: selectedFrigoId
    });
  }, [products, stocks, allFrigoMovements, frigos, selectedFrigoId]);

  // =========================================================================
  // 3. FILTERED MOVEMENTS FOR THE JOURNAL VIEW
  // =========================================================================
  const filteredMovements = useMemo(() => {
    return allFrigoMovements.filter(mv => {
      // Product Filter
      if (selectedProductId !== 'ALL' && mv.productId !== selectedProductId && mv.productCode !== selectedProductId) {
        return false;
      }

      // Movement Type Filter
      if (movementTypeFilter === 'ENTREES' && !mv.isEntry) return false;
      if (movementTypeFilter === 'SORTIES' && mv.isEntry) return false;
      if (movementTypeFilter === 'TRANSFERTS' && mv.type !== 'TRANSFERT_INTER_FRIGO') return false;

      // Date Range Filter
      if (startDateFilter) {
        const mvDateIso = mv.rawDate.slice(0, 10);
        if (mvDateIso < startDateFilter) return false;
      }
      if (endDateFilter) {
        const mvDateIso = mv.rawDate.slice(0, 10);
        if (mvDateIso > endDateFilter) return false;
      }

      // Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDoc = mv.documentRef?.toLowerCase().includes(term);
        const matchesParty = mv.partyName?.toLowerCase().includes(term);
        const matchesProduct = mv.productName?.toLowerCase().includes(term) || mv.productCode?.toLowerCase().includes(term);
        const matchesNotes = mv.notes?.toLowerCase().includes(term);
        const matchesFrigo = mv.frigoName?.toLowerCase().includes(term);
        if (!matchesDoc && !matchesParty && !matchesProduct && !matchesNotes && !matchesFrigo) {
          return false;
        }
      }

      return true;
    });
  }, [allFrigoMovements, selectedProductId, movementTypeFilter, startDateFilter, endDateFilter, searchTerm]);

  // Filtered Product Summaries for Tab 2
  const filteredProductSummaries = useMemo(() => {
    return productSummaries.filter(p => {
      // In-stock filter
      if (onlyInStock && p.currentStockKg <= 0) {
        return false;
      }
      if (selectedProductId !== 'ALL' && p.productId !== selectedProductId && p.productCode !== selectedProductId) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesCode = p.productCode.toLowerCase().includes(term);
        const matchesName = p.productName.toLowerCase().includes(term);
        const matchesCat = p.category.toLowerCase().includes(term);
        if (!matchesCode && !matchesName && !matchesCat) return false;
      }
      return true;
    });
  }, [productSummaries, selectedProductId, searchTerm, onlyInStock]);

  // Filtered Purchase / Entry Invoices for Tab 3
  const filteredPurchaseInvoices = useMemo(() => {
    return purchaseInvoices.filter(pur => {
      // Frigo filter
      if (selectedFrigoId !== 'ALL') {
        const matchesFrigo = pur.targetFrigoId === selectedFrigoId || 
          frigos.find(f => f.id === selectedFrigoId)?.name === pur.targetFrigoId ||
          frigos.find(f => f.id === selectedFrigoId)?.code === pur.targetFrigoId ||
          (!pur.targetFrigoId && frigos.length === 1);
        if (!matchesFrigo) return false;
      }

      // Product filter
      if (selectedProductId !== 'ALL') {
        const hasProduct = pur.items?.some(it => 
          it.productId === selectedProductId || 
          it.productCode === selectedProductId
        );
        if (!hasProduct) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = (pur.invoiceNumber || '').toLowerCase().includes(term) ||
          (pur.supplierName || '').toLowerCase().includes(term) ||
          (pur.containerNumber || '').toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Date filter
      if (startDateFilter) {
        const arrivalDate = pur.dateArrival ? pur.dateArrival.slice(0, 10) : '';
        if (arrivalDate && arrivalDate < startDateFilter) return false;
      }
      if (endDateFilter) {
        const arrivalDate = pur.dateArrival ? pur.dateArrival.slice(0, 10) : '';
        if (arrivalDate && arrivalDate > endDateFilter) return false;
      }

      return true;
    });
  }, [purchaseInvoices, selectedFrigoId, selectedProductId, searchTerm, startDateFilter, endDateFilter, frigos]);

  // Selected Product helper object
  const selectedProductObj = useMemo(() => {
    if (selectedProductId === 'ALL') return null;
    return products.find(p => p.id === selectedProductId || p.code === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Warehouse Statistics per frigo (Guaranteed 100% Synchronized with Purchases & BLs)
  const frigoStatsList = useMemo(() => {
    return frigos.map(f => {
      const { totalConsolidatedKg, totalConsolidatedPallets } = computeSynchronizedStocks({
        products,
        frigos,
        stocks,
        purchaseInvoices,
        deliveryNotes,
        inventoryCounts,
        stockMovements,
        selectedFrigoId: f.id,
      });

      const totalKg = totalConsolidatedKg;
      const totalPallets = totalConsolidatedPallets;
      const cap = f.capacityPallets || 1000;
      const occPercent = Math.min(100, Math.round((totalPallets / cap) * 100));
      const mvsCount = allFrigoMovements.filter(m => isMatchingFrigo(f, m.frigoId) || isMatchingFrigo(f, m.frigoName)).length;
      return {
        ...f,
        totalKg,
        totalPallets,
        occPercent,
        mvsCount,
      };
    });
  }, [frigos, products, stocks, purchaseInvoices, deliveryNotes, inventoryCounts, stockMovements, allFrigoMovements]);

  // Global Warehouse Totals
  const totalOccupiedPallets = useMemo(() => {
    return frigoStatsList.reduce((acc, f) => acc + f.totalPallets, 0);
  }, [frigoStatsList]);

  const totalCapacityPallets = useMemo(() => {
    return frigos.reduce((acc, f) => acc + (f.capacityPallets || 1000), 0);
  }, [frigos]);

  const totalOccupiedKg = useMemo(() => {
    return frigoStatsList.reduce((acc, f) => acc + f.totalKg, 0);
  }, [frigoStatsList]);

  const globalOccupationRate = totalCapacityPallets > 0 
    ? Math.min(100, Math.round((totalOccupiedPallets / totalCapacityPallets) * 100))
    : 0;

  // Handlers for Add / Edit Frigo Modal
  const handleOpenAdd = () => {
    if (onNewFrigo) {
      onNewFrigo();
      return;
    }
    setFormData({
      name: '',
      location: 'Casablanca',
      managerName: '',
      managerPhone: '+212 6',
      whatsappGroup: 'Groupe WhatsApp Frigo',
      whatsappGroupLink: '',
      capacityPallets: 1000,
    });
    setEditingFrigo(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (frigo: ColdStorageFrigo) => {
    if (onEditFrigo) {
      onEditFrigo(frigo.id);
      return;
    }
    setEditingFrigo(frigo);
    setFormData({
      name: frigo.name,
      location: frigo.location,
      managerName: frigo.managerName,
      managerPhone: frigo.managerPhone,
      whatsappGroup: frigo.whatsappGroup,
      whatsappGroupLink: frigo.whatsappGroupLink,
      capacityPallets: frigo.capacityPallets,
    });
    setShowAddModal(true);
  };

  const handleSaveFrigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Veuillez saisir le nom du frigo.');
      return;
    }

    if (editingFrigo) {
      updateFrigo(editingFrigo.id, formData);
    } else {
      addFrigo(formData);
    }

    setShowAddModal(false);
  };

  const handleDeleteFrigo = (frigo: ColdStorageFrigo) => {
    const frigoStocks = stocks.filter(s => s.frigoId === frigo.id && s.quantityKg > 0);
    if (frigoStocks.length > 0) {
      alert(`Impossible de supprimer le frigo "${frigo.name}" car il contient du stock actif. Veuillez d'abord transférer ou vider le stock.`);
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le frigo "${frigo.name}" ?`)) {
      deleteFrigo(frigo.id);
    }
  };

  const handleClearFrigoStock = async (frigo: ColdStorageFrigo) => {
    if (window.confirm(`⚠️ Êtes-vous sûr de vouloir VIDER (remettre à 0 Kg) tous les stocks du frigo "${frigo.name}" ?`)) {
      await clearStocks(frigo.id);
      alert(`Le stock du frigo "${frigo.name}" a été vidé avec succès (0 Kg, 0 Palettes).`);
    }
  };

  // Export Data for Movements
  const movementsExportData = useMemo(() => {
    return filteredMovements.map(m => ({
      'Date': m.date,
      'Heure': m.time,
      'Type de Mouvement': m.type.replace(/_/g, ' '),
      'Sens Flux': m.isEntry ? 'ENTRÉE (+)' : 'SORTIE (-)',
      'N° Document': m.documentRef,
      'Code Produit': m.productCode,
      'Désignation Produit': m.productName,
      'Quantité Kg': m.signedKg,
      'Quantité Palettes': m.signedPallets,
      'Quantité Colis': m.signedCartons,
      'Frigo / Entrepôt': m.frigoName,
      'Tiers (Client / Fournisseur)': m.partyName,
      'Prix Unitaire HT': m.unitPriceHT || 0,
      'Montant Total HT (DH)': m.totalHT || 0,
      'Statut Document / Quai': m.status || 'Validé',
      'Remarques / Notes': m.notes || '-'
    }));
  }, [filteredMovements]);

  // Export Data for Product Accumulation
  const accumulationExportData = useMemo(() => {
    return filteredProductSummaries.map(p => ({
      'Code SKU': p.productCode,
      'Désignation Produit': p.productName,
      'Catégorie': p.category,
      'Cumul Entrées (Kg)': p.totalEntriesKg,
      'Entrées (Colis)': p.totalEntriesCartons,
      'Entrées (Palettes)': p.totalEntriesPallets,
      'Cumul Sorties (Kg)': p.totalExitsKg,
      'Sorties (Colis)': p.totalExitsCartons,
      'Sorties (Palettes)': p.totalExitsPallets,
      'Stock Restant (Kg)': p.currentStockKg,
      'Stock Restant (Colis)': p.currentStockCartons,
      'Stock Restant (Palettes)': p.currentStockPallets,
      'Prix Revient HT (DH)': p.unitCostHT,
      'Prix Vente HT (DH)': p.sellingPriceHT,
      'Valorisation Coût HT (DH)': p.totalValuationCostHT,
      'Valeur Marchande Vente HT (DH)': p.totalValuationSaleHT,
      'Taux de Rotation / Sortie': `${p.turnoverRatePercent}%`,
      'Dernier Mouvement Date': p.lastMovementDate || '-',
      'Dernier Mouvement Heure': p.lastMovementTime || '-',
      'Statut Stock': p.stockStatus
    }));
  }, [filteredProductSummaries]);

  // Export Data for Purchase Invoices
  const purchasesExportData = useMemo(() => {
    return filteredPurchaseInvoices.map(pur => ({
      'N° Facture': pur.invoiceNumber,
      'N° Conteneur': pur.containerNumber || '-',
      'Fournisseur': pur.supplierName,
      'Date Arrivée': pur.dateArrival,
      'Frigo Réception': frigos.find(f => f.id === pur.targetFrigoId)?.name || 'Frigo',
      'Total Colis': pur.items?.reduce((acc, i) => acc + (i.quantityCartons || 0), 0) || 0,
      'Poids Pesé Total (Kg)': pur.items?.reduce((acc, i) => acc + (i.quantityKg || 0), 0) || 0,
      'Montant Total Landed HT (DH)': pur.totalLandedCostHT || 0,
      'Montant Réglé (DH)': pur.paidAmount || 0,
      'Solde Dû (DH)': pur.remainingBalance !== undefined ? pur.remainingBalance : ((pur.totalLandedCostHT || 0) - (pur.paidAmount || 0)),
      'Statut Paiement': pur.paymentStatus || 'NON_PAYÉ'
    }));
  }, [filteredPurchaseInvoices, frigos]);

  // Detailed view of a single warehouse page
  if (selectedFrigoDetailId) {
    return (
      <FrigoDetailPage
        frigoId={selectedFrigoDetailId}
        onBack={() => setSelectedFrigoDetailId(null)}
        onViewProductHistory={onViewProductHistory}
        onViewClient={onViewClient}
        onNavigateToImport={onNavigateToImport}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in" id="frigo-management-page">

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & WORKSPACE CONTROL BAR                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        
        {/* Title & Warehouse Info */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-[#0f62fe] rounded-xl border border-blue-200 shadow-xs shrink-0">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">
                Gestion des Entrepôts Frigorifiques & Mouvements
              </h1>
              {selectedFrigoId !== 'ALL' && activeFrigoObj && (
                <span className="text-xs font-mono font-bold text-[#0f62fe] px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                  {activeFrigoObj.code}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Journal précis des flux (Entrées / Sorties avec Date & Heure) • Cumul par produit • Factures d'Achat Modifiables • Cartes KPI
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Export Buttons */}
          <ExportButtons 
            filename={`Mouvements_Frigo_${selectedFrigoId === 'ALL' ? 'Tous' : selectedFrigoId}`} 
            title={`RAPPORT SITUATION & MOUVEMENTS FRIGO - ${warehouseDisplayLabel.toUpperCase()}`}
            excelData={
              activeTab === 'CUMUL_PRODUCTS' ? accumulationExportData :
              activeTab === 'PURCHASE_INVOICES' ? purchasesExportData :
              movementsExportData
            }
            pdfElementId="frigo-management-page"
          />

          {/* Import Stock */}
          {onNavigateToImport && (
            <button
              onClick={() => onNavigateToImport(selectedFrigoId !== 'ALL' ? selectedFrigoId : undefined)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs px-3 py-2 rounded-lg transition shadow-xs cursor-pointer"
              title="Importer des mouvements ou arrivages de stock (Excel / CSV / PDF)"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-200" />
              <span>Importer Stock</span>
            </button>
          )}

          {/* Inter-frigo Transfer */}
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-3 py-2 rounded-lg transition shadow-xs cursor-pointer"
            title="Transférer du stock d'un frigo vers un autre"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-200" />
            <span>Transfert Inter-Frigo</span>
          </button>

          {/* New Warehouse */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-[#0f62fe] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Frigo</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. PROMINENT FRIGO SELECTOR STRIP (FACILE À TROUVER & BIEN TRIÉ)           */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-[#0f62fe]" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Sélectionnez un Entrepôt Frigorifique (Accès Immédiat) :
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-gray-500 font-mono">
            {frigos.length} entrepôt{frigos.length > 1 ? 's' : ''} configuré{frigos.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: ALL FRIGOS (VUE CONSOLIDÉE) */}
          <div
            onClick={() => setSelectedFrigoId('ALL')}
            className={`cursor-pointer p-3.5 rounded-xl transition-all border-2 flex flex-col justify-between relative ${
              selectedFrigoId === 'ALL'
                ? 'bg-blue-50/80 border-[#0f62fe] shadow-sm ring-2 ring-blue-500/20'
                : 'bg-gray-50/70 border-gray-200 hover:border-gray-300 hover:bg-gray-100/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  selectedFrigoId === 'ALL' ? 'bg-[#0f62fe] text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  MULTI-SITES
                </span>
                {selectedFrigoId === 'ALL' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#0f62fe]">
                    <Check className="w-3.5 h-3.5" /> Actif
                  </span>
                )}
              </div>
              <h3 className="font-bold text-xs text-gray-900">
                🏢 Tous les Frigos (Vue Consolidée)
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Totalité des stocks et des flux de l'entreprise
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200/80 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-emerald-700">
                {(totalOccupiedKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} T ({totalOccupiedKg.toLocaleString()} Kg)
              </span>
              <span className="text-gray-600 font-semibold">
                {totalOccupiedPallets} Pal.
              </span>
            </div>
          </div>

          {/* Individual Frigo Cards */}
          {frigoStatsList.map(frigo => {
            const isSelected = selectedFrigoId === frigo.id;
            return (
              <div
                key={frigo.id}
                onClick={() => setSelectedFrigoId(frigo.id)}
                className={`cursor-pointer p-3.5 rounded-xl transition-all border-2 flex flex-col justify-between relative ${
                  isSelected
                    ? 'bg-blue-50/80 border-[#0f62fe] shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}>
                      {frigo.code}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      {isSelected ? (
                        <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#0f62fe]">
                          <Check className="w-3.5 h-3.5" /> Actif
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-gray-500 flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" /> {frigo.location || 'Site'}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-xs text-gray-900 line-clamp-1">
                    🏭 {frigo.name}
                  </h3>

                  {/* Occupation Gauge & Info */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">Occupation:</span>
                      <span className="font-bold text-gray-800">{frigo.totalPallets} / {frigo.capacityPallets} Pal. ({frigo.occPercent}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          frigo.occPercent >= 90 ? 'bg-rose-500' : frigo.occPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, frigo.occPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/80 flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-emerald-700">
                    {(frigo.totalKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} T ({frigo.totalKg.toLocaleString()} Kg)
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(frigo);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Modifier cet entrepôt"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewFrigoDetail) onViewFrigoDetail(frigo.id);
                        else setSelectedFrigoDetailId(frigo.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded"
                      title="Voir la fiche détaillée du quai"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card Add Frigo */}
          <div
            onClick={handleOpenAdd}
            className="cursor-pointer p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0f62fe] hover:bg-blue-50/30 flex flex-col items-center justify-center text-center gap-1.5 text-gray-500 hover:text-[#0f62fe] transition-all min-h-[120px]"
          >
            <div className="p-2 bg-gray-100 rounded-full text-gray-600">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold font-mono">+ Ajouter un Entrepôt</span>
            <span className="text-[10px] text-gray-400">Nouveau site frigo</span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. CLICKABLE PRODUCT KPI CARDS SECTION (PRO & INTERACTIVE)                */}
      {/* ========================================================================= */}
      <ProductKpiCardsSection
        productSummaries={productSummaries}
        selectedProductId={selectedProductId}
        onSelectProduct={(pId) => setSelectedProductId(pId)}
        onOpenProductHistory={(prd) => onViewProductHistory ? onViewProductHistory(prd.id) : setSelectedProductForHistory(prd)}
        products={products}
        warehouseName={warehouseDisplayLabel}
        onlyInStock={onlyInStock}
        onToggleOnlyInStock={(val) => setOnlyInStock(val)}
      />

      {/* ========================================================================= */}
      {/* 4. MAIN TABS NAVIGATION (4 ONGLETS CLAIRS & BIEN TRIÉS)                    */}
      {/* ========================================================================= */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs space-y-3">
        
        {/* Tab Buttons & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 pb-3">
          
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-semibold overflow-x-auto">
            
            {/* Tab 1: Mouvements */}
            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-white text-[#0f62fe] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>1. Journal des Mouvements</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'MOVEMENTS' ? 'bg-blue-50 text-[#0f62fe]' : 'bg-gray-200 text-gray-700'
              }`}>
                {filteredMovements.length}
              </span>
            </button>

            {/* Tab 2: Cumul Produits */}
            <button
              onClick={() => setActiveTab('CUMUL_PRODUCTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'CUMUL_PRODUCTS'
                  ? 'bg-white text-[#0f62fe] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>2. Cumul & Situation par Produit</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'CUMUL_PRODUCTS' ? 'bg-blue-50 text-[#0f62fe]' : 'bg-gray-200 text-gray-700'
              }`}>
                {filteredProductSummaries.length}
              </span>
            </button>

            {/* Tab 3: Factures d'Entrée & Achats (NEW) */}
            <button
              onClick={() => setActiveTab('PURCHASE_INVOICES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'PURCHASE_INVOICES'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Ship className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Factures d'Entrée & Réceptions</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'PURCHASE_INVOICES' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-700'
              }`}>
                {filteredPurchaseInvoices.length}
              </span>
            </button>

            {/* Tab 4: Entrepôts & Capacités */}
            <button
              onClick={() => setActiveTab('WAREHOUSES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'WAREHOUSES'
                  ? 'bg-white text-[#0f62fe] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>4. Entrepôts & Capacités</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'WAREHOUSES' ? 'bg-blue-50 text-[#0f62fe]' : 'bg-gray-200 text-gray-700'
              }`}>
                {frigos.length}
              </span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par BL, Facture, produit, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0f62fe]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>

        {/* Sub-Filters Toolbar (For Movements Tab) */}
        {activeTab === 'MOVEMENTS' && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Flow Type Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-500 text-[11px] font-semibold">Sens du Flux :</span>
              
              <button
                onClick={() => setMovementTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  movementTypeFilter === 'ALL'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous ({allFrigoMovements.length})
              </button>

              <button
                onClick={() => setMovementTypeFilter('ENTREES')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  movementTypeFilter === 'ENTREES'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Entrées (+{allFrigoMovements.filter(m => m.isEntry).length})</span>
              </button>

              <button
                onClick={() => setMovementTypeFilter('SORTIES')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  movementTypeFilter === 'SORTIES'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Sorties BLs (-{allFrigoMovements.filter(m => !m.isEntry).length})</span>
              </button>

              <button
                onClick={() => setMovementTypeFilter('TRANSFERTS')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  movementTypeFilter === 'TRANSFERTS'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Transferts</span>
              </button>
            </div>

            {/* Date Range Pickers & Clear */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                <span>Du:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-gray-50"
                />
                <span>Au:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-gray-50"
                />
              </div>

              {(startDateFilter || endDateFilter || movementTypeFilter !== 'ALL' || selectedProductId !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
                    setMovementTypeFilter('ALL');
                    setSelectedProductId('ALL');
                    setSearchTerm('');
                  }}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-600 text-[11px] font-semibold px-2 py-1 bg-gray-100 rounded transition cursor-pointer"
                  title="Réinitialiser tous les filtres"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Effacer</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 5. TAB 1 CONTENT: JOURNAL DES MOUVEMENTS (DATE, HEURE, QUANTITÉS)         */}
      {/* ========================================================================= */}
      {activeTab === 'MOVEMENTS' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900">
                Journal Chronologique des Flux & Mouvements de Stock
              </span>
              <span className="text-xs text-gray-500 font-mono">
                ({filteredMovements.length} mouvement{filteredMovements.length > 1 ? 's' : ''} trouvé{filteredMovements.length > 1 ? 's' : ''})
              </span>
            </div>

            {selectedProductObj && (
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded font-medium flex items-center gap-1.5">
                <span>Produit ciblé : <b>{selectedProductObj.name}</b></span>
                <button onClick={() => setSelectedProductId('ALL')} className="hover:text-red-600 font-bold">×</button>
              </div>
            )}
          </div>

          {filteredMovements.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <Package className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-bold text-xs">Aucun mouvement ne correspond aux critères sélectionnés.</p>
              <p className="text-[11px] text-gray-400">Modifiez les filtres de date, produit ou entrepôt.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="carbon-table text-xs">
                <thead>
                  <tr>
                    <th className="w-28">Date</th>
                    <th className="w-24">Heure</th>
                    <th className="w-32">Type / Flux</th>
                    <th>N° Document</th>
                    <th>Produit</th>
                    <th className="text-right">Impact Poids (Kg)</th>
                    <th className="text-right">Palettes</th>
                    <th className="text-right">Colis / Cartons</th>
                    <th>Tiers / Opérateur</th>
                    <th>Entrepôt Frigo</th>
                    <th className="text-center">Statut Quai</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMovements.map(m => {
                    const rawPrd = products.find(p => p.id === m.productId || p.code === m.productCode);
                    const purchaseInvoice = m.purchaseInvoiceId ? purchaseInvoices.find(p => p.id === m.purchaseInvoiceId) : null;

                    return (
                      <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                        
                        {/* Date */}
                        <td className="font-mono text-gray-800 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-semibold">
                            <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{m.date}</span>
                          </div>
                        </td>

                        {/* Heure */}
                        <td className="font-mono whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-[#0f62fe]" />
                            <span>{m.time}</span>
                          </div>
                        </td>

                        {/* Movement Flow Type */}
                        <td>
                          {m.type === 'ENTRÉE_ACHAT' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded text-[10px] border border-emerald-300 shadow-2xs">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                              ENTRÉE ACHAT
                            </span>
                          )}
                          {m.type === 'ENTRÉE_STOCK' && (
                            <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-900 font-bold px-2.5 py-0.5 rounded text-[10px] border border-teal-300 shadow-2xs">
                              <ArrowDownLeft className="w-3 h-3 text-teal-700" />
                              ENTRÉE STOCK
                            </span>
                          )}
                          {m.type === 'SORTIE_BL' && (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 font-bold px-2.5 py-0.5 rounded text-[10px] border border-rose-300 shadow-2xs">
                              <ArrowUpRight className="w-3 h-3 text-rose-700" />
                              SORTIE BL
                            </span>
                          )}
                          {m.type === 'TRANSFERT_INTER_FRIGO' && (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 font-bold px-2.5 py-0.5 rounded text-[10px] border border-indigo-300 shadow-2xs">
                              <ArrowLeftRight className="w-3 h-3 text-indigo-700" />
                              TRANSFERT
                            </span>
                          )}
                          {m.type === 'AJUSTEMENT_INVENTAIRE' && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded text-[10px] border border-blue-300 shadow-2xs">
                              <RotateCcw className="w-3 h-3 text-blue-700" />
                              INVENTAIRE
                            </span>
                          )}
                          {m.type === 'AJUSTEMENT_MANUEL' && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded text-[10px] border border-amber-300 shadow-2xs">
                              <Edit className="w-3 h-3 text-amber-700" />
                              AJUSTEMENT
                            </span>
                          )}
                        </td>

                        {/* Document Reference */}
                        <td className="font-mono font-bold text-[#0f62fe] whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>{m.documentRef}</span>
                            {purchaseInvoice && (
                              <button
                                onClick={() => setEditingPurchaseInvoice(purchaseInvoice)}
                                className="p-0.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                                title="Modifier cette facture d'achat"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Product & SKU */}
                        <td>
                          <div className="font-bold text-gray-900 line-clamp-1">{m.productName}</div>
                          <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                            <span className="text-[#0f62fe] font-bold">{m.productCode}</span>
                            {m.productCategory && <span>• {m.productCategory}</span>}
                          </div>
                        </td>

                        {/* Quantity Kg Impact */}
                        <td className="text-right font-mono font-bold whitespace-nowrap">
                          <span className={`text-sm ${
                            m.isEntry ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'
                          }`}>
                            {m.signedKg > 0 ? `+${m.signedKg.toLocaleString()}` : m.signedKg.toLocaleString()} Kg
                          </span>
                        </td>

                        {/* Pallets */}
                        <td className="text-right font-mono text-gray-700">
                          {m.signedPallets > 0 ? `+${m.signedPallets}` : m.signedPallets} Pal.
                        </td>

                        {/* Cartons / Colis */}
                        <td className="text-right font-mono text-gray-600">
                          {m.signedCartons > 0 ? `+${m.signedCartons.toLocaleString()}` : m.signedCartons.toLocaleString()} Colis
                        </td>

                        {/* Third Party / Operator */}
                        <td className="text-gray-800 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{m.partyName}</span>
                          </div>
                        </td>

                        {/* Frigo Location */}
                        <td className="font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          {m.frigoName}
                        </td>

                        {/* Warehouse Status & Photo */}
                        <td className="text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {m.photoUrl ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200" title="Photo Bon de Sortie jointe">
                                <Camera className="w-3 h-3" />
                                <span>Photo</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px] font-mono">
                                {m.status || 'OK'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {purchaseInvoice && (
                              <button
                                type="button"
                                onClick={() => setEditingPurchaseInvoice(purchaseInvoice)}
                                className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                title="Modifier la facture d'achat / réception"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Modifier</span>
                              </button>
                            )}

                            {rawPrd && (
                              <button
                                type="button"
                                onClick={() => onViewProductHistory ? onViewProductHistory(rawPrd.id) : setSelectedProductForHistory(rawPrd)}
                                className="p-1 text-gray-400 hover:text-[#0f62fe] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                title="Historique chronologique de ce produit"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 2 CONTENT: CUMUL & SITUATION PAR PRODUIT ("CUMULE EN PRODUITS")    */}
      {/* ========================================================================= */}
      {activeTab === 'CUMUL_PRODUCTS' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-4">
          
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#0f62fe]" />
                <span>Synthèse Cumulée & Valorisation par Référence Produit</span>
              </h3>
              <p className="text-xs text-gray-500">
                Cumul total des entrées, des sorties BL et solde physique en entrepôt ({warehouseDisplayLabel})
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setOnlyInStock(!onlyInStock)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  onlyInStock
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
                title="Basculer entre afficher uniquement les produits en stock ou tous les produits"
              >
                <span className={`w-2 h-2 rounded-full ${onlyInStock ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                <span>{onlyInStock ? 'En Stock Uniquement' : 'Tous (inclus stock 0)'}</span>
              </button>

              <span className="text-xs text-gray-500 font-mono">
                {filteredProductSummaries.length} référence{filteredProductSummaries.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="carbon-table text-xs">
              <thead>
                <tr>
                  <th>Code SKU</th>
                  <th>Désignation Produit</th>
                  <th>Catégorie</th>
                  <th className="text-right">Cumul Entrées</th>
                  <th className="text-right">Cumul Sorties</th>
                  <th className="text-right">Stock Restant (Kg)</th>
                  <th className="text-right">Palettes</th>
                  <th className="text-right">Colis</th>
                  <th className="text-right">Prix Revient HT</th>
                  <th className="text-right">Valorisation Coût HT</th>
                  <th className="text-right">Valeur Vente HT</th>
                  <th className="text-center">Dernier Mouvement</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProductSummaries.map(p => {
                  const rawPrd = products.find(prod => prod.id === p.productId || prod.code === p.productCode);
                  
                  return (
                    <tr key={p.productId} className="hover:bg-gray-50/80 transition-colors">
                      
                      {/* SKU */}
                      <td className="font-mono font-bold text-[#0f62fe]">
                        {p.productCode}
                      </td>

                      {/* Product Name */}
                      <td>
                        <div className="font-bold text-gray-900 line-clamp-1">{p.productName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{p.origin || 'Import'}</div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-semibold">
                          {p.category}
                        </span>
                      </td>

                      {/* Total Entries */}
                      <td className="text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        <div>+{p.totalEntriesKg.toLocaleString()} Kg</div>
                        <div className="text-[10px] text-gray-400 font-normal">
                          {p.totalEntriesCartons.toLocaleString()} Colis ({p.entriesCount} réceptions)
                        </div>
                      </td>

                      {/* Total Exits */}
                      <td className="text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        <div>-{p.totalExitsKg.toLocaleString()} Kg</div>
                        <div className="text-[10px] text-gray-400 font-normal">
                          {p.totalExitsCartons.toLocaleString()} Colis ({p.exitsCount} BLs)
                        </div>
                      </td>

                      {/* Current Stock Remaining */}
                      <td className="text-right font-mono whitespace-nowrap">
                        <span className={`font-black text-sm ${
                          p.stockStatus === 'RUPTURE' ? 'text-red-600' :
                          p.stockStatus === 'STOCK_FAIBLE' ? 'text-amber-600' : 'text-[#0f62fe]'
                        }`}>
                          {p.currentStockKg.toLocaleString()} Kg
                        </span>
                      </td>

                      {/* Pallets */}
                      <td className="text-right font-mono font-bold text-purple-700">
                        {p.currentStockPallets} Pal.
                      </td>

                      {/* Cartons */}
                      <td className="text-right font-mono text-gray-700">
                        {p.currentStockCartons.toLocaleString()} Colis
                      </td>

                      {/* Unit Cost HT */}
                      <td className="text-right font-mono text-gray-800">
                        {p.unitCostHT} DH
                      </td>

                      {/* Valuation Cost HT */}
                      <td className="text-right font-mono font-bold text-purple-800">
                        {p.totalValuationCostHT.toLocaleString()} DH
                      </td>

                      {/* Valuation Sale HT */}
                      <td className="text-right font-mono font-bold text-emerald-800">
                        {p.totalValuationSaleHT.toLocaleString()} DH
                      </td>

                      {/* Last Movement Date & Time */}
                      <td className="text-center font-mono text-[11px] whitespace-nowrap">
                        {p.lastMovementDate ? (
                          <div>
                            <span className="text-gray-800 font-semibold">{p.lastMovementDate}</span>
                            {p.lastMovementTime && (
                              <span className="block text-[10px] text-[#0f62fe] font-bold">{p.lastMovementTime}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-center whitespace-nowrap">
                        {rawPrd && (
                          <button
                            type="button"
                            onClick={() => onViewProductHistory ? onViewProductHistory(rawPrd.id) : setSelectedProductForHistory(rawPrd)}
                            className="px-2.5 py-1 bg-blue-50 text-[#0f62fe] hover:bg-blue-100 border border-blue-200 rounded font-bold text-[11px] flex items-center gap-1 mx-auto transition cursor-pointer"
                            title="Voir l'historique chronologique complet"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Historique</span>
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot>
                <tr className="bg-gray-100 font-mono font-bold text-gray-900 border-t-2 border-gray-300">
                  <td colSpan={3} className="text-right font-bold uppercase text-[11px]">
                    Totaux Consolidés :
                  </td>
                  <td className="text-right font-bold text-emerald-700 text-xs">
                    +{filteredProductSummaries.reduce((sum, p) => sum + p.totalEntriesKg, 0).toLocaleString()} Kg
                  </td>
                  <td className="text-right font-bold text-rose-700 text-xs">
                    -{filteredProductSummaries.reduce((sum, p) => sum + p.totalExitsKg, 0).toLocaleString()} Kg
                  </td>
                  <td className="text-right font-black text-[#0f62fe] text-sm">
                    {filteredProductSummaries.reduce((sum, p) => sum + p.currentStockKg, 0).toLocaleString()} Kg
                  </td>
                  <td className="text-right font-bold text-purple-700 text-xs">
                    {filteredProductSummaries.reduce((sum, p) => sum + p.currentStockPallets, 0)} Pal.
                  </td>
                  <td className="text-right font-bold text-gray-700 text-xs">
                    {filteredProductSummaries.reduce((sum, p) => sum + p.currentStockCartons, 0).toLocaleString()} Colis
                  </td>
                  <td></td>
                  <td className="text-right font-bold text-purple-800 text-xs">
                    {filteredProductSummaries.reduce((sum, p) => sum + p.totalValuationCostHT, 0).toLocaleString()} DH
                  </td>
                  <td className="text-right font-bold text-emerald-800 text-xs">
                    {filteredProductSummaries.reduce((sum, p) => sum + p.totalValuationSaleHT, 0).toLocaleString()} DH
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB 3 CONTENT: FACTURES D'ENTRÉE & RÉCEPTIONS (MODIFIABLES & ACCESSIBLES) */}
      {/* ========================================================================= */}
      {activeTab === 'PURCHASE_INVOICES' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-4">
          
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Ship className="w-4 h-4 text-emerald-600" />
                <span>Factures d'Entrée & Réceptions Fournisseurs ({filteredPurchaseInvoices.length})</span>
              </h3>
              <p className="text-xs text-gray-500">
                Arrivages conteneurs et factures d'achat injectées en stock dans {warehouseDisplayLabel} (Modifiables en 1 clic)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">
                Total Factures : <b>{filteredPurchaseInvoices.reduce((sum, p) => sum + (p.totalLandedCostHT || 0), 0).toLocaleString()} DH</b>
              </span>
            </div>
          </div>

          {filteredPurchaseInvoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <Ship className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-bold text-xs">Aucune facture d'achat / entrée trouvée pour ce filtre.</p>
              <p className="text-[11px] text-gray-400">Sélectionnez "Tous les Frigos" ou modifiez votre recherche.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="carbon-table text-xs">
                <thead>
                  <tr>
                    <th>Date d'Arrivée</th>
                    <th>N° Facture / Conteneur</th>
                    <th>Fournisseur</th>
                    <th>Frigo de Réception</th>
                    <th className="text-right">Colis Reçus</th>
                    <th className="text-right">Poids Pesé (Kg)</th>
                    <th className="text-right">Total Coût Revient HT</th>
                    <th className="text-right">Réglé / Solde</th>
                    <th className="text-center">Statut Paiement</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPurchaseInvoices.map(pur => {
                    const targetFrigo = frigos.find(f => f.id === pur.targetFrigoId);
                    const totalCartons = pur.items?.reduce((acc, i) => acc + (i.quantityCartons || 0), 0) || 0;
                    const totalKg = pur.items?.reduce((acc, i) => acc + (i.quantityKg || 0), 0) || 0;
                    const totalHT = pur.totalLandedCostHT || 0;
                    const paid = pur.paidAmount || 0;
                    const remaining = pur.remainingBalance !== undefined ? pur.remainingBalance : Math.max(0, totalHT - paid);
                    const status = pur.paymentStatus || (remaining <= 0 ? 'PAYÉ' : paid > 0 ? 'PARTIEL' : 'NON_PAYÉ');

                    return (
                      <tr key={pur.id} className="hover:bg-gray-50/80 transition-colors">
                        
                        {/* Date Arrival */}
                        <td className="font-mono text-gray-800 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{pur.dateArrival ? pur.dateArrival.slice(0, 10) : '-'}</span>
                          </div>
                        </td>

                        {/* Invoice & Container */}
                        <td className="font-mono font-bold text-[#0f62fe]">
                          <div>{pur.invoiceNumber}</div>
                          {pur.containerNumber && (
                            <div className="text-[10px] text-gray-500 font-normal">
                              Conteneur: {pur.containerNumber}
                            </div>
                          )}
                        </td>

                        {/* Supplier */}
                        <td>
                          <div className="font-bold text-gray-900">{pur.supplierName}</div>
                          <div className="text-[10px] text-gray-500">{pur.isImport ? 'Importation' : 'Fournisseur Local'}</div>
                        </td>

                        {/* Target Frigo */}
                        <td className="font-mono font-bold text-emerald-800">
                          {targetFrigo?.name || 'Entrepôt Réception'}
                        </td>

                        {/* Total Cartons */}
                        <td className="text-right font-mono font-bold text-blue-900">
                          {totalCartons.toLocaleString()} Colis
                        </td>

                        {/* Total Kg */}
                        <td className="text-right font-mono font-bold text-emerald-700">
                          {totalKg.toLocaleString()} Kg
                        </td>

                        {/* Total Landed Cost HT */}
                        <td className="text-right font-mono font-bold text-gray-900">
                          {totalHT.toLocaleString()} DH
                          <div className="text-[10px] text-gray-400 font-normal">
                            Frais: {((pur.customsCostsHT || 0) + (pur.freightCostsHT || 0)).toLocaleString()} DH
                          </div>
                        </td>

                        {/* Paid & Remaining */}
                        <td className="text-right font-mono text-xs">
                          <div className="text-emerald-700 font-semibold">Réglé: {paid.toLocaleString()} DH</div>
                          <div className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            Solde: {remaining.toLocaleString()} DH
                          </div>
                        </td>

                        {/* Payment Status */}
                        <td className="text-center">
                          <span className={`text-[10px] px-2 py-0.5 font-mono font-bold rounded ${
                            status === 'PAYÉ' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            status === 'PARTIEL' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {status === 'PAYÉ' ? '✓ PAYÉ' : status === 'PARTIEL' ? 'PARTIEL' : 'NON PAYÉ'}
                          </span>
                        </td>

                        {/* Action Buttons: Modifier, Régler, Supprimer */}
                        <td className="text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* Modifier Button */}
                            <button
                              onClick={() => setEditingPurchaseInvoice(pur)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded flex items-center gap-1 shadow-xs transition cursor-pointer"
                              title="Modifier cette facture d'achat / réception et ajuster le stock"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Modifier</span>
                            </button>

                            {/* Régler Button */}
                            {status !== 'PAYÉ' && (
                              <button
                                onClick={() => setPaymentModalInvoice(pur)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Enregistrer un règlement fournisseur"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Régler</span>
                              </button>
                            )}

                            {/* Supprimer Button */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Êtes-vous sûr de vouloir supprimer la facture fournisseur N° ${pur.invoiceNumber} ? Le stock sera automatiquement déduit.`)) {
                                  deletePurchaseInvoice(pur.id);
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded border border-red-200 transition cursor-pointer"
                              title="Supprimer cette facture"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB 4 CONTENT: ENTREPÔTS & CAPACITÉS (SUPERVISION DES SITES)           */}
      {/* ========================================================================= */}
      {activeTab === 'WAREHOUSES' && (
        <div className="space-y-4">
          
          {/* Global Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Entrepôts Frigorifiques</span>
                <Warehouse className="w-4 h-4 text-[#0f62fe]" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{frigos.length}</div>
              <div className="text-[11px] text-gray-500 mt-1">Sites configurés</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Capacité Globale (Palettes)</span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {totalCapacityPallets.toLocaleString()} <span className="text-sm font-normal text-gray-500">Pal.</span>
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                ~{(totalCapacityPallets * 0.8).toLocaleString()} Tonnes max
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Stock Stocké Réel</span>
                <Package className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {totalOccupiedPallets.toLocaleString()} <span className="text-sm font-normal text-gray-500">Pal.</span>
              </div>
              <div className="text-[11px] text-purple-600 mt-1">
                {(totalOccupiedKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} Tonnes ({totalOccupiedKg.toLocaleString()} Kg)
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Taux d'Occupation</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{globalOccupationRate}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${globalOccupationRate > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, globalOccupationRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Frigo Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {frigoStatsList.map(frigo => {
              const freePallets = Math.max(0, (frigo.capacityPallets || 1000) - frigo.totalPallets);

              return (
                <div 
                  key={frigo.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 text-[#0f62fe] border border-blue-200 rounded">
                            {frigo.code}
                          </span>
                          <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{frigo.name}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{frigo.location || 'Localisation non spécifiée'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEdit(frigo)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Modifier les informations du frigo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Manager & WhatsApp info */}
                    <div className="space-y-1.5 pt-1 text-xs text-gray-600 border-t border-gray-100">
                      {frigo.managerName && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Responsable Quai :</span>
                          <span className="font-semibold text-gray-800">{frigo.managerName}</span>
                        </div>
                      )}

                      {frigo.managerPhone && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Téléphone :</span>
                          <a 
                            href={`tel:${frigo.managerPhone}`}
                            className="font-mono text-[#0f62fe] hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{frigo.managerPhone}</span>
                          </a>
                        </div>
                      )}

                      {frigo.whatsappGroupLink && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-gray-500">Groupe Quai :</span>
                          <a 
                            href={frigo.whatsappGroupLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <span>Rejoindre</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Occupation Gauge */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-600">Occupation Palettes:</span>
                        <span className="font-bold text-gray-900">
                          {frigo.totalPallets} / {frigo.capacityPallets} <span className="text-[10px] font-normal text-gray-500">({frigo.occPercent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            frigo.occPercent >= 90 ? 'bg-rose-500' : frigo.occPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, frigo.occPercent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                        <span>Disponibles: <b>{freePallets} Pal.</b></span>
                        <span>Poids total: <b>{(frigo.totalKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} T</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        if (onViewFrigoDetail) {
                          onViewFrigoDetail(frigo.id);
                        } else {
                          setSelectedFrigoDetailId(frigo.id);
                        }
                      }}
                      className="flex-1 text-center text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Fiche Détail</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFrigoId(frigo.id);
                        setActiveTab('MOVEMENTS');
                      }}
                      className="flex-1 text-center text-xs font-bold text-white bg-[#0f62fe] hover:bg-blue-700 py-1.5 rounded-lg transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Voir Flux</span>
                    </button>

                    <button
                      onClick={() => handleClearFrigoStock(frigo)}
                      className="text-center text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Vider tous les stocks de cet entrepôt (0 Kg)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Vider</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODALS (Add/Edit Frigo, Edit Purchase, Supplier Payment, History)       */}
      {/* ========================================================================= */}
      
      {/* Add / Edit Frigo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-300 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-[#0f62fe]" />
                <span>{editingFrigo ? 'Modifier l\'Entrepôt Frigorifique' : 'Nouveau Frigo'}</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveFrigo} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du Frigo / Entrepôt *</label>
                <input
                  type="text"
                  required
                  placeholder="Nom de l'entrepôt / Frigo..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ville / Emplacement</label>
                  <input
                    type="text"
                    required
                    placeholder="Ville ou Zone géographique..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Capacité Max (Palettes)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacityPallets}
                    onChange={(e) => setFormData({ ...formData, capacityPallets: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Responsable de Quai</label>
                  <input
                    type="text"
                    placeholder="Nom du responsable"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone Contact</label>
                  <input
                    type="text"
                    placeholder="+212 6..."
                    value={formData.managerPhone}
                    onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du Groupe WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Groupe WhatsApp Frigo..."
                    value={formData.whatsappGroup}
                    onChange={(e) => setFormData({ ...formData, whatsappGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lien du Groupe WhatsApp</label>
                  <input
                    type="text"
                    placeholder="https://chat.whatsapp.com/..."
                    value={formData.whatsappGroupLink}
                    onChange={(e) => setFormData({ ...formData, whatsappGroupLink: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f62fe] text-white rounded-lg font-semibold hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  {editingFrigo ? 'Enregistrer les Modifications' : 'Créer le Frigo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase / Entry Invoice Modal */}
      {editingPurchaseInvoice && (
        <EditPurchaseInvoiceModal
          invoice={editingPurchaseInvoice}
          onClose={() => setEditingPurchaseInvoice(null)}
        />
      )}

      {/* Supplier Payment Modal */}
      {paymentModalInvoice && (
        <SupplierPaymentModal
          invoice={paymentModalInvoice}
          onClose={() => setPaymentModalInvoice(null)}
        />
      )}

      {/* Inter-Frigo Stock Transfer Modal */}
      {showTransferModal && (
        <StockTransferModal
          onClose={() => setShowTransferModal(false)}
        />
      )}

      {/* Chronological Detailed Product Movement History Modal */}
      {selectedProductForHistory && (
        <ProductStockHistoryModal
          product={selectedProductForHistory}
          isOpen={!!selectedProductForHistory}
          onClose={() => setSelectedProductForHistory(null)}
        />
      )}

    </div>
  );
};
