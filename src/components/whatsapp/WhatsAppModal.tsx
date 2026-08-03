import React, { useState } from 'react';
import { DeliveryNoteBL, ColdStorageFrigo } from '../../types';
import { generateWhatsAppBLLink, getBLDirectLink } from '../../utils/whatsappUtils';
import { MessageSquare, Copy, Check, X, Send, FileText } from 'lucide-react';

interface WhatsAppModalProps {
  bl: DeliveryNoteBL;
  frigo: ColdStorageFrigo;
  onConfirmSent: () => void;
  onClose: () => void;
  onViewPdf?: (bl: DeliveryNoteBL) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  bl,
  frigo,
  onConfirmSent,
  onClose,
  onViewPdf,
}) => {
  const [copied, setCopied] = useState(false);

  const directPdfLink = getBLDirectLink(bl.blNumber);

  const messageText = `📦 *ORDRE D'EXPÉDITION / BL FRIGO* 📦
----------------------------------
🔹 *N° BL:* ${bl.blNumber} (CMD: ${bl.orderNumber})
🏭 *Frigo:* ${bl.frigoName}
👤 *Client:* ${bl.clientName}
📅 *Date:* ${bl.date}

📋 *ARTICLES À CHARGER:*
${bl.items.map(it => `• ${it.productCode} - ${it.productName}: *${it.quantityKg.toLocaleString()} Kg* (${it.unitPriceHT} DH/Kg HT)`).join('\n')}

📊 *TOTAL DU CHARGEMENT:*
👉 Tonnage Total: *${bl.totalKg.toLocaleString()} Kg*
👉 Montant HT: *${bl.totalHT.toLocaleString()} DH*

${bl.frigoEmployeeApproved ? `✅ *STATUT CHARGEMENT:* Approuvé sur quai par ${bl.frigoApprovedBy} le ${bl.frigoApprovedAt}` : `⏳ *STATUT:* En attente d'approbation quai par le responsable frigo.`}

📄 *ACCÈS ACCÈS DIRECT BL & PDF:*
👉 Télécharger / Consulter BL: ${directPdfLink}
----------------------------------
EasyERP Pro • Logistics & Food Storage`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    onConfirmSent();
    const waUrl = generateWhatsAppBLLink(bl, frigo.managerPhone);
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-gray-300 w-full max-w-lg rounded shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#128c7e] text-white px-4 py-3 flex justify-between items-center">
          <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Notification Groupe WhatsApp ({frigo.name})
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-xs text-emerald-900">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1">
              Groupe Cible: {frigo.whatsappGroup}
            </div>
            <div>Responsable Quai: <b>{frigo.managerName}</b> ({frigo.managerPhone})</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Aperçu du Message Formaté WhatsApp
            </label>
            <textarea
              readOnly
              rows={10}
              value={messageText}
              className="w-full font-mono text-xs bg-gray-900 text-emerald-400 p-3 rounded border border-gray-700 shadow-inner focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-xs font-semibold rounded flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier Texte'}
              </button>

              {onViewPdf && (
                <button
                  type="button"
                  onClick={() => onViewPdf(bl)}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 text-xs font-semibold rounded flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  PDF BL (A4)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 border border-gray-300 text-xs font-semibold hover:bg-gray-100 rounded"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-4 py-2 bg-[#25D366] hover:bg-[#128c7e] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow"
              >
                <Send className="w-4 h-4" />
                Envoyer sur WhatsApp
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
