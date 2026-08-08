import jsPDF from 'jspdf';
import { Invoice, CompanyInfo } from '../types';

const fmtNum = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-US').replace(/,/g, ' ');
};

export function generateAndDownloadInvoicePdf(invoice: Invoice, companyInfo: CompanyInfo): void {

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usable = pw - margin * 2;
  let y = margin;

  const safe = (s: any) => String(s || '').replace(/[\u0000-\u001F]/g, '');
  const totalHT = invoice.totalHT ?? 0;
  const totalVAT = invoice.totalVAT ?? 0;
  const totalTTC = invoice.totalTTC ?? 0;

  // ── Company header (left) ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 17, 17);
  doc.text(safe(companyInfo.name).toUpperCase(), margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Capital: ${safe(companyInfo.capital)} | Siege: ${safe(companyInfo.address)}, ${safe(companyInfo.city)}`, margin, y);
  y += 4;
  doc.text(`I.C.E: ${safe(companyInfo.ice)} | R.C: ${safe(companyInfo.rc)} | I.F: ${safe(companyInfo.if)} | Patente: ${safe(companyInfo.patente)}`, margin, y);
  y += 4;
  doc.text(`Tel: ${safe(companyInfo.phone)} | Email: ${safe(companyInfo.email)}`, margin, y);
  y += 4;

  // ── Invoice badge (right) ──
  doc.setFillColor(17, 17, 17);
  doc.roundedRect(pw - margin - 58, margin - 3, 58, 9, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`FACTURE N° ${safe(invoice.invoiceNumber)}`, pw - margin - 29, margin + 3, { align: 'center' });

  y = Math.max(y, margin + 34);

  // ── Divider ──
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 5;

  // ── Client info + Invoice meta grid ──
  const halfW = (usable - 5) / 2;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, usable, 30, 1, 1, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, usable, 30, 1, 1, 'S');

  // Left: client
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text('FACTURE A / CLIENT:', margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text(safe(invoice.clientName).toUpperCase(), margin + 3, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`I.C.E: ${safe(invoice.clientICE || 'N/A')}`, margin + 3, y + 16);
  if (invoice.clientAddress) doc.text(`Adresse: ${safe(invoice.clientAddress)}`, margin + 3, y + 20);

  // Right: invoice details
  const rightX = margin + halfW + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text('DETAILS FACTURE:', rightX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date d'Emission: `, rightX, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text(safe(invoice.date), rightX + 28, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Date d'Echeance: `, rightX, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text(safe(invoice.dueDate), rightX + 28, y + 16);
  if (invoice.blIds && invoice.blIds.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('BLs: ', rightX, y + 21);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 98, 254);
    doc.text(invoice.blIds.join(', '), rightX + 9, y + 21);
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Statut: ', rightX, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(safe(invoice.status).toUpperCase(), rightX + 14, y + 26);

  y += 36;

  // ── Items Table ──
  const cols = [30, usable - 30 - 28 - 28, 28, 28];
  const colX = [margin, margin + cols[0], margin + cols[0] + cols[1], margin + cols[0] + cols[1] + cols[2]];
  const rowH = 7;

  // Table header
  doc.setFillColor(17, 17, 17);
  doc.rect(margin, y, usable, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CODE SKU', colX[0] + 2, y + 4.8);
  doc.text('DESIGNATION PRODUIT', colX[1] + 2, y + 4.8);
  doc.text('QTE (KG)', colX[2] + cols[2] / 2, y + 4.8, { align: 'center' });
  doc.text('PU HT', colX[3] + cols[3] / 2, y + 4.8, { align: 'center' });
  doc.text('MONTANT HT', pw - margin - 2, y + 4.8, { align: 'right' });
  y += rowH;

  invoice.items.forEach((it, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [249, 250, 251];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, usable, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, usable, rowH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 98, 254);
    doc.text(safe(it.productCode), colX[0] + 2, y + 4.8);
    doc.setTextColor(17, 17, 17);
    doc.text(safe(it.productName), colX[1] + 2, y + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 17, 17);
    doc.text(`${fmtNum(it.quantityKg)} Kg`, colX[2] + cols[2] / 2, y + 4.8, { align: 'center' });
    doc.text(`${fmtNum(it.unitPriceHT)} DH`, colX[3] + cols[3] / 2, y + 4.8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${fmtNum(it.totalHT)} DH`, pw - margin - 2, y + 4.8, { align: 'right' });
    y += rowH;
  });
  y += 6;

  // ── Totals box ──
  const boxW = 68;
  const boxX = pw - margin - boxW;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(boxX, y, boxW, 28, 1, 1, 'F');
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, y, boxW, 28, 1, 1, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Total HT:', boxX + 3, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text(`${fmtNum(totalHT)} DH`, boxX + boxW - 3, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('TVA (20%):', boxX + 3, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text(`${fmtNum(totalVAT)} DH`, boxX + boxW - 3, y + 14, { align: 'right' });

  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.4);
  doc.line(boxX + 3, y + 17, boxX + boxW - 3, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 17, 17);
  doc.text('NET A PAYER TTC:', boxX + 3, y + 24);
  doc.setTextColor(15, 98, 254);
  doc.text(`${fmtNum(totalTTC)} DH`, boxX + boxW - 3, y + 24, { align: 'right' });


  y += 34;

  // ── Footer: bank info + stamp ──
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Coordonnees Bancaires:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(' Banque BMCE | RIB: 011 780 000012345678901 44', margin + 32, y);
  y += 5;
  doc.text(`Reglement par Cheque ou Virement a l'ordre de ${safe(companyInfo.name)}`, margin, y);

  // Stamp box
  const stampX = pw - margin - 50;
  const stampY = y - 9;
  doc.setDrawColor(180, 180, 180);
  doc.setLineDash([1.5, 1.5]);
  doc.setLineWidth(0.4);
  doc.rect(stampX, stampY, 50, 20, 'S');
  doc.setLineDash([]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.text('CACHET & SIGNATURE SOCIETE', stampX + 25, stampY + 5, { align: 'center' });

  const fileName = `${safe(invoice.invoiceNumber)}_Facture_${safe(invoice.clientName).replace(/\s+/g, '_')}.pdf`;
  
  try {
    doc.save(fileName);
  } catch (e) {
    console.warn('Standard doc.save failed, using blob fallback', e);
  }

  // Fallback for mobile browsers & PWAs where doc.save may be restricted
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    
    // Create clickable anchor
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();

    // Secondary popup fallback if download click was blocked
    setTimeout(() => {
      try { document.body.removeChild(a); } catch (e) {}
    }, 1000);
  } catch (err) {
    console.error('Error generating PDF blob fallback:', err);
  }
}


