import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { Product } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { 
  TrendingUp, 
  Package, 
  Boxes, 
  Building2, 
  Landmark, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  Truck,
  QrCode,
  Search,
  ExternalLink,
  Camera,
  History,
  FileText,
  CreditCard,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  PieChart,
  Layers,
  Phone,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { QRScannerModal } from '../common/QRScannerModal';
import { ProductStockHistoryModal } from '../stock/ProductStockHistoryModal';
import { StandardKpiBarChart } from './StandardKpiBarChart';
import { computeSynchronizedStocks } from '../../utils/stockReconciler';

interface DashboardOverviewProps {
  onNavigate: (tab: NavTab) => void;
  onViewFrigoDetail?: (frigoId: string) => void;
  onEditBL?: (blId: string) => void;
  onViewBLPdf?: (blId: string) => void;
  onEditClient?: (clientId: string) => void;
  onEditProduct?: (productId: string) => void;
  onEditFrigo?: (frigoId: string) => void;
  onEditOrder?: (orderId: string) => void;
  onEditCheque?: (chequeId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  onNavigate, 
  onViewFrigoDetail,
  onEditBL,
  onViewBLPdf,
  onEditClient,
  onEditProduct,
  onEditFrigo,
  onEditOrder,
  onEditCheque
}) => {
  const { t } = useTranslation();
  const { 
    products, 
    stocks, 
    frigos, 
    orders, 
    deliveryNotes, 
    purchaseInvoices,
    inventoryCounts,
    stockMovements,
    invoices, 
    chequesEffets, 
    expenses, 
    clients 
  } = useERP();

  const [quickBlSearch, setQuickBlSearch] = useState('');
  const [blSearchError, setBlSearchError] = useState('');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  const processBlSearch = (term: string) => {
    setBlSearchError('');
    const clean = term.trim();
    if (!clean) return;

    let searchCode = clean;
    if (clean.includes('bl=')) {
      const match = clean.match(/bl=([^&]+)/);
      if (match) searchCode = match[1];
    }

    const found = deliveryNotes.find(b => 
      b.blNumber.toLowerCase() === searchCode.toLowerCase() ||
      b.blNumber.toLowerCase().includes(searchCode.toLowerCase())
    );

    if (found) {
      if (onEditBL) {
        onEditBL(found.id);
      } else {
        window.history.pushState({}, '', `/?bl=${found.blNumber}`);
        onNavigate('DELIVERY_NOTES');
      }
    } else {
      setBlSearchError(`${t('common.noData', 'Aucun BL trouvé')} (${searchCode})`);
    }
  };

  const handleQuickBlLookup = (e: React.FormEvent) => {
    e.preventDefault();
    processBlSearch(quickBlSearch);
  };

  const handleQrScanSuccess = (scannedCode: string) => {
    setIsQrScannerOpen(false);
    setQuickBlSearch(scannedCode);
    processBlSearch(scannedCode);
  };

  // Synchronized Multi-Frigo Stock Data
  const {
    productStocks,
    totalConsolidatedKg,
    totalConsolidatedPallets,
    totalConsolidatedValuationCostHT,
    totalConsolidatedValuationSaleHT,
  } = useMemo(() => {
    return computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices,
      deliveryNotes,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: 'ALL'
    });
  }, [products, frigos, stocks, purchaseInvoices, deliveryNotes, inventoryCounts, stockMovements]);

  // Synchronized totals
  const totalStockKg = totalConsolidatedKg;
  const totalStockValuationHT = totalConsolidatedValuationCostHT;

  // Sales calculations (combined Orders & DeliveryNotes BLs)
  const ordersSalesHT = (orders || []).reduce((acc, o) => acc + (o?.totalHT || 0), 0);
  const ordersCostHT = (orders || []).reduce((acc, o) => acc + (o?.totalCostHT || 0), 0);

  const blSalesHT = (deliveryNotes || []).reduce((acc, bl) => acc + (bl?.totalHT || 0), 0);
  const blCostHT = (deliveryNotes || []).reduce((acc, bl) => {
    let cost = 0;
    (bl.items || []).forEach(it => {
      const prd = products.find(p => p.id === it.productId);
      cost += (it.quantityKg || 0) * (prd?.unitCostHT || 0);
    });
    return acc + cost;
  }, 0);

  const totalSalesHT = orders.length > 0 ? ordersSalesHT : blSalesHT;
  const totalCostHT = orders.length > 0 ? ordersCostHT : blCostHT;
  const grossMarginHT = totalSalesHT - totalCostHT;
  const globalMarginPct = totalSalesHT > 0 ? (grossMarginHT / totalSalesHT) * 100 : 0;

  // Receivables (Créances Clients)
  const invoiceReceivables = (invoices || [])
    .filter(inv => inv.status !== 'PAYEE')
    .reduce((acc, inv) => acc + (inv.remainingAmount ?? (inv.totalTTC - (inv.amountPaid || 0))), 0);

  const nonInvoicedBLReceivables = (deliveryNotes || [])
    .filter(bl => (bl.status === 'LIVRÉ' || bl.status === 'EN_COURS_LIVRAISON') && !bl.invoiceId)
    .reduce((acc, bl) => acc + (bl.totalTTC || (bl.totalHT * 1.20)), 0);

  const clientBalanceReceivables = (clients || []).reduce((acc, c) => acc + (c.currentBalance || 0), 0);
  const totalReceivablesTTC = Math.max(clientBalanceReceivables, invoiceReceivables + nonInvoicedBLReceivables);

  // Cheques due in portfolio
  const chequesInPortfolio = chequesEffets.filter(c => c.status === 'EN_PORTEFEUILLE');
  const totalChequesAmount = chequesInPortfolio.reduce((acc, c) => acc + c.amount, 0);

  // Executive Dashboard Data Aggregations
  const recentBLs = [...deliveryNotes].slice(0, 6);
  const recentInvoices = [...invoices].slice(0, 5);

  const clientChequesToDeposit = chequesEffets.filter(c => c.direction === 'RECETTE_CLIENT' && c.status === 'EN_PORTEFEUILLE');
  const supplierChequesToPay = chequesEffets.filter(c => c.direction === 'DEPENSE_FOURNISSEUR' && c.status !== 'ENCAISSE');

  const topDebtorClients = [...clients]
    .filter(c => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 5);

  // Pending BLs
  const pendingBLsCount = deliveryNotes.filter(bl => !bl.frigoEmployeeApproved).length;

  // Category breakdown for margins
  const categoryStats: { [cat: string]: { salesHT: number; costHT: number; marginHT: number } } = {};
  const categorySalesStats: { [cat: string]: { salesHT: number; costHT: number; marginHT: number; stockKg: number; valuationHT: number } } = {};

  ['Dattes Locales', 'Dattes Importées', 'Fruits Secs', 'Huiles & Condiments', 'Autres Produits Alimentaires'].forEach(cat => {
    categorySalesStats[cat] = { salesHT: 0, costHT: 0, marginHT: 0, stockKg: 0, valuationHT: 0 };
  });

  stocks.forEach(stk => {
    const prd = products.find(p => p.id === stk.productId);
    if (prd && prd.category) {
      if (!categorySalesStats[prd.category]) {
        categorySalesStats[prd.category] = { salesHT: 0, costHT: 0, marginHT: 0, stockKg: 0, valuationHT: 0 };
      }
      categorySalesStats[prd.category].stockKg += stk.quantityKg;
      categorySalesStats[prd.category].valuationHT += (stk.quantityKg * (prd.unitCostHT || 0));
    }
  });

  const salesSource = orders.length > 0 ? orders : deliveryNotes;
  salesSource.forEach(doc => {
    (doc.items || []).forEach(item => {
      const prd = products.find(p => p.id === item.productId);
      const cat = (item as any).category || prd?.category || 'Autres Produits Alimentaires';
      const itemCost = (item.quantityKg || 0) * (prd?.unitCostHT || (item as any).unitCostHT || 0);
      const itemSales = item.totalHT || ((item.quantityKg || 0) * (item.unitPriceHT || 0));

      if (!categoryStats[cat]) {
        categoryStats[cat] = { salesHT: 0, costHT: 0, marginHT: 0 };
      }
      categoryStats[cat].salesHT += itemSales;
      categoryStats[cat].costHT += itemCost;
      categoryStats[cat].marginHT += (itemSales - itemCost);

      if (!categorySalesStats[cat]) {
        categorySalesStats[cat] = { salesHT: 0, costHT: 0, marginHT: 0, stockKg: 0, valuationHT: 0 };
      }
      categorySalesStats[cat].salesHT += itemSales;
      categorySalesStats[cat].costHT += itemCost;
      categorySalesStats[cat].marginHT += (itemSales - itemCost);
    });
  });

  return (
    <div className="space-y-6" id="dashboard-overview-container">
      
      {/* Top Banner & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0f62fe]" />
            {t('dashboard.title', 'Tableau de Bord & Marges')}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {t('app.description', 'Négoce de Dattes Locales & Importées • Suivi Logistique & Financier en Temps Réel')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons 
            filename="Tableau_De_Bord_ERP"
            title={t('dashboard.title', 'Tableau de Bord ERP')}
            excelData={[
              { Indicateur: t('dashboard.totalRevenue', 'Chiffre d\'Affaires HT'), Valeur: `${totalSalesHT.toLocaleString()} DH` },
              { Indicateur: t('dashboard.grossMargin', 'Marge Brute'), Valeur: `${grossMarginHT.toLocaleString()} DH (${(globalMarginPct || 0).toFixed(1)}%)` },
              { Indicateur: t('dashboard.stockValuation', 'Valorisation Stock HT'), Valeur: `${totalStockValuationHT.toLocaleString()} DH` },
              { Indicateur: t('products.totalStock', 'Total Stock Kg'), Valeur: `${totalStockKg.toLocaleString()} Kg` },
              { Indicateur: t('clients.receivables', 'Créances Clients TTC'), Valeur: `${totalReceivablesTTC.toLocaleString()} DH` },
              { Indicateur: t('dashboard.pendingCheques', 'Chèques en Portefeuille'), Valeur: `${totalChequesAmount.toLocaleString()} DH` },
            ]}
            pdfElementId="dashboard-overview-container"
          />
          <button
            onClick={() => onNavigate('SALES_ORDERS')}
            className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded font-semibold"
          >
            + {t('orders.addOrder', 'Nouvelle Commande')}
          </button>
          <button
            onClick={() => onNavigate('DELIVERY_NOTES')}
            className="bg-[#262626] hover:bg-[#393939] text-gray-200 border border-[#525252] text-xs px-3 py-2 rounded flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            {t('dashboard.pendingBLs', 'BL en Attente')} ({pendingBLsCount})
          </button>
          <button
            onClick={() => onNavigate('MULTI_SITE_INVENTORY')}
            className="bg-blue-900/80 hover:bg-blue-800 text-cyan-200 border border-blue-600 text-xs px-3 py-2 rounded flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Layers className="w-4 h-4 text-cyan-300" />
            <span>Inventaire Multi-Sites</span>
          </button>
        </div>
      </div>

      {/* Quick QR Code / BL Link Direct Search Box */}
      <div className="bg-white p-3.5 rounded-lg border border-[#e0e0e0] shadow-sm">
        <form onSubmit={handleQuickBlLookup} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 shrink-0">
            <QrCode className="w-5 h-5 text-[#0f62fe]" />
            <span>{t('bl.quickSearch', 'Accès Direct BL par QR Code')}:</span>
          </div>

          <div className="relative flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
              <input
                type="text"
                placeholder={t('bl.searchPlaceholder', 'Scannez un QR code ou saisissez un lien/code BL...')}
                value={quickBlSearch}
                onChange={(e) => {
                  setQuickBlSearch(e.target.value);
                  setBlSearchError('');
                }}
                className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:border-[#0f62fe]"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsQrScannerOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
              title="Scanner QR Code"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{t('common.camera', 'Caméra QR')}</span>
            </button>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto bg-[#0f62fe] hover:bg-blue-700 text-white font-semibold text-xs px-4 py-1.5 rounded transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>{t('common.view', 'Ouvrir BL')}</span>
            <ExternalLink className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </form>

        {blSearchError && (
          <p className="text-xs text-rose-600 font-semibold mt-2 pl-1">{blSearchError}</p>
        )}
      </div>

      <QRScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
      />

      {/* 🚀 CLICKABLE KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Sales & Margin -> Opens Delivery Notes */}
        <div 
          onClick={() => onNavigate('DELIVERY_NOTES')}
          className="carbon-card p-4 cursor-pointer hover:border-[#0f62fe] hover:shadow-md transition-all group relative overflow-hidden"
          title="Cliquer pour afficher la liste des Bons de Livraison & Ventes"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider group-hover:text-[#0f62fe] transition-colors">
              {t('dashboard.totalRevenue', 'Chiffre d\'Affaires HT')}
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 mt-2">
            {totalSalesHT.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">{t('dashboard.grossMargin', 'Marge')}:</span>
            <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {grossMarginHT.toLocaleString()} DH ({(globalMarginPct || 0).toFixed(1)}%)
            </span>
          </div>
          <div className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 mt-1.5 opacity-80 group-hover:opacity-100 group-hover:underline">
            <span>Voir les ventes & BLs</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* KPI 2: Stock Valuation -> Opens Multi-Site Inventory */}
        <div 
          onClick={() => onNavigate('MULTI_SITE_INVENTORY')}
          className="carbon-card p-4 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group relative overflow-hidden"
          title="Cliquer pour ouvrir l'Inventaire Multi-Sites & Gestion des Frigos"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider group-hover:text-emerald-700 transition-colors">
              {t('dashboard.stockValuation', 'Valeur Stock Global')}
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 mt-2">
            {totalStockValuationHT.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH HT</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">{t('products.totalStock', 'Volume Global')}:</span>
            <span className="font-mono font-bold text-gray-800">
              {totalStockKg.toLocaleString()} Kg
            </span>
          </div>
          <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 mt-1.5 opacity-80 group-hover:opacity-100 group-hover:underline">
            <span>Gérer les stocks & frigos</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* KPI 3: Receivables -> Opens Clients */}
        <div 
          onClick={() => onNavigate('CLIENTS')}
          className="carbon-card p-4 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all group relative overflow-hidden"
          title="Cliquer pour afficher les comptes clients, créances et relevés"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider group-hover:text-purple-700 transition-colors">
              {t('clients.receivables', 'Créances Clients (TTC)')}
            </span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700 mt-2">
            {totalReceivablesTTC.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">{t('clients.title', 'Clients')}:</span>
            <span className="font-mono font-semibold text-gray-700">
              {clients.length} {t('nav.clients', 'Comptes Clients')}
            </span>
          </div>
          <div className="text-[10px] text-purple-700 font-bold flex items-center gap-0.5 mt-1.5 opacity-80 group-hover:opacity-100 group-hover:underline">
            <span>Suivre les créances & soldes</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* KPI 4: Cheques in Portfolio -> Opens Treasury */}
        <div 
          onClick={() => onNavigate('TREASURY_CHEQUES')}
          className="carbon-card p-4 cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group relative overflow-hidden"
          title="Cliquer pour afficher la gestion de trésorerie, chèques et effets"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider group-hover:text-amber-800 transition-colors">
              {t('dashboard.pendingCheques', 'Chèques Portefeuille')}
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-2">
            {totalChequesAmount.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">{t('treasury.title', 'Titres')}:</span>
            <span className="font-mono font-semibold text-amber-800">
              {chequesInPortfolio.length} Chèques / Effets
            </span>
          </div>
          <div className="text-[10px] text-amber-800 font-bold flex items-center gap-0.5 mt-1.5 opacity-80 group-hover:opacity-100 group-hover:underline">
            <span>Gérer les encaissements</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

      </div>

      {/* Clean Flat KPI Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Real Sales & Valuation HT by Category */}
        <StandardKpiBarChart
          title="Valorisation & Chiffre d'Affaires HT par Catégorie"
          subtitle="Cliquer sur une famille pour voir les produits associés"
          unit="DH"
          onItemClick={() => onNavigate('PRODUCTS_STOCK')}
          data={
            Object.entries(categorySalesStats)
              .filter(([_, st]) => st.salesHT > 0 || st.valuationHT > 0)
              .map(([cat, st]) => {
                const val = st.salesHT > 0 ? st.salesHT : st.valuationHT;
                return {
                  label: cat,
                  value: val,
                  subValue: st.salesHT > 0 
                    ? `Marge: ${st.marginHT.toLocaleString()} DH` 
                    : `Stock: ${st.stockKg.toLocaleString()} Kg`
                };
              })
          }
        />

        {/* Chart 2: Real Frigo Volumes */}
        <StandardKpiBarChart
          title="Niveaux de Remplissage des Frigos (Stock en Kg)"
          subtitle="Cliquer sur un frigo pour ouvrir immédiatement sa fiche détaillée"
          unit="Kg"
          onItemClick={(item) => {
            const foundFrigo = frigos.find(f => f.name.toLowerCase().trim() === item.label.toLowerCase().trim());
            if (foundFrigo && onViewFrigoDetail) {
              onViewFrigoDetail(foundFrigo.id);
            } else {
              onNavigate('FRIGO_MANAGEMENT');
            }
          }}
          data={
            frigos.map(f => {
              const { totalConsolidatedKg: fKg, totalConsolidatedPallets: fPal } = computeSynchronizedStocks({
                products,
                frigos,
                stocks,
                purchaseInvoices,
                deliveryNotes,
                inventoryCounts,
                stockMovements,
                selectedFrigoId: f.id
              });
              const pct = f.capacityPallets > 0 ? Math.round((fPal / f.capacityPallets) * 100) : 0;
              return {
                label: f.name,
                value: fKg,
                subValue: `${fPal} Palettes (${pct}% occupation)`
              };
            })
          }
        />
      </div>

      {/* EXECUTIVE BUSINESS DASHBOARD WIDGETS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 📦 Widget 1: Derniers Bons de Livraison (BL) -> 100% CLICKABLE */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#0f62fe]" />
              Derniers Bons de Livraison (BL)
            </h2>
            <button
              onClick={() => onNavigate('DELIVERY_NOTES')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Tous les BL ({deliveryNotes.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentBLs.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucun Bon de Livraison enregistré.</p>
            ) : (
              recentBLs.map(bl => (
                <div 
                  key={bl.id} 
                  onClick={() => {
                    if (onEditBL) {
                      onEditBL(bl.id);
                    } else {
                      window.history.pushState({}, '', `/?bl=${bl.blNumber}`);
                      onNavigate('DELIVERY_NOTES');
                    }
                  }}
                  className="p-3 bg-gray-50 border border-gray-200 hover:border-[#0f62fe] hover:bg-blue-50/60 rounded-lg flex items-center justify-between text-xs font-mono cursor-pointer transition-all group shadow-xs hover:shadow-sm"
                  title="Cliquer pour ouvrir et éditer ce Bon de Livraison"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                      <span className="text-[#0f62fe] font-bold group-hover:underline flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {bl.blNumber}
                      </span>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (bl.clientId && onEditClient) {
                            onEditClient(bl.clientId);
                          } else {
                            onNavigate('CLIENTS');
                          }
                        }}
                        className="font-sans font-bold text-gray-800 hover:text-[#0f62fe] hover:underline text-left"
                        title="Ouvrir la fiche client"
                      >
                        {bl.clientName || 'Client Inconnu'}
                      </button>
                    </div>

                    <div className="text-[11px] text-gray-500 font-sans flex items-center gap-2">
                      <span>{bl.date || '-'}</span>
                      <span>•</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (bl.frigoId && onViewFrigoDetail) {
                            onViewFrigoDetail(bl.frigoId);
                          } else {
                            onNavigate('FRIGO_MANAGEMENT');
                          }
                        }}
                        className="text-gray-600 hover:text-blue-700 hover:underline"
                        title="Voir le frigo source"
                      >
                        {bl.frigoName || 'Entrepôt Skhirat'}
                      </button>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-bold text-emerald-700 text-sm">{bl.totalKg?.toLocaleString()} Kg</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-0.5 ${
                        bl.frigoEmployeeApproved 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      }`}>
                        {bl.frigoEmployeeApproved ? 'Quai Validé' : 'En Attente'}
                      </span>
                    </div>

                    {onViewBLPdf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewBLPdf(bl.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-700 hover:bg-white rounded border border-transparent hover:border-blue-200 transition"
                        title="Voir / Imprimer PDF du BL"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 👥 Widget 5: Clients à Suivre (Crédits & Créances) -> 100% CLICKABLE */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-600" />
              Clients à Suivre (Crédits & Créances les plus élevés)
            </h2>
            <button
              onClick={() => onNavigate('CLIENTS')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Voir Clients ({clients.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {topDebtorClients.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucun solde client impayé.</p>
            ) : (
              topDebtorClients.map(c => {
                const creditRatio = c.creditLimit > 0 ? Math.min(100, Math.round((c.currentBalance / c.creditLimit) * 100)) : 0;
                return (
                  <div 
                    key={c.id} 
                    onClick={() => {
                      if (onEditClient) {
                        onEditClient(c.id);
                      } else {
                        onNavigate('CLIENTS');
                      }
                    }}
                    className="p-3 bg-gray-50 border border-gray-200 hover:border-rose-500 hover:bg-rose-50/40 rounded-lg font-mono cursor-pointer transition-all group shadow-xs hover:shadow-sm"
                    title={`Cliquer pour ouvrir la fiche et le relevé de compte de "${c.name}"`}
                  >
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-gray-900 font-sans group-hover:text-rose-700 flex items-center gap-1.5 transition-colors">
                        <Users className="w-3.5 h-3.5 text-gray-400 group-hover:text-rose-600" />
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </span>
                      <span className="font-bold text-rose-600 text-sm">{c.currentBalance.toLocaleString()} DH</span>
                    </div>

                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${creditRatio > 80 ? 'bg-rose-600' : 'bg-amber-500'}`} 
                        style={{ width: `${creditRatio}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1.5 font-sans">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {c.phone || '-'}
                      </span>
                      <span className="text-gray-600">
                        Plafond: <b>{c.creditLimit?.toLocaleString()} DH</b> ({creditRatio}% utilisé)
                      </span>
                      <span className="text-rose-700 font-bold group-hover:underline">
                        Ouvrir Dossier →
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Grid 2: Factures, Trésorerie & Frigos Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Widget 2: Dernières Factures Émises -> Clickable */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Factures Émises
            </h2>
            <button
              onClick={() => onNavigate('INVOICING')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Toutes ({invoices.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentInvoices.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucune facture récente.</p>
            ) : (
              recentInvoices.map(inv => (
                <div 
                  key={inv.id} 
                  onClick={() => onNavigate('INVOICING')}
                  className="p-2.5 bg-gray-50 border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded flex items-center justify-between text-xs font-mono cursor-pointer transition-all group"
                  title="Cliquer pour consulter les factures"
                >
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="text-emerald-700 group-hover:underline">{inv.invoiceNumber}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-sans text-gray-700 truncate max-w-[120px]">{inv.clientName}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                      Échéance: {inv.dueDate || inv.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{inv.totalTTC.toLocaleString()} DH</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded inline-block mt-0.5">
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 3: Chèques Client en Portefeuille -> Clickable */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              Chèques Clients (À Déposer)
            </h2>
            <button
              onClick={() => onNavigate('TREASURY_CHEQUES')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Trésorerie</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {clientChequesToDeposit.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucun chèque en portefeuille.</p>
            ) : (
              clientChequesToDeposit.slice(0, 4).map(cq => (
                <div 
                  key={cq.id} 
                  onClick={() => {
                    if (onEditCheque) {
                      onEditCheque(cq.id);
                    } else {
                      onNavigate('TREASURY_CHEQUES');
                    }
                  }}
                  className="p-2.5 bg-purple-50/40 border border-purple-200 hover:border-purple-500 hover:bg-purple-50 rounded flex items-center justify-between text-xs font-mono cursor-pointer transition-all group"
                  title="Cliquer pour gérer ce chèque"
                >
                  <div>
                    <div className="font-bold text-purple-900 group-hover:underline truncate max-w-[140px]">
                      N° {cq.referenceNumber} — {cq.clientName || 'Client'}
                    </div>
                    <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                      Banque: {cq.bankName || 'Maroc'} • Éch: {cq.dueDate}
                    </div>
                  </div>
                  <div className="font-bold text-purple-700 text-sm">
                    {cq.amount.toLocaleString()} DH
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 4: Échéances Chèques / Effets Fournisseurs -> Clickable */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Chèques Fournisseurs à Payer
            </h2>
            <button
              onClick={() => onNavigate('TREASURY_CHEQUES')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Échéances</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {supplierChequesToPay.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucun chèque fournisseur en cours.</p>
            ) : (
              supplierChequesToPay.slice(0, 4).map(cq => (
                <div 
                  key={cq.id} 
                  onClick={() => {
                    if (onEditCheque) {
                      onEditCheque(cq.id);
                    } else {
                      onNavigate('TREASURY_CHEQUES');
                    }
                  }}
                  className="p-2.5 bg-amber-50/40 border border-amber-200 hover:border-amber-500 hover:bg-amber-50 rounded flex items-center justify-between text-xs font-mono cursor-pointer transition-all group"
                  title="Cliquer pour gérer ce paiement fournisseur"
                >
                  <div>
                    <div className="font-bold text-amber-900 group-hover:underline truncate max-w-[140px]">
                      N° {cq.referenceNumber} — {cq.supplierName || 'Fournisseur'}
                    </div>
                    <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                      Banque: {cq.bankName || 'Maroc'} • Éch: {cq.dueDate}
                    </div>
                  </div>
                  <div className="font-bold text-amber-700 text-sm">
                    {cq.amount.toLocaleString()} DH
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Widget 6: État des Frigos & Entrepôts -> 100% CLICKABLE */}
      <div className="carbon-card p-5 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0f62fe]" />
            État des Frigos (Stock en Kg & Produits Présents)
          </h2>
          <button
            onClick={() => onNavigate('MULTI_SITE_INVENTORY')}
            className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
          >
            <span>Inventaires Multi-Sites</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {frigos.map(frigo => {
            const { totalConsolidatedKg: totalKgInFrigo, productStocks: fPrdStocks } = computeSynchronizedStocks({
              products,
              frigos,
              stocks,
              purchaseInvoices,
              deliveryNotes,
              inventoryCounts,
              stockMovements,
              selectedFrigoId: frigo.id
            });
            const activeProducts = fPrdStocks.filter(p => p.totalStockKg > 0);

            return (
              <div 
                key={frigo.id} 
                onClick={() => onViewFrigoDetail ? onViewFrigoDetail(frigo.id) : onNavigate('FRIGO_MANAGEMENT')}
                className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:border-[#0f62fe] hover:bg-blue-50/40 transition-all group flex flex-col justify-between"
                title={`Cliquer pour ouvrir les détails de l'entrepôt ${frigo.name}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="font-bold text-xs text-gray-900 group-hover:text-[#0f62fe] flex items-center gap-1">
                        {frigo.name}
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#0f62fe]" />
                      </span>
                      <div className="text-[10px] text-gray-500">{frigo.location} • Resp: {frigo.managerName || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs text-[#0f62fe] font-mono">{totalKgInFrigo.toLocaleString()} Kg</div>
                      <div className="text-[10px] text-gray-500 font-mono">{activeProducts.length} Produit(s)</div>
                    </div>
                  </div>

                  {/* Products breakdown inside this frigo */}
                  <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1.5">
                    {activeProducts.length === 0 ? (
                      <span className="text-[10px] text-gray-400 italic">Entrepôt vide (0 Kg)</span>
                    ) : (
                      activeProducts.map((stk, sIdx) => {
                        return (
                          <span 
                            key={`${frigo.id}_${stk.productId}_${sIdx}`} 
                            className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-700 shadow-xs"
                          >
                            <span className="font-bold text-gray-900">{stk.productName.split(' ')[0]}</span>: {stk.totalStockKg.toLocaleString()}kg
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200 text-right">
                  <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                    Gérer Entrepôt & Mouvements →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Products Table -> CLICKABLE ROWS */}
      <div className="carbon-card p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <Package className="w-4 h-4 text-[#0f62fe]" />
              {t('products.title', 'Catalogue Produits & Situation des Stocks (Kg)')}
            </h2>
          </div>
          <button
            onClick={() => onNavigate('PRODUCTS_STOCK')}
            className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
          >
            <span>Gérer Catalogue ({products.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="carbon-table w-full">
            <thead>
              <tr>
                <th>{t('products.productCode', 'Code')}</th>
                <th>{t('products.productName', 'Désignation Produit')}</th>
                <th>{t('products.origin', 'Origine')}</th>
                <th>{t('products.sellingPrice', 'Prix Vente HT')}</th>
                <th>{t('products.costPrice', 'Prix Revient HT')}</th>
                <th>{t('products.margin', 'Marge Unitaire')}</th>
                <th>{t('products.totalStock', 'Stock Global (Kg)')}</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-400 text-xs font-medium">
                    {t('common.noData', 'Aucun produit enregistré.')}
                  </td>
                </tr>
              ) : (
                products.map(prd => {
                  const prdStock = productStocks.find(ps => ps.productId === prd.id || ps.productCode === prd.code);
                  const totalKgPrd = prdStock ? prdStock.totalStockKg : stocks.filter(s => s.productId === prd.id).reduce((acc, s) => acc + s.quantityKg, 0);
                  const unitMargin = prd.sellingPriceHT - prd.unitCostHT;
                  const marginPct = prd.sellingPriceHT > 0 ? (unitMargin / prd.sellingPriceHT) * 100 : 0;
                  const isLowStock = totalKgPrd <= prd.minStockAlertKg;

                  return (
                    <tr key={prd.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="font-mono font-bold text-[#0f62fe]">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForHistory(prd)}
                          className="hover:underline text-left cursor-pointer flex items-center gap-1 text-[#0f62fe]"
                          title="Cliquer pour voir l'historique détaillé des mouvements du produit"
                        >
                          <History className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{prd.code}</span>
                        </button>
                      </td>
                      <td className="font-semibold text-gray-900">
                        <button
                          type="button"
                          onClick={() => {
                            if (onEditProduct) {
                              onEditProduct(prd.id);
                            } else {
                              setSelectedProductForHistory(prd);
                            }
                          }}
                          className="hover:text-[#0f62fe] hover:underline text-left cursor-pointer font-bold text-gray-900"
                          title="Cliquer pour modifier ou voir l'historique du produit"
                        >
                          {prd.name}
                        </button>
                      </td>
                      <td>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-700 font-medium">
                          {prd.origin}
                        </span>
                      </td>
                      <td className="font-mono text-gray-900 font-bold">{prd.sellingPriceHT} DH/kg</td>
                      <td className="font-mono text-gray-600">{prd.unitCostHT} DH/kg</td>
                      <td>
                        <span className="font-mono text-xs font-bold text-emerald-600">
                          +{unitMargin} DH ({(marginPct || 0).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="font-mono">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForHistory(prd)}
                          className={`font-bold hover:underline cursor-pointer ${isLowStock ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200' : 'text-gray-900'}`}
                          title="Voir le détail du stock par frigo"
                        >
                          {totalKgPrd.toLocaleString()} Kg
                        </button>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedProductForHistory(prd)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-sans font-semibold"
                            title="Historique des mouvements"
                          >
                            Historique
                          </button>
                          <button
                            onClick={() => onEditProduct ? onEditProduct(prd.id) : onNavigate('PRODUCTS_STOCK')}
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-sans font-semibold"
                            title="Modifier ce produit"
                          >
                            Modifier
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Stock History Modal */}
      {selectedProductForHistory && (
        <ProductStockHistoryModal
          product={selectedProductForHistory}
          isOpen={!!selectedProductForHistory}
          onClose={() => setSelectedProductForHistory(null)}
          onNavigateToBL={(blNumber) => {
            setSelectedProductForHistory(null);
            window.history.pushState({}, '', `/?bl=${blNumber}`);
            onNavigate('DELIVERY_NOTES');
          }}
        />
      )}

    </div>
  );
};
