import React, { useState } from 'react';
import { RecalculationSummaryReport, RecalculationReportItem } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  MinusCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  RefreshCw,
  Zap
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: RecalculationSummaryReport | null;
  isProcessing: boolean;
  onReRun: () => void;
}

export const GlobalPriceRecalculationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  report,
  isProcessing,
  onReRun
}) => {
  if (!isOpen) return null;

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPDATED' | 'NO_CHANGE' | 'FAILED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBlId, setExpandedBlId] = useState<string | null>(null);

  const filteredDetails = (report?.details || []).filter(item => {
    const matchesFilter =
      statusFilter === 'ALL' ||
      (statusFilter === 'UPDATED' && item.status === 'UPDATED') ||
      (statusFilter === 'NO_CHANGE' && item.status === 'NO_CHANGE') ||
      (statusFilter === 'FAILED' && item.status === 'FAILED');

    const matchesSearch =
      item.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const exportExcelData = (report?.details || []).map(item => ({
    'N° BL': item.blNumber,
    Client: item.clientName,
    Date: item.date,
    Statut: item.status === 'UPDATED' ? 'Mis à jour' : item.status === 'NO_CHANGE' ? 'Inchangé' : 'Échec',
    'Articles Modifiés': item.itemsUpdatedCount,
    'Ancien Total HT (DH)': item.oldTotalHT.toFixed(2),
    'Nouveau Total HT (DH)': item.newTotalHT.toFixed(2),
    'Écart HT (DH)': (item.newTotalHT - item.oldTotalHT).toFixed(2),
    'Détails Modifications': item.updatedDetails
      .map(d => `${d.productName}: ${d.oldPrice} -> ${d.newPrice} DH (${d.quantityKg}kg)`)
      .join(' | '),
    'Message Erreur': item.errorMessage || ''
  }));

  return (
    <div className="fixed inset-[#0] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl my-auto flex flex-col max-h-[92vh] text-xs">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-t-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30">
              <Zap className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Rapport de Recalculation Globale des Prix</h2>
              <p className="text-[11px] text-blue-200">
                Ajustement en lot des tarifs BL par rapport aux fiches produits actuelles
                {report && ` • Exécuté le ${report.timestamp}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReRun}
              disabled={isProcessing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition disabled:opacity-50 text-xs shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Réexécuter</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading overlay if running */}
        {isProcessing ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="relative">
              <RefreshCw className="w-12 h-12 text-[#0f62fe] animate-spin" />
              <Zap className="w-5 h-5 text-yellow-500 absolute inset-0 m-auto" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Synchronisation des Prix en cours...</h3>
              <p className="text-xs text-gray-500 max-w-md mt-1">
                Analyse de chaque Bon de Livraison, calcul des écarts tarifaires et mise à jour sécurisée dans la base de données Firestore.
              </p>
            </div>
          </div>
        ) : !report ? (
          <div className="p-12 text-center text-gray-500 my-auto">
            Aucun rapport disponible.
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total BL Scannés</div>
                <div className="text-lg font-extrabold text-gray-900 mt-0.5">{report.totalBLsScanned}</div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Mis à jour</span>
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{report.updatedBLsCount}</div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-[10px] text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1">
                  <MinusCircle className="w-3 h-3 text-blue-600" />
                  <span>Inchangés</span>
                </div>
                <div className="text-lg font-extrabold text-blue-700 mt-0.5">{report.unchangedBLsCount}</div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-[10px] text-red-800 font-bold uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <span>Échecs</span>
                </div>
                <div className="text-lg font-extrabold text-red-700 mt-0.5">{report.failedBLsCount}</div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-[10px] text-purple-800 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-600" />
                  <span>Lignes Produits</span>
                </div>
                <div className="text-lg font-extrabold text-purple-700 mt-0.5">{report.totalItemsUpdated}</div>
              </div>

              <div className={`p-3 border rounded-lg ${
                report.totalFinancialImpactHT >= 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  {report.totalFinancialImpactHT >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-amber-600" />
                  )}
                  <span>Écart HT Total</span>
                </div>
                <div className="text-base font-black font-mono mt-0.5">
                  {report.totalFinancialImpactHT >= 0 ? '+' : ''}{report.totalFinancialImpactHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </div>
              </div>
            </div>

            {/* Filter and Export Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    statusFilter === 'ALL'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Tous ({report.totalBLsScanned})
                </button>
                <button
                  onClick={() => setStatusFilter('UPDATED')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                    statusFilter === 'UPDATED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Modifiés ({report.updatedBLsCount})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('NO_CHANGE')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                    statusFilter === 'NO_CHANGE'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-blue-800 border border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <MinusCircle className="w-3 h-3" />
                  <span>Inchangés ({report.unchangedBLsCount})</span>
                </button>
                {report.failedBLsCount > 0 && (
                  <button
                    onClick={() => setStatusFilter('FAILED')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                      statusFilter === 'FAILED'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white text-red-800 border border-red-300 hover:bg-red-50'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Échecs ({report.failedBLsCount})</span>
                  </button>
                )}
              </div>

              {/* Search & Export Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Chercher N° BL ou Client..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:border-[#0f62fe]"
                  />
                </div>

                <ExportButtons
                  filename={`Rapport_Recalculation_Prix_BL_${new Date().toISOString().slice(0,10)}`}
                  title="Rapport de Recalculation Globale des Prix BL"
                  excelData={exportExcelData}
                  pdfElementId="recalculation-report-table"
                />
              </div>
            </div>

            {/* Transactions Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs" id="recalculation-report-table">
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase font-bold text-gray-600">
                    <tr>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">N° BL</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Ancien Total HT</th>
                      <th className="py-2.5 px-3 text-right">Nouveau Total HT</th>
                      <th className="py-2.5 px-3 text-right">Écart HT</th>
                      <th className="py-2.5 px-3 text-center">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs font-sans">
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500 italic">
                          Aucune transaction correspondant au filtre.
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map(item => {
                        const isExpanded = expandedBlId === item.blId;
                        const diff = item.newTotalHT - item.oldTotalHT;

                        return (
                          <React.Fragment key={item.blId}>
                            <tr className={`hover:bg-gray-50 transition ${item.status === 'FAILED' ? 'bg-red-50/50' : ''}`}>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {item.status === 'UPDATED' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Mis à jour</span>
                                  </span>
                                )}
                                {item.status === 'NO_CHANGE' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    <MinusCircle className="w-3 h-3 text-blue-500" />
                                    <span>Inchangé</span>
                                  </span>
                                )}
                                {item.status === 'FAILED' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300" title={item.errorMessage}>
                                    <AlertTriangle className="w-3 h-3 text-red-600" />
                                    <span>Échec</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                                {item.blNumber}
                              </td>

                              <td className="py-2.5 px-3 font-semibold text-gray-800">
                                {item.clientName}
                              </td>

                              <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                                {item.date}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-right text-gray-600">
                                {item.oldTotalHT.toFixed(2)} DH
                              </td>

                              <td className="py-2.5 px-3 font-mono font-bold text-right text-gray-900">
                                {item.newTotalHT.toFixed(2)} DH
                              </td>

                              <td className={`py-2.5 px-3 font-mono font-bold text-right whitespace-nowrap ${
                                diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-700' : 'text-gray-400'
                              }`}>
                                {diff > 0 ? `+${diff.toFixed(2)}` : diff < 0 ? diff.toFixed(2) : '0.00'} DH
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {item.itemsUpdatedCount > 0 ? (
                                  <button
                                    onClick={() => setExpandedBlId(isExpanded ? null : item.blId)}
                                    className="p-1 hover:bg-gray-200 text-gray-600 rounded transition flex items-center gap-1 mx-auto text-[10px] font-bold"
                                  >
                                    <span>{item.itemsUpdatedCount} prod.</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-400">—</span>
                                )}
                              </td>
                            </tr>

                            {/* Item breakdown when expanded */}
                            {isExpanded && item.updatedDetails.length > 0 && (
                              <tr className="bg-slate-50 border-y border-slate-200">
                                <td colSpan={8} className="p-3">
                                  <div className="bg-white p-3 rounded border border-gray-300 space-y-2">
                                    <div className="font-bold text-[11px] text-gray-800 flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-[#0f62fe]" />
                                      <span>Articles ajustés sur ce Bon de Livraison ({item.blNumber})</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {item.updatedDetails.map((det, dIdx) => (
                                        <div key={dIdx} className="p-2 bg-gray-50 border border-gray-200 rounded text-[11px] flex items-center justify-between">
                                          <div>
                                            <div className="font-bold text-gray-900">{det.productName}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">Code: {det.productCode} • Qté: {det.quantityKg} Kg</div>
                                          </div>
                                          <div className="text-right font-mono">
                                            <div className="text-gray-400 line-through text-[10px]">{det.oldPrice.toFixed(2)} DH/kg</div>
                                            <div className="text-emerald-700 font-bold">{det.newPrice.toFixed(2)} DH/kg</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 rounded-b-xl flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-500">
            {report && `${report.updatedBLsCount} BL modifiés sur ${report.totalBLsScanned} au total.`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded shadow-xs text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
