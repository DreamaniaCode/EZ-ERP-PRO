import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Plus, 
  CreditCard, 
  FileText, 
  History, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Building,
  Landmark,
  Calendar,
  Receipt,
  PenLine,
  Trash2
} from 'lucide-react';
import { ChequeEffetStatus, DeliveryNoteBL, ChequeEffet } from '../../types';

export const ClientEditPage: React.FC<{ editId: string | null; onBack: () => void }> = ({ editId, onBack }) => {
  const { t } = useTranslation();
  const { clients, addClient, updateClient, deliveryNotes, chequesEffets, addChequeEffet, updateChequeEffet, deleteChequeEffet } = useERP();
  
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'BL_HISTORY' | 'PAYMENTS'>('DETAILS');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    ice: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    creditLimit: 0,
    balance: 0
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'CHEQUE' as 'CHEQUE' | 'EFFET' | 'ESPECES' | 'VIREMENT' | 'VERSEMENT',
    referenceNumber: '',
    bankName: '',
    dueDate: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (editId) {
      const client = (clients || []).find((c: any) => c.id === editId);
      if (client) {
        setFormData({
          name: client.name || '',
          companyName: client.companyName || '',
          ice: client.ice || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          creditLimit: client.creditLimit || 0,
          balance: client.balance || 0
        });
      }
    }
  }, [editId, clients]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { balance, ...saveData } = formData;
    if (editId) {
      updateClient(editId, saveData);
    } else {
      addClient({ id: Date.now().toString(), balance: 0, ...saveData });
    }
    onBack();
  };

  const handleOpenEditPayment = (pay: ChequeEffet) => {
    setEditingPaymentId(pay.id);
    setPaymentForm({
      amount: pay.amount,
      paymentMethod: pay.type === 'EFFET' ? 'EFFET' : 'CHEQUE',
      referenceNumber: pay.referenceNumber,
      bankName: pay.bankName || '',
      dueDate: pay.dueDate || new Date().toISOString().split('T')[0],
      issueDate: pay.issueDate || new Date().toISOString().split('T')[0],
      notes: pay.notes || ''
    });
    setShowPaymentModal(true);
  };

  const handleDeletePayment = (payId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce règlement ? Le solde du client sera réajusté.')) {
      deleteChequeEffet(payId);
    }
  };

  // Add/Edit Payment handler
  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.amount <= 0) return;

    const chequeType = paymentForm.paymentMethod === 'EFFET' ? 'EFFET' : 'CHEQUE';

    if (editingPaymentId) {
      updateChequeEffet(editingPaymentId, {
        referenceNumber: paymentForm.referenceNumber,
        type: chequeType,
        amount: paymentForm.amount,
        issueDate: paymentForm.issueDate,
        dueDate: paymentForm.dueDate,
        bankName: paymentForm.bankName,
        notes: paymentForm.notes
      });
    } else {
      addChequeEffet({
        referenceNumber: paymentForm.referenceNumber || `REG-${Date.now().toString().slice(-6)}`,
        type: chequeType,
        direction: 'RECETTE_CLIENT',
        partyName: formData.name || formData.companyName || 'Client',
        partyId: editId || '',
        amount: paymentForm.amount,
        issueDate: paymentForm.issueDate,
        dueDate: paymentForm.dueDate,
        bankName: paymentForm.bankName || 'Banque Client',
        status: paymentForm.paymentMethod === 'ESPECES' ? 'ENCAISSE' : 'EN_PORTEFEUILLE',
        notes: paymentForm.notes || `Règlement (${paymentForm.paymentMethod})`
      });

      if (editId) {
        const newBalance = Math.max(0, formData.balance - paymentForm.amount);
        updateClient(editId, { balance: newBalance });
        setFormData(prev => ({ ...prev, balance: newBalance }));
      }
    }

    setShowPaymentModal(false);
    setEditingPaymentId(null);
    setPaymentForm({
      amount: 0,
      paymentMethod: 'CHEQUE',
      referenceNumber: '',
      bankName: '',
      dueDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  // Filter BLs for this client
  const clientBLs = (deliveryNotes || []).filter((bl: DeliveryNoteBL) => 
    bl.clientId === editId || 
    (formData.name && bl.clientName?.toLowerCase().includes(formData.name.toLowerCase())) ||
    (formData.companyName && bl.clientName?.toLowerCase().includes(formData.companyName.toLowerCase()))
  );

  // Filter Payments for this client
  const clientPayments = (chequesEffets || []).filter((c: ChequeEffet) => 
    c.partyId === editId || 
    (formData.name && c.partyName?.toLowerCase().includes(formData.name.toLowerCase())) ||
    (formData.companyName && c.partyName?.toLowerCase().includes(formData.companyName.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] text-[#161616]">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between bg-white px-6 py-4 border-b border-[#e0e0e0] shadow-sm gap-4">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe]">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {editId ? (formData.name || formData.companyName || t('directory.editClient')) : t('directory.newClient')}
            </h1>
            {editId && (
              <p className="text-xs text-gray-500 font-mono">
                ICE: {formData.ice || 'N/A'} • Solde Actuel: <span className="font-bold text-[#0f62fe]">{formData.balance.toLocaleString()} DH</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {editId && (
            <button 
              type="button" 
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              {t('directory.addPayment', 'Ajouter un Règlement')}
            </button>
          )}

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

      {/* View Tabs if editing existing client */}
      {editId && (
        <div className="bg-white border-b border-[#e0e0e0] px-6 flex space-x-6 rtl:space-x-reverse text-sm font-medium">
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`py-3 border-b-2 flex items-center gap-2 ${
              activeTab === 'DETAILS' ? 'border-[#0f62fe] text-[#0f62fe] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Fiche Client & Détails</span>
          </button>

          <button
            onClick={() => setActiveTab('BL_HISTORY')}
            className={`py-3 border-b-2 flex items-center gap-2 ${
              activeTab === 'BL_HISTORY' ? 'border-[#0f62fe] text-[#0f62fe] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t('directory.blHistory', 'Historique des BL')} ({clientBLs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`py-3 border-b-2 flex items-center gap-2 ${
              activeTab === 'PAYMENTS' ? 'border-[#0f62fe] text-[#0f62fe] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Règlements & Chèques ({clientPayments.length})</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* TAB 1: Client Details Form */}
          {activeTab === 'DETAILS' && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-6 space-y-8">
              {/* Identity Info */}
              <div>
                <h2 className="text-base font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider">
                  {t('directory.identity', "Informations d'Identité")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                      {t('directory.name', 'Nom Responsable / Contact')} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm"
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
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                      {t('directory.ice', 'N° ICE')}
                    </label>
                    <input
                      type="text"
                      name="ice"
                      value={formData.ice}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h2 className="text-base font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider">
                  {t('directory.contact', 'Coordonnées de Contact')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                      {t('directory.email', 'Adresse Email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                      {t('directory.phone', 'Téléphone')} *
                    </label>
                    <input
                      type="text"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                      {t('directory.address', 'Adresse Complète')}
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                      {t('directory.city', 'Ville')}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h2 className="text-base font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider">
                  {t('directory.financial', 'Informations Financières')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                      {t('directory.creditLimit', 'Plafond de Crédit (DH)')}
                    </label>
                    <input
                      type="number"
                      name="creditLimit"
                      min="0"
                      step="0.01"
                      value={formData.creditLimit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                    />
                  </div>
                  {editId && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        {t('directory.currentBalance', 'Solde Actuel (DH)')}
                      </label>
                      <div className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded text-[#0f62fe] font-bold font-mono text-base">
                        {formData.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: BL History */}
          {activeTab === 'BL_HISTORY' && (
            <div className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0]">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#0f62fe]" />
                  <span>{t('directory.blHistory', 'Historique des Bons de Livraison (BL)')}</span>
                </h2>
                <span className="text-xs bg-gray-100 border border-gray-300 px-2 py-1 rounded font-mono font-bold">
                  {clientBLs.length} BL au total
                </span>
              </div>

              {clientBLs.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Truck className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Aucun Bon de Livraison pour ce client.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full carbon-table">
                    <thead>
                      <tr>
                        <th>N° BL</th>
                        <th>Date</th>
                        <th>Frigo</th>
                        <th>Articles</th>
                        <th>Total Kg</th>
                        <th>Total Palettes</th>
                        <th>Total HT</th>
                        <th>Total TTC</th>
                        <th>Statut Frigo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientBLs.map(bl => (
                        <tr key={bl.id}>
                          <td className="font-mono font-bold text-[#0f62fe]">{bl.blNumber}</td>
                          <td className="text-xs">{bl.date}</td>
                          <td className="text-xs font-medium">{bl.frigoName}</td>
                          <td className="text-xs text-gray-600">{bl.items?.length || 0} art.</td>
                          <td className="font-mono font-bold">{bl.totalKg?.toLocaleString()} kg</td>
                          <td className="font-mono text-xs">{bl.totalPallets} pal</td>
                          <td className="font-mono">{bl.totalHT?.toLocaleString()} DH</td>
                          <td className="font-mono font-bold text-[#0f62fe]">{bl.totalTTC?.toLocaleString()} DH</td>
                          <td>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              bl.frigoEmployeeApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {bl.frigoEmployeeApproved ? 'Validé Frigo' : 'En Attente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Payments History */}
          {activeTab === 'PAYMENTS' && (
            <div className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0]">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>Historique des Règlements & Chèques</span>
                </h2>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau Règlement</span>
                </button>
              </div>

              {clientPayments.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Aucun règlement enregistré pour ce client.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full carbon-table">
                    <thead>
                      <tr>
                        <th>N° Référence</th>
                        <th>Type / Mode</th>
                        <th>Banque</th>
                        <th>Date Émission</th>
                        <th>Date Échéance</th>
                        <th>Montant (DH)</th>
                        <th>Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientPayments.map(pay => (
                        <tr key={pay.id}>
                          <td className="font-mono font-bold text-gray-900">{pay.referenceNumber}</td>
                          <td className="text-xs font-semibold text-blue-700">{pay.type}</td>
                          <td className="text-xs">{pay.bankName || '-'}</td>
                          <td className="text-xs">{pay.issueDate}</td>
                          <td className="text-xs">{pay.dueDate}</td>
                          <td className="font-mono font-bold text-emerald-600">{pay.amount.toLocaleString()} DH</td>
                          <td>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-300">
                              {pay.status}
                            </span>
                          </td>
                          <td className="text-right space-x-2 rtl:space-x-reverse">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayment(pay)}
                              className="p-1 hover:bg-blue-50 text-[#0f62fe] rounded transition-colors"
                              title={t('common.edit', 'Modifier')}
                            >
                              <PenLine className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(pay.id)}
                              className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                              title={t('common.delete', 'Supprimer')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Payment Entry Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-[#e0e0e0] animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0] mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Saisir un Règlement Client</h3>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Montant du Règlement (DH) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm(p => ({ ...p, amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-lg font-bold font-mono text-emerald-600 focus:outline-none focus:border-emerald-600"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Mode de Paiement *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm font-semibold focus:outline-none focus:border-emerald-600"
                >
                  <option value="CHEQUE">Chèque</option>
                  <option value="EFFET">Effet / LCN</option>
                  <option value="ESPECES">Espèces</option>
                  <option value="VIREMENT">Virement Bsncaire</option>
                  <option value="VERSEMENT">Versement Bsncaire</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    N° Référence / Chèque
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm(p => ({ ...p, referenceNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-600"
                    placeholder="ex: CHQ-98234"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Banque
                  </label>
                  <input
                    type="text"
                    value={paymentForm.bankName}
                    onChange={(e) => setPaymentForm(p => ({ ...p, bankName: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:border-emerald-600"
                    placeholder="ex: Attijari, BCP..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Date d'Émission
                  </label>
                  <input
                    type="date"
                    value={paymentForm.issueDate}
                    onChange={(e) => setPaymentForm(p => ({ ...p, issueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Date d'Échéance
                  </label>
                  <input
                    type="date"
                    value={paymentForm.dueDate}
                    onChange={(e) => setPaymentForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Notes / Observations
                </label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:border-emerald-600"
                  placeholder="Notes additionnelles..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-4 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition-colors"
                >
                  Valider le Règlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
