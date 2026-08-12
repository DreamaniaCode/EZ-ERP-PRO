const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = 'e:/Projects/EZ/EZ-ERP-PRO/docs/Inventaire_Complet_Dattes.xlsx';
console.log('Reading file:', filePath);

const wb = xlsx.readFile(filePath);
console.log('Sheet Names:', wb.SheetNames);

const fullDump = {};

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n========================================`);
  console.log(`SHEET: "${sheetName}" (${rows.length} rows)`);
  console.log(`========================================`);
  
  rows.slice(0, 40).forEach((r, idx) => {
    if (r.some(cell => String(cell).trim() !== '')) {
      console.log(`[Row ${idx.toString().padStart(2, ' ')}]:`, JSON.stringify(r));
    }
  });
  
  fullDump[sheetName] = rows;
});

fs.writeFileSync('e:/Projects/EZ/EZ-ERP-PRO/scratch/inventaire_dump.json', JSON.stringify(fullDump, null, 2));
console.log('\nWrote full dump to scratch/inventaire_dump.json');
