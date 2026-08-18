export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'CONTROLEUR' 
  | 'AGENT_STOCK' 
  | 'RESPONSABLE_FRIGO' 
  | 'COMPTABLE_FACTURES'
  | 'ADMIN' 
  | 'COMMERCIAL' 
  | 'COMPTABLE';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedFrigoId?: string; // If RESPONSABLE_FRIGO, bound to specific frigo
  avatar?: string;
}

export type ProductCategory = 
  | 'Dattes Locales' 
  | 'Dattes Importées' 
  | 'Fruits Secs' 
  | 'Huiles & Condiments' 
  | 'Autres Produits Alimentaires';

export interface Product {
  id: string;
  code: string; // Automatic e.g. PRD-DAT-001
  name: string;
  category: ProductCategory;
  origin: string; // e.g. "Maroc (Errachidia)", "Arabie Saoudite", "Tunisie", "Égypte"
  sellingPriceHT: number; // Prix de vente unitaire HT / kg
  unitCostHT: number; // Prix de revient unitaire HT / kg
  costPriceHT?: number; // Alias for compatibility
  vatRate: number; // e.g. 20% or 0%
  kgPerCarton: number; // e.g. 10 kg
  cartonsPerPallet: number; // e.g. 80 cartons
  kgPerPallet: number; // Derived: kgPerCarton * cartonsPerPallet (e.g. 800 kg)
  minStockAlertKg: number; // Stock d'alerte global en kg
  description?: string;
  imageUrl?: string;
}

export interface ColdStorageFrigo {
  id: string;
  code: string; // e.g. FRG-CAS-01
  name: string; // e.g. "Frigo A - Port Casablanca"
  location: string;
  managerName: string;
  managerPhone: string;
  whatsappGroup: string; // e.g. "Groupe WhatsApp Frigo Port"
  whatsappGroupLink: string;
  capacityPallets: number;
}

export interface FrigoStockLevel {
  id?: string;
  productId: string;
  frigoId: string;
  quantityKg: number;
  quantityPallets: number;
  lastUpdated: string;
}

export type StockMovementType = 'ENTRÉE_INVENTAIRE' | 'ENTRÉE_ACHAT' | 'SORTIE_BL' | 'TRANSFERT_INTER_FRIGO' | 'AJUSTEMENT_MANUEL' | 'EXPÉDITION_VENTE';

export interface ProductStockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  frigoId: string;
  frigoName: string;
  type: StockMovementType;
  quantityKg: number;
  previousStockKg: number;
  newStockKg: number;
  referenceDoc?: string; // BL Number, Order Number, Purchase Invoice Number
  date: string;
  performedBy?: string;
  notes?: string;
}

export interface InventoryCountItem {
  productId: string;
  theoreticalKg: number;
  physicalKg: number;
  theoreticalPallets: number;
  physicalPallets: number;
  differenceKg: number;
  notes?: string;
}

export interface MultiSiteInventoryCount {
  id: string;
  countNumber: string; // e.g. INV-2026-001
  frigoId: string;
  date: string;
  conductedBy: string;
  status: 'BROUILLON' | 'VALIDÉ' | 'AJUSTÉ';
  items: InventoryCountItem[];
}

export interface Client {
  id: string;
  code: string; // e.g. CLT-001
  name: string;
  companyName: string;
  ice: string; // Identifiant Commun de l'Entreprise (ICE)
  email: string;
  phone: string;
  address: string;
  city: string;
  creditLimit: number;
  currentBalance: number; // Solde dû par le client
  balance?: number; // Alias for compatibility
}

export interface Supplier {
  id: string;
  code: string; // e.g. FRS-001
  name: string;
  companyName: string;
  country: string; // e.g. "Maroc", "Arabie Saoudite", "Égypte", "Tunisie"
  iceOrTaxId: string;
  email: string;
  phone: string;
  address: string;
  type: 'LOCAL' | 'IMPORTATION';
  currentBalance: number; // Solde dû au fournisseur
}

export interface PurchaseInvoicePayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  bankName?: string;
  notes?: string;
}

