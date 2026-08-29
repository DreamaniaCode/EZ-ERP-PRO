import { DeliveryNoteBL, PurchaseImportInvoice, MultiSiteInventoryCount, ProductStockMovement, Product, ColdStorageFrigo, FrigoStockLevel } from '../types';

export interface UnifiedFrigoMovement {
  id: string;
  rawDate: string; // ISO or date string for sorting
  date: string; // e.g. "26/08/2026"
  time: string; // e.g. "14:32:10"
  type: 'ENTRÉE_ACHAT' | 'ENTRÉE_STOCK' | 'SORTIE_BL' | 'TRANSFERT_INTER_FRIGO' | 'AJUSTEMENT_INVENTAIRE' | 'AJUSTEMENT_MANUEL';
  isEntry: boolean;
  documentRef: string;
  orderRef?: string;
  frigoId: string;
  frigoName: string;
  productId: string;
  productCode: string;
  productName: string;
  productCategory?: string;
  kgPerCarton: number;
  quantityKg: number; // Signed or absolute depending on display, here we keep absolute for magnitude and signed for delta
  signedKg: number; // +500 or -500
  quantityPallets: number;
  signedPallets: number;
  quantityCartons: number;
  signedCartons: number;
  unitPriceHT?: number;
  totalHT?: number;
  partyName: string; // Client name, Supplier name, or Staff
  partyType: 'CLIENT' | 'FOURNISSEUR' | 'INTERNE';
  status?: string;
  performedBy?: string;
  notes?: string;
  photoUrl?: string;
  balanceAfterKg?: number;
  blId?: string;
  invoiceId?: string;
  purchaseInvoiceId?: string;
}

export interface ProductAccumulationSummary {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  origin: string;
  kgPerCarton: number;
  kgPerPallet: number;
  unitCostHT: number;
  sellingPriceHT: number;
  
  // Total Entries
  totalEntriesKg: number;
  totalEntriesCartons: number;
  totalEntriesPallets: number;
  entriesCount: number;

  // Total Exits
  totalExitsKg: number;
  totalExitsCartons: number;
  totalExitsPallets: number;
  exitsCount: number;

  // Current Stock Remaining
  currentStockKg: number;
  currentStockCartons: number;
  currentStockPallets: number;

  // Financial Valuations
  totalValuationCostHT: number;
  totalValuationSaleHT: number;
  potentialMarginHT: number;
  marginPercent: number;

  // Movement & Rotation
  turnoverRatePercent: number;
  lastMovementDate?: string;
  lastMovementTime?: string;
  lastMovementType?: string;

  // Status
  stockStatus: 'EN_STOCK' | 'STOCK_FAIBLE' | 'RUPTURE';
}

/**
 * Extracts clean Date and Time components from various ERP timestamp formats
 */
export function extractDateAndTime(dateStr?: string, fallbackTimestamp?: string | number): { date: string; time: string; timestampMs: number } {
  const now = new Date();
  
  if (!dateStr && !fallbackTimestamp) {
    const d = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const t = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date: d, time: t, timestampMs: now.getTime() };
  }

  // 1. Try to extract time / ms from fallbackTimestamp (e.g. ID like 'pur-1787764669971' or ISO date)
  let fallbackDate: Date | null = null;
  if (fallbackTimestamp) {
    const rawStr = String(fallbackTimestamp);
    const digitsMatch = rawStr.match(/(\d{10,13})/);
    if (digitsMatch) {
      const numMs = Number(digitsMatch[1]);
      if (!isNaN(numMs) && numMs > 1500000000000 && numMs < 3000000000000) {
        fallbackDate = new Date(numMs);
      }
    } else if (rawStr.includes('T') || rawStr.includes(':')) {
      const tempFb = new Date(rawStr);
      if (!isNaN(tempFb.getTime())) fallbackDate = tempFb;
    }
  }

  // 2. Parse dateStr
  let parsedDate: Date;
  const rawDateStr = (dateStr && typeof dateStr === 'object' && (dateStr as any) instanceof Date) 
    ? (dateStr as unknown as Date).toISOString() 
    : (dateStr ? String(dateStr) : '');
  if (rawDateStr && (rawDateStr.includes('T') || rawDateStr.includes(' '))) {
    const temp = new Date(rawDateStr);
    parsedDate = isNaN(temp.getTime()) ? (fallbackDate || now) : temp;
  } else if (rawDateStr) {
    const parts = rawDateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const da = parseInt(parts[2], 10);
      if (fallbackDate) {
        parsedDate = new Date(yr, mo, da, fallbackDate.getHours(), fallbackDate.getMinutes(), fallbackDate.getSeconds());
      } else {
        const isToday = now.getFullYear() === yr && now.getMonth() === mo && now.getDate() === da;
        if (isToday) {
          parsedDate = new Date(yr, mo, da, now.getHours(), now.getMinutes(), now.getSeconds());
        } else {
          parsedDate = new Date(yr, mo, da, 12, 0, 0);
        }
      }
    } else {
      parsedDate = new Date(rawDateStr);
      if (isNaN(parsedDate.getTime())) parsedDate = fallbackDate || now;
    }
  } else {
    parsedDate = fallbackDate || now;
  }

  // Format in standard French DD/MM/YYYY
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();
  const dateFormatted = `${day}/${month}/${year}`;

  const hours = String(parsedDate.getHours()).padStart(2, '0');
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
  const timeFormatted = `${hours}:${minutes}:${seconds}`;

  return {
    date: dateFormatted,
    time: timeFormatted,
    timestampMs: parsedDate.getTime()
  };
}

