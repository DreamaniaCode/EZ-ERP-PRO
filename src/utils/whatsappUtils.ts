import { DeliveryNoteBL } from '../types';

/**
 * Returns the direct URL to open and view a specific BL in the ERP app
 */
export function getBLDirectLink(blNumber: string): string {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://easyerp.ma';
  return `${origin}/?bl=${blNumber}`;
}

/**
 * Generates a pre-filled WhatsApp message sharing link with BL summary and direct PDF link
 */
export function generateWhatsAppBLLink(
  bl: DeliveryNoteBL, 
  phone?: string
): string {
  const directLink = getBLDirectLink(bl.blNumber);

  const messageText = `📦 *ORDRE DE CHARGEMENT FRIGO / BL* 📦
----------------------------------
🔹 *N° BL:* ${bl.blNumber} ${bl.orderNumber ? `(CMD: ${bl.orderNumber})` : ''}
🏭 *Frigo:* ${bl.frigoName}
👤 *Client Destinataire:* ${bl.clientName}
📅 *Date d'Émission:* ${bl.date}

📋 *INSTRUCTIONS DE CHARGEMENT (ARTICLES & VOLUMES):*
${bl.items.map(it => `• ${it.productCode} - ${it.productName}: *${it.quantityKg.toLocaleString()} Kg* ${it.quantityPallets ? `(${it.quantityPallets} Palettes)` : ''}`).join('\n')}

📊 *RECAPITULATIF LOGISTIQUE:*
👉 Poids Total à Charger: *${bl.totalKg.toLocaleString()} Kg*

${bl.frigoEmployeeApproved ? `✅ *STATUT CHARGEMENT:* Approuvé quai par ${bl.frigoApprovedBy} (${bl.frigoApprovedAt})` : `⏳ *STATUT CHARGEMENT:* En attente de validation quai frigo.`}

📄 *ACCÈS DIRECT DOCUMENT ORDRE DE CHARGEMENT:*
👉 Consulter BL: ${directLink}
----------------------------------
EasyERP Pro • Logistique & Chargement Quai`;


  const encoded = encodeURIComponent(messageText);

  if (phone) {
    // Strip non-numeric characters from phone
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
}

/**
 * Generates a pre-filled WhatsApp message link for Client Invoices
 */
export function generateWhatsAppInvoiceLink(
  invoiceNumber: string,
  clientName: string,
  totalTTC: number,
  phone?: string
): string {
  const messageText = `🧾 *FACTURE CLIENT - EASYERP PRO* 🧾
----------------------------------
🔹 *N° Facture:* ${invoiceNumber}
👤 *Client:* ${clientName}
💰 *Montant Total TTC:* *${totalTTC.toLocaleString()} DH*

Veuillez trouver ci-joint votre facture officielle. 
Merci pour votre confiance !

EasyERP Pro • Agro Négocier`;

  const encoded = encodeURIComponent(messageText);
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
