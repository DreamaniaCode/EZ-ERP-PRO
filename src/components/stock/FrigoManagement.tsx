import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ColdStorageFrigo } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { StockTransferModal } from './StockTransferModal';
import { 
  Warehouse, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Phone, 
  MessageSquare, 
  MapPin, 
  UserCheck, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Layers,
  ArrowLeftRight
} from 'lucide-react';


interface FrigoManagementProps {
  onEditFrigo?: (id: string) => void;
  onNewFrigo?: () => void;
}

export const FrigoManagement: React.FC<FrigoManagementProps> = ({ onEditFrigo, onNewFrigo }) => {
  const { frigos, stocks, products, deliveryNotes, addFrigo, updateFrigo, deleteFrigo } = useERP();


  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingFrigo, setEditingFrigo] = useState<ColdStorageFrigo | null>(null);
  const [selectedFrigoDetail, setSelectedFrigoDetail] = useState<ColdStorageFrigo | null>(null);


  // Form State for Add / Edit
  const [formData, setFormData] = useState<Omit<ColdStorageFrigo, 'id' | 'code'>>({
    name: '',
    location: '',
    managerName: '',
    managerPhone: '',
    whatsappGroup: '',
    whatsappGroupLink: '',
    capacityPallets: 1000,
  });

  // Calculate stats for each frigo
  const getFrigoStockStats = (frigoId: string) => {
    const frigoStocks = stocks.filter(s => s.frigoId === frigoId);
    const totalPallets = frigoStocks.reduce((sum, s) => sum + s.quantityPallets, 0);
    const totalKg = frigoStocks.reduce((sum, s) => sum + s.quantityKg, 0);
    return { totalPallets, totalKg };
  };

  const filteredFrigos = frigos.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.managerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Overall Global Capacity Stats
  const totalCapacityPallets = frigos.reduce((sum, f) => sum + (f.capacityPallets || 0), 0);
  const totalOccupiedPallets = stocks.reduce((sum, s) => sum + s.quantityPallets, 0);
  const totalOccupiedKg = stocks.reduce((sum, s) => sum + s.quantityKg, 0);
  const globalOccupationRate = totalCapacityPallets > 0 ? Math.round((totalOccupiedPallets / totalCapacityPallets) * 100) : 0;

  const handleOpenAdd = () => {
    if (onNewFrigo) {
      onNewFrigo();
      return;
    }
    setFormData({
      name: '',
      location: 'Casablanca',
      managerName: '',
      managerPhone: '+212 6',
      whatsappGroup: 'Groupe WhatsApp Frigo',
      whatsappGroupLink: '',
      capacityPallets: 1000,
    });
    setEditingFrigo(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (frigo: ColdStorageFrigo) => {
    if (onEditFrigo) {
      onEditFrigo(frigo.id);
      return;
    }
    setEditingFrigo(frigo);
    setFormData({
      name: frigo.name,
      location: frigo.location,
      managerName: frigo.managerName,
      managerPhone: frigo.managerPhone,
      whatsappGroup: frigo.whatsappGroup,
      whatsappGroupLink: frigo.whatsappGroupLink,
      capacityPallets: frigo.capacityPallets,
    });
    setShowAddModal(true);
  };

  const handleSaveFrigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Veuillez saisir le nom du frigo.');
      return;
    }

    if (editingFrigo) {
      updateFrigo(editingFrigo.id, formData);
    } else {
      addFrigo(formData);
    }

    setShowAddModal(false);
  };

  const handleDeleteFrigo = (frigo: ColdStorageFrigo) => {
    const frigoStocks = stocks.filter(s => s.frigoId === frigo.id && s.quantityKg > 0);
    if (frigoStocks.length > 0) {
      alert(`Impossible de supprimer le frigo "${frigo.name}" car il contient du stock actif. Veuillez d'abord transférer ou vider le stock.`);
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer l'entrepôt frigorifique "${frigo.name}" ?`)) {
      deleteFrigo(frigo.id);
    }
  };

  // Export Data prep
  const exportData = frigos.map(f => {
    const { totalPallets, totalKg } = getFrigoStockStats(f.id);
    const freePallets = Math.max(0, f.capacityPallets - totalPallets);
    const rate = f.capacityPallets > 0 ? Math.round((totalPallets / f.capacityPallets) * 100) : 0;
    return {
      'Code Frigo': f.code,
      'Nom de l\'Entrepôt': f.name,
      'Emplacement': f.location,
      'Responsable Quai': f.managerName,
      'Téléphone Contact': f.managerPhone,
      'Capacité (Palettes)': f.capacityPallets,
      'Palettes Occupées': totalPallets,
      'Palettes Disponibles': freePallets,
      'Stock Total (Kg)': totalKg,
      'Taux d\'Occupation': `${rate}%`,
    };
  });

  return (
    <div className="space-y-6" id="frigo-management-page">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-[#0f62fe] rounded-lg border border-blue-200">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestion des Entrepôts Frigorifiques (Frigos)</h1>
            <p className="text-xs text-gray-500">Supervision des capacités, responsables de quai & stocks multi-sites</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons 
            filename="Frigos_Supervision_ERP" 
            title="Liste des Entrepôts Frigorifiques & Capacités" 
            excelData={exportData}
            pdfElementId="frigo-management-page"
          />

          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2 rounded transition shadow-sm"
            title="Transférer du stock d'un frigo vers un autre"
          >
            <ArrowLeftRight className="w-4 h-4 text-cyan-300" />
            <span>Transfert Inter-Frigos</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-[#0f62fe] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-3.5 py-2 rounded transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Frigo</span>
          </button>
        </div>

      </div>

      {/* Global Capacity Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Entrepôts Actifs</span>
            <Warehouse className="w-4 h-4 text-[#0f62fe]" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{frigos.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Sites frigorifiques configurés</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Capacité Globale (Palettes)</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{totalCapacityPallets.toLocaleString()} <span className="text-sm font-normal text-gray-500">Pal.</span></div>
          <div className="text-[11px] text-emerald-600 mt-1">~{(totalCapacityPallets * 0.8).toLocaleString()} Tonnes max</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Stock Stocké en Frigo</span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{totalOccupiedPallets.toLocaleString()} <span className="text-sm font-normal text-gray-500">Pal.</span></div>
          <div className="text-[11px] text-purple-600 mt-1">{(totalOccupiedKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} Tonnes ({totalOccupiedKg.toLocaleString()} Kg)</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Taux d'Occupation</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{globalOccupationRate}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full ${globalOccupationRate > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, globalOccupationRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter / Search Control Bar */}
      <div className="bg-white p-3 rounded-lg border border-[#e0e0e0] shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, code, ville, responsable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:bg-white focus:outline-none focus:border-[#0f62fe]"
          />
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Affichage de <b>{filteredFrigos.length}</b> sur <b>{frigos.length}</b> entrepôts
        </div>
      </div>

      {/* Frigos Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFrigos.map(frigo => {
          const { totalPallets, totalKg } = getFrigoStockStats(frigo.id);
          const freePallets = Math.max(0, frigo.capacityPallets - totalPallets);
          const occupationPercent = frigo.capacityPallets > 0 ? Math.round((totalPallets / frigo.capacityPallets) * 100) : 0;

          return (
            <div 
              key={frigo.id} 
              className="bg-white border border-[#e0e0e0] rounded-lg shadow-sm hover:border-[#0f62fe] transition flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                      {frigo.code}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-1.5">{frigo.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{frigo.location}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(frigo)}
                      className="p-1.5 text-gray-400 hover:text-[#0f62fe] hover:bg-blue-50 rounded transition"
                      title="Modifier les infos"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFrigo(frigo)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      title="Supprimer le frigo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body & Capacity Gauge */}
              <div className="p-4 space-y-3 flex-1 text-xs text-gray-700">
                {/* Manager Contact */}
                <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-800">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      Responsable Quai:
                    </span>
                    <span className="font-bold text-gray-900">{frigo.managerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      Téléphone:
                    </span>
                    <a href={`tel:${frigo.managerPhone}`} className="font-mono text-blue-700 hover:underline">
                      {frigo.managerPhone}
                    </a>
                  </div>
                  {frigo.whatsappGroupLink && (
                    <div className="pt-1 border-t border-gray-200 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Groupe WhatsApp:
                      </span>
                      <a 
                        href={frigo.whatsappGroupLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                      >
                        <span>Rejoindre</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Occupation Gauge */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-600">Occupation Palettes:</span>
                    <span className="font-bold text-gray-900">
                      {totalPallets} / {frigo.capacityPallets} <span className="text-[10px] font-normal text-gray-500">({occupationPercent}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        occupationPercent >= 90 ? 'bg-rose-500' : occupationPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, occupationPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                    <span>Disponibles: <b>{freePallets} Pal.</b></span>
                    <span>Poids total: <b>{(totalKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} T</b></span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setSelectedFrigoDetail(frigo)}
                  className="w-full text-center text-xs font-semibold text-[#0f62fe] bg-white border border-[#0f62fe] hover:bg-blue-50 py-1.5 rounded transition flex items-center justify-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Voir Détail du Stock</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Frigo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-300 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-[#0f62fe]" />
                <span>{editingFrigo ? 'Modifier l\'Entrepôt Frigorifique' : 'Nouveau Frigo'}</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveFrigo} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du Frigo / Entrepôt *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frigo MFADEL, Frigo C - Port Casa..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ville / Emplacement</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Casablanca, Erfoud, Agadir"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Capacité Max (Palettes)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacityPallets}
                    onChange={(e) => setFormData({ ...formData, capacityPallets: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Responsable de Quai</label>
                  <input
                    type="text"
                    placeholder="Nom du responsable"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone Contact</label>
                  <input
                    type="text"
                    placeholder="+212 6..."
                    value={formData.managerPhone}
                    onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du Groupe WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Groupe WhatsApp Frigo..."
                    value={formData.whatsappGroup}
                    onChange={(e) => setFormData({ ...formData, whatsappGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lien du Groupe WhatsApp</label>
                  <input
                    type="text"
                    placeholder="https://chat.whatsapp.com/..."
                    value={formData.whatsappGroupLink}
                    onChange={(e) => setFormData({ ...formData, whatsappGroupLink: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f62fe] text-white rounded font-semibold hover:bg-blue-700 shadow-sm"
                >
                  {editingFrigo ? 'Enregistrer les Modifications' : 'Créer le Frigo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Multi-Tab View Modal per Frigo */}
      {selectedFrigoDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-300 shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-200 bg-[#161616] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#0f62fe] px-2 py-0.5 bg-[#262626] border border-[#525252] rounded">
                    {selectedFrigoDetail.code}
                  </span>
                  <h3 className="font-bold text-lg text-white">
                    Fiche Complète Entrepôt Frigo: {selectedFrigoDetail.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Emplacement: <b>{selectedFrigoDetail.location}</b> • Responsable: <b>{selectedFrigoDetail.managerName || 'Non Assigné'}</b> ({selectedFrigoDetail.managerPhone || '-'})
                </p>
              </div>

              <div className="flex items-center gap-3">
                {(() => {
                  const frigoStocks = stocks.filter(s => s.frigoId === selectedFrigoDetail.id && s.quantityKg > 0);
                  const frigoBLs = deliveryNotes.filter(bl => bl.frigoId === selectedFrigoDetail.id || bl.frigoName === selectedFrigoDetail.name);

                  return (
                    <ExportButtons
                      filename={`Situation_Frigo_${selectedFrigoDetail.code}_${selectedFrigoDetail.name.replace(/\s+/g, '_')}`}
                      title={`SITUATION FRIGO LOGISTIQUE & VALORISATION - ${selectedFrigoDetail.name.toUpperCase()} (${selectedFrigoDetail.code})`}
                      frigoName={selectedFrigoDetail.name}
                      excelData={frigoStocks.map(stk => {
                        const prd = products.find(p => p.id === stk.productId);
                        const valHT = stk.quantityKg * (prd?.unitCostHT || 0);
                        const valVenteHT = stk.quantityKg * (prd?.sellingPriceHT || 0);
                        return {
                          'Code Frigo': selectedFrigoDetail.code,
                          'Nom Frigo': selectedFrigoDetail.name,
                          'Emplacement': selectedFrigoDetail.location,
                          'Code Produit': prd?.code || 'PRD',
                          'Désignation Produit': prd?.name || 'Inconnu',
                          'Catégorie': prd?.category || '-',
                          'Poids Stocké (Kg)': stk.quantityKg,
                          'Nombre Palettes': stk.quantityPallets,
                          'Prix Revient Unitaire HT': prd?.unitCostHT || 0,
                          'Prix Vente Unitaire HT': prd?.sellingPriceHT || 0,
                          'Valorisation Coût HT (DH)': valHT,
                          'Valorisation Vente HT (DH)': valVenteHT,
                        };
                      })}
                    />
                  );
                })()}

                <button 
                  onClick={() => setSelectedFrigoDetail(null)}
                  className="text-gray-400 hover:text-white font-bold text-xl px-2"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-white text-xs">
              {(() => {
                const frigoStocks = stocks.filter(s => s.frigoId === selectedFrigoDetail.id && s.quantityKg > 0);
                const frigoBLs = deliveryNotes.filter(bl => bl.frigoId === selectedFrigoDetail.id || bl.frigoName === selectedFrigoDetail.name);

                // Clients list for this frigo
                const clientVolumeMap: { [clientId: string]: { name: string; kg: number; totalHT: number; count: number } } = {};
                frigoBLs.forEach(bl => {
                  if (!clientVolumeMap[bl.clientId]) {
                    clientVolumeMap[bl.clientId] = { name: bl.clientName, kg: 0, totalHT: 0, count: 0 };
                  }
                  clientVolumeMap[bl.clientId].kg += bl.totalKg;
                  clientVolumeMap[bl.clientId].totalHT += bl.totalHT;
                  clientVolumeMap[bl.clientId].count += 1;
                });

                // Financial Valuation Totals
                const totalFrigoValuationHT = frigoStocks.reduce((sum, stk) => {
                  const prd = products.find(p => p.id === stk.productId);
                  return sum + (stk.quantityKg * (prd?.unitCostHT || 0));
                }, 0);

                const totalFrigoVenteHT = frigoStocks.reduce((sum, stk) => {
                  const prd = products.find(p => p.id === stk.productId);
                  return sum + (stk.quantityKg * (prd?.sellingPriceHT || 0));
                }, 0);

                const totalFrigoKg = frigoStocks.reduce((sum, s) => sum + s.quantityKg, 0);
                const totalFrigoPallets = frigoStocks.reduce((sum, s) => sum + s.quantityPallets, 0);

                return (
                  <div className="space-y-6">
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-900">
                        <div className="text-[10px] text-blue-700 font-bold uppercase">Poids Total Stocké</div>
                        <div className="text-lg font-bold">{totalFrigoKg.toLocaleString()} Kg</div>
                        <div className="text-[10px] text-blue-600 font-normal">{totalFrigoPallets} Palettes occupées</div>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 p-3 rounded text-purple-900">
                        <div className="text-[10px] text-purple-700 font-bold uppercase">Valorisation au Coût HT</div>
                        <div className="text-lg font-bold">{totalFrigoValuationHT.toLocaleString()} MAD</div>
                        <div className="text-[10px] text-purple-600 font-normal">Valorisation Prix Revient</div>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-emerald-900">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Valeur de Vente Théorique HT</div>
                        <div className="text-lg font-bold">{totalFrigoVenteHT.toLocaleString()} MAD</div>
                        <div className="text-[10px] text-emerald-600 font-normal">Valeur Marchande du Frigo</div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-900">
                        <div className="text-[10px] text-amber-700 font-bold uppercase">Clientèle Desservie</div>
                        <div className="text-lg font-bold">{Object.keys(clientVolumeMap).length} Clients</div>
                        <div className="text-[10px] text-amber-600 font-normal">{frigoBLs.length} Bons de sortie émis</div>
                      </div>
                    </div>

                    {/* SECTION 1: Product Stock & Detailed Valuation Table */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center justify-between border-b pb-1">
                        <span className="flex items-center gap-1.5 text-blue-700">
                          <Package className="w-4 h-4" />
                          1. État du Stock Physique Réel & Valorisation Financière Précise
                        </span>
                        <span className="text-gray-500 font-mono text-[10px]">{frigoStocks.length} Référence(s) en Stock</span>
                      </h4>

                      {frigoStocks.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 border border-dashed border-gray-300 rounded">
                          Aucun produit actuellement stocké dans cet entrepôt.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded">
                          <table className="carbon-table text-xs">
                            <thead>
                              <tr>
                                <th>Code SKU</th>
                                <th>Désignation Produit</th>
                                <th>Catégorie</th>
                                <th className="text-right">Stock Réel (Kg)</th>
                                <th className="text-right">Palettes</th>
                                <th className="text-right">Prix Revient (HT)</th>
                                <th className="text-right">Prix Vente (HT)</th>
                                <th className="text-right">Valorisation Coût HT</th>
                                <th className="text-right">Valorisation Vente HT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {frigoStocks.map(stk => {
                                const prd = products.find(p => p.id === stk.productId);
                                const valHT = stk.quantityKg * (prd?.unitCostHT || 0);
                                const valVenteHT = stk.quantityKg * (prd?.sellingPriceHT || 0);

                                return (
                                  <tr key={stk.productId}>
                                    <td className="font-mono font-bold text-[#0f62fe]">{prd?.code || 'PRD'}</td>
                                    <td className="font-semibold text-gray-900">{prd?.name || 'Produit Inconnu'}</td>
                                    <td className="text-gray-500">{prd?.category || '-'}</td>
                                    <td className="text-right font-mono font-bold text-gray-900">{stk.quantityKg.toLocaleString()} Kg</td>
                                    <td className="text-right font-mono font-bold text-purple-700">{stk.quantityPallets} Pal.</td>
                                    <td className="text-right font-mono text-gray-600">{prd?.unitCostHT?.toLocaleString()} DH</td>
                                    <td className="text-right font-mono text-blue-700">{prd?.sellingPriceHT?.toLocaleString()} DH</td>
                                    <td className="text-right font-mono font-bold text-purple-700">{valHT.toLocaleString()} DH</td>
                                    <td className="text-right font-mono font-bold text-emerald-700">{valVenteHT.toLocaleString()} DH</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: Clients who bought/retrieved from this Frigo */}
                    <div className="space-y-2 pt-2 border-t border-gray-200">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center justify-between border-b pb-1">
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <UserCheck className="w-4 h-4" />
                          2. Clients Ayant Achete / Retire la Marchandise Depuis ce Frigo
                        </span>
                        <span className="text-gray-500 font-mono text-[10px]">{Object.keys(clientVolumeMap).length} Client(s)</span>
                      </h4>

                      {Object.keys(clientVolumeMap).length === 0 ? (
                        <div className="p-4 text-center text-gray-400 italic">Aucune sortie client enregistrée pour ce frigo.</div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded">
                          <table className="carbon-table text-xs">
                            <thead>
                              <tr>
                                <th>Client</th>
                                <th className="text-center">Bons de Sortie Émis</th>
                                <th className="text-right">Cumul Poids Retiré (Kg)</th>
                                <th className="text-right">Valeur Totale Sortie (HT)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(clientVolumeMap).map((cl, idx) => (
                                <tr key={idx}>
                                  <td className="font-bold text-gray-900">{cl.name}</td>
                                  <td className="text-center font-mono font-bold text-blue-700">{cl.count} BLs</td>
                                  <td className="text-right font-mono font-bold text-emerald-700">{cl.kg.toLocaleString()} Kg</td>
                                  <td className="text-right font-mono font-bold text-gray-900">{cl.totalHT.toLocaleString()} DH</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: Recent BL Output Movements */}
                    <div className="space-y-2 pt-2 border-t border-gray-200">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center justify-between border-b pb-1">
                        <span className="flex items-center gap-1.5 text-indigo-700">
                          <Layers className="w-4 h-4" />
                          3. Historique Chronologique des Bons de Livraison & Sorties Quai
                        </span>
                        <span className="text-gray-500 font-mono text-[10px]">{frigoBLs.length} Mouvement(s)</span>
                      </h4>

                      <div className="overflow-x-auto border border-gray-200 rounded">
                        <table className="carbon-table text-xs">
                          <thead>
                            <tr>
                              <th>N° BL</th>
                              <th>Date</th>
                              <th>Client Destinataire</th>
                              <th className="text-right">Poids (Kg)</th>
                              <th className="text-right">Montant TTC</th>
                              <th>Statut Chargement Quai</th>
                              <th>Bon Sortie Photo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {frigoBLs.map(bl => (
                              <tr key={bl.id}>
                                <td className="font-mono font-bold text-[#0f62fe]">{bl.blNumber}</td>
                                <td className="font-mono text-gray-600">{bl.date}</td>
                                <td className="font-semibold text-gray-900">{bl.clientName}</td>
                                <td className="text-right font-mono font-bold text-gray-900">{bl.totalKg.toLocaleString()} Kg</td>
                                <td className="text-right font-mono font-bold text-purple-700">{bl.totalTTC.toLocaleString()} DH</td>
                                <td>
                                  {bl.frigoEmployeeApproved ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                      ✓ Approuvé ({bl.frigoApprovedBy})
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                      En attente
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {bl.bonDeSortiePhotoUrl ? (
                                    <span className="text-emerald-700 font-mono text-[10px] font-bold">📷 Photo dispo</span>
                                  ) : (
                                    <span className="text-gray-400 font-mono text-[10px]">Non jointe</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-mono">EasyERP Pro • Fiche Entrepôt Frigo Logistique & Valorisation</span>
              <button
                onClick={() => setSelectedFrigoDetail(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded"
              >
                Fermer Fiche Frigo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Inter-Frigos Modal */}

      {showTransferModal && (
        <StockTransferModal
          onClose={() => setShowTransferModal(false)}
        />
      )}

    </div>
  );
};

