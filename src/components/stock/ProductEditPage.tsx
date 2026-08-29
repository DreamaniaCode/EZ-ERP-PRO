import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ProductCategory, Product } from '../../types';
import { findSimilarProducts, normalizeProductName } from '../../utils/productMatcher';
import { ArrowLeft, Save, X, Image as ImageIcon, AlertTriangle, Copy, Package, Warehouse, Sparkles } from 'lucide-react';

export const ProductEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t } = useTranslation();
  const { 
    products, 
    stocks, 
    frigos, 
    deliveryNotes, 
    purchaseInvoices, 
    addProduct, 
    updateProduct 
  } = useERP();
  
  const [currentEditId, setCurrentEditId] = useState<string | null>(editId);
  const [duplicateWarning, setDuplicateWarning] = useState<Product | null>(null);
  const [duplicateNoticeSuccess, setDuplicateNoticeSuccess] = useState(false);

  const currentProduct = useMemo(() => {
    if (!currentEditId) return null;
    return (products || []).find((p: Product) => p.id === currentEditId) || null;
  }, [currentEditId, products]);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Dattes Locales' as ProductCategory,
    origin: '',
    sellingPriceHT: 0,
    unitCostHT: 0,
    vatRate: 20,
    kgPerCarton: 5,
    cartonsPerPallet: 100,
    minStockAlertKg: 0,
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (currentProduct) {
      setFormData({
        name: currentProduct.name || '',
        category: (currentProduct.category as ProductCategory) || 'Dattes Locales',
        origin: currentProduct.origin || '',
        sellingPriceHT: currentProduct.sellingPriceHT || 0,
        unitCostHT: currentProduct.unitCostHT || 0,
        vatRate: currentProduct.vatRate || 20,
        kgPerCarton: currentProduct.kgPerCarton || 5,
        cartonsPerPallet: currentProduct.cartonsPerPallet || 100,
        minStockAlertKg: currentProduct.minStockAlertKg || 0,
        description: currentProduct.description || '',
        imageUrl: currentProduct.imageUrl || ''
      });
    } else {
      setFormData({
        name: '',
        category: 'Dattes Locales',
        origin: 'Maroc',
        sellingPriceHT: 0,
        unitCostHT: 0,
        vatRate: 20,
        kgPerCarton: 5,
        cartonsPerPallet: 100,
        minStockAlertKg: 0,
        description: '',
        imageUrl: ''
      });
    }
  }, [currentProduct]);

  // Compute active stock and frigos for the product being edited
  const productActiveStock = useMemo(() => {
    if (!currentProduct) return { totalKg: 0, frigoDetails: [], movementsCount: 0 };
    
    const prdStocks = stocks.filter(s => s.productId === currentProduct.id && s.quantityKg > 0);
    const frigoDetails = prdStocks.map(s => {
      const f = frigos.find(fr => fr.id === s.frigoId);
      return {
        frigoName: f ? f.name : s.frigoId,
        kg: s.quantityKg,
        pallets: s.quantityPallets
      };
    });

    const totalKg = prdStocks.reduce((sum, s) => sum + s.quantityKg, 0);

    // Count purchases and BLs
    let movementsCount = 0;
    purchaseInvoices.forEach(pur => {
      if ((pur.items || []).some((it: any) => it.productId === currentProduct.id || it.productCode === currentProduct.code)) {
        movementsCount++;
      }
    });
    deliveryNotes.forEach(bl => {
      if ((bl.items || []).some((it: any) => it.productId === currentProduct.id || it.productCode === currentProduct.code)) {
        movementsCount++;
      }
    });

    return { totalKg, frigoDetails, movementsCount };
  }, [currentProduct, stocks, frigos, purchaseInvoices, deliveryNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleDuplicateAsNew = () => {
    setCurrentEditId(null);
    setFormData(prev => ({
      ...prev,
      name: `${prev.name} (Nouveau)`
    }));
    setDuplicateNoticeSuccess(true);
    setTimeout(() => setDuplicateNoticeSuccess(false), 5000);
  };

  const executeSave = () => {
    const cleanData = {
      ...formData,
      category: (formData.category as ProductCategory) || 'Dattes Locales',
      unitCostHT: Number(formData.unitCostHT) || 0,
      sellingPriceHT: Number(formData.sellingPriceHT) || 0,
      kgPerCarton: Number(formData.kgPerCarton) || 5,
      cartonsPerPallet: Number(formData.cartonsPerPallet) || 100,
    };

    if (currentEditId) {
      updateProduct(currentEditId, cleanData);
    } else {
      addProduct(cleanData);
    }
    onBack();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Veuillez saisir le nom du produit.');
      return;
    }

    // Check for similar products
    const similars = findSimilarProducts(formData.name, products, currentEditId || undefined);
    if (similars.length > 0 && !duplicateWarning) {
      setDuplicateWarning(similars[0]);
      return;
    }

    executeSave();
  };

  const kgPerPallet = (Number(formData.kgPerCarton) || 0) * (Number(formData.cartonsPerPallet) || 0);
  const margin = (Number(formData.sellingPriceHT) || 0) - (Number(formData.unitCostHT) || 0);
  const marginPercent = (Number(formData.unitCostHT) || 0) > 0 ? (margin / Number(formData.unitCostHT)) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] text-[#161616]">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#e0e0e0] shadow-sm">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe] cursor-pointer">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {currentEditId ? t('stock.editProduct', 'Modifier la Fiche Produit') : t('stock.newProduct', 'Nouveau Produit')}
              </h1>
              {currentProduct && (
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold text-xs border border-blue-200">
                  {currentProduct.code}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {currentEditId ? `Édition des caractéristiques et prix du produit existant` : `Création d'une nouvelle référence avec stock initial vierge`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {currentEditId && (
            <button
              type="button"
              onClick={handleDuplicateAsNew}
              className="flex items-center px-3.5 py-2 border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded text-sm font-semibold transition-colors cursor-pointer"
              title="Créer un nouveau produit vierge (stock 0) avec les mêmes caractéristiques sans écraser ce produit"
            >
              <Copy className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              <span>Dupliquer (Stock 0)</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={onBack}
            className="flex items-center px-4 py-2 border border-[#393939] text-[#161616] bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
            {t('common.cancel', 'Annuler')}
          </button>

          <button 
            onClick={handleSubmit}
            className="flex items-center px-4 py-2 bg-[#0f62fe] text-white hover:bg-blue-700 rounded text-sm font-bold transition-colors shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
            {t('common.save', 'Enregistrer')}
          </button>
        </div>
      </div>

      {/* Duplicate Notice Banner */}
      {duplicateNoticeSuccess && (
        <div className="bg-purple-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Mode duplication activé : vous créez maintenant un <strong>NOUVEAU produit indépendant</strong> avec 0 Kg de stock initial. Le produit original n'a pas été touché.</span>
          </div>
          <button onClick={() => setDuplicateNoticeSuccess(false)} className="text-white hover:text-purple-200">✕</button>
        </div>
      )}

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Active Stock & Movement Warning Banner if Editing Active Product */}
          {currentEditId && currentProduct && productActiveStock.totalKg > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Attention : Produit actif avec {productActiveStock.totalKg.toLocaleString()} Kg en stock</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Ce produit (<strong>{currentProduct.code}</strong>) est actuellement stocké dans vos entrepôts frigos. Modifier la désignation changera l'affichage de ce produit sur tous les stocks existants et sur ses {productActiveStock.movementsCount} document(s) associés (Factures/BLs).
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {productActiveStock.frigoDetails.map((f, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded text-xs font-mono font-bold text-amber-900">
                    <Warehouse className="w-3.5 h-3.5 text-amber-700" />
                    {f.frigoName} : {f.kg.toLocaleString()} Kg ({f.pallets} pal)
                  </span>
                ))}
              </div>
              <div className="pt-2 text-xs text-amber-900 font-medium">
                💡 <em>Si vous souhaitez créer un produit différent (ex: Frites ou autre lot), cliquez sur <strong>"Dupliquer (Stock 0)"</strong> ci-dessus pour ne pas écraser ce stock.</em>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-6 space-y-8">
            
            {/* General Info */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-[#e0e0e0] pb-2 mb-4 flex items-center justify-between">
                <span>{t('stock.generalInfo', 'Informations Générales Produit')}</span>
                {currentProduct && (
                  <span className="text-xs text-gray-500 font-mono font-normal">Code SKU: <strong className="text-blue-700">{currentProduct.code}</strong></span>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.productName', 'Désignation du Produit')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="ex: Dattes Majhoul Premium 1Kg, Frites 2.5KG..."
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full carbon-input font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.category', 'Catégorie')} *
                  </label>
                  <select
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full carbon-input text-sm font-semibold"
                  >
                    <option value="Dattes Locales">Dattes Locales</option>
                    <option value="Dattes Importées">Dattes Importées</option>
                    <option value="Fruits Secs">Fruits Secs</option>
                    <option value="Huiles & Condiments">Huiles & Condiments</option>
                    <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.origin', 'Origine / Provenance')}
                  </label>
                  <input
                    type="text"
                    name="origin"
                    placeholder="ex: Maroc, Algérie, Tunisie, Égypte..."
                    value={formData.origin}
                    onChange={handleChange}
                    className="w-full carbon-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.imageUrl', 'URL Image Produit')}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="flex-1">
                      <input
                        type="url"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        className="w-full carbon-input text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    {formData.imageUrl && (
                      <div className="w-10 h-10 rounded border border-[#e0e0e0] overflow-hidden flex items-center justify-center bg-gray-50 shrink-0">
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Info */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-[#e0e0e0] pb-2 mb-4">
                {t('stock.pricing', 'Tarification & Prix HT (en DH/Kg)')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.unitCostHT', 'Prix de Revient HT (DH/Kg)')} *
                  </label>
                  <input
                    type="number"
                    name="unitCostHT"
                    required
                    min="0"
                    step="0.01"
                    value={formData.unitCostHT}
                    onChange={handleChange}
                    className="w-full carbon-input font-mono font-bold text-purple-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.sellingPriceHT', 'Prix de Vente HT (DH/Kg)')} *
                  </label>
                  <input
                    type="number"
                    name="sellingPriceHT"
                    required
                    min="0"
                    step="0.01"
                    value={formData.sellingPriceHT}
                    onChange={handleChange}
                    className="w-full carbon-input font-mono font-bold text-blue-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.vatRate', 'Taux TVA')} (%)
                  </label>
                  <input
                    type="number"
                    name="vatRate"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.vatRate}
                    onChange={handleChange}
                    className="w-full carbon-input font-mono text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 border border-[#e0e0e0] rounded flex space-x-8 rtl:space-x-reverse">
                <div>
                  <span className="text-xs text-gray-500 font-bold uppercase block">{t('stock.computedMargin', 'Marge Unitaire (DH/Kg)')}</span>
                  <span className={`text-xl font-bold font-mono ${margin > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {margin.toFixed(2)} DH
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-bold uppercase block">{t('stock.marginPercent', 'Taux de Marge Brute (%)')}</span>
                  <span className={`text-xl font-bold font-mono ${marginPercent > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Logistics Info */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-[#e0e0e0] pb-2 mb-4">
                {t('stock.logistics', 'Logistique & Conditionnement')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.kgPerCarton', 'Poids par Carton / Colis (Kg)')} *
                  </label>
                  <input
                    type="number"
                    name="kgPerCarton"
                    required
                    min="0.1"
                    step="0.01"
                    value={formData.kgPerCarton}
                    onChange={handleChange}
                    className="w-full carbon-input font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.cartonsPerPallet', 'Cartons par Palette')} *
                  </label>
                  <input
                    type="number"
                    name="cartonsPerPallet"
                    required
                    min="1"
                    step="1"
                    value={formData.cartonsPerPallet}
                    onChange={handleChange}
                    className="w-full carbon-input font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t('stock.minStockAlertKg', 'Seuil d\'Alerte Stock Min (Kg)')}
                  </label>
                  <input
                    type="number"
                    name="minStockAlertKg"
                    min="0"
                    step="0.1"
                    value={formData.minStockAlertKg}
                    onChange={handleChange}
                    className="w-full carbon-input font-mono text-sm text-amber-700 font-bold"
                  />
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 border border-[#e0e0e0] rounded flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-bold uppercase block">{t('stock.computedKgPerPallet', 'Poids Théorique Palette (Kg)')}</span>
                  <span className="text-base font-bold font-mono text-[#161616]">{kgPerPallet.toFixed(2)} Kg / Palette</span>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  1 Palette = {formData.cartonsPerPallet} colis × {formData.kgPerCarton} kg
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-[#e0e0e0] pb-2 mb-4">
                {t('stock.additionalInfo', 'Informations Complémentaires')}
              </h2>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {t('common.description', 'Description & remarques particulières')}
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full carbon-input text-sm resize-none"
                ></textarea>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Similar Product Duplicate Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-xl shadow-2xl border border-amber-300 p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Produit similaire détecté !</span>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed">
              Un produit avec une désignation très similaire existe déjà dans votre catalogue :
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <div className="font-bold text-xs text-gray-900">{duplicateWarning.name}</div>
              <div className="text-[11px] text-gray-600 font-mono">
                Code : <strong className="text-blue-700">{duplicateWarning.code}</strong> • Catégorie : {duplicateWarning.category}
              </div>
            </div>

            <p className="text-xs text-gray-700 font-medium">
              Voulez-vous tout de même créer cette référence, ou préférez-vous annuler pour éviter les doublons ?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-3.5 py-1.5 border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Annuler & Modifier le nom
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicateWarning(null);
                  executeSave();
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Confirmer l'Enregistrement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
