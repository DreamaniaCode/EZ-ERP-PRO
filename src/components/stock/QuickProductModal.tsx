import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ProductCategory } from '../../types';
import { Package, Plus, Save, X } from 'lucide-react';

interface QuickProductModalProps {
  onClose: () => void;
  onProductCreated?: (productId: string) => void;
}

export const QuickProductModal: React.FC<QuickProductModalProps> = ({
  onClose,
  onProductCreated,
}) => {
  const { addProduct } = useERP();

  const [form, setForm] = useState({
    name: '',
    category: 'Dattes Locales' as ProductCategory,
    origin: 'Maroc',
    sellingPriceHT: 45,
    unitCostHT: 35,
    vatRate: 20,
    kgPerCarton: 10,
    cartonsPerPallet: 100,
    minStockAlertKg: 1000,
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      alert('Veuillez saisir le nom du produit.');
      return;
    }

    const created = addProduct({
      ...form,
      imageUrl: '',
    });

    alert(`Nouveau Produit "${created.name}" (${created.code}) créé avec succès !`);
    if (onProductCreated) {
      onProductCreated(created.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-300 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-[#161616] text-white p-4 flex items-center justify-between border-b border-[#393939]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#0f62fe] rounded text-white">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase font-mono">Création Rapide de Produit</h3>
              <p className="text-[11px] text-gray-400">Création instantanée pour ajout direct dans les documents</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-lg px-2">✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          
          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Désignation du Produit *</label>
            <input
              type="text"
              required
              placeholder="ex: Dattes Majhoul Premium 1Kg, Dattes Deglet Nour..."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full carbon-input text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Catégorie *</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value as ProductCategory })}
                className="w-full carbon-input text-xs"
              >
                <option value="Dattes Locales">Dattes Locales</option>
                <option value="Dattes Importées">Dattes Importées</option>
                <option value="Fruits Secs">Fruits Secs</option>
                <option value="Huiles & Condiments">Huiles & Condiments</option>
                <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Origine *</label>
              <input
                type="text"
                required
                placeholder="ex: Maroc, Algérie, Tunisie, Égypte..."
                value={form.origin}
                onChange={e => setForm({ ...form, origin: e.target.value })}
                className="w-full carbon-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Prix Vente HT (DH/Kg) *</label>
              <input
                type="number"
                required
                min={0}
                step={0.5}
                value={form.sellingPriceHT}
                onChange={e => setForm({ ...form, sellingPriceHT: Number(e.target.value) })}
                className="w-full carbon-input text-xs font-mono font-bold text-blue-900 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Prix Revient HT (DH/Kg) *</label>
              <input
                type="number"
                required
                min={0}
                step={0.5}
                value={form.unitCostHT}
                onChange={e => setForm({ ...form, unitCostHT: Number(e.target.value) })}
                className="w-full carbon-input text-xs font-mono font-bold text-purple-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Poids Carton (Kg)</label>
              <input
                type="number"
                required
                min={1}
                value={form.kgPerCarton}
                onChange={e => setForm({ ...form, kgPerCarton: Number(e.target.value) })}
                className="w-full carbon-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Cartons / Palette</label>
              <input
                type="number"
                required
                min={1}
                value={form.cartonsPerPallet}
                onChange={e => setForm({ ...form, cartonsPerPallet: Number(e.target.value) })}
                className="w-full carbon-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 shadow"
            >
              <Save className="w-4 h-4" />
              Créer & Sélectionner Produit
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
