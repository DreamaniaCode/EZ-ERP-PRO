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
  name: 'SOCIÉTÉ AGRO NÉGOCE S.A.R.L.',
  ice: '002847193000084',
  rc: '123456 Casablanca',
  if: '45892011',
  cnss: '8912345',
  patente: '3450912',
  address: 'Entrepôt Frigorifique MFADEL',
  city: 'Casablanca / Meknès, Maroc',
  phone: '+212 522-987654',
  email: 'contact@agronegoce-maroc.ma',
  website: 'www.agronegoce-maroc.ma',
  logoUrl: '',
  bankName: 'Attijariwafa Bank',
  rib: '240 780 0001234567890123 45',
  swift: 'BCMA MA MC',
  capital: '1.000.000 DH',
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
    name: 'Responsable Frigo MFADEL',
    email: 'mfadel.frigo@easyerp.com',
    role: 'RESPONSABLE_FRIGO',
    assignedFrigoId: 'frigo-1',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  }
];

// Single Primary Cold Warehouse as requested: Frigo MFADEL
export const INITIAL_FRIGOS: ColdStorageFrigo[] = [
  {
    id: 'frigo-1',
    code: 'FRG-MFADEL',
    name: 'Frigo MFADEL',
    location: 'Entrepôt Frigorifique MFADEL',
    managerName: 'Responsable Frigo MFADEL',
    managerPhone: '+212 661-123456',
    whatsappGroup: 'Frigo MFADEL - Entrées & Sorties',
    whatsappGroupLink: 'https://chat.whatsapp.com/FrigoMfadelDemo',
    capacityPallets: 500000, // Stock capacity in Kg
  },
];

// Single Default Supplier as requested: IMPORT
export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'frs-import',
    code: 'SUP-IMPORT',
    name: 'IMPORT',
    companyName: 'IMPORT S.A.R.L.',
    country: 'International / Import',
    iceOrTaxId: '009988776655',
    email: 'import@easyerp.com',
    phone: '+212 522-000111',
    address: 'Port Casablanca',
    type: 'IMPORTATION',
    currentBalance: 0,
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prd-std-5kg',
    code: 'STD 5 KG',
    name: 'Dattes Standard 5 KG',
    category: 'Dattes Locales',
    origin: 'Maroc (Errachidia / Tafilalet)',
    sellingPriceHT: 50,
    unitCostHT: 35,
    vatRate: 20,
    kgPerCarton: 5,
    cartonsPerPallet: 160,
    kgPerPallet: 800,
    minStockAlertKg: 5000,
    description: 'Conditionnement Standard 5 KG certifié (Calcul strict par Kg).',
  },
  {
    id: 'prd-br-5kg',
    code: 'BR 5 KG',
    name: 'Dattes Branche 5 KG',
    category: 'Dattes Importées',
    origin: 'Tunisie (Tolga)',
    sellingPriceHT: 48,
    unitCostHT: 32,
    vatRate: 20,
    kgPerCarton: 5,
    cartonsPerPallet: 160,
    kgPerPallet: 800,
    minStockAlertKg: 5000,
    description: 'Format Branche 5 KG certifié (Calcul strict par Kg).',
  },
  {
    id: 'prd-br-2kg',
    code: 'BR 2 KG',
    name: 'Dattes Branche 2 KG',
    category: 'Dattes Importées',
    origin: 'Tunisie (Tolga)',
    sellingPriceHT: 52,
    unitCostHT: 36,
    vatRate: 20,
    kgPerCarton: 2,
    cartonsPerPallet: 400,
    kgPerPallet: 800,
    minStockAlertKg: 3000,
    description: 'Format Branche 2 KG certifié (Calcul strict par Kg).',
  },
];

export const INITIAL_STOCKS: FrigoStockLevel[] = [
  { productId: 'prd-std-5kg', frigoId: 'frigo-1', quantityKg: 38370, quantityPallets: 0, lastUpdated: '2026-08-01 10:00' },
  { productId: 'prd-br-5kg', frigoId: 'frigo-1', quantityKg: 49600, quantityPallets: 0, lastUpdated: '2026-08-01 10:00' },
  { productId: 'prd-br-2kg', frigoId: 'frigo-1', quantityKg: 15800, quantityPallets: 0, lastUpdated: '2026-08-01 10:00' },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'clt-hachem',
    code: 'CLT-001',
    name: 'HACHEM',
    companyName: 'Etablissements Hachem Négoce SARL',
    ice: '00152439800012',
    email: 'hachem.negoce@gmail.com',
    phone: '+212 661-234567',
    address: 'Marché de Gros, Casablanca',
    city: 'Casablanca',
    creditLimit: 2000000,
    currentBalance: 1726650,
  },
  {
    id: 'clt-omarqessab',
    code: 'CLT-002',
    name: 'OMAR QESSAB',
    companyName: 'Omar Qessab Dattes SARL',
    ice: '00394857600077',
    email: 'omar.qessab@gmail.com',
    phone: '+212 669-012345',
    address: 'Centre Ville, Meknès',
    city: 'Meknès',
    creditLimit: 1000000,
    currentBalance: 22500,
  }
];

export const INITIAL_ORDERS: SalesOrder[] = [];

export const INITIAL_DELIVERY_NOTES: DeliveryNoteBL[] = [
  {
    id: 'bl-1001',
    blNumber: 'BL-2026-1001',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-hachem',
    clientName: 'HACHEM',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-01',
    items: [
      {
        id: 'item-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 5000,
        quantityPallets: 0,
        unitPriceHT: 50,
        totalHT: 250000,
        totalTTC: 300000
      }
    ],
    totalKg: 5000,
    totalPallets: 0,
    totalHT: 250000,
    totalTTC: 300000,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Responsable Frigo MFADEL',
    whatsappSent: true,
    emailSent: false,
    status: 'VALIDE_FRIGO',
    logs: [
      {
        id: 'log-1',
        timestamp: '2026-08-01 09:00',
        action: 'Création du Bon de Livraison',
        author: 'Super Admin'
      }
    ]
  }
];

export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_CHEQUES_EFFETS: ChequeEffet[] = [];
export const INITIAL_TREASURY_ACCOUNTS: TreasuryAccount[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
