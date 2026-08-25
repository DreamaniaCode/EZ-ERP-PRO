import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExportButtons } from '../common/ExportButtons';
import { 
  ArrowLeftRight, 
  Warehouse, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileText, 
  Save,
  ArrowRight
} from 'lucide-react';

interface StockTransferModalProps {
  onClose: () => void;
  defaultSourceFrigoId?: string;
  defaultProductId?: string;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  onClose,
  defaultSourceFrigoId = '',
  defaultProductId = '',
}) => {
  const { frigos, products, stocks, transferStock, currentUser } = useERP();

  const [sourceFrigoId, setSourceFrigoId] = useState<string>(
    defaultSourceFrigoId || (frigos[0]?.id || '')
  );
  const [targetFrigoId, setTargetFrigoId] = useState<string>(
    frigos.find(f => f.id !== (defaultSourceFrigoId || frigos[0]?.id))?.id || ''
  );
  const [productId, setProductId] = useState<string>(defaultProductId || '');
  const [quantityKg, setQuantityKg] = useState<number>(0);
  const [quantityPallets, setQuantityPallets] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [transferRef, setTransferRef] = useState<string>('');

  // Source Frigo Stock for Selected Product
  const sourceStock = stocks.find(s => s.frigoId === sourceFrigoId && s.productId === productId);
  const maxAvailableKg = sourceStock ? sourceStock.quantityKg : 0;
  const maxAvailablePallets = sourceStock ? sourceStock.quantityPallets : 0;

  // Selected Product & Frigos metadata
  const selectedProduct = products.find(p => p.id === productId);
  const sourceFrigo = frigos.find(f => f.id === sourceFrigoId);
  const targetFrigo = frigos.find(f => f.id === targetFrigoId);

  // Products list: prioritize products in source, fallback to all catalog products
  const productsList = products;

  const handleProductSelect = (pId: string) => {
    setProductId(pId);
    const prd = products.find(p => p.id === pId);
    const st = stocks.find(s => s.frigoId === sourceFrigoId && s.productId === pId);
    if (st && prd && st.quantityKg > 0) {
      setQuantityKg(st.quantityKg);
      setQuantityPallets(st.quantityPallets);
    } else {
      setQuantityKg(0);
      setQuantityPallets(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceFrigoId || !targetFrigoId) {
      alert('Veuillez sélectionner un frigo de départ et un frigo de destination.');
      return;
    }

    if (sourceFrigoId === targetFrigoId) {
      alert('Le frigo de destination doit être différent du frigo de départ.');
      return;
    }

    if (!productId) {
      alert('Veuillez sélectionner un produit à transférer.');
      return;
    }

    if (quantityKg <= 0) {
      alert('Le poids à transférer doit être supérieur à 0 Kg.');
      return;
    }

    if (quantityKg > maxAvailableKg) {
      alert(`Impossible de transférer ${quantityKg} Kg. Stock disponible dans ${sourceFrigo?.name}: ${maxAvailableKg} Kg.`);
      return;
    }

    // Generate unique Transfer Voucher Ref
    const ref = `TRF-${Date.now().toString().slice(-6)}`;
    setTransferRef(ref);

    // Execute transfer in ERP Context
    transferStock(sourceFrigoId, targetFrigoId, productId, quantityKg, quantityPallets);
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-300 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-[#161616] text-white p-4 flex items-center justify-between border-b border-[#393939]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#0f62fe] rounded text-white">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base uppercase font-mono">Transfert Inter-Frigos de Marchandise</h3>
              <p className="text-xs text-gray-400">Déplacement physique et comptable de stock entre deux entrepôts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-lg px-2">✕</button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded">
                Réf Transfert: {transferRef}
              </span>
              <h4 className="text-lg font-bold text-gray-900 mt-2">Transfert Effectué avec Succès !</h4>
              <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
                <b>{quantityKg.toLocaleString()} Kg</b> de <b>{selectedProduct?.name}</b> ont été transférés de <b>{sourceFrigo?.name}</b> vers <b>{targetFrigo?.name}</b>.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Frigo Expéditeur (Origine):</span>
                <b className="text-red-700">{sourceFrigo?.name} (-{quantityKg} Kg)</b>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frigo Destinataire (Arrivée):</span>
                <b className="text-emerald-700">{targetFrigo?.name} (+{quantityKg} Kg)</b>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Opérateur Logistique:</span>
                <b className="text-gray-800">{currentUser?.name || 'Agent Stock'}</b>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <ExportButtons
                filename={`Bon_Transfert_${transferRef}_${sourceFrigo?.name}_vers_${targetFrigo?.name}`}
                title={`BON DE TRANSFERT DE STOCK INTER-FRIGOS - Réf: ${transferRef}`}
                excelData={[{
                  'Réf Transfert': transferRef,
                  'Date': new Date().toISOString().slice(0, 10),
                  'Frigo Origine': sourceFrigo?.name,
                  'Frigo Destination': targetFrigo?.name,
                  'Code Produit': selectedProduct?.code,
                  'Désignation Produit': selectedProduct?.name,
                  'Quantité Transférée (Kg)': quantityKg,
                  'Palettes Transférées': quantityPallets,
                  'Opérateur': currentUser?.name || 'Agent Stock',
                  'Notes': notes || 'Transfert inter-frigos',
                }]}
              />

              <button
                onClick={onClose}
                className="px-5 py-2 bg-gray-900 text-white rounded text-xs font-bold hover:bg-black"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            
            {/* Frigo Selection: Source -> Target */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 border border-blue-200 rounded-lg">
              
              {/* Source Frigo */}
              <div>
                <label className="block font-bold text-gray-800 uppercase mb-1 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-red-600" />
                  1. Frigo de Départ (Origine) *
                </label>
                <select
                  value={sourceFrigoId}
                  onChange={(e) => {
                    setSourceFrigoId(e.target.value);
                    setProductId('');
                    setQuantityKg(0);
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-[#0f62fe]"
                >
                  {frigos.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.location})</option>
                  ))}
                </select>
              </div>

              {/* Target Frigo */}
              <div>
                <label className="block font-bold text-gray-800 uppercase mb-1 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-emerald-600" />
                  2. Frigo d'Arrivée (Destination) *
                </label>
                <select
                  value={targetFrigoId}
                  onChange={(e) => setTargetFrigoId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-[#0f62fe]"
                >
                  {frigos.filter(f => f.id !== sourceFrigoId).map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.location})</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Product Selection */}
            <div>
              <label className="block font-bold text-gray-800 uppercase mb-1 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#0f62fe]" />
                3. Produit à Transférer *
              </label>
              <select
                value={productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded font-bold text-gray-900 bg-white focus:ring-2 focus:ring-[#0f62fe]"
              >
                <option value="">-- Sélectionner un produit à transférer --</option>
                {productsList.map(p => {
                  const st = stocks.find(s => s.frigoId === sourceFrigoId && s.productId === p.id);
                  const availKg = st ? st.quantityKg : 0;
                  const availPallets = st ? st.quantityPallets : 0;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Stock actuel: {availKg.toLocaleString()} Kg / {availPallets} Pal.)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Stock Availability Info Card */}
            {productId && (
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded flex justify-between items-center text-emerald-900 font-mono">
                <div>
                  <div className="text-[10px] text-emerald-700 uppercase font-bold">Stock Disponible dans {sourceFrigo?.name}</div>
                  <div className="text-sm font-bold">{maxAvailableKg.toLocaleString()} Kg ({maxAvailablePallets} Palettes)</div>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Prêt au transfert
                </span>
              </div>
            )}

            {/* Quantities to Transfer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-800 uppercase mb-1">
                  Poids à Transférer (Kg) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={maxAvailableKg}
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono font-bold text-sm text-blue-900 focus:ring-2 focus:ring-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 uppercase mb-1">
                  Nombre de Palettes *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={maxAvailablePallets}
                  value={quantityPallets}
                  onChange={(e) => setQuantityPallets(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono font-bold text-sm text-purple-900 focus:ring-2 focus:ring-[#0f62fe]"
                />
              </div>
            </div>

            {/* Reason & Notes */}
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Motif & Remarques Logistiques <span className="text-gray-400 font-normal">(Optionnel)</span>
              </label>
              <textarea
                rows={2}
                placeholder="ex: Rééquilibrage entrepôts, demande urgente client, optimisation espace quai..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-[#0f62fe]"
              />
            </div>

            {/* Submit Bar */}
            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-semibold hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!productId || quantityKg <= 0 || quantityKg > maxAvailableKg}
                className="px-5 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Valider le Transfert Inter-Frigos
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
