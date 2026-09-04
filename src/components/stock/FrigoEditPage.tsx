import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { ArrowLeft, Save, X, Loader2 } from 'lucide-react';

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

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (editId && !isInitializedRef.current) {
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
        isInitializedRef.current = true;
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert('Veuillez saisir un nom pour l\'entrepôt frigo.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (editId) {
        await updateFrigo(editId, formData);
      } else {
        await addFrigo(formData);
      }
      onBack();
    } catch (err: any) {
      console.error('Erreur sauvegarde frigo:', err);
      const msg = err.message || 'Impossible d\'enregistrer les modifications du frigo.';
      setSaveError(msg);
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] text-[#161616]">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#e0e0e0] shadow-sm">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button 
            type="button"
            onClick={onBack} 
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe] disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-bold">
            {editId ? t('frigos.editFrigo', 'Modifier Entrepôt Frigo') : t('frigos.addFrigo', 'Nouveau Frigo')}
          </h1>
        </div>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button 
            type="button" 
            onClick={onBack}
            disabled={isSaving}
            className="flex items-center px-4 py-2 border border-[#393939] text-[#161616] bg-white hover:bg-gray-50 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('common.cancel', 'Annuler')}
          </button>
          <button 
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="flex items-center px-4 py-2 bg-[#0f62fe] text-white hover:bg-blue-700 rounded text-sm font-bold transition-colors shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                <span>{t('common.save', 'Enregistrer')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-6 space-y-8">
            {/* General Info */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-[#e0e0e0] pb-2 mb-4">
                {t('stock.generalInfo', 'Informations Générales')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    {t('stock.frigoName', 'Nom du Frigo')} *
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
                    {t('stock.location', 'Emplacement / Adresse')}
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full carbon-input text-sm"
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
