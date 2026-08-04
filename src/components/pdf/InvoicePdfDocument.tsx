import React, { useRef, useState, useEffect } from 'react';
import { Invoice } from '../../types';
import { useERP } from '../../context/ERPContext';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
      .catch(err => console.error('Erreur génération QR Code Facture:', err));
  }, [invoice]);

  const handleDownloadPdf = () => {
    const invoiceTotalHT = invoice.totalHT ?? 0;
    const invoiceTotalVAT = invoice.totalVAT ?? 0;
    const invoiceTotalTTC = invoice.totalTTC ?? 0;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture ${invoice.invoiceNumber} - ${invoice.clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; font-size: 11px; color: #111; background: #fff; }
    @page { size: A4 portrait; margin: 12mm; }
    @media print { body { margin: 0; } }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 14px; }
    .company-name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .company-meta { font-size: 9px; color: #444; margin-top: 3px; font-family: monospace; }
    .inv-badge { background: #111; color: #fff; padding: 5px 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; border-radius: 3px; display: inline-block; margin-bottom: 6px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; margin-bottom: 14px; }
    .meta-label { font-size: 8px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .meta-name { font-size: 13px; font-weight: 900; text-transform: uppercase; }
    .meta-line { font-size: 9px; color: #555; font-family: monospace; margin-top: 2px; }
    .meta-right { text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; border: 1px solid #111; }
    th { background: #111; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 9px; padding: 6px 8px; border-right: 1px solid #333; text-align: left; }
    th:last-child { border-right: none; text-align: right; }
    td { padding: 6px 8px; border: 1px solid #ddd; font-family: monospace; }
    td.right { text-align: right; }
    td.bold { font-weight: 700; }
    tr:nth-child(even) td { background: #f9fafb; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 14px; }
    .totals-box { width: 280px; border: 2px solid #111; padding: 12px; border-radius: 3px; background: #f9fafb; font-family: monospace; font-size: 10px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .totals-final { border-top: 2px solid #111; padding-top: 6px; margin-top: 5px; font-size: 13px; font-weight: 900; display: flex; justify-content: space-between; }
    .totals-final span:last-child { color: #0f62fe; }
    .footer { border-top: 1px solid #ddd; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    .bank-info { font-size: 9px; font-family: monospace; color: #555; line-height: 1.7; }
    .stamp-box { width: 180px; border: 2px dashed #ccc; padding: 8px; text-align: center; border-radius: 3px; }
    .stamp-label { font-size: 8px; font-weight: 700; color: #aaa; text-transform: uppercase; }
    .stamp-space { height: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${companyInfo.logoUrl ? `<img src="${companyInfo.logoUrl}" style="height:40px;object-fit:contain;margin-bottom:6px;" />` : ''}
      <div class="company-name">${companyInfo.name}</div>
      <div class="company-meta">Capital: ${companyInfo.capital} &bull; Siège: ${companyInfo.address}, ${companyInfo.city}</div>
      <div class="company-meta">I.C.E: <b>${companyInfo.ice}</b> &bull; R.C: ${companyInfo.rc} &bull; I.F: ${companyInfo.if} &bull; Patente: ${companyInfo.patente}</div>
      <div class="company-meta">Tél: ${companyInfo.phone} &bull; Email: ${companyInfo.email}</div>
    </div>
    <div style="text-align:right;">
      <div><span class="inv-badge">FACTURE N° ${invoice.invoiceNumber}</span></div>
      ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" style="width:70px;height:70px;margin-top:5px;border:1px solid #ccc;border-radius:3px;padding:2px;" />` : ''}
    </div>
  </div>

  <div class="grid2">
    <div>
      <div class="meta-label">FACTURÉ À / CLIENT:</div>
      <div class="meta-name">${invoice.clientName}</div>
      <div class="meta-line">I.C.E: <b>${invoice.clientICE || client?.ice || 'N/A'}</b></div>
      ${client?.address ? `<div class="meta-line">Adresse: ${client.address}, ${client.city || ''}</div>` : ''}
      ${client?.phone ? `<div class="meta-line">Tél: ${client.phone}</div>` : ''}
    </div>
    <div class="meta-right">
      <div class="meta-label">DÉTAILS FACTURE &amp; ÉCHÉANCE:</div>
      <div class="meta-line">Date d'Émission: <b>${invoice.date}</b></div>
      <div class="meta-line">Date d'Échéance: <b>${invoice.dueDate}</b></div>
      ${invoice.blIds && invoice.blIds.length > 0 ? `<div class="meta-line">BLs: <b style="color:#0f62fe;">${invoice.blIds.join(', ')}</b></div>` : ''}
      <div class="meta-line">Statut: <b style="color:#047857;">${invoice.status}</b></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code SKU</th>
        <th>Désignation Produit</th>
        <th style="text-align:right;">Quantité (Kg)</th>
        <th style="text-align:right;">Prix Unitaire HT</th>
        <th style="text-align:right;">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((it, idx) => `
        <tr>
          <td class="bold">${it.productCode}</td>
          <td class="bold">${it.productName}</td>
          <td class="right bold">${(it.quantityKg || 0).toLocaleString()} Kg</td>
          <td class="right">${(it.unitPriceHT || 0).toLocaleString()} DH</td>
          <td class="right bold">${(it.totalHT || 0).toLocaleString()} DH</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="totals-row"><span>Total HT:</span><span><b>${invoiceTotalHT.toLocaleString()} DH</b></span></div>
      <div class="totals-row"><span>TVA (20%):</span><span><b>${invoiceTotalVAT.toLocaleString()} DH</b></span></div>
      <div class="totals-final"><span>NET À PAYER TTC:</span><span>${invoiceTotalTTC.toLocaleString()} DH</span></div>
    </div>
  </div>

  <div class="footer">
    <div class="bank-info">
      <b>Coordonnées Bancaires:</b> Banque BMCE &bull; RIB: 011 780 000012345678901 44<br/>
      Règlement par Chèque ou Virement bancaire à l'ordre de <b>${companyInfo.name}</b>
    </div>
    <div class="stamp-box">
      <div class="stamp-label">Cachet &amp; Signature Société</div>
      <div class="stamp-space"></div>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=794,height=1123');
    if (!printWindow) return;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
            <Printer className="w-4 h-4 text-emerald-400" /> Imprimer / Imprimer PDF
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
                <div><span className="text-gray-500 font-mono">Bons de Livraison Rattachés:</span> <b className="font-mono text-blue-700">{invoice.blIds.join(', ')}</b></div>
              )}
              <div><span className="text-gray-500 font-mono">Statut Règlement:</span> <b className="font-mono uppercase text-emerald-700">{invoice.status}</b></div>
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
                <span className="font-bold text-gray-900">{invoice.totalHT.toLocaleString()} DH</span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span>TVA (20%):</span>
                <span className="font-bold text-gray-900">{invoice.totalVAT.toLocaleString()} DH</span>
              </div>
              <div className="border-t-2 border-gray-900 pt-2 flex justify-between items-center text-sm font-black text-gray-900" style={{ borderColor: '#111827' }}>
                <span>NET À PAYER TTC:</span>
                <span className="text-[#0f62fe]">{invoice.totalTTC.toLocaleString()} DH</span>
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
