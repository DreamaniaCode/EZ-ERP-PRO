import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, InventoryCountItem, ColdStorageFrigo } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { StockTransferModal } from './StockTransferModal';
import { StockRepackagingModal } from './StockRepackagingModal';

import { 
  ClipboardCheck, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  RefreshCw,
  Edit3,
  Search,
  Plus,
  ArrowLeftRight,
  ShieldAlert,
  SlidersHorizontal,
  PackageCheck,
  PackageX,
  LayoutGrid,
  Table,
  Sliders,
  Trash2,
  Zap,
  RotateCcw,
  Scissors
} from 'lucide-react';

export const MultiFrigoInventory: React.FC = () => {
  const { 
    frigos, 
    products, 
    stocks, 
    saveInventoryCount, 
    adjustStock,
    clearStocks,
    addFrigo, 
    updateFrigo, 
    deleteFrigo, 
    updateProduct, 
    currentUser 
  } = useERP();
  
  const [selectedFrigoId, setSelectedFrigoId] = useState<string>(
    currentUser.assignedFrigoId || frigos[0]?.id || ''
  );
  const [showAddFrigoModal, setShowAddFrigoModal] = useState(false);
  const [showManageFrigosModal, setShowManageFrigosModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferInitialProduct, setTransferInitialProduct] = useState<string>('');
  const [transferInitialSource, setTransferInitialSource] = useState<string>('');
  const [showRepackagingModal, setShowRepackagingModal] = useState(false);
  const [repackagingInitialProduct, setRepackagingInitialProduct] = useState<string>('');
  const [editingFrigo, setEditingFrigo] = useState<ColdStorageFrigo | null>(null);

  // View mode switcher: 'SHEET' (Physical count sheet) vs 'MATRIX' (Multi-frigo consolidated comparative grid)
  const [viewMode, setViewMode] = useState<'SHEET' | 'MATRIX'>('SHEET');

  // Quick Adjustment Modal state
  const [quickAdjustItem, setQuickAdjustItem] = useState<{ frigoId: string; productId: string; currentKg: number; currentPallets: number } | null>(null);
  const [quickAdjustKg, setQuickAdjustKg] = useState<number>(0);
  const [quickAdjustPallets, setQuickAdjustPallets] = useState<number>(0);

  const [frigoForm, setFrigoForm] = useState({
    name: '',
    location: '',
    managerName: '',
    managerPhone: '',
    whatsappGroup: '',
    whatsappGroupLink: '',
    capacityPallets: 400,
  });

  // Filter and Scope states for Low Stock Alert System
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);
  const [stockScope, setStockScope] = useState<'CURRENT_FRIGO' | 'GLOBAL_MULTI_FRIGO'>('CURRENT_FRIGO');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Threshold Editing state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newThresholdKg, setNewThresholdKg] = useState<number>(1000);

  // Draft physical count state: { [productId]: { physicalKg, physicalPallets, notes } }
  const [physicalCounts, setPhysicalCounts] = useState<{
    [productId: string]: { physicalKg: number; physicalPallets: number; notes: string };
  }>(() => {
    const initial: any = {};
    products.forEach(p => {
      const st = stocks.find(s => s.frigoId === selectedFrigoId && s.productId === p.id);
      initial[p.id] = {
        physicalKg: st ? st.quantityKg : 0,
        physicalPallets: st ? st.quantityPallets : 0,
        notes: '',
      };
    });
    return initial;
  });

  const activeFrigo = frigos.find(f => f.id === selectedFrigoId) || frigos[0];

  // Reload physical counts when selected frigo changes
  const handleFrigoChange = (frigoId: string) => {
    setSelectedFrigoId(frigoId);
    const updated: any = {};
    products.forEach(p => {
      const st = stocks.find(s => s.frigoId === frigoId && s.productId === p.id);
      updated[p.id] = {
        physicalKg: st ? st.quantityKg : 0,
        physicalPallets: st ? st.quantityPallets : 0,
        notes: '',
      };
    });
    setPhysicalCounts(updated);
  };

  const handleItemChange = (productId: string, field: 'physicalKg' | 'physicalPallets' | 'notes', val: any) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: val,
      },
    }));
  };

  const handleSaveInventory = (applyAdjust: boolean) => {
    const items: InventoryCountItem[] = products.map(p => {
      const st = stocks.find(s => s.frigoId === selectedFrigoId && s.productId === p.id);
      const theoreticalKg = st ? st.quantityKg : 0;
      const theoreticalPallets = st ? st.quantityPallets : 0;
      const physicalKg = Number(physicalCounts[p.id]?.physicalKg || 0);
      const physicalPallets = Number(physicalCounts[p.id]?.physicalPallets || 0);
      const diffKg = physicalKg - theoreticalKg;

      return {
        productId: p.id,
        theoreticalKg,
        physicalKg,
        theoreticalPallets,
        physicalPallets,
        differenceKg: diffKg,
        notes: physicalCounts[p.id]?.notes || '',
      };
    });

    saveInventoryCount({
      frigoId: selectedFrigoId,
      date: new Date().toISOString().slice(0, 10),
      conductedBy: currentUser.name,
      status: applyAdjust ? 'AJUSTÉ' : 'VALIDÉ',
      items,
    }, applyAdjust);

    alert(`Inventaire physique ${applyAdjust ? 'enregistré & stock PostgreSQL ajusté' : 'enregistré sans modification de stock'} avec succès !`);
  };

  const handleClearFrigoStock = async () => {
    if (!activeFrigo) return;
    if (window.confirm(`⚠️ Êtes-vous sûr de vouloir VIDER (remettre à 0 Kg) tous les stocks de l'entrepôt "${activeFrigo.name}" ?`)) {
      await clearStocks(activeFrigo.id);
      const updated: any = {};
      products.forEach(p => {
        updated[p.id] = { physicalKg: 0, physicalPallets: 0, notes: 'Stock vidé' };
      });
      setPhysicalCounts(updated);
      alert(`Le stock de l'entrepôt "${activeFrigo.name}" a été vidé avec succès (0 Kg, 0 Palettes).`);
    }
  };

  const handleClearAllStocks = async () => {
    if (window.confirm("⚠️ ATTENTION : Êtes-vous certain de vouloir REMETTRE À ZÉRO tous les stocks de TOUS les entrepôts ?")) {
      if (window.confirm("Confirmation finale : Cette action mettra le stock à 0 pour toute l'entreprise. Continuer ?")) {
        await clearStocks();
        const updated: any = {};
        products.forEach(p => {
          updated[p.id] = { physicalKg: 0, physicalPallets: 0, notes: 'Stock vidé' };
        });
        setPhysicalCounts(updated);
        alert("Tous les stocks ont été remis à zéro avec succès.");
      }
    }
  };

  const handleClearSingleProductStock = async (frigoId: string, productId: string, productName: string) => {
    if (window.confirm(`Vider le stock du produit "${productName}" (remettre à 0 Kg) dans ce frigo ?`)) {
      await clearStocks(frigoId, productId);
      if (frigoId === selectedFrigoId) {
        setPhysicalCounts(prev => ({
          ...prev,
          [productId]: { physicalKg: 0, physicalPallets: 0, notes: 'Stock vidé' }
        }));
      }
      alert(`Stock de "${productName}" remis à 0.`);
    }
  };

  const handleOpenAddFrigo = () => {
    setEditingFrigo(null);
    setFrigoForm({
      name: '',
      location: '',
      managerName: '',
      managerPhone: '',
      whatsappGroup: '',
      whatsappGroupLink: '',
      capacityPallets: 400,
    });
    setShowAddFrigoModal(true);
  };

  const handleOpenEditFrigo = (frigo: ColdStorageFrigo) => {
    setEditingFrigo(frigo);
    setFrigoForm({
      name: frigo.name,
      location: frigo.location,
      managerName: frigo.managerName,
      managerPhone: frigo.managerPhone,
      whatsappGroup: frigo.whatsappGroup || '',
      whatsappGroupLink: frigo.whatsappGroupLink || '',
      capacityPallets: frigo.capacityPallets,
    });
    setShowAddFrigoModal(true);
  };

  const handleDeleteFrigo = (id: string, name: string) => {
    if (frigos.length <= 1) {
      alert("Impossible de supprimer le seul frigo restant.");
      return;
    }
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le Frigo "${name}" ?`)) {
      deleteFrigo(id);
      if (selectedFrigoId === id) {
        const remaining = frigos.filter(f => f.id !== id);
        if (remaining.length > 0) setSelectedFrigoId(remaining[0].id);
      }
      alert(`Frigo "${name}" supprimé avec succès.`);
    }
  };

  const handleFrigoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frigoForm.name) return;

    if (editingFrigo) {
      updateFrigo(editingFrigo.id, frigoForm);
      alert(`Frigo "${frigoForm.name}" mis à jour avec succès dans PostgreSQL !`);
    } else {
      const created = addFrigo(frigoForm);
      setSelectedFrigoId(created.id);
      alert(`Nouveau Frigo/Entrepôt (${created.name}) créé avec succès dans PostgreSQL !`);
    }

    setShowAddFrigoModal(false);
    setEditingFrigo(null);
    setFrigoForm({
      name: '',
      location: '',
      managerName: '',
      managerPhone: '',
      whatsappGroup: '',
      whatsappGroupLink: '',
      capacityPallets: 400,
    });
  };

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct.id, { minStockAlertKg: Number(newThresholdKg) });
    setEditingProduct(null);
    alert(`Seuil d'alerte mis à jour à ${newThresholdKg.toLocaleString()} Kg pour "${editingProduct.name}".`);
  };

  const handleQuickAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdjustItem) return;
    adjustStock(quickAdjustItem.frigoId, quickAdjustItem.productId, Number(quickAdjustKg), Number(quickAdjustPallets));
    setQuickAdjustItem(null);
    alert(`Stock mis à jour avec succès : ${Number(quickAdjustKg).toLocaleString()} Kg.`);
  };

  const openTransferForProduct = (sourceFrigoId: string, productId: string) => {
    setTransferInitialSource(sourceFrigoId);
    setTransferInitialProduct(productId);
    setShowTransferModal(true);
  };

  // Stock calculation helpers for Low Stock Threshold Alert System
  const getProductStockInfo = (p: Product) => {
    const st = stocks.find(s => s.frigoId === selectedFrigoId && s.productId === p.id);
    const frigoKg = st ? st.quantityKg : 0;
    const frigoPallets = st ? st.quantityPallets : 0;

    const globalKg = stocks
      .filter(s => s.productId === p.id)
      .reduce((sum, s) => sum + s.quantityKg, 0);
    const globalPallets = stocks
      .filter(s => s.productId === p.id)
      .reduce((sum, s) => sum + s.quantityPallets, 0);

    const minThreshold = p.minStockAlertKg || 1000;
    const currentQty = stockScope === 'CURRENT_FRIGO' ? frigoKg : globalKg;
    const isLowStock = currentQty < minThreshold;
    const isRupture = currentQty === 0;
    const deficitKg = Math.max(0, minThreshold - currentQty);

    return {
      frigoKg,
      frigoPallets,
      globalKg,
      globalPallets,
      minThreshold,
      currentQty,
      isLowStock,
      isRupture,
      deficitKg,
    };
  };

  // Summary counts across all products
  const lowStockProductsCurrentFrigo = products.filter(p => {
    const info = getProductStockInfo(p);
    return info.frigoKg < info.minThreshold;
  });

  const lowStockProductsGlobal = products.filter(p => {
    const info = getProductStockInfo(p);
    return info.globalKg < info.minThreshold;
  });

  const ruptureProducts = products.filter(p => {
    const info = getProductStockInfo(p);
    return info.currentQty === 0;
  });

  const activeLowStockList = stockScope === 'CURRENT_FRIGO' ? lowStockProductsCurrentFrigo : lowStockProductsGlobal;

  // Filter products based on search term and low stock toggle
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const info = getProductStockInfo(p);
    const matchesLowStock = !filterLowStockOnly || info.isLowStock;
    return matchesSearch && matchesLowStock;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#0f62fe]" />
            Inventaires Multi-Sites & Gestion Inter-Frigos
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Détection Automatique des Seuils de Réapprovisionnement, Saisie Physique, Matrice Consolidée & Transferts
          </p>
        </div>

        {/* Frigo Selector & Fast Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#262626] px-2.5 py-1.5 border border-[#525252] rounded">
            <Building2 className="w-4 h-4 text-[#0f62fe]" />
            <select
              value={selectedFrigoId}
              onChange={e => handleFrigoChange(e.target.value)}
              className="bg-transparent font-bold text-white text-xs border-none focus:outline-none"
            >
              {frigos.map(f => (
                <option key={f.id} value={f.id} className="bg-[#161616] text-white">
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setTransferInitialSource(selectedFrigoId);
              setTransferInitialProduct('');
              setShowTransferModal(true);
            }}
            className="px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white font-mono text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
            title="Transférer du stock d'un frigo de départ vers un frigo de destination"
          >
            <ArrowLeftRight className="w-4 h-4 text-cyan-300" />
            <span>Transfert Inter-Frigos</span>
          </button>

          <button
            onClick={() => {
              setRepackagingInitialProduct('');
              setShowRepackagingModal(true);
            }}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
            title="Reconditionner / Diviser un produit vrac/gros (ex: 12KG) en paquets détail (ex: 3KG, 2KG)"
          >
            <Scissors className="w-4 h-4 text-yellow-300" />
            <span>Reconditionnement / Division</span>
          </button>

          <button
            onClick={handleClearFrigoStock}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-black rounded flex items-center gap-1.5 transition-all shadow-md border border-red-400"
            title="Vider (remettre à 0 Kg) tous les stocks de l'entrepôt actif"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span>Vider Stock Frigo</span>
          </button>

          <button
            onClick={() => setShowManageFrigosModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
            title="Gérer la liste complète des Frigos & Entrepôts (CRUD)"
          >
            <Building2 className="w-4 h-4" />
            <span>Gérer Frigos ({frigos.length})</span>
          </button>

          <button
            onClick={handleOpenAddFrigo}
            className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Frigo</span>
          </button>
        </div>
      </div>

      {/* ⚡ Dedicated Quick Actions & Clear Stock Command Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Quick Action 1: Transfert Inter-Frigos */}
        <div 
          onClick={() => {
            setTransferInitialSource(selectedFrigoId);
            setTransferInitialProduct('');
            setShowTransferModal(true);
          }}
          className="p-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-700 rounded-lg text-white cursor-pointer hover:shadow-lg transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow">
            <ArrowLeftRight className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase tracking-wide text-cyan-300">1. Transfert de Stock</div>
            <div className="text-[11px] text-blue-100 mt-0.5">Déplacer marchandise entre Frigos</div>
          </div>
        </div>

        {/* Quick Action 2: Vider le Frigo Actuel */}
        <div 
          onClick={handleClearFrigoStock}
          className="p-3.5 bg-gradient-to-r from-red-950 to-rose-900 border border-red-700 rounded-lg text-white cursor-pointer hover:shadow-lg transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shrink-0 shadow">
            <Trash2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase tracking-wide text-rose-200">2. Vider ce Frigo ({activeFrigo?.code})</div>
            <div className="text-[11px] text-rose-100 mt-0.5">Mettre tout le stock à 0 Kg</div>
          </div>
        </div>

        {/* Quick Action 3: Vider Tous les Frigos */}
        <div 
          onClick={handleClearAllStocks}
          className="p-3.5 bg-gradient-to-r from-amber-950 to-orange-950 border border-orange-700 rounded-lg text-white cursor-pointer hover:shadow-lg transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center shrink-0 shadow">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase tracking-wide text-amber-200">3. Remise à Zéro Globale</div>
            <div className="text-[11px] text-amber-100 mt-0.5">Vider tous les entrepôts (0 Kg)</div>
          </div>
        </div>

        {/* Quick Action 4: Gérer les Frigos */}
        <div 
          onClick={() => setShowManageFrigosModal(true)}
          className="p-3.5 bg-gradient-to-r from-slate-900 to-gray-900 border border-gray-700 rounded-lg text-white cursor-pointer hover:shadow-lg transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 shadow">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase tracking-wide text-gray-200">4. Entrepôts & Quai</div>
            <div className="text-[11px] text-gray-300 mt-0.5">{frigos.length} Frigo(s) configurés</div>
          </div>
        </div>

      </div>

      {/* Active Frigo Summary Banner */}
      {activeFrigo && (
        <div className="bg-blue-950/40 border border-blue-800 p-4 rounded text-blue-100 flex flex-wrap justify-between items-center gap-4 text-xs font-mono">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0f62fe]" />
              <span className="text-amber-300 font-extrabold">{activeFrigo.name}</span>
              <span className="text-xs text-blue-300">({activeFrigo.code})</span>
              <button
                onClick={() => handleOpenEditFrigo(activeFrigo)}
                className="ml-2 px-2 py-0.5 bg-blue-800/60 hover:bg-blue-700 text-white rounded text-[10px] font-sans flex items-center gap-1"
                title="Modifier ce frigo"
              >
                <Edit3 className="w-3 h-3" />
                <span>Éditer</span>
              </button>
              <button
                onClick={handleClearFrigoStock}
                className="ml-2 px-2.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-sans font-bold flex items-center gap-1 shadow"
                title="Vider le stock de ce frigo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Vider Stock (0 Kg)</span>
              </button>
            </div>
            <div className="text-blue-300 mt-1">
              Responsable: <span className="text-white font-semibold">{activeFrigo.managerName}</span> • Tél: {activeFrigo.managerPhone} • Emplacement: <span className="text-white">{activeFrigo.location}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-blue-300">Capacité Frigo:</span>
              <div className="font-bold text-white text-sm">{activeFrigo.capacityPallets?.toLocaleString()} Palettes</div>
            </div>
            <div>
              <span className="text-blue-300">Groupe WhatsApp:</span>
              <div className="font-bold text-emerald-400 text-xs truncate max-w-[200px]">{activeFrigo.whatsappGroup || 'Non défini'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Threshold Alert Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Card 1: Low Stock Alert in Current Frigo */}
        <div 
          onClick={() => { setStockScope('CURRENT_FRIGO'); setFilterLowStockOnly(true); }}
          className={`p-3.5 border rounded cursor-pointer transition-all ${
            stockScope === 'CURRENT_FRIGO' && filterLowStockOnly 
              ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-400' 
              : 'bg-white border-gray-200 hover:border-amber-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Stock Bas - Frigo Actuel
              </div>
              <div className="text-2xl font-black font-mono text-amber-900 mt-1">
                {lowStockProductsCurrentFrigo.length} <span className="text-xs font-sans font-normal text-amber-700">Produits</span>
              </div>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold px-2 py-0.5 rounded">
              {activeFrigo?.code}
            </span>
          </div>
          <div className="text-[10px] text-amber-700 mt-1.5">
            Quantité sur quai sous le seuil d'alerte configuré.
          </div>
        </div>

        {/* Card 2: Low Stock Alert Global Multi-Frigos */}
        <div 
          onClick={() => { setStockScope('GLOBAL_MULTI_FRIGO'); setFilterLowStockOnly(true); }}
          className={`p-3.5 border rounded cursor-pointer transition-all ${
            stockScope === 'GLOBAL_MULTI_FRIGO' && filterLowStockOnly 
              ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-400' 
              : 'bg-white border-gray-200 hover:border-amber-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                Stock Bas - Global Multi-Frigos
              </div>
              <div className="text-2xl font-black font-mono text-amber-900 mt-1">
                {lowStockProductsGlobal.length} <span className="text-xs font-sans font-normal text-amber-700">Produits</span>
              </div>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-300 font-mono font-bold px-2 py-0.5 rounded">
              TOUS SITES
            </span>
          </div>
          <div className="text-[10px] text-amber-700 mt-1.5">
            Somme totale du stock entreprise inférieure au seuil global.
          </div>
        </div>

        {/* Card 3: Complete Stock Rupture */}
        <div 
          onClick={() => { setFilterLowStockOnly(true); }}
          className={`p-3.5 border rounded cursor-pointer transition-all ${
            ruptureProducts.length > 0 ? 'bg-red-50 border-red-400' : 'bg-emerald-50 border-emerald-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                ruptureProducts.length > 0 ? 'text-red-800' : 'text-emerald-800'
              }`}>
                {ruptureProducts.length > 0 ? (
                  <PackageX className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
                ) : (
                  <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                Rupture Totale (0 Kg)
              </div>
              <div className={`text-2xl font-black font-mono mt-1 ${
                ruptureProducts.length > 0 ? 'text-red-900' : 'text-emerald-900'
              }`}>
                {ruptureProducts.length} <span className="text-xs font-sans font-normal text-gray-600">Articles</span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              ruptureProducts.length > 0 ? 'bg-red-100 text-red-900 border-red-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}>
              {ruptureProducts.length > 0 ? 'URGENT' : 'STABLE'}
            </span>
          </div>
          <div className={`text-[10px] mt-1.5 ${
            ruptureProducts.length > 0 ? 'text-red-700' : 'text-emerald-700'
          }`}>
            {ruptureProducts.length > 0 ? 'Article à zéro sur l’emplacement courant.' : 'Aucun article en rupture totale.'}
          </div>
        </div>

      </div>

      {/* Main Inventory & Control Sheet */}
      <div className="carbon-card p-4 sm:p-5 space-y-4">
        
        {/* Top Control Bar with View Switcher & Clear Stock Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-300">
              <button
                onClick={() => setViewMode('SHEET')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'SHEET'
                    ? 'bg-white text-[#0f62fe] shadow-sm font-black'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Feuille de Saisie Physique ({activeFrigo?.code})</span>
              </button>
              <button
                onClick={() => setViewMode('MATRIX')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'MATRIX'
                    ? 'bg-[#0f62fe] text-white shadow-sm font-black'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Matrice Multi-Frigos Consolidée</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              filename={`Inventaire_${activeFrigo?.name?.replace(/\s+/g, '_') || 'Stock'}`}
              title={`FEUILLE D'INVENTAIRE & SITUATION DU STOCK - ${activeFrigo?.name?.toUpperCase() || 'TOUS LES FRIGOS'}`}
              frigoName={activeFrigo?.name}
              frigoLocation={activeFrigo?.location}
              excelData={filteredProducts.map(prd => {
                const info = getProductStockInfo(prd);
                const physicalKg = Number(physicalCounts[prd.id]?.physicalKg || 0);
                const ecartKg = physicalKg - info.frigoKg;
                return {
                  'Code Produit': prd.code,
                  'Désignation': prd.name,
                  'Catégorie': prd.category,
                  'Origine': prd.origin,
                  'Stock Théorique (Kg)': info.frigoKg,
                  'Stock Théorique (Palettes)': info.frigoPallets,
                  'Stock Physique (Kg)': physicalKg,
                  'Écart (Kg)': ecartKg,
                  'Seuil Alerte (Kg)': info.minThreshold,
                  'Statut Alerte': info.isRupture ? 'RUPTURE' : info.isLowStock ? 'ALERTE STOCK BAS' : 'NORMAL',
                };
              })}
            />

            {/* Clear Stock Buttons */}
            <button
              onClick={handleClearFrigoStock}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3.5 py-2 rounded font-black flex items-center gap-1.5 shadow transition-colors"
              title={`Mettre à 0 le stock de ${activeFrigo?.name}`}
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Vider {activeFrigo?.code || 'Frigo'}</span>
            </button>

            <button
              onClick={handleClearAllStocks}
              className="bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 text-xs px-3 py-2 rounded flex items-center gap-1.5 font-bold transition-colors"
              title="Remise à zéro globale de tous les stocks"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Vider Tous Stocks</span>
            </button>

            {viewMode === 'SHEET' && (
              <>
                <button
                  onClick={() => handleSaveInventory(false)}
                  className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-xs px-3 py-2 rounded flex items-center gap-1 font-semibold transition-colors"
                >
                  <Save className="w-4 h-4 text-gray-600" />
                  <span className="hidden sm:inline">Sauvegarder</span> Sans Ajustement
                </button>
                <button
                  onClick={() => handleSaveInventory(true)}
                  className="carbon-btn-primary text-xs flex items-center gap-1 rounded font-bold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Valider & Ajuster Stock
                </button>
              </>
            )}
          </div>

        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded border border-gray-200">
          
          {/* Quick Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un produit ou un code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full carbon-input pl-9 text-xs"
            />
          </div>

          {/* Scope & Low-Stock Toggles */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            
            {/* Scope Switcher */}
            <div className="flex items-center bg-white border border-gray-300 rounded p-0.5">
              <button
                onClick={() => setStockScope('CURRENT_FRIGO')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  stockScope === 'CURRENT_FRIGO' ? 'bg-[#0f62fe] text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Frigo Actuel
              </button>
              <button
                onClick={() => setStockScope('GLOBAL_MULTI_FRIGO')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  stockScope === 'GLOBAL_MULTI_FRIGO' ? 'bg-[#0f62fe] text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Consolidé Multi-Frigos
              </button>
            </div>

            {/* Low Stock Only Toggle Button */}
            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`px-3 py-1.5 rounded border font-bold flex items-center gap-1.5 transition-all ${
                filterLowStockOnly 
                  ? 'bg-amber-500 text-black border-amber-600 shadow animate-pulse' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alerte Stock Bas ({activeLowStockList.length})</span>
            </button>

            {filterLowStockOnly && (
              <button
                onClick={() => setFilterLowStockOnly(false)}
                className="text-xs text-gray-500 hover:text-gray-900 underline font-sans"
              >
                Afficher Tous ({products.length})
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: Standard Physical Count Sheet */}
        {viewMode === 'SHEET' && (
          <div className="overflow-x-auto">
            <table className="carbon-table w-full">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase font-mono text-[11px]">
                  <th>Code Auto</th>
                  <th>Désignation Produit</th>
                  <th>Seuil Alerte (Reorder)</th>
                  <th>
                    {stockScope === 'CURRENT_FRIGO' ? `Stock ${activeFrigo?.code || 'Frigo'} (Théorique)` : 'Stock Consolidé Multi-Frigos'}
                  </th>
                  <th>Statut / Alerte</th>
                  <th>Saisie Physique (Kg)</th>
                  <th>Palettes Physique</th>
                  <th>Écart (Kg)</th>
                  <th>Actions Logistique</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(prd => {
                  const info = getProductStockInfo(prd);
                  
                  const currentPhysicalKg = Number(physicalCounts[prd.id]?.physicalKg || 0);
                  const currentPhysicalPallets = Number(physicalCounts[prd.id]?.physicalPallets || 0);
                  const diffKg = currentPhysicalKg - info.frigoKg;

                  // Row background highlight logic
                  let rowBgClass = '';
                  if (info.isRupture) {
                    rowBgClass = 'bg-red-50/90 hover:bg-red-100/90 border-l-4 border-l-red-600';
                  } else if (info.isLowStock) {
                    rowBgClass = 'bg-amber-50/90 hover:bg-amber-100/90 border-l-4 border-l-amber-500';
                  }

                  return (
                    <tr key={prd.id} className={rowBgClass}>
                      
                      {/* Code Auto */}
                      <td className="font-mono font-bold text-[#0f62fe]">
                        {prd.code}
                      </td>

                      {/* Designation */}
                      <td>
                        <div className="font-bold text-gray-900">{prd.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          Catégorie: {prd.category} • Origine: {prd.origin}
                        </div>
                      </td>

                      {/* Threshold Level with Edit Trigger */}
                      <td>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-gray-800 text-xs">
                            {info.minThreshold.toLocaleString()} Kg
                          </span>
                          <button
                            onClick={() => {
                              setEditingProduct(prd);
                              setNewThresholdKg(prd.minStockAlertKg || 1000);
                            }}
                            className="p-1 text-gray-400 hover:text-[#0f62fe] rounded hover:bg-gray-200/60 transition-colors"
                            title="Modifier le seuil d'alerte de ce produit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td className="font-mono text-gray-800">
                        {stockScope === 'CURRENT_FRIGO' ? (
                          <div>
                            <span className={`font-bold text-sm ${info.isLowStock ? 'text-amber-900' : 'text-gray-900'}`}>
                              {info.frigoKg.toLocaleString()} Kg
                            </span>
                            <div className="text-[10px] text-gray-500 font-bold">
                              {info.frigoPallets} Pal.
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className={`font-bold text-sm ${info.isLowStock ? 'text-amber-900' : 'text-gray-900'}`}>
                              {info.globalKg.toLocaleString()} Kg
                            </span>
                            <div className="text-[10px] text-gray-500 font-bold">
                              {info.globalPallets} Pal. (Cumul)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td>
                        {info.isRupture ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-red-600 text-white px-2 py-0.5 rounded shadow">
                            <PackageX className="w-3 h-3 animate-bounce" />
                            RUPTURE (0 Kg)
                          </span>
                        ) : info.isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-500 text-black px-2 py-0.5 rounded shadow">
                            <AlertTriangle className="w-3 h-3" />
                            STOCK BAS (-{info.deficitKg.toLocaleString()} Kg)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            CONFORME
                          </span>
                        )}
                      </td>

                      {/* Physical Kg Input */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={currentPhysicalKg}
                          onChange={e => handleItemChange(prd.id, 'physicalKg', e.target.value)}
                          className="w-28 carbon-input font-mono font-bold text-blue-800 bg-white"
                        />
                      </td>

                      {/* Physical Pallets Input */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={currentPhysicalPallets}
                          onChange={e => handleItemChange(prd.id, 'physicalPallets', e.target.value)}
                          className="w-24 carbon-input font-mono font-bold text-blue-800 bg-white"
                        />
                      </td>

                      {/* Difference Kg */}
                      <td className="font-mono font-bold">
                        {diffKg === 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            0 Kg
                          </span>
                        ) : diffKg > 0 ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                            +{diffKg} Kg
                          </span>
                        ) : (
                          <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-xs">
                            {diffKg} Kg
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openTransferForProduct(selectedFrigoId, prd.id)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-mono font-bold flex items-center gap-1 border border-blue-200 transition-colors"
                            title="Transférer ce produit vers un autre frigo"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Transférer</span>
                          </button>
                          {info.frigoKg > 0 && (
                            <button
                              onClick={() => handleClearSingleProductStock(selectedFrigoId, prd.id, prd.name)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-mono font-bold flex items-center gap-1 border border-red-200 transition-colors"
                              title="Vider le stock de ce produit (remettre à 0 Kg)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Vider</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500 font-mono text-xs">
                      Aucun produit ne correspond aux critères de recherche / alerte sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: Multi-Frigos Consolidated Comparative Grid */}
        {viewMode === 'MATRIX' && (
          <div className="overflow-x-auto">
            <table className="carbon-table w-full">
              <thead>
                <tr className="bg-[#161616] text-white uppercase font-mono text-[11px]">
                  <th className="py-3">Code</th>
                  <th className="py-3">Désignation Produit</th>
                  {frigos.map(f => (
                    <th key={f.id} className="py-3 text-center bg-[#262626] border-l border-[#393939]">
                      <div className="font-bold text-amber-300">{f.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{f.code} • {f.location}</div>
                    </th>
                  ))}
                  <th className="py-3 text-center bg-blue-900 text-white border-l border-blue-800">
                    <div>TOTAL GLOBAL</div>
                    <div className="text-[10px] text-blue-200 font-normal">Cumul Entreprise</div>
                  </th>
                  <th className="py-3 text-center">Seuil & Statut</th>
                  <th className="py-3 text-right">Actions Inter-Sites</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map(prd => {
                  const info = getProductStockInfo(prd);

                  return (
                    <tr key={prd.id} className="hover:bg-gray-50/80">
                      
                      {/* Product Code */}
                      <td className="font-mono font-bold text-[#0f62fe]">
                        {prd.code}
                      </td>

                      {/* Product Name */}
                      <td>
                        <div className="font-bold text-gray-900">{prd.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{prd.category} • {prd.origin}</div>
                      </td>

                      {/* Individual Frigo Columns */}
                      {frigos.map(f => {
                        const st = stocks.find(s => s.frigoId === f.id && s.productId === prd.id);
                        const kg = st ? st.quantityKg : 0;
                        const pallets = st ? st.quantityPallets : 0;

                        return (
                          <td key={f.id} className="text-center font-mono border-l border-gray-200 bg-gray-50/40">
                            <div className="font-black text-gray-900 text-xs">
                              {kg.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">Kg</span>
                            </div>
                            <div className="text-[10px] text-gray-600 font-semibold">
                              {pallets} Pal.
                            </div>
                            <div className="mt-1 flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setQuickAdjustItem({
                                    frigoId: f.id,
                                    productId: prd.id,
                                    currentKg: kg,
                                    currentPallets: pallets,
                                  });
                                  setQuickAdjustKg(kg);
                                  setQuickAdjustPallets(pallets);
                                }}
                                className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[9px] rounded font-sans"
                                title={`Ajuster le stock dans ${f.name}`}
                              >
                                Ajuster
                              </button>
                              <button
                                onClick={() => openTransferForProduct(f.id, prd.id)}
                                className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] rounded font-sans font-semibold"
                                title={`Transférer depuis ${f.name}`}
                              >
                                Transférer
                              </button>
                              {kg > 0 && (
                                <button
                                  onClick={() => handleClearSingleProductStock(f.id, prd.id, prd.name)}
                                  className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 text-[9px] rounded font-sans"
                                  title={`Vider le stock dans ${f.name}`}
                                >
                                  Vider
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Global Cumulative Total */}
                      <td className="text-center font-mono border-l border-blue-200 bg-blue-50/60 font-black">
                        <div className="text-blue-900 text-sm">
                          {info.globalKg.toLocaleString()} <span className="text-xs font-normal">Kg</span>
                        </div>
                        <div className="text-[11px] text-blue-700">
                          {info.globalPallets} Palettes
                        </div>
                      </td>

                      {/* Threshold & Global Status */}
                      <td className="text-center font-mono">
                        <div className="text-xs font-bold text-gray-700">
                          Seuil: {info.minThreshold.toLocaleString()} Kg
                        </div>
                        <div className="mt-1">
                          {info.globalKg === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-red-600 text-white px-2 py-0.5 rounded">
                              Rupture Globale
                            </span>
                          ) : info.globalKg < info.minThreshold ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-500 text-black px-2 py-0.5 rounded">
                              Alerte Stock Bas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                              Optimal
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <button
                          onClick={() => openTransferForProduct(selectedFrigoId, prd.id)}
                          className="px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white font-mono text-xs font-bold rounded flex items-center gap-1 ml-auto shadow-sm"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Transférer</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Quick Stock Adjustment Modal */}
      {quickAdjustItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0f62fe]" />
                Ajustement Rapide du Stock
              </h3>
              <button onClick={() => setQuickAdjustItem(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleQuickAdjustSubmit} className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-950 font-mono">
                <div>Frigo: <b>{frigos.find(f => f.id === quickAdjustItem.frigoId)?.name}</b></div>
                <div className="mt-1">Produit: <b>{products.find(p => p.id === quickAdjustItem.productId)?.name}</b></div>
                <div className="mt-1 text-gray-500">Stock Actuel: {quickAdjustItem.currentKg.toLocaleString()} Kg ({quickAdjustItem.currentPallets} Pal.)</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Nouveau Poids (Kg) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quickAdjustKg}
                    onChange={e => setQuickAdjustKg(Number(e.target.value))}
                    className="w-full carbon-input font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Nombre Palettes *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quickAdjustPallets}
                    onChange={e => setQuickAdjustPallets(Number(e.target.value))}
                    className="w-full carbon-input font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAdjustItem(null)}
                  className="px-4 py-2 border border-gray-300 font-semibold hover:bg-gray-100 rounded"
                >
                  Annuler
                </button>
                <button type="submit" className="carbon-btn-primary rounded font-bold">
                  Enregistrer dans PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Threshold Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-md rounded shadow-2xl overflow-hidden animate-in fade-in">
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939]">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0f62fe]" />
                Modifier le Seuil de Réapprovisionnement
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveThreshold} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-500 font-mono text-[11px] mb-0.5">Produit Sélectionné</label>
                <div className="font-bold text-gray-900 text-sm">{editingProduct.name} ({editingProduct.code})</div>
                <div className="text-gray-500 text-[11px] font-mono mt-0.5">Catégorie: {editingProduct.category}</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-900">
                <label className="block font-bold uppercase mb-1">
                  Seuil d'Alerte Stock Bas (en Kg) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  step={100}
                  value={newThresholdKg}
                  onChange={e => setNewThresholdKg(Number(e.target.value))}
                  className="w-full carbon-input font-mono font-bold text-amber-900 bg-white"
                />
                <div className="text-[10px] text-amber-700 mt-1.5">
                  Une alerte visuelle et un surlignage seront automatiquement déclenchés lorsque le stock frigo descend sous cette valeur.
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-gray-300 font-semibold hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button type="submit" className="carbon-btn-primary">
                  Mettre à jour le Seuil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Liste & Gestion des Frigos (CRUD) */}
      {showManageFrigosModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-3xl rounded shadow-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[90vh]">
            <div className="bg-[#161616] text-white px-5 py-3 flex justify-between items-center border-b border-[#393939] shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0f62fe]" />
                <h3 className="font-bold text-sm font-mono uppercase tracking-wide">
                  Gestion des Frigos & Entrepôts Frigorifiques (CRUD)
                </h3>
              </div>
              <button 
                onClick={() => setShowManageFrigosModal(false)}
                className="text-gray-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-3 rounded">
                <div>
                  <div className="font-bold text-blue-900 text-xs uppercase">
                    {frigos.length} Frigo(s) configurés avec synchronisation temps réel
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    Toutes les modifications s'appliquent immédiatement à l'inventaire, aux BLs et aux transferts de stock.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowManageFrigosModal(false);
                    handleOpenAddFrigo();
                  }}
                  className="px-3 py-1.5 bg-[#0f62fe] hover:bg-[#0353e9] text-white font-mono text-xs font-bold rounded flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nouveau Frigo</span>
                </button>
              </div>

              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#161616] text-white uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Code & Nom Frigo</th>
                      <th className="p-2.5">Emplacement</th>
                      <th className="p-2.5">Responsable</th>
                      <th className="p-2.5">Capacité</th>
                      <th className="p-2.5 text-right">Actions CRUD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {frigos.map(f => {
                      const isSelected = f.id === selectedFrigoId;

                      return (
                        <tr key={f.id} className={isSelected ? 'bg-amber-50/70 font-bold' : 'hover:bg-gray-50'}>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">{f.name}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{f.code}</div>
                          </td>
                          <td className="p-2.5 text-gray-700">{f.location}</td>
                          <td className="p-2.5 text-gray-700">
                            <div>{f.managerName}</div>
                            <div className="text-[10px] text-gray-500">{f.managerPhone}</div>
                          </td>
                          <td className="p-2.5 font-bold text-gray-900">{f.capacityPallets?.toLocaleString()} Pal.</td>
                          <td className="p-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              {!isSelected && (
                                <button
                                  onClick={() => {
                                    handleFrigoChange(f.id);
                                    setShowManageFrigosModal(false);
                                  }}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-sans font-semibold"
                                >
                                  Sélectionner
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowManageFrigosModal(false);
                                  handleOpenEditFrigo(f);
                                }}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-sans font-semibold"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeleteFrigo(f.id, f.name)}
                                className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[10px] font-sans font-semibold"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowManageFrigosModal(false);
                  handleOpenAddFrigo();
                }}
                className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Nouvel Entrepôt</span>
              </button>
              <button
                onClick={() => setShowManageFrigosModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded text-xs font-semibold hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Frigo */}
      {showAddFrigoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="p-4 bg-[#161616] text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0f62fe]" />
                <span>{editingFrigo ? `Modifier "${editingFrigo.name}"` : 'Créer un Nouvel Entrepôt Frigo'}</span>
              </h3>
              <button
                onClick={() => setShowAddFrigoModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFrigoSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Nom du Frigo / Entrepôt *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nom de l'entrepôt / Frigo..."
                  value={frigoForm.name}
                  onChange={e => setFrigoForm({ ...frigoForm, name: e.target.value })}
                  className="w-full carbon-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Ville / Emplacement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ville ou Zone géographique..."
                    value={frigoForm.location}
                    onChange={e => setFrigoForm({ ...frigoForm, location: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Capacité (Palettes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={frigoForm.capacityPallets}
                    onChange={e => setFrigoForm({ ...frigoForm, capacityPallets: Number(e.target.value) })}
                    className="w-full carbon-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Nom Responsable Quai
                  </label>
                  <input
                    type="text"
                    placeholder="Nom du responsable..."
                    value={frigoForm.managerName}
                    onChange={e => setFrigoForm({ ...frigoForm, managerName: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Téléphone Responsable
                  </label>
                  <input
                    type="text"
                    placeholder="+212 6..."
                    value={frigoForm.managerPhone}
                    onChange={e => setFrigoForm({ ...frigoForm, managerPhone: e.target.value })}
                    className="w-full carbon-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Nom Groupe WhatsApp Quai
                </label>
                <input
                  type="text"
                  placeholder="Nom du groupe WhatsApp..."
                  value={frigoForm.whatsappGroup}
                  onChange={e => setFrigoForm({ ...frigoForm, whatsappGroup: e.target.value })}
                  className="w-full carbon-input"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFrigoModal(false);
                    setEditingFrigo(null);
                  }}
                  className="px-4 py-2 border border-gray-300 font-semibold hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary"
                >
                  {editingFrigo ? 'Enregistrer la Modification' : 'Créer Frigo & Synchroniser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Inter-Frigos Modal */}
      {showTransferModal && (
        <StockTransferModal
          onClose={() => {
            setShowTransferModal(false);
            setTransferInitialProduct('');
            setTransferInitialSource('');
          }}
          defaultSourceFrigoId={transferInitialSource || selectedFrigoId}
          defaultProductId={transferInitialProduct}
        />
      )}

      {/* Stock Repackaging & Division Modal */}
      {showRepackagingModal && (
        <StockRepackagingModal
          onClose={() => {
            setShowRepackagingModal(false);
            setRepackagingInitialProduct('');
          }}
          defaultFrigoId={selectedFrigoId}
          defaultSourceProductId={repackagingInitialProduct}
        />
      )}

    </div>
  );
};
