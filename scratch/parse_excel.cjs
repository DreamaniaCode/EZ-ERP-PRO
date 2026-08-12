const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Inventaire_Complet_Dattes.xlsx'));
console.log('Sheet Names:', JSON.stringify(wb.SheetNames));

// Collect all unique products, clients, and movements
const products = new Map();
const clients = new Map();
const movements = [];

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  // Skip header rows (row 0 = title, row 1 = blank, row 2 = headers)
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    if (row[0] === 'TOTAL' || row[0] === 'Total') continue;
    
    const date = row[0] || '';
    const designation = (row[1] || '').toString().trim();
    const qtyColis = Number(row[2]) || 0;
    const poidsKg = Number(row[3]) || 0;
    const clientName = (row[4] || '').toString().trim();
    const notes = row[5] ? row[5].toString().trim() : '';
    
    if (!designation || !clientName) continue;
    
    // Determine product
    const productKey = designation.toUpperCase();
    if (!products.has(productKey)) {
      // Determine kgPerCarton from the data
      let kgPerCarton = 5; // default
      if (productKey.includes('11 KG') || productKey.includes('11KG')) kgPerCarton = 11;
      else if (productKey.includes('5 KG') || productKey.includes('5KG')) kgPerCarton = 5;
      else if (productKey.includes('10 KG') || productKey.includes('10KG')) kgPerCarton = 10;
      
      products.set(productKey, {
        name: designation,
        kgPerCarton: kgPerCarton,
        totalKgOut: 0,
        totalColis: 0,
        count: 0
      });
    }
    
    const prd = products.get(productKey);
    prd.totalKgOut += poidsKg;
    prd.totalColis += qtyColis;
    prd.count += 1;
    
    // Client normalization
    const clientKey = clientName.toUpperCase().replace(/\s+/g, ' ').trim();
    if (!clients.has(clientKey)) {
      clients.set(clientKey, {
        name: clientName,
        totalKg: 0,
        totalColis: 0,
        blCount: 0
      });
    }
    const cl = clients.get(clientKey);
    cl.totalKg += poidsKg;
    cl.totalColis += qtyColis;
    cl.blCount += 1;
    
    movements.push({
      sheet: sheetName,
      date: date.toString(),
      product: designation,
      qtyColis,
      poidsKg,
      client: clientName,
      notes
    });
  }
});

console.log('\n=== PRODUITS UNIQUES ===');
let prdIdx = 0;
products.forEach((val, key) => {
  console.log(`${++prdIdx}. ${key} => kgPerCarton=${val.kgPerCarton}, totalKgSorti=${val.totalKgOut}, totalColis=${val.totalColis}, movements=${val.count}`);
});

console.log('\n=== CLIENTS UNIQUES ===');
const sortedClients = [...clients.entries()].sort((a, b) => b[1].totalKg - a[1].totalKg);
sortedClients.forEach(([key, val], idx) => {
  console.log(`${idx + 1}. "${val.name}" => totalKg=${val.totalKg}, totalColis=${val.totalColis}, BLs=${val.blCount}`);
});

console.log('\n=== STATISTIQUES ===');
console.log('Total Sheets:', wb.SheetNames.length);
console.log('Total Produits uniques:', products.size);
console.log('Total Clients uniques:', clients.size);
console.log('Total Mouvements (lignes):', movements.length);
console.log('Total Kg sortis:', movements.reduce((s, m) => s + m.poidsKg, 0));
console.log('Total Colis sortis:', movements.reduce((s, m) => s + m.qtyColis, 0));

// Save summary
const summary = {
  products: [...products.entries()].map(([key, val]) => ({ key, ...val })),
  clients: sortedClients.map(([key, val]) => ({ key, ...val })),
  movements,
  stats: {
    totalSheets: wb.SheetNames.length,
    totalProducts: products.size,
    totalClients: clients.size,
    totalMovements: movements.length,
    totalKg: movements.reduce((s, m) => s + m.poidsKg, 0),
    totalColis: movements.reduce((s, m) => s + m.qtyColis, 0),
  }
};

fs.writeFileSync(
  path.join(__dirname, 'excel_summary.json'), 
  JSON.stringify(summary, null, 2),
  'utf8'
);
console.log('\nSummary saved to scratch/excel_summary.json');
