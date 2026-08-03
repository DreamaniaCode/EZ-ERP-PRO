import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X, Image as ImageIcon } from 'lucide-react';

export const ProductEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t } = useTranslation();
  const { products, addProduct, updateProduct } = useERP();
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Dattes Locales',
    origin: '',
    sellingPriceHT: 0,
    unitCostHT: 0,
    vatRate: 20,
    kgPerCarton: 0,
    cartonsPerPallet: 0,
    minStockAlertKg: 0,
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (editId) {
      const product = (products || []).find((p: any) => p.id === editId);
      if (product) {
        setFormData({
          name: product.name || '',
          category: product.category || 'Dattes Locales',
          origin: product.origin || '',
          sellingPriceHT: product.sellingPriceHT || 0,
          unitCostHT: product.unitCostHT || 0,
          vatRate: product.vatRate || 20,
          kgPerCarton: product.kgPerCarton || 0,
          cartonsPerPallet: product.cartonsPerPallet || 0,
          minStockAlertKg: product.minStockAlertKg || 0,
          description: product.description || '',
          imageUrl: product.imageUrl || ''
        });
      }
    }
  }, [editId, products]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateProduct({ id: editId, ...formData });
    } else {
      addProduct({ id: Date.now().toString(), ...formData });
    }
    onBack();
  };

  const kgPerPallet = (formData.kgPerCarton || 0) * (formData.cartonsPerPallet || 0);
  const margin = (formData.sellingPriceHT || 0) - (formData.unitCostHT || 0);
  const marginPercent = (formData.unitCostHT || 0) > 0 ? (margin / formData.unitCostHT) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] text-[#161616]">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#e0e0e0] shadow-sm">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe]">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-semibold">
            {editId ? t('stock.editProduct') : t('stock.newProduct')}
          </h1>
        </div>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button 
            type="button" 
            onClick={onBack}
            className="flex items-center px-4 py-2 border border-[#393939] text-[#161616] bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            className="flex items-center px-4 py-2 bg-[#0f62fe] text-white hover:bg-blue-700 rounded text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('common.save')}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-6 space-y-8">
            {/* General Info */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('stock.generalInfo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.productName')} *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.category')} *</label>
                  <select
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
                  >
                    <option value="Dattes Locales">Dattes Locales</option>
                    <option value="Dattes Importées">Dattes Importées</option>
                    <option value="Fruits Secs">Fruits Secs</option>
                    <option value="Huiles & Condiments">Huiles & Condiments</option>
                    <option value="Autres Produits Alimentaires">Autres Produits Alimentaires</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.origin')}</label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.imageUrl')}</label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="flex-1">
                      <input
                        type="url"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                        placeholder="https://..."
                      />
                    </div>
                    {formData.imageUrl && (
                      <div className="w-10 h-10 rounded border border-[#e0e0e0] overflow-hidden flex items-center justify-center bg-gray-50">
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Info */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('stock.pricing')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.unitCostHT')} *</label>
                  <input
                    type="number"
                    name="unitCostHT"
                    required
                    min="0"
                    step="0.01"
                    value={formData.unitCostHT}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.sellingPriceHT')} *</label>
                  <input
                    type="number"
                    name="sellingPriceHT"
                    required
                    min="0"
                    step="0.01"
                    value={formData.sellingPriceHT}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.vatRate')} (%)</label>
                  <input
                    type="number"
                    name="vatRate"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.vatRate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 border border-[#e0e0e0] rounded-md flex space-x-8 rtl:space-x-reverse">
                <div>
                  <span className="text-sm text-gray-500 block">{t('stock.computedMargin')}</span>
                  <span className={`text-lg font-semibold ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margin.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">{t('stock.marginPercent')}</span>
                  <span className={`text-lg font-semibold ${marginPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Logistics Info */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('stock.logistics')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.kgPerCarton')} *</label>
                  <input
                    type="number"
                    name="kgPerCarton"
                    required
                    min="0"
                    step="0.01"
                    value={formData.kgPerCarton}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.cartonsPerPallet')} *</label>
                  <input
                    type="number"
                    name="cartonsPerPallet"
                    required
                    min="0"
                    value={formData.cartonsPerPallet}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.minStockAlertKg')} *</label>
                  <input
                    type="number"
                    name="minStockAlertKg"
                    required
                    min="0"
                    step="0.1"
                    value={formData.minStockAlertKg}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-50 border border-[#e0e0e0] rounded-md">
                <span className="text-sm text-gray-500 block">{t('stock.computedKgPerPallet')}</span>
                <span className="text-lg font-semibold text-[#161616]">{kgPerPallet.toFixed(2)} kg</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('stock.additionalInfo')}</h2>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.description')}</label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] resize-none"
                ></textarea>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
