import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ChequeEffet, PaymentMethod, ChequeEffetStatus } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { Landmark, Plus, Search, Filter, Clock, CheckCircle2, AlertOctagon, ArrowUpRight, ArrowDownRight, Building, Bell, AlertTriangle } from 'lucide-react';

interface TreasuryChequesProps {
  onEditCheque?: (id: string) => void;
  onNewCheque?: () => void;
}

export const TreasuryCheques: React.FC<TreasuryChequesProps> = ({ onEditCheque, onNewCheque }) => {
  const { chequesEffets, treasuryAccounts, addChequeEffet, updateChequeStatus, clients, suppliers } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [filterDueSoonOnly, setFilterDueSoonOnly] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Helper date logic for 7-day notification badge
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getChequeDueDateInfo = (c: ChequeEffet) => {
    const isSettled = c.status === 'ENCAISSE' || c.status === 'IMPAYE_REJETE';
    const dueDate = new Date(c.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    const isDueIn7Days = !isSettled && diffDays >= 0 && diffDays <= 7;
    const isOverdue = !isSettled && diffDays < 0;
    const isUrgent = isDueIn7Days || isOverdue;

    return {
      diffDays,
      isDueIn7Days,
      isOverdue,
      isUrgent,
      isSettled
    };
  };

  // Urgent cheques list & counters
  const urgentCheques = chequesEffets.filter(c => getChequeDueDateInfo(c).isUrgent);
  const dueWithin7DaysCount = chequesEffets.filter(c => getChequeDueDateInfo(c).isDueIn7Days).length;
  const overdueCount = chequesEffets.filter(c => getChequeDueDateInfo(c).isOverdue).length;
  const totalAmountUrgent = urgentCheques.reduce((sum, c) => sum + c.amount, 0);

  // Add form state
  const [refNum, setRefNum] = useState('');
  const [type, setType] = useState<'CHEQUE' | 'EFFET'>('CHEQUE');
  const [direction, setDirection] = useState<'RECETTE_CLIENT' | 'DEPENSE_FOURNISSEUR'>('RECETTE_CLIENT');
  const [partyName, setPartyName] = useState('');
  const [bankName, setBankName] = useState('Attijariwafa Bank');
  const [amount, setAmount] = useState(50000);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNum || !partyName) return;

    addChequeEffet({
      referenceNumber: refNum,
      type,
      direction,
      partyId: 'custom',
      partyName,
      bankName,
      amount: Number(amount),
      issueDate,
      dueDate,
      status: 'EN_PORTEFEUILLE',
      notes,
    });

    setShowAddModal(false);
    alert(`Titre de paiement ${type} N° ${refNum} enregistré en portefeuille !`);
  };

  const filteredCheques = chequesEffets.filter(c => {
    const matchesSearch = c.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.partyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesDueSoon = !filterDueSoonOnly || getChequeDueDateInfo(c).isUrgent;
    return matchesSearch && matchesType && matchesStatus && matchesDueSoon;
  });

  // Calculate totals
  const totalEnPortefeuille = chequesEffets
    .filter(c => c.status === 'EN_PORTEFEUILLE')
    .reduce((acc, c) => acc + c.amount, 0);

  const totalEncaisse = chequesEffets
    .filter(c => c.status === 'ENCAISSE')
    .reduce((acc, c) => acc + c.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#0f62fe]" />
            Gestion de Banque, Chèques & Effets de Commerce
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Suivi des Échéances, Chèques & Traites (Effets), Virements, Espèces & Rapprochement Bancaire
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons 
            filename="Tresorerie_Cheques_Effets"
            title="Registre de Trésorerie, Chèques, Effets & Rapprochement Bancaire"
            excelData={chequesEffets.map(c => ({
              'N° Référence': c.referenceNumber,
              'Type': c.type,
              'Sens': c.direction === 'RECETTE_CLIENT' ? 'Recette Client' : 'Dépense Fournisseur',
              'Tiers / Partenaire': c.partyName,
              'Banque Emise': c.bankName,
              'Montant (DH)': c.amount,
              'Date Émission': c.issueDate,
              'Date Échéance': c.dueDate,
              'Statut': c.status,
            }))}
          />
          <button
            onClick={() => onNewCheque ? onNewCheque() : setShowAddModal(true)}
            className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
          >
            <Plus className="w-4 h-4" />
            Nouveau Chèque / Effet
          </button>
        </div>
      </div>

      {/* 7-Day Due Date Notification Badge & Alert Banner */}
      {urgentCheques.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-l-amber-500 border border-amber-200 p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-black rounded-lg shrink-0 mt-0.5 animate-pulse">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-950 text-sm uppercase font-mono tracking-wide">
                  Alerte Échéances Imminentes (≤ 7 Jours)
                </span>
                <span className="bg-amber-500 text-black text-xs px-2 py-0.5 font-bold font-mono rounded-full">
                  {urgentCheques.length} Titre(s)
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1">
                {overdueCount > 0 && (
                  <strong className="text-red-700 mr-2 font-mono">
                    🚨 {overdueCount} titre(s) en retard d'échéance!
                  </strong>
                )}
                {dueWithin7DaysCount > 0 && (
                  <span>
                    <strong>{dueWithin7DaysCount} chèque(s)/effet(s)</strong> arrivent à échéance dans les 7 prochains jours.
                  </span>
                )}
                <span className="ml-2 font-mono text-amber-950 font-bold">
                  Cumul: {totalAmountUrgent.toLocaleString()} DH
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterDueSoonOnly(!filterDueSoonOnly)}
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded flex items-center gap-2 transition-all shrink-0 ${
              filterDueSoonOnly 
                ? 'bg-amber-600 text-white shadow ring-2 ring-amber-400' 
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            {filterDueSoonOnly ? 'Afficher Tous les Titres' : 'Filtrer Échéances ≤ 7 Jours'}
          </button>
        </div>
      )}

      {/* Treasury Bank Accounts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {treasuryAccounts.map(acc => (
          <div key={acc.id} className="carbon-card p-4 space-y-2">
            <div className="flex justify-between items-start text-xs font-bold text-gray-500 uppercase">
              <span>{acc.name}</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-[10px]">
                {acc.type}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-gray-900">
              {acc.balance.toLocaleString()} <span className="text-xs font-normal text-gray-500">DH</span>
            </div>
            <div className="text-[11px] font-mono text-gray-500 truncate">
              N° Compte: {acc.accountNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="carbon-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher N° Chèque/Effet, Client, Banque..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full carbon-input pl-9 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick 7-Day Filter Badge Toggle Button */}
          <button
            onClick={() => setFilterDueSoonOnly(!filterDueSoonOnly)}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded border flex items-center gap-1.5 transition-all ${
              filterDueSoonOnly
                ? 'bg-amber-500 text-black border-amber-600 shadow animate-pulse'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Échéances ≤ 7 Jours</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
              urgentCheques.length > 0 ? 'bg-amber-900 text-amber-100' : 'bg-gray-200 text-gray-700'
            }`}>
              {urgentCheques.length}
            </span>
          </button>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="carbon-input text-xs font-mono"
          >
            <option value="ALL">Tous les Types (Chèques & Effets)</option>
            <option value="CHEQUE">Chèques Uniquement</option>
            <option value="EFFET">Effets / Traites</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="carbon-input text-xs font-mono"
          >
            <option value="ALL">Tous les Statuts</option>
            <option value="EN_PORTEFEUILLE">En Portefeuille</option>
            <option value="DEPOSE">Déposé à la Banque</option>
            <option value="ENCAISSE">Encaissé</option>
            <option value="IMPAYE_REJETE">Impayé / Rejeté</option>
          </select>
        </div>
      </div>

      {/* Cheques & Effets Portfolio Table */}
      <div className="carbon-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900 text-sm uppercase font-mono">
              Portefeuille des Titres de Paiement
            </h2>
            {filterDueSoonOnly && (
              <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                Filtre Actif: Échéances ≤ 7 Jours ({filteredCheques.length})
              </span>
            )}
          </div>
          <div className="text-xs font-mono">
            En Portefeuille: <b className="text-amber-700">{totalEnPortefeuille.toLocaleString()} DH</b>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>Type & Réf</th>
                <th>Sens</th>
                <th>Tiers (Client / Fournisseur)</th>
                <th>Banque Émettrice</th>
                <th>Montant (DH)</th>
                <th>Émission</th>
                <th>Échéance & Alerte 7J</th>
                <th>Statut</th>
                <th>Changer Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheques.map(c => {
                const isRecette = c.direction === 'RECETTE_CLIENT';
                const dueInfo = getChequeDueDateInfo(c);

                let rowBgClass = '';
                if (dueInfo.isOverdue) {
                  rowBgClass = 'bg-red-50/80 hover:bg-red-100/80 border-l-4 border-l-red-600';
                } else if (dueInfo.isDueIn7Days) {
                  rowBgClass = 'bg-amber-50/80 hover:bg-amber-100/80 border-l-4 border-l-amber-500';
                }

                return (
                  <tr key={c.id} className={rowBgClass}>
                    <td className="font-mono font-bold text-gray-900">
                      <span className={`px-2 py-0.5 text-xs rounded font-mono mr-1.5 ${
                        c.type === 'CHEQUE' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'
                      }`}>
                        {c.type}
                      </span>
                      {c.referenceNumber}
                    </td>
                    <td>
                      {isRecette ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 w-fit">
                          <ArrowDownRight className="w-3.5 h-3.5" /> Encaisser Client
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1 w-fit">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Décaissement Fournisseur
                        </span>
                      )}
                    </td>
                    <td className="font-bold text-gray-900">{c.partyName}</td>
                    <td className="font-mono text-xs text-gray-700">{c.bankName}</td>
                    <td className="font-mono font-bold text-gray-900 text-sm">
                      {c.amount.toLocaleString()} DH
                    </td>
                    <td className="font-mono text-xs text-gray-500">{c.issueDate}</td>
                    
                    {/* Due Date & 7-Day Alert Notification Badge */}
                    <td>
                      <div className="font-mono font-bold text-gray-900 text-xs">
                        {c.dueDate}
                      </div>
                      {dueInfo.isOverdue && (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow mt-1">
                          <AlertOctagon className="w-3 h-3" /> RETARD ({Math.abs(dueInfo.diffDays)}j)
                        </span>
                      )}
                      {dueInfo.isDueIn7Days && (
                        <span className="inline-flex items-center gap-1 bg-amber-500 text-black text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow mt-1 animate-pulse">
                          <Clock className="w-3 h-3" /> Dans {dueInfo.diffDays === 0 ? "aujourd'hui" : `${dueInfo.diffDays}j`}
                        </span>
                      )}
                      {!dueInfo.isUrgent && !dueInfo.isSettled && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-mono mt-0.5">
                          Dans {dueInfo.diffDays} jours
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`text-xs px-2.5 py-1 font-mono font-bold rounded border ${
                        c.status === 'EN_PORTEFEUILLE' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        c.status === 'DEPOSE' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                        c.status === 'ENCAISSE' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        'bg-red-100 text-red-900 border-red-300'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {c.status === 'EN_PORTEFEUILLE' && (
                          <button
                            onClick={() => updateChequeStatus(c.id, 'DEPOSE')}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded"
                          >
                            Déposer en Banque
                          </button>
                        )}
                        {c.status === 'DEPOSE' && (
                          <button
                            onClick={() => updateChequeStatus(c.id, 'ENCAISSE')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded"
                          >
                            Encaisser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCheques.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500 font-mono text-xs">
                    Aucun chèque ou effet ne correspond aux critères de filtrage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-md rounded shadow-2xl overflow-hidden">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#0f62fe]" />
                Ajouter un Chèque ou Effet de Commerce
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Type de Titre *</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full carbon-input font-bold"
                >
                  <option value="CHEQUE">Chèque Bancaire</option>
                  <option value="EFFET">Effet / Traite de Commerce</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Numéro de Chèque / Effet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: CHQ-998811"
                  value={refNum}
                  onChange={e => setRefNum(e.target.value)}
                  className="w-full carbon-input font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Nom du Client / Fournisseur *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Marjane Groupe"
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  className="w-full carbon-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Banque Émettrice</label>
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full carbon-input font-bold"
                >
                  <option value="Attijariwafa Bank">Attijariwafa Bank</option>
                  <option value="BMCE Bank of Africa">BMCE Bank of Africa</option>
                  <option value="Banque Populaire (BP)">Banque Populaire (BP)</option>
                  <option value="Société Générale Maroc">Société Générale Maroc</option>
                  <option value="CIH Bank">CIH Bank</option>
                  <option value="Crédit du Maroc">Crédit du Maroc</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Montant (DH) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full carbon-input font-mono font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Date d'Échéance *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full carbon-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary"
                >
                  Enregistrer en Portefeuille
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
