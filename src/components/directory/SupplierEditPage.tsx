import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X } from 'lucide-react';

export const SupplierEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t } = useTranslation();
  const { suppliers, addSupplier, updateSupplier } = useERP();
  
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    country: '',
    iceOrTaxId: '',
    email: '',
    phone: '',
    address: '',
    type: 'LOCAL'
  });

  useEffect(() => {
    if (editId) {
      const supplier = (suppliers || []).find((s: any) => s.id === editId);
      if (supplier) {
        setFormData({
          name: supplier.name || '',
          companyName: supplier.companyName || '',
          country: supplier.country || '',
          iceOrTaxId: supplier.iceOrTaxId || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          type: supplier.type || 'LOCAL'
        });
      }
    }
  }, [editId, suppliers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSupplier = {
      ...formData,
      type: (formData.type as 'LOCAL' | 'IMPORTATION') || 'LOCAL'
    };
    if (editId) {
      updateSupplier(editId, cleanSupplier);
    } else {
      addSupplier(cleanSupplier);
    }
    onBack();
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] text-[#161616]">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#e0e0e0] shadow-sm">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe]">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-bold">
            {editId ? t('directory.editSupplier', 'Modifier la Fiche Fournisseur') : t('directory.newSupplier', 'Nouveau Fournisseur')}
          </h1>
        </div>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button 
            type="button" 
            onClick={onBack}
            className="flex items-center px-4 py-2 border border-[#393939] text-[#161616] bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('common.cancel', 'Annuler')}
          </button>
          <button 
            onClick={handleSubmit}
            className="flex items-center px-4 py-2 bg-[#0f62fe] text-white hover:bg-blue-700 rounded text-sm font-bold transition-colors shadow-md"
          >
            <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('common.save', 'Enregistrer')}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-6 space-y-8">
            {/* Identity Info */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-[#e0e0e0] pb-2 mb-4">
                {t('directory.identity', "Informations d'Identité")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    {t('directory.name', 'Nom du Fournisseur')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full carbon-input text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    {t('directory.companyName', 'Raison Sociale / Entreprise')}
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full carbon-input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t('directory.type')} *</label>
                  <select
                    name="type"
                    required
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  >
                    <option value="LOCAL">{t('directory.typeLocal')}</option>
                    <option value="IMPORTATION">{t('directory.typeImportation')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('directory.country')}</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('directory.iceOrTaxId')}</label>
                  <input
                    type="text"
                    name="iceOrTaxId"
                    value={formData.iceOrTaxId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('directory.contact')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('directory.email')}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('directory.phone')} *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{t('directory.address')}</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
