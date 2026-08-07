import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { Client, Supplier, DeliveryNoteBL } from '../../types';
import { ClientDetailModal } from './ClientDetailModal';
import { ExportButtons } from '../common/ExportButtons';
import { Users, Plus, Search, Building, Phone, Mail, FileText, CheckCircle, Eye, AlertTriangle, Edit, Trash2, Layers } from 'lucide-react';

interface ClientsSuppliersProps {
  initialTab?: 'CLIENTS' | 'SUPPLIERS';
  onViewBLPdf?: (bl: DeliveryNoteBL) => void;
  onEditClient?: (id: string) => void;
  onNewClient?: () => void;
  onEditSupplier?: (id: string) => void;
  onNewSupplier?: () => void;
}

export const ClientsSuppliers: React.FC<ClientsSuppliersProps> = ({ 
  initialTab = 'CLIENTS', 
  onViewBLPdf,
  onEditClient,
  onNewClient,
  onEditSupplier,
  onNewSupplier 
}) => {
  const { t } = useTranslation();
  const { clients, suppliers, invoices, addClient, deleteClient, addSupplier, updateSupplier, deleteSupplier, deduplicateClients, mergeClients } = useERP();
  const [activeTab, setActiveTab] = useState<'CLIENTS' | 'SUPPLIERS'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Selection & Merge State
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [targetMergeClientId, setTargetMergeClientId] = useState<string>('');
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);

  // Client Form
  const [clientForm, setClientForm] = useState({
    name: '',
    companyName: '',
    ice: '',
    email: '',
    phone: '',
    address: '',
    city: 'Casablanca',
    creditLimit: 300000,
  });

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    companyName: '',
    country: 'Maroc',
    iceOrTaxId: '',
    email: '',
    phone: '',
    address: '',
    type: 'LOCAL' as 'LOCAL' | 'IMPORTATION',
  });

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) return;
    addClient(clientForm);
    setShowAddModal(false);
    setClientForm({
      name: '',
      companyName: '',
      ice: '',
      email: '',
      phone: '',
      address: '',
      city: 'Casablanca',
      creditLimit: 300000,
    });
    alert('Client créé avec succès !');
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) return;
    addSupplier(supplierForm);
    setShowAddModal(false);
    alert('Fournisseur créé avec succès !');
  };

  const handleEditSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    updateSupplier(editingSupplier.id, editingSupplier);
    setEditingSupplier(null);
    alert('Fournisseur mis à jour avec succès !');
  };

  const handleDeleteSupplier = (s: Supplier) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le fournisseur ${s.code} - ${s.name} ?`)) {
      deleteSupplier(s.id);
    }
  };

  const filteredClients = clients.filter(c => {
    const q = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(q) || 
           c.code.toLowerCase().includes(q) || 
           (c.ice && c.ice.toLowerCase().includes(q)) ||
           (c.city && c.city.toLowerCase().includes(q));
  });

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
           s.code.toLowerCase().includes(q) || 
           (s.iceOrTaxId && s.iceOrTaxId.toLowerCase().includes(q)) ||
           (s.country && s.country.toLowerCase().includes(q));
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  // If a client is selected, render the Client Detail View inline directly in the page
  if (selectedClient) {
    return (
      <ClientDetailModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onSelectClient={(c) => setSelectedClient(c)}
        onViewBLPdf={onViewBLPdf}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0f62fe]" />
            {activeTab === 'CLIENTS' ? 'Gestion des Clients & Suivi des Crédits' : 'Répertoire des Fournisseurs & Transit'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Fiches d'Entreprise, Identifiant Commun de l'Entreprise (ICE), Plafond de Crédit & Suivi des Solde
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons 
            filename={activeTab === 'CLIENTS' ? 'Annuaire_Clients_ERP' : 'Annuaire_Fournisseurs_ERP'}
            title={activeTab === 'CLIENTS' ? 'Annuaire Général des Clients & Soldes' : 'Annuaire Général des Fournisseurs & Transit'}
            excelData={activeTab === 'CLIENTS' 
              ? clients.map(c => ({
                  'Code Client': c.code,
                  'Raison Sociale / Nom': c.companyName || c.name,
                  'I.C.E': c.ice,
                  'Téléphone': c.phone,
                  'Email': c.email,
                  'Ville': c.city,
                  'Plafond Crédit (DH)': c.creditLimit,
                  'Solde Actuel Dû (DH)': c.currentBalance,
                }))
              : suppliers.map(s => ({
                  'Code Fournisseur': s.code,
                  'Raison Sociale': s.companyName || s.name,
                  'Type': s.type === 'IMPORTATION' ? 'Importation Internationale' : 'Achat Local',
                  'Pays / Origine': s.country || 'Maroc',
                  'I.C.E / Tax ID': s.iceOrTaxId,
                  'Téléphone': s.phone,
                  'Email': s.email,
                }))
            }
          />
          <div className="bg-[#262626] p-1 border border-[#525252] rounded flex text-xs font-mono">
            <button
              onClick={() => setActiveTab('CLIENTS')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'CLIENTS' ? 'bg-[#0f62fe] text-white font-bold' : 'text-gray-300'}`}
            >
              Clients ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'SUPPLIERS' ? 'bg-[#0f62fe] text-white font-bold' : 'text-gray-300'}`}
            >
              Fournisseurs ({suppliers.length})
            </button>
          </div>

          {activeTab === 'CLIENTS' && selectedClientIds.length >= 2 && (
            <button
              onClick={() => {
                setTargetMergeClientId(selectedClientIds[0]);
                setShowMergeModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded font-bold flex items-center gap-1.5 transition-colors shadow-md animate-pulse"
              title="Fusionner les clients sélectionnés et regrouper leur historique"
            >
              <Layers className="w-4 h-4" />
              Fusionner ({selectedClientIds.length}) Clients Sélectionnés
            </button>
          )}

          {activeTab === 'CLIENTS' && (
            <button
              onClick={() => {
                const count = deduplicateClients();
                alert(count > 0 ? `Nettoyage terminé : ${count} client(s) en doublon ont été fusionnés avec succès !` : 'Aucun doublon trouvé dans la base clients.');
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Détecter et fusionner automatiquement les fiches clients ayant le même nom ou raison sociale"
            >
              <CheckCircle className="w-4 h-4" />
              Nettoyer Doublons Clients
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'CLIENTS') {
                if (onNewClient) onNewClient();
                else setShowAddModal(true);
              } else {
                if (onNewSupplier) onNewSupplier();
                else setShowAddModal(true);
              }
            }}
            className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
          >
            <Plus className="w-4 h-4" />
            Nouveau {activeTab === 'CLIENTS' ? 'Client' : 'Fournisseur'}
          </button>
        </div>
      </div>

      {/* Client KPI Dashboard Row */}
      {activeTab === 'CLIENTS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="carbon-card p-4 space-y-1">
            <div className="text-xs font-bold text-gray-500 uppercase font-mono">Total Clients Actifs</div>
            <div className="text-2xl font-bold font-mono text-gray-900">{clients.length}</div>
            <div className="text-[11px] text-gray-500">Comptes enregistrés dans le négoce</div>
          </div>

          <div className="carbon-card p-4 space-y-1">
            <div className="text-xs font-bold text-gray-500 uppercase font-mono">Solde Client (Encours Total)</div>
            <div className="text-2xl font-bold font-mono text-purple-700">
              {clients.reduce((acc, c) => acc + (c.currentBalance || 0), 0).toLocaleString()} <span className="text-xs text-gray-500 font-normal">DH</span>
            </div>
            <div className="text-[11px] text-gray-500">Créances totales en cours</div>
          </div>

          <div className="carbon-card p-4 space-y-1">
            <div className="text-xs font-bold text-gray-500 uppercase font-mono">Retards de Paiement</div>
            <div className="text-2xl font-bold font-mono text-red-600">
              {invoices.filter(i => i.status === 'EN_RETARD' || (i.status !== 'PAYEE' && i.dueDate < todayStr)).reduce((acc, i) => acc + (i.totalTTC - i.paidAmount), 0).toLocaleString()} <span className="text-xs text-gray-500 font-normal">DH</span>
            </div>
            <div className="text-[11px] text-red-600 font-semibold">
              {invoices.filter(i => i.status === 'EN_RETARD' || (i.status !== 'PAYEE' && i.dueDate < todayStr)).length} facture(s) en souffrance
            </div>
          </div>

          <div className="carbon-card p-4 space-y-1">
            <div className="text-xs font-bold text-gray-500 uppercase font-mono font-bold">Clients à Risque (&gt;90% Plafond)</div>
            <div className="text-2xl font-bold font-mono text-amber-600">
              {clients.filter(c => (c.currentBalance / c.creditLimit) >= 0.9).length}
            </div>
            <div className="text-[11px] text-amber-700 font-semibold">Seuil de crédit quasi atteint</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="carbon-card p-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Rechercher un ${activeTab === 'CLIENTS' ? 'Client' : 'Fournisseur'} par Nom, ICE, Ville...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full carbon-input pl-9 text-xs font-mono"
          />
        </div>
      </div>

      {/* Table */}
      {activeTab === 'CLIENTS' ? (
        <div className="carbon-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="carbon-table">
              <thead>
                <tr>
                  <th className="w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedClientIds.length > 0 && selectedClientIds.length === filteredClients.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedClientIds(filteredClients.map(c => c.id));
                        else setSelectedClientIds([]);
                      }}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th>Code</th>
                  <th>Nom / Raison Sociale</th>
                  <th>ICE</th>
                  <th>Téléphone & Email</th>
                  <th>Ville / Adresse</th>
                  <th>Plafond Crédit</th>
                  <th>Solde Dû (Encours)</th>
                  <th>Risque / Retard</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(c => {
                  const clientInvoices = invoices.filter(i => i.clientId === c.id);
                  const overdueCount = clientInvoices.filter(i => 
                    i.status === 'EN_RETARD' || (i.status !== 'PAYEE' && i.dueDate < todayStr)
                  ).length;
                  const usagePercent = Math.min(Math.round((c.currentBalance / c.creditLimit) * 100), 100);
                  const isSelected = selectedClientIds.includes(c.id);

                  return (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                      onClick={() => setSelectedClient(c)}
                    >
                      <td onClick={e => e.stopPropagation()} className="text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedClientIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                          }}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="font-mono font-bold text-[#0f62fe]">{c.code}</td>
                      <td>
                        <div className="font-bold text-gray-900">{c.name}</div>
                        <div className="text-[11px] text-gray-500">{c.companyName}</div>
                      </td>
                      <td className="font-mono text-xs">{c.ice || '-'}</td>
                      <td className="font-mono text-xs text-gray-700">
                        <div>{c.phone || '-'}</div>
                        <div className="text-gray-500 text-[10px]">{c.email || '-'}</div>
                      </td>
                      <td className="text-xs">
                        <div className="font-bold text-gray-800">{c.city}</div>
                        <div className="text-gray-500 text-[10px]">{c.address}</div>
                      </td>
                      <td className="font-mono font-bold text-gray-700">{c.creditLimit.toLocaleString()} DH</td>
                      <td className="font-mono font-bold text-purple-700">
                        {c.currentBalance.toLocaleString()} DH
                        <div className="text-[10px] font-normal text-gray-500">{usagePercent}% du plafond</div>
                      </td>
                      <td>
                        {overdueCount > 0 ? (
                          <span className="bg-red-100 text-red-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            {overdueCount} Facture(s) Retard
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                            Compte Réglé
                          </span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 py-3">
                        <button
                          onClick={() => setSelectedClient(c)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-[#0f62fe] hover:text-white border border-gray-300 text-gray-800 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                          title="Ouvrir le dossier client complet"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Dossier Client
                        </button>
                        {onEditClient && (
                          <button
                            onClick={() => onEditClient(c.id)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                            title="Modifier les coordonnées client"
                          >
                            Éditer
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le client "${c.name}" (${c.code}) ?`)) {
                              deleteClient(c.id);
                            }
                          }}
                          className="px-2 py-1 bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                          title="Supprimer ce client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>

                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="carbon-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="carbon-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Raison Sociale Fournisseur</th>
                  <th>Pays</th>
                  <th>ICE / Tax ID</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Solde Fournisseur</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(s => (
                  <tr key={s.id}>
                    <td className="font-mono font-bold text-[#0f62fe]">{s.code}</td>
                    <td>
                      <div className="font-bold text-gray-900">{s.name}</div>
                      <div className="text-[11px] text-gray-500">{s.companyName}</div>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 rounded font-semibold text-gray-800">
                        {s.country}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{s.iceOrTaxId}</td>
                    <td className="font-mono text-xs text-gray-700">
                      <div>{s.phone}</div>
                      <div className="text-gray-500 text-[10px]">{s.email}</div>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 font-mono font-bold rounded ${
                        s.type === 'IMPORTATION' ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-red-600">{s.currentBalance.toLocaleString()} DH</td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditSupplier ? onEditSupplier(s.id) : setEditingSupplier(s)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                          title="Modifier le fournisseur"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(s)}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs rounded transition-colors"
                          title="Supprimer le fournisseur"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-md rounded shadow-2xl overflow-hidden">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0f62fe]" />
                Nouveau {activeTab === 'CLIENTS' ? 'Client' : 'Fournisseur'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {activeTab === 'CLIENTS' ? (
              <form onSubmit={handleClientSubmit} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Nom du Client / Enseigne / Nom Complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Marjane Distribution OU Ahmed Benali"
                    value={clientForm.name}
                    onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">
                      Raison Sociale <span className="text-gray-400 font-normal font-sans text-[10px]">(Optionnel / Sté)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Marjane Retail SA"
                      value={clientForm.companyName}
                      onChange={e => setClientForm({ ...clientForm, companyName: e.target.value })}
                      className="w-full carbon-input"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">
                      ICE <span className="text-gray-400 font-normal font-sans text-[10px]">(Optionnel / Non oblig.)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ex: 001524389000045"
                      value={clientForm.ice}
                      onChange={e => setClientForm({ ...clientForm, ice: e.target.value })}
                      className="w-full carbon-input font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Téléphone Direct *</label>
                    <input
                      type="text"
                      required
                      placeholder="0661XX..."
                      value={clientForm.phone}
                      onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                      className="w-full carbon-input font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="contact@..."
                      value={clientForm.email}
                      onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                      className="w-full carbon-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-bold text-gray-700 uppercase mb-1">Adresse Complète *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Bd Zerktouni, N° 120"
                      value={clientForm.address}
                      onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                      className="w-full carbon-input"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Ville *</label>
                    <input
                      type="text"
                      required
                      value={clientForm.city}
                      onChange={e => setClientForm({ ...clientForm, city: e.target.value })}
                      className="w-full carbon-input"
                    />
                  </div>
                </div>
                <div className="bg-amber-50 p-3 border border-amber-200 rounded">
                  <label className="block font-bold text-amber-900 uppercase mb-1">
                    Plafond / Seuil de Crédit Autorisé (DH) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10000}
                    value={clientForm.creditLimit}
                    onChange={e => setClientForm({ ...clientForm, creditLimit: Number(e.target.value) })}
                    className="w-full carbon-input font-mono font-bold text-amber-900 bg-white"
                  />
                  <div className="text-[10px] text-amber-700 mt-1">
                    Détermine le montant maximal des créances et encours accordés à ce client.
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300">Annuler</button>
                  <button type="submit" className="carbon-btn-primary">Enregistrer Client</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSupplierSubmit} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Nom du Fournisseur *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Al-Qassim Export"
                    value={supplierForm.name}
                    onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Pays</label>
                    <input
                      type="text"
                      value={supplierForm.country}
                      onChange={e => setSupplierForm({ ...supplierForm, country: e.target.value })}
                      className="w-full carbon-input"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Type</label>
                    <select
                      value={supplierForm.type}
                      onChange={e => setSupplierForm({ ...supplierForm, type: e.target.value as any })}
                      className="w-full carbon-input font-bold"
                    >
                      <option value="LOCAL">Local (Maroc)</option>
                      <option value="IMPORTATION">Importation</option>
                    </select>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300">Annuler</button>
                  <button type="submit" className="carbon-btn-primary">Enregistrer Fournisseur</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-md rounded shadow-2xl overflow-hidden">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#0f62fe]" />
                Modifier le Fournisseur ({editingSupplier.code})
              </h3>
              <button onClick={() => setEditingSupplier(null)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleEditSupplierSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Nom du Fournisseur *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full carbon-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Raison Sociale</label>
                <input
                  type="text"
                  value={editingSupplier.companyName || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, companyName: e.target.value })}
                  className="w-full carbon-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Pays</label>
                  <input
                    type="text"
                    value={editingSupplier.country}
                    onChange={e => setEditingSupplier({ ...editingSupplier, country: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Type</label>
                  <select
                    value={editingSupplier.type}
                    onChange={e => setEditingSupplier({ ...editingSupplier, type: e.target.value as any })}
                    className="w-full carbon-input font-bold"
                  >
                    <option value="LOCAL">Local (Maroc)</option>
                    <option value="IMPORTATION">Importation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">ICE / Tax ID</label>
                  <input
                    type="text"
                    value={editingSupplier.iceOrTaxId || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, iceOrTaxId: e.target.value })}
                    className="w-full carbon-input font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full carbon-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editingSupplier.email || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                  className="w-full carbon-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Adresse</label>
                <input
                  type="text"
                  value={editingSupplier.address || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  className="w-full carbon-input"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingSupplier(null)} className="px-4 py-2 border border-gray-300">Annuler</button>
                <button type="submit" className="carbon-btn-primary">Mettre à Jour Fournisseur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-lg shadow-2xl border border-gray-300 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Fusionner les Clients Sélectionnés
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Sélectionnez le client principal. Tous les BLs, commandes et créances des comptes en doublon seront fusionnés automatiquement sous ce compte.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Client Principal (Destination):</label>
              {clients.filter(c => selectedClientIds.includes(c.id)).map(c => (
                <label key={c.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${targetMergeClientId === c.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="targetMergeClient" 
                      checked={targetMergeClientId === c.id} 
                      onChange={() => setTargetMergeClientId(c.id)}
                      className="text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-xs text-gray-900">{c.name}</div>
                      <div className="text-[10px] text-gray-500">{c.code} • Solde: {c.currentBalance.toLocaleString()} DH</div>
                    </div>
                  </div>
                  {targetMergeClientId === c.id && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">Principal</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button 
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (!targetMergeClientId) return;
                  mergeClients(targetMergeClientId, selectedClientIds);
                  setSelectedClientIds([]);
                  setShowMergeModal(false);
                  alert('Fusion des clients réussie ! Tous les BLs et créances ont été regroupés.');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-md"
              >
                Confirmer la Fusion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