export interface PurchaseImportInvoice {
  id: string;
  invoiceNumber: string; // Facture Fournisseur / Conteneur
  supplierId: string;
  supplierName: string;
  dateArrival: string;
  targetFrigoId: string;
  isImport: boolean;
  containerNumber?: string;
  customsCostsHT: number; // Frais de douane / transit
  freightCostsHT: number; // Transport maritime / terrestre
  totalProductsHT: number;
  totalLandedCostHT: number;
  paidAmount?: number;
  remainingBalance?: number;
  items: {
    productId: string;
    productName: string;
    productCode: string;
    quantityKg: number;
    quantityCartons?: number;
    theoreticalKg?: number;
    weighedKg?: number;
    isWeighed?: boolean;
    quantityPallets: number;
    purchaseUnitPriceHT: number;
    landedCostPerKgHT: number;
    totalHT: number;
  }[];
  notes?: string;
  paymentStatus: 'NON_PAYÉ' | 'PARTIEL' | 'PAYÉ';
  payments?: PurchaseInvoicePayment[];
}

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  category: ProductCategory;
  frigoId: string; // Designated cold storage for this item
  quantityKg: number;
  quantityCartons?: number;
  theoreticalKg?: number;
  weighedKg?: number;
  isWeighed?: boolean;
  quantityPallets: number;
  unitPriceHT: number;
  vatRate: number;
  totalHT: number;
  totalTTC: number;
  unitCostHT: number; // For margin calculations
}

export type OrderStatus = 'DEVIS' | 'VALIDÉE' | 'EN_PRÉPARATION' | 'EXPÉDIÉE' | 'LIVRÉE' | 'LIVRÉE_PARTIEL' | 'ANNULÉE' | 'NOUVEAU';

export interface SalesOrder {
  id: string;
  orderNumber: string; // e.g. CMD-2026-0042
  clientId: string;
  clientName: string;
  clientICE: string;
  clientPhone: string;
  clientEmail: string;
  date: string;
  expectedDeliveryDate: string;
  status: OrderStatus;
  items: OrderItem[];
  totalKg?: number;
  totalPallets?: number;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  totalCostHT: number;
  grossMarginHT: number;
  marginHT?: number;
  marginPercentage: number;
  marginPct?: number;
  blGenerated?: boolean;
  notes?: string;
  createdByName: string;
}

export interface DeliveryNoteItem {
  productId: string;
  productCode: string;
  productName: string;
  quantityKg: number;
  quantityCartons?: number;
  theoreticalKg?: number;
  weighedKg?: number;
  isWeighed?: boolean;
  quantityPallets: number;
  unitPriceHT: number;
  totalHT: number;
}

export interface DeliveryNoteLog {
  id: string;
  timestamp: string;
  action: string;
  author: string;
  notes?: string;
}

export interface CompanyEntity {
  id: string;
  code: string;
  name: string;
  shortName: string;
  ice: string;
  taxId: string;
  rc: string;
  patent: string;
  capital: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoUrl?: string;
  bankName: string;
  bankRib: string;
  blPrefix: string;
  invoicePrefix: string;
}

export interface DeliveryNoteBL {
  id: string;
  companyId?: string; // Active company entity (e.g. STE1 or STE2)
  blNumber: string; // e.g. BL-STE1-2026-0189
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  frigoId: string;
  frigoName: string;
  date: string;
  items: DeliveryNoteItem[];
  totalKg: number;
  totalCartons?: number;
  totalPallets: number;
  totalHT: number;
  totalTTC: number;

  // Multi-frigo approval flow
  stockDecremented?: boolean;
  frigoEmployeeApproved: boolean;

  frigoApprovedBy?: string;
  frigoApprovedAt?: string;

  // Photo du Bon de Sortie Physique du Frigo (Validation Chargement Quai)
  bonDeSortiePhotoUrl?: string;
  bonDeSortieUploadedBy?: string;
  bonDeSortieUploadedAt?: string;

  // WhatsApp group notification log
  whatsappSent: boolean;
  whatsappSentAt?: string;

  // Signature
  clientSignatureUrl?: string; // Data URL of drawn canvas signature
  signedByName?: string;
  signedAt?: string;

  // Email delivery log
  emailSent: boolean;
  emailSentAt?: string;
  emailRecipient?: string;

