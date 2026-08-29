import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { findMatchingProduct } from '../utils/productMatcher';
import { computeSynchronizedStocks, buildReconciledStockLevels } from '../utils/stockReconciler';
import {
  Product,
  ColdStorageFrigo,
  FrigoStockLevel,
  Client,
  Supplier,
  SalesOrder,
  DeliveryNoteBL,
  Invoice,
  ChequeEffet,
  TreasuryAccount,
  Expense,
  UserProfile,
  MultiSiteInventoryCount,
  PurchaseImportInvoice,
  ChequeEffetStatus,
  OrderStatus,
  CompanyInfo,
  CompanyEntity,
  RecalculationSummaryReport,
  RecalculationReportItem,
  ProductStockMovement,
  PaymentMethod
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_FRIGOS,
  INITIAL_PRODUCTS,
  INITIAL_COMPANY_INFO,
} from '../data/mockData';

import { api } from '../lib/api';

export const DEFAULT_COMPANIES: CompanyEntity[] = [
  {
    id: 'STE_1',
    code: 'MLHMD',
    name: 'MLHMD Sarl',
    shortName: 'MLHMD',
    ice: '',
    taxId: '',
    rc: '',
    patent: '',
    capital: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    bankName: '',
    bankRib: '',
    blPrefix: 'BL-MLHMD',
    invoicePrefix: 'FAC-MLHMD'
  },
  {
    id: 'STE_2',
    code: 'AINRAB',
    name: 'Ain Rabat Sarl',
    shortName: 'Ain Rabat',
    ice: '',
    taxId: '',
    rc: '',
    patent: '',
    capital: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    bankName: '',
    bankRib: '',
    blPrefix: 'BL-AINRAB',
    invoicePrefix: 'FAC-AINRAB'
  }
];

