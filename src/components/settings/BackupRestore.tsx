import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { Download, Upload, CheckSquare, Square, AlertTriangle, FileJson, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { BackupData, exportFullBackup, parseBackupFile, validateBackupIntegrity } from '../../utils/backupUtils';

export const BackupRestore: React.FC = () => {
  const { t } = useTranslation();
  const { 
    products = [], 
    clients = [], 
    suppliers = [], 
    orders = [], 
    deliveryNotes = [], 
    invoices = [], 
    chequesEffets = [], 
    expenses = [], 
    frigos = [], 
    stocks = [], 
    inventoryCounts = [], 
    purchaseInvoices = [], 
    companyInfo, 
    resetAllData 
  } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Export State
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('erp_last_backup'));
  const [selectedModules, setSelectedModules] = useState<{ [key: string]: boolean }>({
    products: true,
    clients: true,
    suppliers: true,
    orders: true,
    deliveryNotes: true,
    invoices: true,
    chequesEffets: true,
    expenses: true,
    frigos: true,
    stocks: true,
    inventoryCounts: true,
    purchaseInvoices: true,
    companyInfo: true,
  });

  // Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<BackupData | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<string[]>([]);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const modulesList = [
    { id: 'products', label: t('backup.modules.products', 'Produits') },
    { id: 'clients', label: t('backup.modules.clients', 'Clients') },
    { id: 'suppliers', label: t('backup.modules.suppliers', 'Fournisseurs') },
    { id: 'orders', label: t('backup.modules.orders', 'Commandes') },
    { id: 'deliveryNotes', label: t('backup.modules.deliveryNotes', 'Bons de Livraison') },
    { id: 'invoices', label: t('backup.modules.invoices', 'Factures') },
    { id: 'chequesEffets', label: t('backup.modules.cheques', 'Chèques') },
    { id: 'expenses', label: t('backup.modules.expenses', 'Dépenses') },
    { id: 'frigos', label: t('backup.modules.frigos', 'Frigos') },
    { id: 'stocks', label: t('backup.modules.stocks', 'Stock') },
    { id: 'inventoryCounts', label: t('backup.modules.inventory', 'Inventaires') },
    { id: 'companyInfo', label: t('backup.modules.companyInfo', 'Infos Entreprise') },
  ];

  const handleToggleModule = (id: string) => {
    setSelectedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = (select: boolean) => {
    const newSelection: { [key: string]: boolean } = {};
    modulesList.forEach(m => newSelection[m.id] = select);
    setSelectedModules(newSelection);
  };

  const handleExport = () => {
    const backupData: BackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      appName: 'EasyERP Pro',
      modules: {}
    };

    if (selectedModules.products) backupData.modules.products = products;
    if (selectedModules.clients) backupData.modules.clients = clients;
    if (selectedModules.suppliers) backupData.modules.suppliers = suppliers;
    if (selectedModules.orders) backupData.modules.orders = orders;
    if (selectedModules.deliveryNotes) backupData.modules.deliveryNotes = deliveryNotes;
    if (selectedModules.invoices) backupData.modules.invoices = invoices;
    if (selectedModules.chequesEffets) backupData.modules.chequesEffets = chequesEffets;
    if (selectedModules.expenses) backupData.modules.expenses = expenses;
    if (selectedModules.frigos) backupData.modules.frigos = frigos;
    if (selectedModules.stocks) backupData.modules.stocks = stocks;
    if (selectedModules.inventoryCounts) backupData.modules.inventoryCounts = inventoryCounts;
    if (selectedModules.purchaseInvoices) backupData.modules.purchaseInvoices = purchaseInvoices;
    if (selectedModules.companyInfo) backupData.modules.companyInfo = companyInfo;

    exportFullBackup(backupData);
    const dateStr = new Date().toLocaleString();
    localStorage.setItem('erp_last_backup', dateStr);
    setLastBackup(dateStr);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setRestoreErrors([]);
    setRestoreData(null);
    setShowConfirmRestore(false);

    try {
      const data = await parseBackupFile(file);
      const validation = validateBackupIntegrity(data);
      if (validation.isValid) {
        setRestoreData(data);
      } else {
        setRestoreErrors(validation.errors);
      }
    } catch (err: any) {
      setRestoreErrors([err.message || 'Error parsing file']);
    }
  };

  const handleConfirmRestore = () => {
    if (!restoreData) return;

    if (restoreData.modules.products) localStorage.setItem('erp_products', JSON.stringify(restoreData.modules.products));
    if (restoreData.modules.clients) localStorage.setItem('erp_clients', JSON.stringify(restoreData.modules.clients));
    if (restoreData.modules.suppliers) localStorage.setItem('erp_suppliers', JSON.stringify(restoreData.modules.suppliers));
    if (restoreData.modules.orders) localStorage.setItem('erp_orders', JSON.stringify(restoreData.modules.orders));
    if (restoreData.modules.deliveryNotes) localStorage.setItem('erp_deliveryNotes', JSON.stringify(restoreData.modules.deliveryNotes));
    if (restoreData.modules.invoices) localStorage.setItem('erp_invoices', JSON.stringify(restoreData.modules.invoices));
    if (restoreData.modules.chequesEffets) localStorage.setItem('erp_cheques', JSON.stringify(restoreData.modules.chequesEffets));
    if (restoreData.modules.expenses) localStorage.setItem('erp_expenses', JSON.stringify(restoreData.modules.expenses));
    if (restoreData.modules.frigos) localStorage.setItem('erp_frigos', JSON.stringify(restoreData.modules.frigos));
    if (restoreData.modules.stocks) localStorage.setItem('erp_stocks', JSON.stringify(restoreData.modules.stocks));
    if (restoreData.modules.inventoryCounts) localStorage.setItem('erp_inventory', JSON.stringify(restoreData.modules.inventoryCounts));
    if (restoreData.modules.purchaseInvoices) localStorage.setItem('erp_purchases', JSON.stringify(restoreData.modules.purchaseInvoices));
    if (restoreData.modules.companyInfo) localStorage.setItem('erp_company', JSON.stringify(restoreData.modules.companyInfo));

    window.location.reload();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#161616] dark:text-white mb-6">{t('backupRestore') || 'Backup & Restore'}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white dark:bg-[#262626] rounded-lg shadow-sm border border-[#e0e0e0] dark:border-[#393939] p-6">
          <div className="flex items-center space-x-2 mb-4 rtl:space-x-reverse">
            <Download className="w-6 h-6 text-[#0f62fe]" />
            <h2 className="text-xl font-semibold text-[#161616] dark:text-white">{t('exportBackup') || 'Export Backup'}</h2>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('backupDescription') || 'Select the modules you want to include in the backup. The file will be saved in JSON format.'}
          </p>

          {lastBackup && (
            <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
              {t('lastBackup') || 'Last backup'}: {lastBackup}
            </div>
          )}

          <div className="flex space-x-4 rtl:space-x-reverse mb-4">
            <button onClick={() => handleSelectAll(true)} className="text-sm text-[#0f62fe] hover:underline">
              {t('selectAll') || 'Select All'}
            </button>
            <button onClick={() => handleSelectAll(false)} className="text-sm text-[#0f62fe] hover:underline">
              {t('deselectAll') || 'Deselect All'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {modulesList.map(mod => (
              <button
                key={mod.id}
                onClick={() => handleToggleModule(mod.id)}
                className="flex items-center space-x-2 rtl:space-x-reverse text-left"
              >
                {selectedModules[mod.id] ? (
                  <CheckSquare className="w-5 h-5 text-[#0f62fe]" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm text-[#161616] dark:text-gray-300">{mod.label || mod.id}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={!Object.values(selectedModules).some(v => v)}
            className="w-full flex justify-center items-center px-4 py-2 bg-[#0f62fe] text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('downloadBackup') || 'Download Backup'}
          </button>
        </div>

        {/* Restore Section */}
        <div className="bg-white dark:bg-[#262626] rounded-lg shadow-sm border border-[#e0e0e0] dark:border-[#393939] p-6">
          <div className="flex items-center space-x-2 mb-4 rtl:space-x-reverse">
            <Upload className="w-6 h-6 text-[#0f62fe]" />
            <h2 className="text-xl font-semibold text-[#161616] dark:text-white">{t('restoreBackup') || 'Restore Backup'}</h2>
          </div>

          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start space-x-3 rtl:space-x-reverse">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              {t('restoreWarning') || 'Warning: Restoring a backup will overwrite existing data. This action cannot be undone.'}
            </p>
          </div>

          <div 
            className="border-2 border-dashed border-[#e0e0e0] dark:border-[#393939] rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-[#393939] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileSelect}
            />
            <FileJson className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-[#161616] dark:text-gray-300 mb-1">
              {t('dragDropOrClick') || 'Drag and drop or click to upload'}
            </p>
            <p className="text-xs text-gray-500">JSON files only</p>
          </div>

          {restoreErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-800 dark:text-red-400">{t('invalidBackupFile') || 'Invalid Backup File'}</span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 ml-7 rtl:mr-7 rtl:ml-0">
                {restoreErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {restoreData && (
            <div className="mt-6 border border-[#e0e0e0] dark:border-[#393939] rounded-md overflow-hidden">
              <div className="bg-gray-50 dark:bg-[#393939] px-4 py-3 border-b border-[#e0e0e0] dark:border-[#393939]">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-[#161616] dark:text-white">{restoreFile?.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 ml-7 rtl:mr-7 rtl:ml-0">
                  Version: {restoreData.version} | Date: {new Date(restoreData.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(restoreData.modules).map(([key, data]) => (
                      <tr key={key} className="border-b border-[#e0e0e0] dark:border-[#393939] last:border-0">
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400 capitalize">{key}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {Array.isArray(data) ? data.length : 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-white dark:bg-[#262626] border-t border-[#e0e0e0] dark:border-[#393939]">
                {!showConfirmRestore ? (
                  <button
                    onClick={() => setShowConfirmRestore(true)}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
                  >
                    {t('confirmRestore') || 'Confirm Restore'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600 font-medium text-center">{t('areYouSureRestore') || 'Are you absolutely sure you want to restore?'}</p>
                    <div className="flex space-x-3 rtl:space-x-reverse">
                      <button
                        onClick={() => setShowConfirmRestore(false)}
                        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>
                      <button
                        onClick={handleConfirmRestore}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
                      >
                        {t('yesRestore') || 'Yes, Restore'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DANGER ZONE: RESET ALL DATA */}
          <div className="mt-8 border-t border-red-200 dark:border-red-900/40 pt-6">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-5">
              <h3 className="text-md font-bold text-red-800 dark:text-red-400 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Zone de Danger : Réinitialisation Système</span>
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mb-4">
                Cette action supprimera TOUTES les données locales (Clients, Ventes, Produits, BLs, Chèques, Stock, Dépenses) et remettra le système à zéro.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('⚠️ ATTENTION : Êtes-vous absolument sûr de vouloir SUPPRIMER TOUTES LES DONNÉES ? Cette action est irréversible.')) {
                    const confirmWord = window.prompt('Veuillez saisir "SUPPRIMER" pour confirmer l’effacement total :');
                    if (confirmWord === 'SUPPRIMER') {
                      resetAllData();
                    }
                  }
                }}
                className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer & Réinitialiser Toutes les Données</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
