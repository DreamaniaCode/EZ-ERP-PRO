import { PurchaseImportInvoice } from '../types';

/**
 * Automatically generates a standard Supplier / Import Invoice Number based on supplier and date.
 * Format: [CODE_FOURNISSEUR][INDEX]-[DDMMYY]
 * Example: MLHMD01-260826, HIKMA01-260826
 */
export function generateAutoSupplierInvoiceNumber(
  supplierNameOrCode?: string,
  dateStr?: string,
  existingInvoices: PurchaseImportInvoice[] = []
): string {
  // Format date as DDMMYY
  let validDate = new Date();
  if (dateStr) {
    const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const da = parseInt(parts[2], 10);
      const d = new Date(yr, mo, da);
      if (!isNaN(d.getTime())) validDate = d;
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) validDate = d;
    }
  }

  const day = String(validDate.getDate()).padStart(2, '0');
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const year2Digits = String(validDate.getFullYear()).slice(-2);
  const dateCode = `${day}${month}${year2Digits}`; // e.g. "260826"

  // Clean supplier prefix: e.g. "HIKMA" -> "HIKMA", "MLHMD" -> "MLHMD"
  let cleanSupplier = (supplierNameOrCode || 'FOURN')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

  if (!cleanSupplier) cleanSupplier = 'FOURN';

  // Count existing invoices for this supplier and date to determine index (01, 02...)
  const countSameDay = (existingInvoices || []).filter(inv => {
    const invNum = (inv.invoiceNumber || '').toUpperCase();
    return invNum.includes(dateCode) && invNum.includes(cleanSupplier);
  }).length + 1;

  const sequence = String(countSameDay).padStart(2, '0');
  return `${cleanSupplier}${sequence}-${dateCode}`;
}
