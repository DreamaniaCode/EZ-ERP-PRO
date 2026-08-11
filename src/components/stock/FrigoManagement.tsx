import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ColdStorageFrigo } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { StockTransferModal } from './StockTransferModal';
import { FrigoDetailPage } from './FrigoDetailPage';

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
  onViewFrigoDetail?: (id: string) => void;
  initialFrigoId?: string | null;
}

export const FrigoManagement: React.FC<FrigoManagementProps> = ({ onEditFrigo, onNewFrigo, onViewFrigoDetail, initialFrigoId }) => {
  const { frigos, stocks, products, deliveryNotes, addFrigo, updateFrigo, deleteFrigo } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingFrigo, setEditingFrigo] = useState<ColdStorageFrigo | null>(null);
  const [selectedFrigoDetailId, setSelectedFrigoDetailId] = useState<string | null>(initialFrigoId || null);




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

  if (selectedFrigoDetailId) {
    return (
      <FrigoDetailPage
        frigoId={selectedFrigoDetailId}
        onBack={() => setSelectedFrigoDetailId(null)}
      />
    );
  }

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
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    if (onViewFrigoDetail) {
                      onViewFrigoDetail(frigo.id);
                    } else {
                      setSelectedFrigoDetailId(frigo.id);
                    }
                  }}
                  className="flex-1 text-center text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 py-1.5 rounded transition flex items-center justify-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Fiche Detail</span>
                </button>

                <button
                  onClick={() => {
                    if (onViewFrigoDetail) {
                      onViewFrigoDetail(frigo.id);
                    } else {
                      setSelectedFrigoDetailId(frigo.id);
                    }
                  }}
                  className="flex-1 text-center text-xs font-bold text-white bg-[#0f62fe] hover:bg-blue-700 py-1.5 rounded transition flex items-center justify-center gap-1 shadow-xs"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Opérations Frigo</span>
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

      {/* Stock Transfer Inter-Frigos Modal */}


      {showTransferModal && (
        <StockTransferModal
          onClose={() => setShowTransferModal(false)}
        />
      )}

    </div>
  );
};

