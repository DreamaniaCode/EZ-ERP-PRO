import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  PenLine,
  Trash2,
  Camera,
  TrendingUp,
  Package,
  DollarSign,
  MessageSquare,
  Eye,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  Check,
  Layers,
  Award
} from 'lucide-react';
import { ChequeEffet, DeliveryNoteBL, Invoice, Client } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { InvoicePdfDocument } from '../pdf/InvoicePdfDocument';
import { generateWhatsAppInvoiceLink, generateWhatsAppBLLink } from '../../utils/whatsappUtils';

interface ClientEditPageProps {
  editId: string | null;
  onBack: () => void;
  onViewBLPdf?: (blId: string) => void;
  onNewBL?: (clientId: string) => void;
  onMassBL?: (clientId: string) => void;
  initialTab?: 'DETAILS' | 'BL_HISTORY' | 'INVOICES' | 'PAYMENTS';
}

export const ClientEditPage: React.FC<ClientEditPageProps> = ({ 
  editId, 
  onBack,
  onViewBLPdf,
  onNewBL,
  onMassBL,
  initialTab
}) => {
  const { t } = useTranslation();
  const { 
    clients, 
    addClient, 
    updateClient, 
    deleteClient, 
    orders, 
    deliveryNotes, 
    invoices, 
    chequesEffets, 
    frigos, 
    addChequeEffet, 
    updateChequeEffet, 
    deleteChequeEffet 
  } = useERP();
  
  const [currentClientId, setCurrentClientId] = useState<string | null>(editId);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'BL_HISTORY' | 'INVOICES' | 'PAYMENTS'>(initialTab || 'DETAILS');
  const [isEditMode, setIsEditMode] = useState<boolean>(!editId); // default to edit form only if creating new
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const [blSearchTerm, setBlSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editId prop if parent changes it
  useEffect(() => {
    setCurrentClientId(editId);
    setIsEditMode(!editId);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [editId, initialTab]);

  // Find the currently viewed client
  const client = useMemo(() => {
    if (!currentClientId) return null;
    return (clients || []).find((c: Client) => c.id === currentClientId) || null;
  }, [currentClientId, clients]);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    ice: '',
    email: '',
    phone: '',
    address: '',
    city: 'Casablanca',
    creditLimit: 300000,
    balance: 0,
    photoUrl: '',
    category: 'GROSSISTE',
    paymentTermsDays: 30,
    notes: ''
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

  // Populate form data whenever client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        companyName: client.companyName || '',
        ice: client.ice || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || 'Casablanca',
        creditLimit: client.creditLimit || 300000,
        balance: client.currentBalance || client.balance || 0,
        photoUrl: client.photoUrl || client.avatar || '',
        category: client.category || 'GROSSISTE',
        paymentTermsDays: client.paymentTermsDays || 30,
        notes: client.notes || ''
      });
    } else if (!currentClientId) {
      // New client default
      setFormData({
        name: '',
        companyName: '',
        ice: '',
        email: '',
        phone: '',
        address: '',
        city: 'Casablanca',
        creditLimit: 300000,
        balance: 0,
        photoUrl: '',
        category: 'GROSSISTE',
        paymentTermsDays: 30,
        notes: ''
      });
    }
  }, [client, currentClientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('L\'image sélectionnée est trop volumineuse (max 2 Mo).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, photoUrl: base64 }));
        if (currentClientId) {
          updateClient(currentClientId, { photoUrl: base64, avatar: base64 });
        }
        setShowPhotoModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
    if (currentClientId) {
      updateClient(currentClientId, { photoUrl: '', avatar: '' });
    }
    setShowPhotoModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Veuillez saisir au moins le nom du client.');
      return;
    }
    const { balance, ...saveData } = formData;
    if (currentClientId) {
      updateClient(currentClientId, saveData);
      setIsEditMode(false);
      setSaveSuccessMsg('Fiche client mise à jour avec succès !');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } else {
      addClient(saveData);
      onBack();
    }
  };

  const handleDeleteCurrentClient = () => {
    if (!client) return;
    if (window.confirm(`Êtes-vous absolument sûr de vouloir supprimer définitivement le client "${client.name}" (${client.code}) ? Toutes ses données associées resteront dans l'historique.`)) {
      deleteClient(client.id);
      onBack();
    }
  };

  // Filter client-related data
  const clientNormName = (formData.name || client?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const clientNormCompany = (formData.companyName || client?.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const clientOrders = useMemo(() => {
    return (orders || []).filter(o => 
      (currentClientId && o.clientId === currentClientId) || 
      (clientNormName && (o.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName)
    );
  }, [orders, currentClientId, clientNormName]);

  const clientBLs = useMemo(() => {
    return (deliveryNotes || []).filter((bl: DeliveryNoteBL) => 
      (currentClientId && bl.clientId === currentClientId) || 
      (clientNormName && (bl.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName) ||
      (clientNormCompany && (bl.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormCompany)
    );
  }, [deliveryNotes, currentClientId, clientNormName, clientNormCompany]);

  const clientInvoices = useMemo(() => {
    return (invoices || []).filter((inv: Invoice) => 
      (currentClientId && inv.clientId === currentClientId) || 
      (clientNormName && (inv.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName) ||
      (clientNormCompany && (inv.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormCompany)
    );
  }, [invoices, currentClientId, clientNormName, clientNormCompany]);

  const clientPayments = useMemo(() => {
    return (chequesEffets || []).filter((c: ChequeEffet) => 
      (currentClientId && (c.partyId === currentClientId || c.clientId === currentClientId)) || 
      (clientNormName && (c.partyName || c.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormName) ||
      (clientNormCompany && (c.partyName || c.clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === clientNormCompany)
    );
  }, [chequesEffets, currentClientId, clientNormName, clientNormCompany]);

  // Financial Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueInvoices = useMemo(() => {
    return clientInvoices.filter(inv => 
      inv.status === 'EN_RETARD' || (inv.status !== 'PAYEE' && inv.dueDate && inv.dueDate < todayStr)
    );
  }, [clientInvoices, todayStr]);

  const totalOverdueAmount = useMemo(() => {
    return overdueInvoices.reduce((acc, inv) => acc + (inv.totalTTC - (inv.amountPaid || inv.paidAmount || 0)), 0);
  }, [overdueInvoices]);

  const creditLimit = formData.creditLimit || 300000;
  const currentBalance = formData.balance || client?.currentBalance || 0;
  const availableCredit = creditLimit - currentBalance;
  const creditUsagePercent = creditLimit > 0 ? Math.min(Math.round((currentBalance / creditLimit) * 100), 100) : 0;

  // Turnover Calculation (Invoices total or BLs total)
  const totalTurnoverTTC = useMemo(() => {
    const fromInvoices = clientInvoices.reduce((acc, inv) => acc + (inv.totalTTC || 0), 0);
    if (fromInvoices > 0) return fromInvoices;
    return clientBLs.reduce((acc, bl) => acc + (bl.totalTTC || 0), 0);
  }, [clientInvoices, clientBLs]);

  const totalWeightKg = useMemo(() => {
    return clientBLs.reduce((acc, bl) => acc + (bl.totalKg || 0), 0);
  }, [clientBLs]);

  const totalPallets = useMemo(() => {
    return clientBLs.reduce((acc, bl) => acc + (bl.totalPallets || 0), 0);
  }, [clientBLs]);

  // Top Product Calculation
  const topProduct = useMemo(() => {
    const productVolumeMap: { [productId: string]: { name: string; kg: number; totalHT: number } } = {};
    clientBLs.forEach(bl => {
      (bl.items || []).forEach(item => {
        const key = item.productId || item.productName;
        if (!productVolumeMap[key]) {
          productVolumeMap[key] = {
            name: item.productName,
            kg: 0,
            totalHT: 0,
          };
        }
        productVolumeMap[key].kg += (item.quantityKg || 0);
        productVolumeMap[key].totalHT += (item.totalHT || 0);
      });
    });
    const sorted = Object.values(productVolumeMap).sort((a, b) => b.kg - a.kg);
    return sorted[0] || null;
  }, [clientBLs]);

  // Filtered BLs & Invoices for tabs
  const filteredBLs = useMemo(() => {
    if (!blSearchTerm.trim()) return clientBLs;
    const q = blSearchTerm.toLowerCase();
    return clientBLs.filter(bl => 
      bl.blNumber.toLowerCase().includes(q) || 
      (bl.frigoName && bl.frigoName.toLowerCase().includes(q)) ||
      bl.date.includes(q)
    );
  }, [clientBLs, blSearchTerm]);

  const filteredInvoices = useMemo(() => {
    if (!invoiceSearchTerm.trim()) return clientInvoices;
    const q = invoiceSearchTerm.toLowerCase();
    return clientInvoices.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.date.includes(q) ||
      (inv.status && inv.status.toLowerCase().includes(q))
    );
  }, [clientInvoices, invoiceSearchTerm]);

  // Payment Handlers
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
        partyId: currentClientId || '',
        amount: paymentForm.amount,
        issueDate: paymentForm.issueDate,
        dueDate: paymentForm.dueDate,
        bankName: paymentForm.bankName || 'Banque Client',
        status: paymentForm.paymentMethod === 'ESPECES' ? 'ENCAISSE' : 'EN_PORTEFEUILLE',
        notes: paymentForm.notes || `Règlement (${paymentForm.paymentMethod})`
      });

      if (currentClientId) {
        const newBalance = Math.max(0, formData.balance - paymentForm.amount);
        updateClient(currentClientId, { currentBalance: newBalance });
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

  // Render Initials for Avatar if no image
  const getInitials = (name: string, company?: string) => {
    const target = name || company || 'CL';
    const parts = target.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return target.slice(0, 2).toUpperCase();
  };

  // WhatsApp link for client
  const clientWhatsAppLink = useMemo(() => {
    if (!formData.phone) return null;
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const msg = `Bonjour ${formData.name || 'Cher client'},\n\nNous vous contactons depuis EasyERP concernant le suivi de votre compte client.\nSolde actuel : ${currentBalance.toLocaleString()} DH.\n\nRestant à votre entière disposition.`;
    return `https://wa.me/${cleanPhone.startsWith('0') ? '212' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(msg)}`;
  }, [formData.phone, formData.name, currentBalance]);

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] text-[#161616] overflow-hidden">
      
      {/* Top Application Bar */}
      <div className="flex flex-wrap items-center justify-between bg-white px-5 py-3 border-b border-[#e0e0e0] shadow-sm gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-blue-50 text-[#0f62fe] rounded-lg transition-colors border border-transparent hover:border-blue-200"
            title="Retour à la liste des clients"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
            <button onClick={onBack} className="hover:text-[#0f62fe] hover:underline font-semibold">
              Clients
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold text-gray-900 truncate max-w-[200px]">
              {client ? `${client.code} - ${client.name}` : t('directory.newClient', 'Nouveau Client')}
            </span>
          </div>
        </div>

        {/* Quick Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {client && (
            <div className="hidden lg:flex items-center gap-1.5 mr-2">
              <span className="text-xs font-bold text-gray-500 font-mono">Dossier:</span>
              <select
                value={currentClientId || ''}
                onChange={(e) => {
                  setCurrentClientId(e.target.value);
                  setIsEditMode(false);
                }}
                className="carbon-input text-xs font-bold bg-gray-50 text-gray-900 border-gray-300 rounded py-1 px-2 font-mono max-w-[220px]"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name} ({c.city})</option>
                ))}
              </select>
            </div>
          )}

          {client && (
            <>
              <ExportButtons 
                filename={`Dossier_Client_${client.code}_${(client.name || 'client').replace(/\s+/g, '_')}`}
                title={`DOSSIER CLIENT & RELEVÉ GÉNÉRAL - ${client.name.toUpperCase()} (${client.code})`}
                excelData={clientBLs.map(bl => {
                  const inv = clientInvoices.find(i => i.blId === bl.id || i.invoiceNumber.includes(bl.blNumber.replace('BL-', '')));
                  return {
                    'Code Client': client.code,
                    'Nom Client': client.name,
                    'Raison Sociale': client.companyName || '-',
                    'ICE': client.ice || '-',
                    'N° BL': bl.blNumber,
                    'Date': bl.date,
                    'Frigo': bl.frigoName,
                    'Total Kg': bl.totalKg,
                    'Palettes': bl.totalPallets,
                    'Montant TTC': bl.totalTTC,
                    'Facture Rattachée': inv?.invoiceNumber || 'Non Facturé',
                    'Statut Facture': inv?.status || 'EN ATTENTE',
                    'Montant Payé': inv?.amountPaid || inv?.paidAmount || 0,
                    'Reste Dû': inv ? (inv.totalTTC - (inv.amountPaid || inv.paidAmount || 0)) : bl.totalTTC
                  };
                })}
              />

              <button 
                type="button" 
                onClick={() => {
                  if (onNewBL && client) onNewBL(client.id);
                }}
                className="flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors shadow-sm cursor-pointer"
                title="Créer un nouveau Bon de Livraison pour ce client"
              >
                <Truck className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                Nouveau BL
              </button>

              <button 
                type="button" 
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                title="Enregistrer un nouveau règlement reçu"
              >
                <Plus className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                Nouveau Règlement
              </button>

              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                  title="Modifier les coordonnées et conditions du client"
                >
                  <PenLine className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                  Modifier la Fiche
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-md"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                  Enregistrer Modifications
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteCurrentClient}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Supprimer ce client"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {!client && (
            <button 
              type="button"
              onClick={handleSubmit}
              className="flex items-center px-4 py-2 bg-[#0f62fe] text-white hover:bg-blue-700 rounded text-sm font-bold transition-colors shadow-sm"
            >
              <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              Créer le Client
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-500 text-white px-6 py-2 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-white hover:text-emerald-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* ============================================================ */}
          {/* CLIENT HERO PROFILE HEADER (If client exists)                */}
          {/* ============================================================ */}
          {client ? (
            <div className="bg-[#161616] text-white rounded-xl shadow-lg border border-[#393939] overflow-hidden">
              <div className="p-5 md:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                
                {/* Left: Avatar & Identity Details */}
                <div className="flex items-center gap-5">
                  
                  {/* Avatar / Photo with hover edit button */}
                  <div className="relative group shrink-0">
                    {formData.photoUrl ? (
                      <img 
                        src={formData.photoUrl} 
                        alt={formData.name} 
                        className="w-18 h-18 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-[#525252] shadow-md group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#0f62fe] via-[#0353e9] to-[#002d9c] flex items-center justify-center text-white text-2xl font-bold font-mono shadow-md border-2 border-white/20">
                        {getInitials(formData.name, formData.companyName)}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-[#0f62fe] hover:bg-blue-600 text-white rounded-full shadow-lg border-2 border-[#161616] transition-transform group-hover:scale-110"
                      title="Changer la photo ou le logo du client"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Badges */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-[#262626] text-[#0f62fe] px-2.5 py-0.5 rounded font-mono font-bold text-xs border border-[#525252]">
                        {client.code}
                      </span>
                      <h1 className="text-xl md:text-2xl font-extrabold uppercase tracking-wide text-white">
                        {formData.name || 'Sans Nom'}
                      </h1>
                      
                      {/* Financial Status Badge */}
                      {overdueInvoices.length > 0 ? (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          {overdueInvoices.length} Impayé(s)
                        </span>
                      ) : creditUsagePercent >= 90 ? (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/50 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Risque Plafond ({creditUsagePercent}%)
                        </span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Compte Sain
                        </span>
                      )}

                      {totalTurnoverTTC > 100000 && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/50 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <Award className="w-3 h-3 text-purple-300" />
                          Client Fidèle
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {formData.companyName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          Raison Sociale: <b className="text-white font-medium">{formData.companyName}</b>
                        </span>
                      )}
                      {formData.ice && (
                        <span className="flex items-center gap-1 font-mono">
                          ICE: <b className="text-blue-300">{formData.ice}</b>
                        </span>
                      )}
                      {formData.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-gray-200">{formData.city}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Quick Direct Contact Actions */}
                <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-[#393939]">
                  {clientWhatsAppLink && (
                    <a
                      href={clientWhatsAppLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Envoyer un message WhatsApp au client"
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}

                  {formData.phone && (
                    <a
                      href={`tel:${formData.phone}`}
                      className="px-3 py-2 bg-[#262626] hover:bg-[#393939] text-gray-200 hover:text-white border border-[#525252] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Appeler le client"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" />
                      {formData.phone}
                    </a>
                  )}

                  {formData.email && (
                    <a
                      href={`mailto:${formData.email}`}
                      className="px-3 py-2 bg-[#262626] hover:bg-[#393939] text-gray-200 hover:text-white border border-[#525252] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Envoyer un e-mail"
                    >
                      <Mail className="w-4 h-4 text-blue-400" />
                      Email
                    </a>
                  )}
                </div>

              </div>
            </div>
          ) : (
            /* Header for New Client Creation */
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e0e0e0] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#0f62fe] flex items-center justify-center font-bold">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 uppercase">Création d'un Nouveau Compte Client</h1>
                  <p className="text-xs text-gray-500 mt-0.5">Renseignez l'identité, les coordonnées et les conditions de crédit du client.</p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* OVERDUE INVOICE ALERT BANNER (If any)                         */}
          {/* ============================================================ */}
          {client && overdueInvoices.length > 0 && (
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white px-5 py-3 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-200 animate-bounce" />
                </div>
                <div>
                  <div className="font-bold text-sm">ATTENTION : ÉCHÉANCE CRÉDIT CLIENT EN RETARD !</div>
                  <div className="text-red-100">
                    Ce client a <b>{overdueInvoices.length} facture(s) en souffrance</b> pour un montant impayé total de <b className="text-amber-200 font-mono text-sm">{totalOverdueAmount.toLocaleString()} DH TTC</b>.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('INVOICES')}
                className="px-3.5 py-1.5 bg-white text-red-700 hover:bg-red-50 rounded-lg font-bold transition-colors shadow-sm"
              >
                Voir les Factures en Souffrance
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5-CARD KPI DASHBOARD STRIP (If client exists)                */}
          {/* ============================================================ */}
          {client && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* KPI 1: Plafond & Risque Crédit Gauge */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e0e0e0] space-y-2 flex flex-col justify-between sm:col-span-2 lg:col-span-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 uppercase flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#0f62fe]" />
                    Plafond & Encours Crédit
                  </span>
                  <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                    creditUsagePercent >= 90 ? 'bg-red-100 text-red-700' :
                    creditUsagePercent >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {creditUsagePercent}% Utilisé
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1 border-t border-gray-100">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-sans">Plafond Accordé</div>
                    <div className="font-bold text-gray-900 text-sm">{creditLimit.toLocaleString()} DH</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-sans">Solde Dû (Encours)</div>
                    <div className="font-bold text-purple-700 text-sm">{currentBalance.toLocaleString()} DH</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-sans">Crédit Restant</div>
                    <div className={`font-bold text-sm ${availableCredit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {availableCredit.toLocaleString()} DH
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      creditUsagePercent >= 90 ? 'bg-red-600' :
                      creditUsagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* KPI 2: Total Chiffre d'Affaires */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e0e0e0] flex flex-col justify-between">
                <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                  <span>Chiffre d'Affaires</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-gray-900 mt-2">
                    {totalTurnoverTTC.toLocaleString()} <span className="text-xs text-gray-500 font-normal">DH</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1 font-mono">
                    <b>{clientBLs.length}</b> BL livrés • <b>{clientInvoices.length}</b> Factures
                  </div>
                </div>
              </div>

              {/* KPI 3: Volume Logistique Livré */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e0e0e0] flex flex-col justify-between">
                <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                  <span>Volume Livré</span>
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-blue-700 mt-2">
                    {totalWeightKg.toLocaleString()} <span className="text-xs text-gray-500 font-normal">Kg</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                    Total de <b>{totalPallets}</b> palettes chargées
                  </div>
                </div>
              </div>

              {/* KPI 4: Top Produit / Article Favori */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e0e0e0] flex flex-col justify-between">
                <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                  <span>Produit Vedette</span>
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                {topProduct ? (
                  <div>
                    <div className="text-xs font-bold text-gray-900 truncate mt-1" title={topProduct.name}>
                      {topProduct.name}
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-700 mt-1">
                      {topProduct.kg.toLocaleString()} Kg <span className="text-[10px] text-gray-500 font-normal">livrés</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic mt-2">Aucune livraison</div>
                )}
              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* MAIN TABS NAVIGATION (If client exists)                      */}
          {/* ============================================================ */}
          {client ? (
            <div className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] overflow-hidden">
              <div className="px-5 border-b border-[#e0e0e0] flex space-x-6 rtl:space-x-reverse text-xs font-bold font-mono">
                <button
                  onClick={() => setActiveTab('DETAILS')}
                  className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'DETAILS' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Fiche & Coordonnées</span>
                </button>

                <button
                  onClick={() => setActiveTab('BL_HISTORY')}
                  className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'BL_HISTORY' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Historique BL ({clientBLs.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('INVOICES')}
                  className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'INVOICES' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Factures & Échéances ({clientInvoices.length})</span>
                  {overdueInvoices.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('PAYMENTS')}
                  className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'PAYMENTS' ? 'border-[#0f62fe] text-[#0f62fe]' : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Règlements & Chèques ({clientPayments.length})</span>
                </button>
              </div>

              {/* TAB 1: DETAILS & FICHE */}
              {activeTab === 'DETAILS' && (
                <div className="p-6">
                  {!isEditMode ? (
                    /* Clean Read-Only Presentation Mode */
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div>
                          <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">
                            Informations Générales & Coordonnées
                          </h2>
                          <p className="text-xs text-gray-500">Données juridiques, localisation et conditions commerciales.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditMode(true)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-[#0f62fe] hover:text-white text-gray-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-gray-300"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                          Modifier ces Informations
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Box 1: Identité Juridique */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#0f62fe]" />
                            Identité Juridique & Entreprise
                          </h3>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Nom Responsable / Contact :</span>
                              <span className="font-bold text-gray-900">{formData.name}</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Raison Sociale :</span>
                              <span className="font-bold text-gray-900">{formData.companyName || '-'}</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Identifiant Commun (ICE) :</span>
                              <span className="font-mono font-bold text-blue-700">{formData.ice || 'Non renseigné'}</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Catégorie Client :</span>
                              <span className="font-semibold bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-[11px]">
                                {formData.category}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-gray-600">Code Compte ERP :</span>
                              <span className="font-mono font-bold text-gray-900">{client.code}</span>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: Coordonnées & Contact */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-emerald-600" />
                            Coordonnées & Localisation
                          </h3>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Téléphone Direct :</span>
                              <span className="font-mono font-bold text-gray-900">{formData.phone || 'Non renseigné'}</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Adresse Email :</span>
                              <span className="font-mono text-gray-900">{formData.email || 'Non renseigné'}</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Ville :</span>
                              <span className="font-bold text-gray-900">{formData.city || 'Casablanca'}</span>
                            </div>

                            <div className="flex justify-between items-start py-1.5">
                              <span className="text-gray-600">Adresse Complète :</span>
                              <span className="font-medium text-gray-900 text-right max-w-[220px]">
                                {formData.address || 'Non renseignée'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Box 3: Paramètres Financiers & Crédit */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-purple-600" />
                            Paramètres Crédit & Solvabilité
                          </h3>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Plafond de Crédit Autorisé :</span>
                              <span className="font-mono font-bold text-gray-900">{creditLimit.toLocaleString()} DH</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Solde Actuel Dû :</span>
                              <span className="font-mono font-bold text-purple-700">{currentBalance.toLocaleString()} DH</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Crédit Restant Disponible :</span>
                              <span className={`font-mono font-bold ${availableCredit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {availableCredit.toLocaleString()} DH
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-gray-600">Délai de Paiement Accordé :</span>
                              <span className="font-bold text-gray-900">{formData.paymentTermsDays} Jours</span>
                            </div>
                          </div>
                        </div>

                        {/* Box 4: Synthèse Logistique & Activité */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-amber-600" />
                            Synthèse Logistique & Historique
                          </h3>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Commandes Enregistrées :</span>
                              <span className="font-mono font-bold text-gray-900">{clientOrders.length}</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Bons de Livraison Délivrés :</span>
                              <span className="font-mono font-bold text-blue-700">{clientBLs.length} BL</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600">Factures Total Émises :</span>
                              <span className="font-mono font-bold text-gray-900">{clientInvoices.length}</span>
                            </div>

                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-gray-600">Règlements & Chèques Reçus :</span>
                              <span className="font-mono font-bold text-emerald-700">{clientPayments.length}</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Observations / Notes Section */}
                      {formData.notes && (
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs">
                          <div className="font-bold text-blue-950 uppercase mb-1">Notes & Observations Internes :</div>
                          <div className="text-gray-700 whitespace-pre-wrap">{formData.notes}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Edit Form Mode */
                    <form onSubmit={handleSubmit} className="space-y-8">
                      {/* Identity Section */}
                      <div>
                        <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2 mb-4">
                          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#0f62fe]" />
                            {t('directory.identity', "Informations d'Identité & Entreprise")}
                          </h2>
                          <button
                            type="button"
                            onClick={() => setShowPhotoModal(true)}
                            className="text-xs text-[#0f62fe] hover:underline font-bold flex items-center gap-1"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            {formData.photoUrl ? 'Changer le Logo / Photo' : '+ Ajouter Logo / Photo'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              {t('directory.name', 'Nom Responsable / Contact')} *
                            </label>
                            <input
                              type="text"
                              name="name"
                              required
                              placeholder="ex: Rachid Laroussi"
                              value={formData.name}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              {t('directory.companyName', 'Raison Sociale / Entreprise')}
                            </label>
                            <input
                              type="text"
                              name="companyName"
                              placeholder="ex: Laroussi Distribution SARL"
                              value={formData.companyName}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              {t('directory.ice', 'Identifiant Commun (ICE)')}
                            </label>
                            <input
                              type="text"
                              name="ice"
                              placeholder="ex: 002348912000034"
                              value={formData.ice}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              Catégorie Client
                            </label>
                            <select
                              name="category"
                              value={formData.category}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm bg-white font-semibold"
                            >
                              <option value="GROSSISTE">Grossiste / Négociant</option>
                              <option value="DEMI_GROSSISTE">Demi-Grossiste</option>
                              <option value="DISTRIBUTEUR">Distributeur Régional</option>
                              <option value="GMS">GMS / Grande Distribution</option>
                              <option value="RESTAURATION">Restauration & Hôtellerie (CHR)</option>
                              <option value="DETAILLANT">Détaillant / Épicerie</option>
                              <option value="PARTICULIER">Particulier</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Contact Section */}
                      <div>
                        <h2 className="text-sm font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-600" />
                          {t('directory.contact', 'Coordonnées de Contact')}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              {t('directory.phone', 'Téléphone Direct / Mobile')} *
                            </label>
                            <input
                              type="text"
                              name="phone"
                              required
                              placeholder="ex: 0661234567"
                              value={formData.phone}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              {t('directory.email', 'Adresse Email')}
                            </label>
                            <input
                              type="email"
                              name="email"
                              placeholder="ex: contact@laroussi.ma"
                              value={formData.email}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              {t('directory.address', 'Adresse Complète')}
                            </label>
                            <input
                              type="text"
                              name="address"
                              placeholder="ex: Zone Industrielle Ain Sebaa, N°45"
                              value={formData.address}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              {t('directory.city', 'Ville')}
                            </label>
                            <input
                              type="text"
                              name="city"
                              placeholder="ex: Casablanca"
                              value={formData.city}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              Délai de Paiement (Jours)
                            </label>
                            <input
                              type="number"
                              name="paymentTermsDays"
                              min="0"
                              value={formData.paymentTermsDays}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Financial Info */}
                      <div>
                        <h2 className="text-sm font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-purple-600" />
                          {t('directory.financial', 'Conditions Financières & Plafond')}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
                            <label className="block text-xs font-bold uppercase text-amber-900 mb-1">
                              {t('directory.creditLimit', 'Plafond de Crédit Autorisé (DH)')} *
                            </label>
                            <input
                              type="number"
                              name="creditLimit"
                              min="0"
                              step="5000"
                              value={formData.creditLimit}
                              onChange={handleChange}
                              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-amber-600 text-base font-bold font-mono text-amber-950"
                            />
                            <div className="text-[10px] text-amber-700 mt-1.5">
                              Une alerte visuelle se déclenche dès que l'encours approche 90% de cette limite.
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              Solde Actuel Dû (DH)
                            </label>
                            <div className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-purple-700 font-bold font-mono text-base">
                              {currentBalance.toLocaleString()} DH
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1.5">
                              Calculé automatiquement selon les BLs livrés et les règlements reçus.
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                              Notes / Instructions Particulières
                            </label>
                            <textarea
                              name="notes"
                              rows={3}
                              placeholder="Observations internes sur le client, habitudes de commande, etc."
                              value={formData.notes}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e0e0e0]">
                        <button
                          type="button"
                          onClick={() => setIsEditMode(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Enregistrer les Modifications
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: BL HISTORY */}
              {activeTab === 'BL_HISTORY' && (
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e0e0e0]">
                    <div>
                      <h2 className="text-base font-bold flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[#0f62fe]" />
                        <span>Historique des Livraisons Frigo & BLs</span>
                      </h2>
                      <p className="text-xs text-gray-500 font-mono">
                        {clientBLs.length} Bon(s) de Livraison au total • {totalWeightKg.toLocaleString()} Kg livrés
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-full sm:w-56">
                        <input
                          type="text"
                          placeholder="Filtrer par N° BL, Date, Frigo..."
                          value={blSearchTerm}
                          onChange={(e) => setBlSearchTerm(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onNewBL && client) onNewBL(client.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer un BL</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onMassBL && client) onMassBL(client.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        title="Saisir plusieurs bons de livraison pour ce client en une seule fois"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Saisie BLs en Masse</span>
                      </button>
                    </div>
                  </div>

                  {filteredBLs.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <Truck className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Aucun Bon de Livraison correspondant pour ce client.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full carbon-table text-xs">
                        <thead>
                          <tr>
                            <th>N° BL</th>
                            <th>Date</th>
                            <th>Frigo d'Origine</th>
                            <th>Articles</th>
                            <th>Poids (Kg)</th>
                            <th>Palettes</th>
                            <th>Total TTC</th>
                            <th>Statut Quai Frigo</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBLs.map(bl => (
                            <tr key={bl.id} className="hover:bg-blue-50/40 transition-colors">
                              <td className="font-mono font-bold text-[#0f62fe]">{bl.blNumber}</td>
                              <td className="font-mono">{bl.date}</td>
                              <td className="font-semibold text-gray-800">
                                {frigos.find(f => f.id === bl.frigoId)?.name || bl.frigoName}
                              </td>
                              <td className="text-gray-600">{bl.items?.length || 0} art.</td>
                              <td className="font-mono font-bold">{bl.totalKg?.toLocaleString()} kg</td>
                              <td className="font-mono text-gray-600">{bl.totalPallets || 0} pal</td>
                              <td className="font-mono font-bold text-gray-900">{bl.totalTTC?.toLocaleString()} DH</td>
                              <td>
                                {bl.frigoEmployeeApproved ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Validé Quai
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    En Attente
                                  </span>
                                )}
                              </td>
                              <td className="text-right space-x-1.5 rtl:space-x-reverse">
                                {onViewBLPdf && (
                                  <button
                                    type="button"
                                    onClick={() => onViewBLPdf(bl.id)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-[#0f62fe] hover:text-white text-gray-800 font-bold rounded text-[11px] transition-colors border border-gray-300"
                                    title="Afficher le document PDF du BL"
                                  >
                                    PDF BL
                                  </button>
                                )}
                                <a
                                  href={generateWhatsAppBLLink(bl, formData.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white font-bold rounded text-[11px] transition-colors inline-block"
                                  title="Partager par WhatsApp"
                                >
                                  WhatsApp
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INVOICES */}
              {activeTab === 'INVOICES' && (
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e0e0e0]">
                    <div>
                      <h2 className="text-base font-bold flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#0f62fe]" />
                        <span>Factures & Suivi des Échéances</span>
                      </h2>
                      <p className="text-xs text-gray-500 font-mono">
                        {clientInvoices.length} Facture(s) • Total TTC: {totalTurnoverTTC.toLocaleString()} DH
                      </p>
                    </div>

                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Filtrer par N° Facture..."
                        value={invoiceSearchTerm}
                        onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  {filteredInvoices.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Aucune facture enregistrée pour ce client.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full carbon-table text-xs">
                        <thead>
                          <tr>
                            <th>N° Facture</th>
                            <th>Date</th>
                            <th>Échéance</th>
                            <th>Montant TTC</th>
                            <th>Déjà Payé</th>
                            <th>Reste à Payer</th>
                            <th>Statut</th>
                            <th className="text-right">Actions & PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInvoices.map(inv => {
                            const isOverdue = inv.status === 'EN_RETARD' || (inv.status !== 'PAYEE' && inv.dueDate && inv.dueDate < todayStr);
                            const paidVal = inv.paidAmount || inv.amountPaid || 0;
                            const remaining = inv.totalTTC - paidVal;

                            return (
                              <tr key={inv.id} className={isOverdue ? 'bg-red-50/60' : 'hover:bg-gray-50'}>
                                <td className="font-mono font-bold text-[#0f62fe]">{inv.invoiceNumber}</td>
                                <td className="font-mono">{inv.date}</td>
                                <td className="font-mono font-bold text-gray-900">{inv.dueDate}</td>
                                <td className="font-mono font-bold text-gray-900">{inv.totalTTC?.toLocaleString()} DH</td>
                                <td className="font-mono text-emerald-700 font-bold">{paidVal.toLocaleString()} DH</td>
                                <td className="font-mono font-bold text-purple-700">{remaining.toLocaleString()} DH</td>
                                <td>
                                  {inv.status === 'PAYEE' ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                                      PAYÉE
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="bg-red-100 text-red-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                                      <AlertTriangle className="w-3 h-3 text-red-600" />
                                      EN RETARD
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                                      EN ATTENTE
                                    </span>
                                  )}
                                </td>
                                <td className="text-right space-x-1.5 rtl:space-x-reverse">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="px-2.5 py-1 bg-[#0f62fe] hover:bg-blue-700 text-white text-[11px] font-bold rounded transition-colors shadow-sm"
                                    title="Afficher et imprimer la facture PDF"
                                  >
                                    PDF Facture
                                  </button>
                                  <a
                                    href={generateWhatsAppInvoiceLink(inv.invoiceNumber, inv.clientName, inv.totalTTC, formData.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-[#25D366] hover:bg-[#1ebd5b] text-white text-[11px] font-bold rounded transition-colors inline-block"
                                    title="Envoyer la facture par WhatsApp"
                                  >
                                    WhatsApp
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PAYMENTS & CHEQUES */}
              {activeTab === 'PAYMENTS' && (
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e0e0e0]">
                    <div>
                      <h2 className="text-base font-bold flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                        <span>Règlements, Chèques & Traites</span>
                      </h2>
                      <p className="text-xs text-gray-500 font-mono">
                        {clientPayments.length} Règlement(s) enregistré(s)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Saisir un Règlement
                    </button>
                  </div>

                  {clientPayments.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Aucun règlement enregistré pour ce client.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full carbon-table text-xs">
                        <thead>
                          <tr>
                            <th>N° Référence</th>
                            <th>Mode / Type</th>
                            <th>Banque</th>
                            <th>Date Émission</th>
                            <th>Date Échéance</th>
                            <th>Montant (DH)</th>
                            <th>Statut Traitement</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientPayments.map(pay => (
                            <tr key={pay.id} className="hover:bg-gray-50">
                              <td className="font-mono font-bold text-gray-900">{pay.referenceNumber}</td>
                              <td>
                                <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                                  {pay.type}
                                </span>
                              </td>
                              <td className="font-medium text-gray-800">{pay.bankName || '-'}</td>
                              <td className="font-mono">{pay.issueDate}</td>
                              <td className="font-mono font-bold text-gray-900">{pay.dueDate}</td>
                              <td className="font-mono font-bold text-emerald-600">{pay.amount.toLocaleString()} DH</td>
                              <td>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  pay.status === 'ENCAISSE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                  pay.status === 'IMPAYE' ? 'bg-red-100 text-red-800 border-red-300' :
                                  pay.status === 'DEPOSE' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                  {pay.status}
                                </span>
                              </td>
                              <td className="text-right space-x-1.5 rtl:space-x-reverse">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPayment(pay)}
                                  className="p-1.5 hover:bg-blue-50 text-[#0f62fe] rounded-md transition-colors"
                                  title="Modifier ce règlement"
                                >
                                  <PenLine className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(pay.id)}
                                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                                  title="Supprimer ce règlement"
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
          ) : (
            /* Creation Form for New Client */
            <div className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Identity Info */}
                <div>
                  <h2 className="text-sm font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0f62fe]" />
                    Informations d'Identité & Entreprise
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Nom Responsable / Contact *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="ex: Rachid Laroussi"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Raison Sociale / Entreprise
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        placeholder="ex: Laroussi Négoce SARL"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        N° ICE
                      </label>
                      <input
                        type="text"
                        name="ice"
                        placeholder="ex: 001893456000021"
                        value={formData.ice}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Catégorie Client
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm bg-white font-semibold"
                      >
                        <option value="GROSSISTE">Grossiste / Négociant</option>
                        <option value="DEMI_GROSSISTE">Demi-Grossiste</option>
                        <option value="DISTRIBUTEUR">Distributeur Régional</option>
                        <option value="GMS">GMS / Grande Distribution</option>
                        <option value="RESTAURATION">Restauration & Hôtellerie (CHR)</option>
                        <option value="DETAILLANT">Détaillant / Épicerie</option>
                        <option value="PARTICULIER">Particulier</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h2 className="text-sm font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    Coordonnées de Contact
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Téléphone *
                      </label>
                      <input
                        type="text"
                        name="phone"
                        required
                        placeholder="ex: 0661000000"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Adresse Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        placeholder="ex: contact@client.ma"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Adresse Complète
                      </label>
                      <input
                        type="text"
                        name="address"
                        placeholder="ex: Casablanca, Maroc"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#0f62fe] text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Settings */}
                <div>
                  <h2 className="text-sm font-bold border-b border-[#e0e0e0] pb-2 mb-4 text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    Plafond de Crédit
                  </h2>
                  <div className="max-w-md bg-amber-50/70 p-4 rounded-xl border border-amber-200">
                    <label className="block text-xs font-bold uppercase text-amber-900 mb-1">
                      Plafond de Crédit Autorisé (DH) *
                    </label>
                    <input
                      type="number"
                      name="creditLimit"
                      min="0"
                      step="5000"
                      value={formData.creditLimit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-base font-bold font-mono text-amber-950"
                    />
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Créer le Client
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: Saisie / Modification de Règlement                  */}
      {/* ============================================================ */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-[#e0e0e0] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0] mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {editingPaymentId ? 'Modifier Règlement Client' : 'Saisir un Règlement Client'}
                </h3>
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
                  <option value="CHEQUE">Chèque Bancaire</option>
                  <option value="EFFET">Effet de Commerce / LCN</option>
                  <option value="ESPECES">Espèces (Versement direct)</option>
                  <option value="VIREMENT">Virement Bancaire</option>
                  <option value="VERSEMENT">Versement Espèces Bancaire</option>
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
                    Banque Émettrice
                  </label>
                  <input
                    type="text"
                    value={paymentForm.bankName}
                    onChange={(e) => setPaymentForm(p => ({ ...p, bankName: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:border-emerald-600"
                    placeholder="ex: Attijari, BCP, BMCE..."
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
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

      {/* ============================================================ */}
      {/* MODAL 2: Photo de Profil / Logo Upload                       */}
      {/* ============================================================ */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#e0e0e0] animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#0f62fe]" />
                Photo de Profil / Logo Client
              </h3>
              <button onClick={() => setShowPhotoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 py-3">
              {formData.photoUrl ? (
                <img 
                  src={formData.photoUrl} 
                  alt="Aperçu Logo" 
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-[#0f62fe] shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-[10px]">Aucune image</span>
                </div>
              )}

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />

              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-[#0f62fe] hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Choisir une Image depuis votre Appareil
                </button>

                {formData.photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="w-full py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la Photo (Utiliser initiales)
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: Visualisation de Facture PDF                         */}
      {/* ============================================================ */}
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
