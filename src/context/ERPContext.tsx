import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { findMatchingProduct } from '../utils/productMatcher';
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
  RecalculationSummaryReport,
  RecalculationReportItem,
  ProductStockMovement,
  StockMovementType
} from '../types';

import { 
  INITIAL_USERS, 
  INITIAL_FRIGOS, 
  INITIAL_PRODUCTS, 
  INITIAL_STOCKS, 
  INITIAL_CLIENTS, 
  INITIAL_SUPPLIERS, 
  INITIAL_ORDERS, 
  INITIAL_DELIVERY_NOTES, 
  INITIAL_INVOICES, 
  INITIAL_CHEQUES_EFFETS, 
  INITIAL_TREASURY_ACCOUNTS, 
  INITIAL_EXPENSES,
  INITIAL_COMPANY_INFO,
  INITIAL_STOCK_MOVEMENTS
} from '../data/mockData';

import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';

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

  // Purchase Actions
  createPurchaseInvoice: (purchaseData: Omit<PurchaseImportInvoice, 'id'>) => PurchaseImportInvoice;
  addPurchasePayment: (purchaseInvoiceId: string, payment: { amount: number; paymentMethod: PaymentMethod; date: string; reference?: string; bankName?: string; notes?: string }) => void;
  deletePurchaseInvoice: (id: string) => void;

  // Order & BL Actions
  createOrder: (orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'status' | 'totalHT' | 'totalVAT' | 'totalTTC' | 'totalCostHT' | 'grossMarginHT' | 'marginPercentage'>) => SalesOrder;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addBL: (blData: DeliveryNoteBL) => void;
  updateBL: (id: string, updatedData: Partial<DeliveryNoteBL>) => void;
  deleteBL: (id: string) => void;
  approveFrigoBL: (blId: string, employeeName: string) => void;
  signBL: (blId: string, signatureUrl: string, clientName: string) => void;
  sendWhatsAppBL: (blId: string) => void;
  sendEmailBL: (blId: string, recipient: string) => void;

  // Finance Actions
  createInvoiceFromBL: (blId: string) => Invoice;
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
  deduplicateClients: () => number;
  mergeClients: (targetClientId: string, clientIdsToMerge: string[]) => void;
  mergeProducts: (targetProductId: string, productIdsToMerge: string[]) => void;
  purgeOrphanStocks: () => number; // Remove ghost stock records with no matching product
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load from localStorage or default
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('erp_current_user');
    return saved ? JSON.parse(saved) : INITIAL_USERS[0];
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('erp_users');
    if (saved) return JSON.parse(saved);
    const savedAppUsers = localStorage.getItem('erp_app_users');
    if (savedAppUsers) {
      const parsed = JSON.parse(savedAppUsers);
      return parsed.map((u: any) => ({
        id: u.uid || u.id,
        name: u.displayName || u.name,
        email: u.email,
        role: u.role,
        assignedFrigoId: u.assignedFrigoId,
        avatar: u.avatar
      }));
    }
    return INITIAL_USERS;
  });

  // Active Company (Société Sœur)
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    return localStorage.getItem('erp_active_company_id') || 'STE_1';
  });

  const [companies, setCompanies] = useState<CompanyEntity[]>(() => {
    const saved = localStorage.getItem('erp_companies');
    if (saved) return JSON.parse(saved);
    return DEFAULT_COMPANIES;
  });

  const updateCompanyEntity = (id: string, updatedData: Partial<CompanyEntity>) => {
    setCompanies(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updatedData } : c);
      localStorage.setItem('erp_companies', JSON.stringify(next));
      
      const targetComp = next.find(c => c.id === id);
      if (targetComp) {
        const cleanData = sanitizeForFirestore(targetComp);
        setDoc(doc(db, 'companies', id), cleanData).catch(err => {
          console.warn('Company firestore sync notice:', err);
        });
      }
      return next;
    });
  };


  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

  useEffect(() => {
    localStorage.setItem('erp_active_company_id', activeCompanyId);
  }, [activeCompanyId]);


  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('erp_products');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [frigos, setFrigos] = useState<ColdStorageFrigo[]>(() => {
    const saved = localStorage.getItem('erp_frigos');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [stocks, setStocks] = useState<FrigoStockLevel[]>(() => {
    const saved = localStorage.getItem('erp_stocks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('erp_clients');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('erp_suppliers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [orders, setOrders] = useState<SalesOrder[]>(() => {
    const saved = localStorage.getItem('erp_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteBL[]>(() => {
    const saved = localStorage.getItem('erp_deliveryNotes') || localStorage.getItem('erp_delivery_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('erp_invoices');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [chequesEffets, setChequesEffets] = useState<ChequeEffet[]>(() => {
    const saved = localStorage.getItem('erp_cheques') || localStorage.getItem('erp_cheques_effets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(() => {
    const saved = localStorage.getItem('erp_treasury');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('erp_expenses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [inventoryCounts, setInventoryCounts] = useState<MultiSiteInventoryCount[]>(() => {
    const saved = localStorage.getItem('erp_inventories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseImportInvoice[]>(() => {
    const saved = localStorage.getItem('erp_purchase_invoices');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [stockMovements, setStockMovements] = useState<ProductStockMovement[]>(() => {
    const saved = localStorage.getItem('erp_stock_movements');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // LocalStorage Persistence Effects for ALL Entities (Prevents Data Loss on F5 Refresh)
  useEffect(() => { localStorage.setItem('erp_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('erp_frigos', JSON.stringify(frigos)); }, [frigos]);
  useEffect(() => { localStorage.setItem('erp_stocks', JSON.stringify(stocks)); }, [stocks]);
  useEffect(() => { localStorage.setItem('erp_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('erp_suppliers', JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem('erp_deliveryNotes', JSON.stringify(deliveryNotes)); }, [deliveryNotes]);
  useEffect(() => { localStorage.setItem('erp_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('erp_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('erp_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('erp_cheques', JSON.stringify(chequesEffets)); }, [chequesEffets]);
  useEffect(() => { localStorage.setItem('erp_stock_movements', JSON.stringify(stockMovements)); }, [stockMovements]);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    const saved = localStorage.getItem('erp_company_info');
    if (saved) return JSON.parse(saved);
    return INITIAL_COMPANY_INFO;
  });

  const sanitizeForFirestore = (data: any): any => {
    if (data === null || data === undefined) return '';
    if (typeof data !== 'object') return data;
    if (data instanceof Date) return data.toISOString();
    if (Array.isArray(data)) {
      return data.map(item => sanitizeForFirestore(item));
    }
    const clean: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      const val = data[key];
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    });
    return clean;
  };

  const updateCompanyInfo = (info: Partial<CompanyInfo>) => {
    setCompanyInfo(prev => {
      const updated = { ...prev, ...info };
      const cleanData = sanitizeForFirestore(updated);
      setDoc(doc(db, 'settings', 'companyInfo'), cleanData).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, 'settings/companyInfo');
      });
      return updated;
    });
  };


  // Save changes to localStorage & Firebase Firestore
  useEffect(() => {
    localStorage.setItem('erp_current_user', JSON.stringify(currentUser));
  }, [currentUser]);




  // ============================================================
  // FIREBASE SYNC: One-shot load at startup (NO onSnapshot)
  // localStorage is the PRIMARY source of truth.
  // Firebase is loaded ONCE at startup to sync data from other devices.
  // After that, all writes go to localStorage (instant) + Firebase (background async).
  // This eliminates ALL race conditions, ghost products, vanishing BLs.
  // ============================================================
  useEffect(() => {
    const loadFromFirebaseOnce = async () => {
      try {
        // Load clients from Firebase and MERGE (Firestore takes priority for new data)
        const clientSnap = await getDocs(collection(db, 'clients')).catch(() => null);
        if (clientSnap && !clientSnap.empty) {
          const fbClients = clientSnap.docs.map(d => d.data() as Client).filter(c =>
            c && c.id && c.name &&
            !['client import', 'client 1', 'client 2', 'clt-excel-', 'clt-import-'].some(p => (c.name + (c.code||'')).toLowerCase().includes(p))
          );
          if (fbClients.length > 0) {
            setClients(prev => {
              const merged = new Map<string, Client>();
              prev.forEach(c => merged.set(c.id, c));
              fbClients.forEach(c => merged.set(c.id, c));
              return Array.from(merged.values());
            });
          }
        }

        // Load products from Firebase (filter out ghost products)
        const productSnap = await getDocs(collection(db, 'products')).catch(() => null);
        if (productSnap && !productSnap.empty) {
          const fbProducts = productSnap.docs.map(d => d.data() as Product).filter(p =>
            p && p.id && p.name &&
            !p.name.includes('Produit Inconnu') &&
            !p.name.includes('PAGE 1') &&
            !p.name.includes('UNNAMED')
          );
          // Auto-purge ghost products from Firebase
          productSnap.docs.forEach(d => {
            const pData = d.data() as Product;
            if (pData.name && (pData.name.includes('Produit Inconnu') || pData.name.includes('PAGE 1'))) {
              deleteDoc(d.ref).catch(() => {});
            }
          });
          if (fbProducts.length > 0) {
            setProducts(prev => {
              const merged = new Map<string, Product>();
              prev.forEach(p => { if (p && p.id) merged.set(p.id, p); });
              fbProducts.forEach(p => { if (p && p.id) merged.set(p.id, p); });
              const result = Array.from(merged.values());
              return result.length > 0 ? result : prev;
            });
          }
        }

        // Load frigos
        const frigoSnap = await getDocs(collection(db, 'frigos')).catch(() => null);
        if (frigoSnap && !frigoSnap.empty) {
          const fbFrigos = frigoSnap.docs.map(d => d.data() as ColdStorageFrigo).filter(f => f && f.id);
          if (fbFrigos.length > 0) {
            setFrigos(prev => {
              const merged = new Map<string, ColdStorageFrigo>();
              prev.forEach(f => merged.set(f.id, f));
              fbFrigos.forEach(f => merged.set(f.id, f));
              return Array.from(merged.values());
            });
          }
        }

        // Load suppliers
        const supplierSnap = await getDocs(collection(db, 'suppliers')).catch(() => null);
        if (supplierSnap && !supplierSnap.empty) {
          const fbSuppliers = supplierSnap.docs.map(d => d.data() as Supplier).filter(s => s && s.id);
          if (fbSuppliers.length > 0) {
            setSuppliers(prev => {
              const merged = new Map<string, Supplier>();
              prev.forEach(s => merged.set(s.id, s));
              fbSuppliers.forEach(s => merged.set(s.id, s));
              return Array.from(merged.values());
            });
          }
        }

        // Load stocks — ONLY for products that have valid IDs
        const stockSnap = await getDocs(collection(db, 'stocks')).catch(() => null);
        if (stockSnap && !stockSnap.empty) {
          const fbStocks = stockSnap.docs.map(d => d.data() as FrigoStockLevel).filter(s =>
            s && s.productId &&
            s.productId.trim() !== '' &&
            !s.productId.includes('prd-imp-') &&
            !s.productId.includes('undefined') &&
            !s.productId.includes('null')
          );
          // Purge invalid stocks from Firebase
          stockSnap.docs.forEach(d => {
            const sData = d.data() as FrigoStockLevel;
            if (!sData.productId || sData.productId.includes('prd-imp-') || sData.productId.includes('undefined')) {
              deleteDoc(d.ref).catch(() => {});
            }
          });
          if (fbStocks.length > 0) {
            setStocks(prev => {
              const merged = new Map<string, FrigoStockLevel>();
              prev.forEach(s => merged.set(`${s.frigoId}_${s.productId}`, s));
              fbStocks.forEach(s => merged.set(`${s.frigoId}_${s.productId}`, s));
              return Array.from(merged.values());
            });
          }
        }

        // Load delivery notes (BLs) — MERGE, never overwrite local
        const blSnap = await getDocs(collection(db, 'deliveryNotes')).catch(() => null);
        if (blSnap && !blSnap.empty) {
          const deletedSet = new Set<string>(JSON.parse(localStorage.getItem('erp_deleted_bls') || '[]'));
          const fbBLs = blSnap.docs.map(d => d.data() as DeliveryNoteBL).filter(b =>
            b && b.id && !deletedSet.has(b.id)
          );
          if (fbBLs.length > 0) {
            setDeliveryNotes(prev => {
              const merged = new Map<string, DeliveryNoteBL>();
              prev.forEach(b => { if (b && b.id && !deletedSet.has(b.id)) merged.set(b.id, b); });
              fbBLs.forEach(b => { if (b && b.id) merged.set(b.id, b); });
              return Array.from(merged.values());
            });
          }
        }

        // Load invoices
        const invoiceSnap = await getDocs(collection(db, 'invoices')).catch(() => null);
        if (invoiceSnap && !invoiceSnap.empty) {
          const deletedSet = new Set<string>(JSON.parse(localStorage.getItem('erp_deleted_invoices') || '[]'));
          const fbInvoices = invoiceSnap.docs.map(d => d.data() as Invoice).filter(inv =>
            inv && inv.id && !deletedSet.has(inv.id)
          );
          if (fbInvoices.length > 0) {
            setInvoices(prev => {
              const merged = new Map<string, Invoice>();
              prev.forEach(inv => { if (inv && inv.id) merged.set(inv.id, inv); });
              fbInvoices.forEach(inv => merged.set(inv.id, inv));
              return Array.from(merged.values());
            });
          }
        }

        // Load expenses
        const expenseSnap = await getDocs(collection(db, 'expenses')).catch(() => null);
        if (expenseSnap && !expenseSnap.empty) {
          const fbExpenses = expenseSnap.docs.map(d => d.data() as Expense).filter(e => e && e.id);
          if (fbExpenses.length > 0) {
            setExpenses(prev => {
              const merged = new Map<string, Expense>();
              prev.forEach(e => { if (e && e.id) merged.set(e.id, e); });
              fbExpenses.forEach(e => merged.set(e.id, e));
              return Array.from(merged.values());
            });
          }
        }

        // Load cheques
        const chequeSnap = await getDocs(collection(db, 'chequesEffets')).catch(() => null);
        if (chequeSnap && !chequeSnap.empty) {
          const fbCheques = chequeSnap.docs.map(d => d.data() as ChequeEffet).filter(c => c && c.id);
          if (fbCheques.length > 0) {
            setChequesEffets(prev => {
              const merged = new Map<string, ChequeEffet>();
              prev.forEach(c => { if (c && c.id) merged.set(c.id, c); });
              fbCheques.forEach(c => merged.set(c.id, c));
              return Array.from(merged.values());
            });
          }
        }

        // Load orders
        const orderSnap = await getDocs(collection(db, 'orders')).catch(() => null);
        if (orderSnap && !orderSnap.empty) {
          const fbOrders = orderSnap.docs.map(d => d.data() as SalesOrder).filter(o => o && o.id);
          if (fbOrders.length > 0) {
            setOrders(prev => {
              const merged = new Map<string, SalesOrder>();
              prev.forEach(o => { if (o && o.id) merged.set(o.id, o); });
              fbOrders.forEach(o => merged.set(o.id, o));
              return Array.from(merged.values());
            });
          }
        }

        // Load purchase invoices
        const purSnap = await getDocs(collection(db, 'purchase_invoices')).catch(() => null);
        if (purSnap && !purSnap.empty) {
          const fbPur = purSnap.docs.map(d => d.data() as PurchaseImportInvoice).filter(p => p && p.id);
          if (fbPur.length > 0) {
            setPurchaseInvoices(prev => {
              const merged = new Map<string, PurchaseImportInvoice>();
              prev.forEach(p => { if (p && p.id) merged.set(p.id, p); });
              fbPur.forEach(p => merged.set(p.id, p));
              return Array.from(merged.values());
            });
          }
        }

        // Load users
        const userSnap = await getDocs(collection(db, 'users')).catch(() => null);
        if (userSnap && !userSnap.empty) {
          const fbUsers = userSnap.docs.map(d => {
            const data = d.data();
            return {
              id: data.uid || d.id,
              name: data.displayName || data.name || data.email,
              email: data.email,
              role: data.role,
              assignedFrigoId: data.assignedFrigoId,
              avatar: data.avatar
            } as UserProfile;
          }).filter(u => u && u.id);
          if (fbUsers.length > 0) setUsers(fbUsers);
        }

      } catch (err) {
        console.warn('[Firebase Sync] One-shot load failed (working offline):', err);
        // No problem — localStorage data is already loaded, app works normally
      }
    };

    // Load from Firebase in background (don't block UI)
    loadFromFirebaseOnce();
    // No cleanup needed — no persistent listeners
  }, []); // eslint-disable-line react-hooks/exhaustive-deps




  useEffect(() => {
    localStorage.setItem('erp_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('erp_frigos', JSON.stringify(frigos));
  }, [frigos]);

  useEffect(() => {
    localStorage.setItem('erp_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('erp_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('erp_deliveryNotes', JSON.stringify(deliveryNotes));
  }, [deliveryNotes]);

  useEffect(() => {
    localStorage.setItem('erp_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('erp_cheques', JSON.stringify(chequesEffets));
  }, [chequesEffets]);

  useEffect(() => {
    localStorage.setItem('erp_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('erp_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('erp_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('erp_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('erp_frigos', JSON.stringify(frigos));
  }, [frigos]);

  useEffect(() => {
    localStorage.setItem('erp_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('erp_deliveryNotes', JSON.stringify(deliveryNotes));
  }, [deliveryNotes]);

  useEffect(() => {
    localStorage.setItem('erp_orders', JSON.stringify(orders));
  }, [orders]);

  // Product helper
  const addProduct = (productData: Omit<Product, 'id' | 'code' | 'kgPerPallet'>): Product => {
    // Check if product with exact same name already exists to prevent duplication
    const existing = products.find(p => p.name.trim().toLowerCase() === productData.name.trim().toLowerCase());
    if (existing) {
      console.warn(`Product "${productData.name}" already exists (${existing.code}). Returning existing product.`);
      return existing;
    }

    const nextCodeNum = products.length + 1;
    const code = `PRD-DAT-${String(nextCodeNum).padStart(3, '0')}`;
    const kgPerPallet = productData.kgPerCarton * productData.cartonsPerPallet;
    const newPrd: Product = {
      ...productData,
      id: `prd-${Date.now()}`,
      code,
      kgPerPallet,
    };
    setProducts(prev => [newPrd, ...prev]);

    // Initialize stock at 0 for each frigo
    const newStockLevels: FrigoStockLevel[] = frigos.map(f => ({
      productId: newPrd.id,
      frigoId: f.id,
      quantityKg: 0,
      quantityPallets: 0,
      lastUpdated: new Date().toLocaleString('fr-FR'),
    }));
    setStocks(prev => [...prev, ...newStockLevels]);

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

    const batch = writeBatch(db);
    batch.set(doc(db, 'products', id), sanitizeForFirestore(updatedProduct), { merge: true });

    const affectedBLs = deliveryNotes.filter(bl => bl.items.some(item => item.productId === id));
    const newPrice = updatedProduct.sellingPriceHT;

    for (const bl of affectedBLs) {
      const newItems = bl.items.map(item => {
        if (item.productId === id) {
          return {
            ...item,
            unitPriceHT: newPrice,
            totalHT: item.quantityKg * newPrice,
          };
        }
        return item;
      });

      const totalHT = newItems.reduce((sum, it) => sum + it.totalHT, 0);
      const updatedBL = {
        ...bl,
        items: newItems,
        totalHT,
        totalTTC: totalHT,
      };
      batch.set(doc(db, 'deliveryNotes', bl.id), updatedBL);
    }

    try {
      await batch.commit();
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      setDeliveryNotes(prev => prev.map(bl => {
        const found = affectedBLs.find(a => a.id === bl.id);
        return found ? { ...bl, items: bl.items.map(item => item.productId === id ? { ...item, unitPriceHT: newPrice, totalHT: item.quantityKg * newPrice } : item), totalHT: bl.items.reduce((sum, it) => sum + (it.productId === id ? it.quantityKg * newPrice : it.totalHT), 0), totalTTC: bl.items.reduce((sum, it) => sum + (it.productId === id ? it.quantityKg * newPrice : it.totalHT), 0) } : bl;
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `atomic_product_update/${id}`);
    }
  };

  const syncBLPricesWithProducts = () => {
    console.log('Syncing BL prices with products...');
    setDeliveryNotes(prevBLs => prevBLs.map(bl => {
      let isModified = false;
      
      // Check frigoName sync
      const matchedFrigo = frigos.find(f => f.id === bl.frigoId) || frigos.find(f => f.id === 'frigo-1') || frigos[0];
      const correctFrigoName = matchedFrigo ? matchedFrigo.name : 'Frigo MFADEL';
      let currentFrigoName = bl.frigoName;

      if (bl.frigoName.includes('Port Casablanca') || bl.frigoName.includes('Frigo A') || bl.frigoName.includes('Frigo B') || bl.frigoName.includes('Frigo C') || bl.frigoName !== correctFrigoName) {
        currentFrigoName = correctFrigoName;
        isModified = true;
      }

      const newItems = bl.items.map(item => {
        const prd = findMatchingProduct(item, products);

        if (prd) {
          if (item.unitPriceHT !== prd.sellingPriceHT || item.productId !== prd.id || item.productCode !== prd.code) {
            console.log(`Updating price for BL ${bl.blNumber}: ${item.productName} ${item.unitPriceHT} -> ${prd.sellingPriceHT}`);
            isModified = true;
            return {
              ...item,
              productId: prd.id,
              productCode: prd.code,
              unitPriceHT: prd.sellingPriceHT,
              totalHT: item.quantityKg * prd.sellingPriceHT,
            };
          }
        }
        return item;
      });

      const totalHT = newItems.reduce((sum, it) => sum + it.totalHT, 0);
      if (!isModified && bl.totalHT === totalHT && bl.totalTTC === totalHT && bl.frigoName === currentFrigoName) return bl;
      
      console.log(`BL ${bl.blNumber} modified. New totalHT: ${totalHT}`);

      const updatedBL = {
        ...bl,
        frigoName: currentFrigoName,
        frigoId: matchedFrigo ? matchedFrigo.id : 'frigo-1',
        items: newItems,
        totalHT: totalHT,
        totalTTC: totalHT, // Don't add TVA price unless asked
      };

      setDoc(doc(db, 'deliveryNotes', bl.id), updatedBL).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${bl.id}`);
      });

      return updatedBL;
    }));
  };

  const recalculateAllBLPrices = async (): Promise<RecalculationSummaryReport> => {
    const reportDetails: RecalculationReportItem[] = [];
    let updatedBLsCount = 0;
    let unchangedBLsCount = 0;
    let failedBLsCount = 0;
    let totalItemsUpdated = 0;
    let totalFinancialImpactHT = 0;

    const newBLsList: DeliveryNoteBL[] = [];

    for (const bl of deliveryNotes) {
      try {
        let isModified = false;
        const itemDetails: RecalculationReportItem['updatedDetails'] = [];

        // Check frigoName sync
        const matchedFrigo = frigos.find(f => f.id === bl.frigoId) || frigos.find(f => f.id === 'frigo-1') || frigos[0];
        const correctFrigoName = matchedFrigo ? matchedFrigo.name : 'Frigo MFADEL';
        let currentFrigoName = bl.frigoName;

        if (bl.frigoName.includes('Port Casablanca') || bl.frigoName.includes('Frigo A') || bl.frigoName.includes('Frigo B') || bl.frigoName.includes('Frigo C') || bl.frigoName !== correctFrigoName) {
          currentFrigoName = correctFrigoName;
          isModified = true;
        }

        const newItems = bl.items.map(item => {
          const prd = findMatchingProduct(item, products);

          if (prd) {
            if (item.unitPriceHT !== prd.sellingPriceHT || item.productId !== prd.id || item.productCode !== prd.code) {
              isModified = true;
              itemDetails.push({
                productName: prd.name,
                productCode: prd.code,
                oldPrice: item.unitPriceHT,
                newPrice: prd.sellingPriceHT,
                quantityKg: item.quantityKg,
              });
              return {
                ...item,
                productId: prd.id,
                productCode: prd.code,
                unitPriceHT: prd.sellingPriceHT,
                totalHT: item.quantityKg * prd.sellingPriceHT,
              };
            }
          }
          return item;
        });

        const newTotalHT = newItems.reduce((sum, it) => sum + it.totalHT, 0);

        if (!isModified && bl.totalHT === newTotalHT && bl.totalTTC === newTotalHT && bl.frigoName === currentFrigoName) {
          unchangedBLsCount++;
          reportDetails.push({
            blId: bl.id,
            blNumber: bl.blNumber,
            clientName: bl.clientName,
            date: bl.date,
            status: 'NO_CHANGE',
            oldTotalHT: bl.totalHT,
            newTotalHT: bl.totalHT,
            itemsUpdatedCount: 0,
            updatedDetails: [],
          });
          newBLsList.push(bl);
          continue;
        }

        const updatedBL: DeliveryNoteBL = {
          ...bl,
          frigoName: currentFrigoName,
          frigoId: matchedFrigo ? matchedFrigo.id : 'frigo-1',
          items: newItems,
          totalHT: newTotalHT,
          totalTTC: newTotalHT,
        };

        // Write to Firestore
        await setDoc(doc(db, 'deliveryNotes', bl.id), updatedBL);

        const diffHT = newTotalHT - bl.totalHT;
        totalFinancialImpactHT += diffHT;
        updatedBLsCount++;
        totalItemsUpdated += itemDetails.length;

        reportDetails.push({
          blId: bl.id,
          blNumber: bl.blNumber,
          clientName: bl.clientName,
          date: bl.date,
          status: 'UPDATED',
          oldTotalHT: bl.totalHT,
          newTotalHT: newTotalHT,
          itemsUpdatedCount: itemDetails.length,
          updatedDetails: itemDetails,
        });

        newBLsList.push(updatedBL);
      } catch (err: any) {
        failedBLsCount++;
        reportDetails.push({
          blId: bl.id,
          blNumber: bl.blNumber,
          clientName: bl.clientName,
          date: bl.date,
          status: 'FAILED',
          errorMessage: err?.message || 'Erreur lors de la mise à jour dans la base de données',
          oldTotalHT: bl.totalHT,
          newTotalHT: bl.totalHT,
          itemsUpdatedCount: 0,
          updatedDetails: [],
        });
        newBLsList.push(bl);
      }
    }

    setDeliveryNotes(newBLsList);

    return {
      totalBLsScanned: deliveryNotes.length,
      updatedBLsCount,
      unchangedBLsCount,
      failedBLsCount,
      totalItemsUpdated,
      totalFinancialImpactHT,
      timestamp: new Date().toLocaleString('fr-FR'),
      details: reportDetails,
    };
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setStocks(prev => prev.filter(s => s.productId !== id));
    deleteDoc(doc(db, 'products', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    });
  };

  const addFrigo = (frigoData: Omit<ColdStorageFrigo, 'id' | 'code'>): ColdStorageFrigo => {
    const count = frigos.length + 1;
    const code = `FRG-SITE-${String(count).padStart(2, '0')}`;
    const newFrigo: ColdStorageFrigo = {
      ...frigoData,
      id: `frigo-${Date.now()}`,
      code,
    };
    setFrigos(prev => [...prev, newFrigo]);

    setDoc(doc(db, 'frigos', newFrigo.id), newFrigo).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `frigos/${newFrigo.id}`);
    });

    // Initialize 0 stock for all existing products in this new frigo
    const newStockLevels: FrigoStockLevel[] = products.map(p => ({
      productId: p.id,
      frigoId: newFrigo.id,
      quantityKg: 0,
      quantityPallets: 0,
      lastUpdated: new Date().toLocaleString('fr-FR'),
    }));
    setStocks(prev => [...prev, ...newStockLevels]);

    return newFrigo;
  };

  const updateFrigo = (id: string, frigoData: Partial<ColdStorageFrigo>) => {
    setFrigos(prev => prev.map(f => {
      if (f.id !== id) return f;
      const updated = { ...f, ...frigoData };
      setDoc(doc(db, 'frigos', id), updated).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `frigos/${id}`);
      });
      return updated;
    }));

    if (frigoData.name) {
      const newName = frigoData.name;
      setDeliveryNotes(prevBLs => prevBLs.map(bl => {
        if (bl.frigoId === id) {
          const updated = { ...bl, frigoName: newName };
          setDoc(doc(db, 'deliveryNotes', bl.id), updated).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${bl.id}`);
          });
          return updated;
        }
        return bl;
      }));
    }
  };

  const deleteFrigo = (id: string) => {
    setFrigos(prev => prev.filter(f => f.id !== id));
    setStocks(prev => prev.filter(s => s.frigoId !== id));
    deleteDoc(doc(db, 'frigos', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `frigos/${id}`);
    });
  };

  // Stock Actions
  const logStockMovement = (
    productId: string,
    frigoId: string,
    type: StockMovementType,
    quantityKg: number,
    previousStockKg: number,
    newStockKg: number,
    referenceDoc?: string,
    notes?: string
  ) => {
    const prd = products.find(p => p.id === productId);
    const frg = frigos.find(f => f.id === frigoId);
    const movement: ProductStockMovement = {
      id: `mvt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      productName: prd?.name || 'Produit Inconnu',
      productCode: prd?.code || 'PRD-UNK',
      frigoId,
      frigoName: frg?.name || 'Entrepôt Inconnu',
      type,
      quantityKg,
      previousStockKg,
      newStockKg,
      referenceDoc,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      performedBy: currentUser?.name || 'Système',
      notes
    };
    setStockMovements(prev => [movement, ...prev]);
  };

  const adjustStock = (frigoId: string, productId: string, newKg: number, newPallets: number, referenceDoc?: string, type: StockMovementType = 'AJUSTEMENT_MANUEL') => {
    setStocks(prev => {
      const existing = prev.find(s => s.frigoId === frigoId && s.productId === productId);
      const prevKg = existing ? existing.quantityKg : 0;
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

      logStockMovement(productId, frigoId, type, Math.abs(newKg - prevKg), prevKg, newKg, referenceDoc);

      const updatedStockItem: FrigoStockLevel = {
        frigoId,
        productId,
        quantityKg: newKg,
        quantityPallets: newPallets,
        lastUpdated: timestamp,
      };

      setDoc(doc(db, 'stocks', `${frigoId}_${productId}`), sanitizeForFirestore(updatedStockItem), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `stocks/${frigoId}_${productId}`);
      });

      if (existing) {
        return prev.map(s => (s.frigoId === frigoId && s.productId === productId) ? updatedStockItem : s);
      } else {
        return [...prev, updatedStockItem];
      }
    });
  };

  const transferStock = (sourceFrigoId: string, targetFrigoId: string, productId: string, kg: number, pallets: number) => {
    const sourceStock = stocks.find(s => s.frigoId === sourceFrigoId && s.productId === productId);
    const targetStock = stocks.find(s => s.frigoId === targetFrigoId && s.productId === productId);

    const sourcePrevKg = sourceStock?.quantityKg || 0;
    const targetPrevKg = targetStock?.quantityKg || 0;

    logStockMovement(productId, sourceFrigoId, 'TRANSFERT_INTER_FRIGO', kg, sourcePrevKg, Math.max(0, sourcePrevKg - kg), `Vers ${targetFrigoId}`);
    logStockMovement(productId, targetFrigoId, 'TRANSFERT_INTER_FRIGO', kg, targetPrevKg, targetPrevKg + kg, `Depuis ${sourceFrigoId}`);

    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    setStocks(prev => {
      return prev.map(s => {
        if (s.frigoId === sourceFrigoId && s.productId === productId) {
          const updated = {
            ...s,
            quantityKg: Math.max(0, s.quantityKg - kg),
            quantityPallets: Math.max(0, s.quantityPallets - pallets),
            lastUpdated: timestamp,
          };
          setDoc(doc(db, 'stocks', `${sourceFrigoId}_${productId}`), sanitizeForFirestore(updated), { merge: true }).catch(() => {});
          return updated;
        }
        if (s.frigoId === targetFrigoId && s.productId === productId) {
          const updated = {
            ...s,
            quantityKg: s.quantityKg + kg,
            quantityPallets: s.quantityPallets + pallets,
            lastUpdated: timestamp,
          };
          setDoc(doc(db, 'stocks', `${targetFrigoId}_${productId}`), sanitizeForFirestore(updated), { merge: true }).catch(() => {});
          return updated;
        }
        return s;
      });
    });
  };

  // Purchase / Import
  const createPurchaseInvoice = (purchaseData: Omit<PurchaseImportInvoice, 'id'>): PurchaseImportInvoice => {
    const id = `pur-${Date.now()}`;
    const newPur: PurchaseImportInvoice = {
      paidAmount: 0,
      remainingBalance: purchaseData.totalLandedCostHT,
      payments: [],
      ...purchaseData,
      id,
    };
    setPurchaseInvoices(prev => [newPur, ...prev]);
    setDoc(doc(db, 'purchase_invoices', id), sanitizeForFirestore(newPur)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `purchase_invoices/${id}`);
    });

    // Update target frigo stock
    newPur.items.forEach(item => {
      setStocks(prevStocks => {
        const existing = prevStocks.find(s => s.frigoId === newPur.targetFrigoId && s.productId === item.productId);
        const currentKg = existing ? existing.quantityKg : 0;
        const currentPallets = existing ? existing.quantityPallets : 0;
        const newKg = currentKg + item.quantityKg;
        const newPallets = currentPallets + item.quantityPallets;
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

        logStockMovement(item.productId, newPur.targetFrigoId, 'ENTRÉE_ACHAT', item.quantityKg, currentKg, newKg, newPur.invoiceNumber);

        const updatedStockItem: FrigoStockLevel = {
          frigoId: newPur.targetFrigoId,
          productId: item.productId,
          quantityKg: newKg,
          quantityPallets: newPallets,
          lastUpdated: timestamp,
        };

        setDoc(doc(db, 'stocks', `${newPur.targetFrigoId}_${item.productId}`), sanitizeForFirestore(updatedStockItem), { merge: true }).catch(() => {});

        if (existing) {
          return prevStocks.map(s => (s.frigoId === newPur.targetFrigoId && s.productId === item.productId) ? updatedStockItem : s);
        } else {
          return [...prevStocks, updatedStockItem];
        }
      });

      // Update unit Cost HT on product if landed cost updated
      if (item.landedCostPerKgHT > 0) {
        updateProduct(item.productId, { unitCostHT: Math.round(item.landedCostPerKgHT) });
      }
    });

    // Update Supplier balance
    setSuppliers(prev => prev.map(sup => {
      if (sup.id === newPur.supplierId) {
        const updated = {
          ...sup,
          currentBalance: sup.currentBalance + newPur.totalLandedCostHT,
        };
        setDoc(doc(db, 'suppliers', sup.id), sanitizeForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return sup;
    }));

    return newPur;
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

      let paymentStatus: 'NON_PAYÉ' | 'PARTIEL' | 'PAYÉ' = 'NON_PAYÉ';
      if (newRemainingBalance <= 0) {
        paymentStatus = 'PAYÉ';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'PARTIEL';
      }

      const newPaymentItem = {
        id: `pay-pur-${Date.now()}`,
        date: payment.date || new Date().toISOString().slice(0, 10),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        reference: payment.reference || '',
        bankName: payment.bankName || '',
        notes: payment.notes || ''
      };

      const updatedPayments = [...(pur.payments || []), newPaymentItem];

      const updatedInvoice: PurchaseImportInvoice = {
        ...pur,
        paidAmount: newPaidAmount,
        remainingBalance: newRemainingBalance,
        paymentStatus,
        payments: updatedPayments
      };

      setDoc(doc(db, 'purchase_invoices', pur.id), sanitizeForFirestore(updatedInvoice), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `purchase_invoices/${pur.id}`);
      });

      // Update Supplier balance (decrease debt)
      if (pur.supplierId) {
        setSuppliers(prevSups => prevSups.map(sup => {
          if (sup.id === pur.supplierId) {
            const updatedSup = {
              ...sup,
              currentBalance: Math.max(0, sup.currentBalance - payment.amount)
            };
            setDoc(doc(db, 'suppliers', sup.id), sanitizeForFirestore(updatedSup), { merge: true }).catch(() => {});
            return updatedSup;
          }
          return sup;
        }));
      }

      // If Chèque or Effet, add to Treasury Cheques/Effets as FOURNISSEUR cheque
      if (payment.paymentMethod === 'CHEQUE' || payment.paymentMethod === 'EFFET') {
        addChequeEffet({
          number: payment.reference || `CHQ-FRS-${Date.now().toString().slice(-4)}`,
          type: payment.paymentMethod,
          issuer: 'FOURNISSEUR',
          clientOrSupplierName: pur.supplierName,
          amount: payment.amount,
          issueDate: payment.date || new Date().toISOString().slice(0, 10),
          dueDate: payment.date || new Date().toISOString().slice(0, 10),
          bankName: payment.bankName || 'BMCE',
          status: 'EN_PORTEFEUILLE',
          notes: `Règlement Facture Fournisseur N° ${pur.invoiceNumber}`
        });
      }

      return updatedInvoice;
    }));
  };

  const deletePurchaseInvoice = (id: string) => {
    const pur = purchaseInvoices.find(p => p.id === id);
    setPurchaseInvoices(prev => prev.filter(p => p.id !== id));
    deleteDoc(doc(db, 'purchase_invoices', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `purchase_invoices/${id}`);
    });

    if (pur && pur.supplierId) {
      setSuppliers(prev => prev.map(sup => {
        if (sup.id === pur.supplierId) {
          const remainingDebt = pur.remainingBalance !== undefined ? pur.remainingBalance : pur.totalLandedCostHT;
          const updated = {
            ...sup,
            currentBalance: Math.max(0, sup.currentBalance - remainingDebt)
          };
          setDoc(doc(db, 'suppliers', sup.id), sanitizeForFirestore(updated), { merge: true }).catch(() => {});
          return updated;
        }
        return sup;
      }));
    }
  };

  // Order & BL Creation
  const createOrder = (orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'status' | 'totalHT' | 'totalVAT' | 'totalTTC' | 'totalCostHT' | 'grossMarginHT' | 'marginPercentage'>): SalesOrder => {
    const count = orders.length + 1;
    const orderNumber = `CMD-2026-${String(count).padStart(4, '0')}`;

    let totalHT = 0;
    let totalVAT = 0;
    let totalCostHT = 0;

    orderData.items.forEach(item => {
      totalHT += item.totalHT;
      totalVAT += item.totalHT * item.vatRate;
      totalCostHT += item.quantityKg * item.unitCostHT;
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

    // Group items by Frigo to create split BLs!
    const itemsByFrigo: { [frigoId: string]: typeof newOrder.items } = {};
    newOrder.items.forEach(item => {
      if (!itemsByFrigo[item.frigoId]) {
        itemsByFrigo[item.frigoId] = [];
      }
      itemsByFrigo[item.frigoId].push(item);
    });

    // Generate BL for each frigo
    const generatedBLs: DeliveryNoteBL[] = [];
    let blCount = deliveryNotes.length + 1;

    Object.entries(itemsByFrigo).forEach(([frigoId, items]) => {
      const frigo = frigos.find(f => f.id === frigoId);
      const blNumber = `BL-2026-${String(blCount++).padStart(4, '0')}`;
      
      const blItems = items.map(it => {
        const prd = products.find(p => p.id === it.productId);
        const kgCarton = prd?.kgPerCarton || 10;
        return {
          productId: it.productId,
          productCode: it.productCode,
          productName: it.productName,
          quantityKg: it.quantityKg,
          quantityCartons: (it as any).quantityCartons || Math.round(it.quantityKg / kgCarton),
          quantityPallets: it.quantityPallets,
          unitPriceHT: it.unitPriceHT,
          totalHT: it.totalHT,
        };
      });

      const totalKg = blItems.reduce((acc, i) => acc + i.quantityKg, 0);
      const totalCartons = blItems.reduce((acc, i) => acc + i.quantityCartons, 0);
      const totalPallets = blItems.reduce((acc, i) => acc + i.quantityPallets, 0);
      const blTotalHT = blItems.reduce((acc, i) => acc + i.totalHT, 0);
      const blTotalTTC = blTotalHT; // Don't add TVA price unless asked

      const bl: DeliveryNoteBL = {
        id: `bl-${Date.now()}-${blCount}`,
        blNumber,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        clientId: newOrder.clientId,
        clientName: newOrder.clientName,
        clientAddress: newOrder.items[0] ? 'Casablanca, Maroc' : '',
        clientPhone: newOrder.clientPhone,
        clientEmail: newOrder.clientEmail,
        frigoId,
        frigoName: frigo ? frigo.name : 'Frigo Inconnu',
        date: new Date().toISOString().slice(0, 10),
        items: blItems,
        totalKg,
        totalCartons,
        totalPallets,
        totalHT: blTotalHT,
        totalTTC: blTotalTTC,
        frigoEmployeeApproved: false,
        whatsappSent: false,
        emailSent: false,
        status: 'EN_ATTENTE_FRIGO',
        logs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
            action: `Création du Bon de Livraison (BL) rattaché à la commande ${newOrder.orderNumber}`,
            author: currentUser.name,
          },
        ],
      };

      generatedBLs.push(bl);
      setDoc(doc(db, 'deliveryNotes', bl.id), sanitizeForFirestore(bl)).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `deliveryNotes/${bl.id}`);
      });
      // Stock will be decremented AFTER stock manager approval OR uploading Bon de Sortie photo
    });

    setOrders(prev => [newOrder, ...prev]);
    setDoc(doc(db, 'orders', newOrder.id), sanitizeForFirestore(newOrder)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `orders/${newOrder.id}`);
    });

    setDeliveryNotes(prev => [...generatedBLs, ...prev]);

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    setDoc(doc(db, 'orders', orderId), { status }, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    });
  };

  const deductBLStockHelper = (bl: DeliveryNoteBL) => {
    const targetFrigo = frigos.find(f => 
      f.id === bl.frigoId || 
      f.name.trim().toLowerCase() === (bl.frigoId || '').trim().toLowerCase() ||
      f.name.trim().toLowerCase() === (bl.frigoName || '').trim().toLowerCase()
    ) || frigos[0];

    const actualFrigoId = targetFrigo ? targetFrigo.id : (bl.frigoId || 'frigo-1');
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    setStocks(prevStocks => {
      let currentStocksList = [...prevStocks];

      (bl.items || []).forEach(it => {
        const targetPrd = products.find(p => 
          p.id === it.productId || 
          p.code.toLowerCase() === (it.productCode || '').toLowerCase() ||
          p.code.toLowerCase() === (it.productId || '').toLowerCase() ||
          p.name.toLowerCase() === (it.productName || '').toLowerCase()
        );

        const actualProductId = targetPrd ? targetPrd.id : it.productId;
        const idx = currentStocksList.findIndex(s => s.frigoId === actualFrigoId && s.productId === actualProductId);
        const existing = idx !== -1 ? currentStocksList[idx] : null;

        const currentKg = existing ? existing.quantityKg : 0;
        const currentPallets = existing ? existing.quantityPallets : 0;

        const newKg = Math.max(0, currentKg - (it.quantityKg || 0));
        const newPallets = Math.max(0, currentPallets - (it.quantityPallets || 0));

        logStockMovement(
          actualProductId,
          actualFrigoId,
          'EXPÉDITION_VENTE',
          it.quantityKg,
          currentKg,
          newKg,
          bl.blNumber
        );

        const updatedStockItem: FrigoStockLevel = {
          frigoId: actualFrigoId,
          productId: actualProductId,
          quantityKg: newKg,
          quantityPallets: newPallets,
          lastUpdated: timestamp,
        };

        if (idx !== -1) {
          currentStocksList[idx] = updatedStockItem;
        } else {
          currentStocksList.push(updatedStockItem);
        }

        setDoc(doc(db, 'stocks', `${actualFrigoId}_${actualProductId}`), sanitizeForFirestore(updatedStockItem), { merge: true }).catch(() => {});
      });

      return currentStocksList;
    });
  };

  const approveFrigoBL = (blId: string, employeeName: string) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setDeliveryNotes(prev => prev.map(bl => {
      if (bl.id !== blId) return bl;

      // Use stockDeductedV2 flag - old stockDecremented flag was set by buggy code that never actually deducted
      if (!(bl as any).stockDeductedV2) {
        deductBLStockHelper(bl);
      }

      const updated = {
        ...bl,
        stockDecremented: true,
        stockDeductedV2: true,
        frigoEmployeeApproved: true,
        frigoApprovedBy: employeeName,
        frigoApprovedAt: timestamp,
        status: 'APPROUVÉ_FRIGO' as const,
        logs: [
          ...bl.logs,
          {
            id: `log-${Date.now()}`,
            timestamp,
            action: `Chargement et palettes approuvés sur le quai du ${bl.frigoName} (Stock décrémenté)`,
            author: employeeName,
          },
        ],
      };
      setDoc(doc(db, 'deliveryNotes', blId), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${blId}`);
      });
      return updated;
    }));
  };


  const signBL = (blId: string, signatureUrl: string, clientName: string) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setDeliveryNotes(prev => prev.map(bl => {
      if (bl.id !== blId) return bl;
      const updated = {
        ...bl,
        clientSignatureUrl: signatureUrl,
        signedByName: clientName,
        signedAt: timestamp,
        status: 'LIVRÉ' as const,
        logs: [
          ...bl.logs,
          {
            id: `log-${Date.now()}`,
            timestamp,
            action: `Signature numérique du client enregistrée (${clientName})`,
            author: clientName,
          },
        ],
      };
      setDoc(doc(db, 'deliveryNotes', blId), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${blId}`);
      });
      return updated;
    }));
  };

  const sendWhatsAppBL = (blId: string) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setDeliveryNotes(prev => prev.map(bl => {
      if (bl.id !== blId) return bl;
      const updated = {
        ...bl,
        whatsappSent: true,
        whatsappSentAt: timestamp,
        logs: [
          ...bl.logs,
          {
            id: `log-${Date.now()}`,
            timestamp,
            action: `Synthèse BL & Ordre de sortie transmis au groupe WhatsApp du frigo`,
            author: currentUser.name,
          },
        ],
      };
      setDoc(doc(db, 'deliveryNotes', blId), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${blId}`);
      });
      return updated;
    }));
  };

  const sendEmailBL = (blId: string, recipient: string) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setDeliveryNotes(prev => prev.map(bl => {
      if (bl.id !== blId) return bl;
      const updated = {
        ...bl,
        emailSent: true,
        emailSentAt: timestamp,
        emailRecipient: recipient,
        logs: [
          ...bl.logs,
          {
            id: `log-${Date.now()}`,
            timestamp,
            action: `Bon de Livraison (PDF) envoyé par Email à ${recipient}`,
            author: currentUser.name,
          },
        ],
      };
      setDoc(doc(db, 'deliveryNotes', blId), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${blId}`);
      });
      return updated;
    }));
  };



  const addBL = (blData: DeliveryNoteBL) => {
    autoCreateMissingClient(blData.clientName, blData.clientPhone, blData.clientEmail, blData.clientAddress);

    // Immediately decrement stock at BL creation time (not at frigo approval) to avoid race conditions
    const blWithFlag = { ...blData, stockDeductedV2: true, stockDecremented: true };
    deductBLStockHelper(blData);

    setDeliveryNotes(prev => [blWithFlag, ...prev]);
    setDoc(doc(db, 'deliveryNotes', blData.id), sanitizeForFirestore(blWithFlag)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `deliveryNotes/${blData.id}`);
    });
  };

  const updateBL = (id: string, updatedData: Partial<DeliveryNoteBL>) => {
    setDeliveryNotes(prev => prev.map(b => {
      if (b.id !== id) return b;

      const merged = { ...b, ...updatedData };

      // stockDeductedV2 is now set at addBL creation time. Only deduct if somehow missed (legacy BLs).
      const alreadyDeducted = Boolean((b as any).stockDeductedV2);
      if (!alreadyDeducted && (updatedData.bonDeSortiePhotoUrl || updatedData.frigoEmployeeApproved)) {
        deductBLStockHelper(merged);
      }

      const updated = { 
        ...merged,
        stockDecremented: true,
        stockDeductedV2: true
      };

      setDoc(doc(db, 'deliveryNotes', id), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${id}`);
      });
      return updated;
    }));
  };


  const deleteBL = (id: string) => {
    try {
      const deleted = JSON.parse(localStorage.getItem('erp_deleted_bls') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('erp_deleted_bls', JSON.stringify(deleted));
      }
    } catch (e) {}

    setDeliveryNotes(prev => prev.filter(b => b.id !== id));
    deleteDoc(doc(db, 'deliveryNotes', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `deliveryNotes/${id}`);
    });
  };

  // Invoicing
  const createInvoiceFromBL = (blId: string): Invoice => {
    const bl = deliveryNotes.find(b => b.id === blId);
    if (!bl) throw new Error('BL non trouvé');

    const count = invoices.length + 1;
    const targetCompId = bl.companyId || activeCompanyId;
    const targetCompany = companies.find(c => c.id === targetCompId) || activeCompany;
    const prefix = targetCompany?.invoicePrefix || 'FAC';
    const invoiceNumber = `${prefix}-2026-${String(count).padStart(4, '0')}`;
    const date = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const client = clients.find(c => c.id === bl.clientId);
    const clientICE = client ? client.ice : '';
    const companyName = client ? client.companyName : '';

    // TVA Rule: Apply 20% TVA ONLY if ICE exists or companyName exists! Otherwise 0% TVA!
    const hasIceOrCompany = Boolean(
      (clientICE && clientICE !== '000000000000000' && clientICE.trim() !== '') || 
      (companyName && companyName.trim() !== '')
    );
    const activeVatRate = hasIceOrCompany ? 0.20 : 0.00;

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
      date,
      dueDate,
      items: invoiceItems,
      totalHT,
      totalVAT,
      totalTTC,
      amountPaid: 0,
      remainingAmount: totalTTC,
      status: 'EMISE',
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setDoc(doc(db, 'invoices', newInvoice.id), sanitizeForFirestore(newInvoice)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `invoices/${newInvoice.id}`);
    });

    // Safety net: if stock was never properly deducted (old buggy code set stockDecremented but never actually deducted), do it now
    if (!(bl as any).stockDeductedV2) {
      deductBLStockHelper(bl);
    }

    // Update BL status to FACTURÉ and save invoice pointers
    const updatedBLData = { 
      status: 'FACTURÉ' as const, 
      invoiceId: newInvoice.id, 
      invoiceNumber: newInvoice.invoiceNumber,
      stockDecremented: true,
      stockDeductedV2: true
    };
    setDeliveryNotes(prev => prev.map(b => b.id === blId ? { ...b, ...updatedBLData } : b));
    setDoc(doc(db, 'deliveryNotes', blId), updatedBLData, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `deliveryNotes/${blId}`);
    });

    // Update client balance
    const updatedClient = { currentBalance: (client?.currentBalance || 0) + totalTTC };
    setClients(prev => prev.map(c => c.id === bl.clientId ? { ...c, ...updatedClient } : c));
    if (client) {
      setDoc(doc(db, 'clients', client.id), updatedClient, { merge: true }).catch(() => {});
    }

    return newInvoice;
  };

  const updateInvoiceStatus = (invoiceId: string, status: Invoice['status'], amountPaid?: number) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;
      const newPaid = amountPaid !== undefined ? amountPaid : (status === 'PAYEE' ? inv.totalTTC : inv.amountPaid);
      const remaining = inv.totalTTC - newPaid;
      const updated = {
        ...inv,
        status,
        amountPaid: newPaid,
        remainingAmount: remaining,
      };
      setDoc(doc(db, 'invoices', invoiceId), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `invoices/${invoiceId}`);
      });
      return updated;
    }));
  };

  const deleteInvoice = (id: string) => {
    try {
      const deleted = JSON.parse(localStorage.getItem('erp_deleted_invoices') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('erp_deleted_invoices', JSON.stringify(deleted));
      }
    } catch (e) {}

    const targetInv = invoices.find(i => i.id === id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    deleteDoc(doc(db, 'invoices', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `invoices/${id}`);
    });

    if (targetInv) {
      // Unlink invoice from associated BL if blId exists
      if (targetInv.blId) {
        setDeliveryNotes(prev => prev.map(bl => {
          if (bl.id === targetInv.blId || bl.invoiceId === id) {
            const updated = {
              ...bl,
              status: 'APPROUVÉ_FRIGO' as const,
              invoiceId: '',
              invoiceNumber: '',
            };
            setDoc(doc(db, 'deliveryNotes', bl.id), sanitizeForFirestore(updated), { merge: true }).catch(() => {});
            return updated;
          }
          return bl;
        }));
      }

      // Re-adjust client balance
      if (targetInv.clientId) {
        const remainingBal = targetInv.remainingAmount !== undefined ? targetInv.remainingAmount : (targetInv.totalTTC - (targetInv.amountPaid || 0));
        if (remainingBal > 0) {
          setClients(prev => prev.map(c => {
            if (c.id === targetInv.clientId) {
              const newBal = Math.max(0, c.currentBalance - remainingBal);
              setDoc(doc(db, 'clients', c.id), { currentBalance: newBal }, { merge: true }).catch(() => {});
              return { ...c, currentBalance: newBal };
            }
            return c;
          }));
        }
      }
    }
  };

  const addChequeEffet = (chequeData: Omit<ChequeEffet, 'id'>) => {
    const newCheque: ChequeEffet = {
      ...chequeData,
      id: `chq-${Date.now()}`,
    };
    setChequesEffets(prev => [newCheque, ...prev]);
    setDoc(doc(db, 'chequesEffets', newCheque.id), sanitizeForFirestore(newCheque)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `chequesEffets/${newCheque.id}`);
    });
  };

  const deleteChequeEffet = (id: string) => {
    const cheque = chequesEffets.find(c => c.id === id);
    if (cheque && cheque.partyId) {
      if (cheque.direction === 'RECETTE_CLIENT') {
        setClients(prev => prev.map(c => c.id === cheque.partyId ? { ...c, currentBalance: Math.max(0, c.currentBalance + cheque.amount) } : c));
      }
    }
    setChequesEffets(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'chequesEffets', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `chequesEffets/${id}`);
    });
  };

  const updateChequeEffet = (id: string, chequeData: Partial<ChequeEffet>) => {
    const oldCheque = chequesEffets.find(c => c.id === id);
    setChequesEffets(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...chequeData };
      if (oldCheque && oldCheque.partyId && chequeData.amount !== undefined && oldCheque.direction === 'RECETTE_CLIENT') {
        const diff = chequeData.amount - oldCheque.amount;
        setClients(clientsPrev => clientsPrev.map(cl => cl.id === oldCheque.partyId ? { ...cl, currentBalance: Math.max(0, cl.currentBalance - diff) } : cl));
      }
      setDoc(doc(db, 'chequesEffets', id), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `chequesEffets/${id}`);
      });
      return updated;
    }));
  };

  const updateChequeStatus = (chequeId: string, status: ChequeEffetStatus) => {
    setChequesEffets(prev => prev.map(chq => {
      if (chq.id !== chequeId) return chq;
      const updated = { ...chq, status };
      if (status === 'DEPOSE') updated.depositDate = new Date().toISOString().slice(0, 10);
      if (status === 'ENCAISSE') updated.clearedDate = new Date().toISOString().slice(0, 10);
      setDoc(doc(db, 'chequesEffets', chequeId), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `chequesEffets/${chequeId}`);
      });
      return updated;
    }));
  };

  const resetAllData = async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('erp_system_wiped', 'true');
    localStorage.setItem('erp_is_wiped', 'true');

    // Reset React state immediately
    setProducts([]);
    setFrigos([]);
    setClients([]);
    setSuppliers([]);
    setOrders([]);
    setDeliveryNotes([]);
    setInvoices([]);
    setChequesEffets([]);
    setExpenses([]);
    setStocks([]);
    setInventoryCounts([]);
    setPurchaseInvoices([]);
    setStockMovements([]);

    try {
      const collectionsToDelete = [
        'deliveryNotes', 'orders', 'products', 'clients', 'frigos',
        'suppliers', 'invoices', 'expenses', 'chequesEffets', 
        'inventoryCounts', 'stocks', 'purchase_invoices', 'stock_movements', 'companies'
      ];
      for (const colName of collectionsToDelete) {
        const snapshot = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Firestore bulk delete skipped:', err);
    }

    if ('indexedDB' in window && window.indexedDB.databases) {
      try {
        const dbs = await window.indexedDB.databases();
        for (const dbInfo of dbs) {
          if (dbInfo.name) {
            window.indexedDB.deleteDatabase(dbInfo.name);
          }
        }
      } catch (e) {}
    }

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (e) {}
    }

    window.location.reload();
  };


  const addExpense = (expenseData: Omit<Expense, 'id' | 'expenseNumber'>) => {
    const count = expenses.length + 1;
    const expenseNumber = `DEP-2026-${String(count).padStart(3, '0')}`;
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseNumber,
    };
    setExpenses(prev => [newExp, ...prev]);
    setDoc(doc(db, 'expenses', newExp.id), sanitizeForFirestore(newExp)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${newExp.id}`);
    });
  };

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
    setDoc(doc(db, 'clients', newClient.id), sanitizeForFirestore(newClient)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `clients/${newClient.id}`);
    });
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...clientData };
      setDoc(doc(db, 'clients', id), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `clients/${id}`);
      });
      return updated;
    }));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'clients', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
    });
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
    setDoc(doc(db, 'suppliers', newSupplier.id), sanitizeForFirestore(newSupplier)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `suppliers/${newSupplier.id}`);
    });
  };

  const updateSupplier = (id: string, supplierData: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...supplierData };
      setDoc(doc(db, 'suppliers', id), sanitizeForFirestore(updated), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `suppliers/${id}`);
      });
      return updated;
    }));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    deleteDoc(doc(db, 'suppliers', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `suppliers/${id}`);
    });
  };



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

    if (applyStockAdjust) {
      countData.items.forEach(item => {
        adjustStock(countData.frigoId, item.productId, item.physicalKg, item.physicalPallets);
      });
    }
  };

  const cleanDisplayName = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/\b(mlhmd|ain\s*rabat|frigo|site|depot|wh)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const normalizeName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(mlhmd|ain\s*rabat|frigo|site|depot|wh|ste|societe|sarl|sarlau|sa|ets|ets.|s.a.r.l|s.a.r.l.)\b/gi, '')
      .replace(/\bqessb\b/g, 'qessab')
      .replace(/\brachide\b/g, 'rachid')
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  };

  const autoCreateMissingClient = (clientName: string, clientPhone?: string, clientEmail?: string, clientAddress?: string) => {
    if (!clientName || !clientName.trim()) return;
    const trimmed = clientName.trim();
    const normalizedNew = normalizeName(trimmed);
    if (!normalizedNew) return;

    setClients(prev => {
      const exists = prev.some(c => {
        const normName = normalizeName(c.name || '');
        const normCompany = normalizeName(c.companyName || '');
        return normName === normalizedNew || normCompany === normalizedNew;
      });
      if (exists) return prev;
      const count = prev.length + 1;
      const newClt: Client = {
        id: `clt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        code: `CLT-${String(count).padStart(3, '0')}`,
        name: trimmed,
        companyName: trimmed,
        ice: '',
        phone: clientPhone || '',
        email: clientEmail || '',
        address: clientAddress || 'Casablanca, Maroc',
        city: 'Casablanca',
        creditLimit: 300000,
        currentBalance: 0,
      };
      setDoc(doc(db, 'clients', newClt.id), newClt).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `clients/${newClt.id}`);
      });
      return [newClt, ...prev];
    });
  };

  const autoCreateMissingProduct = (productName: string, unitPriceHT?: number): Product | null => {
    if (!productName || !productName.trim()) return null;
    const rawUpper = productName.toUpperCase().trim();

    // Ignore header title noise or invalid product names
    if (rawUpper.includes('INCONNU') || rawUpper.includes('PAGE') || rawUpper.includes('TOTAL') || rawUpper.includes('UNNAMED')) {
      if (!rawUpper.includes('SIBORT') && !rawUpper.includes('5KG') && !rawUpper.includes('5 KG') && !rawUpper.includes('11KG') && !rawUpper.includes('11 KG')) {
        return null;
      }
    }

    const is11kg = rawUpper.includes('11') || rawUpper.includes('11KG') || rawUpper.includes('11 KG');
    const isSibort5kg = rawUpper.includes('SIBORT') || rawUpper.includes('5KG') || rawUpper.includes('5 KG') || rawUpper.includes('5G') || rawUpper.includes('BR') || !is11kg;

    const targetCanonicalName = is11kg ? 'Datte Algérienne 11 KG' : 'Datte Algérienne Sibort 5 KG';
    const targetCode = is11kg ? 'PRD-DATTE-11KG' : 'PRD-SIBORT-5KG';

    let createdPrd: Product | null = null;

    setProducts(prev => {
      // Filter out any invalid products like 'Produit Inconnu' or page banners
      const cleanPrev = prev.filter(p => p.name && !p.name.includes('Produit Inconnu') && !p.name.includes('PAGE 1'));

      const existing = cleanPrev.find(p => 
        p.code === targetCode || 
        normalizeName(p.name || '') === normalizeName(targetCanonicalName)
      );

      if (existing) {
        createdPrd = existing;
        return cleanPrev;
      }

      const kgPerCarton = is11kg ? 11 : 5;
      const cartonsPerPallet = 100;
      const kgPerPallet = kgPerCarton * cartonsPerPallet;

      const newPrd: Product = {
        id: is11kg ? 'prd-datte-11kg' : 'prd-sibort-5kg',
        code: targetCode,
        name: targetCanonicalName,
        category: 'Dattes Importées',
        origin: 'Algérie / Import',
        sellingPriceHT: unitPriceHT && unitPriceHT > 0 ? unitPriceHT : (is11kg ? 55 : 22),
        unitCostHT: is11kg ? 45 : 18,
        vatRate: 0.20,
        kgPerCarton,
        cartonsPerPallet,
        kgPerPallet,
        minStockAlertKg: 5000,
        description: `Produit principal dattes ${targetCanonicalName}`,
      };

      createdPrd = newPrd;
      setDoc(doc(db, 'products', newPrd.id), sanitizeForFirestore(newPrd), { merge: true }).catch(() => {});
      return [newPrd, ...cleanPrev];
    });

    return createdPrd;
  };

  const importExcelBLs = (newBLs: DeliveryNoteBL[]) => {
    // 1. Synchronous Client resolution and pool management
    const clientAdditionsMap = new Map<string, number>();
    const newClientsPool: Client[] = [];
    const clientMap = new Map<string, Client>();

    // Index existing clients
    clients.forEach(c => {
      clientMap.set(c.id, c);
      if (c.name) clientMap.set(normalizeName(c.name), c);
      if (c.companyName) clientMap.set(normalizeName(c.companyName), c);
    });

    const getOrCreateClient = (rawName: string, phone?: string, email?: string, address?: string): Client => {
      const cleanName = cleanDisplayName(rawName || 'Client Divers');
      const normName = normalizeName(cleanName);

      let found = clientMap.get(normName) || clientMap.get(cleanName);

      if (!found && normName) {
        found = newClientsPool.find(c => 
          normalizeName(c.name || '') === normName ||
          normalizeName(c.companyName || '') === normName
        );
      }

      if (!found && cleanName) {
        const count = clients.length + newClientsPool.length + 1;
        found = {
          id: `clt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          code: `CLT-${String(count).padStart(3, '0')}`,
          name: cleanName,
          companyName: cleanName,
          ice: '',
          phone: phone || '',
          email: email || '',
          address: address || 'Casablanca, Maroc',
          city: 'Casablanca',
          creditLimit: 300000,
          currentBalance: 0,
        };
        newClientsPool.push(found);
        clientMap.set(found.id, found);
        clientMap.set(normName, found);
      }

      return found || {
        id: `clt-${Date.now()}`,
        code: 'CLT-000',
        name: cleanName || 'Client',
        companyName: cleanName || 'Client',
        ice: '',
        phone: '',
        email: '',
        address: 'Casablanca',
        city: 'Casablanca',
        creditLimit: 300000,
        currentBalance: 0,
      };
    };

    // Process all incoming BLs
    const processedBLs: DeliveryNoteBL[] = newBLs.map(bl => {
      const clientObj = getOrCreateClient(bl.clientName, bl.clientPhone, bl.clientEmail, bl.clientAddress);
      const blAmount = bl.totalHT || bl.totalTTC || 0;

      clientAdditionsMap.set(
        clientObj.id,
        (clientAdditionsMap.get(clientObj.id) || 0) + blAmount
      );

      // Process product lines & Frigo stock updates (SORTIES BLs decrementing stock)
      bl.items.forEach(item => {
        const prdName = item.productName || item.productCode || '';
        const is11kg = prdName.toUpperCase().includes('11');
        const productIdToUse = is11kg ? 'prd-datte-11kg' : 'prd-sibort-5kg';
        const targetFrigoId = bl.frigoId || (frigos[0] ? frigos[0].id : 'frigo-1');

        if (targetFrigoId) {
          const qtyKg = item.quantityKg || 0;
          const palletRatio = is11kg ? 1100 : 500;
          const qtyPallets = item.quantityPallets > 0 ? item.quantityPallets : Math.ceil(qtyKg / palletRatio);

          setStocks(prevStocks => {
            const existingStock = prevStocks.find(s => s.frigoId === targetFrigoId && s.productId === productIdToUse);
            const defaultInitialKg = is11kg ? (9135 * 11) : (22924 * 5);
            const currentKg = existingStock ? existingStock.quantityKg : defaultInitialKg;
            const currentPallets = existingStock ? existingStock.quantityPallets : Math.ceil(currentKg / palletRatio);

            const newKg = Math.max(0, currentKg - qtyKg);
            const newPallets = Math.max(0, currentPallets - qtyPallets);

            const updatedStock: FrigoStockLevel = {
              frigoId: targetFrigoId,
              productId: productIdToUse,
              quantityKg: newKg,
              quantityPallets: newPallets,
              lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
            };

            logStockMovement(
              productIdToUse,
              targetFrigoId,
              'EXPÉDITION_VENTE',
              qtyKg,
              currentKg,
              newKg,
              bl.blNumber
            );

            setDoc(doc(db, 'stocks', `${targetFrigoId}_${productIdToUse}`), sanitizeForFirestore(updatedStock), { merge: true }).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `stocks/${targetFrigoId}_${productIdToUse}`);
            });

            // Preserve ALL stock records (not just the 2 hardcoded products)
            const hasExisting = prevStocks.some(s => s.frigoId === targetFrigoId && s.productId === productIdToUse);

            if (hasExisting) {
              return prevStocks.map(s => s.frigoId === targetFrigoId && s.productId === productIdToUse ? updatedStock : s);
            } else {
              return [...prevStocks, updatedStock];
            }
          });
        }
      });

      return {
        ...bl,
        clientId: clientObj.id,
        clientName: clientObj.companyName || clientObj.name,
        invoiceId: undefined, // Explicitly NO invoice created
        invoiceNumber: undefined,
        status: bl.status || 'LIVRÉ'
      };
    });

    // 2. Commit all Clients with updated balances
    setClients(prevClients => {
      const clientDict = new Map<string, Client>();
      prevClients.forEach(c => clientDict.set(c.id, { ...c }));
      newClientsPool.forEach(c => clientDict.set(c.id, { ...c }));

      clientAdditionsMap.forEach((amount, clientId) => {
        const clt = clientDict.get(clientId);
        if (clt) {
          clt.currentBalance = (clt.currentBalance || 0) + amount;
          setDoc(doc(db, 'clients', clt.id), sanitizeForFirestore(clt), { merge: true }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `clients/${clt.id}`);
          });
        }
      });

      return Array.from(clientDict.values());
    });

    // 3. Save Delivery Notes (BLs)
    setDeliveryNotes(prev => {
      const existingNumbers = new Set(prev.map(b => b.blNumber));
      const filteredNew = processedBLs.filter(b => !existingNumbers.has(b.blNumber));
      const updated = [...filteredNew, ...prev];
      
      filteredNew.forEach(bl => {
        setDoc(doc(db, 'deliveryNotes', bl.id), sanitizeForFirestore(bl)).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `deliveryNotes/${bl.id}`);
        });
      });

      return updated;
    });
  };

  const deduplicateClients = (): number => {
    const groups = new Map<string, Client[]>();
    
    clients.forEach(c => {
      const key = normalizeName(c.name || c.companyName || '');
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    const uniqueClients: Client[] = [];
    const idMapping = new Map<string, string>();
    let removedCount = 0;

    groups.forEach((groupClients) => {
      if (groupClients.length === 1) {
        uniqueClients.push(groupClients[0]);
      } else {
        const primary = groupClients.reduce((best, cur) => {
          if (!best) return cur;
          if (cur.ice && !best.ice) return cur;
          if (cur.email && !best.email) return cur;
          return best;
        }, groupClients[0]);

        uniqueClients.push(primary);

        groupClients.forEach(dupe => {
          if (dupe.id !== primary.id) {
            idMapping.set(dupe.id, primary.id);
            removedCount++;
            deleteDoc(doc(db, 'clients', dupe.id)).catch(err => {
              handleFirestoreError(err, OperationType.DELETE, `clients/${dupe.id}`);
            });
          }
        });
      }
    });

    if (removedCount > 0) {
      setClients(uniqueClients);

      if (idMapping.size > 0) {
        setDeliveryNotes(prevBLs => prevBLs.map(bl => {
          if (idMapping.has(bl.clientId)) {
            const primaryId = idMapping.get(bl.clientId)!;
            const primary = uniqueClients.find(c => c.id === primaryId);
            return {
              ...bl,
              clientId: primaryId,
              clientName: primary ? (primary.companyName || primary.name) : bl.clientName
            };
          }
          return bl;
        }));

        setOrders(prevOrders => prevOrders.map(ord => {
          if (idMapping.has(ord.clientId)) {
            const primaryId = idMapping.get(ord.clientId)!;
            const primary = uniqueClients.find(c => c.id === primaryId);
            return {
              ...ord,
              clientId: primaryId,
              clientName: primary ? (primary.companyName || primary.name) : ord.clientName
            };
          }
          return ord;
        }));

        setInvoices(prevInvoices => prevInvoices.map(inv => {
          if (idMapping.has(inv.clientId)) {
            const primaryId = idMapping.get(inv.clientId)!;
            const primary = uniqueClients.find(c => c.id === primaryId);
            return {
              ...inv,
              clientId: primaryId,
              clientName: primary ? (primary.companyName || primary.name) : inv.clientName
            };
          }
          return inv;
        }));
      }
    }

    return removedCount;
  };

  const mergeClients = (targetClientId: string, clientIdsToMerge: string[]) => {
    const targetClient = clients.find(c => c.id === targetClientId);
    if (!targetClient) return;

    const secondaryIds = clientIdsToMerge.filter(id => id !== targetClientId);
    const secondaryClients = clients.filter(c => secondaryIds.includes(c.id));
    const secondaryNamesNorm = secondaryClients.map(c => normalizeName(c.name));

    setDeliveryNotes(prev => prev.map(bl => {
      const blClientNorm = normalizeName(bl.clientName);
      if (secondaryIds.includes(bl.clientId) || secondaryNamesNorm.includes(blClientNorm)) {
        return {
          ...bl,
          clientId: targetClient.id,
          clientName: targetClient.name
        };
      }
      return bl;
    }));

    setOrders(prev => prev.map(o => {
      const oClientNorm = normalizeName(o.clientName);
      if (secondaryIds.includes(o.clientId) || secondaryNamesNorm.includes(oClientNorm)) {
        return {
          ...o,
          clientId: targetClient.id,
          clientName: targetClient.name
        };
      }
      return o;
    }));

    setInvoices(prev => prev.map(inv => {
      const invClientNorm = normalizeName(inv.clientName);
      if (secondaryIds.includes(inv.clientId) || secondaryNamesNorm.includes(invClientNorm)) {
        return {
          ...inv,
          clientId: targetClient.id,
          clientName: targetClient.name
        };
      }
      return inv;
    }));

    setChequesEffets(prev => prev.map(chq => {
      const chqPartyNorm = normalizeName(chq.partyName || chq.clientName || '');
      if (secondaryIds.includes(chq.clientId || '') || secondaryNamesNorm.includes(chqPartyNorm)) {
        return {
          ...chq,
          clientId: targetClient.id,
          clientName: targetClient.name,
          partyName: targetClient.name
        };
      }
      return chq;
    }));

    setClients(prev => prev.filter(c => !secondaryIds.includes(c.id)));
    secondaryIds.forEach(id => {
      deleteDoc(doc(db, 'clients', id)).catch(err => console.error(err));
    });
  };

  const mergeProducts = (targetProductId: string, productIdsToMerge: string[]) => {
    const targetPrd = products.find(p => p.id === targetProductId);
    if (!targetPrd) return;

    const secondaryIds = productIdsToMerge.filter(id => id !== targetProductId);
    const secondaryPrds = products.filter(p => secondaryIds.includes(p.id));
    const secondaryCodes = secondaryPrds.map(p => p.code);
    const secondaryNamesNorm = secondaryPrds.map(p => normalizeName(p.name));

    setStocks(prev => {
      const updated = [...prev];
      frigos.forEach(frigo => {
        const targetStockIdx = updated.findIndex(s => s.frigoId === frigo.id && s.productId === targetProductId);
        let extraKg = 0;

        secondaryIds.forEach(sId => {
          const secStock = updated.find(s => s.frigoId === frigo.id && s.productId === sId);
          if (secStock) {
            extraKg += secStock.quantityKg || 0;
          }
        });

        if (targetStockIdx >= 0) {
          updated[targetStockIdx] = {
            ...updated[targetStockIdx],
            quantityKg: (updated[targetStockIdx].quantityKg || 0) + extraKg,
            lastUpdated: new Date().toLocaleString('fr-FR')
          };
        }
      });
      return updated.filter(s => !secondaryIds.includes(s.productId));
    });

    setDeliveryNotes(prev => prev.map(bl => {
      let modified = false;
      const updatedItems = bl.items.map(item => {
        const itemNormName = normalizeName(item.productName);
        if (secondaryIds.includes(item.productId) || secondaryCodes.includes(item.productCode) || secondaryNamesNorm.includes(itemNormName)) {
          modified = true;
          return {
            ...item,
            productId: targetPrd.id,
            productCode: targetPrd.code,
            productName: targetPrd.name
          };
        }
        return item;
      });

      if (modified) {
        return {
          ...bl,
          items: updatedItems
        };
      }
      return bl;
    }));

    setOrders(prev => prev.map(o => {
      let modified = false;
      const updatedItems = (o.items || []).map(item => {
        const itemNormName = normalizeName(item.productName || '');
        if (secondaryIds.includes(item.productId) || secondaryCodes.includes(item.productCode || '') || secondaryNamesNorm.includes(itemNormName)) {
          modified = true;
          return {
            ...item,
            productId: targetPrd.id,
            productCode: targetPrd.code || targetPrd.name,
            productName: targetPrd.name
          };
        }
        return item;
      });

      if (modified) {
        return {
          ...o,
          items: updatedItems
        };
      }
      return o;
    }));

    setProducts(prev => prev.filter(p => !secondaryIds.includes(p.id)));
    secondaryIds.forEach(id => {
      deleteDoc(doc(db, 'products', id)).catch(err => console.error(err));
    });
  };

  // Purge orphan stocks: delete all stock records whose productId doesn't match any real product
  const purgeOrphanStocks = (): number => {
    const validProductIds = new Set(products.map(p => p.id));
    const orphanStocks = stocks.filter(s => !validProductIds.has(s.productId));
    
    if (orphanStocks.length === 0) return 0;

    // Remove from local state
    setStocks(prev => prev.filter(s => validProductIds.has(s.productId)));

    // Remove from Firestore
    orphanStocks.forEach(s => {
      const docKey = `${s.frigoId}_${s.productId}`;
      deleteDoc(doc(db, 'stocks', docKey)).catch(() => {});
    });

    console.log(`Purged ${orphanStocks.length} orphan stock records:`, orphanStocks.map(s => s.productId));
    return orphanStocks.length;
  };

  const contextValue = React.useMemo(() => ({
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
    createPurchaseInvoice,
    addPurchasePayment,
    deletePurchaseInvoice,
    createOrder,
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
    deduplicateClients,
    mergeClients,
    mergeProducts,
    purgeOrphanStocks,
  }), [
    currentUser,
    users,
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
    companyInfo
  ]);

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
  products: [],
  frigos: INITIAL_FRIGOS,
  stocks: [],
  stockMovements: [],
  clients: [],
  suppliers: INITIAL_SUPPLIERS,
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
  recalculateAllBLPrices: async () => ({ reportDetails: [], totalBLsProcessed: 0, totalItemsUpdated: 0, totalBLsModified: 0, totalBLsUnchanged: 0, generatedAt: '' }),
  addFrigo: () => ({ id: '', code: '', name: '', location: '', capacityPallets: 1000 }),
  updateFrigo: () => {},
  deleteFrigo: () => {},
  adjustStock: () => {},
  createPurchaseInvoice: () => ({ id: '', invoiceNumber: '', supplierId: '', supplierName: '', targetFrigoId: '', dateArrival: '', isImport: false, customsCostsHT: 0, freightCostsHT: 0, totalProductsHT: 0, totalLandedCostHT: 0, items: [], paymentStatus: 'NON_PAYÉ' }),
  addPurchasePayment: () => {},
  deletePurchaseInvoice: () => {},
  createOrder: () => ({ id: '', orderNumber: '', clientId: '', clientName: '', date: '', expectedDeliveryDate: '', items: [], totalKg: 0, totalPallets: 0, totalHT: 0, totalVAT: 0, totalTTC: 0, totalCostHT: 0, grossMarginHT: 0, marginPercentage: 0, blGenerated: false, createdByName: '', status: 'NOUVEAU' }),
  updateOrderStatus: () => {},
  addBL: () => {},
  updateBL: () => {},
  deleteBL: () => {},
  approveFrigoBL: () => {},
  signBL: () => {},
  sendWhatsAppBL: () => {},
  sendEmailBL: () => {},
  createInvoiceFromBL: () => ({ id: '', invoiceNumber: '', blIds: [], clientId: '', clientName: '', date: '', dueDate: '', items: [], totalHT: 0, vatAmount: 0, totalTTC: 0, paidAmount: 0, remainingBalance: 0, status: 'BROUILLON' }),
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
  deduplicateClients: () => 0,
  mergeClients: () => {},
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
