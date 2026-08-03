import React, { useState } from 'react';
import { DeliveryNoteBL } from '../../types';
import { Mail, FileText, Send, Check, X, Download } from 'lucide-react';

interface EmailBLModalProps {
  bl: DeliveryNoteBL;
  onSendEmail: (recipient: string) => void;
  onDownloadPdf: () => void;
  onClose: () => void;
}

export const EmailBLModal: React.FC<EmailBLModalProps> = ({
  bl,
  onSendEmail,
  onDownloadPdf,
  onClose,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(bl.clientEmail || 'achats.dattes@marjane.ma');
  const [subject, setSubject] = useState(`Bon de Livraison N° ${bl.blNumber} - ${bl.clientName} (DATE-ERP Logistics)`);
  const [messageBody, setMessageBody] = useState(
`Bonjour,

Veuillez trouver ci-joint en format PDF le Bon de Livraison N° ${bl.blNumber} relatif à votre commande ${bl.orderNumber}.

Détails de l'expédition :
• Frigo d'Origine : ${bl.frigoName}
• Tonnage Total : ${bl.totalKg.toLocaleString()} Kg (${bl.totalPallets} Palettes)
• Statut du chargement : ${bl.frigoEmployeeApproved ? 'Approuvé sur quai frigo' : 'En cours de préparation'}

Cordialement,
Le Service Logistique
DATE-ERP & Food Logistics`
  );

  const [isSentSuccess, setIsSentSuccess] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;
    onSendEmail(recipientEmail);
    setIsSentSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-gray-300 w-full max-w-lg rounded shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
          <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0f62fe]" />
            Envoyer le BL en PDF par Email ({bl.blNumber})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isSentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-gray-900">Email Transmis avec Succès !</h4>
            <p className="text-xs text-gray-600">
              Le Bon de Livraison <b>{bl.blNumber}</b> a été envoyé à <b>{recipientEmail}</b> avec la pièce jointe PDF.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-5 space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Adresse Email du Destinataire (Client) *
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                className="w-full carbon-input font-bold text-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Objet du Message *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full carbon-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Corps du Message
              </label>
              <textarea
                rows={6}
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                className="w-full carbon-input text-xs font-mono"
              />
            </div>

            {/* PDF Attachment badge */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <FileText className="w-5 h-5 text-red-600" />
                <div>
                  <div className="font-bold text-gray-900">{bl.blNumber}_Document_Officiel.pdf</div>
                  <div className="text-[10px] text-gray-500">Document PDF généré automatiquement • {bl.totalKg.toLocaleString()} Kg</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-2.5 py-1 text-[11px] bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" /> Télécharger
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-xs font-semibold hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
              >
                <Send className="w-4 h-4" /> Envoyer par Email
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
