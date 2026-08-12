const xlsx = require('xlsx');

const filePath = 'e:/Projects/EZ/EZ-ERP-PRO/docs/Inventaire_Complet_Dattes.xlsx';
const wb = xlsx.readFile(filePath);

const isValidClientName = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (trimmed.length < 2 || trimmed === '-') return false;
  if (/^\d+([\.,]\d+)?$/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  const invalidKeywords = [
    'livreur', 'client', 'poids', 'releve', 'calcule', 'designation', 
    'quantite', 'colis', 'carton', 'total', 'page', 'annotations', 'manuscrites'
  ];

  if (invalidKeywords.some(kw => lower === kw || lower.includes('livreur / client') || lower.includes('poids releve') || lower.includes('poids calcule'))) {
    return false;
  }

  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  return letterCount >= 2;
};

const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(mlhmd|ain\s*rabat|frigo|site|depot|wh|ste|societe|sarl|sarlau|sa|ets|ets.|s.a.r.l|s.a.r.l.)\b/gi, '')
    .replace(/\bqessb\b/g, 'qessab')
    .replace(/\brachide\b/g, 'rachid')
    .replace(/\blaamoussi\b/g, 'laroussi')
    .replace(/\blarousi\b/g, 'laroussi')
    .replace(/\blaaroussi\b/g, 'laroussi')
    .replace(/\bhammouda\b/g, 'hamouda')
    .replace(/\bel\s*khasri\b/g, 'lkasri')
    .replace(/\btetouane\b/g, 'tetouan')
    .replace(/\bhikma\b/g, 'hikmat')
    .replace(/\babdelatti\b/g, 'abdelati')
    .replace(/\bbelgessab\b/g, 'lekassab')
    .replace(/\bbelqessab\b/g, 'lekassab')
    .replace(/\bsoufine\b/g, 'soufiane')
    .replace(/\babdelooaheb\b/g, 'abdelouaheb')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
};

const processedBLs = [];
const clientsMap = new Map();
const productTotals = {
  '5KG': { colis: 0, kg: 0, count: 0 },
  '11KG': { colis: 0, kg: 0, count: 0 }
};

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rows || rows.length === 0) return;

  const is11kgSheet = sheetName.toLowerCase().includes('11');

  rows.forEach((row, rowIdx) => {
    if (rowIdx < 2) return;
    if (!row || row.length === 0 || !row.some(cell => String(cell).trim() !== '')) return;

    let clientName = '';
    let qtyColis = 0;
    let qtyKg = 0;
    let dateStr = '';
    let designation = '';

    row.forEach(cell => {
      const valStr = String(cell).trim();
      if (!valStr) return;

      if (!dateStr && /\d{2}\/\d{2}\/\d{4}/.test(valStr)) {
        dateStr = valStr;
      } else if (!designation && valStr.toUpperCase().includes('DATTE')) {
        designation = valStr;
      } else if (typeof cell === 'number') {
        if (qtyColis === 0 && cell <= 2000 && Number.isInteger(cell)) {
          qtyColis = cell;
        } else if (qtyKg === 0) {
          qtyKg = cell;
        }
      } else if (!clientName && isValidClientName(valStr)) {
        clientName = valStr;
      }
    });

    if (!clientName) {
      const textCell = row.find(c => typeof c === 'string' && isValidClientName(c));
      if (textCell) clientName = String(textCell).trim();
    }

    if (!clientName) clientName = 'Client Divers';

    const is11 = is11kgSheet || (designation && designation.includes('11'));
    const prdType = is11 ? '11KG' : '5KG';
    const kgPerColis = is11 ? 11 : 5;

    if (qtyColis > 0 && qtyKg === 0) qtyKg = qtyColis * kgPerColis;
    else if (qtyKg > 0 && qtyColis === 0) qtyColis = Math.ceil(qtyKg / kgPerColis);

    if (qtyColis > 0 || qtyKg > 0) {
      productTotals[prdType].colis += qtyColis;
      productTotals[prdType].kg += qtyKg;
      productTotals[prdType].count += 1;

      const normClient = normalizeName(clientName);
      if (!clientsMap.has(normClient)) {
        clientsMap.set(normClient, { name: clientName, norm: normClient, blCount: 0, totalKg: 0 });
      }
      const cObj = clientsMap.get(normClient);
      cObj.blCount += 1;
      cObj.totalKg += qtyKg;

      processedBLs.push({
        sheet: sheetName,
        date: dateStr,
        client: cObj.name,
        normClient,
        prdType,
        qtyColis,
        qtyKg
      });
    }
  });
});

console.log('===========================================================');
console.log('FINAL REFINED IMPORT SIMULATION FOR Inventaire_Complet_Dattes.xlsx');
console.log('===========================================================');
console.log(`Total Clean BLs Extracted: ${processedBLs.length}`);
console.log(`Total Unique Clean Clients Created: ${clientsMap.size}`);

console.log('\n--- CLEAN DEDUPLICATED CLIENT LIST (', clientsMap.size, 'Clients) ---');
Array.from(clientsMap.values())
  .sort((a, b) => b.totalKg - a.totalKg)
  .forEach((c, idx) => {
    console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${c.name.padEnd(25, ' ')} -> ${c.blCount.toString().padStart(3, ' ')} BLs | ${c.totalKg.toLocaleString().padStart(8, ' ')} Kg`);
  });
