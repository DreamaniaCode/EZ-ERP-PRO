const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'e:/Projects/EZ/EZ-ERP-PRO/docs/Inventaire_Complet_Dattes.xlsx';
const wb = xlsx.readFile(filePath);

console.log('=== ALL SHEETS IN Inventaire_Complet_Dattes.xlsx ===');
wb.SheetNames.forEach((sheetName, i) => {
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Sheet [${i}]: "${sheetName}" -> ${rows.length} total rows`);
  
  let validRowsCount = 0;
  let totalColis = 0;
  let totalKg = 0;

  rows.forEach((r, idx) => {
    // Check if row has data
    if (r.some(cell => String(cell).trim() !== '')) {
      validRowsCount++;
      // Check for numeric columns
      r.forEach(val => {
        if (typeof val === 'number') {
          // just tracking
        }
      });
    }
  });
  console.log(`   Data rows: ${validRowsCount}`);
});
