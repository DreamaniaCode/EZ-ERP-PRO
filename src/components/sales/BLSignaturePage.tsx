import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { PenTool, Trash2, CheckCircle, ArrowLeft, ShieldCheck, FileCheck, User } from 'lucide-react';

interface BLSignaturePageProps {
  blId: string | null;
  onBack: () => void;
}

export const BLSignaturePage: React.FC<BLSignaturePageProps> = ({ blId, onBack }) => {
  const { t } = useTranslation();
  const { deliveryNotes, signBL } = useERP();
  
  const bl = deliveryNotes.find(b => b.id === blId) || deliveryNotes[0];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState(bl?.clientName || '');
  const [isEmpty, setIsEmpty] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (bl) {
      setSignerName(bl.clientName);
    }
  }, [bl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f62fe';

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty || !bl) return;

    const signatureUrl = canvas.toDataURL('image/png');
    signBL(bl.id, signatureUrl, signerName || bl.clientName);

    setSavedSuccess(true);
    setTimeout(() => {
      onBack();
    }, 1500);
  };

  if (!bl) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Bon de livraison non trouvé.</p>
        <button onClick={onBack} className="mt-4 carbon-btn-secondary text-xs">Retour</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#0f62fe]" />
              Signature Électronique Bon de Livraison (BL)
            </h1>
            <p className="text-xs text-gray-500 font-mono">BL N° {bl.blNumber} • Client: {bl.clientName}</p>
          </div>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded border border-emerald-200 flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Quai Sécurisé
        </span>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-500 text-white p-4 rounded-lg shadow-lg flex items-center justify-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle className="w-5 h-5" />
          Signature enregistrée avec succès ! Redirection en cours...
        </div>
      )}

      {/* Summary of BL */}
      <div className="carbon-card p-5 space-y-4">
        {/* Detailed Products Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2.5 font-bold text-xs text-gray-700 uppercase tracking-wider border-b border-gray-200">
            Détails des Produits Chargés sur Camion
          </div>
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="p-2.5">Produit / Désignation</th>
                <th className="p-2.5 text-right">Quantité (Kg)</th>
                <th className="p-2.5 text-right">Quantité (Palettes)</th>
                <th className="p-2.5 text-right">Prix HT</th>
                <th className="p-2.5 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(bl.items || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="p-2.5 font-bold text-gray-900">{item.productName}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-700">{item.quantityKg.toLocaleString()} Kg</td>
                  <td className="p-2.5 text-right text-gray-700">{item.quantityPallets} Pal.</td>
                  <td className="p-2.5 text-right text-gray-600">{item.unitPriceHT} DH</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">{item.totalHT.toLocaleString()} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded border border-gray-200 text-xs font-mono">
          <div>
            <span className="text-gray-500 block">Total Poids (Kg)</span>
            <span className="text-base font-bold text-gray-900">{bl.totalKg.toLocaleString()} Kg</span>
          </div>
          <div>
            <span className="text-gray-500 block">Total Palettes</span>
            <span className="text-base font-bold text-gray-900">{bl.totalPallets} Pal.</span>
          </div>
          <div>
            <span className="text-gray-500 block">Entrepôt / Frigo</span>
            <span className="text-base font-bold text-emerald-700">{bl.frigoName}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Montant Total</span>
            <span className="text-base font-bold text-[#0f62fe]">{bl.totalTTC.toLocaleString()} DH</span>
          </div>
        </div>

        {/* Signer Name Input */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
            <User className="w-4 h-4 text-gray-500" />
            Nom & Prénom du Réceptionnaire / Client
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Ex: Mohamed Alami"
            className="carbon-input w-full text-sm font-semibold"
          />
        </div>

        {/* Signature Pad Canvas */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-[#0f62fe]" />
              Pad de Signature Tactile (Dessiner ci-dessous)
            </label>
            <button
              onClick={clearCanvas}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Effacer Pad
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden touch-none shadow-inner">
            <canvas
              ref={canvasRef}
              width={700}
              height={260}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[260px] cursor-crosshair bg-white"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty}
            className={`px-5 py-2.5 text-xs font-bold rounded flex items-center gap-2 shadow-md transition-all ${
              isEmpty
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Valider la Signature Client & Clôturer BL
          </button>
        </div>
      </div>
    </div>
  );
};
