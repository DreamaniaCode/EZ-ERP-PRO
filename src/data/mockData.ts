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

const RAW_HISTORICAL_PDF_ROWS = [
  // STD 5 KG
  { DATE: '2026-03-28', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'AYOUB KENI', 'N DE BON': '47154' },
  { DATE: '2026-03-28', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '47153' },
  { DATE: '2026-03-30', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '47162' },
  { DATE: '2026-04-01', DESIGNATION: 'STD 5 KG', QUANTITE: 3000, CLIENT: 'HACHEM', 'N DE BON': '89' },
  { DATE: '2026-04-01', DESIGNATION: 'STD 5 KG', QUANTITE: 2000, CLIENT: 'HACHEM', 'N DE BON': '90' },
  { DATE: '2026-04-01', DESIGNATION: 'STD 5 KG', QUANTITE: 300, CLIENT: 'KHALED LIBI', 'N DE BON': '91' },
  { DATE: '2026-04-01', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '94' },
  { DATE: '2026-04-02', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '34' },
  { DATE: '2026-04-02', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'HACHEM', 'N DE BON': '35' },
  { DATE: '2026-04-02', DESIGNATION: 'STD 5 KG', QUANTITE: 2000, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '37' },
  { DATE: '2026-04-04', DESIGNATION: 'STD 5 KG', QUANTITE: 2000, CLIENT: 'BILAL TOUNSIE', 'N DE BON': '95' },
  { DATE: '2026-04-04', DESIGNATION: 'STD 5 KG', QUANTITE: 2000, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '41' },
  { DATE: '2026-04-04', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '43' },
  { DATE: '2026-04-06', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '46' },
  { DATE: '2026-04-08', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '89' },
  { DATE: '2026-04-09', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'HACHEM', 'N DE BON': '90' },
  { DATE: '2026-04-13', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'HACHEM', 'N DE BON': '95' },
  { DATE: '2026-04-13', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'BILAL TOUNSSI', 'N DE BON': '96' },
  { DATE: '2026-04-15', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '64' },
  { DATE: '2026-04-15', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '22' },
  { DATE: '2026-04-16', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'HACHEM', 'N DE BON': '65' },
  { DATE: '2026-04-16', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '66' },
  { DATE: '2026-04-18', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '67' },
  { DATE: '2026-04-21', DESIGNATION: 'STD 5 KG', QUANTITE: 300, CLIENT: 'MUSTAPHA KHALID', 'N DE BON': '70' },
  { DATE: '2026-04-22', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'LAAROUSI RACHID', 'N DE BON': '71' },
  { DATE: '2026-04-27', DESIGNATION: 'STD 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '56' },
  { DATE: '2026-04-30', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '58' },
  { DATE: '2026-05-05', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '65' },
  { DATE: '2026-05-11', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'BILAL TOUNSIE', 'N DE BON': '47169' },
  { DATE: '2026-05-12', DESIGNATION: 'STD 5 KG', QUANTITE: 500, CLIENT: 'OMAR QESSAB', 'N DE BON': '47170' },
  { DATE: '2026-05-14', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '73' },
  { DATE: '2026-05-16', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '54' },
  { DATE: '2026-05-16', DESIGNATION: 'STD 5 KG', QUANTITE: 1500, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '55' },
  { DATE: '2026-06-04', DESIGNATION: 'STD 5 KG', QUANTITE: 770, CLIENT: 'SOUFIANE BARGAM', 'N DE BON': '96' },

  // BR 5 KG
  { DATE: '2026-03-28', DESIGNATION: 'BR 5 KG', QUANTITE: 1500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '47153' },
  { DATE: '2026-03-30', DESIGNATION: 'BR 5 KG', QUANTITE: 1500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '47152' },
  { DATE: '2026-04-02', DESIGNATION: 'BR 5 KG', QUANTITE: 1500, CLIENT: 'HACHEM', 'N DE BON': '35' },
  { DATE: '2026-04-02', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '36' },
  { DATE: '2026-04-03', DESIGNATION: 'BR 5 KG', QUANTITE: 1500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '45' },
  { DATE: '2026-04-06', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '46' },
  { DATE: '2026-04-08', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '89' },
  { DATE: '2026-04-09', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '90' },
  { DATE: '2026-04-09', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '91' },
  { DATE: '2026-04-10', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '52' },
  { DATE: '2026-04-11', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '92' },
  { DATE: '2026-04-13', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '95' },
  { DATE: '2026-04-13', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '97' },
  { DATE: '2026-04-15', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '64' },
  { DATE: '2026-04-15', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '22' },
  { DATE: '2026-04-16', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '66' },
  { DATE: '2026-04-18', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '67' },
  { DATE: '2026-04-20', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '49' },
  { DATE: '2026-04-21', DESIGNATION: 'BR 5 KG', QUANTITE: 800, CLIENT: 'LAAROUSI RACHID', 'N DE BON': '69' },
  { DATE: '2026-04-22', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'MUSTAPHA KHALID', 'N DE BON': '53' },
  { DATE: '2026-04-22', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '72' },
  { DATE: '2026-04-23', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '54' },
  { DATE: '2026-04-24', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '95' },
  { DATE: '2026-04-25', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '73' },
  { DATE: '2026-04-27', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '56' },
  { DATE: '2026-04-28', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '75' },
  { DATE: '2026-04-28', DESIGNATION: 'BR 5 KG', QUANTITE: 1500, CLIENT: 'HACHEM', 'N DE BON': '47164' },
  { DATE: '2026-05-11', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '94' },
  { DATE: '2026-05-11', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'BILAL TOUNSI', 'N DE BON': '13' },
  { DATE: '2026-05-12', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'BILAL TOUNSSI', 'N DE BON': '88' },
  { DATE: '2026-05-14', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '74' },
  { DATE: '2026-06-03', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '53' },
  { DATE: '2026-06-04', DESIGNATION: 'BR 5 KG', QUANTITE: 3000, CLIENT: 'HACHEM', 'N DE BON': '90' },
  { DATE: '2026-06-05', DESIGNATION: 'BR 5 KG', QUANTITE: 1500, CLIENT: 'HACHEM', 'N DE BON': '63' },
  { DATE: '2026-06-05', DESIGNATION: 'BR 5 KG', QUANTITE: 300, CLIENT: 'AABIDA', 'N DE BON': '65' },
  { DATE: '2026-06-06', DESIGNATION: 'BR 5 KG', QUANTITE: 2500, CLIENT: 'HACHEM', 'N DE BON': '99' },
  { DATE: '2026-06-08', DESIGNATION: 'BR 5 KG', QUANTITE: 2500, CLIENT: 'HACHEM', 'N DE BON': '86' },
  { DATE: '2026-06-09', DESIGNATION: 'BR 5 KG', QUANTITE: 2500, CLIENT: 'LAAROUSI RACHID', 'N DE BON': '88' },
  { DATE: '2026-06-09', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'AABIDA', 'N DE BON': '83' },
  { DATE: '2026-06-11', DESIGNATION: 'BR 5 KG', QUANTITE: 2500, CLIENT: 'HACHEM', 'N DE BON': '90' },
  { DATE: '2026-06-22', DESIGNATION: 'BR 5 KG', QUANTITE: 500, CLIENT: 'LAAROUSI RACHID', 'N DE BON': '79' },
  { DATE: '2026-06-24', DESIGNATION: 'BR 5 KG', QUANTITE: 2000, CLIENT: 'LAAROUSI RACHID', 'N DE BON': '89' },
  { DATE: '2026-06-29', DESIGNATION: 'BR 5 KG', QUANTITE: 1000, CLIENT: 'LAAROUSI RACHID', 'N DE BON': '41' },

  // BR 2 KG
  { DATE: '2026-03-28', DESIGNATION: 'BR 2 KG', QUANTITE: 2000, CLIENT: 'AYOUB KENI', 'N DE BON': '47154' },
  { DATE: '2026-04-08', DESIGNATION: 'BR 2 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '89' },
  { DATE: '2026-04-13', DESIGNATION: 'BR 2 KG', QUANTITE: 1000, CLIENT: 'HACHEM', 'N DE BON': '95' },
  { DATE: '2026-04-13', DESIGNATION: 'BR 2 KG', QUANTITE: 500, CLIENT: 'BILAL TOUNSSI', 'N DE BON': '96' },
  { DATE: '2026-04-18', DESIGNATION: 'BR 2 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '67' },
  { DATE: '2026-04-20', DESIGNATION: 'BR 2 KG', QUANTITE: 500, CLIENT: 'SANAD MOHHEMED', 'N DE BON': '49' },
  { DATE: '2026-04-29', DESIGNATION: 'BR 2 KG', QUANTITE: 1000, CLIENT: 'AYOUB KENI', 'N DE BON': '76' },
  { DATE: '2026-05-13', DESIGNATION: 'BR 2 KG', QUANTITE: 1000, CLIENT: 'BILAL TOUNSSI', 'N DE BON': '47171' },
  { DATE: '2026-05-19', DESIGNATION: 'BR 2 KG', QUANTITE: 500, CLIENT: 'AYOUB KENI', 'N DE BON': '64' },
  { DATE: '2026-05-21', DESIGNATION: 'BR 2 KG', QUANTITE: 1000, CLIENT: 'BILAL TOUNSSI', 'N DE BON': '72' },
  { DATE: '2026-06-02', DESIGNATION: 'BR 2 KG', QUANTITE: 1000, CLIENT: 'AYOUB KENI', 'N DE BON': '80' },
  { DATE: '2026-06-02', DESIGNATION: 'BR 2 KG', QUANTITE: 2000, CLIENT: 'BILAL TOUNSSI', 'N DE BON': '74' },
  { DATE: '2026-06-04', DESIGNATION: 'BR 2 KG', QUANTITE: 500, CLIENT: 'BILAL TOUNSSI', 'N DE BON': '94' },
  { DATE: '2026-06-05', DESIGNATION: 'BR 2 KG', QUANTITE: 1000, CLIENT: 'AYOUB KENI', 'N DE BON': '95' },
  { DATE: '2026-06-05', DESIGNATION: 'BR 2 KG', QUANTITE: 300, CLIENT: 'AABIDA', 'N DE BON': '65' },
  { DATE: '2026-06-09', DESIGNATION: 'BR 2 KG', QUANTITE: 1000, CLIENT: 'AABIDA', 'N DE BON': '83' }
];

const buildHistoricalPDFBLs = (): DeliveryNoteBL[] => {
  const groups = new Map<string, any[]>();

  RAW_HISTORICAL_PDF_ROWS.forEach(row => {
    const key = `${row.CLIENT}_${row['N DE BON']}_${row.DATE}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  });

  const result: DeliveryNoteBL[] = [];
  let index = 1;

  groups.forEach((rows) => {
    const first = rows[0];
    const blNum = first['N DE BON'].startsWith('BL') ? first['N DE BON'] : `BL-2026-${first['N DE BON']}`;
    const date = first.DATE;
    const clientName = first.CLIENT;

    let totalKg = 0;
    let totalPallets = 0;
    let totalHT = 0;

    const items = rows.map((r, itemIdx) => {
      const qtyKg = r.QUANTITE;
      const prdCode = r.DESIGNATION;
      const prdName = r.DESIGNATION === 'STD 5 KG' ? 'Dattes Standard 5 KG' :
                      r.DESIGNATION === 'BR 5 KG' ? 'Dattes Branche 5 KG' :
                      r.DESIGNATION === 'BR 2 KG' ? 'Dattes Branche 2 KG' : r.DESIGNATION;
      const unitPrice = prdName.includes('2 KG') ? 60 : 50;
      const lineHT = qtyKg * unitPrice;
      const palletRatio = prdName.includes('2 KG') ? 200 : 500;
      const pallets = Math.ceil(qtyKg / palletRatio);

      totalKg += qtyKg;
      totalPallets += pallets;
      totalHT += lineHT;

      return {
        id: `item-pdf-${index}-${itemIdx}`,
        productId: `prd-${prdCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        productCode: prdCode,
        productName: prdName,
        quantityKg: qtyKg,
        quantityPallets: pallets,
        unitPriceHT: unitPrice,
        totalHT: lineHT,
        totalTTC: lineHT * 1.20,
      };
    });

    const totalTTC = totalHT * 1.20;

    result.push({
      id: `bl-pdf-${index}`,
      blNumber: blNum,
      orderId: '',
      orderNumber: '',
      clientId: `clt-${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      clientName: clientName,
      frigoId: 'frigo-1',
      frigoName: 'Frigo MFADEL',
      date: date,
      items: items,
      totalKg: totalKg,
      totalPallets: totalPallets,
      totalHT: totalHT,
      totalTTC: totalTTC,
      frigoEmployeeApproved: true,
      frigoApprovedBy: 'Agent Frigo MFADEL',
      signedByClient: true,
      signatureDate: date,
      whatsappSent: true,
      emailSent: false,
      status: 'LIVRÉ',
      logs: [
        {
          id: `log-pdf-${index}`,
          timestamp: `${date} 09:00`,
          action: 'Bon de Livraison Historique Client (Logistique)',
          author: 'Super Admin',
        }
      ]
    });

    index++;
  });

  return result;
};

export const INITIAL_DELIVERY_NOTES: DeliveryNoteBL[] = [
  {
    id: 'bl-ste1-2026-5701',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-5701',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-10',
    items: [
      {
        id: 'item-5701-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 956.4,
        quantityPallets: 2,
        unitPriceHT: 18.33,
        totalHT: 17534,
        totalTTC: 21040.8
      }
    ],
    totalKg: 956.4,
    totalPallets: 2,
    totalHT: 17534,
    totalTTC: 21040.8,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l1', timestamp: '2026-08-10 09:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-3430',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-3430',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-10',
    items: [
      {
        id: 'item-3430-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 839.4,
        quantityPallets: 2,
        unitPriceHT: 18.33,
        totalHT: 15389,
        totalTTC: 18466.8
      }
    ],
    totalKg: 839.4,
    totalPallets: 2,
    totalHT: 15389,
    totalTTC: 18466.8,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l2', timestamp: '2026-08-10 09:15', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-1899',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-1899',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-10',
    items: [
      {
        id: 'item-1899-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 1788.8,
        quantityPallets: 4,
        unitPriceHT: 18.33,
        totalHT: 32794.67,
        totalTTC: 39353.6
      }
    ],
    totalKg: 1788.8,
    totalPallets: 4,
    totalHT: 32794.67,
    totalTTC: 39353.6,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l3', timestamp: '2026-08-10 10:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-4938',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-4938',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-10',
    items: [
      {
        id: 'item-4938-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 4100,
        quantityPallets: 8,
        unitPriceHT: 18.33,
        totalHT: 75166.67,
        totalTTC: 90200
      }
    ],
    totalKg: 4100,
    totalPallets: 8,
    totalHT: 75166.67,
    totalTTC: 90200,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l4', timestamp: '2026-08-10 10:30', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-6393',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-6393',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-10',
    items: [
      {
        id: 'item-6393-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 946.4,
        quantityPallets: 2,
        unitPriceHT: 18.33,
        totalHT: 17350.67,
        totalTTC: 20820.8
      }
    ],
    totalKg: 946.4,
    totalPallets: 2,
    totalHT: 17350.67,
    totalTTC: 20820.8,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l5', timestamp: '2026-08-10 11:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-4726',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-4726',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-06-14',
    items: [
      {
        id: 'item-4726-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 4680.4,
        quantityPallets: 9,
        unitPriceHT: 18.33,
        totalHT: 85807.33,
        totalTTC: 102968.8
      }
    ],
    totalKg: 4680.4,
    totalPallets: 9,
    totalHT: 85807.33,
    totalTTC: 102968.8,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l6', timestamp: '2026-06-14 09:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-0243',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-0243',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-06-27',
    items: [
      {
        id: 'item-0243-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 4729.1,
        quantityPallets: 9,
        unitPriceHT: 18.33,
        totalHT: 86700.17,
        totalTTC: 104040.2
      }
    ],
    totalKg: 4729.1,
    totalPallets: 9,
    totalHT: 86700.17,
    totalTTC: 104040.2,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l7', timestamp: '2026-06-27 09:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-8450',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-8450',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-aziz-fes',
    clientName: 'Aziz Fes',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-06-29',
    items: [
      {
        id: 'item-8450-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 4699.1,
        quantityPallets: 9,
        unitPriceHT: 18.33,
        totalHT: 86150.17,
        totalTTC: 103380.2
      }
    ],
    totalKg: 4699.1,
    totalPallets: 9,
    totalHT: 86150.17,
    totalTTC: 103380.2,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l8', timestamp: '2026-06-29 09:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-5109',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-5109',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-azzedine-agadir',
    clientName: 'AZZEDINE AGADIRE',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-10',
    items: [
      {
        id: 'item-5109-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 500,
        quantityPallets: 1,
        unitPriceHT: 18.33,
        totalHT: 9166.67,
        totalTTC: 11000
      }
    ],
    totalKg: 500,
    totalPallets: 1,
    totalHT: 9166.67,
    totalTTC: 11000,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l9', timestamp: '2026-08-10 12:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste1-2026-2737',
    companyId: 'STE_1',
    blNumber: 'BL-STE1-2026-2737',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-azzedine-agadir',
    clientName: 'AZZEDINE AGADIRE',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2025-06-16',
    items: [
      {
        id: 'item-2737-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 100,
        quantityPallets: 1,
        unitPriceHT: 18.33,
        totalHT: 1833.33,
        totalTTC: 2200
      }
    ],
    totalKg: 100,
    totalPallets: 1,
    totalHT: 1833.33,
    totalTTC: 2200,
    frigoEmployeeApproved: false,
    whatsappSent: false,
    emailSent: false,
    status: 'EN_ATTENTE_FRIGO',
    logs: [{ id: 'l10', timestamp: '2025-06-16 09:00', action: 'Création du Bon de Livraison', author: 'Super Admin' }]
  },
  {
    id: 'bl-ste2-2026-3304',
    companyId: 'STE_2',
    blNumber: 'BL-STE2-2026-3304',
    orderId: '',
    orderNumber: '',
    clientId: 'clt-ayoub-essaidy',
    clientName: 'Ayoub Essaidy',
    frigoId: 'frigo-1',
    frigoName: 'Frigo MFADEL',
    date: '2026-08-10',
    items: [
      {
        id: 'item-3304-1',
        productId: 'prd-std-5kg',
        productCode: 'STD 5 KG',
        productName: 'Dattes Standard 5 KG',
        quantityKg: 400,
        quantityPallets: 1,
        unitPriceHT: 18.33,
        totalHT: 7333.33,
        totalTTC: 8800
      }
    ],
    totalKg: 400,
    totalPallets: 1,
    totalHT: 7333.33,
    totalTTC: 8800,
    frigoEmployeeApproved: true,
    frigoApprovedBy: 'Super Admin',
    signedByClient: true,
    whatsappSent: true,
    emailSent: false,
    status: 'APPROUVÉ_FRIGO',
    logs: [{ id: 'l11', timestamp: '2026-08-10 13:00', action: 'Validation Quai Frigo', author: 'Super Admin' }]
  },
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
