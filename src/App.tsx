import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { ERPProvider, useERP } from './context/ERPContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { SubHeader } from './components/layout/SubHeader';
import { StatusBar } from './components/layout/StatusBar';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { BLPdfDocument } from './components/pdf/BLPdfDocument';
import { DeliveryNoteBL } from './types';
import { AppUser } from './types/permissions';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Users, 
  Menu
} from 'lucide-react';

// Lazy-loaded page components
const DashboardOverview = lazy(() => import('./components/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const ProductsList = lazy(() => import('./components/stock/ProductsList').then(m => ({ default: m.ProductsList })));
const MultiFrigoInventory = lazy(() => import('./components/stock/MultiFrigoInventory').then(m => ({ default: m.MultiFrigoInventory })));
const DeliveryNotesBL = lazy(() => import('./components/sales/DeliveryNotesBL').then(m => ({ default: m.DeliveryNotesBL })));
const SalesOrders = lazy(() => import('./components/sales/SalesOrders').then(m => ({ default: m.SalesOrders })));
const ImportInvoiceEntry = lazy(() => import('./components/purchases/ImportInvoiceEntry').then(m => ({ default: m.ImportInvoiceEntry })));
const InvoicesList = lazy(() => import('./components/finance/InvoicesList').then(m => ({ default: m.InvoicesList })));
const TreasuryCheques = lazy(() => import('./components/finance/TreasuryCheques').then(m => ({ default: m.TreasuryCheques })));
const ExpensesManager = lazy(() => import('./components/finance/ExpensesManager').then(m => ({ default: m.ExpensesManager })));
const ClientsSuppliers = lazy(() => import('./components/directory/ClientsSuppliers').then(m => ({ default: m.ClientsSuppliers })));
const FrigoManagement = lazy(() => import('./components/stock/FrigoManagement').then(m => ({ default: m.FrigoManagement })));
const CompanySettings = lazy(() => import('./components/company/CompanySettings').then(m => ({ default: m.CompanySettings })));

// New full-page edit components
const ProductEditPage = lazy(() => import('./components/stock/ProductEditPage').then(m => ({ default: m.ProductEditPage })));
const ClientEditPage = lazy(() => import('./components/directory/ClientEditPage').then(m => ({ default: m.ClientEditPage })));
const SupplierEditPage = lazy(() => import('./components/directory/SupplierEditPage').then(m => ({ default: m.SupplierEditPage })));
const FrigoEditPage = lazy(() => import('./components/stock/FrigoEditPage').then(m => ({ default: m.FrigoEditPage })));
const BLEditPage = lazy(() => import('./components/sales/BLEditPage').then(m => ({ default: m.BLEditPage })));
const OrderEditPage = lazy(() => import('./components/sales/OrderEditPage').then(m => ({ default: m.OrderEditPage })));
const ExpenseEditPage = lazy(() => import('./components/finance/ExpenseEditPage').then(m => ({ default: m.ExpenseEditPage })));
const ChequeEditPage = lazy(() => import('./components/finance/ChequeEditPage').then(m => ({ default: m.ChequeEditPage })));

// New feature pages
const UserManagement = lazy(() => import('./components/users/UserManagement').then(m => ({ default: m.UserManagement })));
const BLImportPage = lazy(() => import('./components/sales/BLImportPage').then(m => ({ default: m.BLImportPage })));
const BackupRestore = lazy(() => import('./components/settings/BackupRestore').then(m => ({ default: m.BackupRestore })));
const BLSignaturePage = lazy(() => import('./components/sales/BLSignaturePage').then(m => ({ default: m.BLSignaturePage })));
const BLPdfPage = lazy(() => import('./components/sales/BLPdfPage').then(m => ({ default: m.BLPdfPage })));
const FrigoOperationsPage = lazy(() => import('./components/stock/FrigoOperationsPage').then(m => ({ default: m.FrigoOperationsPage })));

// Extended NavTab type with edit sub-views
export type ExtendedNavTab = NavTab | 
  'PRODUCT_EDIT' | 'CLIENT_EDIT' | 'SUPPLIER_EDIT' | 'FRIGO_EDIT' |
  'BL_EDIT' | 'ORDER_EDIT' | 'EXPENSE_EDIT' | 'CHEQUE_EDIT' |
  'USERS' | 'IMPORT_BL' | 'BACKUP' | 'BL_SIGN' | 'BL_PDF' | 'FRIGO_OPS';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#0f62fe] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function ERPContent({ appUser }: { appUser: AppUser }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ExtendedNavTab>(() => {
    return appUser?.role === 'RESPONSABLE_FRIGO' ? 'DELIVERY_NOTES' : 'DASHBOARD';
  });
  const [activePdfBL, setActivePdfBL] = useState<DeliveryNoteBL | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<ExtendedNavTab>('DASHBOARD');
  const { frigos, deliveryNotes, setCurrentUser } = useERP();

  // CRITICAL: Sync authenticated appUser into ERPContext.currentUser
  // so role-based filtering (RESPONSABLE_FRIGO sees only their warehouse) works
  useEffect(() => {
    if (appUser) {
      setCurrentUser({
        id: appUser.uid,
        name: appUser.displayName || appUser.email,
        email: appUser.email,
        role: appUser.role,
        assignedFrigoId: appUser.assignedFrigoId,
        avatar: appUser.avatar,
      });
    }
  }, [appUser.uid, appUser.role, appUser.assignedFrigoId]);

  // Handle direct links like https://ez-erp-pro.vercel.app/?bl=BL-2026-7219
  useEffect(() => {
    if (typeof window === 'undefined' || !deliveryNotes || deliveryNotes.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const blParam = params.get('bl');
    if (blParam) {
      const match = deliveryNotes.find(b => b.blNumber === blParam || b.id === blParam);
      if (match) {
        setEditingEntityId(match.id);
        setActiveTab('BL_PDF');
        // Clean up query param so refreshes and tab navigation stay on active state cleanly
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [deliveryNotes]);

  // Sync activeTab with URL params & handle browser back button (popstate)
  const updateUrlAndTab = (tab: ExtendedNavTab, entityId: string | null = null, pushState = true) => {
    setEditingEntityId(entityId);
    setActiveTab(tab);

    if (pushState && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (entityId) {
        url.searchParams.set('id', entityId);
      } else {
        url.searchParams.delete('id');
      }
      window.history.pushState({ tab, entityId }, '', url.toString());
    }
  };

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab);
        setEditingEntityId(e.state.entityId || null);
      } else if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as ExtendedNavTab;
        const idParam = params.get('id');
        if (tabParam) {
          setActiveTab(tabParam);
          setEditingEntityId(idParam || null);
        } else {
          setActiveTab(appUser?.role === 'RESPONSABLE_FRIGO' ? 'DELIVERY_NOTES' : 'DASHBOARD');
          setEditingEntityId(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [appUser?.role]);

  // Navigate to an edit page
  const navigateToEdit = (editTab: ExtendedNavTab, entityId: string | null = null) => {
    setPreviousTab(activeTab);
    updateUrlAndTab(editTab, entityId, true);
  };

  // Navigate back from edit page
  const navigateBack = () => {
    setEditingEntityId(null);
    updateUrlAndTab(previousTab, null, true);
  };

  const setNavTab = (tab: NavTab) => {
    setPreviousTab(activeTab);
    updateUrlAndTab(tab as ExtendedNavTab, null, true);
  };


  const renderTabContent = () => {
    // If user is RESPONSABLE_FRIGO, strictly lock view to DELIVERY_NOTES, BL_EDIT, BL_SIGN or BL_PDF only!
    if (appUser?.role === 'RESPONSABLE_FRIGO') {
      if (activeTab === 'BL_EDIT') {
        return <BLEditPage editId={editingEntityId} onBack={navigateBack} />;
      }
      if (activeTab === 'BL_SIGN') {
        return <BLSignaturePage blId={editingEntityId} onBack={navigateBack} />;
      }
      if (activeTab === 'BL_PDF') {
        return <BLPdfPage blId={editingEntityId} onBack={navigateBack} />;
      }
      return (
        <DeliveryNotesBL 
          onEditBL={(id) => navigateToEdit('BL_EDIT', id)} 
          onNewBL={() => navigateToEdit('BL_EDIT', null)} 
          onEditClient={(id) => navigateToEdit('CLIENT_EDIT', id)}
          onEditProduct={(id) => navigateToEdit('PRODUCT_EDIT', id)}
          onEditFrigo={(id) => navigateToEdit('FRIGO_EDIT', id)}
          onSignBL={(id) => navigateToEdit('BL_SIGN', id)}
          onViewBLPdf={(id) => navigateToEdit('BL_PDF', id)}
        />
      );
    }

    switch (activeTab) {
      case 'DASHBOARD':
        return (
          <DashboardOverview 
            onNavigate={(tab: NavTab) => setNavTab(tab)} 
            onViewFrigoDetail={(frigoId) => {
              setEditingEntityId(frigoId);
              setPreviousTab('DASHBOARD');
              updateUrlAndTab('FRIGO_MANAGEMENT', frigoId, true);
            }}
          />
        );
      case 'PRODUCTS_STOCK':
        return <ProductsList onEditProduct={(id) => navigateToEdit('PRODUCT_EDIT', id)} onNewProduct={() => navigateToEdit('PRODUCT_EDIT', null)} />;
      case 'DELIVERY_NOTES':
        return (
          <DeliveryNotesBL 
            onEditBL={(id) => navigateToEdit('BL_EDIT', id)} 
            onNewBL={() => navigateToEdit('BL_EDIT', null)} 
            onEditClient={(id) => navigateToEdit('CLIENT_EDIT', id)}
            onEditProduct={(id) => navigateToEdit('PRODUCT_EDIT', id)}
            onEditFrigo={(id) => navigateToEdit('FRIGO_EDIT', id)}
            onSignBL={(id) => navigateToEdit('BL_SIGN', id)}
            onViewBLPdf={(id) => navigateToEdit('BL_PDF', id)}
          />
        );
      case 'CLIENTS':
        return <ClientsSuppliers initialTab="CLIENTS" onViewBLPdf={(bl) => setActivePdfBL(bl)} onEditClient={(id) => navigateToEdit('CLIENT_EDIT', id)} onNewClient={() => navigateToEdit('CLIENT_EDIT', null)} />;
      case 'SALES_ORDERS':
        return <SalesOrders onEditOrder={(id) => navigateToEdit('ORDER_EDIT', id)} onNewOrder={() => navigateToEdit('ORDER_EDIT', null)} />;
      case 'PURCHASES_IMPORTS':
        return <ImportInvoiceEntry />;
      case 'MULTI_SITE_INVENTORY':
        return <MultiFrigoInventory />;
      case 'INVOICING':
        return <InvoicesList />;
      case 'TREASURY_CHEQUES':
        return <TreasuryCheques onEditCheque={(id) => navigateToEdit('CHEQUE_EDIT', id)} onNewCheque={() => navigateToEdit('CHEQUE_EDIT', null)} />;
      case 'EXPENSES':
        return <ExpensesManager onEditExpense={(id) => navigateToEdit('EXPENSE_EDIT', id)} onNewExpense={() => navigateToEdit('EXPENSE_EDIT', null)} />;
      case 'DIRECTORY':
        return <ClientsSuppliers initialTab="SUPPLIERS" onViewBLPdf={(bl) => setActivePdfBL(bl)} onEditSupplier={(id) => navigateToEdit('SUPPLIER_EDIT', id)} onNewSupplier={() => navigateToEdit('SUPPLIER_EDIT', null)} />;
      case 'FRIGO_MANAGEMENT':
        return (
          <FrigoManagement 
            onEditFrigo={(id) => navigateToEdit('FRIGO_EDIT', id)} 
            onNewFrigo={() => navigateToEdit('FRIGO_EDIT', null)} 
            initialFrigoId={editingEntityId}
          />
        );

      case 'COMPANY_INFO':
        return <CompanySettings />;

      // New full-page edit views
      case 'PRODUCT_EDIT':
        return <ProductEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'CLIENT_EDIT':
        return <ClientEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'SUPPLIER_EDIT':
        return <SupplierEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'FRIGO_EDIT':
        return <FrigoEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'BL_EDIT':
        return <BLEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'ORDER_EDIT':
        return <OrderEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'EXPENSE_EDIT':
        return <ExpenseEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'CHEQUE_EDIT':
        return <ChequeEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'BL_SIGN':
        return <BLSignaturePage blId={editingEntityId} onBack={navigateBack} />;
      case 'BL_PDF':
        return <BLPdfPage blId={editingEntityId} onBack={navigateBack} />;

      // New feature pages
      case 'USERS':
        return <UserManagement />;
      case 'IMPORT_BL':
        return <BLImportPage onBack={() => setNavTab('DELIVERY_NOTES')} />;
      case 'BACKUP':
        return <BackupRestore />;
      case 'FRIGO_OPS':
        return <FrigoOperationsPage initialFrigoId={editingEntityId} onBack={navigateBack} />;

      default:
        return <DashboardOverview onNavigate={(tab: NavTab) => setNavTab(tab)} />;
    }
  };

  return (
    <div className="h-screen bg-[#f4f4f4] text-[#161616] flex flex-col font-sans overflow-hidden">
      <Navbar 
        onNavigateToBL={() => setNavTab('DELIVERY_NOTES')}
        onNavigateToCheques={() => setNavTab('TREASURY_CHEQUES')}
        onOpenSearch={() => setIsSearchOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        appUser={appUser}
      />
      <SubHeader activeTab={activeTab as NavTab} setActiveTab={setNavTab} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          activeTab={activeTab as NavTab} 
          setActiveTab={(tab: NavTab) => setNavTab(tab)} 
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          appUser={appUser}
          onNavigateExtended={(tab: ExtendedNavTab) => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
        />
        
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto w-full pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <div key={activeTab + (editingEntityId || '')} className="tab-fade-in">
              <Suspense fallback={<LoadingSpinner />}>
                {renderTabContent()}
              </Suspense>
            </div>
          </div>
        </main>
      </div>

      {/* Smartphone Bottom Quick Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#161616] border-t border-[#393939] text-white z-30 flex justify-around items-center px-1 py-1.5 shadow-lg select-none">
        <button
          onClick={() => { setNavTab('DASHBOARD'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono ${
            activeTab === 'DASHBOARD' ? 'text-[#0f62fe] font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>{t('nav.home')}</span>
        </button>

        <button
          onClick={() => { setNavTab('PRODUCTS_STOCK'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono ${
            activeTab === 'PRODUCTS_STOCK' ? 'text-[#0f62fe] font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span>{t('nav.stock')}</span>
        </button>

        <button
          onClick={() => { setNavTab('DELIVERY_NOTES'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono relative ${
            activeTab === 'DELIVERY_NOTES' ? 'text-[#0f62fe] font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span>{t('nav.bl')}</span>
        </button>

        <button
          onClick={() => { setNavTab('CLIENTS'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono ${
            activeTab === 'CLIENTS' ? 'text-[#0f62fe] font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>{t('nav.clients')}</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono ${
            isMobileMenuOpen ? 'text-[#0f62fe] font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>{t('nav.menu')}</span>
        </button>
      </nav>

      {/* Global BL PDF Viewer Modal */}
      {activePdfBL && (
        <BLPdfDocument
          bl={activePdfBL}
          frigo={frigos.find(f => f.id === activePdfBL.frigoId)}
          onClose={() => setActivePdfBL(null)}
        />
      )}

      {/* Global Quick Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab: NavTab) => setNavTab(tab)}
      />

      <div className="hidden md:block">
        <StatusBar />
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#161616] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#262626] p-8 rounded-lg border border-red-500/50 max-w-lg shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-red-400">Une erreur inattendue est survenue</h2>
            <p className="text-sm text-gray-300">
              Une anomalie d'affichage s'est produite. Vous pouvez recharger l'application ou réinitialiser votre session.
            </p>
            <div className="text-xs font-mono bg-[#161616] p-3 rounded text-red-300 text-left overflow-auto max-h-32">
              {this.state.error?.toString()}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold rounded"
              >
                Recharger la Page
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded"
              >
                Réinitialiser la Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { ToastProvider } from './components/common/CarbonToastContainer';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ERPProvider>
          <AuthGuard>
            {(appUser) => <ERPContent appUser={appUser} />}
          </AuthGuard>
        </ERPProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}


