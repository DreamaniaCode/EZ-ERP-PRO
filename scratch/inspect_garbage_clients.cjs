const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'e:/Projects/EZ/EZ-ERP-PRO/docs/Inventaire_Complet_Dattes.xlsx';
const wb = xlsx.readFile(filePath);

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  rows.forEach((r, idx) => {
    if (!r || r.length === 0) return;
    const clientVal = String(r[4] || r[3] || r[2] || '').trim();
    
    // Check if client column looks like a number, header, or annotation
    if (
      /^\d+(\.\d+)?$/.test(clientVal) || 
      clientVal.toLowerCase().includes('poids') || 
      clientVal.toLowerCase().includes('livreur') || 
      clientVal.toLowerCase().includes('désignation') || 
      clientVal.toLowerCase().includes('total') ||
      clientVal === '-'
    ) {
      console.log(`[Sheet: "${sheetName}", Row ${idx}]: ClientCol="${clientVal}" -> Full Row:`, JSON.stringify(r));
    }
  });
});
