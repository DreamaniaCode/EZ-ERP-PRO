import { Product } from '../types';

/**
 * Advanced multi-fallback product matcher for ERP product catalogs.
 * Matches by exact Code -> ID -> normalized Code -> exact/substring Name -> tokenized word overlap.
 */
export const findMatchingProduct = (
  item: { productId?: string; productCode?: string; productName?: string },
  products: Product[]
): Product | undefined => {
  if (!item || !products || products.length === 0) return undefined;

  const itemCode = (item.productCode || '').toLowerCase().trim();
  const itemName = (item.productName || '').toLowerCase().trim();
  const itemId = item.productId;

  // 1. Direct exact Code match (Highest priority in ERPs for catalog SKUs)
  if (itemCode) {
    const prdByCode = products.find(p => (p.code || '').toLowerCase().trim() === itemCode);
    if (prdByCode) return prdByCode;
  }

  // 2. Direct ID match
  if (itemId) {
    const prdById = products.find(p => p.id === itemId);
    if (prdById) return prdById;
  }

  // 3. Normalized Code match (ignoring spaces & punctuation, e.g. "STD 5KG" vs "STD 5 KG")
  if (itemCode) {
    const cleanItemCode = itemCode.replace(/[^a-z0-9]/g, '');
    if (cleanItemCode.length >= 2) {
      const prdByNormCode = products.find(p => {
        const cleanPCode = (p.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanPCode && (cleanPCode === cleanItemCode || cleanPCode.includes(cleanItemCode) || cleanItemCode.includes(cleanPCode));
      });
      if (prdByNormCode) return prdByNormCode;
    }
  }

  // 4. Exact or Substring Name match
  if (itemName.length >= 2) {
    const prdByName = products.find(p => {
      const pName = (p.name || '').toLowerCase().trim();
      return pName && (pName === itemName || pName.includes(itemName) || itemName.includes(pName));
    });
    if (prdByName) return prdByName;
  }

  // 5. Tokenized Word Overlap (e.g. "dattes" + "branche" + "5kg")
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

  const itemWords = normalize(itemName || itemCode)
    .split(/\s+/)
    .filter(w => w.length >= 2);

  if (itemWords.length > 0) {
    const prdByWords = products.find(p => {
      const pWords = normalize(p.name + ' ' + p.code)
        .split(/\s+/)
        .filter(w => w.length >= 2);

      return itemWords.some(iw =>
        pWords.some(pw => pw === iw || pw.startsWith(iw) || iw.startsWith(pw))
      );
    });
    if (prdByWords) return prdByWords;
  }

  return undefined;
};

