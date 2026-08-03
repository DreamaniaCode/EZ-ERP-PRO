import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Expense, PaymentMethod } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { Receipt, Plus, Search, Building2, Wallet } from 'lucide-react';

interface ExpensesManagerProps {
  onEditExpense?: (id: string) => void;
  onNewExpense?: () => void;
}

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({ onEditExpense, onNewExpense }) => {
  const { expenses, frigos, addExpense } = useERP();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [category, setCategory] = useState<Expense['category']>('Frais de Froid / Frigo');
  const [frigoId, setFrigoId] = useState<string>(frigos[0]?.id || '');
  const [supplierOrPayee, setSupplierOrPayee] = useState('');
  const [amountHT, setAmountHT] = useState(5000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIREMENT');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierOrPayee) return;

    const vatAmount = amountHT * 0.20;
    const amountTTC = amountHT + vatAmount;

    addExpense({
      date: new Date().toISOString().slice(0, 10),
      category,
      frigoId,
      supplierOrPayee,
      amountHT: Number(amountHT),
      vatAmount,
      amountTTC,
      paymentMethod,
      notes,
    });

    setShowAddModal(false);
    alert(`Dépense enregistrée avec succès !`);
  };

  const filteredExpenses = expenses.filter(e => 
    e.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.supplierOrPayee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpensesTTC = expenses.reduce((acc, e) => acc + e.amountTTC, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#0f62fe]" />
            Gestion des Dépenses & Charges Opérationnelles
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Frais de Froid/Électricité, Transport & Logistique, Douane/Transit & Salaires Manutention
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons 
            filename="Depenses_Et_Charges_Operationnelles"
            title="Registre des Dépenses & Charges Opérationnelles Frigos"
            excelData={expenses.map(exp => ({
              'N° Dépense': exp.expenseNumber,
              'Catégorie': exp.category,
              'Bénéficiaire / Payé à': exp.supplierOrPayee,
              'Frigo Affecté': frigos.find(f => f.id === exp.frigoId)?.name || 'N/A',
              'Date': exp.date,
              'Montant HT (DH)': exp.amountHT,
              'TVA 20% (DH)': exp.vatAmount,
              'Montant TTC (DH)': exp.amountTTC,
              'Mode Règlement': exp.paymentMethod,
            }))}
          />
          <button
            onClick={() => onNewExpense ? onNewExpense() : setShowAddModal(true)}
            className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
          >
            <Plus className="w-4 h-4" />
            Saisir une Dépense
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="carbon-card p-4 flex justify-between items-center text-xs font-mono">
        <div>
          <span className="text-gray-500 uppercase font-bold">Total Dépenses Cumulées:</span>
          <div className="text-xl font-bold text-gray-900">{totalExpensesTTC.toLocaleString()} DH TTC</div>
        </div>
        <div className="text-gray-500">
          Nombre de pièces enregistrées: <b>{expenses.length}</b>
        </div>
      </div>

      {/* Table */}
      <div className="carbon-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>N° Pièce</th>
                <th>Date</th>
                <th>Catégorie Charge</th>
                <th>Frigo Impacté</th>
                <th>Bénéficiaire / Prestataire</th>
                <th>Montant HT</th>
                <th>Montant TTC</th>
                <th>Mode Règlement</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => {
                const frigoObj = frigos.find(f => f.id === exp.frigoId);
                return (
                  <tr key={exp.id}>
                    <td className="font-mono font-bold text-[#0f62fe]">{exp.expenseNumber}</td>
                    <td className="font-mono text-xs">{exp.date}</td>
                    <td>
                      <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="font-mono text-xs font-semibold text-emerald-700">
                      {frigoObj ? frigoObj.name.split('-')[0].trim() : 'Général'}
                    </td>
                    <td className="font-bold text-gray-900">{exp.supplierOrPayee}</td>
                    <td className="font-mono font-bold text-gray-900">{exp.amountHT.toLocaleString()} DH</td>
                    <td className="font-mono font-bold text-blue-800">{exp.amountTTC.toLocaleString()} DH</td>
                    <td className="font-mono text-xs">{exp.paymentMethod}</td>
                  </tr>
                );
              })}
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
                <Receipt className="w-4 h-4 text-[#0f62fe]" />
                Enregistrer une Dépense / Charge
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Catégorie *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full carbon-input font-bold"
                >
                  <option value="Frais de Froid / Frigo">Frais de Froid / Frigo</option>
                  <option value="Transport & Logistique">Transport & Logistique</option>
                  <option value="Douane & Transit">Douane & Transit</option>
                  <option value="Emballage & Palettisation">Emballage & Palettisation</option>
                  <option value="Salaires & Manutention">Salaires & Manutention</option>
                  <option value="Divers">Divers</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Frigo Concerné</label>
                <select
                  value={frigoId}
                  onChange={e => setFrigoId(e.target.value)}
                  className="w-full carbon-input"
                >
                  <option value="">Aucun / Frais Général Siège</option>
                  {frigos.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Bénéficiaire / Prestataire *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Trans-Sud Frigo S.A.R.L."
                  value={supplierOrPayee}
                  onChange={e => setSupplierOrPayee(e.target.value)}
                  className="w-full carbon-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Montant HT (DH) *</label>
                  <input
                    type="number"
                    required
                    value={amountHT}
                    onChange={e => setAmountHT(Number(e.target.value))}
                    className="w-full carbon-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Mode Règlement</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full carbon-input font-bold"
                  >
                    <option value="VIREMENT">Virement Bancaire</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="ESPECES">Espèces Caisse</option>
                  </select>
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
                <button type="submit" className="carbon-btn-primary">
                  Enregistrer Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