  // Invoice link (set when invoice is created from this BL)
  invoiceId?: string;
  invoiceNumber?: string;

  // Status
  status: 'EN_ATTENTE_FRIGO' | 'APPROUVÉ_FRIGO' | 'EN_COURS_LIVRAISON' | 'LIVRÉ' | 'FACTURÉ';

  // Audit history
  logs: DeliveryNoteLog[];
}

export interface InvoiceItem {
  productId: string;
  productCode: string;
  productName: string;
  quantityKg: number;
  quantityPallets: number;
  unitPriceHT: number;
  vatRate: number;
  totalHT: number;
  totalTTC: number;
}

export type InvoiceStatus = 'BROUILLON' | 'EMISE' | 'PAYEE_PARTIEL' | 'PAYEE' | 'EN_RETARD' | 'ANNULEE';

export interface Invoice {
  id: string;
  companyId?: string; // Active company entity (e.g. STE1 or STE2)
  invoiceNumber: string; // e.g. FAC-STE1-2026-0098
  orderId?: string;
  blId?: string;
  blIds?: string[];

  clientId: string;
  clientName: string;
  clientICE: string;
  clientAddress: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  amountPaid: number;
  paidAmount?: number;
  remainingAmount: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
}

export type PaymentMethod = 'CHEQUE' | 'EFFET' | 'ESPECES' | 'VIREMENT' | 'VERSEMENT';
export type ChequeEffetStatus = 'EN_PORTEFEUILLE' | 'DEPOSE' | 'ENCAISSE' | 'IMPAYE_REJETE' | 'IMPAYE';

export interface ChequeEffet {
  id: string;
  referenceNumber: string; // Numéro de chèque ou d'effet
  type: 'CHEQUE' | 'EFFET';
  direction: 'RECETTE_CLIENT' | 'DEPENSE_FOURNISSEUR';
  partyId: string; // Client ID or Supplier ID
  partyName: string;
  clientId?: string;
  clientName?: string;
  supplierId?: string;
  supplierName?: string;
  bankName: string; // e.g. Attijariwafa, BMCE, BP, CIH, SG
  amount: number;
  issueDate: string;
  dueDate: string; // Date d'échéance
  depositDate?: string;
  clearedDate?: string;
  status: ChequeEffetStatus;
  notes?: string;
  invoiceId?: string;
}

export interface TreasuryAccount {
  id: string;
  name: string; // e.g. "Banque Attijariwafa Principal", "Caisse Espèces Bureau"
  accountNumber: string;
  type: 'BANQUE' | 'CAISSE';
  balance: number;
}

export interface Expense {
  id: string;
  expenseNumber: string; // e.g. DEP-2026-045
  date: string;
  category: 'Frais de Froid / Frigo' | 'Transport & Logistique' | 'Douane & Transit' | 'Emballage & Palettisation' | 'Salaires & Manutention' | 'Divers';
  frigoId?: string; // Optional frigo attribution
  supplierOrPayee: string;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  receiptUrl?: string;
}

export interface WhatsAppGroupTemplate {
  frigoId: string;
  frigoName: string;
  groupName: string;
  link: string;
}

export interface CompanyInfo {
  name: string;
  ice: string; // Identifiant Commun de l'Entreprise
  rc: string; // Registre du Commerce
  if: string; // Identifiant Fiscal
  cnss: string; // Numéro CNSS
  patente: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  bankName: string;
  rib: string;
  swift: string;
  capital: string;
}

export interface RecalculationReportItem {
  blId: string;
  blNumber: string;
  clientName: string;
  date: string;
  status: 'UPDATED' | 'NO_CHANGE' | 'FAILED';
  errorMessage?: string;
  oldTotalHT: number;
  newTotalHT: number;
  itemsUpdatedCount: number;
  updatedDetails: {
    productName: string;
    productCode: string;
    oldPrice: number;
    newPrice: number;
    quantityKg: number;
  }[];
}

export interface RecalculationSummaryReport {
  totalBLsScanned: number;
  updatedBLsCount: number;
  unchangedBLsCount: number;
  failedBLsCount: number;
  totalItemsUpdated: number;
  totalFinancialImpactHT: number;
  timestamp: string;
  details: RecalculationReportItem[];
}
