import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Invoice } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { InvoicePdfDocument } from '../pdf/InvoicePdfDocument';
import { FileText, Search, Filter, CheckCircle, CreditCard, Download, Eye, MessageSquare, Trash2 } from 'lucide-react';
import { generateAndDownloadInvoicePdf } from '../../utils/pdfGenerators';
import { generateWhatsAppInvoiceLink } from '../../utils/whatsappUtils';

export const InvoicesList: React.FC = () => {
  const { invoices, updateInvoiceStatus, deleteInvoice, addChequeEffet, clients, companies, activeCompany, companyInfo, activeCompanyId } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activePdfInvoice, setActivePdfInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    if (activeCompanyId !== 'ALL' && inv.companyId && inv.companyId !== activeCompanyId) {
      return false;
    }
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });


  const handleMarkPaid = (inv: Invoice) => {
    updateInvoiceStatus(inv.id, 'PAYEE', inv.totalTTC);
    alert(`Facture ${inv.invoiceNumber} marquée comme entièrement PAYÉE !`);
  };

  const handleDeleteInvoice = (inv: Invoice) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la Facture N° ${inv.invoiceNumber} (${inv.clientName}) ?`)) {
      deleteInvoice(inv.id);
      alert(`Facture N° ${inv.invoiceNumber} supprimée avec succès.`);
    }
  };

  const handleDirectDownloadPdf = (inv: Invoice) => {
    const targetComp = companies.find(c => c.id === inv.companyId) || activeCompany;
    generateAndDownloadInvoicePdf(inv, targetComp || companyInfo);
  };

  const handleSendInvoiceWhatsApp = (inv: Invoice) => {
    const client = clients.find(c => c.id === inv.clientId || c.name === inv.clientName);
    const phone = client?.phone || '';
    const link = generateWhatsAppInvoiceLink(inv.invoiceNumber, inv.clientName, inv.totalTTC, phone);
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0f62fe]" />
            Facturation Intégrée & Suivi des Règlements
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Génération Automatique depuis les Bons de Livraison (BL), TVA selon ICE Client & Échéances
          </p>
        </div>

        <ExportButtons 
          filename="Factures_Ventes"
          title="Registre Complet des Factures Client ERP"
          excelData={invoices.map(inv => ({
            'N° Facture': inv.invoiceNumber,
            'Client': inv.clientName,
            'ICE Client': inv.clientICE,
            'Date Émission': inv.date,
            'Date Échéance': inv.dueDate,
            'Montant HT (DH)': inv.totalHT,
            'Montant TVA (DH)': inv.totalVAT || (inv as any).vatAmount || 0,
            'Total TTC (DH)': inv.totalTTC,
            'Montant Payé (DH)': inv.amountPaid,
            'Solde Restant (DH)': inv.totalTTC - inv.amountPaid,
            'Statut': inv.status,
          }))}
        />
      </div>

      {/* Filters */}
      <div className="carbon-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher Facture N°, Client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full carbon-input pl-9 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="carbon-input text-xs"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="EMISE">Émise / En attente</option>
            <option value="PAYEE">Payée</option>
            <option value="PAYEE_PARTIEL">Partiellement Payée</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="carbon-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Client (ICE)</th>
                <th>Date Émission</th>
                <th>Échéance</th>
                <th>Total HT</th>
                <th>Montant TVA</th>
                <th>Total TTC</th>
                <th>Reste à Payer</th>
                <th>Statut & Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => (
                <tr key={inv.id}>
                  <td className="font-mono font-bold text-[#0f62fe]">{inv.invoiceNumber}</td>
                  <td>
                    <div className="font-bold text-gray-900">{inv.clientName}</div>
                    <div className="text-[10px] text-gray-500 font-mono">ICE: {inv.clientICE}</div>
                  </td>
                  <td className="font-mono text-xs">{inv.date}</td>
                  <td className="font-mono text-xs text-gray-700 font-bold">{inv.dueDate}</td>
                  <td className="font-mono font-bold text-gray-900">{inv.totalHT.toLocaleString()} DH</td>
                  <td className="font-mono text-gray-600">{inv.totalVAT.toLocaleString()} DH</td>
                  <td className="font-mono font-bold text-gray-900">{inv.totalTTC.toLocaleString()} DH</td>
                  <td className="font-mono font-bold text-red-600">
                    {inv.remainingAmount.toLocaleString()} DH
                  </td>
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 font-mono font-bold rounded ${
                        inv.status === 'PAYEE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {inv.status}
                      </span>
                      <button
                        onClick={() => handleDirectDownloadPdf(inv)}
                        className="px-2.5 py-1 bg-[#0f62fe] hover:bg-blue-700 text-white text-[11px] font-bold font-mono rounded flex items-center gap-1 shadow-sm transition-colors"
                        title="Télécharger directement la facture en PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-white" /> Télécharger PDF
                      </button>
                      <button
                        onClick={() => setActivePdfInvoice(inv)}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white text-[11px] font-bold font-mono rounded flex items-center gap-1 shadow-sm"
                        title="Visualiser la Facture dans la fenêtre d'aperçu"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0f62fe]" /> Voir PDF
                      </button>
                      {inv.status !== 'PAYEE' && (
                        <button
                          onClick={() => handleMarkPaid(inv)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Régler
                        </button>
                      )}
                      <button
                        onClick={() => handleSendInvoiceWhatsApp(inv)}
                        className="px-2.5 py-1 bg-[#25D366] hover:bg-[#128c7e] text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm"
                        title="Transmettre la facture au client par WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </button>

                      <button
                        onClick={() => handleDeleteInvoice(inv)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-sm transition-colors"
                        title="Supprimer définitivement la facture"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" /> Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Invoice PDF Viewer Modal */}
      {activePdfInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
          <div className="bg-white w-full max-w-4xl my-8 rounded shadow-2xl overflow-hidden border border-gray-300">
            <InvoicePdfDocument
              invoice={activePdfInvoice}
              onClose={() => setActivePdfInvoice(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
};
