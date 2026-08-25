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
  CompanyInfo,
  CompanyEntity,
  ProductStockMovement,
  RecalculationSummaryReport
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.error || errorBody.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; database: string }>('/health'),

  // Bootstrap / Sync All Data
  bootstrapFromLocal: (data: any) =>
    request<{ success: boolean; message: string }>('/sync/bootstrap', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users
  getUsers: () => request<UserProfile[]>('/users'),
  createUser: (user: Partial<UserProfile>) => request<UserProfile>('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: (id: string, user: Partial<UserProfile>) => request<UserProfile>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }),
  deleteUser: (id: string) => request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),

  // Companies
  getCompanies: () => request<CompanyEntity[]>('/companies'),
  createCompany: (company: CompanyEntity) => request<CompanyEntity>('/companies', { method: 'POST', body: JSON.stringify(company) }),
  updateCompany: (id: string, company: Partial<CompanyEntity>) => request<CompanyEntity>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(company) }),

  // Company Info
  getCompanyInfo: () => request<CompanyInfo>('/company-info'),
  updateCompanyInfo: (info: Partial<CompanyInfo>) => request<CompanyInfo>('/company-info', { method: 'PUT', body: JSON.stringify(info) }),

  // Products
  getProducts: () => request<Product[]>('/products'),
  createProduct: (product: Partial<Product>) => request<Product>('/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id: string, product: Partial<Product>) => request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) }),
  deleteProduct: (id: string) => request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' }),
  mergeProducts: (targetProductId: string, productIdsToMerge: string[]) =>
    request<{ success: boolean; message: string }>('/products/merge', {
      method: 'POST',
      body: JSON.stringify({ targetProductId, productIdsToMerge }),
    }),

  // Frigos
  getFrigos: () => request<ColdStorageFrigo[]>('/frigos'),
  createFrigo: (frigo: Partial<ColdStorageFrigo>) => request<ColdStorageFrigo>('/frigos', { method: 'POST', body: JSON.stringify(frigo) }),
  updateFrigo: (id: string, frigo: Partial<ColdStorageFrigo>) => request<ColdStorageFrigo>(`/frigos/${id}`, { method: 'PUT', body: JSON.stringify(frigo) }),
  deleteFrigo: (id: string) => request<{ success: boolean }>(`/frigos/${id}`, { method: 'DELETE' }),

  // Stocks
  getStocks: () => request<FrigoStockLevel[]>('/stocks'),
  adjustStock: (payload: { frigoId: string; productId: string; newKg: number; newPallets: number; performedBy?: string; notes?: string }) =>
    request<FrigoStockLevel>('/stocks/adjust', { method: 'POST', body: JSON.stringify(payload) }),
  transferStock: (payload: { sourceFrigoId: string; targetFrigoId: string; productId: string; kg: number; pallets: number; performedBy?: string }) =>
    request<{ success: boolean }>('/stocks/transfer', { method: 'POST', body: JSON.stringify(payload) }),
  clearStock: (payload?: { frigoId?: string; productId?: string; performedBy?: string; notes?: string }) =>
    request<{ success: boolean; clearedCount: number }>('/stocks/clear', { method: 'POST', body: JSON.stringify(payload || {}) }),
  purgeOrphanStocks: () => request<{ purgedCount: number }>('/stocks/purge-orphans', { method: 'POST' }),

  // Stock Movements
  getStockMovements: () => request<ProductStockMovement[]>('/stock-movements'),

  // Clients
  getClients: () => request<Client[]>('/clients'),
  createClient: (client: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(client) }),
  updateClient: (id: string, client: Partial<Client>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(client) }),
  deleteClient: (id: string) => request<{ success: boolean }>(`/clients/${id}`, { method: 'DELETE' }),
  mergeClients: (targetClientId: string, clientIdsToMerge: string[]) =>
    request<{ success: boolean }>('/clients/merge', {
      method: 'POST',
      body: JSON.stringify({ targetClientId, clientIdsToMerge }),
    }),

  // Suppliers
  getSuppliers: () => request<Supplier[]>('/suppliers'),
  createSupplier: (supplier: Partial<Supplier>) => request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(supplier) }),
  updateSupplier: (id: string, supplier: Partial<Supplier>) => request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(supplier) }),
  deleteSupplier: (id: string) => request<{ success: boolean }>(`/suppliers/${id}`, { method: 'DELETE' }),

  // Sales Orders
  getOrders: () => request<SalesOrder[]>('/orders'),
  createOrder: (order: Partial<SalesOrder>) => request<SalesOrder>('/orders', { method: 'POST', body: JSON.stringify(order) }),
  updateOrder: (id: string, order: Partial<SalesOrder>) => request<SalesOrder>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(order) }),
  deleteOrder: (id: string) => request<{ success: boolean }>(`/orders/${id}`, { method: 'DELETE' }),

  // Delivery Notes (BL)
  getDeliveryNotes: () => request<DeliveryNoteBL[]>('/delivery-notes'),
  createDeliveryNote: (bl: DeliveryNoteBL) => request<DeliveryNoteBL>('/delivery-notes', { method: 'POST', body: JSON.stringify(bl) }),
  importBatchBLs: (bls: DeliveryNoteBL[]) => request<{ importedCount: number; bls: DeliveryNoteBL[] }>('/delivery-notes/import-batch', { method: 'POST', body: JSON.stringify({ bls }) }),
  updateDeliveryNote: (id: string, bl: Partial<DeliveryNoteBL>) => request<DeliveryNoteBL>(`/delivery-notes/${id}`, { method: 'PUT', body: JSON.stringify(bl) }),
  deleteDeliveryNote: (id: string) => request<{ success: boolean }>(`/delivery-notes/${id}`, { method: 'DELETE' }),
  approveFrigoBL: (id: string, employeeName: string) =>
    request<DeliveryNoteBL>(`/delivery-notes/${id}/approve-frigo`, {
      method: 'POST',
      body: JSON.stringify({ employeeName }),
    }),
  recalculateBLPrices: () => request<RecalculationSummaryReport>('/delivery-notes/recalculate-prices', { method: 'POST' }),

  // Invoices
  getInvoices: () => request<Invoice[]>('/invoices'),
  createInvoice: (invoice: Partial<Invoice>) => request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(invoice) }),
  createInvoiceFromBL: (blId: string) => request<Invoice>(`/invoices/from-bl/${blId}`, { method: 'POST' }),
  updateInvoice: (id: string, invoice: Partial<Invoice>) => request<Invoice>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(invoice) }),
  deleteInvoice: (id: string) => request<{ success: boolean }>(`/invoices/${id}`, { method: 'DELETE' }),

  // Cheques & Effets
  getCheques: () => request<ChequeEffet[]>('/cheques'),
  createCheque: (cheque: Partial<ChequeEffet>) => request<ChequeEffet>('/cheques', { method: 'POST', body: JSON.stringify(cheque) }),
  updateCheque: (id: string, cheque: Partial<ChequeEffet>) => request<ChequeEffet>(`/cheques/${id}`, { method: 'PUT', body: JSON.stringify(cheque) }),
  deleteCheque: (id: string) => request<{ success: boolean }>(`/cheques/${id}`, { method: 'DELETE' }),

  // Treasury Accounts
  getTreasuryAccounts: () => request<TreasuryAccount[]>('/treasury'),
  createTreasuryAccount: (account: Partial<TreasuryAccount>) => request<TreasuryAccount>('/treasury', { method: 'POST', body: JSON.stringify(account) }),
  updateTreasuryAccount: (id: string, account: Partial<TreasuryAccount>) => request<TreasuryAccount>(`/treasury/${id}`, { method: 'PUT', body: JSON.stringify(account) }),
  deleteTreasuryAccount: (id: string) => request<{ success: boolean }>(`/treasury/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: () => request<Expense[]>('/expenses'),
  createExpense: (expense: Partial<Expense>) => request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
  updateExpense: (id: string, expense: Partial<Expense>) => request<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(expense) }),
  deleteExpense: (id: string) => request<{ success: boolean }>(`/expenses/${id}`, { method: 'DELETE' }),

  // Purchases (Achats & Importations)
  getPurchases: () => request<PurchaseImportInvoice[]>('/purchases'),
  createPurchase: (purchase: Partial<PurchaseImportInvoice>) => request<PurchaseImportInvoice>('/purchases', { method: 'POST', body: JSON.stringify(purchase) }),
  updatePurchase: (id: string, purchase: Partial<PurchaseImportInvoice>) => request<PurchaseImportInvoice>(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify(purchase) }),
  deletePurchase: (id: string) => request<{ success: boolean }>(`/purchases/${id}`, { method: 'DELETE' }),

  // Multi-Site Inventories
  getInventories: () => request<MultiSiteInventoryCount[]>('/inventories'),
  createInventory: (count: Partial<MultiSiteInventoryCount>) => request<MultiSiteInventoryCount>('/inventories', { method: 'POST', body: JSON.stringify(count) }),
  updateInventory: (id: string, count: Partial<MultiSiteInventoryCount>) => request<MultiSiteInventoryCount>(`/inventories/${id}`, { method: 'PUT', body: JSON.stringify(count) }),
  deleteInventory: (id: string) => request<{ success: boolean }>(`/inventories/${id}`, { method: 'DELETE' }),
};