/**
 * Compiles all movements across BLs, Purchases, Inventory adjustments, and Stock transfers
 * for a specific Frigo (or all Frigos) and an optional product filter.
 */
export function compileUnifiedFrigoMovements(params: {
  frigos: ColdStorageFrigo[];
  products: Product[];
  stocks: FrigoStockLevel[];
  deliveryNotes: DeliveryNoteBL[];
  purchaseInvoices: PurchaseImportInvoice[];
  inventoryCounts: MultiSiteInventoryCount[];
  stockMovements?: ProductStockMovement[];
  targetFrigoId?: string | 'ALL';
  targetProductId?: string | 'ALL';
}): UnifiedFrigoMovement[] {
  const {
    frigos,
    products,
    deliveryNotes,
    purchaseInvoices,
    inventoryCounts,
    stockMovements = [],
    targetFrigoId = 'ALL',
    targetProductId = 'ALL'
  } = params;

  const results: UnifiedFrigoMovement[] = [];
  const processedDocKeys = new Set<string>();

  const isFrigoMatch = (fId?: string, fName?: string) => {
    if (!targetFrigoId || targetFrigoId === 'ALL') return true;
    if (!fId && !fName) return false;
    const targetFrigo = frigos.find(f => f.id === targetFrigoId);
    if (!targetFrigo) return false;
    const cleanTargetId = (targetFrigo.id || '').toLowerCase().trim();
    const cleanTargetCode = (targetFrigo.code || '').toLowerCase().trim();
    const cleanTargetName = (targetFrigo.name || '').toLowerCase().trim();
    const baseTargetName = cleanTargetName.replace(/\(.*?\)/g, '').trim();

    if (fId) {
      const cId = fId.toLowerCase().trim();
      if (cId === cleanTargetId || cId === cleanTargetCode || cId === cleanTargetName || cId === baseTargetName) return true;
    }
    if (fName) {
      const cName = fName.toLowerCase().trim();
      const baseName = cName.replace(/\(.*?\)/g, '').trim();
      if (cName === cleanTargetName || (baseName && baseTargetName && baseName === baseTargetName) || cName === cleanTargetId) return true;
    }
    return false;
  };

  const isProductMatch = (pId: string, pCode?: string, pName?: string) => {
    if (!targetProductId || targetProductId === 'ALL') return true;
    if (pId === targetProductId) return true;
    const targetPrd = products.find(p => p.id === targetProductId);
    if (!targetPrd) return false;
    if (pCode && pCode.toLowerCase() === targetPrd.code.toLowerCase()) return true;
    if (pName && targetPrd.name && pName.toLowerCase().includes(targetPrd.name.toLowerCase())) return true;
    return false;
  };

  // 1. DELIVERY NOTES (SORTIES BL)
  deliveryNotes.forEach(bl => {
    if (!isFrigoMatch(bl.frigoId, bl.frigoName)) return;

    const frigoObj = frigos.find(f => 
      (bl.frigoId && (f.id === bl.frigoId || f.code === bl.frigoId)) || 
      (bl.frigoName && f.name.toLowerCase().trim() === bl.frigoName.toLowerCase().trim())
    ) || {
      id: bl.frigoId || '',
      name: bl.frigoName || 'Entrepôt Inconnu',
      code: 'FRG',
    };

    // Extract exact date and time from log or BL properties
    const logTimestamp = bl.logs && bl.logs.length > 0 ? bl.logs[0].timestamp : undefined;
    const approvalTimestamp = bl.frigoApprovedAt || bl.signedAt;
    const { date, time, timestampMs } = extractDateAndTime(bl.date, logTimestamp || approvalTimestamp);

    (bl.items || []).forEach((item, itemIdx) => {
      const prd = products.find(p => p.id === item.productId || p.code === item.productCode);
      const prdId = prd?.id || item.productId || `prd-${itemIdx}`;
      const prdCode = prd?.code || item.productCode || 'PRD';
      const prdName = prd?.name || item.productName || 'Produit';

      if (!isProductMatch(prdId, prdCode, prdName)) return;

      const kgPerCarton = prd?.kgPerCarton || 10;
      const qtyKg = Math.abs(Number(item.quantityKg) || 0);
      const qtyCartons = item.quantityCartons ? Math.abs(item.quantityCartons) : Math.round(qtyKg / kgPerCarton);
      const qtyPallets = item.quantityPallets ? Math.abs(item.quantityPallets) : Math.max(1, Math.ceil(qtyKg / (prd?.kgPerPallet || 500)));

      const movementKey = `bl-${bl.id}-${prdId}`;
      processedDocKeys.add(movementKey);
      if (bl.blNumber) {
        processedDocKeys.add(`bl-${bl.blNumber}-${prdId}`);
        processedDocKeys.add(`bl-${bl.blNumber}`);
        processedDocKeys.add(`doc-${bl.blNumber}`);
      }

      results.push({
        id: `mv-${movementKey}`,
        rawDate: new Date(timestampMs).toISOString(),
        date,
        time,
        type: 'SORTIE_BL',
        isEntry: false,
        documentRef: bl.blNumber,
        orderRef: bl.orderNumber,
        frigoId: frigoObj.id,
        frigoName: frigoObj.name,
        productId: prdId,
        productCode: prdCode,
        productName: prdName,
        productCategory: prd?.category,
        kgPerCarton,
        quantityKg: qtyKg,
        signedKg: -qtyKg,
        quantityPallets: qtyPallets,
        signedPallets: -qtyPallets,
        quantityCartons: qtyCartons,
        signedCartons: -qtyCartons,
        unitPriceHT: item.unitPriceHT || prd?.sellingPriceHT || 0,
        totalHT: item.totalHT || (qtyKg * (item.unitPriceHT || 0)),
        partyName: bl.clientName || 'Client Quai',
        partyType: 'CLIENT',
        status: bl.status,
        performedBy: bl.frigoApprovedBy || 'Agent Frigo',
        notes: bl.frigoEmployeeApproved ? `Validation Quai Frigo (${bl.frigoApprovedBy || 'OK'})` : 'En attente validation quai',
        photoUrl: bl.bonDeSortiePhotoUrl,
        blId: bl.id,
        invoiceId: bl.invoiceId
      });
    });
  });

  // 2. PURCHASE / IMPORT INVOICES (ENTRÉES ACHAT / CONTENEURS)
  purchaseInvoices.forEach(pur => {
    if (!isFrigoMatch(pur.targetFrigoId)) return;

    const frigoObj = frigos.find(f => 
      (pur.targetFrigoId && (f.id === pur.targetFrigoId || f.code === pur.targetFrigoId))
    ) || {
      id: pur.targetFrigoId || '',
      name: 'Entrepôt Inconnu',
      code: 'FRG',
    };

    const { date, time, timestampMs } = extractDateAndTime(pur.dateArrival, (pur as any).createdAt || (pur as any).timeArrival || pur.id);

    (pur.items || []).forEach((item, itemIdx) => {
      const prd = products.find(p => p.id === item.productId || p.code === item.productCode);
      const prdId = prd?.id || item.productId || `prd-${itemIdx}`;
      const prdCode = prd?.code || item.productCode || 'PRD';
      const prdName = prd?.name || item.productName || 'Produit';

      if (!isProductMatch(prdId, prdCode, prdName)) return;

      const kgPerCarton = prd?.kgPerCarton || 10;
      const qtyKg = Math.abs(Number(item.quantityKg) || 0);
      const qtyCartons = item.quantityCartons ? Math.abs(item.quantityCartons) : Math.round(qtyKg / kgPerCarton);
      const qtyPallets = item.quantityPallets ? Math.abs(item.quantityPallets) : Math.max(1, Math.ceil(qtyKg / (prd?.kgPerPallet || 500)));

      const movementKey = `pur-${pur.id}-${prdId}`;
      processedDocKeys.add(movementKey);
      if (pur.invoiceNumber) {
        processedDocKeys.add(`pur-${pur.invoiceNumber}-${prdId}`);
        processedDocKeys.add(`pur-${pur.invoiceNumber}`);
        processedDocKeys.add(`doc-${pur.invoiceNumber}`);
      }

      results.push({
        id: `mv-${movementKey}`,
        rawDate: new Date(timestampMs).toISOString(),
        date,
        time,
        type: 'ENTRÉE_ACHAT',
        isEntry: true,
        documentRef: pur.invoiceNumber || 'Facture Fournisseur',
        frigoId: frigoObj.id,
        frigoName: frigoObj.name,
        productId: prdId,
        productCode: prdCode,
        productName: prdName,
        productCategory: prd?.category,
        kgPerCarton,
        quantityKg: qtyKg,
        signedKg: qtyKg,
        quantityPallets: qtyPallets,
        signedPallets: qtyPallets,
        quantityCartons: qtyCartons,
        signedCartons: qtyCartons,
        unitPriceHT: item.landedCostPerKgHT || item.purchaseUnitPriceHT || prd?.unitCostHT || 0,
        totalHT: item.totalHT || (qtyKg * (item.landedCostPerKgHT || item.purchaseUnitPriceHT || 0)),
        partyName: pur.supplierName || 'Fournisseur / Import',
        partyType: 'FOURNISSEUR',
        status: pur.paymentStatus,
        performedBy: 'Service Réception / Douane',
        notes: pur.containerNumber ? `Conteneur : ${pur.containerNumber}` : 'Réception Fournisseur',
        purchaseInvoiceId: pur.id
      });
    });
  });

  // 3. INVENTORY COUNTS (AJUSTEMENTS D'INVENTAIRE)
  inventoryCounts.forEach(count => {
    if (!isFrigoMatch(count.frigoId)) return;

    const frigoObj = frigos.find(f => f.id === count.frigoId) || {
      id: count.frigoId,
      name: 'Entrepôt Inventaire',
      code: 'FRG'
    };

    const { date, time, timestampMs } = extractDateAndTime(count.date);

    (count.items || []).forEach((item, itemIdx) => {
      const prd = products.find(p => p.id === item.productId);
      const prdId = prd?.id || item.productId || `prd-${itemIdx}`;
      const prdCode = prd?.code || 'PRD';
      const prdName = prd?.name || 'Produit';

      if (!isProductMatch(prdId, prdCode, prdName)) return;

      const diffKg = Number(item.differenceKg) || 0;
      if (diffKg === 0) return; // Skip zero diff

      const isEntry = diffKg > 0;
      const kgPerCarton = prd?.kgPerCarton || 10;
      const qtyKg = Math.abs(diffKg);
      const diffPallets = item.physicalPallets - item.theoreticalPallets;
      const qtyPallets = Math.abs(diffPallets);
      const qtyCartons = Math.round(qtyKg / kgPerCarton);

      const movementKey = `inv-${count.id}-${prdId}`;
      processedDocKeys.add(movementKey);
      if (count.countNumber) {
        processedDocKeys.add(`inv-${count.countNumber}-${prdId}`);
        processedDocKeys.add(`inv-${count.countNumber}`);
        processedDocKeys.add(`doc-${count.countNumber}`);
      }

      results.push({
        id: `mv-${movementKey}`,
        rawDate: new Date(timestampMs).toISOString(),
        date,
        time,
        type: 'AJUSTEMENT_INVENTAIRE',
        isEntry,
        documentRef: count.countNumber,
        frigoId: frigoObj.id,
        frigoName: frigoObj.name,
        productId: prdId,
        productCode: prdCode,
        productName: prdName,
        productCategory: prd?.category,
        kgPerCarton,
        quantityKg: qtyKg,
        signedKg: diffKg,
        quantityPallets: qtyPallets,
        signedPallets: diffPallets,
        quantityCartons: qtyCartons,
        signedCartons: isEntry ? qtyCartons : -qtyCartons,
        unitPriceHT: prd?.unitCostHT || 0,
        totalHT: qtyKg * (prd?.unitCostHT || 0),
        partyName: count.conductedBy || 'Responsable Inventaire',
        partyType: 'INTERNE',
        status: count.status,
        performedBy: count.conductedBy,
        notes: item.notes || `Écart physique: Théo=${item.theoreticalKg}kg / Réel=${item.physicalKg}kg`
      });
    });
  });

  // 4. DATABASE / RECORDED STOCK MOVEMENTS (Transfers, Manual Adjustments, etc.)
  stockMovements.forEach(sm => {
    if (!isFrigoMatch(sm.frigoId, sm.frigoName)) return;
    if (!isProductMatch(sm.productId, sm.productCode, sm.productName)) return;

    // Check if this movement was already captured by BL / Purchase / Inv via processed keys
    if (sm.referenceDoc) {
      const refClean = sm.referenceDoc.trim();
      if (
        processedDocKeys.has(`bl-${refClean}-${sm.productId}`) ||
        processedDocKeys.has(`pur-${refClean}-${sm.productId}`) ||
        processedDocKeys.has(`inv-${refClean}-${sm.productId}`) ||
        processedDocKeys.has(`bl-${refClean}`) ||
        processedDocKeys.has(`pur-${refClean}`) ||
        processedDocKeys.has(`inv-${refClean}`) ||
        processedDocKeys.has(`doc-${refClean}`)
      ) {
        return;
      }
    }

    // Direct deduplication against Purchase Invoices
    const isAlreadyPurchase = purchaseInvoices.some(pur => {
      if (sm.referenceDoc && (sm.referenceDoc === pur.invoiceNumber || sm.referenceDoc === pur.id)) return true;
      if (sm.notes && pur.invoiceNumber && sm.notes.includes(pur.invoiceNumber)) return true;
      return false;
    });
    if (isAlreadyPurchase) return;

    // Direct deduplication against Delivery Notes (BLs)
    const isAlreadyBL = deliveryNotes.some(bl => {
      if (sm.referenceDoc && (sm.referenceDoc === bl.blNumber || sm.referenceDoc === bl.id)) return true;
      if (sm.notes && bl.blNumber && sm.notes.includes(bl.blNumber)) return true;
      return false;
    });
    if (isAlreadyBL) return;

    // Direct deduplication against Inventory Counts
    const isAlreadyInv = inventoryCounts.some(inv => {
      if (sm.referenceDoc && (sm.referenceDoc === inv.countNumber || sm.referenceDoc === inv.id)) return true;
      return false;
    });
    if (isAlreadyInv) return;

    const { date, time, timestampMs } = extractDateAndTime(sm.date);
    const prd = products.find(p => p.id === sm.productId || p.code === sm.productCode);
    const kgPerCarton = prd?.kgPerCarton || 10;
    const qtyKg = Math.abs(Number(sm.quantityKg) || 0);
    const isEntry = sm.type.includes('ENTRÉE') || sm.type.includes('ENTREE') || (sm.newStockKg > sm.previousStockKg);

    let normType: UnifiedFrigoMovement['type'] = 'AJUSTEMENT_MANUEL';
    if (sm.type.includes('ACHAT')) normType = 'ENTRÉE_ACHAT';
    else if (sm.type.includes('BL') || sm.type.includes('VENTE')) normType = 'SORTIE_BL';
    else if (sm.type.includes('TRANSFERT')) normType = 'TRANSFERT_INTER_FRIGO';
    else if (sm.type.includes('INVENTAIRE')) normType = 'AJUSTEMENT_INVENTAIRE';
    else if (isEntry) normType = 'ENTRÉE_STOCK';

    results.push({
      id: sm.id || `mv-sm-${Date.now()}-${Math.random()}`,
      rawDate: new Date(timestampMs).toISOString(),
      date,
      time,
      type: normType,
      isEntry,
      documentRef: sm.referenceDoc || (normType === 'TRANSFERT_INTER_FRIGO' ? 'TRF-INTER-FRIGO' : 'AJUST-MANUEL'),
      frigoId: sm.frigoId,
      frigoName: sm.frigoName || 'Entrepôt',
      productId: sm.productId,
      productCode: sm.productCode || prd?.code || 'PRD',
      productName: sm.productName || prd?.name || 'Produit',
      productCategory: prd?.category,
      kgPerCarton,
      quantityKg: qtyKg,
      signedKg: isEntry ? qtyKg : -qtyKg,
      quantityPallets: Math.max(1, Math.ceil(qtyKg / (prd?.kgPerPallet || 500))),
      signedPallets: isEntry ? Math.ceil(qtyKg / 500) : -Math.ceil(qtyKg / 500),
      quantityCartons: Math.round(qtyKg / kgPerCarton),
      signedCartons: isEntry ? Math.round(qtyKg / kgPerCarton) : -Math.round(qtyKg / kgPerCarton),
      unitPriceHT: prd?.unitCostHT || 0,
      totalHT: qtyKg * (prd?.unitCostHT || 0),
      partyName: sm.performedBy || 'Responsable Frigo',
      partyType: 'INTERNE',
      performedBy: sm.performedBy,
      notes: sm.notes || `Stock: ${sm.previousStockKg || 0}kg ➔ ${sm.newStockKg || 0}kg`
    });
  });

  // Sort descending by timestamp (most recent movements first)
  results.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

  return results;
}

