import { Product, ColdStorageFrigo, FrigoStockLevel, DeliveryNoteBL, PurchaseImportInvoice, MultiSiteInventoryCount, ProductStockMovement } from '../types';
import { compileUnifiedFrigoMovements, UnifiedFrigoMovement } from './frigoStockMovements';

export interface ProductSynchronizedStock {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  origin: string;
  kgPerCarton: number;
  kgPerPallet: number;
  unitCostHT: number;
  sellingPriceHT: number;
  minStockAlertKg: number;
  
  // Total Consolidated Stock
  totalStockKg: number;
  totalStockPallets: number;
  totalStockCartons: number;
  
  // Cumul entries & exits
  totalEntriesKg: number;
  totalEntriesCartons: number;
  totalEntriesPallets: number;
  totalExitsKg: number;
  totalExitsCartons: number;
  totalExitsPallets: number;
  
  // Financial Valuations
  totalValuationCostHT: number;
  totalValuationSaleHT: number;
  potentialMarginHT: number;
  
  // Stock Status
  status: 'DISPONIBLE' | 'STOCK_FAIBLE' | 'RUPTURE';
  
  // Breakdown per Frigo
  frigoBreakdown: Array<{
    frigoId: string;
    frigoCode: string;
    frigoName: string;
    quantityKg: number;
    quantityPallets: number;
    quantityCartons: number;
    entriesKg: number;
    exitsKg: number;
  }>;
}

/**
 * Normalizes frigo matching across ID, Code, and Name
 */
export function isMatchingFrigo(frigo: ColdStorageFrigo, targetIdOrName?: string): boolean {
  if (!targetIdOrName) return false;
  const target = targetIdOrName.toLowerCase().trim();
  return (
    frigo.id.toLowerCase() === target ||
    frigo.code.toLowerCase() === target ||
    frigo.name.toLowerCase() === target ||
    frigo.name.toLowerCase().includes(target) ||
    target.includes(frigo.name.toLowerCase())
  );
}

/**
 * Normalizes product matching across ID, Code, and Name
 */
export function isMatchingProduct(product: Product, targetIdOrCode?: string, targetName?: string): boolean {
  if (targetIdOrCode) {
    const target = targetIdOrCode.toLowerCase().trim();
    if (product.id.toLowerCase() === target || product.code.toLowerCase() === target) {
      return true;
    }
  }
  if (targetName) {
    const cleanTargetName = targetName.toLowerCase().trim();
    const cleanPName = product.name.toLowerCase().trim();
    if (cleanPName === cleanTargetName || cleanPName.includes(cleanTargetName)) {
      return true;
    }
  }
  return false;
}

/**
 * Computes 100% synchronized and reconciled stock per product & per frigo
 */
