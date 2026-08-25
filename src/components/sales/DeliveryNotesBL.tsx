import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { DeliveryNoteBL, DeliveryNoteItem, Invoice } from '../../types';
import { findMatchingProduct } from '../../utils/productMatcher';
import { BLSignatureModal } from './BLSignatureModal';
import { WhatsAppModal } from '../whatsapp/WhatsAppModal';
import { EmailBLModal } from '../email/EmailBLModal';
import { BLPdfDocument } from '../pdf/BLPdfDocument';
import { InvoicePdfDocument } from '../pdf/InvoicePdfDocument';
import { ExcelVerificationModal } from './ExcelVerificationModal';
import { ExportButtons } from '../common/ExportButtons';
import { useToast } from '../common/CarbonToastContainer';
import { generateWhatsAppBLLink } from '../../utils/whatsappUtils';

import { 
  Truck, 
  CheckCircle2, 
  MessageSquare, 
  Mail, 
  FileText, 
  PenTool, 
  History, 
  Building2, 
  Search, 
  Filter, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight,
  Eye,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  Camera,
  Image as ImageIcon,
  Upload,
  Scale,
  Receipt
} from 'lucide-react';


interface DeliveryNotesBLProps {
  onEditBL?: (id: string) => void;
  onNewBL?: () => void;
  onEditClient?: (id: string) => void;
  onEditProduct?: (id: string) => void;
  onEditFrigo?: (id: string) => void;
  onSignBL?: (id: string) => void;
  onViewBLPdf?: (id: string) => void;
}

