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
  CompanyInfo,
  ProductStockMovement
} from '../types';

export const INITIAL_COMPANY_INFO: CompanyInfo = {
  name: 'MLHMD Sarl',
  ice: '',
  rc: '',
  if: '',
  cnss: '',
  patente: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  bankName: '',
  rib: '',
  swift: '',
  capital: '',
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Super Admin',
    email: 'admin@easyerp.com',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  }
];

// Completely clear database (Start at 0 for all entities)
export const INITIAL_FRIGOS: ColdStorageFrigo[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prd-sibort-5kg',
    code: 'PRD-SIBORT-5KG',
    name: 'Datte Algérienne Sibort 5 KG',
    category: 'Dattes Importées',
    origin: 'Algérie / Import',
    sellingPriceHT: 22,
    unitCostHT: 18,
    vatRate: 0.20,
    kgPerCarton: 5,
    cartonsPerPallet: 100,
    kgPerPallet: 500,
    minStockAlertKg: 5000,
    description: 'Produit principal 1: Datte Algérienne Sibort 5 KG',
  },
  {
    id: 'prd-datte-11kg',
    code: 'PRD-DATTE-11KG',
    name: 'Datte Algérienne 11 KG',
    category: 'Dattes Importées',
    origin: 'Algérie / Import',
    sellingPriceHT: 55,
    unitCostHT: 45,
    vatRate: 0.20,
    kgPerCarton: 11,
    cartonsPerPallet: 100,
    kgPerPallet: 1100,
    minStockAlertKg: 5000,
    description: 'Produit principal 2: Datte Algérienne 11 KG',
  }
];
export const INITIAL_STOCKS: FrigoStockLevel[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_ORDERS: SalesOrder[] = [];
export const INITIAL_DELIVERY_NOTES: DeliveryNoteBL[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_STOCK_MOVEMENTS: ProductStockMovement[] = [];
export const INITIAL_CHEQUES_EFFETS: ChequeEffet[] = [];
export const INITIAL_TREASURY_ACCOUNTS: TreasuryAccount[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
