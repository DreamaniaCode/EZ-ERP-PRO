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
  INITIAL_COMPANY_INFO
} from '../data/mockData';

import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';

export const DEFAULT_COMPANIES: CompanyEntity[] = [
  {
    id: 'STE_1',
    code: 'STE1',
    name: 'EZ Dattes Négoce SARL',
    shortName: 'Sté Principale (Dattes)',
    ice: '001234567000089',
    taxId: '54321098',
    rc: '123456',
    patent: '34567890',
    capital: '1 000 000 DH',
    address: 'Avenue Hassan II, Quartier Industriel',
    city: 'Casablanca',
    phone: '+212 5 22 33 44 55',
    email: 'contact@ezdattes.ma',
    bankName: 'Attijariwafa Bank',
    bankRib: '007 780 0001234567890123 45',
    blPrefix: 'BL-STE1',
    invoicePrefix: 'FAC-STE1'
  },
  {
    id: 'STE_2',
    code: 'STE2',
    name: 'EZ Frigo Logistique SARL',
    shortName: 'Sté Sœur (Logistique)',
    ice: '009876543000012',
    taxId: '87654321',
    rc: '654321',
    patent: '98765432',
    capital: '500 000 DH',
    address: 'Zone Frigorifique Portuaire',
    city: 'Casablanca',
    phone: '+212 5 22 88 99 00',
    email: 'logistique@ezfrigo.ma',
    bankName: 'BMCE Bank of Africa',
    bankRib: '011 780 0009876543210987 65',
    blPrefix: 'BL-STE2',
    invoicePrefix: 'FAC-STE2'
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


  const isWiped = typeof window !== 'undefined' && localStorage.getItem('erp_system_wiped') === 'true';


  const [products, setProducts] = useState<Product[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_products');
    if (saved) return JSON.parse(saved);
    return INITIAL_PRODUCTS;
  });

  const [frigos, setFrigos] = useState<ColdStorageFrigo[]>(() => {
    if (isWiped) return INITIAL_FRIGOS;
    const saved = localStorage.getItem('erp_frigos');
    if (saved) return JSON.parse(saved);
    return INITIAL_FRIGOS;
  });

  const [stocks, setStocks] = useState<FrigoStockLevel[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_stocks');
    if (saved) return JSON.parse(saved);
    return INITIAL_STOCKS;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_clients');
    if (saved) return JSON.parse(saved);
    return INITIAL_CLIENTS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_suppliers');
    if (saved) return JSON.parse(saved);
    return INITIAL_SUPPLIERS;
  });

  const [orders, setOrders] = useState<SalesOrder[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_orders');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteBL[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_deliveryNotes') || localStorage.getItem('erp_delivery_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Failed to parse deliveryNotes from localStorage:', e);
      }
    }
    return INITIAL_DELIVERY_NOTES;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_invoices');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [chequesEffets, setChequesEffets] = useState<ChequeEffet[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_cheques') || localStorage.getItem('erp_cheques_effets');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(() => {
    if (isWiped) return INITIAL_TREASURY_ACCOUNTS;
    const saved = localStorage.getItem('erp_treasury');
    if (saved) return JSON.parse(saved);
    return INITIAL_TREASURY_ACCOUNTS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_expenses');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [inventoryCounts, setInventoryCounts] = useState<MultiSiteInventoryCount[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_inventories');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseImportInvoice[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_purchase_invoices');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [stockMovements, setStockMovements] = useState<ProductStockMovement[]>(() => {
    if (isWiped) return [];
    const saved = localStorage.getItem('erp_stock_movements');
    if (saved) return JSON.parse(saved);
    return [];
  });


  useEffect(() => {
    localStorage.setItem('erp_stock_movements', JSON.stringify(stockMovements));
  }, [stockMovements]);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    const saved = localStorage.getItem('erp_company_info');
    if (saved) return JSON.parse(saved);
    return INITIAL_COMPANY_INFO;
  });

  const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
    const clean: any = {};
    Object.keys(obj).forEach(key => {
      clean[key] = obj[key] === undefined ? '' : obj[key];
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

  // Auto-seed historical BLs if state contains fewer items than initial dataset
  useEffect(() => {
    if (deliveryNotes.length < INITIAL_DELIVERY_NOTES.length && !isWiped) {
      setDeliveryNotes(prev => {
        const map = new Map<string, DeliveryNoteBL>();
        INITIAL_DELIVERY_NOTES.forEach(d => map.set(d.id, d));
        (prev || []).forEach(d => map.set(d.id, d));
        const merged = Array.from(map.values());

        merged.forEach(bl => {
          setDoc(doc(db, 'deliveryNotes', bl.id), sanitizeForFirestore(bl), { merge: true }).catch(() => {});
        });

        return merged;
      });
    }
  }, [deliveryNotes.length, isWiped]);

  // Firestore Real-Time Syncing (Bidirectional Live Sync Desktop <-> Mobile PWA)
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: data.uid || docSnap.id,
          name: data.displayName || data.name || data.email,
          email: data.email,
          role: data.role,
          assignedFrigoId: data.assignedFrigoId,
          avatar: data.avatar
        } as UserProfile;
      });
      if (docs.length > 0) setUsers(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as Client);
      if (docs.length > 0) setClients(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'clients'));

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as Product);
      if (docs.length > 0) setProducts(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as Supplier);
      if (docs.length > 0) setSuppliers(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'suppliers'));

    const unsubFrigos = onSnapshot(collection(db, 'frigos'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as ColdStorageFrigo);
      if (docs.length > 0) setFrigos(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'frigos'));

    const unsubStocks = onSnapshot(collection(db, 'stocks'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as FrigoStockLevel);
      if (docs.length > 0) {
        setStocks(prev => {
          const map = new Map<string, FrigoStockLevel>();
          prev.forEach(s => map.set(`${s.frigoId}_${s.productId}`, s));
          docs.forEach(d => map.set(`${d.frigoId}_${d.productId}`, d));
          return Array.from(map.values());
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'stocks'));

    const unsubDeliveryNotes = onSnapshot(collection(db, 'deliveryNotes'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as DeliveryNoteBL);
      setDeliveryNotes(prev => {
        const map = new Map<string, DeliveryNoteBL>();
        // 1. Keep existing local items (from initial state or local saves)
        (prev || []).forEach(d => {
          if (d && d.id) map.set(d.id, d);
        });
        // 2. Merge / update with Firestore docs
        docs.forEach(d => {
          if (d && d.id) map.set(d.id, d);
        });
        const merged = Array.from(map.values());
        if (merged.length === 0 && !isWiped) {
          return INITIAL_DELIVERY_NOTES;
        }
        return merged;
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'deliveryNotes'));

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as Invoice);
      if (docs.length > 0) setInvoices(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'invoices'));

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as Expense);
      if (docs.length > 0) setExpenses(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'expenses'));

    const unsubCheques = onSnapshot(collection(db, 'chequesEffets'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as ChequeEffet);
      if (docs.length > 0) setChequesEffets(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'chequesEffets'));

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as SalesOrder);
      if (docs.length > 0) setOrders(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'orders'));

    const unsubPurchaseInvoices = onSnapshot(collection(db, 'purchase_invoices'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as PurchaseImportInvoice);
      if (docs.length > 0) setPurchaseInvoices(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'purchase_invoices'));

    const unsubStockMovements = onSnapshot(collection(db, 'stock_movements'), (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data() as ProductStockMovement);
      if (docs.length > 0) setStockMovements(docs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'stock_movements'));

    return () => {
      unsubUsers();
      unsubClients();
      unsubProducts();
      unsubSuppliers();
      unsubFrigos();
      unsubStocks();
      unsubDeliveryNotes();
      unsubInvoices();
      unsubExpenses();
      unsubCheques();
      unsubOrders();
      unsubPurchaseInvoices();
      unsubStockMovements();
    };
  }, []);



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

  const updateProduct = async (id: string, updatedFields: Partial<Product>) => {
    const targetProduct = products.find(p => p.id === id);
    if (!targetProduct) return;

    const updatedProduct = { ...targetProduct, ...updatedFields };
    if (updatedFields.kgPerCarton || updatedFields.cartonsPerPallet) {
      updatedProduct.kgPerPallet = updatedProduct.kgPerCarton * updatedProduct.cartonsPerPallet;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'products', id), updatedProduct);

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
    localStorage.setItem('erp_system_wiped', 'true');

    try {
      const collectionsToDelete = [
        'deliveryNotes', 'orders', 'products', 'clients', 
        'suppliers', 'invoices', 'expenses', 'chequesEffets', 
        'inventoryCounts', 'stocks', 'purchase_invoices', 'stock_movements'
      ];
      for (const colName of collectionsToDelete) {
        const snapshot = await getDocs(collection(db, colName));
        snapshot.forEach(docSnap => {
          deleteDoc(doc(db, colName, docSnap.id)).catch(() => {});
        });
      }
    } catch (err) {
      console.warn('Firestore bulk delete skipped:', err);
    }

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (e) {}
    }

    setProducts([]);
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
    const cleaned = cleanDisplayName(productName);
    const normalizedNew = normalizeName(cleaned);
    if (!normalizedNew) return null;

    let createdPrd: Product | null = null;

    setProducts(prev => {
      const existing = prev.find(p => {
        const normName = normalizeName(p.name || '');
        const normCode = normalizeName(p.code || '');
        return normName === normalizedNew || normCode === normalizedNew;
      });

      if (existing) {
        createdPrd = existing;
        return prev;
      }

      const count = prev.length + 1;
      const price = unitPriceHT && unitPriceHT > 0 ? unitPriceHT : 50;
      const cost = Math.round(price * 0.8);
      const is5kg = cleaned.includes('5KG') || cleaned.includes('5 KG');
      const is3kg = cleaned.includes('3KG') || cleaned.includes('3 KG');
      const is2kg = cleaned.includes('2KG') || cleaned.includes('2 KG');
      const is25kg = cleaned.includes('2,5KG') || cleaned.includes('2.5KG');
      const kgPerCarton = is5kg ? 5 : is3kg ? 3 : is2kg ? 2 : is25kg ? 2.5 : 10;
      const cartonsPerPallet = 100;
      const kgPerPallet = Math.round(kgPerCarton * cartonsPerPallet);

      const newPrd: Product = {
        id: `prd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        code: `PRD-IMP-${String(count).padStart(3, '0')}`,
        name: cleaned,
        category: cleaned.toLowerCase().includes('import') ? 'Dattes Importées' : 'Dattes Locales',
        origin: 'Maroc / Import',
        sellingPriceHT: price,
        unitCostHT: cost,
        vatRate: 0.20,
        kgPerCarton,
        cartonsPerPallet,
        kgPerPallet,
        minStockAlertKg: 5000,
        description: `Produit créé automatiquement lors de l'importation de BL`,
      };

      createdPrd = newPrd;

      setDoc(doc(db, 'products', newPrd.id), newPrd).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `products/${newPrd.id}`);
      });

      return [newPrd, ...prev];
    });

    return createdPrd;
  };

  const importExcelBLs = (newBLs: DeliveryNoteBL[]) => {
    newBLs.forEach(bl => {
      // 1. Auto-create missing Client
      autoCreateMissingClient(bl.clientName, bl.clientPhone, bl.clientEmail, bl.clientAddress);

      // 2. Auto-create missing Products & update stock levels per frigo
      bl.items.forEach(item => {
        const prdName = item.productName || item.productCode;
        if (prdName) {
          const prd = autoCreateMissingProduct(prdName, item.unitPriceHT);
          const productIdToUse = prd ? prd.id : item.productId;
          const targetFrigoId = bl.frigoId || 'frigo-1';

          if (productIdToUse && targetFrigoId) {
            const addedKg = item.quantityKg || 0;
            const palletRatio = prd ? prd.kgPerPallet : 500;
            const addedPallets = item.quantityPallets > 0 ? item.quantityPallets : Math.ceil(addedKg / palletRatio);

            setStocks(prevStocks => {
              const existingStock = prevStocks.find(s => s.frigoId === targetFrigoId && s.productId === productIdToUse);
              const currentKg = existingStock ? existingStock.quantityKg : 0;
              const currentPallets = existingStock ? existingStock.quantityPallets : 0;

              const updatedStock: FrigoStockLevel = {
                frigoId: targetFrigoId,
                productId: productIdToUse,
                quantityKg: currentKg + addedKg,
                quantityPallets: currentPallets + addedPallets,
                lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
              };

              setDoc(doc(db, 'stocks', `${targetFrigoId}_${productIdToUse}`), updatedStock).catch(err => {
                handleFirestoreError(err, OperationType.WRITE, `stocks/${targetFrigoId}_${productIdToUse}`);
              });

              if (existingStock) {
                return prevStocks.map(s => s.frigoId === targetFrigoId && s.productId === productIdToUse ? updatedStock : s);
              } else {
                return [...prevStocks, updatedStock];
              }
            });
          }
        }
      });
    });

    setDeliveryNotes(prev => {
      const existingNumbers = new Set(prev.map(b => b.blNumber));
      const filteredNew = newBLs.filter(b => !existingNumbers.has(b.blNumber));
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
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    console.warn('useERP used outside ERPProvider, using fallback context');
    return defaultFallbackContext;
  }
  return context;
};