export function computeSynchronizedStocks(params: {
  products: Product[];
  frigos: ColdStorageFrigo[];
  stocks: FrigoStockLevel[];
  purchaseInvoices: PurchaseImportInvoice[];
  deliveryNotes: DeliveryNoteBL[];
  inventoryCounts?: MultiSiteInventoryCount[];
  stockMovements?: ProductStockMovement[];
  selectedFrigoId?: string | 'ALL';
}): {
  productStocks: ProductSynchronizedStock[];
  totalConsolidatedKg: number;
  totalConsolidatedPallets: number;
  totalConsolidatedValuationCostHT: number;
  totalConsolidatedValuationSaleHT: number;
  lowStockCount: number;
  outOfStockCount: number;
} {
  const {
    products,
    frigos,
    stocks,
    purchaseInvoices,
    deliveryNotes,
    inventoryCounts = [],
    stockMovements = [],
    selectedFrigoId = 'ALL',
  } = params;

  // 1. Compile all unified movements (deduplicated)
  const allMovements = compileUnifiedFrigoMovements({
    frigos,
    products,
    stocks,
    deliveryNotes,
    purchaseInvoices,
    inventoryCounts,
    stockMovements,
    targetFrigoId: 'ALL',
    targetProductId: 'ALL'
  });

  const productStocks: ProductSynchronizedStock[] = products.map(prd => {
    const kgPerCarton = prd.kgPerCarton || 10;
    const kgPerPallet = prd.kgPerPallet || 500;
    const unitCostHT = prd.unitCostHT || 0;
    const sellingPriceHT = prd.sellingPriceHT || 0;
    const minStockAlertKg = prd.minStockAlertKg || 0;

    // Filter movements belonging to this product
    const prdMovements = allMovements.filter(m => 
      isMatchingProduct(prd, m.productId, m.productName) || 
      isMatchingProduct(prd, m.productCode, m.productName)
    );

    // Calculate per-frigo breakdown
    const frigoBreakdown = frigos.map(f => {
      // Movements in this frigo
      const fMovements = prdMovements.filter(m => 
        isMatchingFrigo(f, m.frigoId) || 
        isMatchingFrigo(f, m.frigoName)
      );

      const fEntries = fMovements.filter(m => m.isEntry);
      const fExits = fMovements.filter(m => !m.isEntry);

      const entriesKg = fEntries.reduce((sum, m) => sum + m.quantityKg, 0);
      const exitsKg = fExits.reduce((sum, m) => sum + m.quantityKg, 0);

      // Check if there is an explicit static stock record in stocks
      const explicitStock = stocks.find(s => 
        isMatchingFrigo(f, s.frigoId) && 
        isMatchingProduct(prd, s.productId)
      );

      let frigoKg = 0;
      let frigoPallets = 0;

      if (entriesKg > 0 || exitsKg > 0) {
        // Dynamic balance from actual purchases and delivery notes
        const movementBalanceKg = Math.max(0, entriesKg - exitsKg);
        frigoKg = Math.max(movementBalanceKg, explicitStock?.quantityKg || 0);
        frigoPallets = explicitStock && explicitStock.quantityPallets > 0
          ? explicitStock.quantityPallets
          : Math.max(1, Math.ceil(frigoKg / kgPerPallet));
      } else if (explicitStock && explicitStock.quantityKg > 0) {
        // No recorded movements, but explicit stock was configured
        frigoKg = explicitStock.quantityKg;
        frigoPallets = explicitStock.quantityPallets || Math.max(1, Math.ceil(frigoKg / kgPerPallet));
      }

      const frigoCartons = kgPerCarton > 0 ? Math.round(frigoKg / kgPerCarton) : 0;

      return {
        frigoId: f.id,
        frigoCode: f.code,
        frigoName: f.name,
        quantityKg: frigoKg,
        quantityPallets: frigoPallets,
        quantityCartons: frigoCartons,
        entriesKg,
        exitsKg,
      };
    });

    // Consolidated values (either all frigos or filtered by selectedFrigoId)
    const activeBreakdown = selectedFrigoId && selectedFrigoId !== 'ALL'
      ? frigoBreakdown.filter(fb => isMatchingFrigo(frigos.find(f => f.id === selectedFrigoId) || frigos[0], fb.frigoId))
      : frigoBreakdown;

    const totalStockKg = activeBreakdown.reduce((sum, fb) => sum + fb.quantityKg, 0);
    const totalStockPallets = activeBreakdown.reduce((sum, fb) => sum + fb.quantityPallets, 0);
    const totalStockCartons = kgPerCarton > 0 ? Math.round(totalStockKg / kgPerCarton) : 0;

    const totalEntriesKg = activeBreakdown.reduce((sum, fb) => sum + fb.entriesKg, 0);
    const totalEntriesCartons = kgPerCarton > 0 ? Math.round(totalEntriesKg / kgPerCarton) : 0;
    const totalEntriesPallets = Math.ceil(totalEntriesKg / kgPerPallet);

    const totalExitsKg = activeBreakdown.reduce((sum, fb) => sum + fb.exitsKg, 0);
    const totalExitsCartons = kgPerCarton > 0 ? Math.round(totalExitsKg / kgPerCarton) : 0;
    const totalExitsPallets = Math.ceil(totalExitsKg / kgPerPallet);

    const totalValuationCostHT = totalStockKg * unitCostHT;
    const totalValuationSaleHT = totalStockKg * sellingPriceHT;
    const potentialMarginHT = totalValuationSaleHT - totalValuationCostHT;

    let status: ProductSynchronizedStock['status'] = 'DISPONIBLE';
    if (totalStockKg <= 0) {
      status = 'RUPTURE';
    } else if (minStockAlertKg > 0 && totalStockKg <= minStockAlertKg) {
      status = 'STOCK_FAIBLE';
    }

    return {
      productId: prd.id,
      productCode: prd.code,
      productName: prd.name,
      category: prd.category,
      origin: prd.origin,
      kgPerCarton,
      kgPerPallet,
      unitCostHT,
      sellingPriceHT,
      minStockAlertKg,
      totalStockKg,
      totalStockPallets,
      totalStockCartons,
      totalEntriesKg,
      totalEntriesCartons,
      totalEntriesPallets,
      totalExitsKg,
      totalExitsCartons,
      totalExitsPallets,
      totalValuationCostHT,
      totalValuationSaleHT,
      potentialMarginHT,
      status,
      frigoBreakdown,
    };
  });

  const totalConsolidatedKg = productStocks.reduce((sum, p) => sum + p.totalStockKg, 0);
  const totalConsolidatedPallets = productStocks.reduce((sum, p) => sum + p.totalStockPallets, 0);
  const totalConsolidatedValuationCostHT = productStocks.reduce((sum, p) => sum + p.totalValuationCostHT, 0);
  const totalConsolidatedValuationSaleHT = productStocks.reduce((sum, p) => sum + p.totalValuationSaleHT, 0);
  const lowStockCount = productStocks.filter(p => p.status === 'STOCK_FAIBLE').length;
  const outOfStockCount = productStocks.filter(p => p.status === 'RUPTURE').length;

  return {
    productStocks,
    totalConsolidatedKg,
    totalConsolidatedPallets,
    totalConsolidatedValuationCostHT,
    totalConsolidatedValuationSaleHT,
    lowStockCount,
    outOfStockCount,
  };
}

/**
 * Builds normalized FrigoStockLevel[] array from synchronized product stocks
 */
export function buildReconciledStockLevels(
  productStocks: ProductSynchronizedStock[]
): FrigoStockLevel[] {
  const result: FrigoStockLevel[] = [];
  const now = new Date().toISOString();

  productStocks.forEach(p => {
    p.frigoBreakdown.forEach(fb => {
      result.push({
        id: `stk-${fb.frigoId}-${p.productId}`,
        frigoId: fb.frigoId,
        productId: p.productId,
        quantityKg: fb.quantityKg,
        quantityPallets: fb.quantityPallets,
        lastUpdated: now,
      });
    });
  });

  return result;
}
