import React, { useRef, useState, useEffect } from 'react';
import { DeliveryNoteBL, ColdStorageFrigo } from '../../types';
import { useERP } from '../../context/ERPContext';
import { getBLDirectLink } from '../../utils/whatsappUtils';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Download, Printer, CheckCircle2, ShieldCheck, X, MessageSquare, Phone, Users, Copy, CheckCheck } from 'lucide-react';

interface BLPdfDocumentProps {
  bl: DeliveryNoteBL;
  frigo?: ColdStorageFrigo;
  onClose: () => void;
}

export const BLPdfDocument: React.FC<BLPdfDocumentProps> = ({ bl, frigo: frigoProp, onClose }) => {
  const { companyInfo, frigos } = useERP();
  const printRef = useRef<HTMLDivElement | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Multi-stage resolution for live frigo so whatsappGroupLink is always found
  const frigo: ColdStorageFrigo | undefined = (() => {
    if (!frigos || frigos.length === 0) return frigoProp;
    if (bl.frigoId) {
      const byId = frigos.find(f => f.id === bl.frigoId || f.name.trim().toLowerCase() === bl.frigoId.trim().toLowerCase());
      if (byId) return byId;
    }
    if (bl.frigoName) {
      const byName = frigos.find(f => f.name.trim().toLowerCase() === bl.frigoName.trim().toLowerCase());
      if (byName) return byName;
    }
    if (frigoProp) {
      const byProp = frigos.find(f => f.id === frigoProp.id || f.name.trim().toLowerCase() === frigoProp.name.trim().toLowerCase());
      if (byProp) return byProp;
    }
    const withLink = frigos.find(f => !!f.whatsappGroupLink?.trim());
    if (withLink) return withLink;
    return frigos[0] || frigoProp;
  })();

  useEffect(() => {
    const directLink = getBLDirectLink(bl.blNumber);

    QRCode.toDataURL(directLink, { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Erreur génération QR Code BL:', err));
  }, [bl]);

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 14;
    const usable = pw - margin * 2;
    let y = margin;

    const safeStr = (s: any) => String(s || '').replace(/[\u0000-\u001F]/g, '');

    // ── Header: Company name ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 17, 17);
    doc.text(safeStr(companyInfo.name).toUpperCase(), margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Capital: ${safeStr(companyInfo.capital)} | Siege: ${safeStr(companyInfo.address)}, ${safeStr(companyInfo.city)}`, margin, y);
    y += 4;
    doc.text(`I.C.E: ${safeStr(companyInfo.ice)} | R.C: ${safeStr(companyInfo.rc)} | I.F: ${safeStr(companyInfo.if)} | Patente: ${safeStr(companyInfo.patente)}`, margin, y);
    y += 4;
    doc.text(`Tel: ${safeStr(companyInfo.phone)} | Email: ${safeStr(companyInfo.email)}`, margin, y);
    y += 4;

    // ── BL Badge (right column) ──
    doc.setFillColor(15, 98, 254);
    doc.roundedRect(pw - margin - 52, margin - 3, 52, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('BON DE LIVRAISON', pw - margin - 26, margin + 2.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 98, 254);
    doc.text(`N\u00B0 ${safeStr(bl.blNumber)}`, pw - margin, margin + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Ref Commande: ${safeStr(bl.orderNumber) || '-'}`, pw - margin, margin + 15, { align: 'right' });
    doc.text(`Date: ${safeStr(bl.date)}`, pw - margin, margin + 19, { align: 'right' });

    // QR code (right of header)
    if (qrCodeDataUrl) {
      try { doc.addImage(qrCodeDataUrl, 'PNG', pw - margin - 18, margin + 21, 18, 18); } catch {}
    }

    y = Math.max(y, margin + 45);

    // ── Divider ──
    doc.setDrawColor(17, 17, 17);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 5;

    // ── Client & Frigo cards ──
    const halfW = (usable - 5) / 2;
    // Client card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, halfW, 26, 1, 1, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, halfW, 26, 1, 1, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 98, 254);
    doc.text('DESTINATAIRE / CLIENT', margin + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 17, 17);
    doc.text(safeStr(bl.clientName), margin + 3, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    if (bl.clientAddress) doc.text(safeStr(bl.clientAddress), margin + 3, y + 16);
    if (bl.clientPhone) doc.text(`Tel: ${safeStr(bl.clientPhone)}`, margin + 3, y + 20);

    // Frigo card
    const frigoX = margin + halfW + 5;
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(frigoX, y, halfW, 26, 1, 1, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(frigoX, y, halfW, 26, 1, 1, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(29, 78, 216);
    doc.text("ENTREPOT FRIGORIFIQUE D'EXPEDITION", frigoX + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(safeStr(frigo?.name || bl.frigoName), frigoX + 3, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(safeStr(frigo?.location || 'Zone Portuaire, Casablanca'), frigoX + 3, y + 16);
    doc.text(`Responsable: ${safeStr(frigo?.managerName || '-')}`, frigoX + 3, y + 20);
    doc.text(`Contact: ${safeStr(frigo?.managerPhone || '-')}`, frigoX + 3, y + 24);

    y += 32;

    // ── Products Table ──
    const colWidths = [30, usable - 30 - 28, 28];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];
    const rowH = 7;

    // Header row
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, usable, rowH, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, usable, rowH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(17, 17, 17);
    doc.text('CODE SKU', colX[0] + 2, y + 4.8);
    doc.text('DESIGNATION PRODUIT', colX[1] + 2, y + 4.8);
    doc.text('QUANTITE (KG)', colX[2] + colWidths[2] / 2, y + 4.8, { align: 'center' });
    y += rowH;

    bl.items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(margin, y, usable, rowH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, usable, rowH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 98, 254);
      doc.text(safeStr(item.productCode), colX[0] + 2, y + 4.8);
      doc.setTextColor(17, 17, 17);
      doc.text(safeStr(item.productName), colX[1] + 2, y + 4.8);
      doc.setTextColor(17, 17, 17);
      doc.text(`${Number(item.quantityKg).toLocaleString()} Kg`, colX[2] + colWidths[2] / 2, y + 4.8, { align: 'center' });
      y += rowH;
    });
    y += 5;

    // ── Totals ──
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pw - margin - 48, y, 48, 18, 1, 1, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.roundedRect(pw - margin - 48, y, 48, 18, 1, 1, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('POIDS TOTAL EXPEDIE', pw - margin - 24, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(4, 120, 87);
    doc.text(`${Number(bl.totalKg).toLocaleString()} Kg`, pw - margin - 24, y + 14, { align: 'center' });

    // Transport notes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Mode de Transport: Camion Frigorifique Sous Chaine de Froid (-2°C)', margin, y + 6);
    doc.text('Conditions de livraison: Conforme aux regles logistiques', margin, y + 11);
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text('"Toute reclamation concernant le poids ou l\'etat de la marchandise doit etre stipulee lors de la signature."', margin, y + 16);
    y += 26;

    // ── Signature boxes ──
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 5;

    const sigW = (usable - 5) / 2;
    const sigH = 35;
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, sigW, sigH, 'S');
    doc.rect(margin + sigW + 5, y, sigW, sigH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text('VISA & CACHET EXPEDITION (ENTREPOT FRIGO)', margin + 3, y + 5);
    doc.text('RECEPTION & SIGNATURE CLIENT (BON POUR ACCORD)', margin + sigW + 8, y + 5);

    if (bl.frigoEmployeeApproved) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(6, 95, 70);
      doc.text(`Approuve: ${safeStr(bl.frigoApprovedBy)}`, margin + 3, y + 18);
      doc.text(safeStr(bl.frigoApprovedAt || ''), margin + 3, y + 24);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text('En attente de signature du responsable frigo', margin + 3, y + 20);
    }

    if (bl.clientSignatureUrl) {
      try {
        doc.addImage(bl.clientSignatureUrl, 'PNG', margin + sigW + 8, y + 8, 40, 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(50, 50, 50);
        doc.text(`Signe par ${safeStr(bl.signedByName)} le ${safeStr(bl.signedAt)}`, margin + sigW + 8, y + 28);
      } catch {}
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text('Signature client a capturer lors de la livraison', margin + sigW + 8, y + 20);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text('Emplacement pour cachet et signature du magasinier', margin + 3, y + sigH - 3);
    doc.text('Signature avec mention "Recu conforme"', margin + sigW + 8, y + sigH - 3);

    doc.save(`${safeStr(bl.blNumber)}_BL_${safeStr(bl.clientName).replace(/\s+/g, '_')}.pdf`);
  };

  const handlePrint = () => {
    handleDownloadPdf();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unused = printRef;

  // ── WhatsApp share helpers ──
  const [showWA, setShowWA] = useState(false);
  const [waCopied, setWaCopied] = useState(false);

  const waMessage = (
    `🧊 *BON DE LIVRAISON - ${frigo?.name || bl.frigoName || 'Entrepôt Frigo'}*\n\n` +
    `📋 *N° BL:* ${bl.blNumber}\n` +
    `👤 *Client:* ${bl.clientName}\n` +
    `⚖️ *Poids Total:* ${bl.totalKg?.toLocaleString()} Kg\n` +
    `📅 *Date:* ${bl.date}\n` +
    (bl.orderNumber ? `📦 *Réf Commande:* ${bl.orderNumber}\n` : '') +
    `\n✅ Votre BL est prêt.\n` +
    `🔗 ${getBLDirectLink(bl.blNumber)}`
  );

  const handleWACopyMessage = () => {
    navigator.clipboard.writeText(waMessage).then(() => {
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2500);
    });
  };

  const handleWASendClient = () => {
    if (!bl.clientPhone) {
      alert('Numéro de téléphone du client non renseigné dans sa fiche.');
      return;
    }
    const phone = bl.clientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`, '_blank');
  };

  const handleWASendFrigoGroup = () => {
    const groupLink = frigo?.whatsappGroupLink?.trim();
    if (!groupLink) {
      alert(`Lien du groupe WhatsApp non configuré pour l'entrepôt "${frigo?.name || bl.frigoName || 'Frigo'}".\n\nVeuillez aller dans "Entrepôts Frigo" (ou Paramètres), cliquer sur "Modifier" cet entrepôt et coller le lien d'invitation du groupe WhatsApp.`);
      return;
    }
    // Copy message first, then open group so user can paste
    navigator.clipboard.writeText(waMessage).then(() => {
      window.open(groupLink, '_blank');
    }).catch(() => {
      window.open(groupLink, '_blank');
    });
  };

  const handleDownloadAndWhatsApp = () => {
    handleDownloadPdf();
    setTimeout(() => setShowWA(true), 600);
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
            <Printer className="w-4 h-4 text-emerald-400" /> Imprimer
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex-1 sm:flex-initial carbon-btn-primary text-xs flex items-center justify-center gap-1.5 rounded"
          >
            <Download className="w-4 h-4" /> Télécharger (.PDF)
          </button>
          <button
            onClick={handleDownloadAndWhatsApp}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" /> PDF + WhatsApp
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* WhatsApp Share Panel — appears after clicking PDF+WhatsApp */}
      {showWA && (
        <div className="print:hidden bg-[#075E54] text-white px-4 py-4 border-b border-[#128C7E] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
              Partager via WhatsApp — BL {bl.blNumber}
            </div>
            <button onClick={() => setShowWA(false)} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message preview */}
          <div className="bg-[#dcf8c6] text-gray-800 rounded-lg p-3 text-xs font-mono whitespace-pre-line border border-green-300 max-h-32 overflow-auto">
            {waMessage}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Copy message */}
            <button
              onClick={handleWACopyMessage}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded border border-white/20"
            >
              {waCopied ? <CheckCheck className="w-4 h-4 text-[#25D366]" /> : <Copy className="w-4 h-4" />}
              {waCopied ? 'Copié !' : 'Copier le message'}
            </button>

            {/* Send to client */}
            <button
              onClick={handleWASendClient}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-semibold rounded"
            >
              <Phone className="w-4 h-4" />
              Client: {bl.clientPhone || '⚠ Numéro manquant'}
            </button>

            {/* Send to frigo group */}
            <button
              onClick={handleWASendFrigoGroup}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#128C7E] hover:bg-[#075E54] text-white text-xs font-semibold rounded border border-white/20"
            >
              <Users className="w-4 h-4" />
              Groupe: {frigo?.whatsappGroup || frigo?.name || bl.frigoName || '⚠ Non configuré'}
            </button>
          </div>

          <p className="text-white/50 text-[10px]">
            💡 Téléchargez le PDF puis joignez-le manuellement dans WhatsApp. Pour le groupe frigo, le message est copié dans le presse-papier — collez-le après avoir ouvert le groupe.
          </p>
        </div>
      )}

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
