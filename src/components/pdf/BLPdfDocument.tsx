import React, { useRef, useState, useEffect } from 'react';
import { DeliveryNoteBL, ColdStorageFrigo } from '../../types';
import { useERP } from '../../context/ERPContext';
import { getBLDirectLink } from '../../utils/whatsappUtils';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Printer, CheckCircle2, ShieldCheck, X, QrCode } from 'lucide-react';

interface BLPdfDocumentProps {
  bl: DeliveryNoteBL;
  frigo?: ColdStorageFrigo;
  onClose: () => void;
}

export const BLPdfDocument: React.FC<BLPdfDocumentProps> = ({ bl, frigo, onClose }) => {
  const { companyInfo } = useERP();
  const printRef = useRef<HTMLDivElement | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    const directLink = getBLDirectLink(bl.blNumber);

    QRCode.toDataURL(directLink, { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Erreur génération QR Code BL:', err));
  }, [bl]);

  const handleDownloadPdf = () => {
    const element = printRef.current;
    if (!element) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>BL ${bl.blNumber} - ${bl.clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; font-size: 11px; color: #111; background: #fff; }
    @page { size: A4 portrait; margin: 12mm; }
    @media print { body { margin: 0; } }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 14px; }
    .company-name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .company-meta { font-size: 9px; color: #444; margin-top: 3px; font-family: monospace; }
    .bl-badge { background: #0f62fe; color: #fff; padding: 4px 10px; font-weight: 700; font-size: 11px; text-transform: uppercase; border-radius: 3px; display: inline-block; margin-bottom: 5px; }
    .bl-number { font-size: 13px; color: #0f62fe; font-weight: 700; font-family: monospace; }
    .meta-line { font-size: 9px; color: #555; font-family: monospace; }
    .qr-box { border: 1px solid #ccc; padding: 4px; text-align: center; }
    .qr-img { width: 75px; height: 75px; }
    .qr-label { font-size: 7px; font-weight: 700; color: #666; margin-top: 2px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .card { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
    .card-blue { background: #eff6ff; border-color: #bfdbfe; }
    .card-label { font-size: 9px; font-weight: 700; color: #0f62fe; text-transform: uppercase; border-bottom: 1px solid #dbeafe; padding-bottom: 5px; margin-bottom: 7px; }
    .card-name { font-size: 12px; font-weight: 700; }
    .card-detail { font-size: 9px; color: #444; margin-top: 3px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; }
    th { background: #e2e8f0; font-weight: 700; text-transform: uppercase; font-size: 9px; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
    td { padding: 6px 8px; border: 1px solid #cbd5e1; }
    tr:nth-child(even) td { background: #f8fafc; }
    td.code { color: #0f62fe; font-weight: 700; font-family: monospace; }
    .totals { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #ccc; padding-top: 10px; margin-bottom: 16px; }
    .total-box { text-align: right; border: 1px solid #ccc; padding: 10px 14px; border-radius: 4px; background: #f8fafc; }
    .total-label { font-size: 9px; color: #555; text-transform: uppercase; }
    .total-value { font-size: 15px; font-weight: 700; color: #047857; font-family: monospace; }
    .notes { font-size: 9px; color: #555; }
    .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; border-top: 2px solid #333; padding-top: 14px; }
    .sig-box { border: 1px solid #ccc; padding: 10px; height: 120px; border-radius: 4px; display: flex; flex-direction: column; justify-content: space-between; }
    .sig-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #666; }
    .sig-content { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #aaa; font-style: italic; }
    .sig-footer { font-size: 8px; color: #aaa; }
    .approved-badge { display: flex; align-items: center; gap: 6px; background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 4px; padding: 5px 8px; color: #065f46; font-size: 9px; font-weight: 700; }
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
    <div style="display:flex;align-items:flex-start;gap:12px;">
      ${qrCodeDataUrl ? `<div class="qr-box"><img class="qr-img" src="${qrCodeDataUrl}" /><div class="qr-label">SCAN SÉCURITÉ</div></div>` : ''}
      <div style="text-align:right;">
        <div><span class="bl-badge">BON DE LIVRAISON</span></div>
        <div class="bl-number">N° ${bl.blNumber}</div>
        <div class="meta-line">Réf Commande: <b>${bl.orderNumber || '-'}</b></div>
        <div class="meta-line">Date: <b>${bl.date}</b></div>
      </div>
    </div>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="card-label">DESTINATAIRE / CLIENT</div>
      <div class="card-name">${bl.clientName}</div>
      ${bl.clientAddress ? `<div class="card-detail">${bl.clientAddress}</div>` : ''}
      ${bl.clientPhone ? `<div class="card-detail">Tél: ${bl.clientPhone}</div>` : ''}
    </div>
    <div class="card card-blue">
      <div class="card-label" style="color:#1d4ed8;border-color:#dbeafe;">ENTREPÔT FRIGORIFIQUE D'EXPÉDITION</div>
      <div class="card-name" style="color:#1e3a8a;">${frigo?.name || bl.frigoName}</div>
      <div class="card-detail">${frigo?.location || 'Zone Portuaire, Casablanca'}</div>
      <div class="card-detail">Responsable: ${frigo?.managerName || '-'}</div>
      <div class="card-detail">Contact: ${frigo?.managerPhone || '-'}</div>
    </div>
  </div>

  <table>
    <thead><tr><th>Code SKU</th><th>Désignation Produit</th><th style="text-align:center;">Quantité (Kg)</th></tr></thead>
    <tbody>
      ${bl.items.map((item, idx) => `
        <tr>
          <td class="code">${item.productCode}</td>
          <td>${item.productName}</td>
          <td style="text-align:center;font-weight:700;">${item.quantityKg.toLocaleString()} Kg</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="notes">
      <div>Mode de Transport: <b>Camion Frigorifique Sous Chaîne de Froid (-2°C)</b></div>
      <div>Conditions de livraison: Conforme aux règles logistiques</div>
      <div style="font-style:italic;color:#888;margin-top:4px;font-size:8px;">"Toute réclamation concernant le poids ou l'état de la marchandise doit être stipulée lors de la signature."</div>
    </div>
    <div class="total-box">
      <div class="total-label">POIDS TOTAL EXPÉDIÉ</div>
      <div class="total-value">${bl.totalKg.toLocaleString()} Kg</div>
    </div>
  </div>

  <div class="sigs">
    <div class="sig-box">
      <div class="sig-label">VISA & CACHET EXPÉDITION (ENTREPÔT FRIGO)</div>
      <div class="sig-content">
        ${bl.frigoEmployeeApproved
          ? `<div class="approved-badge">✓ Approuvé pour Sortie Quai — ${bl.frigoApprovedBy} (${bl.frigoApprovedAt})</div>`
          : 'En attente de signature du responsable frigo'}
      </div>
      <div class="sig-footer">Emplacement pour cachet et signature du magasinier</div>
    </div>
    <div class="sig-box" style="background:#f9fafb;">
      <div class="sig-label">RECEPTION & SIGNATURE CLIENT (BON POUR ACCORD)</div>
      <div class="sig-content">
        ${bl.clientSignatureUrl
          ? `<div style="text-align:center;"><img src="${bl.clientSignatureUrl}" style="height:50px;object-fit:contain;" /><div style="font-size:9px;font-weight:700;color:#333;">Signé par ${bl.signedByName} le ${bl.signedAt}</div></div>`
          : 'Signature client à capturer lors de la livraison'}
      </div>
      <div class="sig-footer">Signature avec mention "Reçu conforme"</div>
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
          <span className="text-[#0f62fe]">PDF</span> PREVIEW - BON DE LIVRAISON {bl.blNumber}
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
            <Download className="w-4 h-4" /> Télécharger (.PDF)
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Document Sheet Container */}
      <div className="overflow-x-auto p-2 sm:p-6 bg-gray-100">
        <div ref={printRef} data-pdf-element="true" className="min-w-[700px] max-w-4xl mx-auto p-6 bg-white text-gray-900 font-sans space-y-6 shadow-md border border-gray-200" style={{ backgroundColor: '#ffffff', color: '#111827' }}>

          {/* Header Row: Company Info, BL Title & QR Code */}
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

            <div className="flex items-center gap-4 text-right shrink-0">
              {qrCodeDataUrl && (
                <div className="p-1 border border-gray-300 rounded text-center shrink-0" style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db' }}>
                  <img src={qrCodeDataUrl} alt="QR Code BL" className="w-20 h-20 object-contain mx-auto" />
                  <div className="text-[8px] font-mono text-gray-500 font-bold mt-0.5" style={{ color: '#6b7280' }}>SCAN SÉCURITÉ</div>
                </div>
              )}

              <div>
                <div className="inline-block px-3 py-1 text-sm font-bold font-mono tracking-wider uppercase mb-1 rounded-sm" style={{ backgroundColor: '#0f62fe', color: '#ffffff' }}>
                  BON DE LIVRAISON
                </div>
                <div className="text-sm font-mono font-bold" style={{ color: '#0f62fe' }}>
                  N° {bl.blNumber}
                </div>
                <div className="text-xs text-gray-600 font-mono" style={{ color: '#4b5563' }}>Réf Commande: <b>{bl.orderNumber || '-'}</b></div>
                <div className="text-xs text-gray-600 font-mono" style={{ color: '#4b5563' }}>Date: <b>{bl.date}</b></div>
              </div>
            </div>
          </div>

          {/* Client & Frigo Dispatch Details Cards */}
          <div className="grid grid-cols-2 gap-6 text-xs font-mono">
            
            {/* Client Card */}
            <div className="border p-3 rounded" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
              <div className="font-bold uppercase border-b pb-1 mb-2 text-[11px]" style={{ color: '#0f62fe', borderColor: '#e2e8f0' }}>
                DESTINATAIRE / CLIENT
              </div>
              <div className="font-bold text-sm text-gray-900" style={{ color: '#0f172a' }}>{bl.clientName}</div>
              {bl.clientAddress && <div className="text-gray-700 mt-1" style={{ color: '#334155' }}>{bl.clientAddress}</div>}
              {bl.clientPhone && <div className="text-gray-600 mt-1" style={{ color: '#475569' }}>Contact / Tél: {bl.clientPhone}</div>}
              {bl.clientEmail && <div className="text-gray-600" style={{ color: '#475569' }}>Email: {bl.clientEmail}</div>}
            </div>

            {/* Frigo Origin Card */}
            <div className="border p-3 rounded" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="font-bold uppercase border-b pb-1 mb-2 text-[11px]" style={{ color: '#1d4ed8', borderColor: '#dbeafe' }}>
                ENTREPÔT FRIGORIFIQUE D'EXPÉDITION
              </div>
              <div className="font-bold text-sm" style={{ color: '#1e3a8a' }}>{frigo?.name || (bl.frigoName.includes('Port Casablanca') || bl.frigoName.includes('Frigo A') ? 'Frigo MFADEL' : bl.frigoName)}</div>
              <div className="text-gray-700 mt-1" style={{ color: '#334155' }}>{frigo?.location || 'Zone Portuaire, Casablanca'}</div>
              <div className="text-gray-600 mt-1" style={{ color: '#475569' }}>Responsable Quai: {frigo?.managerName || 'Responsable Frigo MFADEL'}</div>
              <div className="text-gray-600" style={{ color: '#475569' }}>Contact Frigo: {frigo?.managerPhone || '+212 661-123456'}</div>
              <div className="mt-2 text-[10px] font-bold flex items-center gap-1" style={{ color: '#047857' }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Validation Quai Frigo: {bl.frigoEmployeeApproved ? `Approuvé par ${bl.frigoApprovedBy}` : 'En attente'}
              </div>
            </div>

          </div>

          {/* Products Table */}
          <div>
            <table className="w-full text-left border-collapse border text-xs font-mono" style={{ borderColor: '#cbd5e1' }}>
              <thead>
                <tr className="font-bold uppercase text-[11px]" style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}>
                  <th className="p-2 border" style={{ borderColor: '#cbd5e1' }}>Code SKU</th>
                  <th className="p-2 border" style={{ borderColor: '#cbd5e1' }}>Désignation Produit</th>
                  <th className="p-2 border text-center" style={{ borderColor: '#cbd5e1' }}>Quantité (Kg)</th>
                </tr>
              </thead>
              <tbody>
                {bl.items.map((item, idx) => (
                  <tr key={idx} className="border-b" style={{ borderColor: '#e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td className="p-2 border font-bold" style={{ borderColor: '#cbd5e1', color: '#0f62fe' }}>{item.productCode}</td>
                    <td className="p-2 border font-sans font-semibold" style={{ borderColor: '#cbd5e1', color: '#0f172a' }}>{item.productName}</td>
                    <td className="p-2 border text-center font-bold" style={{ borderColor: '#cbd5e1', color: '#0f172a' }}>{item.quantityKg.toLocaleString()} Kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Weight Summary Box */}
          <div className="flex justify-between items-end border-t pt-4 font-mono" style={{ borderColor: '#cbd5e1' }}>
            <div className="space-y-1 text-xs text-gray-600" style={{ color: '#475569' }}>
              <div>Mode de Transport: <b>Camion Frigorifique Sous Chaîne de Froid (-2°C)</b></div>
              <div>Conditions de livraison: Conforme aux règles logistiques</div>
              <div className="text-[10px] text-gray-500 italic mt-2" style={{ color: '#64748b' }}>
                "Toute réclamation concernant le poids ou l'état de la marchandise doit être stipulée lors de la signature."
              </div>
            </div>

            <div className="p-4 rounded border text-right space-y-1 text-xs" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
              <div className="text-gray-500 text-[10px]">POIDS TOTAL EXPÉDIÉ</div>
              <div className="font-bold text-base text-emerald-700">{bl.totalKg.toLocaleString()} Kg</div>
            </div>
          </div>

          {/* Signatures & Stamps Footer */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-gray-800 text-xs font-mono">
            
            {/* Frigo Approval Stamp */}
            <div className="border border-gray-300 p-3 h-36 relative flex flex-col justify-between rounded">
              <div className="font-bold uppercase text-[10px] text-gray-500">
                VISA & CACHET EXPÉDITION (ENTREPÔT FRIGO)
              </div>
              
              {bl.frigoEmployeeApproved ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2 border border-emerald-300 rounded">
                  <ShieldCheck className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Approuvé pour Sortie Quai</div>
                    <div className="text-[10px]">{bl.frigoApprovedBy} • {bl.frigoApprovedAt}</div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic text-[11px] text-center my-auto">
                  En attente de signature du responsable frigo
                </div>
              )}

              <div className="text-[9px] text-gray-400">Emplacement pour cachet et signature du magasinier</div>
            </div>

            {/* Client Signature Box */}
            <div className="border border-gray-300 p-3 h-36 relative flex flex-col justify-between rounded bg-gray-50">
              <div className="font-bold uppercase text-[10px] text-gray-500">
                RECEPTION & SIGNATURE CLIENT (BON POUR ACCORD)
              </div>

              {bl.clientSignatureUrl ? (
                <div className="space-y-1">
                  <img src={bl.clientSignatureUrl} alt="Signature client" className="h-14 object-contain mx-auto" />
                  <div className="text-[10px] text-center font-bold text-gray-800">
                    Signé par {bl.signedByName} le {bl.signedAt}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic text-[11px] text-center my-auto">
                  Signature client à capturer sur l'interface lors de la livraison
                </div>
              )}

              <div className="text-[9px] text-gray-400">Signature avec mention "Reçu conforme"</div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