interface ERPContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  users: UserProfile[];
  
  // Multi-Company (Sociétés Sœurs)
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  companies: CompanyEntity[];
  activeCompany: CompanyEntity;
  updateCompanyEntity: (id: string, updatedData: Partial<CompanyEntity>) => void;

  products: Product[];
  frigos: ColdStorageFrigo[];
  stocks: FrigoStockLevel[];
  stockMovements: ProductStockMovement[];
  clients: Client[];
  suppliers: Supplier[];
  orders: SalesOrder[];
  deliveryNotes: DeliveryNoteBL[];
  invoices: Invoice[];
  chequesEffets: ChequeEffet[];
  treasuryAccounts: TreasuryAccount[];
  expenses: Expense[];
  inventoryCounts: MultiSiteInventoryCount[];
  purchaseInvoices: PurchaseImportInvoice[];
  companyInfo: CompanyInfo;
  updateCompanyInfo: (info: Partial<CompanyInfo>) => void;

  // Product Actions
  addProduct: (product: Omit<Product, 'id' | 'code' | 'kgPerPallet'>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => void;
  syncBLPricesWithProducts: () => void;
  recalculateAllBLPrices: () => Promise<RecalculationSummaryReport>;

  // Frigo Actions
  addFrigo: (frigo: Omit<ColdStorageFrigo, 'id' | 'code'>) => ColdStorageFrigo;
  updateFrigo: (id: string, frigoData: Partial<ColdStorageFrigo>) => void;
  deleteFrigo: (id: string) => void;

  // Stock Actions
  adjustStock: (frigoId: string, productId: string, newKg: number, newPallets: number) => void;
  transferStock: (sourceFrigoId: string, targetFrigoId: string, productId: string, kg: number, pallets: number) => void;
  repackageStock: (payload: {
    frigoId: string;
    sourceProductId: string;
    sourceKg: number;
    sourceCartons?: number;
    sourcePallets?: number;
    targetItems: {
      productId: string;
      quantityPacks: number;
      quantityKg: number;
      quantityPallets?: number;
    }[];
    wasteKg?: number;
    notes?: string;
  }) => void;
  clearStocks: (frigoId?: string, productId?: string) => Promise<void>;
  recalculateAndSyncAllStocks: () => Promise<FrigoStockLevel[]>;

  // Purchase Actions
  createPurchaseInvoice: (purchaseData: Omit<PurchaseImportInvoice, 'id'>) => PurchaseImportInvoice;
  updatePurchaseInvoice: (id: string, updatedData: Partial<PurchaseImportInvoice>) => void;
  addPurchasePayment: (purchaseInvoiceId: string, payment: { amount: number; paymentMethod: PaymentMethod; date: string; reference?: string; bankName?: string; notes?: string }) => void;
  deletePurchaseInvoice: (id: string) => void;

  // Order & BL Actions
  createOrder: (orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'status' | 'totalHT' | 'totalVAT' | 'totalTTC' | 'totalCostHT' | 'grossMarginHT' | 'marginPercentage'>) => SalesOrder;
  updateOrder: (orderId: string, orderData: Partial<SalesOrder>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addBL: (blData: DeliveryNoteBL) => void;
  updateBL: (id: string, updatedData: Partial<DeliveryNoteBL>) => void;
  deleteBL: (id: string) => void;
  approveFrigoBL: (blId: string, employeeName: string) => void;
  signBL: (blId: string, signatureUrl: string, clientName: string) => void;
  sendWhatsAppBL: (blId: string) => void;
  sendEmailBL: (blId: string, recipient: string) => void;

  // Finance Actions
  createInvoiceFromBL: (blId: string, customCompanyId?: string) => Invoice;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status'], amountPaid?: number) => void;
  deleteInvoice: (id: string) => void;
  addChequeEffet: (cheque: Omit<ChequeEffet, 'id'>) => void;
  updateChequeEffet: (id: string, chequeData: Partial<ChequeEffet>) => void;
  deleteChequeEffet: (id: string) => void;
  updateChequeStatus: (chequeId: string, status: ChequeEffetStatus) => void;
  resetAllData: () => void;
  addExpense: (expense: Omit<Expense, 'id' | 'expenseNumber'>) => void;
  addClient: (client: Omit<Client, 'id' | 'code' | 'currentBalance'>) => void;
  updateClient: (id: string, clientData: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'code' | 'currentBalance'>) => void;
  updateSupplier: (id: string, supplierData: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  saveInventoryCount: (count: Omit<MultiSiteInventoryCount, 'id' | 'countNumber'>, applyStockAdjust: boolean) => void;
  importExcelBLs: (newBLs: DeliveryNoteBL[]) => void;
  reconcileStocksWithBLs: (targetFrigoId?: string) => { deductedKg: number; blCount: number };
  deduplicateClients: () => Promise<number>;
  mergeClients: (targetClientId: string, clientIdsToMerge: string[]) => Promise<void>;
  mergeProducts: (targetProductId: string, productIdsToMerge: string[]) => void;
  purgeOrphanStocks: () => number;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('erp_current_user');
    return saved ? JSON.parse(saved) : INITIAL_USERS[0];
  });

  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => localStorage.getItem('erp_active_company_id') || 'STE_1');
  const [companies, setCompanies] = useState<CompanyEntity[]>(DEFAULT_COMPANIES);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(INITIAL_COMPANY_INFO);

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('erp_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: Product) => ({
            ...p,
            description: (p.description && p.description.includes('Produit principal')) ? '' : (p.description || '')
          }));
        }
      }
    } catch (e) {}
    return INITIAL_PRODUCTS.map(p => ({
      ...p,
      description: (p.description && p.description.includes('Produit principal')) ? '' : (p.description || '')
    }));
  });

  const [frigos, setFrigos] = useState<ColdStorageFrigo[]>(() => {
    try {
      const saved = localStorage.getItem('erp_frigos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_FRIGOS;
  });

  const [stocks, setStocks] = useState<FrigoStockLevel[]>(() => {
    try {
      const saved = localStorage.getItem('erp_stocks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [stockMovements, setStockMovements] = useState<ProductStockMovement[]>([]);
  
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem('erp_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('erp_suppliers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [orders, setOrders] = useState<SalesOrder[]>(() => {
    try {
      const saved = localStorage.getItem('erp_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteBL[]>(() => {
    try {
      const saved = localStorage.getItem('erp_delivery_notes') || localStorage.getItem('erp_deliveryNotes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('erp_invoices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [chequesEffets, setChequesEffets] = useState<ChequeEffet[]>(() => {
    try {
      const saved = localStorage.getItem('erp_cheques');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<MultiSiteInventoryCount[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseImportInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('erp_purchase_invoices') || localStorage.getItem('erp_purchases');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Persistent localStorage auto-sync hooks
  useEffect(() => {
    if (products.length > 0) localStorage.setItem('erp_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (stocks.length > 0) localStorage.setItem('erp_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    if (deliveryNotes.length > 0) localStorage.setItem('erp_delivery_notes', JSON.stringify(deliveryNotes));
  }, [deliveryNotes]);

  useEffect(() => {
    if (clients.length > 0) localStorage.setItem('erp_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    if (frigos.length > 0) localStorage.setItem('erp_frigos', JSON.stringify(frigos));
  }, [frigos]);

  useEffect(() => {
    if (purchaseInvoices.length > 0) {
      localStorage.setItem('erp_purchase_invoices', JSON.stringify(purchaseInvoices));
      localStorage.setItem('erp_purchases', JSON.stringify(purchaseInvoices));
    }
  }, [purchaseInvoices]);

  // Multi-Company resolution
  const activeCompany = useMemo(() => {
    return companies.find(c => c.id === activeCompanyId) || companies[0] || DEFAULT_COMPANIES[0];
  }, [companies, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem('erp_active_company_id', activeCompanyId);
  }, [activeCompanyId]);

  // ============================================================
  // LOAD FROM POSTGRESQL API (Single Source of Truth)
  // ============================================================
  const refreshFromDatabase = async () => {
    try {
      const [
        pgUsers,
        pgCompanies,
        pgCompanyInfo,
        pgProducts,
        pgFrigos,
        pgStocks,
        pgMovements,
        pgClients,
        pgSuppliers,
        pgOrders,
        pgBLs,
        pgInvoices,
        pgCheques,
        pgTreasury,
        pgExpenses,
        pgPurchases,
        pgInventories,
      ] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getCompanies().catch(() => []),
        api.getCompanyInfo().catch(() => null),
        api.getProducts().catch(() => []),
        api.getFrigos().catch(() => []),
        api.getStocks().catch(() => []),
        api.getStockMovements().catch(() => []),
        api.getClients().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getOrders().catch(() => []),
        api.getDeliveryNotes().catch(() => []),
        api.getInvoices().catch(() => []),
        api.getCheques().catch(() => []),
        api.getTreasuryAccounts().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getPurchases().catch(() => []),
        api.getInventories().catch(() => []),
      ]);

      // Check if DB is totally empty and local storage has existing data to migrate
      const dbHasData = (
        (pgBLs && pgBLs.length > 0) || 
        (pgStocks && pgStocks.length > 0) || 
        (pgClients && pgClients.length > 0)
      );

      const localHasBLs = localStorage.getItem('erp_delivery_notes') || localStorage.getItem('erp_deliveryNotes');
      const localHasClients = localStorage.getItem('erp_clients');
      const localHasStocks = localStorage.getItem('erp_stocks');
      
      if (!dbHasData && (localHasBLs || localHasClients || localHasStocks)) {
        try {
          const localPayload = {
            products: JSON.parse(localStorage.getItem('erp_products') || '[]'),
            frigos: JSON.parse(localStorage.getItem('erp_frigos') || '[]'),
            stocks: JSON.parse(localHasStocks || '[]'),
            clients: JSON.parse(localHasClients || '[]'),
            suppliers: JSON.parse(localStorage.getItem('erp_suppliers') || '[]'),
            deliveryNotes: JSON.parse(localHasBLs || '[]'),
            invoices: JSON.parse(localStorage.getItem('erp_invoices') || '[]'),
            chequesEffets: JSON.parse(localStorage.getItem('erp_cheques') || '[]'),
            treasuryAccounts: JSON.parse(localStorage.getItem('erp_treasury') || '[]'),
            expenses: JSON.parse(localStorage.getItem('erp_expenses') || '[]'),
            purchaseInvoices: JSON.parse(localStorage.getItem('erp_purchase_invoices') || '[]'),
            salesOrders: JSON.parse(localStorage.getItem('erp_orders') || '[]'),
            inventoryCounts: JSON.parse(localStorage.getItem('erp_inventories') || '[]'),
            companyInfo: JSON.parse(localStorage.getItem('erp_company_info') || '{}'),
            companies: JSON.parse(localStorage.getItem('erp_companies') || '[]'),
          };

          if (
            (localPayload.deliveryNotes && localPayload.deliveryNotes.length > 0) || 
            (localPayload.clients && localPayload.clients.length > 0) ||
            (localPayload.stocks && localPayload.stocks.length > 0)
          ) {
            console.log('🔄 First-time PostgreSQL Migration: Uploading existing local data to PostgreSQL...');
            await api.bootstrapFromLocal(localPayload);
            return refreshFromDatabase();
          }
        } catch (migrationErr) {
          console.warn('Auto-migration notice:', migrationErr);
        }
      }

      if (pgUsers && pgUsers.length > 0) setUsers(pgUsers);
      if (pgCompanies && pgCompanies.length > 0) setCompanies(pgCompanies);
      if (pgCompanyInfo && pgCompanyInfo.name) setCompanyInfo(pgCompanyInfo);
      if (pgProducts && pgProducts.length > 0) {
        const sanitized = pgProducts.map((p: Product) => ({
          ...p,
          description: (p.description && p.description.includes('Produit principal')) ? '' : (p.description || '')
        }));
        setProducts(sanitized);
        localStorage.setItem('erp_products', JSON.stringify(sanitized));
      }
      if (pgFrigos && pgFrigos.length > 0) {
        setFrigos(pgFrigos);
        localStorage.setItem('erp_frigos', JSON.stringify(pgFrigos));
      }
      if (pgStocks && pgStocks.length > 0) {
        setStocks(pgStocks);
        localStorage.setItem('erp_stocks', JSON.stringify(pgStocks));
      }
      if (pgMovements && pgMovements.length > 0) setStockMovements(pgMovements);
      if (pgClients && Array.isArray(pgClients)) {
        setClients(pgClients);
        localStorage.setItem('erp_clients', JSON.stringify(pgClients));
      }
      if (pgSuppliers && Array.isArray(pgSuppliers)) {
        setSuppliers(pgSuppliers);
        localStorage.setItem('erp_suppliers', JSON.stringify(pgSuppliers));
      }
      if (pgOrders && Array.isArray(pgOrders)) {
        setOrders(pgOrders);
        localStorage.setItem('erp_orders', JSON.stringify(pgOrders));
      }
      if (pgBLs && Array.isArray(pgBLs)) {
        setDeliveryNotes(pgBLs);
        localStorage.setItem('erp_delivery_notes', JSON.stringify(pgBLs));
      }
      if (pgInvoices && Array.isArray(pgInvoices)) {
        setInvoices(pgInvoices);
        localStorage.setItem('erp_invoices', JSON.stringify(pgInvoices));
      }
      if (pgCheques && Array.isArray(pgCheques)) {
        setChequesEffets(pgCheques);
        localStorage.setItem('erp_cheques', JSON.stringify(pgCheques));
      }
      if (pgTreasury && pgTreasury.length > 0) setTreasuryAccounts(pgTreasury);
      if (pgExpenses && Array.isArray(pgExpenses)) {
        setExpenses(pgExpenses);
        localStorage.setItem('erp_expenses', JSON.stringify(pgExpenses));
      }
      if (pgPurchases && Array.isArray(pgPurchases)) {
        setPurchaseInvoices(pgPurchases);
        localStorage.setItem('erp_purchase_invoices', JSON.stringify(pgPurchases));
        localStorage.setItem('erp_purchases', JSON.stringify(pgPurchases));
      }
      if (pgInventories && pgInventories.length > 0) setInventoryCounts(pgInventories);

      console.log('✅ Synchronized with PostgreSQL database (Lossless merge active).');
    } catch (err) {
      console.warn('API sync notice:', err);
    }
  };

  useEffect(() => {
    refreshFromDatabase();
  }, []);

  // Update Company Info
  const updateCompanyInfo = (info: Partial<CompanyInfo>) => {
    setCompanyInfo(prev => {
      const next = { ...prev, ...info };
      api.updateCompanyInfo(next).catch(err => console.error('Error updating company info:', err));
      return next;
    });
  };

  // Update Company Entity (Sociétés Sœurs)
  const updateCompanyEntity = (id: string, updatedData: Partial<CompanyEntity>) => {
    setCompanies(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updatedData } : c);
      api.updateCompany(id, updatedData).catch(err => console.error('Error updating company:', err));
      return next;
    });
  };

  // Helper string normalization
  const normalizeName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(mlhmd|ain\s*rabat|frigo|site|depot|wh|ste|societe|sarl|sarlau|sa|ets|ets.|s.a.r.l|s.a.r.l.)\b/gi, '')
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  };

  const cleanDisplayName = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/\b(mlhmd|ain\s*rabat|frigo|site|depot|wh)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  // ============================================================
  // PRODUCT ACTIONS
  // ============================================================
  const addProduct = (productData: Omit<Product, 'id' | 'code' | 'kgPerPallet'>): Product => {
    const existing = products.find(p => p.name.trim().toLowerCase() === productData.name.trim().toLowerCase());
    if (existing) {
      return existing;
    }

    const nextCodeNum = products.length + 1;
    const code = `PRD-DAT-${String(nextCodeNum).padStart(3, '0')}`;
    const kgPerPallet = (productData.kgPerCarton || 1) * (productData.cartonsPerPallet || 1);
    const id = `prd-${Date.now()}`;

    const newPrd: Product = {
      ...productData,
      id,
      code,
      kgPerPallet,
    };

    setProducts(prev => [newPrd, ...prev]);

    api.createProduct(newPrd).catch(err => console.error('Error saving product to PostgreSQL:', err));

    return newPrd;
  };

  const updateProduct = async (arg1: string | (Partial<Product> & { id: string }), arg2?: Partial<Product>) => {
    const id = typeof arg1 === 'string' ? arg1 : arg1.id;
    const updatedFields = typeof arg1 === 'string' ? (arg2 || {}) : arg1;

    const targetProduct = products.find(p => p.id === id);
    if (!targetProduct) return;

    const updatedProduct = { ...targetProduct, ...updatedFields };
    if (updatedFields.kgPerCarton || updatedFields.cartonsPerPallet) {
      updatedProduct.kgPerPallet = (updatedProduct.kgPerCarton || 5) * (updatedProduct.cartonsPerPallet || 100);
    }

    setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));

    await api.updateProduct(id, updatedFields);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setStocks(prev => prev.filter(s => s.productId !== id));
    api.deleteProduct(id).catch(err => console.error('Error deleting product from PostgreSQL:', err));
  };

  const syncBLPricesWithProducts = () => {
    api.recalculateBLPrices().then(() => refreshFromDatabase()).catch(err => console.error(err));
  };

  const recalculateAllBLPrices = async (): Promise<RecalculationSummaryReport> => {
    try {
      const res = await api.recalculateBLPrices();
      await refreshFromDatabase();
      return res;
    } catch (err: any) {
      return {
        totalBLsScanned: deliveryNotes.length,
        updatedBLsCount: 0,
        unchangedBLsCount: deliveryNotes.length,
        failedBLsCount: 1,
        totalItemsUpdated: 0,
        totalFinancialImpactHT: 0,
        timestamp: new Date().toLocaleString('fr-FR'),
        details: [],
      };
    }
  };

  // ============================================================
  // FRIGO ACTIONS
  // ============================================================
  const addFrigo = (frigoData: Omit<ColdStorageFrigo, 'id' | 'code'>): ColdStorageFrigo => {
    const count = frigos.length + 1;
    const code = `FRG-SITE-${String(count).padStart(2, '0')}`;
    const newFrigo: ColdStorageFrigo = {
      ...frigoData,
      id: `frigo-${Date.now()}`,
      code,
    };
    setFrigos(prev => [...prev, newFrigo]);
    api.createFrigo(newFrigo).catch(err => console.error('Error saving frigo:', err));
    return newFrigo;
  };

  const updateFrigo = (id: string, frigoData: Partial<ColdStorageFrigo>) => {
    setFrigos(prev => prev.map(f => f.id === id ? { ...f, ...frigoData } : f));
    api.updateFrigo(id, frigoData).catch(err => console.error('Error updating frigo:', err));
  };

  const deleteFrigo = (id: string) => {
    setFrigos(prev => prev.filter(f => f.id !== id));
    setStocks(prev => prev.filter(s => s.frigoId !== id));
    api.deleteFrigo(id).catch(err => console.error('Error deleting frigo:', err));
  };

  // ============================================================
  // STOCK ACTIONS
  // ============================================================
  const adjustStock = (frigoId: string, productId: string, newKg: number, newPallets: number) => {
    setStocks(prev => {
      const existing = prev.find(s => s.frigoId === frigoId && s.productId === productId);
      const updatedStock: FrigoStockLevel = {
        frigoId,
        productId,
        quantityKg: newKg,
        quantityPallets: newPallets,
        lastUpdated: new Date().toISOString(),
      };
      if (existing) {
        return prev.map(s => (s.frigoId === frigoId && s.productId === productId) ? updatedStock : s);
      }
      return [...prev, updatedStock];
    });

    api.adjustStock({
      frigoId,
      productId,
      newKg,
      newPallets,
      performedBy: currentUser?.name || 'Admin',
      notes: 'Ajustement manuel inventaire'
    }).catch(err => console.error('Error adjusting stock in PostgreSQL:', err));
  };

  const transferStock = (sourceFrigoId: string, targetFrigoId: string, productId: string, kg: number, pallets: number) => {
    api.transferStock({
      sourceFrigoId,
      targetFrigoId,
      productId,
      kg,
      pallets,
      performedBy: currentUser?.name || 'Admin'
    }).then(() => refreshFromDatabase()).catch(err => console.error('Error transferring stock:', err));
  };

  const repackageStock = (payload: {
    frigoId: string;
    sourceProductId: string;
    sourceKg: number;
    sourceCartons?: number;
    sourcePallets?: number;
    targetItems: {
      productId: string;
      quantityPacks: number;
      quantityKg: number;
      quantityPallets?: number;
    }[];
    wasteKg?: number;
    notes?: string;
  }) => {
    const { frigoId, sourceProductId, sourceKg, targetItems, notes } = payload;
    const author = currentUser?.name || 'Responsable Stock';

    setStocks(prev => {
      let updated = [...prev];

      // 1. Decrement source product stock
      const srcIdx = updated.findIndex(s => s.frigoId === frigoId && s.productId === sourceProductId);
      const srcPrd = products.find(p => p.id === sourceProductId);
      if (srcIdx !== -1) {
        const currentSrcKg = updated[srcIdx].quantityKg;
        const newSrcKg = Math.max(0, currentSrcKg - sourceKg);
        const newSrcPallets = Math.max(0, Math.ceil(newSrcKg / (srcPrd?.kgPerPallet || 600)));
        updated[srcIdx] = {
          ...updated[srcIdx],
          quantityKg: newSrcKg,
          quantityPallets: newSrcPallets,
          lastUpdated: new Date().toISOString()
        };
      }

      // 2. Increment target products stock
      targetItems.forEach(tItem => {
        const tgtIdx = updated.findIndex(s => s.frigoId === frigoId && s.productId === tItem.productId);
        const tgtPrd = products.find(p => p.id === tItem.productId);
        const addKg = tItem.quantityKg;
        const addPallets = tItem.quantityPallets || Math.max(1, Math.ceil(addKg / (tgtPrd?.kgPerPallet || 600)));

        if (tgtIdx !== -1) {
          const newTgtKg = updated[tgtIdx].quantityKg + addKg;
          const newTgtPallets = updated[tgtIdx].quantityPallets + addPallets;
          updated[tgtIdx] = {
            ...updated[tgtIdx],
            quantityKg: newTgtKg,
            quantityPallets: newTgtPallets,
            lastUpdated: new Date().toISOString()
          };
        } else {
          updated.push({
            frigoId,
            productId: tItem.productId,
            quantityKg: addKg,
            quantityPallets: addPallets,
            lastUpdated: new Date().toISOString()
          });
        }
      });

      localStorage.setItem('erp_stocks', JSON.stringify(updated));
      return updated;
    });

    // Save adjustment to backend API if available
    targetItems.forEach(tItem => {
      api.adjustStock({
        frigoId,
        productId: tItem.productId,
        newKg: (stocks.find(s => s.frigoId === frigoId && s.productId === tItem.productId)?.quantityKg || 0) + tItem.quantityKg,
        newPallets: 1,
        performedBy: author,
        notes: notes || `Reconditionnement depuis ${sourceProductId}`
      }).catch(err => console.error(err));
    });
  };

  const clearStocks = async (frigoId?: string, productId?: string) => {
    setStocks(prev => {
      return prev.map(s => {
        const matchFrigo = !frigoId || s.frigoId === frigoId;
        const matchProduct = !productId || s.productId === productId;
        if (matchFrigo && matchProduct) {
          return { ...s, quantityKg: 0, quantityPallets: 0, lastUpdated: new Date().toISOString() };
        }
        return s;
      });
    });

    try {
      await api.clearStock({
        frigoId,
        productId,
        performedBy: currentUser?.name || 'Admin',
        notes: frigoId ? `Vidage du stock frigo (${frigoId})` : 'Vidage global du stock',
      });
      await refreshFromDatabase();
    } catch (err) {
      console.error('Error clearing stocks:', err);
    }
  };

  const purgeOrphanStocks = (): number => {
    api.purgeOrphanStocks().then(res => {
      refreshFromDatabase();
      return res.purgedCount;
    }).catch(err => console.error(err));
    return 0;
  };

  const recalculateAndSyncAllStocks = async (): Promise<FrigoStockLevel[]> => {
    try {
      const { productStocks } = computeSynchronizedStocks({
        products,
        frigos,
        stocks,
        purchaseInvoices,
        deliveryNotes,
        inventoryCounts,
        stockMovements,
        selectedFrigoId: 'ALL',
      });

      const reconciled = buildReconciledStockLevels(productStocks);
      setStocks(reconciled);
      localStorage.setItem('erp_stocks', JSON.stringify(reconciled));

      // Background sync to backend for active stock levels
      for (const stk of reconciled) {
        if (stk.quantityKg > 0 || stk.quantityPallets > 0) {
          api.adjustStock(
            stk.frigoId,
            stk.productId,
            stk.quantityKg,
            stk.quantityPallets,
            currentUser?.name || 'Admin',
            'Recalcul automatique synchronisé des stocks'
          ).catch(() => {});
        }
      }

      return reconciled;
    } catch (e) {
      console.error('Error during recalculateAndSyncAllStocks:', e);
      return stocks;
    }
  };

  // ============================================================
  // PURCHASE & IMPORT ACTIONS
  // ============================================================
  const createPurchaseInvoice = (purchaseData: Omit<PurchaseImportInvoice, 'id'>): PurchaseImportInvoice => {
    const now = new Date();
    const id = `pur-${Date.now()}`;
    const newPur: PurchaseImportInvoice = {
      paidAmount: 0,
      remainingBalance: purchaseData.totalLandedCostHT,
      payments: [],
      createdAt: now.toISOString(),
      timeArrival: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...purchaseData,
      id,
    };

    const nextPurchases = [newPur, ...purchaseInvoices];
    setPurchaseInvoices(nextPurchases);
    localStorage.setItem('erp_purchase_invoices', JSON.stringify(nextPurchases));
    localStorage.setItem('erp_purchases', JSON.stringify(nextPurchases));

    // Reconcile and synchronize stocks immediately
    const { productStocks } = computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices: nextPurchases,
      deliveryNotes,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: 'ALL'
    });
    const reconciled = buildReconciledStockLevels(productStocks);
    setStocks(reconciled);
    localStorage.setItem('erp_stocks', JSON.stringify(reconciled));

    api.createPurchase(newPur)
      .then(() => refreshFromDatabase())
      .catch(err => console.error('Error saving purchase invoice:', err));

    return newPur;
  };

  const updatePurchaseInvoice = (id: string, updatedData: Partial<PurchaseImportInvoice>) => {
    const nextPurchases = purchaseInvoices.map(pur => pur.id === id ? { ...pur, ...updatedData } : pur);
    setPurchaseInvoices(nextPurchases);
    localStorage.setItem('erp_purchase_invoices', JSON.stringify(nextPurchases));
    localStorage.setItem('erp_purchases', JSON.stringify(nextPurchases));

    // Reconcile and synchronize stocks immediately with new quantities
    const { productStocks } = computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices: nextPurchases,
      deliveryNotes,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: 'ALL'
    });
    const reconciled = buildReconciledStockLevels(productStocks);
    setStocks(reconciled);
    localStorage.setItem('erp_stocks', JSON.stringify(reconciled));

    api.updatePurchase(id, updatedData)
      .then(() => refreshFromDatabase())
      .catch(err => console.error('Error updating purchase invoice in API:', err));
  };

  const addPurchasePayment = (
    purchaseInvoiceId: string,
    payment: {
      amount: number;
      paymentMethod: PaymentMethod;
      date: string;
      reference?: string;
      bankName?: string;
      notes?: string;
    }
  ) => {
    setPurchaseInvoices(prev => prev.map(pur => {
      if (pur.id !== purchaseInvoiceId) return pur;
      const currentPaid = pur.paidAmount || 0;
      const newPaidAmount = currentPaid + payment.amount;
      const totalAmount = pur.totalLandedCostHT || 0;
      const newRemainingBalance = Math.max(0, totalAmount - newPaidAmount);

      const paymentStatus: 'NON_PAYÉ' | 'PARTIEL' | 'PAYÉ' = newRemainingBalance <= 0 ? 'PAYÉ' : 'PARTIEL';
      const updated: PurchaseImportInvoice = {
        ...pur,
        paidAmount: newPaidAmount,
        remainingBalance: newRemainingBalance,
        paymentStatus,
        payments: [...(pur.payments || []), { ...payment, id: `pay-${Date.now()}` }]
      };

      api.updatePurchase(pur.id, updated).catch(err => console.error(err));
      return updated;
    }));
  };

  const deletePurchaseInvoice = (id: string) => {
    const nextPurchases = purchaseInvoices.filter(p => p.id !== id);
    setPurchaseInvoices(nextPurchases);
    localStorage.setItem('erp_purchase_invoices', JSON.stringify(nextPurchases));
    localStorage.setItem('erp_purchases', JSON.stringify(nextPurchases));

    const { productStocks } = computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices: nextPurchases,
      deliveryNotes,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: 'ALL'
    });
    const reconciled = buildReconciledStockLevels(productStocks);
    setStocks(reconciled);
    localStorage.setItem('erp_stocks', JSON.stringify(reconciled));

    api.deletePurchase(id)
      .then(() => refreshFromDatabase())
      .catch(err => console.error(err));
  };

  // ============================================================
  // SALES ORDER ACTIONS
  // ============================================================
  const createOrder = (orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'status' | 'totalHT' | 'totalVAT' | 'totalTTC' | 'totalCostHT' | 'grossMarginHT' | 'marginPercentage'>): SalesOrder => {
    const count = orders.length + 1;
    const orderNumber = `CMD-2026-${String(count).padStart(4, '0')}`;

    let totalHT = 0;
    let totalVAT = 0;
    let totalCostHT = 0;

    orderData.items.forEach(item => {
      totalHT += item.totalHT;
      totalVAT += item.totalHT * (item.vatRate || 0.20);
      totalCostHT += item.quantityKg * (item.unitCostHT || 0);
    });

    const totalTTC = totalHT + totalVAT;
    const grossMarginHT = totalHT - totalCostHT;
    const marginPercentage = totalHT > 0 ? (grossMarginHT / totalHT) * 100 : 0;

    const newOrder: SalesOrder = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber,
      status: 'EN_PRÉPARATION',
      totalHT,
      totalVAT,
      totalTTC,
      totalCostHT,
      grossMarginHT,
      marginPercentage: Math.round(marginPercentage * 100) / 100,
    };

    setOrders(prev => [newOrder, ...prev]);
    api.createOrder(newOrder).catch(err => console.error(err));

    return newOrder;
  };

  const updateOrder = (orderId: string, orderData: Partial<SalesOrder>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...orderData } : o));
    api.updateOrder(orderId, orderData).catch(err => console.error(err));
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    api.updateOrder(orderId, { status }).catch(err => console.error(err));
  };

  // ============================================================
  // DELIVERY NOTES (BLs)
  // ============================================================
  const addBL = (blData: DeliveryNoteBL) => {
    const targetCompId = blData.companyId || activeCompanyId;
    const targetComp = companies.find(c => c.id === targetCompId) || activeCompany;
    const prefix = targetComp?.blPrefix || 'BL';

    const blNumber = blData.blNumber || `${prefix}-2026-${String(deliveryNotes.length + 1).padStart(4, '0')}`;
    const bl: DeliveryNoteBL = {
      ...blData,
      id: blData.id || `bl-${Date.now()}`,
      createdAt: blData.createdAt || new Date().toISOString(),
      companyId: targetCompId,
      blNumber,
      stockDecremented: true,
      frigoEmployeeApproved: blData.frigoEmployeeApproved !== undefined 
        ? blData.frigoEmployeeApproved 
        : (blData.status === 'LIVRÉ' || blData.status === 'APPROUVÉ_FRIGO'),
      whatsappSent: blData.whatsappSent ?? false,
      emailSent: blData.emailSent ?? false,
      status: blData.status || 'EN_ATTENTE_FRIGO',
      logs: blData.logs || [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Création du Bon de Livraison (BL)',
          author: currentUser.name,
        }
      ]
    };

    const nextBLs = [bl, ...deliveryNotes];
    setDeliveryNotes(nextBLs);
    localStorage.setItem('erp_delivery_notes', JSON.stringify(nextBLs));

    // Reconcile and synchronize stocks immediately with new BL
    const { productStocks } = computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices,
      deliveryNotes: nextBLs,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: 'ALL'
    });
    const reconciled = buildReconciledStockLevels(productStocks);
    setStocks(reconciled);
    localStorage.setItem('erp_stocks', JSON.stringify(reconciled));

    api.createDeliveryNote(bl)
      .then(() => refreshFromDatabase())
      .catch(err => console.error('Error saving BL to PostgreSQL:', err));
  };

  const updateBL = (id: string, updatedData: Partial<DeliveryNoteBL>) => {
    const nextBLs = deliveryNotes.map(b => b.id === id ? { ...b, ...updatedData } : b);
    setDeliveryNotes(nextBLs);
    localStorage.setItem('erp_delivery_notes', JSON.stringify(nextBLs));

    const { productStocks } = computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices,
      deliveryNotes: nextBLs,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: 'ALL'
    });
    const reconciled = buildReconciledStockLevels(productStocks);
    setStocks(reconciled);
    localStorage.setItem('erp_stocks', JSON.stringify(reconciled));

    api.updateDeliveryNote(id, updatedData).catch(err => console.error('Error updating BL:', err));
  };

  const deleteBL = (id: string) => {
    const nextBLs = deliveryNotes.filter(b => b.id !== id);
    setDeliveryNotes(nextBLs);
    localStorage.setItem('erp_delivery_notes', JSON.stringify(nextBLs));

    const { productStocks } = computeSynchronizedStocks({
      products,
      frigos,
      stocks,
      purchaseInvoices,
      deliveryNotes: nextBLs,
      inventoryCounts,
      stockMovements,
      selectedFrigoId: 'ALL'
    });
    const reconciled = buildReconciledStockLevels(productStocks);
    setStocks(reconciled);
    localStorage.setItem('erp_stocks', JSON.stringify(reconciled));

    api.deleteDeliveryNote(id)
      .then(() => refreshFromDatabase())
      .catch(err => console.error('Error deleting BL from PostgreSQL:', err));
  };

  const approveFrigoBL = (blId: string, employeeName: string) => {
    api.approveFrigoBL(blId, employeeName)
      .then(updatedBL => {
        setDeliveryNotes(prev => prev.map(b => b.id === blId ? updatedBL : b));
        refreshFromDatabase();
      })
      .catch(err => console.error('Error approving BL in frigo:', err));
  };

  const signBL = (blId: string, signatureUrl: string, clientName: string) => {
    const updated = {
      clientSignatureUrl: signatureUrl,
      signedByName: clientName,
      signedAt: new Date().toISOString(),
      status: 'LIVRÉ' as const,
    };
    updateBL(blId, updated);
  };

  const sendWhatsAppBL = (blId: string) => {
    updateBL(blId, { whatsappSent: true, whatsappSentAt: new Date().toISOString() });
  };

  const sendEmailBL = (blId: string, recipient: string) => {
    updateBL(blId, { emailSent: true, emailSentAt: new Date().toISOString(), emailRecipient: recipient });
  };

  // ============================================================
  // INVOICING ACTIONS
  // ============================================================
  const createInvoiceFromBL = (blId: string, customCompanyId?: string): Invoice => {
    const bl = deliveryNotes.find(b => b.id === blId);
    if (!bl) throw new Error('Bon de Livraison introuvable');

    const count = invoices.length + 1;
    const targetCompId = customCompanyId || bl.companyId || (activeCompanyId !== 'ALL' ? activeCompanyId : companies[0]?.id || 'STE_1');
    const targetCompany = companies.find(c => c.id === targetCompId) || activeCompany || companies[0];
    const prefix = targetCompany?.invoicePrefix || 'FAC';
    const invoiceNumber = `${prefix}-2026-${String(count).padStart(4, '0')}`;

    const client = clients.find(c => c.id === bl.clientId);
    const clientICE = client?.ice || '';
    const hasValidIce = Boolean(clientICE && clientICE.trim() !== '' && clientICE !== '000000000000000');
    const activeVatRate = hasValidIce ? 0.20 : 0.00;

    const invoiceItems = bl.items.map(it => ({
      productId: it.productId,
      productCode: it.productCode,
      productName: it.productName,
      quantityKg: it.quantityKg,
      quantityPallets: it.quantityPallets,
      unitPriceHT: it.unitPriceHT,
      vatRate: activeVatRate,
      totalHT: it.totalHT,
      totalTTC: it.totalHT * (1 + activeVatRate),
    }));

    const totalHT = bl.totalHT;
    const totalVAT = totalHT * activeVatRate;
    const totalTTC = totalHT + totalVAT;

    const newInvoice: Invoice = {
      id: `fac-${Date.now()}`,
      companyId: targetCompId,
      invoiceNumber,
      orderId: bl.orderId,
      blId: bl.id,
      clientId: bl.clientId,
      clientName: bl.clientName,
      clientICE,
      clientAddress: bl.clientAddress,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      items: invoiceItems,
      totalHT,
      totalVAT,
      totalTTC,
      amountPaid: 0,
      remainingAmount: totalTTC,
      status: 'EMISE',
    };

    setInvoices(prev => [newInvoice, ...prev]);
    api.createInvoice(newInvoice).catch(err => console.error(err));

    updateBL(bl.id, {
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      status: 'FACTURÉ',
    });

    return newInvoice;
  };

  const updateInvoiceStatus = (invoiceId: string, status: Invoice['status'], amountPaid?: number) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;
      const newPaid = amountPaid !== undefined ? amountPaid : (status === 'PAYEE' ? inv.totalTTC : inv.amountPaid);
      const remaining = inv.totalTTC - newPaid;
      const updated = { ...inv, status, amountPaid: newPaid, remainingAmount: remaining };
      api.updateInvoice(invoiceId, updated).catch(err => console.error(err));
      return updated;
    }));
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
    api.deleteInvoice(id).catch(err => console.error(err));
  };

  // ============================================================
  // CHEQUES & EFFETS
  // ============================================================
  const addChequeEffet = (chequeData: Omit<ChequeEffet, 'id'>) => {
    const newCheque: ChequeEffet = {
      ...chequeData,
      id: `chq-${Date.now()}`,
    };
    setChequesEffets(prev => [newCheque, ...prev]);
    api.createCheque(newCheque).catch(err => console.error(err));
  };

  const updateChequeEffet = (id: string, chequeData: Partial<ChequeEffet>) => {
    setChequesEffets(prev => prev.map(c => c.id === id ? { ...c, ...chequeData } : c));
    api.updateCheque(id, chequeData).catch(err => console.error(err));
  };

  const deleteChequeEffet = (id: string) => {
    setChequesEffets(prev => prev.filter(c => c.id !== id));
    api.deleteCheque(id).catch(err => console.error(err));
  };

  const updateChequeStatus = (chequeId: string, status: ChequeEffetStatus) => {
    const updatedFields: Partial<ChequeEffet> = { status };
    if (status === 'DEPOSE') updatedFields.depositDate = new Date().toISOString().slice(0, 10);
    if (status === 'ENCAISSE') updatedFields.clearedDate = new Date().toISOString().slice(0, 10);
    updateChequeEffet(chequeId, updatedFields);
  };

  // ============================================================
  // EXPENSES
  // ============================================================
  const addExpense = (expenseData: Omit<Expense, 'id' | 'expenseNumber'>) => {
    const count = expenses.length + 1;
    const expenseNumber = `DEP-2026-${String(count).padStart(3, '0')}`;
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseNumber,
    };
    setExpenses(prev => [newExp, ...prev]);
    api.createExpense(newExp).catch(err => console.error(err));
  };

  // ============================================================
  // CLIENTS & SUPPLIERS
  // ============================================================
  const addClient = (clientData: Omit<Client, 'id' | 'code' | 'currentBalance'>) => {
    const count = clients.length + 1;
    const code = `CLT-${String(count).padStart(3, '0')}`;
    const newClient: Client = {
      ...clientData,
      id: `clt-${Date.now()}`,
      code,
      currentBalance: 0,
    };
    setClients(prev => [newClient, ...prev]);
    api.createClient(newClient).catch(err => console.error(err));
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...clientData } : c));
    api.updateClient(id, clientData).catch(err => console.error(err));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    api.deleteClient(id).catch(err => console.error(err));
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'code' | 'currentBalance'>) => {
    const count = suppliers.length + 1;
    const code = `FRS-${String(count).padStart(3, '0')}`;
    const newSupplier: Supplier = {
      ...supplierData,
      id: `frs-${Date.now()}`,
      code,
      currentBalance: 0,
    };
    setSuppliers(prev => [newSupplier, ...prev]);
    api.createSupplier(newSupplier).catch(err => console.error(err));
  };

  const updateSupplier = (id: string, supplierData: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...supplierData } : s));
    api.updateSupplier(id, supplierData).catch(err => console.error(err));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    api.deleteSupplier(id).catch(err => console.error(err));
  };

  // ============================================================
  // INVENTORY COUNTS
  // ============================================================
  const saveInventoryCount = (countData: Omit<MultiSiteInventoryCount, 'id' | 'countNumber'>, applyStockAdjust: boolean) => {
    const count = inventoryCounts.length + 1;
    const countNumber = `INV-2026-${String(count).padStart(3, '0')}`;
    const newCount: MultiSiteInventoryCount = {
      ...countData,
      id: `inv-${Date.now()}`,
      countNumber,
      status: applyStockAdjust ? 'AJUSTÉ' : 'VALIDÉ',
    };
    setInventoryCounts(prev => [newCount, ...prev]);
    api.createInventory(newCount).catch(err => console.error(err));

    if (applyStockAdjust) {
      countData.items.forEach(item => {
        adjustStock(countData.frigoId, item.productId, item.physicalKg, item.physicalPallets);
      });
    }
  };

  // Import Excel Batch BLs
  const reconcileStocksWithBLs = (targetFrigoId?: string) => {
    let totalDeductedKg = 0;
    let countedBLs = 0;

    setStocks(prevStocks => {
      let next = [...prevStocks];
      const relevantBLs = targetFrigoId 
        ? deliveryNotes.filter(bl => bl.frigoId === targetFrigoId || bl.frigoName?.toLowerCase().includes(targetFrigoId.toLowerCase()))
        : deliveryNotes;

      relevantBLs.forEach(bl => {
        countedBLs++;
        if (Array.isArray(bl.items)) {
          bl.items.forEach(item => {
            const qtyKg = Number(item.quantityKg) || 0;
            const qtyPal = Number(item.quantityPallets) || 0;
            totalDeductedKg += qtyKg;

            // Find matching stock record flexibly
            const targetFrigoObj = frigos.find(f => f.id === bl.frigoId || f.name === bl.frigoName) || frigos[0];
            const frigoIdToMatch = targetFrigoObj?.id || bl.frigoId;

            const existingIdx = next.findIndex(s => {
              const frigoMatches = s.frigoId === frigoIdToMatch || (targetFrigoObj && s.frigoId === targetFrigoObj.id);
              if (!frigoMatches) return false;

              // Product match
              const prd1 = products.find(p => p.id === s.productId || p.code === s.productId);
              const prd2 = products.find(p => p.id === item.productId || p.code === item.productCode || p.code === item.productId);
              return (s.productId.toLowerCase() === (item.productId || '').toLowerCase()) ||
                     (prd1 && prd2 && prd1.id === prd2.id) ||
                     (prd1 && prd1.code.toLowerCase() === (item.productCode || '').toLowerCase());
            });

            if (existingIdx >= 0) {
              next[existingIdx] = {
                ...next[existingIdx],
                quantityKg: Math.max(0, next[existingIdx].quantityKg - qtyKg),
                quantityPallets: Math.max(0, next[existingIdx].quantityPallets - qtyPal),
                lastUpdated: new Date().toISOString(),
              };
            }
          });
        }
      });

      localStorage.setItem('erp_stocks', JSON.stringify(next));
      return next;
    });

    return { deductedKg: totalDeductedKg, blCount: countedBLs };
  };

  const importExcelBLs = (newBLs: DeliveryNoteBL[]) => {
    // 1. Immediately update deliveryNotes in state and localStorage
    setDeliveryNotes(prev => {
      const existingMap = new Map(prev.map(b => [b.blNumber, b]));
      newBLs.forEach(b => existingMap.set(b.blNumber, b));
      const next = Array.from(existingMap.values());
      localStorage.setItem('erp_delivery_notes', JSON.stringify(next));
      return next;
    });

    // 2. Immediately decrement stocks with flexible product and frigo matching
    setStocks(prevStocks => {
      let next = [...prevStocks];
      newBLs.forEach(bl => {
        if (Array.isArray(bl.items)) {
          bl.items.forEach(item => {
            const deductedKg = Number(item.quantityKg) || 0;
            const deductedPallets = Number(item.quantityPallets) || 0;

            const targetFrigoObj = frigos.find(f => f.id === bl.frigoId || f.name === bl.frigoName) || frigos[0];
            const frigoIdToMatch = targetFrigoObj?.id || bl.frigoId;

            const existingIdx = next.findIndex(s => {
              const frigoMatches = s.frigoId === frigoIdToMatch || (targetFrigoObj && s.frigoId === targetFrigoObj.id);
              if (!frigoMatches) return false;

              const prd1 = products.find(p => p.id === s.productId || p.code === s.productId);
              const prd2 = products.find(p => p.id === item.productId || p.code === item.productCode || p.code === item.productId);
              return (s.productId.toLowerCase() === (item.productId || '').toLowerCase()) ||
                     (prd1 && prd2 && prd1.id === prd2.id) ||
                     (prd1 && prd1.code.toLowerCase() === (item.productCode || '').toLowerCase());
            });

            if (existingIdx >= 0) {
              next[existingIdx] = {
                ...next[existingIdx],
                quantityKg: Math.max(0, next[existingIdx].quantityKg - deductedKg),
                quantityPallets: Math.max(0, next[existingIdx].quantityPallets - deductedPallets),
                lastUpdated: new Date().toISOString(),
              };
            }
          });
        }
      });
      localStorage.setItem('erp_stocks', JSON.stringify(next));
      return next;
    });

    // 3. Persist batch to backend API
    api.importBatchBLs(newBLs)
      .then(() => refreshFromDatabase())
      .catch(err => console.error('Error importing batch BLs:', err));
  };

  // Deduplication & Lossless Client Merging
  const deduplicateClients = async (): Promise<number> => {
    try {
      const res = await api.deduplicateAllClients();
      await refreshFromDatabase();
      return res.count || 0;
    } catch (e) {
      console.warn('API deduplicate error, running local fallback:', e);
      const groups = new Map<string, Client[]>();
      clients.forEach(c => {
        const key = normalizeName(c.name || c.companyName || '');
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      });

      let count = 0;
      for (const [_, clts] of groups.entries()) {
        if (clts.length > 1) {
          const primary = clts.find(c => c.ice && c.ice.trim()) || clts[0];
          const secondaries = clts.filter(c => c.id !== primary.id).map(c => c.id);
          if (secondaries.length > 0) {
            await mergeClients(primary.id, secondaries);
            count += secondaries.length;
          }
        }
      }

      await refreshFromDatabase();
      return count;
    }
  };

  const mergeClients = async (targetClientId: string, clientIdsToMerge: string[]) => {
    const target = clients.find(c => c.id === targetClientId);
    if (!target) return;
    const secondaries = clientIdsToMerge.filter(id => id && id !== targetClientId);
    if (secondaries.length === 0) return;

    const secSet = new Set(secondaries);
    const targetName = target.name || target.companyName || 'Client';

    // 1. Optimistic local state update (Lossless: reassign all BLs, Invoices, Orders, Cheques)
    setClients(prev => {
      const filtered = prev.filter(c => !secSet.has(c.id));
      localStorage.setItem('erp_clients', JSON.stringify(filtered));
      return filtered;
    });

    setDeliveryNotes(prev => {
      const updated = prev.map(bl => secSet.has(bl.clientId) ? { 
        ...bl, 
        clientId: target.id, 
        clientName: targetName,
        clientAddress: target.address || bl.clientAddress,
        clientPhone: target.phone || bl.clientPhone,
        clientEmail: target.email || bl.clientEmail,
      } : bl);
      localStorage.setItem('erp_delivery_notes', JSON.stringify(updated));
      return updated;
    });

    setInvoices(prev => {
      const updated = prev.map(inv => secSet.has(inv.clientId) ? { 
        ...inv, 
        clientId: target.id, 
        clientName: targetName,
        clientICE: target.ice || inv.clientICE,
        clientAddress: target.address || inv.clientAddress,
      } : inv);
      localStorage.setItem('erp_invoices', JSON.stringify(updated));
      return updated;
    });

    setOrders(prev => {
      const updated = prev.map(ord => secSet.has(ord.clientId) ? { 
        ...ord, 
        clientId: target.id, 
        clientName: targetName,
        clientICE: target.ice || ord.clientICE,
        clientPhone: target.phone || ord.clientPhone,
        clientEmail: target.email || ord.clientEmail,
      } : ord);
      localStorage.setItem('erp_orders', JSON.stringify(updated));
      return updated;
    });

    setChequesEffets(prev => {
      const updated = prev.map(ch => secSet.has(ch.partyId) ? { 
        ...ch, 
        partyId: target.id, 
        partyName: targetName 
      } : ch);
      localStorage.setItem('erp_cheques', JSON.stringify(updated));
      return updated;
    });

    // 2. Persist to PostgreSQL database
    try {
      await api.mergeClients(targetClientId, secondaries);
      await refreshFromDatabase();
    } catch (err) {
      console.error('Error merging clients in API:', err);
    }
  };

  const mergeProducts = (targetProductId: string, productIdsToMerge: string[]) => {
    api.mergeProducts(targetProductId, productIdsToMerge)
      .then(() => refreshFromDatabase())
      .catch(err => console.error(err));
  };

  const resetAllData = async () => {
    try {
      await fetch('/api/sync/reset-all', { method: 'POST' });
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const contextValue = useMemo(() => ({
    currentUser,
    setCurrentUser,
    users,
    activeCompanyId,
    setActiveCompanyId,
    companies,
    activeCompany,
    updateCompanyEntity,
    products,
    frigos,
    stocks,
    stockMovements,
    clients,
    suppliers,
    orders,
    deliveryNotes,
    invoices,
    chequesEffets,
    treasuryAccounts,
    expenses,
    inventoryCounts,
    purchaseInvoices,
    companyInfo,
    updateCompanyInfo,
    addProduct,
    updateProduct,
    deleteProduct,
    syncBLPricesWithProducts,
    recalculateAllBLPrices,
    addFrigo,
    updateFrigo,
    deleteFrigo,
    adjustStock,
    transferStock,
    repackageStock,
    clearStocks,
    recalculateAndSyncAllStocks,
    createPurchaseInvoice,
    updatePurchaseInvoice,
    addPurchasePayment,
    deletePurchaseInvoice,
    createOrder,
    updateOrder,
    updateOrderStatus,
    addBL,
    updateBL,
    deleteBL,
    approveFrigoBL,
    signBL,
    sendWhatsAppBL,
    sendEmailBL,
    createInvoiceFromBL,
    updateInvoiceStatus,
    deleteInvoice,
    addChequeEffet,
    updateChequeEffet,
    deleteChequeEffet,
    updateChequeStatus,
    resetAllData,
    addExpense,
    addClient,
    updateClient,
    deleteClient,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    saveInventoryCount,
    importExcelBLs,
    reconcileStocksWithBLs,
    deduplicateClients,
    mergeClients,
    mergeProducts,
    purgeOrphanStocks,
  }), [
    currentUser,
    users,
    activeCompanyId,
    companies,
    activeCompany,
    products,
    frigos,
    stocks,
    stockMovements,
    clients,
    suppliers,
    orders,
    deliveryNotes,
    invoices,
    chequesEffets,
    treasuryAccounts,
    expenses,
    inventoryCounts,
    purchaseInvoices,
    companyInfo,
  ]);


  // ============================================================
  // AUTO SYNCHRONIZE STOCKS WITH PURCHASES & BLs (Runs automatically on mount / data changes)
  // Guarantees 100% synchronicity between purchases, BLs, frigos and product stocks
  // ============================================================
  useEffect(() => {
    try {
      if (products.length > 0) {
        const { productStocks } = computeSynchronizedStocks({
          products,
          frigos,
          stocks,
          purchaseInvoices,
          deliveryNotes,
          inventoryCounts,
          stockMovements,
          selectedFrigoId: 'ALL',
        });

        const reconciled = buildReconciledStockLevels(productStocks);
        const recJson = JSON.stringify(reconciled);
        const curJson = JSON.stringify(stocks);

        if (recJson !== curJson) {
          setStocks(reconciled);
          localStorage.setItem('erp_stocks', recJson);
        }
      }
    } catch (e) {
      console.error('Error during auto stock synchronization:', e);
    }
  }, [products, frigos, purchaseInvoices, deliveryNotes, inventoryCounts, stockMovements]);

  return (
    <ERPContext.Provider value={contextValue}>
      {children}
    </ERPContext.Provider>
  );
};

const defaultFallbackContext: ERPContextType = {
  currentUser: INITIAL_USERS[0],
  setCurrentUser: () => {},
  users: INITIAL_USERS,
  activeCompanyId: 'STE_1',
  setActiveCompanyId: () => {},
  companies: DEFAULT_COMPANIES,
  activeCompany: DEFAULT_COMPANIES[0],
  updateCompanyEntity: () => {},
  products: [],
  frigos: INITIAL_FRIGOS,
  stocks: [],
  stockMovements: [],
  clients: [],
  suppliers: [],
  orders: [],
  deliveryNotes: [],
  invoices: [],
  chequesEffets: [],
  treasuryAccounts: [],
  expenses: [],
  inventoryCounts: [],
  purchaseInvoices: [],
  companyInfo: INITIAL_COMPANY_INFO,
  updateCompanyInfo: () => {},
  addProduct: () => ({ id: '', code: '', name: '', category: 'Dattes Locales', origin: '', sellingPriceHT: 0, unitCostHT: 0, vatRate: 0.2, kgPerCarton: 5, cartonsPerPallet: 100, kgPerPallet: 500, minStockAlertKg: 500, description: '' }),
  updateProduct: async () => {},
  deleteProduct: () => {},
  syncBLPricesWithProducts: () => {},
  recalculateAllBLPrices: async () => ({ details: [], totalBLsScanned: 0, totalItemsUpdated: 0, updatedBLsCount: 0, unchangedBLsCount: 0, failedBLsCount: 0, totalFinancialImpactHT: 0, timestamp: '' }),
  addFrigo: () => ({ id: '', code: '', name: '', location: '', capacityPallets: 1000, managerName: '', managerPhone: '', whatsappGroup: '', whatsappGroupLink: '' }),
  updateFrigo: () => {},
  deleteFrigo: () => {},
  adjustStock: () => {},
  transferStock: () => {},
  repackageStock: () => {},
  clearStocks: async () => {},
  recalculateAndSyncAllStocks: async () => [],
  createPurchaseInvoice: () => ({ id: '', invoiceNumber: '', supplierId: '', supplierName: '', targetFrigoId: '', dateArrival: '', isImport: false, customsCostsHT: 0, freightCostsHT: 0, totalProductsHT: 0, totalLandedCostHT: 0, items: [], paymentStatus: 'NON_PAYÉ' }),
  updatePurchaseInvoice: () => {},
  addPurchasePayment: () => {},
  deletePurchaseInvoice: () => {},
  createOrder: () => ({ id: '', orderNumber: '', clientId: '', clientName: '', clientICE: '', clientPhone: '', clientEmail: '', date: '', expectedDeliveryDate: '', items: [], totalHT: 0, totalVAT: 0, totalTTC: 0, totalCostHT: 0, grossMarginHT: 0, marginPercentage: 0, createdByName: '', status: 'DEVIS' }),
  updateOrder: () => {},
  updateOrderStatus: () => {},
  addBL: () => {},
  updateBL: () => {},
  deleteBL: () => {},
  approveFrigoBL: () => {},
  signBL: () => {},
  sendWhatsAppBL: () => {},
  sendEmailBL: () => {},
  createInvoiceFromBL: () => ({ id: '', invoiceNumber: '', clientId: '', clientName: '', clientICE: '', clientAddress: '', date: '', dueDate: '', items: [], totalHT: 0, totalVAT: 0, totalTTC: 0, amountPaid: 0, remainingAmount: 0, status: 'BROUILLON' }),
  updateInvoiceStatus: () => {},
  deleteInvoice: () => {},
  addChequeEffet: () => {},
  updateChequeEffet: () => {},
  deleteChequeEffet: () => {},
  updateChequeStatus: () => {},
  resetAllData: () => {},
  addExpense: () => {},
  addClient: () => {},
  updateClient: () => {},
  deleteClient: () => {},
  addSupplier: () => {},
  updateSupplier: () => {},
  deleteSupplier: () => {},
  saveInventoryCount: () => {},
  importExcelBLs: () => {},
  reconcileStocksWithBLs: () => ({ deductedKg: 0, blCount: 0 }),
  deduplicateClients: async () => 0,
  mergeClients: async () => {},
  mergeProducts: () => {},
  purgeOrphanStocks: () => 0,
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    console.warn('useERP used outside ERPProvider, using fallback context');
    return defaultFallbackContext;
  }
  return context;
};
