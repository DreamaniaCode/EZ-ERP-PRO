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
  },
  {
    id: 'usr-3',
    name: 'Responsable Frigo Condiferie SK',
    email: 'condiferie.frigo@easyerp.com',
    role: 'RESPONSABLE_FRIGO',
    assignedFrigoId: 'frigo-condi-sk',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  }
];

// Primary Cold Warehouse: Condiferie SK
export const INITIAL_FRIGOS: ColdStorageFrigo[] = [
  {
    id: 'frigo-condi-sk',
    code: 'FRG-CONDI-SK',
    name: 'Condiferie SK',
    location: 'Entrepôt Frigorifique Condiferie SK',
    managerName: 'Responsable Frigo Condiferie',
    managerPhone: '',
    whatsappGroup: 'Condiferie SK - Entrées & Sorties',
    whatsappGroupLink: '',
    capacityPallets: 500000,
  },
];

// Supplier: ALG (Algérie)
export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'frs-alg',
    code: 'SUP-ALG',
    name: 'ALG',
    companyName: 'Fournisseur Algérie',
    country: 'Algérie',
    iceOrTaxId: '',
    email: '',
    phone: '',
    address: '',
    type: 'IMPORTATION',
    currentBalance: 0,
  }
];

// Products: ALG SIBORT 5KG and ALG 11KG
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prd-alg-sibort-5kg',
    code: 'ALG SIBORT 5KG',
    name: 'Datte Algérienne Sibort 5 KG',
    category: 'Dattes Importées',
    origin: 'Algérie',
    sellingPriceHT: 22,
    unitCostHT: 20,
    vatRate: 0,
    kgPerCarton: 6,      // real weight per colis = 6 kg
    cartonsPerPallet: 80,
    kgPerPallet: 480,
    minStockAlertKg: 1000,
    description: 'Datte Algérienne Sibort 5 KG (poids réel 6 kg/colis). Prix de revient 20 DH/kg, Prix de vente 22 DH/kg.',
  },
  {
    id: 'prd-alg-11kg',
    code: 'ALG 11KG',
    name: 'Datte Algérienne 11 KG',
    category: 'Dattes Importées',
    origin: 'Algérie',
    sellingPriceHT: 22,
    unitCostHT: 20,
    vatRate: 0,
    kgPerCarton: 10.5,    // real weight per colis = 10.5 kg
    cartonsPerPallet: 50,
    kgPerPallet: 525,
    minStockAlertKg: 1000,
    description: 'Datte Algérienne 11 KG (poids réel 10.5 kg/colis). Prix de revient 20 DH/kg, Prix de vente 22 DH/kg.',
  },
];

// Frigo starts empty — user enters stock via Frigo Operations page
export const INITIAL_STOCKS: FrigoStockLevel[] = [];

// Client name deduplication map
const CLIENT_NAME_MAP: Record<string, string> = {
  'RACHID LAROUSSI': 'RACHID LAROUSSI',
  'RACHID LAAROUSSI': 'RACHID LAROUSSI',
  'RACHID LAROUSSI/': 'RACHID LAROUSSI',
  'HAMMOUDA': 'HAMMOUDA',
  'HAMOUDA': 'HAMMOUDA',
  'MAROUANE HIKMAT': 'MAROUANE HIKMAT',
  'MAROUANE HIKMA': 'MAROUANE HIKMAT',
  'MUSTAPHA TETOUANE': 'MUSTAPHA TETOUANE',
  'MUSTAPHA TETOUAN': 'MUSTAPHA TETOUANE',
  'ABDELATTI KHARBACH': 'ABDELATI KHARBACH',
  'ABDELATI KHARBACH': 'ABDELATI KHARBACH',
  'ABDESSAMAD JGHAIDER': 'ABDESSAMAD JGHAIDER',
  'ABDESSAMAD': 'ABDESSAMAD JGHAIDER',
  'AZIZ LKASRI': 'AZIZ LKASRI',
  'AZIZ EL KHASRI': 'AZIZ LKASRI',
  'SOUFINE LEKASSAB': 'SOUFIANE BELGESSAB',
  'Soufiane belgessab': 'SOUFIANE BELGESSAB',
  'ABDELOUAHEB ZAGOURA': 'ABDELOUAHEB ZAGOURA',
  'ABDELOOAHEB': 'ABDELOUAHEB ZAGOURA',
  'DRISS RABAT': 'DRISS RABAT',
  'IDRISS ABDELAOUI RABAT': 'DRISS RABAT',
  'OMAR': 'OMAR LGASSAB',
  'OMAR LGASSAB': 'OMAR LGASSAB',
  'KHALID GHARNITI': 'KHALID GHARNITI',
  'khalid': 'KHALID GHARNITI',
  'QABLI': 'QABLI',
  'qabli': 'QABLI',
  'Mouhssine Resh': 'MOUHSSINE RESH',
};

function normalizeClientName(raw: string): string {
  const trimmed = raw.trim();
  return CLIENT_NAME_MAP[trimmed] || trimmed.toUpperCase();
}

function clientIdFromName(name: string): string {
  return 'clt-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

// All deduplicated clients from Excel
const UNIQUE_CLIENT_NAMES = [
  'RACHID LAROUSSI',
  'HAMMOUDA', 
  'MAROUANE HIKMAT',
  'MUSTAPHA TETOUANE',
  'ABDELATI KHARBACH',
  'ABDESSAMAD JGHAIDER',
  'AZIZ LKASRI',
  'SOUFIANE BELGESSAB',
  'ABDELOUAHEB ZAGOURA',
  'DRISS RABAT',
  'OMAR LGASSAB',
  'KHALID GHARNITI',
  'QABLI',
  'MOUHSSINE RESH',
  'AZIZ FES',
  'AZIZ REDA',
  'BOUJAMAA',
  'MILOUD ESPICE',
  'MOUNAIM ZAGOURA',
  'ABDELKHALEQ ZAGOURA',
  'YASSINE TOUWAIL',
  'AYOUB ESSAIDY',
  'AZZEDINE AGADIRE',
  'BOUCHAIB RHARDA',
  'ERRAHALI MOHAMED',
  'LAHCEN HJILA',
  'AHMED EL BOUKHARI',
  'ABDEFATAH SALHI',
];



export const INITIAL_ORDERS: SalesOrder[] = [];

// ============================================================
// All transactional data starts empty — user manages via Frigo Operations
// ============================================================
export const INITIAL_DELIVERY_NOTES: DeliveryNoteBL[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_STOCK_MOVEMENTS: ProductStockMovement[] = [];
export const INITIAL_CHEQUES_EFFETS: ChequeEffet[] = [];
export const INITIAL_TREASURY_ACCOUNTS: TreasuryAccount[] = [];
export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_CLIENTS: Client[] = UNIQUE_CLIENT_NAMES.map((name, idx) => {
  const cid = clientIdFromName(name);
  return {
    id: cid,
    code: `CLT-${String(idx + 1).padStart(3, '0')}`,
    name: name,
    companyName: '',
    ice: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    creditLimit: 500000,
    currentBalance: 0,
  };
});
