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
  CompanyInfo
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

// Frigo starts empty
export const INITIAL_STOCKS: FrigoStockLevel[] = [
  { productId: 'prd-alg-sibort-5kg', frigoId: 'frigo-condi-sk', quantityKg: 0, quantityPallets: 0, lastUpdated: '2025-04-01 00:00' },
  { productId: 'prd-alg-11kg', frigoId: 'frigo-condi-sk', quantityKg: 0, quantityPallets: 0, lastUpdated: '2025-04-01 00:00' },
];

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

export const INITIAL_CLIENTS: Client[] = UNIQUE_CLIENT_NAMES.map((name, idx) => ({
  id: clientIdFromName(name),
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
}));

export const INITIAL_ORDERS: SalesOrder[] = [];

// ============================================================
// RAW EXCEL DATA: 253 historical BL entries from Excel sheets
// ============================================================

interface RawExcelEntry {
  date: string;        // DD/MM/YYYY or YYYY-MM-DD
  product: 'SIBORT5' | '11KG';
  colis: number;
  poidsKg: number;
  client: string;      // raw name (will be normalized)
  company: 'STE_1' | 'STE_2';  // MLHMD or Ain Rabat
  sheet: string;
}

const RAW_EXCEL_ENTRIES: RawExcelEntry[] = [
  // ===== Sibort 5KG - Page 1 (MLHMD Sarl) =====
  { date: '02/04/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '04/04/2025', product: 'SIBORT5', colis: 144, poidsKg: 720, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '07/04/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '08/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '10/04/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '14/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '14/04/2025', product: 'SIBORT5', colis: 70, poidsKg: 350, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '17/04/2025', product: 'SIBORT5', colis: 75, poidsKg: 375, client: 'MAROUANE HIKMA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '19/04/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '22/04/2025', product: 'SIBORT5', colis: 75, poidsKg: 375, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '23/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '24/04/2025', product: 'SIBORT5', colis: 75, poidsKg: 375, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '26/04/2025', product: 'SIBORT5', colis: 40, poidsKg: 200, client: 'ABDELATTI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '29/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '30/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'DRISS RABAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '03/05/2025', product: 'SIBORT5', colis: 55, poidsKg: 275, client: 'ABDELATTI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '07/05/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '10/05/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATTI KHARBACH', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '16/05/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '20/05/2025', product: 'SIBORT5', colis: 2, poidsKg: 10, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '23/05/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '31/05/2025', product: 'SIBORT5', colis: 120, poidsKg: 600, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '13/06/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '16/06/2025', product: 'SIBORT5', colis: 20, poidsKg: 100, client: 'AZZEDINE AGADIRE', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '30/06/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '01/07/2025', product: 'SIBORT5', colis: 45, poidsKg: 225, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '05/07/2025', product: 'SIBORT5', colis: 10, poidsKg: 50, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '15/07/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '21/07/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '23/07/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'AYOUB ESSAIDY', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '23/07/2025', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '28/07/2025', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '28/07/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '01/08/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDEFATAH SALHI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '01/08/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'AYOUB ESSAIDY', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '02/08/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '02/08/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '04/08/2025', product: 'SIBORT5', colis: 2, poidsKg: 10, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '05/08/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'AYOUB ESSAIDY', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '05/08/2025', product: 'SIBORT5', colis: 70, poidsKg: 350, client: 'AYOUB ESSAIDY', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '10/08/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '14/08/2025', product: 'SIBORT5', colis: 40, poidsKg: 200, client: 'MUSTAPHA TETOUANE', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '15/08/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '02/09/2025', product: 'SIBORT5', colis: 70, poidsKg: 350, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '05/09/2025', product: 'SIBORT5', colis: 40, poidsKg: 200, client: 'MUSTAPHA TETOUANE', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '08/10/2025', product: 'SIBORT5', colis: 70, poidsKg: 350, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },
  { date: '11/10/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P1' },

  // ===== Sibort 5KG - Page 2 (MLHMD Sarl) =====
  { date: '14/10/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '16/10/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '20/10/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '25/10/2025', product: 'SIBORT5', colis: 40, poidsKg: 200, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '28/10/2025', product: 'SIBORT5', colis: 40, poidsKg: 200, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '30/10/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'MOUNAIM ZAGOURA', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '02/11/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'MOUNAIM ZAGOURA', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '03/11/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '04/11/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '07/11/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '09/11/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '12/11/2025', product: 'SIBORT5', colis: 56, poidsKg: 280, client: 'MUSTAPHA TETOUANE', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '15/11/2025', product: 'SIBORT5', colis: 25, poidsKg: 125, client: 'MOUNAIM ZAGOURA', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '17/11/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '20/11/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '22/11/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'ABDELKHALEQ ZAGOURA', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '25/11/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '29/11/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '01/12/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '04/12/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '06/12/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '09/12/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '12/12/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '13/12/2025', product: 'SIBORT5', colis: 20, poidsKg: 100, client: 'MUSTAPHA TETOUANE', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '15/12/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '18/12/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '23/12/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '12/01/2026', product: 'SIBORT5', colis: 42, poidsKg: 210, client: 'BOUJAMAA', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '17/01/2026', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'RACHID LAAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '24/01/2026', product: 'SIBORT5', colis: 25, poidsKg: 125, client: 'RACHID LAAROUSSI', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '04/02/2026', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDESSAMAD JGHAIDER', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '05/02/2026', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'ABDESSAMAD JGHAIDER', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '06/02/2026', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDELOUAHEB ZAGOURA', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '09/02/2026', product: 'SIBORT5', colis: 56, poidsKg: 280, client: 'MUSTAPHA TETOUANE', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '09/02/2026', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'YASSINE TOUWAIL', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '10/02/2026', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '11/02/2026', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '12/02/2026', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '13/02/2026', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'SOUFINE LEKASSAB', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '19/02/2026', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'SOUFINE LEKASSAB', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '21/02/2026', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'MILOUD ESPICE', company: 'STE_1', sheet: 'Sibort5-P2' },
  { date: '12/06/2026', product: 'SIBORT5', colis: 60, poidsKg: 300, client: '-', company: 'STE_1', sheet: 'Sibort5-P2' },

  // ===== Sibort 5KG - Page 3 (MLHMD Sarl) =====
  { date: '13/06/2026', product: 'SIBORT5', colis: 2, poidsKg: 10, client: 'BOUCHAIB RHARDA', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '14/06/2026', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'OMAR LGASSAB', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '15/06/2026', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '15/06/2026', product: 'SIBORT5', colis: 20, poidsKg: 100, client: 'AZZEDINE AGADIRE', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '16/06/2026', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'OMAR LGASSAB', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '18/06/2026', product: 'SIBORT5', colis: 70, poidsKg: 350, client: 'khalid', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '18/06/2026', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '19/06/2026', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'OMAR LGASSAB', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '19/06/2026', product: 'SIBORT5', colis: 120, poidsKg: 600, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '20/06/2026', product: 'SIBORT5', colis: 120, poidsKg: 600, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '21/06/2026', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'OMAR LGASSAB', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '22/06/2026', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '23/06/2026', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '23/06/2026', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'qabli', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '24/06/2026', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'AZIZ LKASRI', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '25/06/2026', product: 'SIBORT5', colis: 153, poidsKg: 9291, client: 'Soufiane belgessab', company: 'STE_1', sheet: 'Sibort5-P3' },
  { date: '24/07/2026', product: 'SIBORT5', colis: 153, poidsKg: 947.1, client: 'Mouhssine Resh', company: 'STE_1', sheet: 'Sibort5-P3' },

  // ===== Datte 11KG - Page 1 (MLHMD Sarl) =====
  { date: '02/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '04/04/2025', product: '11KG', colis: 144, poidsKg: 1584, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '07/04/2025', product: '11KG', colis: 144, poidsKg: 1584, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '08/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '10/04/2025', product: '11KG', colis: 60, poidsKg: 660, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '14/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '14/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '17/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '19/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '22/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '23/04/2025', product: '11KG', colis: 120, poidsKg: 1320, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '24/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '29/04/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDELATI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '30/04/2025', product: '11KG', colis: 80, poidsKg: 880, client: 'IDRISS ABDELAOUI RABAT', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '03/05/2025', product: '11KG', colis: 60, poidsKg: 660, client: 'ABDELATTI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '07/05/2025', product: '11KG', colis: 80, poidsKg: 880, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '10/05/2025', product: '11KG', colis: 80, poidsKg: 880, client: 'ABDELATTI KHARBACH', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '16/05/2025', product: '11KG', colis: 80, poidsKg: 880, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '20/05/2025', product: '11KG', colis: 2, poidsKg: 22, client: 'AZIZ EL KHASRI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '23/05/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '31/05/2025', product: '11KG', colis: 120, poidsKg: 1320, client: 'ERRAHALI MOHAMED', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '13/06/2025', product: '11KG', colis: 60, poidsKg: 660, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '16/06/2025', product: '11KG', colis: 20, poidsKg: 220, client: 'AZZEDINE AGADIRE', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '30/06/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '01/07/2025', product: '11KG', colis: 45, poidsKg: 495, client: 'AHMED EL BOUKHARI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '05/07/2025', product: '11KG', colis: 10, poidsKg: 110, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '15/07/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '21/07/2025', product: '11KG', colis: 30, poidsKg: 330, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '23/07/2025', product: '11KG', colis: 200, poidsKg: 2200, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '23/07/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'AYOUB ESSAIDY', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '28/07/2025', product: '11KG', colis: 60, poidsKg: 660, client: 'LAHCEN HJILA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '28/07/2025', product: '11KG', colis: 200, poidsKg: 2200, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '01/08/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDEFATAH SALHI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '01/08/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'AYOUB ESSAIDY', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '02/08/2025', product: '11KG', colis: 80, poidsKg: 880, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '02/08/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'HAMMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '04/08/2025', product: '11KG', colis: 2, poidsKg: 22, client: 'MAROUANE HIKMAT', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '05/08/2025', product: '11KG', colis: 120, poidsKg: 1320, client: 'AYOUB ESSAIDY', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '10/08/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '14/08/2025', product: '11KG', colis: 40, poidsKg: 440, client: 'MUSTAPHA TETOUANE', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '15/08/2025', product: '11KG', colis: 60, poidsKg: 660, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '02/09/2025', product: '11KG', colis: 70, poidsKg: 770, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '05/09/2025', product: '11KG', colis: 40, poidsKg: 440, client: 'MUSTAPHA TETOUANE', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '08/10/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '11/10/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '14/10/2025', product: '11KG', colis: 60, poidsKg: 660, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '16/10/2025', product: '11KG', colis: 30, poidsKg: 330, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '20/10/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '23/10/2025', product: '11KG', colis: 30, poidsKg: 330, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '23/10/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '25/10/2025', product: '11KG', colis: 30, poidsKg: 330, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '27/10/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '28/10/2025', product: '11KG', colis: 20, poidsKg: 220, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '01/11/2025', product: '11KG', colis: 30, poidsKg: 330, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '03/11/2025', product: '11KG', colis: 150, poidsKg: 1650, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '03/11/2025', product: '11KG', colis: 150, poidsKg: 1650, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '03/11/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '04/11/2025', product: '11KG', colis: 30, poidsKg: 330, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '05/11/2025', product: '11KG', colis: 120, poidsKg: 1320, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P1' },
  { date: '05/11/2025', product: '11KG', colis: 20, poidsKg: 220, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P1' },

  // ===== Datte 11KG - Page 2 (MLHMD Sarl) =====
  { date: '10/11/2025', product: '11KG', colis: 25, poidsKg: 275, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '10/11/2025', product: '11KG', colis: 70, poidsKg: 770, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '11/11/2025', product: '11KG', colis: 120, poidsKg: 1320, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '12/11/2025', product: '11KG', colis: 56, poidsKg: 616, client: 'MUSTAPHA TETOUAN', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '13/11/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '17/11/2025', product: '11KG', colis: 25, poidsKg: 275, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '19/11/2025', product: '11KG', colis: 32, poidsKg: 352, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '22/11/2025', product: '11KG', colis: 125, poidsKg: 1375, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '24/11/2025', product: '11KG', colis: 40, poidsKg: 440, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '26/11/2025', product: '11KG', colis: 80, poidsKg: 880, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '01/12/2025', product: '11KG', colis: 15, poidsKg: 165, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '01/12/2025', product: '11KG', colis: 40, poidsKg: 440, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '03/12/2025', product: '11KG', colis: 52, poidsKg: 572, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '04/12/2025', product: '11KG', colis: 20, poidsKg: 220, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '06/12/2025', product: '11KG', colis: 40, poidsKg: 440, client: 'HAMOUDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '09/12/2025', product: '11KG', colis: 50, poidsKg: 550, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '13/12/2025', product: '11KG', colis: 25, poidsKg: 275, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '18/12/2025', product: '11KG', colis: 70, poidsKg: 770, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '23/12/2025', product: '11KG', colis: 15, poidsKg: 165, client: 'RACHID LAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '23/12/2025', product: '11KG', colis: 100, poidsKg: 1100, client: 'KHALID GHARNITI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '09/01/2026', product: '11KG', colis: 138, poidsKg: 1518, client: 'KHALID GHARNITI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '12/01/2026', product: '11KG', colis: 42, poidsKg: 462, client: 'BOUJAMAA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '16/01/2026', product: '11KG', colis: 13, poidsKg: 143, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '16/01/2026', product: '11KG', colis: 12, poidsKg: 132, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '17/01/2026', product: '11KG', colis: 106, poidsKg: 1166, client: 'RACHID LAAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '17/01/2026', product: '11KG', colis: 25, poidsKg: 275, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '24/01/2026', product: '11KG', colis: 60, poidsKg: 660, client: 'RACHID LAAROUSSI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '04/02/2026', product: '11KG', colis: 60, poidsKg: 660, client: 'QABLI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '04/02/2026', product: '11KG', colis: 50, poidsKg: 550, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '05/02/2026', product: '11KG', colis: 50, poidsKg: 550, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '06/02/2026', product: '11KG', colis: 100, poidsKg: 1100, client: 'ABDELOOAHEB', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '09/02/2026', product: '11KG', colis: 95, poidsKg: 1045, client: 'MUSTAPHA TETOUAN', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '10/02/2026', product: '11KG', colis: 40, poidsKg: 440, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '11/02/2026', product: '11KG', colis: 40, poidsKg: 440, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '12/02/2026', product: '11KG', colis: 50, poidsKg: 550, client: 'ABDESSAMAD', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '20/05/2026', product: '11KG', colis: 41, poidsKg: 451, client: 'MUSTAPHA TETOUAN', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '10/06/2026', product: '11KG', colis: 240, poidsKg: 2640, client: 'AZIZ REDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '16/06/2026', product: '11KG', colis: 300, poidsKg: 3300, client: 'AZIZ REDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '18/06/2026', product: '11KG', colis: 360, poidsKg: 3960, client: 'AZIZ REDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '19/06/2026', product: '11KG', colis: 240, poidsKg: 2640, client: 'AZIZ REDA', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '19/06/2026', product: '11KG', colis: 240, poidsKg: 2640, client: 'OMAR', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '20/06/2026', product: '11KG', colis: 210, poidsKg: 2310, client: 'AZIZ FES', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '22/06/2026', product: '11KG', colis: 120, poidsKg: 1320, client: 'AZIZ FES', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '22/06/2026', product: '11KG', colis: 140, poidsKg: 1540, client: 'OMAR', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '23/06/2026', product: '11KG', colis: 480, poidsKg: 5280, client: 'OMAR', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '23/06/2026', product: '11KG', colis: 120, poidsKg: 1320, client: 'AZIZ FES', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '24/06/2026', product: '11KG', colis: 400, poidsKg: 4400, client: 'AZIZ FES', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '25/06/2026', product: '11KG', colis: 220, poidsKg: 2420, client: 'QABLI', company: 'STE_1', sheet: 'Datte11-P2' },
  { date: '27/06/2026', product: '11KG', colis: 60, poidsKg: 660, client: 'OMAR', company: 'STE_1', sheet: 'Datte11-P2' },

  // ===== Ain Rabat 22924 (Ain Rabat Sarl) =====
  { date: '04/04/2025', product: 'SIBORT5', colis: 120, poidsKg: 600, client: 'ABDELATI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '07/04/2025', product: 'SIBORT5', colis: 144, poidsKg: 720, client: 'RACHID LAROUSSI', company: 'STE_2', sheet: 'AinRabat' },
  { date: '08/04/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDELATI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '14/04/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'RACHID LAROUSSI', company: 'STE_2', sheet: 'AinRabat' },
  { date: '14/04/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'MAROUANE HIKMAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '17/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '19/04/2025', product: 'SIBORT5', colis: 70, poidsKg: 350, client: 'MAROUANE HIKMAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '22/04/2025', product: 'SIBORT5', colis: 75, poidsKg: 375, client: 'MAROUANE HIKMAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '23/04/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDELATI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '24/04/2025', product: 'SIBORT5', colis: 75, poidsKg: 375, client: 'MAROUANE HIKMAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '29/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '16/05/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'MAROUANE HIKMAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '20/05/2025', product: 'SIBORT5', colis: 2, poidsKg: 10, client: 'AZIZ EL KHASRI', company: 'STE_2', sheet: 'AinRabat' },
  { date: '13/06/2025', product: 'SIBORT5', colis: 2, poidsKg: 10, client: 'BOUCHAIB RHARDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '16/06/2025', product: 'SIBORT5', colis: 20, poidsKg: 100, client: 'AZZEDINE AGADIRE', company: 'STE_2', sheet: 'AinRabat' },
  { date: '26/04/2025', product: 'SIBORT5', colis: 40, poidsKg: 200, client: 'ABDELATTI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '30/04/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'IDRISS ABDELAOUI RABAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '02/04/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDELATTI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '10/05/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'ABDELATTI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '07/05/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'DRISS RABAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '31/05/2025', product: 'SIBORT5', colis: 120, poidsKg: 600, client: 'ERRAHALI MOHAMED', company: 'STE_2', sheet: 'AinRabat' },
  { date: '23/05/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'MAROUANE HIKMAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '03/05/2025', product: 'SIBORT5', colis: 55, poidsKg: 275, client: 'ABDELATTI KHARBACH', company: 'STE_2', sheet: 'AinRabat' },
  { date: '30/06/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'RACHID LAROUSSI', company: 'STE_2', sheet: 'AinRabat' },
  { date: '13/06/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'HAMMOUDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '05/07/2025', product: 'SIBORT5', colis: 10, poidsKg: 50, client: 'RACHID LAROUSSI', company: 'STE_2', sheet: 'AinRabat' },
  { date: '01/07/2025', product: 'SIBORT5', colis: 45, poidsKg: 225, client: 'AHMED EL BOUKHARI', company: 'STE_2', sheet: 'AinRabat' },
  { date: '15/07/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'HAMMOUDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '21/07/2025', product: 'SIBORT5', colis: 30, poidsKg: 150, client: 'HAMMOUDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '28/07/2025', product: 'SIBORT5', colis: 60, poidsKg: 300, client: 'LAHCEN HJILA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '28/07/2025', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'HAMMOUDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '23/07/2025', product: 'SIBORT5', colis: 200, poidsKg: 1000, client: 'HAMMOUDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '23/07/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'AYOUB ESSAIDY', company: 'STE_2', sheet: 'AinRabat' },
  { date: '01/08/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'ABDEFATAH SALHI', company: 'STE_2', sheet: 'AinRabat' },
  { date: '01/08/2025', product: 'SIBORT5', colis: 50, poidsKg: 250, client: 'AYOUB ESSAIDY', company: 'STE_2', sheet: 'AinRabat' },
  { date: '02/08/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'HAMMOUDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '02/08/2025', product: 'SIBORT5', colis: 100, poidsKg: 500, client: 'HAMMOUDA', company: 'STE_2', sheet: 'AinRabat' },
  { date: '04/08/2025', product: 'SIBORT5', colis: 2, poidsKg: 10, client: 'MAROUANE HIKMAT', company: 'STE_2', sheet: 'AinRabat' },
  { date: '05/08/2025', product: 'SIBORT5', colis: 80, poidsKg: 400, client: 'AYOUB ESSAIDY', company: 'STE_2', sheet: 'AinRabat' },
  { date: '05/08/2025', product: 'SIBORT5', colis: 70, poidsKg: 350, client: 'AYOUB ESSAIDY', company: 'STE_2', sheet: 'AinRabat' },
];

// Convert DD/MM/YYYY to YYYY-MM-DD
function parseDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ddmmyyyy;
}

// Build the 253 historical BLs from Excel data
const buildExcelBLs = (): DeliveryNoteBL[] => {
  return RAW_EXCEL_ENTRIES
    .filter(e => e.client !== '-' && e.client.trim() !== '')
    .map((entry, idx) => {
      const clientName = normalizeClientName(entry.client);
      const clientId = clientIdFromName(clientName);
      const date = parseDate(entry.date);
      const productId = entry.product === 'SIBORT5' ? 'prd-alg-sibort-5kg' : 'prd-alg-11kg';
      const productCode = entry.product === 'SIBORT5' ? 'ALG SIBORT 5KG' : 'ALG 11KG';
      const productName = entry.product === 'SIBORT5' ? 'Datte Algérienne Sibort 5 KG' : 'Datte Algérienne 11 KG';
      const companyId = entry.company;
      const prefix = companyId === 'STE_1' ? 'BL-MLHMD' : 'BL-AINRAB';
      const blNumber = `${prefix}-${date.replace(/-/g, '')}-${String(idx + 1).padStart(4, '0')}`;
      const poidsKg = entry.poidsKg;
      const unitPrice = 22; // selling price
      const totalHT = poidsKg * unitPrice;
      const totalTTC = totalHT; // TVA 0%

      return {
        id: `bl-excel-${idx + 1}`,
        companyId,
        blNumber,
        orderId: '',
        orderNumber: '',
        clientId,
        clientName,
        clientAddress: '',
        clientPhone: '',
        clientEmail: '',
        frigoId: 'frigo-condi-sk',
        frigoName: 'Condiferie SK',
        date,
        items: [
          {
            productId,
            productCode,
            productName,
            quantityKg: poidsKg,
            quantityCartons: entry.colis,
            quantityPallets: 0,
            unitPriceHT: unitPrice,
            totalHT,
          }
        ],
        totalKg: poidsKg,
        totalCartons: entry.colis,
        totalPallets: 0,
        totalHT,
        totalTTC,
        stockDecremented: true,
        frigoEmployeeApproved: true,
        frigoApprovedBy: 'Agent Frigo Condiferie SK',
        whatsappSent: false,
        emailSent: false,
        status: 'LIVRÉ' as const,
        logs: [
          {
            id: `log-excel-${idx + 1}`,
            timestamp: `${date} 09:00`,
            action: `Importé depuis Excel (${entry.sheet})`,
            author: 'Super Admin',
          }
        ]
      };
    });
};

export const INITIAL_DELIVERY_NOTES: DeliveryNoteBL[] = buildExcelBLs();

export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_CHEQUES_EFFETS: ChequeEffet[] = [];
export const INITIAL_TREASURY_ACCOUNTS: TreasuryAccount[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
