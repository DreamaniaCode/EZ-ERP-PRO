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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Clean up style tags that contain oklch color functions unsupported by html2canvas
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach((style) => {
            if (style.textContent && style.textContent.includes('oklch')) {
              style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000000');
            }
          });

          // Clean up inline or element styles
          const pdfElement = clonedDoc.querySelector('[data-pdf-element="true"]') || clonedDoc.body;
          if (pdfElement) {
            const allElements = pdfElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style) {
                for (let i = 0; i < htmlEl.style.length; i++) {
                  const prop = htmlEl.style[i];
                  const val = htmlEl.style.getPropertyValue(prop);
                  if (val && val.includes('oklch')) {
                    htmlEl.style.setProperty(prop, '#000000');
                  }
                }
              }
            });
          }
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${bl.blNumber}_BL_${bl.clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Une erreur est survenue lors de la génération du PDF. Utilisez l\'option Imprimer.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div className="bg-white w-full max-w-4xl my-8 rounded shadow-2xl overflow-hidden border border-gray-300">
        
        {/* Action Bar */}
        <div className="bg-[#161616] text-white px-6 py-3 flex justify-between items-center print:hidden border-b border-[#393939]">
          <div className="font-mono text-sm font-bold flex items-center gap-2">
            <span className="text-[#0f62fe]">PDF</span> PREVIEW - BON DE LIVRAISON {bl.blNumber}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#262626] hover:bg-[#393939] text-white text-xs font-semibold rounded flex items-center gap-1.5 border border-[#525252]"
            >
              <Printer className="w-4 h-4 text-emerald-400" /> Imprimer / Imprimer PDF
            </button>
            <button
              onClick={handleDownloadPdf}
              className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
            >
              <Download className="w-4 h-4" /> Télécharger (.PDF)
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div ref={printRef} data-pdf-element="true" className="p-8 bg-white text-gray-900 font-sans space-y-6" style={{ backgroundColor: '#ffffff', color: '#111827' }}>

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
