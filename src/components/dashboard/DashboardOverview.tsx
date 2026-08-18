import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { QRScannerModal } from '../common/QRScannerModal';
import { ProductStockHistoryModal } from '../stock/ProductStockHistoryModal';
import { StandardKpiBarChart } from './StandardKpiBarChart';

interface DashboardOverviewProps {
  onNavigate: (tab: NavTab) => void;
  onViewFrigoDetail?: (frigoId: string) => void;
}


export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate, onViewFrigoDetail }) => {
  const { t } = useTranslation();
  const { products, stocks, frigos, orders, deliveryNotes, invoices, chequesEffets, expenses, clients } = useERP();


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
      window.history.pushState({}, '', `/?bl=${found.blNumber}`);
      onNavigate('DELIVERY_NOTES');
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

  // Stock calculations
  const totalStockKg = stocks.reduce((acc, s) => acc + s.quantityKg, 0);

  // Stock Valuation HT
  const totalStockValuationHT = stocks.reduce((acc, s) => {
    const prd = products.find(p => p.id === s.productId);
    return acc + (s.quantityKg * (prd ? prd.unitCostHT : 0));
  }, 0);

  // Sales calculations
  const totalSalesHT = (orders || []).reduce((acc, o) => acc + (o?.totalHT || 0), 0);
  const totalCostHT = (orders || []).reduce((acc, o) => acc + (o?.totalCostHT || 0), 0);
  const grossMarginHT = totalSalesHT - totalCostHT;
  const globalMarginPct = totalSalesHT > 0 ? (grossMarginHT / totalSalesHT) * 100 : 0;

  // Receivables (Créances Clients) - computed from actual invoice and BL data
  const invoiceReceivables = (invoices || [])
    .filter(inv => inv.status !== 'PAYEE')
    .reduce((acc, inv) => acc + (inv.remainingAmount ?? (inv.totalTTC - (inv.amountPaid || 0))), 0);

  // Only count delivered BLs that haven't been invoiced yet
  const nonInvoicedBLReceivables = (deliveryNotes || [])
    .filter(bl => (bl.status === 'LIVRÉ' || bl.status === 'EN_COURS_LIVRAISON') && !bl.invoiceId)
    .reduce((acc, bl) => acc + (bl.totalTTC || (bl.totalHT * 1.20)), 0);

  const clientBalanceReceivables = (clients || []).reduce((acc, c) => acc + (c.currentBalance || 0), 0);

  // Use the highest of: client balances vs computed receivables (invoices + non-invoiced BLs)
  const totalReceivablesTTC = Math.max(clientBalanceReceivables, invoiceReceivables + nonInvoicedBLReceivables);


  // Cheques due in portfolio
  const chequesInPortfolio = chequesEffets.filter(c => c.status === 'EN_PORTEFEUILLE');
  const totalChequesAmount = chequesInPortfolio.reduce((acc, c) => acc + c.amount, 0);

  // Executive Dashboard Data Aggregations
  const recentBLs = [...deliveryNotes].slice(0, 5);
  const recentInvoices = [...invoices].slice(0, 5);

  const clientChequesToDeposit = chequesEffets.filter(c => c.direction === 'RECETTE_CLIENT' && c.status === 'EN_PORTEFEUILLE');
  const supplierChequesToPay = chequesEffets.filter(c => c.direction === 'DEPENSE_FOURNISSEUR' && c.status !== 'ENCAISSE');

  const topDebtorClients = [...clients]
    .filter(c => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 5);

  // Pending BLs
  const pendingBLsCount = deliveryNotes.filter(bl => !bl.frigoEmployeeApproved).length;


  // Category breakdown for margins (100% derived from real database: orders, BLs, stocks)
  const categoryStats: { [cat: string]: { salesHT: number; costHT: number; marginHT: number } } = {};
  const categorySalesStats: { [cat: string]: { salesHT: number; costHT: number; marginHT: number; stockKg: number; valuationHT: number } } = {};

  // Initialize catalog categories
  ['Dattes Locales', 'Dattes Importées', 'Fruits Secs', 'Huiles & Condiments', 'Autres Produits Alimentaires'].forEach(cat => {
    categorySalesStats[cat] = { salesHT: 0, costHT: 0, marginHT: 0, stockKg: 0, valuationHT: 0 };
  });

  // Real Stocks aggregation by category
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

  // Real Orders / BLs aggregation by category
  orders.forEach(ord => {
    ord.items.forEach(item => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { salesHT: 0, costHT: 0, marginHT: 0 };
      }
      const itemCost = item.quantityKg * item.unitCostHT;
      categoryStats[item.category].salesHT += item.totalHT;
      categoryStats[item.category].costHT += itemCost;
      categoryStats[item.category].marginHT += (item.totalHT - itemCost);

      if (!categorySalesStats[item.category]) {
        categorySalesStats[item.category] = { salesHT: 0, costHT: 0, marginHT: 0, stockKg: 0, valuationHT: 0 };
      }
      categorySalesStats[item.category].salesHT += item.totalHT;
      categorySalesStats[item.category].costHT += itemCost;
      categorySalesStats[item.category].marginHT += (item.totalHT - itemCost);
    });
  });


  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0f62fe]" />
            {t('dashboard.title', 'Tableau de Bord & Marges')}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {t('app.description', 'Négoce de Dattes Locales & Importées • Suivi Logistique en Temps Réel')}
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
            onClick={() => onNavigate('PURCHASES_IMPORTS')}
            className="bg-[#262626] hover:bg-[#393939] text-gray-200 border border-[#525252] text-xs px-3 py-2 rounded flex items-center gap-1.5 transition-colors font-semibold"
          >
            {t('purchases.newPurchase', 'Saisir Arrivée Conteneur')}
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Sales & Margin */}
        <div className="carbon-card p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('dashboard.totalRevenue', 'Chiffre d\'Affaires HT')}</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 mt-2">
            {totalSalesHT.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">{t('dashboard.grossMargin', 'Marge Brute')}:</span>
            <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {grossMarginHT.toLocaleString()} DH ({(globalMarginPct || 0).toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* KPI 2: Stock Valuation */}
        <div className="carbon-card p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('dashboard.stockValuation', 'Valeur Stock Global')}</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
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
        </div>

        {/* KPI 3: Receivables */}
        <div className="carbon-card p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('clients.receivables', 'Créances Clients (TTC)')}</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700 mt-2">
            {totalReceivablesTTC.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">{t('clients.title', 'Clients')}:</span>
            <span className="font-mono font-semibold text-gray-700">
              {clients.length} {t('nav.clients', 'Clients')}
            </span>
          </div>
        </div>

        {/* KPI 4: Cheques in Portfolio */}
        <div className="carbon-card p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('dashboard.pendingCheques', 'Chèques Portefeuille')}</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-2">
            {totalChequesAmount.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">{t('treasury.title', 'Titres')}:</span>
            <span className="font-mono font-semibold text-amber-800">
              {chequesInPortfolio.length}
            </span>
          </div>
        </div>
      </div>

      {/* Clean Flat KPI Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Real Sales & Valuation HT by Category */}
        <StandardKpiBarChart
          title="Valorisation & Chiffre d'Affaires HT par Catégorie"
          subtitle="Chiffres d'affaires et valorisation réelle des stocks par famille de produit"
          unit="DH"
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
              const fKg = stocks.filter(s => s.frigoId === f.id).reduce((sum, s) => sum + s.quantityKg, 0);
              const fPal = stocks.filter(s => s.frigoId === f.id).reduce((sum, s) => sum + s.quantityPallets, 0);
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

        {/* Widget 1: Derniers Bons de Livraison (BL) */}
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
              <span>Tous les BL</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentBLs.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucun Bon de Livraison enregistré.</p>
            ) : (
              recentBLs.map(bl => (
                <div key={bl.id} className="p-2.5 bg-gray-50 border border-gray-200 rounded flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="text-[#0f62fe]">{bl.blNumber}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-sans text-gray-700">{bl.clientName}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                      {bl.date} • {bl.frigoName || 'Frigo'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">{bl.totalKg.toLocaleString()} Kg</div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                      bl.frigoEmployeeApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {bl.frigoEmployeeApproved ? 'Quai Validé' : 'En Attente'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 2: Dernières Factures Émises */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Dernières Factures Émises
            </h2>
            <button
              onClick={() => onNavigate('INVOICING')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Voir Factures</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentInvoices.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucune facture récente enregistrée.</p>
            ) : (
              recentInvoices.map(inv => (
                <div key={inv.id} className="p-2.5 bg-gray-50 border border-gray-200 rounded flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="text-emerald-700">{inv.invoiceNumber}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-sans text-gray-700">{inv.clientName}</span>
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

        {/* Widget 3: Chèques Client en Portefeuille (À Déposer) */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              Chèques Client en Portefeuille (À Déposer)
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
              <p className="text-xs text-gray-400 italic py-4">Aucun chèque client en attente de dépôt.</p>
            ) : (
              clientChequesToDeposit.slice(0, 5).map(cq => (
                <div key={cq.id} className="p-2.5 bg-purple-50/40 border border-purple-200 rounded flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-purple-900">
                      N° {cq.referenceNumber} — {cq.clientName || 'Client'}
                    </div>
                    <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                      Banque: {cq.bankName || 'Maroc'} • Échéance: {cq.dueDate}
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

        {/* Widget 4: Échéances Chèques / Effets Fournisseurs (À Payer) */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Échéances Chèques / Effets à Payer
            </h2>
            <button
              onClick={() => onNavigate('TREASURY_CHEQUES')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Voir Échéances</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {supplierChequesToPay.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">Aucun chèque fournisseur à payer en cours.</p>
            ) : (
              supplierChequesToPay.slice(0, 5).map(cq => (
                <div key={cq.id} className="p-2.5 bg-amber-50/40 border border-amber-200 rounded flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-amber-900">
                      N° {cq.referenceNumber} — {cq.supplierName || 'Fournisseur'}
                    </div>
                    <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                      Banque: {cq.bankName || 'Maroc'} • Échéance: {cq.dueDate}
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

      {/* Grid: Top Debtor Clients & Detailed Frigos Breakdown with Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Widget 5: Clients à Suivre (Créances & Solde Dû le + Élevé) */}
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
              <span>Voir Clients</span>
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
                  <div key={c.id} className="p-3 bg-gray-50 border border-gray-200 rounded font-mono">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-gray-900 font-sans">{c.name} {c.companyName ? `(${c.companyName})` : ''}</span>
                      <span className="font-bold text-rose-600 text-sm">{c.currentBalance.toLocaleString()} DH</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${creditRatio > 80 ? 'bg-rose-600' : 'bg-amber-500'}`} 
                        style={{ width: `${creditRatio}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1 font-sans">
                      <span>Téléphone: {c.phone || '-'}</span>
                      <span>Plafond: {c.creditLimit.toLocaleString()} DH ({creditRatio}% utilisé)</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Widget 6: État des Frigos (Stock Kg & Détail Produits Stoppés) */}
        <div className="carbon-card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0f62fe]" />
              État des Frigos (Stock en Kg & Produits Présents)
            </h2>
            <button
              onClick={() => onNavigate('FRIGO_MANAGEMENT')}
              className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
            >
              <span>Gestion Frigos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {frigos.map(frigo => {
              const frigoStocks = stocks.filter(s => s.frigoId === frigo.id && s.quantityKg > 0);
              const totalKgInFrigo = frigoStocks.reduce((acc, s) => acc + s.quantityKg, 0);

              return (
                <div 
                  key={frigo.id} 
                  onClick={() => onViewFrigoDetail ? onViewFrigoDetail(frigo.id) : onNavigate('FRIGO_MANAGEMENT')}
                  className="p-3 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:border-[#0f62fe] hover:bg-blue-50/40 transition-all group"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <div>
                      <span className="font-bold text-xs text-gray-900 group-hover:text-[#0f62fe] flex items-center gap-1">
                        {frigo.name}
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#0f62fe]" />
                      </span>
                      <div className="text-[10px] text-gray-500">{frigo.location} • Resp: {frigo.managerName || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs text-[#0f62fe] font-mono">{totalKgInFrigo.toLocaleString()} Kg</div>
                      <div className="text-[10px] text-gray-500 font-mono">{frigoStocks.length} Produits stockés</div>
                    </div>
                  </div>

                  {/* Products breakdown inside this frigo */}
                  <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1.5">
                    {frigoStocks.length === 0 ? (
                      <span className="text-[10px] text-gray-400 italic">Entrepôt vide (aucun produit en stock)</span>
                    ) : (
                      frigoStocks.map((stk, sIdx) => {
                        const prd = products.find(p => p.id === stk.productId);
                        return (
                          <span key={stk.id || `${stk.frigoId}_${stk.productId}_${sIdx}`} className="text-[10px] font-mono px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-800 font-bold">
                            {prd ? prd.name : 'Produit'}: <b className="text-blue-700">{stk.quantityKg.toLocaleString()} Kg</b>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>


      {/* Top Products Table */}
      <div className="carbon-card p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
              {t('products.title', 'Catalogue Produits & Stock (Kg)')}
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>{t('products.productCode', 'Code')}</th>
                <th>{t('products.productName', 'Désignation Produit')}</th>
                <th>{t('products.origin', 'Origine')}</th>
                <th>{t('products.sellingPrice', 'Prix Vente HT')}</th>
                <th>{t('products.costPrice', 'Prix Revient HT')}</th>
                <th>{t('products.margin', 'Marge Unitaire')}</th>
                <th>{t('products.totalStock', 'Stock Global (Kg)')}</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400 text-xs font-medium">
                    {t('common.noData', 'Aucun produit enregistré. Utilisez le bouton "Nouveau Produit" pour ajouter.')}
                  </td>
                </tr>
              ) : (
                products.map(prd => {
                  const totalKgPrd = stocks.filter(s => s.productId === prd.id).reduce((acc, s) => acc + s.quantityKg, 0);
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
                          onClick={() => setSelectedProductForHistory(prd)}
                          className="hover:text-[#0f62fe] hover:underline text-left cursor-pointer font-bold text-gray-900"
                          title="Cliquer pour voir l'historique du produit"
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

