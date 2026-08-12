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
