import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
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
  Camera
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { QRScannerModal } from '../common/QRScannerModal';

interface DashboardOverviewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { products, stocks, frigos, orders, deliveryNotes, invoices, chequesEffets, expenses, clients } = useERP();

  const [quickBlSearch, setQuickBlSearch] = useState('');
  const [blSearchError, setBlSearchError] = useState('');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

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
  const totalSalesHT = orders.reduce((acc, o) => acc + o.totalHT, 0);
  const totalCostHT = orders.reduce((acc, o) => acc + o.totalCostHT, 0);
  const grossMarginHT = totalSalesHT - totalCostHT;
  const globalMarginPct = totalSalesHT > 0 ? (grossMarginHT / totalSalesHT) * 100 : 0;

  // Receivables (Créances Clients)
  const totalReceivablesTTC = clients.reduce((acc, c) => acc + c.currentBalance, 0);

  // Cheques due in portfolio
  const chequesInPortfolio = chequesEffets.filter(c => c.status === 'EN_PORTEFEUILLE');
  const totalChequesAmount = chequesInPortfolio.reduce((acc, c) => acc + c.amount, 0);

  // Pending BLs
  const pendingBLsCount = deliveryNotes.filter(bl => !bl.frigoEmployeeApproved).length;

  // Category breakdown for margins
  const categoryStats: { [cat: string]: { salesHT: number; costHT: number; marginHT: number } } = {};
  orders.forEach(ord => {
    ord.items.forEach(item => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { salesHT: 0, costHT: 0, marginHT: 0 };
      }
      const itemCost = item.quantityKg * item.unitCostHT;
      categoryStats[item.category].salesHT += item.totalHT;
      categoryStats[item.category].costHT += itemCost;
      categoryStats[item.category].marginHT += (item.totalHT - itemCost);
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
              { Indicateur: t('dashboard.grossMargin', 'Marge Brute'), Valeur: `${grossMarginHT.toLocaleString()} DH (${globalMarginPct.toFixed(1)}%)` },
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
              {grossMarginHT.toLocaleString()} DH ({globalMarginPct.toFixed(1)}%)
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

      {/* Main Grid: Margins Analysis & Frigos Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Margin Analysis by Category */}
        <div className="lg:col-span-2 carbon-card p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                {t('dashboard.marginByProduct', 'Analyse des Marges Brutes par Catégorie')}
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(categoryStats).length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">{t('common.noData', 'Aucune commande enregistrée.')}</p>
            ) : (
              Object.entries(categoryStats).map(([category, stats]) => {
                const catMarginPct = stats.salesHT > 0 ? (stats.marginHT / stats.salesHT) * 100 : 0;
                return (
                  <div key={category} className="p-3 bg-gray-50 border border-gray-200 rounded">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-gray-800">{category}</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        {t('products.margin', 'Marge')}: {stats.marginHT.toLocaleString()} DH ({catMarginPct.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-blue-600 h-full" 
                        style={{ width: `${Math.min(100, (stats.costHT / (stats.salesHT || 1)) * 100)}%` }}
                      />
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${Math.min(100, catMarginPct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1.5 font-mono">
                      <span>{t('sales.totalHT', 'Ventes HT')}: {stats.salesHT.toLocaleString()} DH</span>
                      <span>{t('products.costPrice', 'Coût HT')}: {stats.costHT.toLocaleString()} DH</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cold Storage Frigos Occupancy */}
        <div className="carbon-card p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0f62fe]" />
                {t('frigos.title', 'État des Frigos')}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('PRODUCTS_STOCK')}
              className="text-xs text-[#0f62fe] font-semibold hover:underline"
            >
              {t('nav.stock', 'Stock')}
            </button>
          </div>

          <div className="space-y-3.5">
            {frigos.map(frigo => {
              const frigoStocks = stocks.filter(s => s.frigoId === frigo.id);
              const totalKgInFrigo = frigoStocks.reduce((acc, s) => acc + s.quantityKg, 0);

              return (
                <div key={frigo.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-bold text-xs text-gray-900">{frigo.name}</span>
                      <div className="text-[10px] text-gray-500">{frigo.managerName} ({frigo.managerPhone})</div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-gray-700 font-mono mt-2 font-bold">
                    <span>{t('stock.logistics', 'Stock Total')}:</span>
                    <span className="text-[#0f62fe]">{totalKgInFrigo.toLocaleString()} Kg</span>
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
                    <tr key={prd.id}>
                      <td className="font-mono font-bold text-[#0f62fe]">{prd.code}</td>
                      <td className="font-semibold text-gray-900">{prd.name}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-700">
                          {prd.origin}
                        </span>
                      </td>
                      <td className="font-mono text-gray-900 font-bold">{prd.sellingPriceHT} DH/kg</td>
                      <td className="font-mono text-gray-600">{prd.unitCostHT} DH/kg</td>
                      <td>
                        <span className="font-mono text-xs font-bold text-emerald-600">
                          +{unitMargin} DH ({marginPct.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="font-mono">
                        <span className={`font-bold ${isLowStock ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200' : 'text-gray-900'}`}>
                          {totalKgPrd.toLocaleString()} Kg
                        </span>
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
  );
};
