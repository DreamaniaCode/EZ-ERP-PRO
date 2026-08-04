import React, { useRef, useState, useEffect } from 'react';
import { Invoice } from '../../types';
import { useERP } from '../../context/ERPContext';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Download, Printer, X } from 'lucide-react';

interface InvoicePdfDocumentProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePdfDocument: React.FC<InvoicePdfDocumentProps> = ({ invoice, onClose }) => {
  const { companyInfo, clients } = useERP();
  const printRef = useRef<HTMLDivElement | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const client = clients.find(c => c.id === invoice.clientId || c.name === invoice.clientName);

  useEffect(() => {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://easyerp.ma';
    const directLink = `${origin}/?invoice=${invoice.invoiceNumber}`;
    QRCode.toDataURL(directLink, { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Erreur QR Code Facture:', err));
  }, [invoice]);

  const handleDownloadPdf = () => {
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

    // QR code
    if (qrCodeDataUrl) {
      try { doc.addImage(qrCodeDataUrl, 'PNG', pw - margin - 20, margin + 8, 20, 20); } catch {}
    }

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
    doc.text(`I.C.E: ${safe(invoice.clientICE || client?.ice || 'N/A')}`, margin + 3, y + 16);
    if (client?.address) doc.text(`Adresse: ${safe(client.address)}, ${safe(client.city || '')}`, margin + 3, y + 20);
    if (client?.phone) doc.text(`Tel: ${safe(client.phone)}`, margin + 3, y + 24);

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
    // Last col for total
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
      doc.text(`${Number(it.quantityKg || 0).toLocaleString()} Kg`, colX[2] + cols[2] / 2, y + 4.8, { align: 'center' });
      doc.text(`${Number(it.unitPriceHT || 0).toLocaleString()} DH`, colX[3] + cols[3] / 2, y + 4.8, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(`${Number(it.totalHT || 0).toLocaleString()} DH`, pw - margin - 2, y + 4.8, { align: 'right' });
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
    doc.text(`${totalHT.toLocaleString()} DH`, boxX + boxW - 3, y + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('TVA (20%):', boxX + 3, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 17, 17);
    doc.text(`${totalVAT.toLocaleString()} DH`, boxX + boxW - 3, y + 14, { align: 'right' });

    doc.setDrawColor(17, 17, 17);
    doc.setLineWidth(0.4);
    doc.line(boxX + 3, y + 17, boxX + boxW - 3, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 17, 17);
    doc.text('NET A PAYER TTC:', boxX + 3, y + 24);
    doc.setTextColor(15, 98, 254);
    doc.text(`${totalTTC.toLocaleString()} DH`, boxX + boxW - 3, y + 24, { align: 'right' });

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

    doc.save(`${safe(invoice.invoiceNumber)}_Facture_${safe(invoice.clientName).replace(/\s+/g, '_')}.pdf`);
  };

  const handlePrint = () => {
    handleDownloadPdf();
  };

  return (
    <div className="bg-white w-full rounded-lg shadow-sm overflow-hidden border border-gray-200">
      
      {/* Action Bar */}
      <div className="bg-[#161616] text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden border-b border-[#393939]">
        <div className="font-mono text-xs sm:text-sm font-bold flex items-center gap-2">
          <span className="text-[#0f62fe]">FACTURE PDF</span> PREVIEW - N° {invoice.invoiceNumber}
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#262626] hover:bg-[#393939] text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 border border-[#525252]"
          >
            <Printer className="w-4 h-4 text-emerald-400" /> Imprimer
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex-1 sm:flex-initial carbon-btn-primary text-xs flex items-center justify-center gap-1.5 rounded"
          >
            <Download className="w-4 h-4" /> Télécharger FACTURE (.PDF)
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Document Sheet Container */}
      <div className="overflow-x-auto p-2 sm:p-6 bg-gray-100">
        <div ref={printRef} data-pdf-element="true" className="min-w-[700px] max-w-4xl mx-auto p-6 bg-white text-gray-900 font-sans space-y-6 shadow-md border border-gray-200" style={{ backgroundColor: '#ffffff', color: '#111827' }}>

          {/* Header Row: Company Info, Invoice Title & QR Code */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-5" style={{ borderColor: '#111827' }}>
            <div className="flex items-start gap-4">
              {companyInfo.logoUrl && (
                <img src={companyInfo.logoUrl} alt="Logo" className="h-12 object-contain shrink-0 mt-1" />
              )}
              <div>
                <div className="text-xl font-black font-sans uppercase tracking-tight text-gray-900" style={{ color: '#111827' }}>
                  {companyInfo.name}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 font-mono" style={{ color: '#4b5563' }}>
                  Capital: {companyInfo.capital} • Siège: {companyInfo.address}, {companyInfo.city}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 font-mono" style={{ color: '#6b7280' }}>
                  I.C.E: <b>{companyInfo.ice}</b> • R.C: {companyInfo.rc} • I.F: {companyInfo.if} • Patente: {companyInfo.patente}
                </div>
                <div className="text-[11px] text-gray-500 font-mono" style={{ color: '#6b7280' }}>
                  Tél: {companyInfo.phone} • Email: {companyInfo.email}
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="bg-[#161616] text-white px-3 py-1 text-sm font-black font-mono tracking-wider uppercase rounded" style={{ backgroundColor: '#161616', color: '#ffffff' }}>
                FACTURE N° {invoice.invoiceNumber}
              </div>
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-20 h-20 mt-2 border border-gray-300 rounded p-0.5" />
              )}
            </div>
          </div>

          {/* Info Section: Client & Invoice Metadata */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded border border-gray-200 text-xs font-sans" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
            <div>
              <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">FACTURÉ À / CLIENT:</div>
              <div className="text-sm font-black text-gray-900 uppercase" style={{ color: '#111827' }}>{invoice.clientName}</div>
              <div className="text-gray-600 mt-1 font-mono">I.C.E: <b>{invoice.clientICE || client?.ice || 'N/A'}</b></div>
              {client?.address && <div className="text-gray-600 font-mono">Adresse: {client.address}, {client.city}</div>}
              {client?.phone && <div className="text-gray-600 font-mono">Tél: {client.phone}</div>}
            </div>

            <div className="text-right space-y-1">
              <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">DÉTAILS FACTURE & ÉCHÉANCE:</div>
              <div><span className="text-gray-500 font-mono">Date d'Émission:</span> <b className="font-mono text-gray-900">{invoice.date}</b></div>
              <div><span className="text-gray-500 font-mono">Date d'Échéance:</span> <b className="font-mono text-gray-900">{invoice.dueDate}</b></div>
              {invoice.blIds && invoice.blIds.length > 0 && (
                <div><span className="text-gray-500 font-mono">Bons de Livraison:</span> <b className="font-mono text-blue-700">{invoice.blIds.join(', ')}</b></div>
              )}
              <div><span className="text-gray-500 font-mono">Statut:</span> <b className="font-mono uppercase text-emerald-700">{invoice.status}</b></div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="border border-gray-900 overflow-hidden" style={{ borderColor: '#111827' }}>
            <table className="w-full text-xs text-left font-sans border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white font-bold text-[11px] uppercase border-b border-gray-900" style={{ backgroundColor: '#111827', color: '#ffffff' }}>
                  <th className="p-2 border-r border-gray-800">Code SKU</th>
                  <th className="p-2 border-r border-gray-800">Désignation Produit</th>
                  <th className="p-2 border-r border-gray-800 text-right">Quantité (Kg)</th>
                  <th className="p-2 border-r border-gray-800 text-right">Prix Unitaire HT</th>
                  <th className="p-2 text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 font-mono">
                {invoice.items.map((it, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td className="p-2 border-r border-gray-300 font-bold text-gray-900">{it.productCode}</td>
                    <td className="p-2 border-r border-gray-300 font-semibold text-gray-900">{it.productName}</td>
                    <td className="p-2 border-r border-gray-300 text-right font-bold text-gray-900">{it.quantityKg.toLocaleString()} Kg</td>
                    <td className="p-2 border-r border-gray-300 text-right text-gray-900">{it.unitPriceHT.toLocaleString()} DH</td>
                    <td className="p-2 text-right font-bold text-gray-900">{it.totalHT.toLocaleString()} DH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals Summary */}
          <div className="flex justify-end">
            <div className="w-80 bg-gray-50 p-4 rounded border-2 border-gray-900 space-y-2 text-xs font-mono" style={{ backgroundColor: '#f9fafb', borderColor: '#111827' }}>
              <div className="flex justify-between items-center text-gray-700">
                <span>Total HT:</span>
                <span className="font-bold text-gray-900">{(invoice.totalHT ?? 0).toLocaleString()} DH</span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span>TVA (20%):</span>
                <span className="font-bold text-gray-900">{(invoice.totalVAT ?? 0).toLocaleString()} DH</span>
              </div>
              <div className="border-t-2 border-gray-900 pt-2 flex justify-between items-center text-sm font-black text-gray-900" style={{ borderColor: '#111827' }}>
                <span>NET À PAYER TTC:</span>
                <span className="text-[#0f62fe]">{(invoice.totalTTC ?? 0).toLocaleString()} DH</span>
              </div>
            </div>
          </div>

          {/* Bank / Payment Instructions */}
          <div className="border-t border-gray-200 pt-4 flex justify-between items-end text-xs">
            <div className="text-[10px] text-gray-500 font-mono space-y-1">
              <div><b>Coordonnées Bancaires:</b> Banque BMCE • RIB: 011 780 000012345678901 44</div>
              <div>Règlement par Chèque ou Virement bancaire à l'ordre de <b>{companyInfo.name}</b></div>
            </div>
            <div className="text-center w-60 border-2 border-dashed border-gray-300 p-2 rounded">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Cachet & Signature Société</div>
              <div className="h-10"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
