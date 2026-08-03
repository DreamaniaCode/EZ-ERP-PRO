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

  const messageText = `📦 *ORDRE D'EXPÉDITION / BON DE LIVRAISON* 📦
----------------------------------
🔹 *N° BL:* ${bl.blNumber} (CMD: ${bl.orderNumber})
🏭 *Frigo:* ${bl.frigoName}
👤 *Client:* ${bl.clientName}
📅 *Date:* ${bl.date}

📋 *ARTICLES À CHARGER:*
${bl.items.map(it => `• ${it.productCode} - ${it.productName}: *${it.quantityKg.toLocaleString()} Kg* (${it.unitPriceHT} DH/Kg HT)`).join('\n')}

📊 *RÉCAPITULATIF DU CHARGEMENT:*
👉 Poids Total: *${bl.totalKg.toLocaleString()} Kg*
👉 Montant HT: *${bl.totalHT.toLocaleString()} DH*
👉 Total TTC: *${bl.totalTTC.toLocaleString()} DH*

${bl.frigoEmployeeApproved ? `✅ *STATUT CHARGEMENT:* Approuvé quai par ${bl.frigoApprovedBy} (${bl.frigoApprovedAt})` : `⏳ *STATUT CHARGEMENT:* En attente de validation quai frigo.`}

📄 *ACCÈS DIRECT DOCUMENT BL:*
👉 Consulter BL: ${directLink}
----------------------------------
EasyERP Pro • Logistics & Food Storage`;

  const encoded = encodeURIComponent(messageText);

  if (phone) {
    // Strip non-numeric characters from phone
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
}
