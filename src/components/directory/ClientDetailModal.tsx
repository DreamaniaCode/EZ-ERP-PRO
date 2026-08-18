import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Client, DeliveryNoteBL, Invoice } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { InvoicePdfDocument } from '../pdf/InvoicePdfDocument';
import { 
  Building2, Phone, Mail, MapPin, CreditCard, AlertTriangle, 
  CheckCircle2, TrendingUp, Package, FileText, Clock, X, DollarSign, ArrowLeft, ChevronRight,
  Edit3, Trash2, Save, MessageSquare, Download, Eye, Printer
} from 'lucide-react';
import { generateWhatsAppInvoiceLink } from '../../utils/whatsappUtils';


interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onSelectClient?: (client: Client) => void;
  onViewBLPdf?: (bl: DeliveryNoteBL) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onSelectClient,
  onViewBLPdf,
}) => {
  const { clients, orders, deliveryNotes, invoices, chequesEffets, frigos, updateClient, deleteClient } = useERP();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BL_HISTORY' | 'INVOICES' | 'PAYMENTS'>('OVERVIEW');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);


  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: client.name || '',
    companyName: client.companyName || '',
    ice: client.ice || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    city: client.city || 'Casablanca',
    creditLimit: client.creditLimit || 300000,
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name) return;
    updateClient(client.id, editForm);
    setShowEditModal(false);
    alert('Fiche client mise à jour avec succès !');
  };

  const handleDeleteClient = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le client "${client.name}" (${client.code}) ?`)) {
      deleteClient(client.id);
      alert('Client supprimé avec succès.');
      onClose();
    }
  };

  // Filter Client Data (Seamless fusion across case & spelling variations)
  const clientNormName = (client.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const clientOrders = orders.filter(o => o.clientId === client.id || (o.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName);
  const clientBLs = deliveryNotes.filter(bl => bl.clientId === client.id || (bl.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName);
  const clientInvoices = invoices.filter(inv => inv.clientId === client.id || (inv.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName);
  const clientCheques = chequesEffets.filter(chq => chq.clientId === client.id || (chq.partyName || chq.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName);

  // Overdue Invoices Calculation
  const today = new Date().toISOString().slice(0, 10);
  const overdueInvoices = clientInvoices.filter(inv => 
    inv.status === 'EN_RETARD' || (inv.status !== 'PAYEE' && inv.dueDate < today)
  );
  const totalOverdueAmount = overdueInvoices.reduce((acc, inv) => acc + (inv.totalTTC - (inv.amountPaid || inv.paidAmount || 0)), 0);

  // Credit Calculations
  const creditLimit = client.creditLimit || 100000;
  const currentBalance = client.currentBalance || 0;
  const availableCredit = creditLimit - currentBalance;
  const creditUsagePercent = Math.min(Math.round((currentBalance / creditLimit) * 100), 100);

  // Turnover Calculation
  const totalTurnoverTTC = clientInvoices.reduce((acc, inv) => acc + inv.totalTTC, 0) || 
                          clientOrders.reduce((acc, o) => acc + o.totalTTC, 0);

  // Top Product Calculation
  const productVolumeMap: { [productId: string]: { name: string; kg: number; totalHT: number } } = {};
  
  clientBLs.forEach(bl => {
    bl.items.forEach(item => {
      if (!productVolumeMap[item.productId]) {
        productVolumeMap[item.productId] = {
          name: item.productName,
          kg: 0,
          totalHT: 0,
        };
      }
      productVolumeMap[item.productId].kg += item.quantityKg;
      productVolumeMap[item.productId].totalHT += item.totalHT;
    });
  });

  const sortedTopProducts = Object.values(productVolumeMap).sort((a, b) => b.kg - a.kg);
  const topProduct = sortedTopProducts[0] || null;

  return (
    <div className="space-y-5 animate-in fade-in">
      
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-gray-200 rounded shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100 hover:bg-[#0f62fe] hover:text-white border border-gray-300 text-gray-800 text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste des clients
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
            <span>Clients</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold text-gray-900">{client.name}</span>
          </div>
        </div>

        {/* Quick Client Switcher */}
        {onSelectClient && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 font-mono">Changer de client:</span>
            <select
              value={client.id}
              onChange={(e) => {
                const found = clients.find(c => c.id === e.target.value);
                if (found) onSelectClient(found);
              }}
              className="carbon-input text-xs font-bold bg-gray-50 text-gray-900 border-gray-300 rounded py-1"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.name} ({c.city})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Page Container */}
      <div className="bg-white border border-gray-200 rounded shadow-md overflow-hidden flex flex-col">
        
        {/* Header Section */}
        <div className="bg-[#161616] text-white p-5 flex flex-wrap justify-between items-start gap-4 border-b border-[#393939]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#0f62fe] rounded flex items-center justify-center text-xl font-bold font-mono shadow">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#262626] text-[#0f62fe] px-2 py-0.5 rounded font-mono font-bold text-xs border border-[#525252]">
                  {client.code}
                </span>
                <h2 className="text-xl font-bold uppercase tracking-wide">{client.name}</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                <span>Raison Sociale: <b className="text-white">{client.companyName}</b></span>
                {client.ice && <span>ICE: <b className="text-white font-mono">{client.ice}</b></span>}
                <span>Ville: <b className="text-white">{client.city}</b></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ExportButtons
              filename={`Releve_Compte_${client.code}_${client.name.replace(/\s+/g, '_')}`}
              title={`DOSSIER ET RELEVÉ DE COMPTE CLIENT - ${client.name.toUpperCase()} (${client.code})`}
              excelData={clientBLs.map(bl => {
                const inv = clientInvoices.find(i => i.blId === bl.id || i.invoiceNumber.includes(bl.blNumber.replace('BL-', '')));
                return {
                  'Code Client': client.code,
                  'Nom Client': client.name,
                  'N° BL': bl.blNumber,
                  'Réf Commande': bl.orderNumber || '-',
                  'Date Livré': bl.date,
                  'Entrepôt Frigo': bl.frigoName,
                  'Poids Livré (Kg)': bl.totalKg,
                  'Palettes': bl.totalPallets,
                  'Montant BL HT (DH)': bl.totalHT,
                  'Montant BL TTC (DH)': bl.totalTTC,
                  'N° Facture': inv?.invoiceNumber || 'Non Facturé',
                  'Statut Facture': inv?.status || (bl.status === 'FACTURÉ' ? 'FACTURÉ' : 'EN ATTENTE'),
                  'Montant Payé (DH)': (inv?.amountPaid || inv?.paidAmount || 0),
                  'Reste à Payer (DH)': inv ? (inv.totalTTC - (inv.amountPaid || inv.paidAmount || 0)) : bl.totalTTC,
                  'Statut Quai Frigo': bl.frigoEmployeeApproved ? `Approuvé (${bl.frigoApprovedBy})` : 'En Attente',
                };
              })}
            />

            <button
              onClick={() => {
                setEditForm({
                  name: client.name || '',
                  companyName: client.companyName || '',
                  ice: client.ice || '',
                  email: client.email || '',
                  phone: client.phone || '',
                  address: client.address || '',
                  city: client.city || 'Casablanca',
                  creditLimit: client.creditLimit || 300000,
                });
                setShowEditModal(true);
              }}
              className="text-xs bg-[#0f62fe] hover:bg-[#0353e9] text-white px-3 py-1.5 rounded font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modifier Fiche
            </button>
            <button
              onClick={handleDeleteClient}
              className="text-xs bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-800 px-3 py-1.5 rounded font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Supprimer
            </button>
            <button
              onClick={onClose}
              className="text-xs bg-[#262626] hover:bg-[#393939] text-gray-300 hover:text-white px-3 py-1.5 rounded border border-[#525252] font-mono flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Retour Liste
            </button>
          </div>

        </div>

        {/* Overdue Warning Alert */}
        {overdueInvoices.length > 0 && (
          <div className="bg-red-500 text-white px-5 py-2.5 text-xs font-semibold flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-200 animate-bounce" />
              <span>
                <b>ATTENTION CRÉDIT CLIENT EN RETARD !</b> Ce client possède <b>{overdueInvoices.length} facture(s) en souffrance</b> d'un montant total de <b className="font-mono text-amber-200">{totalOverdueAmount.toLocaleString()} DH TTC</b>.
              </span>
            </div>
            <span className="bg-red-700 text-white px-2 py-0.5 rounded text-[10px] font-mono">
              Action requise: Relancer Comptabilité
            </span>
          </div>
        )}

        {/* Top KPI Cards & Credit Limit Dashboard */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Credit Limit & Progress */}
          <div className="bg-white p-3.5 rounded border border-gray-200 shadow-sm col-span-1 md:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-700 uppercase flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#0f62fe]" />
                Plafond de Crédit & Seuil Risque
              </span>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                creditUsagePercent >= 90 ? 'bg-red-100 text-red-700' :
                creditUsagePercent >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {creditUsagePercent}% Utilisé
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
              <div>
                <div className="text-[10px] text-gray-500">Plafond Autorisé</div>
                <div className="font-bold text-gray-900">{creditLimit.toLocaleString()} DH</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Solde Dû (Encours)</div>
                <div className="font-bold text-purple-700">{currentBalance.toLocaleString()} DH</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Crédit Disponible</div>
                <div className={`font-bold ${availableCredit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {availableCredit.toLocaleString()} DH
                </div>
              </div>
            </div>

            {/* Credit Progress Bar */}
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  creditUsagePercent >= 90 ? 'bg-red-600' :
                  creditUsagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${creditUsagePercent}%` }}
              />
            </div>
          </div>

          {/* Cumulative Turnover */}
          <div className="bg-white p-3.5 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              <span>Chiffre d'Affaires</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-gray-900 mt-1">
                {totalTurnoverTTC.toLocaleString()} <span className="text-xs text-gray-500 font-normal">MAD</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Total de {clientBLs.length} Bons de Livraison
              </div>
            </div>
          </div>

          {/* Top Product Bought */}
          <div className="bg-white p-3.5 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              <span>Meilleur Produit</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            {topProduct ? (
              <div>
                <div className="text-xs font-bold text-blue-900 truncate" title={topProduct.name}>
                  {topProduct.name}
                </div>
                <div className="text-xs font-mono font-bold text-emerald-700 mt-1">
                  {topProduct.kg.toLocaleString()} Kg <span className="text-[10px] text-gray-500 font-normal">livrés</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">Aucune commande livrée</div>
            )}
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200 px-5 flex gap-4 text-xs font-mono font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'OVERVIEW' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Fiche Info & Coordonnées
          </button>
          <button
            onClick={() => setActiveTab('BL_HISTORY')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'BL_HISTORY' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Historique BL ({clientBLs.length})
          </button>
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'INVOICES' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Factures & Échéances ({clientInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'PAYMENTS' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Chèques & Effets ({clientCheques.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-white">
          
          {/* TAB 1: OVERVIEW & CONTACT */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 border-b pb-2">Coordonnées Complètes</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-[10px]">Raison Sociale / Enseigne</div>
                      <div className="font-bold text-gray-900">{client.companyName || client.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-[10px]">Téléphone Direct</div>
                      <div className="font-mono font-bold text-gray-900">{client.phone || 'Non renseigné'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-[10px]">Adresse Email</div>
                      <div className="font-mono text-gray-900">{client.email || 'Non renseigné'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-[10px]">Adresse & Ville</div>
                      <div className="text-gray-900">{client.address}, <b>{client.city}</b></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 border-b pb-2">Synthèse Logistique Client</h3>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-600">Commandes Enregistrées:</span>
                    <span className="font-mono font-bold text-gray-900">{clientOrders.length} Commandes</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-600">Bons de Livraison Délivrés:</span>
                    <span className="font-mono font-bold text-blue-700">{clientBLs.length} BLs</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-600">Factures Générées:</span>
                    <span className="font-mono font-bold text-gray-900">{clientInvoices.length} Factures</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Factures en Retard de Paiement:</span>
                    <span className={`font-mono font-bold ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {overdueInvoices.length} Factures
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BL HISTORY */}
          {activeTab === 'BL_HISTORY' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 uppercase">Historique des Livraisons Frigos pour {client.name}</span>
                <span className="text-gray-500 font-mono">{clientBLs.length} BL(s) au total</span>
              </div>
              
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="carbon-table text-xs">
                  <thead>
                    <tr>
                      <th>N° BL</th>
                      <th>Date</th>
                      <th>Frigo d'Origine</th>
                      <th>Chargement (Kg & Palettes)</th>
                      <th>Montant Total TTC</th>
                      <th>Statut Chargement</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientBLs.map(bl => (
                      <tr key={bl.id}>
                        <td className="font-mono font-bold text-[#0f62fe]">{bl.blNumber}</td>
                        <td className="font-mono text-gray-600">{bl.date}</td>
                        <td className="font-semibold text-gray-800">
                          {frigos.find(f => f.id === bl.frigoId)?.name || (bl.frigoName.includes('Port Casablanca') || bl.frigoName.includes('Frigo A') ? 'Frigo MFADEL' : bl.frigoName)}
                        </td>
                        <td className="font-mono">
                          <b>{bl.totalKg.toLocaleString()} Kg</b> ({bl.totalPallets} Palettes)
                        </td>
                        <td className="font-mono font-bold text-gray-900">{bl.totalTTC.toLocaleString()} DH</td>
                        <td>
                          {bl.frigoEmployeeApproved ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Approuvé Quai
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              En attente Quai
                            </span>
                          )}
                        </td>
                        <td>
                          {onViewBLPdf && (
                            <button
                              onClick={() => onViewBLPdf(bl)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded border border-gray-300 font-semibold flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              PDF BL
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {clientBLs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-400 italic">
                          Aucun Bon de Livraison enregistré pour ce client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INVOICES & DUE DATES */}
          {activeTab === 'INVOICES' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 uppercase">Factures & Suivi des Échéances de Paiement</span>
                <span className="text-gray-500 font-mono">{clientInvoices.length} Facture(s)</span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="carbon-table text-xs">
                  <thead>
                    <tr>
                      <th>N° Facture</th>
                      <th>Date</th>
                      <th>Échéance</th>
                      <th>Montant Total TTC</th>
                      <th>Déjà Payé</th>
                      <th>Reste à Payer</th>
                      <th>Statut</th>
                      <th>Actions & Documents PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientInvoices.map(inv => {
                      const isOverdue = inv.status === 'EN_RETARD' || (inv.status !== 'PAYEE' && inv.dueDate < today);
                      const paidVal = inv.paidAmount || inv.amountPaid || 0;
                      const remaining = inv.totalTTC - paidVal;

                      return (
                        <tr key={inv.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                          <td className="font-mono font-bold text-[#0f62fe]">{inv.invoiceNumber}</td>
                          <td className="font-mono text-gray-600">{inv.date}</td>
                          <td className="font-mono font-bold text-gray-900">{inv.dueDate}</td>
                          <td className="font-mono font-bold text-gray-900">{inv.totalTTC.toLocaleString()} DH</td>
                          <td className="font-mono text-emerald-700 font-bold">{paidVal.toLocaleString()} DH</td>
                          <td className="font-mono font-bold text-purple-700">{remaining.toLocaleString()} DH</td>
                          <td>
                            {inv.status === 'PAYEE' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                PAYÉE
                              </span>
                            ) : isOverdue ? (
                              <span className="bg-red-100 text-red-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                EN RETARD
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                EN ATTENTE
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="px-2.5 py-1 bg-[#0f62fe] hover:bg-blue-700 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm transition-colors"
                                title="Consulter et télécharger la Facture PDF"
                              >
                                <FileText className="w-3.5 h-3.5" /> PDF Facture
                              </button>
                              <button
                                onClick={() => {
                                  const link = generateWhatsAppInvoiceLink(inv.invoiceNumber, inv.clientName, inv.totalTTC, client.phone);
                                  window.open(link, '_blank');
                                }}
                                className="px-2 py-1 bg-[#25D366] hover:bg-[#128c7e] text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm"
                                title="Envoyer cette facture au client par WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" /> WhatsApp
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {clientInvoices.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-400 italic">
                          Aucune facture émise pour ce client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CHEQUES & EFFETS */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 uppercase">Chèques & Effets Remis par le Client</span>
                <span className="text-gray-500 font-mono">{clientCheques.length} Titre(s) de paiement</span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="carbon-table text-xs">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>N° Référence / Chèque</th>
                      <th>Banque</th>
                      <th>Date Échéance</th>
                      <th>Montant (DH)</th>
                      <th>Statut Traitement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientCheques.map(chq => (
                      <tr key={chq.id}>
                        <td>
                          <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                            {chq.type}
                          </span>
                        </td>
                        <td className="font-mono font-bold text-gray-900">{chq.referenceNumber}</td>
                        <td className="font-semibold text-gray-800">{chq.bankName}</td>
                        <td className="font-mono font-bold text-gray-900">{chq.dueDate}</td>
                        <td className="font-mono font-bold text-emerald-700">{chq.amount.toLocaleString()} DH</td>
                        <td>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            chq.status === 'ENCAISSE' ? 'bg-emerald-100 text-emerald-800' :
                            chq.status === 'IMPAYE' ? 'bg-red-100 text-red-800' :
                            chq.status === 'DEPOSE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {chq.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {clientCheques.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-400 italic">
                          Aucun chèque ou effet enregistré pour ce client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-100 px-5 py-3 border-t border-gray-200 flex justify-between items-center text-xs">
          <span className="text-gray-500">EasyERP Pro • Fiche Client Synthétique Logistique & Comptable</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded"
          >
            Fermer Fiche Client
          </button>
        </div>

      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-lg rounded shadow-2xl overflow-hidden">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0f62fe]" />
                Modifier la Fiche Client ({client.code})
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Nom du Client / Enseigne / Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Marjane Distribution OU Ahmed Benali"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full carbon-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Raison Sociale <span className="text-gray-400 font-normal">(Optionnel / Sté)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Marjane SA (Non oblig. pour particulier)"
                    value={editForm.companyName}
                    onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    ICE <span className="text-gray-400 font-normal">(Optionnel / Non obligatoire)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 001524389000045"
                    value={editForm.ice}
                    onChange={e => setEditForm({ ...editForm, ice: e.target.value })}
                    className="w-full carbon-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Téléphone *</label>
                  <input
                    type="text"
                    required
                    placeholder="0661XX..."
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full carbon-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@..."
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-gray-700 uppercase mb-1">Adresse Complète du Client *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Zone Industrielle Ain Sebaa, N°45"
                    value={editForm.address}
                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Ville *</label>
                  <input
                    type="text"
                    required
                    value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
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
                  value={editForm.creditLimit}
                  onChange={e => setEditForm({ ...editForm, creditLimit: Number(e.target.value) })}
                  className="w-full carbon-input font-mono font-bold text-amber-900 bg-white"
                />
                <div className="text-[10px] text-amber-700 mt-1">
                  Alertes de dépassement déclenchées si l'encours client approche ou dépasse ce plafond.
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300">Annuler</button>
                <button type="submit" className="carbon-btn-primary flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  Mettre à jour la Fiche Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice PDF Overlay Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full my-8">
            <InvoicePdfDocument
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
};
