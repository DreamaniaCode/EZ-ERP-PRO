import React from 'react';
import { Client, DeliveryNoteBL } from '../../types';
import { useERP } from '../../context/ERPContext';
import { ClientEditPage } from './ClientEditPage';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onSelectClient?: (client: Client) => void;
  onViewBLPdf?: (bl: DeliveryNoteBL) => void;
  onNewBL?: (clientId: string) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onViewBLPdf,
  onNewBL,
}) => {
  const { deliveryNotes } = useERP();

  return (
    <div className="bg-[#f4f4f4] rounded-xl overflow-hidden shadow-2xl border border-gray-300 min-h-[600px] flex flex-col">
      <ClientEditPage
        editId={client.id}
        onBack={onClose}
        onNewBL={onNewBL}
        onViewBLPdf={(blId) => {
          const bl = deliveryNotes.find(b => b.id === blId);
          if (bl && onViewBLPdf) {
            onViewBLPdf(bl);
          }
        }}
      />
    </div>
  );
};
