import React from 'react';
import { useERP } from '../../context/ERPContext';
import { BLPdfDocument } from '../pdf/BLPdfDocument';
import { ArrowLeft } from 'lucide-react';

interface BLPdfPageProps {
  blId: string | null;
  onBack: () => void;
}

export const BLPdfPage: React.FC<BLPdfPageProps> = ({ blId, onBack }) => {
  const { deliveryNotes, frigos } = useERP();
  
  const bl = deliveryNotes.find(b => b.id === blId || b.blNumber === blId);
  const frigo = bl ? frigos.find(f => f.id === bl.frigoId) : undefined;

  if (!bl) {
    if (deliveryNotes.length === 0) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-[#0f62fe] border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    return (
      <div className="p-6 text-center bg-white rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-600 font-semibold">Bon de livraison non trouvé ({blId || 'aucun identifiant'}).</p>
        <button onClick={onBack} className="mt-4 carbon-btn-secondary text-xs">Retour aux BLs</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
            title="Retour à la liste des BL"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Visualisation & Impression Bon de Livraison (BL)</h1>
            <p className="text-xs text-gray-500 font-mono">N° {bl.blNumber} • Client: {bl.clientName}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="carbon-btn-secondary text-xs"
        >
          Retour aux BLs
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <BLPdfDocument bl={bl} frigo={frigo} onClose={onBack} />
      </div>
    </div>
  );
};
