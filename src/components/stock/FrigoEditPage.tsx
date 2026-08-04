import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X } from 'lucide-react';

export const FrigoEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t } = useTranslation();
  const { frigos, addFrigo, updateFrigo } = useERP();
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    managerName: '',
    managerPhone: '',
    whatsappGroup: '',
    whatsappGroupLink: '',
    capacityPallets: 0
  });

  useEffect(() => {
    if (editId) {
      const frigo = (frigos || []).find((f: any) => f.id === editId);
      if (frigo) {
        setFormData({
          name: frigo.name || '',
          location: frigo.location || '',
          managerName: frigo.managerName || '',
          managerPhone: frigo.managerPhone || '',
          whatsappGroup: frigo.whatsappGroup || '',
          whatsappGroupLink: frigo.whatsappGroupLink || '',
          capacityPallets: frigo.capacityPallets || 0
        });
      }
    }
  }, [editId, frigos]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      // ✅ CORRECT: pass (id, partialData) separately
      updateFrigo(editId, formData);
    } else {
      // ✅ CORRECT: let ERPContext generate its own id
      addFrigo(formData);
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
          <h1 className="text-xl font-semibold">
            {editId ? t('frigos.editFrigo', 'Modifier Entrepôt Frigo') : t('frigos.addFrigo', 'Nouveau Frigo')}
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
            className="flex items-center px-4 py-2 bg-[#0f62fe] text-white hover:bg-blue-700 rounded text-sm font-medium transition-colors"
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
            {/* General Info */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('stock.generalInfo', 'Informations Générales')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.frigoName', 'Nom du Frigo')} *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.location', 'Emplacement / Adresse')}</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.capacityPallets', 'Capacité Totale (Palettes)')}</label>
                  <input
                    type="number"
                    name="capacityPallets"
                    min="0"
                    value={formData.capacityPallets}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>
            </div>

            {/* Manager Info */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('stock.managerInfo', 'Responsable du Frigo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.managerName', 'Nom du Responsable')}</label>
                  <input
                    type="text"
                    name="managerName"
                    value={formData.managerName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.managerPhone', 'Téléphone du Responsable')}</label>
                  <input
                    type="text"
                    name="managerPhone"
                    value={formData.managerPhone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Group Info */}
            <div>
              <h2 className="text-lg font-medium border-b border-[#e0e0e0] pb-2 mb-4">{t('stock.whatsappGroup', 'Groupe WhatsApp Frigo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.whatsappGroupName', 'Nom du Groupe WhatsApp')}</label>
                  <input
                    type="text"
                    name="whatsappGroup"
                    value={formData.whatsappGroup}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('stock.whatsappGroupLink', 'Lien d\'invitation WhatsApp')}</label>
                  <input
                    type="url"
                    name="whatsappGroupLink"
                    value={formData.whatsappGroupLink}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe]"
                    placeholder="https://chat.whatsapp.com/..."
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
