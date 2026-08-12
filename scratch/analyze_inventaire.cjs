const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'e:/Projects/EZ/EZ-ERP-PRO/docs/Inventaire_Complet_Dattes.xlsx';
const wb = xlsx.readFile(filePath);

const allRecords = [];
const clientRawNames = new Set();
const productTotals = {
  '5KG': { colis: 0, kg: 0, count: 0 },
  '11KG': { colis: 0, kg: 0, count: 0 }
};

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  const is11kgSheet = sheetName.toLowerCase().includes('11');
  const is5kgSheet = sheetName.toLowerCase().includes('5') || sheetName.toLowerCase().includes('ain rabat');

  rows.forEach((r, idx) => {
    if (idx < 2) return; // Header rows
    if (!r || r.length === 0 || !r.some(cell => String(cell).trim() !== '')) return;

    const dateStr = String(r[0] || '').trim();
    const designation = String(r[1] || '').trim();
    const qtyColis = parseFloat(r[2]) || 0;
    const qtyKg = parseFloat(r[3]) || 0;
    const clientName = String(r[4] || '').trim();

    if (!clientName && qtyColis === 0 && qtyKg === 0) return;

    if (clientName) clientRawNames.add(clientName);

    const is11 = is11kgSheet || designation.includes('11');
    const prdType = is11 ? '11KG' : '5KG';

    productTotals[prdType].colis += qtyColis;
    productTotals[prdType].kg += qtyKg;
    productTotals[prdType].count += 1;

    allRecords.push({
      sheet: sheetName,
      rowIdx: idx,
      date: dateStr,
      designation: designation || (is11 ? 'DATTE ALGERIENNE 11 KG' : 'DATTE ALGERIENNE SIBORT 5 KG'),
      qtyColis,
      qtyKg,
      clientName
    });
  });
});

console.log('====================================================');
console.log('EXCEL ANALYSIS SUMMARY FOR Inventaire_Complet_Dattes.xlsx');
console.log('====================================================');
console.log('Total Valid BL Rows Parsed:', allRecords.length);
console.log('\n--- PRODUCT TOTALS ---');
console.log('5 KG  (Sibort):', productTotals['5KG'].count, 'lines |', productTotals['5KG'].colis, 'colis |', productTotals['5KG'].kg, 'Kg');
console.log('11 KG (Datte) :', productTotals['11KG'].count, 'lines |', productTotals['11KG'].colis, 'colis |', productTotals['11KG'].kg, 'Kg');
console.log('TOTAL OVERALL :', allRecords.length, 'lines |', productTotals['5KG'].colis + productTotals['11KG'].colis, 'colis |', productTotals['5KG'].kg + productTotals['11KG'].kg, 'Kg');

console.log('\n--- UNIQUE RAW CLIENT NAMES IN EXCEL (', clientRawNames.size, ') ---');
console.log(Array.from(clientRawNames).sort());

// Test Normalization to check duplicate grouping
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
    .replace(/[^a-z0-9]/gi, '')
    .trim();
};

const canonicalClients = new Map();
clientRawNames.forEach(raw => {
  const norm = normalizeName(raw);
  if (!canonicalClients.has(norm)) {
    canonicalClients.set(norm, []);
  }
  canonicalClients.get(norm).push(raw);
});

console.log('\n--- CANONICAL CLIENT MAPPING AFTER NORMALIZATION (', canonicalClients.size, 'Unique Clients) ---');
canonicalClients.forEach((rawList, normKey) => {
  console.log(`[${normKey}]:`, rawList.join('  <==>  '));
});
