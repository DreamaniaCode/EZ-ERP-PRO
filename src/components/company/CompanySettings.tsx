import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { CompanyInfo, RecalculationSummaryReport } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { GlobalPriceRecalculationModal } from './GlobalPriceRecalculationModal';
import { 
  Building, 
  Save, 
  CheckCircle, 
  FileText, 
  Image as ImageIcon, 
  Landmark, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  ShieldCheck,
  Building2,
  RefreshCw,
  Zap,
  BarChart3,
  Database
} from 'lucide-react';

export const CompanySettings: React.FC = () => {
  const { companyInfo, updateCompanyInfo, recalculateAllBLPrices, deliveryNotes } = useERP();
  const [formData, setFormData] = useState<CompanyInfo>({ ...companyInfo });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Recalculation State
  const [isRecalcModalOpen, setIsRecalcModalOpen] = useState(false);
  const [isRecalcProcessing, setIsRecalcProcessing] = useState(false);
  const [recalcReport, setRecalcReport] = useState<RecalculationSummaryReport | null>(null);

  const handleRunRecalculation = async () => {
    setIsRecalcProcessing(true);
    setIsRecalcModalOpen(true);
    try {
      const report = await recalculateAllBLPrices();
      setRecalcReport(report);
    } catch (err) {
      console.error('Error running recalculation:', err);
    } finally {
      setIsRecalcProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyInfo(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const exportData = [
    { Champ: 'Raison Sociale', Valeur: formData.name },
    { Champ: 'ICE', Valeur: formData.ice },
    { Champ: 'Registre Commerce (RC)', Valeur: formData.rc },
    { Champ: 'Identifiant Fiscal (IF)', Valeur: formData.if },
    { Champ: 'Patente', Valeur: formData.patente },
    { Champ: 'CNSS', Valeur: formData.cnss },
    { Champ: 'Capital Social', Valeur: formData.capital },
    { Champ: 'Adresse Siège', Valeur: formData.address },
    { Champ: 'Ville', Valeur: formData.city },
    { Champ: 'Téléphone', Valeur: formData.phone },
    { Champ: 'Email', Valeur: formData.email },
    { Champ: 'Site Web', Valeur: formData.website },
    { Champ: 'Banque', Valeur: formData.bankName },
    { Champ: 'RIB', Valeur: formData.rib },
    { Champ: 'SWIFT', Valeur: formData.swift },
  ];

  return (
    <div className="space-y-6" id="company-settings-page">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-[#0f62fe] rounded-lg border border-blue-200">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Informations de la Société (En-tête Documentaire)</h1>
            <p className="text-xs text-gray-500">Paramètres de la société affichés sur les Bons de Livraison (BL), Factures & Devis</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons 
            filename="Fiche_Identite_Entreprise" 
            title="Identité & Coordonnées Officielle de la Société" 
            excelData={exportData}
            pdfElementId="company-settings-page"
          />
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Informations de l'entreprise enregistrées avec succès ! Elles seront appliquées sur tous les futurs BL et Factures.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white p-5 rounded-lg border border-[#e0e0e0] shadow-sm space-y-6 text-xs">
          
          {/* Section 1: Legal Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-sm font-bold text-gray-900">
              <ShieldCheck className="w-4 h-4 text-[#0f62fe]" />
              <span>Identité Légale & Raison Sociale</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom / Raison Sociale de l'Entreprise *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">I.C.E. (Identifiant Commun de l'Entreprise) *</label>
                <input
                  type="text"
                  required
                  value={formData.ice}
                  onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded font-mono text-xs font-bold text-blue-900 focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Registre du Commerce (R.C.)</label>
                <input
                  type="text"
                  value={formData.rc}
                  onChange={(e) => setFormData({ ...formData, rc: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Identifiant Fiscal (I.F.)</label>
                <input
                  type="text"
                  value={formData.if}
                  onChange={(e) => setFormData({ ...formData, if: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Patente / CNSS</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Patente"
                    value={formData.patente}
                    onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                  <input
                    type="text"
                    placeholder="CNSS"
                    value={formData.cnss}
                    onChange={(e) => setFormData({ ...formData, cnss: e.target.value })}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Capital Social</label>
                <input
                  type="text"
                  value={formData.capital}
                  onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Address */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-sm font-bold text-gray-900">
              <MapPin className="w-4 h-4 text-[#0f62fe]" />
              <span>Adresse & Coordonnées de Contact</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse du Siège Social</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ville & Pays</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone de la Société</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Officiel</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Site Web</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Banking Details */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-sm font-bold text-gray-900">
              <Landmark className="w-4 h-4 text-[#0f62fe]" />
              <span>Coordonnées Bancaires (Pour Règlements)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de la Banque & Agence</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Code SWIFT / BIC</label>
                <input
                  type="text"
                  value={formData.swift}
                  onChange={(e) => setFormData({ ...formData, swift: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">R.I.B. (24 Chiffres)</label>
                <input
                  type="text"
                  value={formData.rib}
                  onChange={(e) => setFormData({ ...formData, rib: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded font-mono font-bold text-xs text-blue-900 focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Logo Upload */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-sm font-bold text-gray-900">
              <ImageIcon className="w-4 h-4 text-[#0f62fe]" />
              <span>Logo Officiel de l'Entreprise</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {formData.logoUrl ? (
                <div className="w-24 h-24 p-2 bg-white border border-gray-300 rounded flex items-center justify-center relative group">
                  <img src={formData.logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 text-xs font-bold hover:bg-rose-700"
                    title="Supprimer le logo"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 bg-gray-100 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-[10px]">Aucun logo</span>
                </div>
              )}

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[10px] text-gray-500">Format recommandé: PNG ou JPG transparent, résolution 300x120px.</p>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Ou URL d'image directe:</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formData.logoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-[#0f62fe] hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-6 py-2.5 rounded shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Informations</span>
            </button>
          </div>
        </form>

        {/* Live Document En-Tête Preview Card */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#e0e0e0] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Aperçu de l'En-tête Documentaire (BL / Facture)</span>
            </h3>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-800 space-y-3 font-sans">
              <div className="flex items-start justify-between gap-3 border-b border-gray-300 pb-3">
                <div className="space-y-1">
                  {formData.logoUrl && (
                    <img src={formData.logoUrl} alt="Logo" className="h-8 object-contain mb-1" />
                  )}
                  <div className="font-bold text-xs text-blue-950 uppercase">{formData.name || 'NOM SOCIÉTÉ'}</div>
                  <div className="text-gray-600 text-[10px]">{formData.address}, {formData.city}</div>
                  <div className="text-gray-600 text-[10px]">Tél: {formData.phone} | {formData.email}</div>
                </div>

                <div className="text-right space-y-0.5 text-[9px] font-mono text-gray-600">
                  <div className="font-bold text-gray-900">I.C.E: {formData.ice}</div>
                  <div>R.C: {formData.rc}</div>
                  <div>I.F: {formData.if}</div>
                  <div>Patente: {formData.patente}</div>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded border border-gray-200 space-y-1 font-mono text-[10px]">
                <div className="font-bold text-gray-900 flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-emerald-600" />
                  <span>{formData.bankName}</span>
                </div>
                <div className="text-blue-900 font-bold">RIB: {formData.rib}</div>
                <div className="text-gray-500">SWIFT: {formData.swift}</div>
              </div>

              <p className="text-[9px] text-gray-400 italic text-center">
                * Cet en-tête et pied de page seront imprimés automatiquement sur chaque Bon de Livraison PDF et Facture.
              </p>
            </div>
          </div>

          {/* Global Price Recalculation Card */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-5 rounded-lg border border-blue-900 shadow-sm text-white space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-blue-800/60">
              <div className="p-2 bg-blue-500/20 text-yellow-300 rounded-md">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Recalculation Globale des Prix BL</h3>
                <p className="text-[10px] text-blue-200">Synchronisation automatique Firestore</p>
              </div>
            </div>

            <p className="text-xs text-blue-100 leading-relaxed">
              Mets à jour l'ensemble des tarif de ventes sur les <strong>{deliveryNotes.length} Bons de Livraison (BL)</strong> existants selon le prix unitaire actuel de chaque fiche produit du catalogue.
            </p>

            <div className="p-3 bg-white/10 rounded-lg border border-white/10 space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-blue-200">
                <span>Périmètre d'analyse :</span>
                <span className="font-mono font-bold text-white">{deliveryNotes.length} BL en base</span>
              </div>
              {recalcReport && (
                <div className="flex justify-between items-center text-emerald-300 font-bold border-t border-white/10 pt-1 mt-1">
                  <span>Dernière exécution :</span>
                  <span className="font-mono">{recalcReport.updatedBLsCount} BL ajustés</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleRunRecalculation}
                disabled={isRecalcProcessing}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 text-white font-bold px-4 py-2.5 rounded shadow-md transition disabled:opacity-50 text-xs cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRecalcProcessing ? 'animate-spin' : ''}`} />
                <span>Lancer la Recalculation Globale</span>
              </button>

              {recalcReport && (
                <button
                  type="button"
                  onClick={() => setIsRecalcModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-blue-100 font-semibold px-3 py-1.5 rounded transition text-xs border border-white/10 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Consulter le Rapport Détaillé</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recalculation Report Modal */}
      <GlobalPriceRecalculationModal
        isOpen={isRecalcModalOpen}
        onClose={() => setIsRecalcModalOpen(false)}
        report={recalcReport}
        isProcessing={isRecalcProcessing}
        onReRun={handleRunRecalculation}
      />
    </div>
  );
};