/**
 * Calculates the complete Product Accumulation Summary ("cumule en produits")
 * for each product in the warehouse or whole ERP.
 */
export function calculateProductAccumulation(params: {
  products: Product[];
  stocks: FrigoStockLevel[];
  movements: UnifiedFrigoMovement[];
  frigos: ColdStorageFrigo[];
  targetFrigoId?: string | 'ALL';
}): ProductAccumulationSummary[] {
  const {
    products,
    stocks,
    movements,
    frigos,
    targetFrigoId = 'ALL'
  } = params;

  // Filter out dummy or unknown products
  const validProducts = products.filter(p => 
    p.name && 
    !p.name.includes('Produit Inconnu') && 
    !p.name.includes('PAGE 1')
  );

  return validProducts.map(prd => {
    const kgPerCarton = prd.kgPerCarton || 10;
    const kgPerPallet = prd.kgPerPallet || 500;
    const unitCostHT = prd.unitCostHT || 0;
    const sellingPriceHT = prd.sellingPriceHT || 0;

    // Filter movements for this product
    const prdMovements = movements.filter(m => m.productId === prd.id || m.productCode === prd.code);

    // Sum entries
    const entryMovements = prdMovements.filter(m => m.isEntry);
    const totalEntriesKg = entryMovements.reduce((sum, m) => sum + m.quantityKg, 0);
    const totalEntriesCartons = entryMovements.reduce((sum, m) => sum + m.quantityCartons, 0);
    const totalEntriesPallets = entryMovements.reduce((sum, m) => sum + m.quantityPallets, 0);
    const entriesCount = entryMovements.length;

    // Sum exits
    const exitMovements = prdMovements.filter(m => !m.isEntry);
    const totalExitsKg = exitMovements.reduce((sum, m) => sum + m.quantityKg, 0);
    const totalExitsCartons = exitMovements.reduce((sum, m) => sum + m.quantityCartons, 0);
    const totalExitsPallets = exitMovements.reduce((sum, m) => sum + m.quantityPallets, 0);
    const exitsCount = exitMovements.length;

    // Current Stock Level (Dynamic movement balance takes precedence over stale 0kg stocks)
    let currentStockKg = 0;
    let currentStockPallets = 0;

    const dynamicBalanceKg = Math.max(0, totalEntriesKg - totalExitsKg);
    const dynamicBalancePallets = Math.ceil(dynamicBalanceKg / kgPerPallet);

    if (targetFrigoId && targetFrigoId !== 'ALL') {
      const targetFrigo = frigos.find(f => f.id === targetFrigoId);
      const stkObj = stocks.find(s => 
        (s.frigoId === targetFrigoId || (targetFrigo && (s.frigoId === targetFrigo.code || s.frigoId === targetFrigo.name))) &&
        (s.productId === prd.id || s.productId === prd.code)
      );

      if (totalEntriesKg > 0 || totalExitsKg > 0) {
        currentStockKg = Math.max(dynamicBalanceKg, stkObj?.quantityKg || 0);
        currentStockPallets = stkObj && stkObj.quantityPallets > 0 ? stkObj.quantityPallets : dynamicBalancePallets;
      } else if (stkObj && stkObj.quantityKg > 0) {
        currentStockKg = stkObj.quantityKg;
        currentStockPallets = stkObj.quantityPallets;
      } else {
        currentStockKg = dynamicBalanceKg;
        currentStockPallets = dynamicBalancePallets;
      }
    } else {
      // Global stock across all frigos
      const relevantStocks = stocks.filter(s => s.productId === prd.id || s.productId === prd.code);
      const totalStaticKg = relevantStocks.reduce((sum, s) => sum + s.quantityKg, 0);
      const totalStaticPallets = relevantStocks.reduce((sum, s) => sum + s.quantityPallets, 0);

      if (totalEntriesKg > 0 || totalExitsKg > 0) {
        currentStockKg = Math.max(dynamicBalanceKg, totalStaticKg);
        currentStockPallets = totalStaticPallets > 0 ? totalStaticPallets : dynamicBalancePallets;
      } else if (totalStaticKg > 0) {
        currentStockKg = totalStaticKg;
        currentStockPallets = totalStaticPallets;
      } else {
        currentStockKg = dynamicBalanceKg;
        currentStockPallets = dynamicBalancePallets;
      }
    }

    const currentStockCartons = kgPerCarton > 0 ? Math.round(currentStockKg / kgPerCarton) : 0;

    // Valuations
    const totalValuationCostHT = currentStockKg * unitCostHT;
    const totalValuationSaleHT = currentStockKg * sellingPriceHT;
    const potentialMarginHT = totalValuationSaleHT - totalValuationCostHT;
    const marginPercent = totalValuationCostHT > 0 ? Math.round((potentialMarginHT / totalValuationCostHT) * 100) : 0;

    // Turnover / Rotation
    const turnoverRatePercent = totalEntriesKg > 0 ? Math.round((totalExitsKg / totalEntriesKg) * 100) : (totalExitsKg > 0 ? 100 : 0);

    // Last Movement
    const lastMv = prdMovements[0];
    const lastMovementDate = lastMv?.date;
    const lastMovementTime = lastMv?.time;
    const lastMovementType = lastMv?.type;

    // Stock Status
    let stockStatus: ProductAccumulationSummary['stockStatus'] = 'EN_STOCK';
    if (currentStockKg <= 0) {
      stockStatus = 'RUPTURE';
    } else if (prd.minStockAlertKg && currentStockKg <= prd.minStockAlertKg) {
      stockStatus = 'STOCK_FAIBLE';
    }

    return {
      productId: prd.id,
      productCode: prd.code,
      productName: prd.name,
      category: prd.category || 'Général',
      origin: prd.origin || 'Import / Local',
      kgPerCarton,
      kgPerPallet,
      unitCostHT,
      sellingPriceHT,
      totalEntriesKg,
      totalEntriesCartons,
      totalEntriesPallets,
      entriesCount,
      totalExitsKg,
      totalExitsCartons,
      totalExitsPallets,
      exitsCount,
      currentStockKg,
      currentStockCartons,
      currentStockPallets,
      totalValuationCostHT,
      totalValuationSaleHT,
      potentialMarginHT,
      marginPercent,
      turnoverRatePercent,
      lastMovementDate,
      lastMovementTime,
      lastMovementType,
      stockStatus
    };
  });
}
