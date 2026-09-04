import React, { Component, useState, useEffect, Suspense, lazy, ErrorInfo, ReactNode } from 'react';
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
import { AppUser, hasModuleAccess } from './types/permissions';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Users, 
  Menu,
  ShieldAlert,
  Landmark,
  Receipt,
  PenTool,
  Camera,
  FileText
} from 'lucide-react';

// Helper function to safely lazy-load components and auto-reload on stale deployment chunk errors
function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const errorStr = error?.message || error?.toString() || '';
      const isChunkError = 
        error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(errorStr) ||
        /Importing a module script failed/i.test(errorStr) ||
        /error loading dynamically imported module/i.test(errorStr);
      
      if (isChunkError) {
        const storageKey = 'erp_chunk_load_reload';
        const lastReload = sessionStorage.getItem(storageKey);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem(storageKey, now.toString());
          window.location.reload();
          return new Promise(() => {}); // Wait for reload
        }
      }
      throw error;
    }
  });
}

// Lazy-loaded page components using safeLazy
const DashboardOverview = safeLazy(() => import('./components/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const ProductsList = safeLazy(() => import('./components/stock/ProductsList').then(m => ({ default: m.ProductsList })));
const MultiFrigoInventory = safeLazy(() => import('./components/stock/MultiFrigoInventory').then(m => ({ default: m.MultiFrigoInventory })));
const DeliveryNotesBL = safeLazy(() => import('./components/sales/DeliveryNotesBL').then(m => ({ default: m.DeliveryNotesBL })));
const SalesOrders = safeLazy(() => import('./components/sales/SalesOrders').then(m => ({ default: m.SalesOrders })));
const ImportInvoiceEntry = safeLazy(() => import('./components/purchases/ImportInvoiceEntry').then(m => ({ default: m.ImportInvoiceEntry })));
const InvoicesList = safeLazy(() => import('./components/finance/InvoicesList').then(m => ({ default: m.InvoicesList })));
const TreasuryCheques = safeLazy(() => import('./components/finance/TreasuryCheques').then(m => ({ default: m.TreasuryCheques })));
const ExpensesManager = safeLazy(() => import('./components/finance/ExpensesManager').then(m => ({ default: m.ExpensesManager })));
const ClientsSuppliers = safeLazy(() => import('./components/directory/ClientsSuppliers').then(m => ({ default: m.ClientsSuppliers })));
const FrigoManagement = safeLazy(() => import('./components/stock/FrigoManagement').then(m => ({ default: m.FrigoManagement })));
const CompanySettings = safeLazy(() => import('./components/company/CompanySettings').then(m => ({ default: m.CompanySettings })));

// New full-page edit components
const ProductEditPage = safeLazy(() => import('./components/stock/ProductEditPage').then(m => ({ default: m.ProductEditPage })));
const ClientEditPage = safeLazy(() => import('./components/directory/ClientEditPage').then(m => ({ default: m.ClientEditPage })));
const SupplierEditPage = safeLazy(() => import('./components/directory/SupplierEditPage').then(m => ({ default: m.SupplierEditPage })));
const FrigoEditPage = safeLazy(() => import('./components/stock/FrigoEditPage').then(m => ({ default: m.FrigoEditPage })));
const BLEditPage = safeLazy(() => import('./components/sales/BLEditPage').then(m => ({ default: m.BLEditPage })));
const OrderEditPage = safeLazy(() => import('./components/sales/OrderEditPage').then(m => ({ default: m.OrderEditPage })));
const ExpenseEditPage = safeLazy(() => import('./components/finance/ExpenseEditPage').then(m => ({ default: m.ExpenseEditPage })));
const ChequeEditPage = safeLazy(() => import('./components/finance/ChequeEditPage').then(m => ({ default: m.ChequeEditPage })));
const PurchaseInvoiceEditPage = safeLazy(() => import('./components/purchases/PurchaseInvoiceEditPage').then(m => ({ default: m.PurchaseInvoiceEditPage })));

// New feature pages
const UserManagement = safeLazy(() => import('./components/users/UserManagement').then(m => ({ default: m.UserManagement })));
const BLImportPage = safeLazy(() => import('./components/sales/BLImportPage').then(m => ({ default: m.BLImportPage })));
const BackupRestore = safeLazy(() => import('./components/settings/BackupRestore').then(m => ({ default: m.BackupRestore })));
const BLSignaturePage = safeLazy(() => import('./components/sales/BLSignaturePage').then(m => ({ default: m.BLSignaturePage })));
const BLPdfPage = safeLazy(() => import('./components/sales/BLPdfPage').then(m => ({ default: m.BLPdfPage })));
const FrigoOperationsPage = safeLazy(() => import('./components/stock/FrigoOperationsPage').then(m => ({ default: m.FrigoOperationsPage })));
const ProductStockHistoryPage = safeLazy(() => import('./components/stock/ProductStockHistoryPage').then(m => ({ default: m.ProductStockHistoryPage })));
const StockRepackagingPage = safeLazy(() => import('./components/stock/StockRepackagingPage').then(m => ({ default: m.StockRepackagingPage })));
const MassBLCreationPage = safeLazy(() => import('./components/sales/MassBLCreationModal').then(m => ({ default: m.MassBLCreationPage })));

// Extended NavTab type with edit sub-views
export type ExtendedNavTab = NavTab | 
  'PRODUCT_EDIT' | 'CLIENT_EDIT' | 'SUPPLIER_EDIT' | 'FRIGO_EDIT' |
  'BL_EDIT' | 'ORDER_EDIT' | 'EXPENSE_EDIT' | 'CHEQUE_EDIT' | 'PURCHASE_EDIT' |
  'USERS' | 'IMPORT_BL' | 'BACKUP' | 'BL_SIGN' | 'BL_PDF' | 'FRIGO_OPS' | 'PRODUCT_HISTORY' | 'STOCK_REPACKAGING' | 'MASS_BL';

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
  const [blInitialClientId, setBlInitialClientId] = useState<string | null>(null);
  const [clientInitialTab, setClientInitialTab] = useState<'DETAILS' | 'BL_HISTORY' | 'INVOICES' | 'PAYMENTS'>('DETAILS');
  const [previousTab, setPreviousTab] = useState<ExtendedNavTab>('DASHBOARD');
  const { frigos, deliveryNotes, currentUser, setCurrentUser } = useERP();

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

  const isTabAuthorized = (tab: ExtendedNavTab): boolean => {
    if (!appUser) return true;
    if (appUser.role === 'SUPER_ADMIN' || appUser.role === 'ADMIN') return true;

    if (appUser.role === 'RESPONSABLE_FRIGO') {
      return ['DELIVERY_NOTES', 'BL_EDIT', 'BL_SIGN', 'BL_PDF', 'FRIGO_OPS'].includes(tab);
    }

    const extendedModuleMap: Record<string, string> = {
      'DASHBOARD': 'DASHBOARD',
      'PRODUCTS_STOCK': 'PRODUCTS',
      'PRODUCT_EDIT': 'PRODUCTS',
      'DELIVERY_NOTES': 'BL',
      'BL_EDIT': 'BL',
      'BL_SIGN': 'BL',
      'BL_PDF': 'BL',
      'CLIENTS': 'CLIENTS',
      'CLIENT_EDIT': 'CLIENTS',
      'SALES_ORDERS': 'SALES_ORDERS',
      'ORDER_EDIT': 'SALES_ORDERS',
      'PURCHASES_IMPORTS': 'PURCHASES',
      'PURCHASE_EDIT': 'PURCHASES',
      'MULTI_SITE_INVENTORY': 'INVENTORY',
      'INVOICING': 'INVOICING',
      'TREASURY_CHEQUES': 'TREASURY',
      'CHEQUE_EDIT': 'TREASURY',
      'EXPENSES': 'EXPENSES',
      'EXPENSE_EDIT': 'EXPENSES',
      'DIRECTORY': 'SUPPLIERS',
      'SUPPLIER_EDIT': 'SUPPLIERS',
      'FRIGO_MANAGEMENT': 'FRIGO_MGMT',
      'FRIGO_EDIT': 'FRIGO_MGMT',
      'FRIGO_OPS': 'FRIGO_MGMT',
      'COMPANY_INFO': 'COMPANY_INFO',
      'USERS': 'USERS',
      'IMPORT_BL': 'IMPORT_BL',
      'BACKUP': 'BACKUP',
    };

    const module = extendedModuleMap[tab];
    if (module && appUser.permissions) {
      return hasModuleAccess(appUser.permissions, module as any);
    }

    // Role-based defaults
    switch (tab) {
      case 'DASHBOARD':
        return true;
      case 'PRODUCTS_STOCK':
      case 'PRODUCT_EDIT':
      case 'PRODUCT_HISTORY':
      case 'DELIVERY_NOTES':
      case 'BL_EDIT':
      case 'BL_SIGN':
      case 'BL_PDF':
        return true;
      case 'CLIENTS':
      case 'CLIENT_EDIT':
      case 'DIRECTORY':
      case 'SUPPLIER_EDIT':
        return ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL', 'COMPTABLE', 'COMPTABLE_FACTURES', 'AGENT_STOCK', 'CONTROLEUR'].includes(appUser.role as any);
      case 'SALES_ORDERS':
      case 'ORDER_EDIT':
        return ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL', 'CONTROLEUR'].includes(appUser.role as any);
      case 'PURCHASES_IMPORTS':
      case 'PURCHASE_EDIT':
        return ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE', 'COMPTABLE_FACTURES', 'COMMERCIAL', 'CONTROLEUR'].includes(appUser.role as any);
      case 'MULTI_SITE_INVENTORY':
      case 'FRIGO_MANAGEMENT':
      case 'FRIGO_EDIT':
      case 'FRIGO_OPS':
        return ['SUPER_ADMIN', 'ADMIN', 'AGENT_STOCK', 'CONTROLEUR'].includes(appUser.role as any);
      case 'INVOICING':
      case 'TREASURY_CHEQUES':
      case 'CHEQUE_EDIT':
      case 'EXPENSES':
      case 'EXPENSE_EDIT':
        return ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE', 'COMPTABLE_FACTURES', 'CONTROLEUR'].includes(appUser.role as any);
      case 'USERS':
      case 'BACKUP':
      case 'COMPANY_INFO':
        return ['SUPER_ADMIN', 'ADMIN'].includes(appUser.role as any);
      case 'IMPORT_BL':
        return ['SUPER_ADMIN', 'ADMIN', 'AGENT_STOCK', 'COMMERCIAL', 'COMPTABLE_FACTURES'].includes(appUser.role as any);
      default:
        return false;
    }
  };

  const renderTabContent = () => {
    // If not authorized for this specific tab, show clean permission alert
    if (!isTabAuthorized(activeTab)) {
      const fallbackTab: NavTab = appUser?.role === 'RESPONSABLE_FRIGO' ? 'DELIVERY_NOTES' : 'DASHBOARD';
      return (
        <div className="p-8 bg-white border border-red-200 rounded-xl shadow-sm text-center max-w-lg mx-auto mt-8">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Accès Restreint</h3>
          <p className="text-xs text-gray-600 mb-4">
            Votre profil ({appUser?.displayName || 'Utilisateur'} - Rôle: {appUser?.role}) ne dispose pas des droits d'accès à ce module.
          </p>
          <button
            onClick={() => setNavTab(fallbackTab)}
            className="px-4 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow"
          >
            Retourner à mon espace
          </button>
        </div>
      );
    }

    // If user is RESPONSABLE_FRIGO, strictly lock view to DELIVERY_NOTES, BL_EDIT, BL_SIGN, BL_PDF or FRIGO_OPS!
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
      if (activeTab === 'FRIGO_OPS') {
        return <FrigoOperationsPage initialFrigoId={editingEntityId || currentUser.assignedFrigoId} onBack={navigateBack} />;
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
            onEditBL={(id) => navigateToEdit('BL_EDIT', id)}
            onViewBLPdf={(id) => navigateToEdit('BL_PDF', id)}
            onEditClient={(id) => navigateToEdit('CLIENT_EDIT', id)}
            onEditProduct={(id) => navigateToEdit('PRODUCT_EDIT', id)}
            onViewProductHistory={(id) => navigateToEdit('PRODUCT_HISTORY', id)}
            onEditFrigo={(id) => navigateToEdit('FRIGO_EDIT', id)}
            onEditOrder={(id) => navigateToEdit('ORDER_EDIT', id)}
            onEditCheque={(id) => navigateToEdit('CHEQUE_EDIT', id)}
            onViewFrigoDetail={(frigoId) => {
              setEditingEntityId(frigoId);
              setPreviousTab('DASHBOARD');
              updateUrlAndTab('FRIGO_MANAGEMENT', frigoId, true);
            }}
          />
        );
      case 'PRODUCTS_STOCK':
        return (
          <ProductsList 
            onEditProduct={(id) => navigateToEdit('PRODUCT_EDIT', id)} 
            onNewProduct={() => navigateToEdit('PRODUCT_EDIT', null)} 
            onViewProductHistory={(id) => navigateToEdit('PRODUCT_HISTORY', id)}
            onNavigateToRepackaging={(id) => navigateToEdit('STOCK_REPACKAGING', id)}
          />
        );
      case 'PRODUCT_HISTORY':
        return (
          <ProductStockHistoryPage 
            productId={editingEntityId} 
            onBack={navigateBack} 
            onNavigateToBL={(blId) => navigateToEdit('BL_PDF', blId)}
            onSelectProduct={(id) => setEditingEntityId(id)}
            onEditPurchase={(id) => navigateToEdit('PURCHASE_EDIT', id)}
          />
        );
      case 'STOCK_REPACKAGING':
        return (
          <StockRepackagingPage 
            initialFrigoId={editingEntityId} 
            onBack={navigateBack} 
          />
        );
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
            onMassBL={() => navigateToEdit('MASS_BL', null)}
          />
        );
      case 'CLIENTS':
        return (
          <ClientsSuppliers 
            initialTab="CLIENTS" 
            onViewBLPdf={(bl) => setActivePdfBL(bl)} 
            onEditClient={(id) => navigateToEdit('CLIENT_EDIT', id)} 
            onNewClient={() => navigateToEdit('CLIENT_EDIT', null)} 
            onNewBL={(clientId) => {
              setBlInitialClientId(clientId);
              navigateToEdit('BL_EDIT', null);
            }}
          />
        );
      case 'SALES_ORDERS':
        return <SalesOrders onEditOrder={(id) => navigateToEdit('ORDER_EDIT', id)} onNewOrder={() => navigateToEdit('ORDER_EDIT', null)} />;
      case 'PURCHASES_IMPORTS':
        return (
          <ImportInvoiceEntry 
            onEditPurchase={(id) => navigateToEdit('PURCHASE_EDIT', id)}
            onNewPurchase={() => navigateToEdit('PURCHASE_EDIT', null)}
          />
        );
      case 'MULTI_SITE_INVENTORY':
        return (
          <MultiFrigoInventory 
            onNavigateToRepackaging={(id) => navigateToEdit('STOCK_REPACKAGING', id)}
          />
        );
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
            onViewProductHistory={(id) => navigateToEdit('PRODUCT_HISTORY', id)}
            onViewClient={(id) => navigateToEdit('CLIENT_EDIT', id)}
            onEditPurchase={(id) => navigateToEdit('PURCHASE_EDIT', id)}
            onNavigateToImport={(frigoId) => {
              navigateToEdit('IMPORT_BL', frigoId ? `STOCK:${frigoId}` : 'STOCK');
            }}
          />
        );

      case 'COMPANY_INFO':
        return <CompanySettings />;

      // New full-page edit views
      case 'PRODUCT_EDIT':
        return <ProductEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'CLIENT_EDIT':
        return (
          <ClientEditPage 
            editId={editingEntityId} 
            initialTab={clientInitialTab}
            onBack={() => {
              setClientInitialTab('DETAILS');
              navigateBack();
            }} 
            onViewBLPdf={(blId) => navigateToEdit('BL_PDF', blId)} 
            onNewBL={(clientId) => {
              setBlInitialClientId(clientId);
              navigateToEdit('BL_EDIT', null);
            }}
            onMassBL={(clientId) => {
              setBlInitialClientId(clientId);
              navigateToEdit('MASS_BL', clientId);
            }}
          />
        );
      case 'SUPPLIER_EDIT':
        return <SupplierEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'FRIGO_EDIT':
        return <FrigoEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'BL_EDIT':
        return (
          <BLEditPage 
            editId={editingEntityId} 
            initialClientId={blInitialClientId} 
            onBack={() => {
              setBlInitialClientId(null);
              navigateBack();
            }} 
            onViewClient={(clientId) => navigateToEdit('CLIENT_EDIT', clientId)}
          />
        );
      case 'ORDER_EDIT':
        return <OrderEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'EXPENSE_EDIT':
        return <ExpenseEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'CHEQUE_EDIT':
        return <ChequeEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'PURCHASE_EDIT':
        return <PurchaseInvoiceEditPage editId={editingEntityId} onBack={navigateBack} />;
      case 'BL_SIGN':
        return <BLSignaturePage blId={editingEntityId} onBack={navigateBack} />;
      case 'BL_PDF':
        return <BLPdfPage blId={editingEntityId} onBack={navigateBack} />;

      // New feature pages
      case 'USERS':
        return <UserManagement />;
      case 'IMPORT_BL': {
        const isStockMode = editingEntityId === 'STOCK' || editingEntityId?.startsWith('STOCK:');
        const frigoIdFromParam = editingEntityId?.startsWith('STOCK:') 
          ? editingEntityId.split(':')[1] 
          : (editingEntityId !== 'STOCK' ? editingEntityId : null);
        return (
          <BLImportPage 
            onBack={() => setNavTab('DELIVERY_NOTES')}
            initialMode={isStockMode ? 'STOCK' : 'SALES'}
            initialFrigoId={frigoIdFromParam}
            onNavigateToTab={(tab) => {
              setEditingEntityId(null);
              setNavTab(tab as any);
            }}
          />
        );
      }
      case 'BACKUP':
        return <BackupRestore />;
      case 'FRIGO_OPS':
        return <FrigoOperationsPage initialFrigoId={editingEntityId} onBack={navigateBack} />;
      case 'MASS_BL':
        return (
          <MassBLCreationPage 
            initialClientId={editingEntityId} 
            onBack={navigateBack} 
            onSuccess={(targetClientId) => {
              if (targetClientId) {
                setEditingEntityId(targetClientId);
                setClientInitialTab('BL_HISTORY');
                updateUrlAndTab('CLIENT_EDIT', targetClientId, true);
              } else {
                setEditingEntityId(null);
                updateUrlAndTab('DELIVERY_NOTES', null, true);
              }
            }}
          />
        );

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
        
        <main className="flex-1 p-2.5 sm:p-4 md:p-6 overflow-y-auto w-full pb-32 sm:pb-24 md:pb-6 touch-manipulation">
          <div className="max-w-7xl mx-auto">
            <div key={activeTab + (editingEntityId || '')} className="tab-fade-in">
              <Suspense fallback={<LoadingSpinner />}>
                {renderTabContent()}
              </Suspense>
            </div>
          </div>
        </main>
      </div>

      {/* Smartphone Bottom Quick Navigation (Native PWA Feel) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#161616]/95 backdrop-blur-xl border-t border-[#393939] text-white z-30 flex justify-around items-center px-1.5 py-1.5 shadow-2xl select-none pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {appUser?.role === 'RESPONSABLE_FRIGO' ? (
          <>
            <button
              onClick={() => { setNavTab('DELIVERY_NOTES'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/4 py-1 text-[10px] font-mono relative rounded-xl transition-all active:scale-95 ${
                activeTab === 'DELIVERY_NOTES' 
                  ? 'text-white font-bold bg-[#0f62fe] shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Truck className="w-5 h-5 mb-0.5" />
              <span>Bons Quai</span>
              {deliveryNotes.filter(b => !b.frigoEmployeeApproved && (!currentUser.assignedFrigoId || b.frigoId === currentUser.assignedFrigoId)).length > 0 && (
                <span className="absolute -top-1 right-2 bg-amber-500 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {deliveryNotes.filter(b => !b.frigoEmployeeApproved && (!currentUser.assignedFrigoId || b.frigoId === currentUser.assignedFrigoId)).length}
                </span>
              )}
            </button>

            <button
              onClick={() => { navigateToEdit('BL_SIGN', null); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/4 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'BL_SIGN' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <PenTool className="w-5 h-5 mb-0.5" />
              <span>Signature</span>
            </button>

            <button
              onClick={() => { navigateToEdit('FRIGO_OPS', currentUser.assignedFrigoId || null); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/4 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'FRIGO_OPS' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Camera className="w-5 h-5 mb-0.5" />
              <span>Pesées</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex flex-col items-center justify-center w-1/4 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                isMobileMenuOpen ? 'text-white font-bold bg-[#393939]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span>{t('nav.menu')}</span>
            </button>
          </>
        ) : appUser?.role === 'COMPTABLE' || appUser?.role === 'COMPTABLE_FACTURES' ? (
          <>
            <button
              onClick={() => { setNavTab('INVOICING'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'INVOICING' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5 mb-0.5" />
              <span>Factures</span>
            </button>

            <button
              onClick={() => { setNavTab('TREASURY_CHEQUES'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'TREASURY_CHEQUES' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Landmark className="w-5 h-5 mb-0.5" />
              <span>Trésorerie</span>
            </button>

            <button
              onClick={() => { setNavTab('EXPENSES'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'EXPENSES' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Receipt className="w-5 h-5 mb-0.5" />
              <span>Dépenses</span>
            </button>

            <button
              onClick={() => { setNavTab('CLIENTS'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'CLIENTS' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span>Clients</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                isMobileMenuOpen ? 'text-white font-bold bg-[#393939]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span>{t('nav.menu')}</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setNavTab('DASHBOARD'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'DASHBOARD' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>{t('nav.home')}</span>
            </button>

            <button
              onClick={() => { setNavTab('PRODUCTS_STOCK'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'PRODUCTS_STOCK' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Package className="w-5 h-5 mb-0.5" />
              <span>{t('nav.stock')}</span>
            </button>

            <button
              onClick={() => { setNavTab('DELIVERY_NOTES'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono relative rounded-xl transition-all active:scale-95 ${
                activeTab === 'DELIVERY_NOTES' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Truck className="w-5 h-5 mb-0.5" />
              <span>{t('nav.bl')}</span>
              {deliveryNotes.filter(b => !b.frigoEmployeeApproved).length > 0 && (
                <span className="absolute -top-1 right-2 bg-amber-500 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {deliveryNotes.filter(b => !b.frigoEmployeeApproved).length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setNavTab('CLIENTS'); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                activeTab === 'CLIENTS' ? 'text-white font-bold bg-[#0f62fe] shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span>{t('nav.clients')}</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex flex-col items-center justify-center w-1/5 py-1 text-[10px] font-mono rounded-xl transition-all active:scale-95 ${
                isMobileMenuOpen ? 'text-white font-bold bg-[#393939]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span>{t('nav.menu')}</span>
            </button>
          </>
        )}
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    const errorStr = error?.message || error?.toString() || '';
    const isChunkError = 
      error?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module/i.test(errorStr) ||
      /Importing a module script failed/i.test(errorStr) ||
      /error loading dynamically imported module/i.test(errorStr);

    if (isChunkError) {
      const storageKey = 'erp_chunk_load_reload';
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(storageKey, now.toString());
        window.location.reload();
      }
    }
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
import { PWAUpdateBanner } from './components/common/PWAUpdateBanner';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ERPProvider>
          <AuthGuard>
            {(appUser) => <ERPContent appUser={appUser} />}
          </AuthGuard>
          <PWAUpdateBanner />
        </ERPProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}


