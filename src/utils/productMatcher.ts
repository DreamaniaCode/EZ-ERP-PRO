import { Product } from '../types';

/**
 * Advanced multi-fallback product matcher for ERP product catalogs.
 * Uses weighted scoring to prevent false matches between similar products (e.g. 5kg vs 11kg).
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

  // 4. Exact Name match only (substring can cause 5kg → 11kg confusion)
  if (itemName.length >= 2) {
    const prdByExactName = products.find(p => {
      const pName = (p.name || '').toLowerCase().trim();
      return pName && pName === itemName;
    });
    if (prdByExactName) return prdByExactName;
  }

  // 5. Weighted Scoring — discrimine correctement entre produits similaires (5kg vs 11kg)
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

  const combinedInput = normalize((itemName || '') + ' ' + (itemCode || ''));
  const inputWords = combinedInput.split(/\s+/).filter(w => w.length >= 2);

  // Détecter le discriminant numérique dans l'input (5 ou 11)
  const inputHas11 = /\b11\b/.test(combinedInput) || combinedInput.includes('11kg') || combinedInput.includes('11 kg');
  const inputHas5 = !inputHas11 && (
    /\b5\b/.test(combinedInput) ||
    combinedInput.includes('5kg') ||
    combinedInput.includes('5 kg') ||
    combinedInput.includes('sibort') ||
    combinedInput.includes('support')
  );

  if (inputWords.length > 0) {
    let bestMatch: Product | undefined;
    let bestScore = -Infinity;

    products.forEach(p => {
      const pCombined = normalize((p.name || '') + ' ' + (p.code || ''));

      // Détecter le discriminant numérique du produit
      const productHas11 = /\b11\b/.test(pCombined) || pCombined.includes('11kg');
      const productHas5 = !productHas11 && (
        /\b5\b/.test(pCombined) ||
        pCombined.includes('5kg') ||
        pCombined.includes('sibort') ||
        pCombined.includes('support')
      );

      let score = 0;

      // Bonus fort sur correspondance du discriminant numérique
      if (inputHas11 && productHas11) score += 50;
      if (inputHas5 && productHas5) score += 50;

      // Malus fort si le discriminant numérique est OPPOSÉ
      if (inputHas11 && productHas5) score -= 100;
      if (inputHas5 && productHas11) score -= 100;

      // Score sur les mots communs (excluant les chiffres discriminants)
      const pWords = pCombined.split(/\s+/).filter(w => w.length >= 2);
      const nonNumericInputWords = inputWords.filter(w => w !== '11' && w !== '5');
      const wordOverlap = nonNumericInputWords.filter(iw =>
        pWords.some(pw => pw === iw || pw.startsWith(iw) || iw.startsWith(pw))
      ).length;
      score += wordOverlap * 10;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    });

    // N'accepter que si le score est positif (éviter les faux positifs)
    if (bestMatch && bestScore > 0) return bestMatch;
  }

  return undefined;
};


/**
 * Checks if two product references (ID, Code, Name) point to the same product catalog entry.
 */
export const isSameProduct = (
  p1: string | { id?: string; code?: string; name?: string },
  p2: string | { id?: string; code?: string; name?: string },
  catalog: { id: string; code: string; name: string }[] = []
): boolean => {
  if (!p1 || !p2) return false;
  const id1 = typeof p1 === 'string' ? p1.trim() : (p1.id || p1.code || '').trim();
  const id2 = typeof p2 === 'string' ? p2.trim() : (p2.id || p2.code || '').trim();

  if (id1 === id2) return true;
  if (id1.toLowerCase() === id2.toLowerCase()) return true;

  const prd1 = catalog.find(p => 
    p.id.toLowerCase() === id1.toLowerCase() || 
    p.code.toLowerCase() === id1.toLowerCase() ||
    p.name.toLowerCase() === id1.toLowerCase()
  );

  const prd2 = catalog.find(p => 
    p.id.toLowerCase() === id2.toLowerCase() || 
    p.code.toLowerCase() === id2.toLowerCase() ||
    p.name.toLowerCase() === id2.toLowerCase()
  );

  if (prd1 && prd2 && prd1.id === prd2.id) return true;
  return false;
};

/**
 * Normalizes product name for robust duplicate detection (handles 2,5kg vs 2.5kg, frites vs frite, case, accents)
 */
export const normalizeProductName = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/,/g, '.') // convert 2,5 to 2.5
    .replace(/(\d+)\s*\.\s*(\d+)/g, '$1.$2') // 2 . 5 -> 2.5
    .replace(/(\d+)\s*(kg|g|t|cl|l|ml)\b/g, '$1$2') // 5 kg -> 5kg
    .replace(/\b([a-z0-9]+)s\b/g, '$1') // remove plural s: dattes -> datte, frites -> frite
    .replace(/[^a-z0-9.]/g, '') // strip all non-alphanumeric except dot
    .trim();
};

/**
 * Finds products with duplicate or very similar names
 */
export const findSimilarProducts = (
  targetName: string,
  products: Product[],
  excludeId?: string
): Product[] => {
  const normTarget = normalizeProductName(targetName);
  if (!normTarget || normTarget.length < 3) return [];

  return products.filter(p => {
    if (excludeId && p.id === excludeId) return false;
    const normP = normalizeProductName(p.name);
    if (!normP) return false;

    // 1. Exact normalized match (e.g. "Frites 2.5KG" === "frite 2,5kg")
    if (normP === normTarget) return true;

    // 2. High similarity substring (only if sufficiently long)
    if (normTarget.length >= 6 && normP.length >= 6) {
      if (normP.includes(normTarget) || normTarget.includes(normP)) return true;
    }

    return false;
  });
};