export const DeliveryNotesBL: React.FC<DeliveryNotesBLProps> = ({ 
  onEditBL, 
  onNewBL,
  onEditClient,
  onEditProduct,
  onEditFrigo,
  onSignBL,
  onViewBLPdf
}) => {
  const { t } = useTranslation();
  const { 
    deliveryNotes, 
    frigos, 
    products,
    clients,
    invoices,
    addBL,
    updateBL,
    deleteBL,
    approveFrigoBL, 
    signBL, 
    sendWhatsAppBL, 
    sendEmailBL, 
    createInvoiceFromBL,
    syncBLPricesWithProducts,
    currentUser,
    activeCompanyId,
    activeCompany
  } = useERP();

  const { notifySuccess } = useToast();

  const isFrigoRole = currentUser?.role === 'RESPONSABLE_FRIGO';

  const [searchTerm, setSearchTerm] = useState('');
  const [frigoFilter, setFrigoFilter] = useState<string>(
    currentUser.role === 'RESPONSABLE_FRIGO' && currentUser.assignedFrigoId ? currentUser.assignedFrigoId : 'ALL'
  );

  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [activeSignatureBL, setActiveSignatureBL] = useState<DeliveryNoteBL | null>(null);
  const [activeWhatsAppBL, setActiveWhatsAppBL] = useState<DeliveryNoteBL | null>(null);
  const [activeEmailBL, setActiveEmailBL] = useState<DeliveryNoteBL | null>(null);
  const [activePdfBL, setActivePdfBL] = useState<DeliveryNoteBL | null>(null);
  const [activePdfInvoice, setActivePdfInvoice] = useState<Invoice | null>(null);
  const [activeHistoryBL, setActiveHistoryBL] = useState<DeliveryNoteBL | null>(null);
  const [activeWeighingBL, setActiveWeighingBL] = useState<DeliveryNoteBL | null>(null);
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [showAllCompanies, setShowAllCompanies] = useState<boolean>(true);

  // Filter BLs by Active Company, User Role, Frigo, Status, Search
  const filteredBLs = deliveryNotes.filter(bl => {
    // 1. Company Filter (if enabled via showAllCompanies toggle)
    if (!showAllCompanies && activeCompanyId !== 'ALL' && bl.companyId) {
      const normActive = activeCompanyId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBLComp = bl.companyId.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const isLegacyMatch1 = 
        (normActive.includes('ste1') || normActive.includes('comp1') || normActive.includes('company1')) &&
        (normBLComp.includes('ste1') || normBLComp.includes('comp1') || normBLComp.includes('company1'));
        
      const isLegacyMatch2 = 
        (normActive.includes('ste2') || normActive.includes('comp2') || normActive.includes('company2')) &&
        (normBLComp.includes('ste2') || normBLComp.includes('comp2') || normBLComp.includes('company2'));

      if (normBLComp !== normActive && !normBLComp.includes(normActive) && !normActive.includes(normBLComp) && !isLegacyMatch1 && !isLegacyMatch2) {
        return false;
      }
    }

    // 2. Frigo Role Restriction (only for RESPONSABLE_FRIGO)
    if (currentUser.role === 'RESPONSABLE_FRIGO' && currentUser.assignedFrigoId) {
      const normAssigned = currentUser.assignedFrigoId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBLFrigoId = (bl.frigoId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBLFrigoName = (bl.frigoName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isFrigoMatch = normBLFrigoId === normAssigned || 
                           normBLFrigoName.includes(normAssigned) || 
                           normAssigned.includes(normBLFrigoId);
      if (!isFrigoMatch) return false;
    }

    // 3. Frigo Select Dropdown Filter
    let matchesFrigo = true;
    if (frigoFilter !== 'ALL') {
      const normFilter = frigoFilter.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBLFrigoId = (bl.frigoId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBLFrigoName = (bl.frigoName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedFrigoObj = frigos.find(f => f.id === frigoFilter);
      const normFrigoObjName = (matchedFrigoObj?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      matchesFrigo = (normBLFrigoId === normFilter) || 
                     (normBLFrigoName === normFilter) || 
                     (normFrigoObjName !== '' && normBLFrigoName.includes(normFrigoObjName)) ||
                     (normFrigoObjName !== '' && normFrigoObjName.includes(normBLFrigoName));
    }

    // 4. Status Filter
    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      const normFilter = statusFilter.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBLStatus = (bl.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      matchesStatus = normBLStatus === normFilter || 
                      normBLStatus.includes(normFilter) || 
                      normFilter.includes(normBLStatus);
    }

    // 5. Search Term Filter
    const search = (searchTerm || '').trim().toLowerCase();
    const matchesSearch = !search ||
      (bl.blNumber || '').toLowerCase().includes(search) ||
      (bl.orderNumber || '').toLowerCase().includes(search) ||
      (bl.clientName || '').toLowerCase().includes(search) ||
      (bl.frigoName || '').toLowerCase().includes(search);

    return matchesFrigo && matchesStatus && matchesSearch;
  });

  // Sort BLs descending by date & ID (most recent first)
  const sortedBLs = [...filteredBLs].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    return (b.id || '').localeCompare(a.id || '');
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, frigoFilter, statusFilter, activeCompanyId]);

  const totalPages = Math.ceil(sortedBLs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBLs = sortedBLs.slice(startIndex, startIndex + itemsPerPage);


  // CRUD BL Modals
  const [showCreateBLModal, setShowCreateBLModal] = useState(false);
  const [editingBL, setEditingBL] = useState<DeliveryNoteBL | null>(null);

  // New BL Form state
  const [newBLData, setNewBLData] = useState({
    clientId: clients[0]?.id || '',
    frigoId: frigos[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    items: [
      {
        productId: products[0]?.id || '',
        quantityKg: 1000,
        unitPriceHT: products[0]?.sellingPriceHT || 75,
      }
    ]
  });

  const [selectedBLIds, setSelectedBLIds] = useState<string[]>([]);


  const toggleSelectBL = (id: string) => {
    setSelectedBLIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBLIds.length === filteredBLs.length) {
      setSelectedBLIds([]);
    } else {
      setSelectedBLIds(filteredBLs.map(b => b.id));
    }
  };

  const handleBatchWhatsApp = () => {
    const selectedBLs = filteredBLs.filter(b => selectedBLIds.includes(b.id));
    if (selectedBLs.length === 0) return;
    
    const summaryText = `📦 *SYNTHÈSE BONS DE LIVRAISON EN GROUPE* (${selectedBLs.length} BLs)
----------------------------------
${selectedBLs.map(b => `• *BL ${b.blNumber}* - Client: ${b.clientName} | ${b.totalKg} Kg (${b.totalPallets} pal) | Status: ${b.status}`).join('\n')}
----------------------------------
Date d'envoi: ${new Date().toLocaleString('fr-FR')}
EasyERP Pro • Logistics Management`;

    const firstFrigo = frigos.find(f => f.id === selectedBLs[0]?.frigoId);
    const targetUrl = firstFrigo?.whatsappGroupLink && firstFrigo.whatsappGroupLink.startsWith('http')
      ? firstFrigo.whatsappGroupLink
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;
    window.open(targetUrl, '_blank');
  };

  const handleBulkCreateInvoices = () => {
    if (selectedBLIds.length === 0) return;
    let createdCount = 0;

    selectedBLIds.forEach(blId => {
      const bl = deliveryNotes.find(b => b.id === blId);
      if (bl) {
        createInvoiceFromBL(bl.id);
        createdCount++;
      }
    });

    setSelectedBLIds([]);
    notifySuccess(`✓ ${createdCount} Facture(s) créée(s) en masse avec succès !`);
  };

  const handleBulkDeleteBLs = () => {
    if (selectedBLIds.length === 0) return;
    const count = selectedBLIds.length;

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ces ${count} Bon(s) de Livraison sélectionné(s) ?`)) {
      selectedBLIds.forEach(blId => {
        deleteBL(blId);
      });
      setSelectedBLIds([]);
      notifySuccess(`✓ ${count} Bon(s) de Livraison supprimé(s) en masse avec succès !`);
    }
  };

  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const handleUploadBonDeSortie = (bl: DeliveryNoteBL, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const photoUrl = event.target?.result as string;
      updateBL(bl.id, {
        bonDeSortiePhotoUrl: photoUrl,
        bonDeSortieUploadedBy: currentUser.name,
        bonDeSortieUploadedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
        frigoEmployeeApproved: true,
        frigoApprovedBy: currentUser.name,
        frigoApprovedAt: new Date().toISOString(),
        status: 'APPROUVÉ_FRIGO'
      });
      alert(`Photo du Bon de Sortie du Frigo pour le BL ${bl.blNumber} attachée avec succès ! Le chargement quai est validé.`);
    };
    reader.readAsDataURL(file);
  };

  const handleApproveQuai = (bl: DeliveryNoteBL) => {
    approveFrigoBL(bl.id, currentUser.name);
    alert(`Chargement du Bon de Livraison ${bl.blNumber} approuvé avec succès par ${currentUser.name} !`);
  };


  const handleGenerateInvoice = (target: DeliveryNoteBL | string) => {
    try {
      const blId = typeof target === 'string' ? target : target.id;
      const targetBL = typeof target === 'string' ? deliveryNotes.find(b => b.id === target) : target;
      
      const inv = createInvoiceFromBL(blId);
      setActivePdfInvoice(inv);
      alert(`✓ Facture N° ${inv.invoiceNumber} générée avec succès depuis le BL ${targetBL?.blNumber || blId} !`);
    } catch (err: any) {
      alert('Erreur lors de la création de la facture: ' + (err.message || err));
    }
  };

  const handleCreateInvoice = handleGenerateInvoice;


  const handleDeleteBLClick = (bl: DeliveryNoteBL) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le Bon de Livraison ${bl.blNumber} ?`)) {
      deleteBL(bl.id);
    }
  };

  const handleCreateBLSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newBLData.clientId) || clients[0];
    const frigo = frigos.find(f => f.id === newBLData.frigoId) || frigos[0];

    if (!client || !frigo) {
      alert('Veuillez sélectionner un client et un frigo valides.');
      return;
    }

    const count = deliveryNotes.length + 1;
    const blNumber = `BL-2026-${String(count).padStart(4, '0')}`;
    const orderNumber = `CMD-2026-${String(count).padStart(4, '0')}`;

    const items: DeliveryNoteItem[] = newBLData.items.map(it => {
      const prd = products.find(p => p.id === it.productId);
      const prdName = prd ? prd.name : 'Produit';
      const prdCode = prd ? prd.code : 'PRD-000';
      const kgPerPallet = prd ? prd.kgPerPallet : 800;
      const pallets = Math.ceil(it.quantityKg / kgPerPallet);
      const totalHT = it.quantityKg * it.unitPriceHT;

      return {
        productId: it.productId,
        productCode: prdCode,
        productName: prdName,
        quantityKg: Number(it.quantityKg),
        quantityPallets: pallets,
        unitPriceHT: Number(it.unitPriceHT),
        totalHT,
      };
    });

    const totalKg = items.reduce((acc, i) => acc + i.quantityKg, 0);
    const totalPallets = items.reduce((acc, i) => acc + i.quantityPallets, 0);
    const totalHT = items.reduce((acc, i) => acc + i.totalHT, 0);
    const totalTTC = totalHT; // Don't add TVA price unless asked

    const newBL: DeliveryNoteBL = {
      id: `bl-${Date.now()}`,
      blNumber,
      orderId: `ord-${Date.now()}`,
      orderNumber,
      clientId: client.id,
      clientName: client.companyName || client.name,
      clientAddress: client.address,
      clientPhone: client.phone,
      clientEmail: client.email,
      frigoId: frigo.id,
      frigoName: frigo.name,
      date: newBLData.date,
      items,
      totalKg,
      totalPallets,
      totalHT,
      totalTTC,
      frigoEmployeeApproved: false,
      whatsappSent: false,
      emailSent: false,
      status: 'EN_ATTENTE_FRIGO',
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          action: `Création manuelle du Bon de Livraison ${blNumber}`,
          author: currentUser.name,
        }
      ]
    };

    addBL(newBL);
    setShowCreateBLModal(false);

    const waLink = generateWhatsAppBLLink(newBL, frigo.whatsappGroup);
    if (window.confirm(`Bon de Livraison ${blNumber} créé avec succès !\n\nVoulez-vous transmettre l'ordre de chargement au groupe WhatsApp du frigo "${frigo.name}" dès maintenant ?`)) {
      window.open(waLink, '_blank');
    }
  };

  const handleUpdateBLEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBL) return;

    // Recalculate totals
    const totalKg = editingBL.items.reduce((acc, i) => acc + Number(i.quantityKg), 0);
    const totalPallets = editingBL.items.reduce((acc, i) => acc + Number(i.quantityPallets), 0);
    const updatedItems = editingBL.items.map(it => ({
      ...it,
      quantityKg: Number(it.quantityKg),
      unitPriceHT: Number(it.unitPriceHT),
      totalHT: Number(it.quantityKg) * Number(it.unitPriceHT),
    }));
    const totalHT = updatedItems.reduce((acc, i) => acc + i.totalHT, 0);
    const totalTTC = totalHT; // Don't add TVA price unless asked

    console.log('Submitting BL update:', editingBL.id, {
      ...editingBL,
      items: updatedItems,
      totalKg,
      totalPallets,
      totalHT,
      totalTTC,
    });
    updateBL(editingBL.id, {
      ...editingBL,
      items: updatedItems,
      totalKg,
      totalPallets,
      totalHT,
      totalTTC,
    });

    setEditingBL(null);
    alert(`Bon de Livraison ${editingBL.blNumber} mis à jour avec succès !`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#0f62fe]" />
            {t('nav.deliveryNotes', 'Bons de Livraison (BL) Multi-Frigos & Logistique')}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {t('bl.subtitle', 'Gestion des Bons de Livraison, Validation Quai, Groupe WhatsApp & Rapprochement des Stocks')}
          </p>
        </div>

        {/* User Role Reminder, Create BL, Sync & Excel Audit Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButtons 
            filename="Bons_De_Livraison_BL"
            title="REGISTRE ET SUIVI DES BONS DE LIVRAISON (BL)"
            frigoName={currentUser?.assignedFrigoId ? frigos.find(f => f.id === currentUser.assignedFrigoId)?.name : undefined}
            excelData={deliveryNotes.map(bl => ({
              'N° BL': bl.blNumber,
              'Réf Commande': bl.orderNumber,
              'Client': bl.clientName,
              'Entrepôt Frigo': bl.frigoName,
              'Date': bl.date,
              'Total Poids (Kg)': bl.totalKg,
              'Total Palettes': bl.totalPallets,
              'Montant HT (DH)': bl.totalHT,
              'Validation Frigo': bl.frigoEmployeeApproved ? `Oui (${bl.frigoApprovedBy})` : 'Non',
              'Statut': bl.status,
            }))}
          />


          <button
            onClick={() => {
              syncBLPricesWithProducts();
              alert(t('bl.pricesSynced', 'Synchronisation effectuée : Tous les BLs ont été mis à jour avec les prix actuels des produits (Sans TVA).'));
            }}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-md"
            title="Synchroniser les prix unitaires de tous les BLs avec la grille tarifaire Produits actuels"
          >
            <History className="w-4 h-4" />
            <span>{t('bl.syncPrices', 'Synchroniser Prix Produits → BLs')}</span>
          </button>

          <button
            onClick={() => onNewBL ? onNewBL() : setShowCreateBLModal(true)}
            className="px-3 py-2 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{t('bl.newBL', 'Nouveau BL')}</span>
          </button>

          <button
            onClick={() => setShowExcelModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-2 transition-all shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('importBL', 'Audit & Rapprochement Excel des BLs')}</span>
          </button>

          {currentUser.role === 'RESPONSABLE_FRIGO' && currentUser.assignedFrigoId && (
            <div className="px-3 py-1.5 bg-emerald-900/60 border border-emerald-700 text-emerald-200 text-xs rounded font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Espace Validation Responsable: {frigos.find(f => f.id === currentUser.assignedFrigoId)?.name}
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="carbon-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par N° BL, Commande, Client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full carbon-input pl-9 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-gray-500" />
            <select
              value={frigoFilter}
              onChange={e => setFrigoFilter(e.target.value)}
              className="carbon-input text-xs"
            >
              <option value="ALL">Tous les Frigos</option>
              {frigos.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="carbon-input text-xs"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="EN_ATTENTE_FRIGO">En attente Frigo</option>
              <option value="APPROUVÉ_FRIGO">Approuvé Frigo</option>
              <option value="LIVRÉ">Livré (Signé Client)</option>
              <option value="FACTURÉ">Facturé</option>
            </select>
          </div>

        </div>
      </div>

      {/* Batch Selection Bar */}
      <div className="bg-white p-3 border border-gray-200 rounded flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
            <input 
              type="checkbox"
              checked={selectedBLIds.length > 0 && selectedBLIds.length === filteredBLs.length}
              onChange={toggleSelectAll}
              className="rounded text-[#0f62fe] focus:ring-0"
            />
            <span>Sélectionner Tout ({filteredBLs.length} BLs)</span>
          </label>
          {selectedBLIds.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
              {selectedBLIds.length} sélectionné(s)
            </span>
          )}
        </div>

        {selectedBLIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {!isFrigoRole && (
              <button
                type="button"
                onClick={handleBulkCreateInvoices}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                title="Créer toutes les factures des BLs sélectionnés en masse sans afficher de modales"
              >
                <Receipt className="w-4 h-4 text-emerald-200" />
                <span>Facturer la sélection ({selectedBLIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleBulkDeleteBLs}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
              title="Supprimer définitivement les BLs sélectionnés"
            >
              <Trash2 className="w-4 h-4 text-red-200" />
              <span>Supprimer ({selectedBLIds.length})</span>
            </button>

            <button
              onClick={handleBatchWhatsApp}
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#128c7e] text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp ({selectedBLIds.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Pagination Bar Top */}
      <div className="bg-white px-4 py-3 border border-gray-200 rounded flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono shadow-sm">
        <div className="text-gray-700">
          Affichage des BLs <b className="text-[#0f62fe]">{sortedBLs.length > 0 ? startIndex + 1 : 0}</b> à <b className="text-[#0f62fe]">{Math.min(startIndex + itemsPerPage, sortedBLs.length)}</b> sur <b className="text-gray-900">{sortedBLs.length}</b> BL(s) — <span className="text-emerald-700 font-bold">Récents en premier</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-bold">Afficher par page:</span>
            <select
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-xs font-bold bg-white text-gray-900"
            >
              <option value={10}>10 BLs</option>
              <option value={20}>20 BLs</option>
              <option value={50}>50 BLs</option>
              <option value={9999}>Tous les BLs</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ◄ Précédent
            </button>
            <span className="px-2 font-bold text-gray-900">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant ►
            </button>
          </div>
        </div>
      </div>

      {/* BL Cards Grid / Table */}
      <div className="space-y-4">
        {paginatedBLs.map(bl => {
          const frigoObj = frigos.find(f => f.id === bl.frigoId);
          const isSelected = selectedBLIds.includes(bl.id);

          return (
            <div key={bl.id} className={`carbon-card p-4 space-y-4 transition-colors ${isSelected ? 'border-[#0f62fe] bg-blue-50/20' : 'hover:border-blue-400'}`}>
              
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectBL(bl.id)}
                    className="w-4 h-4 text-[#0f62fe] rounded focus:ring-0 cursor-pointer"
                  />
                  <div className="p-2 bg-blue-50 text-[#0f62fe] rounded border border-blue-200">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-gray-900">{bl.blNumber}</span>
                      <span className="text-xs text-gray-500 font-mono">CMD: <b>{bl.orderNumber}</b></span>
                      <span className="text-[10px] text-gray-400 font-mono">Date: {bl.date}</span>
                    </div>
                    <div className="font-semibold text-xs text-gray-800 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>Client:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const foundClient = clients.find(c => c.id === bl.clientId || (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === (bl.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
                          if (foundClient && onEditClient) onEditClient(foundClient.id);
                          else if (onEditClient && bl.clientId) onEditClient(bl.clientId);
                        }}
                        className="text-blue-700 hover:text-blue-900 hover:underline font-bold transition-colors cursor-pointer text-left inline-block"
                      >
                        {bl.clientName}
                      </button>
                      {(bl.clientName === 'CLIENT IMPORT' || bl.clientName.startsWith('CLIENT ')) && (
                        <button
                          type="button"
                          onClick={() => {
                            const newName = window.prompt(`Saisir le vrai nom du client pour le ${bl.blNumber} :`, '');
                            if (newName && newName.trim()) {
                              const cleanName = newName.trim().toUpperCase();
                              updateBL(bl.id, { clientName: cleanName });
                              notifySuccess(`Nom du client mis à jour : ${cleanName}`);
                            }
                          }}
                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                          title="Cliquer pour corriger le nom du client"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Renommer</span>
                        </button>
                      )}
                      {bl.clientPhone ? ` (${bl.clientPhone})` : ''}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onEditFrigo && bl.frigoId) onEditFrigo(bl.frigoId);
                    }}
                    className="text-xs px-2.5 py-1 font-mono font-bold rounded border bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Cliquer pour gérer le Frigo"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#0f62fe]" />
                    {frigos.find(f => f.id === bl.frigoId)?.name || bl.frigoName}
                  </button>

                  {bl.status === 'EN_ATTENTE_FRIGO' && (
                    <span className="text-xs px-2.5 py-1 font-mono font-bold rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> En attente validation quai
                    </span>
                  )}
                  {bl.status === 'APPROUVÉ_FRIGO' && (
                    <span className="text-xs px-2.5 py-1 font-mono font-bold rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Approuvé Quai
                    </span>
                  )}
                  {bl.status === 'LIVRÉ' && (
                    <span className="text-xs px-2.5 py-1 font-mono font-bold rounded bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Livré & Signé Client
                    </span>
                  )}
                  {/* Invoice Badge - Hidden for RESPONSABLE_FRIGO */}
                  {!isFrigoRole && (bl.status === 'FACTURÉ' || bl.invoiceId || bl.invoiceNumber) && (
                    <button
                      type="button"
                      onClick={() => {
                        const inv = invoices.find(i => i.id === bl.invoiceId || i.invoiceNumber === bl.invoiceNumber || i.blId === bl.id);
                        if (inv) {
                          setActivePdfInvoice(inv);
                        } else {
                          // Create temporary preview if invoice object not found
                          const fallbackInv: Invoice = {
                            id: bl.invoiceId || `fac-${bl.id}`,
                            invoiceNumber: bl.invoiceNumber || 'FAC-2026-0001',
                            orderId: bl.orderId,
                            blId: bl.id,
                            clientId: bl.clientId,
                            clientName: bl.clientName,
                            clientICE: '000000000000000',
                            clientAddress: bl.clientAddress,
                            date: bl.date,
                            dueDate: bl.date,
                            items: bl.items.map(it => ({
                              productId: it.productId,
                              productCode: it.productCode,
                              productName: it.productName,
                              quantityKg: it.quantityKg,
                              quantityPallets: it.quantityPallets,
                              unitPriceHT: it.unitPriceHT,
                              vatRate: 0.20,
                              totalHT: it.totalHT,
                              totalTTC: it.totalHT * 1.20
                            })),
                            totalHT: bl.totalHT,
                            totalVAT: bl.totalHT * 0.20,
                            totalTTC: bl.totalTTC || (bl.totalHT * 1.20),
                            amountPaid: 0,
                            remainingAmount: bl.totalTTC || (bl.totalHT * 1.20),
                            status: 'EMISE'
                          };
                          setActivePdfInvoice(fallbackInv);
                        }
                      }}
                      className="text-xs px-3 py-1 font-mono font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors border border-emerald-500"
                      title="Cliquer pour consulter et télécharger la Facture PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-200" />
                      <span>🧾 {bl.invoiceNumber || 'FACTURÉ'} (Voir Facture PDF)</span>
                    </button>
                  )}

                </div>
              </div>

              {/* Items Breakdown */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <div className="text-[11px] font-bold text-gray-700 uppercase mb-2">
                  Détail du Chargement Logistique:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {bl.items.map((item, idx) => {
                    const rawName = item.productName || item.productCode || 'Dattes Standard';
                    const cleanedName = rawName.includes(' - ') ? rawName.split(' - ').pop()?.trim() || rawName : rawName;
                    
                    return (
                      <div key={idx} className="bg-white p-2.5 border border-gray-200 rounded text-xs font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            const foundPrd = products.find(p => p.id === item.productId || p.code === item.productCode || (p.name || '').toLowerCase() === cleanedName.toLowerCase());
                            if (foundPrd && onEditProduct && !isFrigoRole) onEditProduct(foundPrd.id);
                            else if (onEditProduct && item.productId && !isFrigoRole) onEditProduct(item.productId);
                          }}
                          className="font-bold text-gray-900 hover:text-[#0f62fe] hover:underline cursor-pointer truncate text-left w-full block uppercase mb-1"
                          title="Produit à charger"
                        >
                          {cleanedName}
                        </button>
                        <div className="flex justify-between text-gray-600 mt-1">
                          <span>Poids: <b className="text-blue-700">{item.quantityKg.toLocaleString()} Kg</b></span>
                          <span>Cartons: <b className="text-amber-800">{(item.quantityCartons || (item.quantityKg ? Math.round(item.quantityKg / ((item.productName || item.productCode || '').toUpperCase().includes('11') ? 11 : 5)) : 0)).toLocaleString()} Ctn</b></span>
                        </div>
                        {!isFrigoRole && (
                          <div className="flex justify-between text-gray-600 mt-1">
                            <span>PU HT: <b className="text-emerald-700">{item.unitPriceHT.toLocaleString()} DH</b></span>
                            <span>Total HT: <b className="text-gray-900">{item.totalHT.toLocaleString()} DH</b></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-xs font-mono font-bold text-gray-800 mt-3 pt-2 border-t border-gray-200">
                  <span>Poids Total: <span className="text-emerald-700 font-extrabold">{bl.totalKg.toLocaleString()} Kg</span> • <span className="text-amber-800 font-extrabold">{(bl.totalCartons || bl.items.reduce((sum, it) => sum + (it.quantityCartons || (it.quantityKg ? Math.round(it.quantityKg / ((it.productName || it.productCode || '').toUpperCase().includes('11') ? 11 : 5)) : 0)), 0)).toLocaleString()} Cartons</span></span>
                  {!isFrigoRole && (
                    <span>Total HT: {bl.totalHT.toLocaleString()} DH</span>
                  )}
                </div>
              </div>


              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                
                {/* Left indicators */}
                <div className="flex items-center gap-3 text-xs font-mono text-gray-600">
                  {bl.whatsappSent ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp envoyé ({bl.whatsappSentAt})
                    </span>
                  ) : (
                    <span className="text-gray-400">WhatsApp non transmis</span>
                  )}

                  {bl.emailSent ? (
                    <span className="text-blue-600 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Email envoyé ({bl.emailRecipient})
                    </span>
                  ) : (
                    <span className="text-gray-400">Email non transmis</span>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  
                  {/* Photo Bon de Sortie Frigo Button */}
                  <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm" title="Téléverser ou Prendre en photo le Bon de Sortie physique du Frigo">
                    <Camera className="w-4 h-4 text-cyan-300" />
                    <span>{bl.bonDeSortiePhotoUrl ? '📷 Changer Photo Bon Sortie' : '📷 Photo Bon de Sortie Frigo'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={(e) => handleUploadBonDeSortie(bl, e)}
                      className="hidden" 
                    />
                  </label>

                  {/* Thumbnail Preview if Photo attached */}
                  {bl.bonDeSortiePhotoUrl && (
                    <div 
                      onClick={() => setSelectedPhotoUrl(bl.bonDeSortiePhotoUrl!)}
                      className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2 py-1 rounded cursor-pointer hover:bg-emerald-100 transition-colors"
                      title="Cliquer pour agrandir la photo du Bon de Sortie Frigo"
                    >
                      <img src={bl.bonDeSortiePhotoUrl} alt="Bon de sortie frigo" className="w-6 h-6 object-cover rounded border border-emerald-500" />
                      <span className="text-[10px] font-mono text-emerald-900 font-bold">Photo Bon Sortie ✓</span>
                    </div>
                  )}

                  {/* Step 0: Saisie & Rapprochement de la Pesée Frigo (Quai Balance) */}
                  <button
                    onClick={() => setActiveWeighingBL(bl)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm border border-amber-500 cursor-pointer"
                    title="Saisir et ajuster le poids pesé réel sur balance à la sortie du frigo avant facturation"
                  >
                    <Scale className="w-4 h-4 text-amber-200" />
                    <span>{bl.items.some(i => i.isWeighed) ? 'Pesée Validée (Modifier)' : 'Saisir Pesée Frigo (Kg)'}</span>
                  </button>

                  {/* Step 1: Quai Approval Button for Frigo Manager */}
                  {!bl.frigoEmployeeApproved && (
                    <button
                      onClick={() => handleApproveQuai(bl)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm"
                      title="Approuver le chargement sur le quai du frigo"
                    >
                      <ShieldCheck className="w-4 h-4" /> Approuver Quai Frigo
                    </button>
                  )}


                  {/* Step 2: Client Signature Button (Unlocked ONLY AFTER Approval) */}
                  {bl.frigoEmployeeApproved ? (
                    <button
                      onClick={() => onSignBL ? onSignBL(bl.id) : setActiveSignatureBL(bl)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm"
                      title="Faire signer le client après approbation quai (Page Dédiée)"
                    >
                      <PenTool className="w-4 h-4" /> Faire Signer Client
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-1.5 bg-gray-200 text-gray-400 border border-gray-300 text-xs font-bold rounded flex items-center gap-1 cursor-not-allowed opacity-60"
                      title="Approuvez d'abord le quai frigo pour débloquer la signature client"
                    >
                      <PenTool className="w-4 h-4" /> Signer (Bloqué - Valider Quai)
                    </button>
                  )}

                  {/* Step 3: Send to Frigo WhatsApp Group */}
                  {frigoObj && (
                    <button
                      onClick={() => setActiveWhatsAppBL(bl)}
                      className="px-3 py-1.5 bg-[#25D366] hover:bg-[#128c7e] text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm"
                      title={`Transmettre au groupe WhatsApp de l'entrepôt ${frigoObj.name}`}
                    >
                      <MessageSquare className="w-4 h-4" /> Groupe WhatsApp {frigoObj.name}
                    </button>
                  )}

                  {/* Email PDF Button */}
                  <button
                    onClick={() => setActiveEmailBL(bl)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                    title="Envoyer le Bon de Livraison en PDF par Email"
                  >
                    <Mail className="w-4 h-4 text-red-600" /> Email PDF
                  </button>

                  {/* View / Download PDF */}
                  <button
                    onClick={() => onViewBLPdf ? onViewBLPdf(bl.id) : setActivePdfBL(bl)}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-mono font-bold rounded flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-[#0f62fe]" /> Voir PDF
                  </button>

                  {/* Edit BL & Custom Price */}
                  {!isFrigoRole && (
                    <button
                      onClick={() => onEditBL ? onEditBL(bl.id) : setEditingBL(bl)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                      title="Éditer le BL et les prix personnalisés des lignes"
                    >
                      <Edit className="w-3.5 h-3.5" /> Éditer / Prix
                    </button>
                  )}

                  {/* Delete BL */}
                  {!isFrigoRole && (
                    <button
                      onClick={() => handleDeleteBLClick(bl)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs rounded transition-colors"
                      title="Supprimer ce Bon de Livraison"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}


                  {/* Convert to Invoice */}
                  {!isFrigoRole && bl.status !== 'FACTURÉ' && (
                    <button
                      onClick={() => handleCreateInvoice(bl.id)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm"
                      title="Générer une Facture d'après ce BL"
                    >
                      <FileText className="w-3.5 h-3.5" /> Créer Facture
                    </button>
                  )}

                  {/* History Timeline Log */}
                  <button
                    onClick={() => setActiveHistoryBL(bl)}
                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title="Voir l'historique de livraison"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          );
        })}
        {sortedBLs.length === 0 && (
          <div className="bg-white p-8 text-center border border-gray-200 rounded text-gray-500 italic space-y-2">
            <Truck className="w-8 h-8 text-gray-300 mx-auto" />
            <div className="text-sm font-bold text-gray-700">Aucun Bon de Livraison trouvé</div>
            <div className="text-xs">Aucun BL ne correspond à vos critères de recherche ou de filtre actuels.</div>
          </div>
        )}
      </div>

      {/* Pagination Bar Bottom */}
      {sortedBLs.length > 0 && (
        <div className="bg-white px-4 py-3 border border-gray-200 rounded flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono shadow-sm">
          <div className="text-gray-700">
            Affichage des BLs <b className="text-[#0f62fe]">{startIndex + 1}</b> à <b className="text-[#0f62fe]">{Math.min(startIndex + itemsPerPage, sortedBLs.length)}</b> sur <b className="text-gray-900">{sortedBLs.length}</b> BL(s)
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ◄ Précédent
            </button>
            <span className="px-3 font-bold text-gray-900">
              Page {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant ►
            </button>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {activeSignatureBL && (
        <BLSignatureModal
          blNumber={activeSignatureBL.blNumber}
          clientName={activeSignatureBL.clientName}
          onSaveSignature={(signatureUrl, signerName) => {
            signBL(activeSignatureBL.id, signatureUrl, signerName);
            setActiveSignatureBL(null);
            alert(`Signature de ${signerName} enregistrée avec succès !`);
          }}
          onClose={() => setActiveSignatureBL(null)}
        />
      )}

      {/* WhatsApp Modal */}
      {activeWhatsAppBL && (
        <WhatsAppModal
          bl={activeWhatsAppBL}
          frigo={frigos.find(f => f.id === activeWhatsAppBL.frigoId) || frigos[0]}
          onConfirmSent={() => sendWhatsAppBL(activeWhatsAppBL.id)}
          onClose={() => setActiveWhatsAppBL(null)}
        />
      )}

      {/* Email PDF Modal */}
      {activeEmailBL && (
        <EmailBLModal
          bl={activeEmailBL}
          onSendEmail={(recipient) => sendEmailBL(activeEmailBL.id, recipient)}
          onDownloadPdf={() => setActivePdfBL(activeEmailBL)}
          onClose={() => setActiveEmailBL(null)}
        />
      )}

      {/* PDF Document Viewer Modal */}
      {activePdfBL && (
        <BLPdfDocument
          bl={activePdfBL}
          frigo={frigos.find(f => f.id === activePdfBL.frigoId)}
          onClose={() => setActivePdfBL(null)}
        />
      )}

      {/* Delivery History Timeline Modal */}
      {activeHistoryBL && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-lg rounded shadow-2xl overflow-hidden">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <History className="w-4 h-4 text-[#0f62fe]" />
                Historique de Livraison ({activeHistoryBL.blNumber})
              </h3>
              <button onClick={() => setActiveHistoryBL(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3">
                {activeHistoryBL.logs.map((log, idx) => (
                  <div key={log.id} className="flex items-start gap-3 relative pb-3 border-l-2 border-blue-500 pl-4 ml-2">
                    <div className="w-2.5 h-2.5 bg-[#0f62fe] rounded-full absolute -left-[6px] top-1" />
                    <div className="text-xs font-mono">
                      <div className="font-bold text-gray-900">{log.action}</div>
                      <div className="text-gray-500 mt-0.5">Auteur: {log.author} • {log.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setActiveHistoryBL(null)}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Data Audit & Verification Modal */}
      <ExcelVerificationModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
      />

      {/* Create New BL Modal */}
      {showCreateBLModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-3xl rounded shadow-2xl overflow-hidden animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f62fe]" />
                Créer un Bon de Livraison (BL) & Prix Personnalisé
              </h3>
              <button onClick={() => setShowCreateBLModal(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBLSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Client *</label>
                  <select
                    value={newBLData.clientId}
                    onChange={e => setNewBLData({ ...newBLData, clientId: e.target.value })}
                    className="w-full carbon-input"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName || c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frigo de Départ *</label>
                  <select
                    value={newBLData.frigoId}
                    onChange={e => setNewBLData({ ...newBLData, frigoId: e.target.value })}
                    className="w-full carbon-input"
                  >
                    {frigos.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date du BL *</label>
                  <input
                    type="date"
                    value={newBLData.date}
                    onChange={e => setNewBLData({ ...newBLData, date: e.target.value })}
                    className="w-full carbon-input font-mono"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-800 uppercase font-mono">Articles & Prix de Vente HT par Ligne:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const firstPrd = products[0];
                      setNewBLData({
                        ...newBLData,
                        items: [
                          ...newBLData.items,
                          {
                            productId: firstPrd?.id || '',
                            quantityKg: 500,
                            unitPriceHT: firstPrd?.sellingPriceHT || 75,
                          }
                        ]
                      });
                    }}
                    className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1"
                  >
                    + Ajouter une ligne produit
                  </button>
                </div>

                {newBLData.items.map((it, idx) => {
                  const selectedPrd = products.find(p => p.id === it.productId);
                  const kgPerPallet = selectedPrd ? selectedPrd.kgPerPallet : 800;
                  const pallets = Math.ceil(it.quantityKg / kgPerPallet);
                  const lineTotalHT = it.quantityKg * it.unitPriceHT;

                  return (
                    <div key={idx} className="bg-gray-50 p-3 border border-gray-200 rounded grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase mb-0.5">Produit</label>
                        <select
                          value={it.productId}
                          onChange={e => {
                            const pId = e.target.value;
                            const prd = products.find(p => p.id === pId);
                            const updated = [...newBLData.items];
                            updated[idx] = {
                              ...updated[idx],
                              productId: pId,
                              unitPriceHT: prd ? prd.sellingPriceHT : updated[idx].unitPriceHT,
                            };
                            setNewBLData({ ...newBLData, items: updated });
                          }}
                          className="w-full carbon-input text-xs"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.sellingPriceHT} DH/kg)</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase mb-0.5">Quantité (Kg)</label>
                        <input
                          type="number"
                          min="1"
                          value={it.quantityKg}
                          onChange={e => {
                            const updated = [...newBLData.items];
                            updated[idx].quantityKg = Number(e.target.value);
                            setNewBLData({ ...newBLData, items: updated });
                          }}
                          className="w-full carbon-input font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-emerald-800 font-bold uppercase mb-0.5">Prix HT / Kg (DH)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={it.unitPriceHT}
                          onChange={e => {
                            const updated = [...newBLData.items];
                            updated[idx].unitPriceHT = Number(e.target.value);
                            setNewBLData({ ...newBLData, items: updated });
                          }}
                          className="w-full carbon-input font-mono font-bold text-emerald-900 text-xs bg-emerald-50"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        {newBLData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newBLData.items.filter((_, i) => i !== idx);
                              setNewBLData({ ...newBLData, items: updated });
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="sm:col-span-12 flex justify-between text-[11px] font-mono text-gray-600 pt-1 border-t border-gray-200">
                        <span>Palettes estimées: <b>{pallets} pal</b> ({kgPerPallet} kg/pal)</span>
                        <span className="font-bold text-gray-900">Total Ligne HT: {lineTotalHT.toLocaleString()} DH</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBLModal(false)}
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary text-xs"
                >
                  Créer le BL avec Prix Personnalisé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit BL Modal */}
      {editingBL && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-3xl rounded shadow-2xl overflow-hidden animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#0f62fe]" />
                Éditer le Bon de Livraison ({editingBL.blNumber})
              </h3>
              <button onClick={() => setEditingBL(null)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateBLEditSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Client</label>
                  <input
                    type="text"
                    value={editingBL.clientName}
                    onChange={e => setEditingBL({ ...editingBL, clientName: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frigo de Départ</label>
                  <select
                    value={editingBL.frigoId}
                    onChange={e => {
                      const fr = frigos.find(f => f.id === e.target.value);
                      setEditingBL({
                        ...editingBL,
                        frigoId: e.target.value,
                        frigoName: fr ? fr.name : editingBL.frigoName,
                      });
                    }}
                    className="w-full carbon-input"
                  >
                    {frigos.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Statut BL</label>
                  <select
                    value={editingBL.status}
                    onChange={e => setEditingBL({ ...editingBL, status: e.target.value as any })}
                    className="w-full carbon-input font-mono font-bold"
                  >
                    <option value="EN_ATTENTE_FRIGO">EN_ATTENTE_FRIGO</option>
                    <option value="APPROUVÉ_FRIGO">APPROUVÉ_FRIGO</option>
                    <option value="LIVRÉ">LIVRÉ</option>
                    <option value="FACTURÉ">FACTURÉ</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-800 uppercase font-mono">Lignes d'articles & Prix Vente HT Personnalisés:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const firstPrd = products[0];
                      setEditingBL({
                        ...editingBL,
                        items: [
                          ...editingBL.items,
                          {
                            productId: firstPrd?.id || 'prd-1',
                            productCode: firstPrd?.code || 'PRD-001',
                            productName: firstPrd?.name || 'Produit',
                            quantityKg: 500,
                            quantityPallets: 1,
                            unitPriceHT: firstPrd?.sellingPriceHT || 75,
                            totalHT: 500 * (firstPrd?.sellingPriceHT || 75),
                          }
                        ]
                      });
                    }}
                    className="text-xs text-blue-700 font-bold hover:underline"
                  >
                    + Ajouter une ligne
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-500 uppercase">
                        <th className="p-2">Produit</th>
                        <th className="p-2">Kg</th>
                        <th className="p-2">Prix/Kg (DH)</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingBL.items.map((it, idx) => {
                        const matchedPrd = findMatchingProduct(it, products);
                        return (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2">
                              <select
                                value={matchedPrd?.id || it.productId || ''}
                                onChange={e => {
                                  const selectedId = e.target.value;
                                  const prd = products.find(p => p.id === selectedId);
                                  const updated = [...editingBL.items];
                                  if (prd) {
                                    const kg = updated[idx].quantityKg || 500;
                                    updated[idx] = {
                                      ...updated[idx],
                                      productId: prd.id,
                                      productCode: prd.code,
                                      productName: prd.name,
                                      unitPriceHT: prd.sellingPriceHT,
                                      totalHT: kg * prd.sellingPriceHT,
                                    };
                                  }
                                  setEditingBL({ ...editingBL, items: updated });
                                }}
                                className="w-full carbon-input text-xs font-medium min-w-[200px]"
                              >
                                <option value="">-- Sélectionner Produit --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} - {p.name} ({p.sellingPriceHT} DH)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={it.quantityKg}
                                onChange={e => {
                                  const newKg = Number(e.target.value);
                                  const updated = [...editingBL.items];
                                  updated[idx] = {
                                    ...updated[idx],
                                    quantityKg: newKg,
                                    totalHT: newKg * updated[idx].unitPriceHT,
                                  };
                                  setEditingBL({ ...editingBL, items: updated });
                                }}
                                className="w-20 carbon-input font-mono text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.unitPriceHT}
                                onChange={e => {
                                  const newPrice = Number(e.target.value);
                                  const updated = [...editingBL.items];
                                  updated[idx] = {
                                    ...updated[idx],
                                    unitPriceHT: newPrice,
                                    totalHT: updated[idx].quantityKg * newPrice,
                                  };
                                  setEditingBL({ ...editingBL, items: updated });
                                }}
                                className="w-24 carbon-input font-mono font-bold text-emerald-900 text-xs bg-emerald-50"
                              />
                            </td>
                            <td className="p-2">
                              {editingBL.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = editingBL.items.filter((_, i) => i !== idx);
                                    setEditingBL({ ...editingBL, items: updated });
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBL(null)}
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary text-xs"
                >
                  Mettre à Jour le BL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Res Photo Modal Viewer for Bon de Sortie Frigo */}

      {selectedPhotoUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-4">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800 text-white font-mono text-xs">
              <span className="font-bold flex items-center gap-2 text-emerald-400">
                <Camera className="w-4 h-4 text-emerald-400" />
                Preuve d'Approbation Quai - Photo Bon de Sortie Physique Frigo
              </span>
              <button 
                onClick={() => setSelectedPhotoUrl(null)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors"
              >
                Fermer (ESC)
              </button>
            </div>

            <div className="flex justify-center items-center bg-black/60 rounded-xl p-2 max-h-[75vh] overflow-auto">
              <img src={selectedPhotoUrl} alt="Bon de sortie frigo physique" className="max-h-[70vh] object-contain rounded shadow-lg" />
            </div>

            <div className="mt-3 flex justify-between items-center text-[11px] font-mono text-gray-400">
              <span>Original Document Proof • EasyERP Pro Logistics</span>
              <a 
                href={selectedPhotoUrl} 
                download="Bon_De_Sortie_Frigo.jpg"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors"
              >
                Télécharger l'image HD
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Invoice PDF Document Modal Overlay */}
      {activePdfInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full my-8">
            <InvoicePdfDocument
              invoice={activePdfInvoice}
              onClose={() => setActivePdfInvoice(null)}
            />
          </div>
        </div>
      )}

      {/* Saisie & Rapprochement de Pesée Frigo Modal */}
      {activeWeighingBL && (
        <FrigoWeighingModal
          bl={activeWeighingBL}
          products={products}
          currentUser={currentUser}
          onClose={() => setActiveWeighingBL(null)}
          onSave={(updatedBLItems, totalKg, totalHT, totalTTC) => {
            const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
            const totalDiff = updatedBLItems.reduce((acc, it) => {
              const theo = it.theoreticalKg || (it.quantityCartons ? it.quantityCartons * 10 : it.quantityKg);
              return acc + ((it.weighedKg !== undefined ? it.weighedKg : it.quantityKg) - theo);
            }, 0);
            
            const newLog = {
              id: `log-${Date.now()}`,
              timestamp,
              action: `Pesée sortie frigo enregistrée : Poids pesé total ${totalKg.toLocaleString()} Kg (Écart: ${totalDiff > 0 ? '+' : ''}${totalDiff} Kg)`,
              author: currentUser.name,
            };

            updateBL(activeWeighingBL.id, {
              items: updatedBLItems,
              totalKg,
              totalHT,
              totalTTC,
              logs: [...activeWeighingBL.logs, newLog]
            });

            setActiveWeighingBL(null);
            alert(`Pesée du Frigo enregistrée avec succès pour le BL ${activeWeighingBL.blNumber} ! Le poids pesé de ${totalKg.toLocaleString()} Kg a été enregistré.`);
          }}
        />
      )}

    </div>
  );
};

// Modal dédié à la saisie de pesée sur balance du Frigo (Sortie Quai)
const FrigoWeighingModal: React.FC<{
  bl: DeliveryNoteBL;
  products: any[];
  currentUser: any;
  onClose: () => void;
  onSave: (items: DeliveryNoteItem[], totalKg: number, totalHT: number, totalTTC: number) => void;
}> = ({ bl, products, currentUser, onClose, onSave }) => {
  const [items, setItems] = useState<DeliveryNoteItem[]>(() => {
    return bl.items.map(it => {
      const prd = products.find(p => p.id === it.productId || p.code === it.productCode);
      const kgCarton = prd?.kgPerCarton || 10;
      const cartons = it.quantityCartons || (it.quantityKg ? Math.round(it.quantityKg / kgCarton) : 0);
      const theoKg = it.theoreticalKg || (cartons * kgCarton);
      const weighedKg = it.weighedKg !== undefined ? it.weighedKg : it.quantityKg;
      return {
        ...it,
        quantityCartons: cartons,
        theoreticalKg: theoKg,
        weighedKg: weighedKg,
        quantityKg: weighedKg,
        unitPriceHT: it.unitPriceHT,
        totalHT: weighedKg * it.unitPriceHT,
      };
    });
  });

  const handleWeighedKgChange = (index: number, valStr: string) => {
    const updated = [...items];
    const val = valStr !== '' ? Number(valStr) : 0;
    const item = { ...updated[index] };
    item.weighedKg = val;
    item.isWeighed = val > 0;
    item.quantityKg = val > 0 ? val : (item.theoreticalKg || item.quantityKg);
    item.totalHT = item.quantityKg * item.unitPriceHT;
    updated[index] = item;
    setItems(updated);
  };

  const handleCartonsChange = (index: number, valNum: number) => {
    const updated = [...items];
    const item = { ...updated[index] };
    const prd = products.find(p => p.id === item.productId || p.code === item.productCode);
    const kgCarton = prd?.kgPerCarton || 10;
    item.quantityCartons = valNum;
    item.theoreticalKg = valNum * kgCarton;
    if (!item.weighedKg || item.weighedKg === item.theoreticalKg) {
      item.weighedKg = item.theoreticalKg;
      item.quantityKg = item.theoreticalKg;
    }
    item.totalHT = item.quantityKg * item.unitPriceHT;
    updated[index] = item;
    setItems(updated);
  };

  const totalTheoKg = items.reduce((acc, i) => acc + (i.theoreticalKg || 0), 0);
  const totalWeighedKg = items.reduce((acc, i) => acc + Number(i.quantityKg || 0), 0);
  const totalCartonsSum = items.reduce((acc, i) => acc + Number(i.quantityCartons || 0), 0);
  const totalDiffKg = totalWeighedKg - totalTheoKg;
  const totalHTSum = items.reduce((acc, i) => acc + Number(i.totalHT || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(items, totalWeighedKg, totalHTSum, totalHTSum);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="bg-white border-2 border-amber-500 rounded-xl shadow-2xl max-w-4xl w-full p-6 space-y-5">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 uppercase flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" />
              Saisie et Rapprochement de la Pesée Frigo (Sortie Balance)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Renseignez le poids pesé réel sur balance à la sortie du frigo avant validation et facturation au client.
            </p>
          </div>
          <button onClick={onClose} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded">
            ✕ Fermer
          </button>
        </div>

        {/* BL Metadata Badge */}
        <div className="bg-amber-50 border border-amber-200 p-3 rounded grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500 text-[10px] block uppercase">N° Bon de Livraison</span>
            <span className="font-bold text-amber-900">{bl.blNumber}</span>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block uppercase">Client</span>
            <span className="font-bold text-gray-900">{bl.clientName}</span>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block uppercase">Frigo d'Expédition</span>
            <span className="font-bold text-emerald-800">{bl.frigoName}</span>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block uppercase">Date</span>
            <span className="font-bold text-gray-800">{bl.date}</span>
          </div>
        </div>

        {/* Table of Articles */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 uppercase text-[10px] text-gray-700 font-bold border-b">
                <tr>
                  <th className="p-2.5">Produit</th>
                  <th className="p-2.5 text-center">Colis (Cartons)</th>
                  <th className="p-2.5 text-center">Poids Théorique</th>
                  <th className="p-2.5 text-center bg-emerald-100 text-emerald-900">Poids Pesé Réel (Kg) *</th>
                  <th className="p-2.5 text-center">Écart Pesée</th>
                  <th className="p-2.5 text-right">PU HT / Kg</th>
                  <th className="p-2.5 text-right">Total HT (Pesé)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((it, idx) => {
                  const diff = (it.weighedKg || it.quantityKg) - (it.theoreticalKg || 0);
                  return (
                    <tr key={idx} className="hover:bg-amber-50/40">
                      <td className="p-2.5 font-bold text-gray-900">
                        <div>{it.productName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{it.productCode}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          value={it.quantityCartons || ''}
                          onChange={e => handleCartonsChange(idx, Number(e.target.value))}
                          className="w-20 carbon-input text-center font-bold text-amber-800"
                        />
                      </td>
                      <td className="p-2.5 text-center text-gray-500 font-semibold">
                        {(it.theoreticalKg || 0).toLocaleString()} Kg
                      </td>
                      <td className="p-2.5 text-center bg-emerald-50/50">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          required
                          value={it.weighedKg !== undefined ? it.weighedKg : ''}
                          onChange={e => handleWeighedKgChange(idx, e.target.value)}
                          className="w-28 carbon-input text-center font-bold text-emerald-800 border-2 border-emerald-500 bg-white"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${diff === 0 ? 'bg-gray-100 text-gray-600' : diff < 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
                          {diff > 0 ? `+${diff}` : diff} Kg
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-blue-700">
                        {it.unitPriceHT.toLocaleString()} DH
                      </td>
                      <td className="p-2.5 text-right font-bold text-gray-900">
                        {(it.quantityKg * it.unitPriceHT).toLocaleString(undefined, { minimumFractionDigits: 2 })} DH
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-bold border-t text-xs">
                <tr>
                  <td className="p-2.5 text-gray-800 uppercase">Totaux Général:</td>
                  <td className="p-2.5 text-center text-amber-900">{totalCartonsSum.toLocaleString()} Ctn</td>
                  <td className="p-2.5 text-center text-gray-600">{totalTheoKg.toLocaleString()} Kg</td>
                  <td className="p-2.5 text-center text-emerald-800 text-sm font-extrabold">{totalWeighedKg.toLocaleString()} Kg</td>
                  <td className="p-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded ${totalDiffKg === 0 ? 'text-gray-600' : totalDiffKg < 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {totalDiffKg > 0 ? `+${totalDiffKg}` : totalDiffKg} Kg
                    </span>
                  </td>
                  <td></td>
                  <td className="p-2.5 text-right text-emerald-700 text-sm">{totalHTSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pt-3 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Scale className="w-4 h-4" /> Enregistrer & Mettre à jour le BL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


