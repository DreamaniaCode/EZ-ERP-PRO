import React, { useRef, useState } from 'react';
import { PenTool, Trash2, CheckCircle, X } from 'lucide-react';

interface BLSignatureModalProps {
  blNumber: string;
  clientName: string;
  onSaveSignature: (signatureUrl: string, signerName: string) => void;
  onClose: () => void;
}

export const BLSignatureModal: React.FC<BLSignatureModalProps> = ({
  blNumber,
  clientName,
  onSaveSignature,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState(clientName);
  const [isEmpty, setIsEmpty] = useState(true);

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
    ctx.strokeStyle = '#0f62fe'; // IBM Carbon Blue line

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
    if (isEmpty) {
      alert('Veuillez effectuer une signature sur l’écran avant de valider.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSignature(dataUrl, signerName);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-gray-300 w-full max-w-lg rounded shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
          <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
            <PenTool className="w-4 h-4 text-[#0f62fe]" />
            Signature Numérique du Client ({blNumber})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nom & Prénom du Réceptionnaire / Chauffeur
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              className="w-full carbon-input font-bold"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Écran de Signature Tactile / Souris
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] text-red-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3 h-3" /> Effacer
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-400 rounded bg-gray-50 relative overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={450}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair bg-white"
              />
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs pointer-events-none italic">
                  Signez à l'intérieur de cet encadré avec votre doigt ou la souris...
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-gray-500 bg-blue-50 border border-blue-200 p-2.5 rounded">
            📌 La signature sera horodatée et imprimée sur l’exemplaire PDF du Bon de Livraison (BL).
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
              type="button"
              onClick={handleSave}
              className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
            >
              <CheckCircle className="w-4 h-4" /> Enregistrer la Signature
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
