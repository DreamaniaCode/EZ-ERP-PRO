import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { DeliveryNoteBL, DeliveryNoteItem } from '../../types';
import { useToast } from '../common/CarbonToastContainer';
import { 
  Warehouse, 
  Package, 
  ArrowDownCircle, 
  ArrowUpRight, 
  Truck, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Plus, 
  Search, 
  ArrowLeft,
  X
} from 'lucide-react';

interface FrigoOperationsPageProps {
  initialFrigoId?: string | null;
  onBack?: () => void;
}

export const FrigoOperationsPage: React.FC<FrigoOperationsPageProps> = ({ initialFrigoId, onBack }) => {
  const { 
    frigos, 
    products, 
    stocks, 
    clients, 
    deliveryNotes, 
    adjustStock, 
    addBL, 
    deleteBL, 
    createInvoiceFromBL,
    activeCompany,
    activeCompanyId
  } = useERP();
  
  const { notifySuccess, notifyError } = useToast();

  // Active frigo selection
  const [selectedFrigoId, setSelectedFrigoId] = useState<string>(
    initialFrigoId || (frigos.length > 0 ? frigos[0].id : '')
  );

  const activeFrigo = useMemo(() => {
    return frigos.find(f => f.id === selectedFrigoId) || frigos[0];
  }, [frigos, selectedFrigoId]);

  // Active tab inside Frigo Operations
  const [activeTab, setActiveTab] = useState<'ENTREE' | 'SORTIE_BL'>('ENTREE');

  // ==========================================
  // STATE: ENTRÉE DE MARCHANDISE
  // ==========================================
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products.length > 0 ? products[0].id : ''
  );
  const [colisInput, setColisInput] = useState<number | ''>(100);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Calculations for Entrée
  const calculatedKgEntree = useMemo(() => {
    if (!colisInput || colisInput <= 0 || !selectedProduct) return 0;
    const kgPerCarton = selectedProduct.kgPerCarton || 10;
    return Number(colisInput) * kgPerCarton;
  }, [colisInput, selectedProduct]);

  const calculatedPalletsEntree = useMemo(() => {
    if (!calculatedKgEntree || !selectedProduct || !selectedProduct.kgPerPallet) return 1;
    return Math.max(1, Math.ceil(calculatedKgEntree / selectedProduct.kgPerPallet));
  }, [calculatedKgEntree, selectedProduct]);

  const handleEntreeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFrigoId || !selectedProductId || !colisInput || calculatedKgEntree <= 0) {
      notifyError('Veuillez remplir correctement les informations d\'entrée.', 'Formulaire Incomplet');
      return;
    }

    const currentStockItem = stocks.find(s => s.frigoId === selectedFrigoId && s.productId === selectedProductId);
    const prevKg = currentStockItem ? currentStockItem.quantityKg : 0;
    const prevPallets = currentStockItem ? currentStockItem.quantityPallets : 0;

    const newKg = prevKg + calculatedKgEntree;
    const newPallets = prevPallets + calculatedPalletsEntree;

    // Call adjustStock with ENTRÉE_INVENTAIRE type
    adjustStock(
      selectedFrigoId, 
      selectedProductId, 
      newKg, 
      newPallets, 
      `ENTRÉE-${new Date().toLocaleDateString('fr-FR')}`, 
      'ENTRÉE_INVENTAIRE'
    );

    notifySuccess(
      `Marchandise entrée avec succès ! +${calculatedKgEntree.toLocaleString()} Kg (${colisInput} colis) ajoutés au frigo "${activeFrigo?.name}".`,
      'Entrée Validée'
    );

    // Reset inputs
    setColisInput(100);
  };

  // ==========================================
  // STATE: SORTIE DE BL (CRÉATION BL & LISTE FRIGO)
  // ==========================================
  const [showNewBLModal, setShowNewBLModal] = useState<boolean>(false);
  const [blClientId, setBlClientId] = useState<string>(clients.length > 0 ? clients[0].id : '');
  const [blItems, setBlItems] = useState<{ productId: string; quantityColis: number }[]>([
    { productId: products.length > 0 ? products[0].id : '', quantityColis: 50 }
  ]);

  // Mass action checkboxes
  const [selectedBLIds, setSelectedBLIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter BLs ONLY for this frigo (Strict Isolation)
  const frigoBLs = useMemo(() => {
    if (!selectedFrigoId) return [];
    return deliveryNotes.filter(bl => {
      const matchFrigo = bl.frigoId === selectedFrigoId || 
        (bl.frigoName && activeFrigo && bl.frigoName.trim().toLowerCase() === activeFrigo.name.trim().toLowerCase());
      
      const search = searchTerm.trim().toLowerCase();
      const matchSearch = !search ||
        bl.blNumber.toLowerCase().includes(search) ||
        bl.clientName.toLowerCase().includes(search);

      return matchFrigo && matchSearch;
    });
  }, [deliveryNotes, selectedFrigoId, activeFrigo, searchTerm]);

  // Stocks for current frigo (Dynamic calculation with BL fallback)
  const currentFrigoStocks = useMemo(() => {
    const map = new Map<string, { productId: string; quantityKg: number; quantityPallets: number; lastUpdated?: string }>();

    // 1. Load actual stock records
    stocks.filter(s => s.frigoId === selectedFrigoId).forEach(s => {
      map.set(s.productId, {
        productId: s.productId,
        quantityKg: s.quantityKg,
        quantityPallets: s.quantityPallets,
        lastUpdated: s.lastUpdated
      });
    });

    // 2. Aggregate quantities from BLs for this Frigo
    const blTotals = new Map<string, { totalKg: number; totalPallets: number }>();
    deliveryNotes.forEach(bl => {
      const matchFrigo = bl.frigoId === selectedFrigoId || 
        (bl.frigoName && activeFrigo && bl.frigoName.trim().toLowerCase() === activeFrigo.name.trim().toLowerCase());
      if (matchFrigo) {
        bl.items.forEach(item => {
          const prdId = item.productId;
          const curr = blTotals.get(prdId) || { totalKg: 0, totalPallets: 0 };
          blTotals.set(prdId, {
            totalKg: curr.totalKg + (item.quantityKg || 0),
            totalPallets: curr.totalPallets + (item.quantityPallets || 1)
          });
        });
      }
    });

    // 3. Ensure products in catalog are included with proper stock or BL merchandise volume
    products.forEach(p => {
      const existing = map.get(p.id);
      const blData = blTotals.get(p.id);

      if (!existing) {
        const fallbackKg = blData ? blData.totalKg : 0;
        const fallbackPallets = blData ? blData.totalPallets : 0;
        map.set(p.id, {
          productId: p.id,
          quantityKg: fallbackKg,
          quantityPallets: fallbackPallets
        });
      } else if (existing.quantityKg === 0 && blData && blData.totalKg > 0) {
        map.set(p.id, {
          ...existing,
          quantityKg: blData.totalKg,
          quantityPallets: blData.totalPallets
        });
      }
    });

    return Array.from(map.values());
  }, [stocks, selectedFrigoId, deliveryNotes, activeFrigo, products]);

  const handleAddBLItem = () => {
    setBlItems(prev => [
      ...prev,
      { productId: products.length > 0 ? products[0].id : '', quantityColis: 50 }
    ]);
  };

  const handleRemoveBLItem = (idx: number) => {
    setBlItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBLItemChange = (idx: number, field: 'productId' | 'quantityColis', value: any) => {
    setBlItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleCreateBLSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClientObj = clients.find(c => c.id === blClientId);
    if (!selectedClientObj || !selectedFrigoId) {
      notifyError('Veuillez sélectionner un client valide et un frigo.', 'Champs Incomplets');
      return;
    }

    if (blItems.length === 0) {
      notifyError('Veuillez ajouter au moins une ligne de produit.', 'Lignes Vides');
      return;
    }

    // Prepare delivery note items and check stock availability
    const itemsProcessed: DeliveryNoteItem[] = [];
    let totalBLKg = 0;
    let totalBLCartons = 0;
    let totalBLPallets = 0;
    let totalBLHT = 0;

    for (const item of blItems) {
      const prd = products.find(p => p.id === item.productId);
      if (!prd) continue;

      const kgPerCarton = prd.kgPerCarton || 10;
      const totalKgLine = item.quantityColis * kgPerCarton;
      const palletsLine = prd.kgPerPallet ? Math.max(1, Math.ceil(totalKgLine / prd.kgPerPallet)) : 1;
      const unitPrice = prd.sellingPriceHT || 0;
      const lineHT = totalKgLine * unitPrice;

      // Check stock availability in frigo
      const stockObj = stocks.find(s => s.frigoId === selectedFrigoId && s.productId === prd.id);
      const availKg = stockObj ? stockObj.quantityKg : 0;

      if (totalKgLine > availKg) {
        notifyError(
          `Stock insuffisant pour "${prd.name}". Disponible: ${availKg.toLocaleString()} Kg | Demandé: ${totalKgLine.toLocaleString()} Kg`,
          'Stock Bloquant'
        );
        return;
      }

      totalBLKg += totalKgLine;
      totalBLCartons += item.quantityColis;
      totalBLPallets += palletsLine;
      totalBLHT += lineHT;

      itemsProcessed.push({
        productId: prd.id,
        productCode: prd.code,
        productName: prd.name,
        quantityKg: totalKgLine,
        quantityCartons: item.quantityColis,
        quantityPallets: palletsLine,
        unitPriceHT: unitPrice,
        totalHT: lineHT,
      });
    }

    const prefix = activeCompany?.blPrefix || 'BL';
    const blNumber = `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBL: DeliveryNoteBL = {
      id: `bl-${Date.now()}`,
      companyId: activeCompanyId,
      blNumber,
      orderId: '',
      orderNumber: '',
      clientId: selectedClientObj.id,
      clientName: selectedClientObj.companyName || selectedClientObj.name,
      clientAddress: selectedClientObj.address || '',
      clientPhone: selectedClientObj.phone || '',
      clientEmail: selectedClientObj.email || '',
      frigoId: selectedFrigoId,
      frigoName: activeFrigo?.name || 'Frigo',
      date: new Date().toISOString().slice(0, 10),
      items: itemsProcessed,
      totalKg: totalBLKg,
      totalCartons: totalBLCartons,
      totalPallets: totalBLPallets,
      totalHT: totalBLHT,
      totalTTC: totalBLHT, // No VAT
      stockDecremented: true,
      frigoEmployeeApproved: true,
      frigoApprovedBy: 'Agent Frigo',
      whatsappSent: false,
      emailSent: false,
      status: 'LIVRÉ', // Created as delivered/emitted (NO INVOICE)
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          action: `Création du Bon de Sortie ${blNumber} depuis Opérations Frigo`,
          author: 'Responsable Frigo'
        }
      ]
    };

    // addBL automatically decrements stock via deductBLStockHelper
    addBL(newBL);

    notifySuccess(`Bon de Livraison ${blNumber} créé avec succès ! Stock décrémenté de ${totalBLKg.toLocaleString()} Kg.`, 'Sortie Validée');
    setShowNewBLModal(false);
    setBlItems([{ productId: products.length > 0 ? products[0].id : '', quantityColis: 50 }]);
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedBLIds.length === frigoBLs.length) {
      setSelectedBLIds([]);
    } else {
      setSelectedBLIds(frigoBLs.map(b => b.id));
    }
  };

  const toggleSelectBL = (id: string) => {
    setSelectedBLIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Mass action 1: Generate invoices in batch
  const handleBatchGenerateInvoices = () => {
    if (selectedBLIds.length === 0) return;
    let count = 0;
    selectedBLIds.forEach(id => {
      try {
        createInvoiceFromBL(id);
        count++;
      } catch (err) {
        console.error(err);
      }
    });

    notifySuccess(`${count} Facture(s) générée(s) en masse avec succès !`, 'Facturation en Masse');
    setSelectedBLIds([]);
  };

  // Mass action 2: Delete in batch
  const handleBatchDelete = () => {
    if (selectedBLIds.length === 0) return;
    if (window.confirm(`Voulez-vous vraiment supprimer définitivement ces ${selectedBLIds.length} Bon(s) de Livraison ?`)) {
      selectedBLIds.forEach(id => deleteBL(id));
      notifySuccess(`${selectedBLIds.length} BL(s) supprimé(s) avec succès.`, 'Suppression en Masse');
      setSelectedBLIds([]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in bg-[#f4f4f4] min-h-screen p-4 md:p-6 text-[#161616]">
      
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 border border-gray-200 rounded shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0f62fe]"
              title="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Warehouse className="w-6 h-6 text-[#0f62fe]" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Module Opérations Frigo</h1>
            <p className="text-xs text-gray-500 font-mono">Entrées en Stock • Sorties BLs • Facturation & Suppression en Masse</p>
          </div>
        </div>

        {/* Warehouse Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-700 uppercase font-mono">Sélectionner Frigo :</label>
          <select
            value={selectedFrigoId}
            onChange={(e) => setSelectedFrigoId(e.target.value)}
            className="border border-[#0f62fe] rounded px-3 py-1.5 text-xs font-bold bg-blue-50 text-[#0f62fe] focus:ring-0 shadow-sm"
          >
            {frigos.map(f => (
              <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Frigo Quick Summary Header Banner */}
      <div className="bg-[#161616] text-white p-5 rounded-lg border border-[#393939] shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Entrepôt Actif</div>
          <div className="font-bold text-sm text-white mt-0.5">{activeFrigo?.name || '-'}</div>
          <div className="text-gray-400 text-[10px]">{activeFrigo?.location}</div>
        </div>
        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Stock Physique Réel</div>
          <div className="font-bold text-sm text-emerald-400 mt-0.5">
            {currentFrigoStocks.reduce((sum, s) => sum + s.quantityKg, 0).toLocaleString()} Kg
          </div>
          <div className="text-emerald-300 text-[10px]">
            {currentFrigoStocks.reduce((sum, s) => sum + s.quantityPallets, 0)} Palettes
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Sorties / BLs Émis</div>
          <div className="font-bold text-sm text-blue-400 mt-0.5">
            {frigoBLs.length} Bons de Sortie
          </div>
          <div className="text-blue-300 text-[10px]">
            Pour ce frigo uniquement
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Responsable Frigo</div>
          <div className="font-bold text-sm text-purple-300 mt-0.5">
            {activeFrigo?.managerName || 'Non Assigné'}
          </div>
          <div className="text-purple-200 text-[10px]">{activeFrigo?.managerPhone || '-'}</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-300 gap-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab('ENTREE')}
          className={`px-5 py-2.5 font-bold rounded-t-lg transition-colors flex items-center gap-2 border-t border-l border-r ${
            activeTab === 'ENTREE' 
              ? 'bg-white border-gray-300 text-[#0f62fe] border-b-2 border-b-[#0f62fe]' 
              : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
          <span>1. Entrée de Marchandise dans le Frigo</span>
        </button>

        <button
          onClick={() => setActiveTab('SORTIE_BL')}
          className={`px-5 py-2.5 font-bold rounded-t-lg transition-colors flex items-center gap-2 border-t border-l border-r ${
            activeTab === 'SORTIE_BL' 
              ? 'bg-white border-gray-300 text-[#0f62fe] border-b-2 border-b-[#0f62fe]' 
              : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-blue-600" />
          <span>2. Sorties & Bons de Livraison (Ce Frigo Seul)</span>
        </button>
      </div>

      {/* TAB 1: ENTRÉE DE MARCHANDISE */}
      {activeTab === 'ENTREE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Entry */}
          <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4 text-xs font-mono">
            <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
              Formulaire Entrée Frigo
            </h2>

            <form onSubmit={handleEntreeSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Produit du Système :</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs font-bold text-gray-900 bg-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.kgPerCarton || 10} kg/colis)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Nombre de Colis (Cartons) :</label>
                <input
                  type="number"
                  min="1"
                  value={colisInput}
                  onChange={(e) => setColisInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs font-bold text-gray-900"
                  placeholder="Ex: 100"
                />
              </div>

              {/* Calculated values summary box */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-emerald-900 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Poids Calculé :</span>
                  <span className="text-sm">{calculatedKgEntree.toLocaleString()} Kg</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Palettes Estimées :</span>
                  <span>{calculatedPalletsEntree} Palettes</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>Prix Revient Unitaire :</span>
                  <span>{selectedProduct?.unitCostHT || 0} DH/Kg</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Faire Entrer la Marchandise
              </button>
            </form>
          </div>

          {/* Current Stocks Display for this Frigo */}
          <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4 text-xs font-mono">
            <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-2 text-emerald-700">
                <Package className="w-4 h-4" />
                Stock Physique Réel dans "{activeFrigo?.name}"
              </span>
              <span className="text-gray-500 font-normal">{currentFrigoStocks.length} Référence(s)</span>
            </h2>

            {currentFrigoStocks.length === 0 ? (
              <div className="p-8 text-center text-gray-400 border border-dashed border-gray-300 rounded italic">
                Ce frigo est actuellement vide (0 Kg). Utilisez le formulaire ci-contre pour faire entrer de la marchandise.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="carbon-table text-xs">
                  <thead>
                    <tr>
                      <th>Code Produit</th>
                      <th>Désignation</th>
                      <th className="text-right">Stock Physique (Kg)</th>
                      <th className="text-right">Palettes</th>
                      <th className="text-right">Prix Revient HT</th>
                      <th className="text-right">Valorisation HT</th>
                      <th className="text-center">Action Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFrigoStocks.map(stk => {
                      const prd = products.find(p => p.id === stk.productId);
                      const valHT = stk.quantityKg * (prd?.unitCostHT || 0);

                      return (
                        <tr key={stk.productId}>
                          <td className="font-bold text-[#0f62fe]">{prd?.code || 'PRD'}</td>
                          <td className="font-semibold text-gray-900">{prd?.name || 'Produit'}</td>
                          <td className="text-right font-bold text-emerald-700">{stk.quantityKg.toLocaleString()} Kg</td>
                          <td className="text-right font-bold text-purple-700">{stk.quantityPallets} Pal.</td>
                          <td className="text-right text-gray-600">{prd?.unitCostHT || 0} DH</td>
                          <td className="text-right font-bold text-gray-900">{valHT.toLocaleString()} DH</td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductId(stk.productId);
                                setColisInput(100);
                              }}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded font-bold text-[10px] flex items-center gap-1 mx-auto"
                              title="Charger ce produit dans le formulaire d'entrée d'inventaire"
                            >
                              <Plus className="w-3 h-3" /> + Entrée Express
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

        </div>
      )}

      {/* TAB 2: SORTIES & BONS DE LIVRAISON (ISOLÉ PAR FRIGO) */}
      {activeTab === 'SORTIE_BL' && (
        <div className="space-y-4 text-xs font-mono">
          
          {/* Header Action Bar */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-sm text-gray-900 uppercase">
                Bons de Sortie du Frigo ({frigoBLs.length} BLs)
              </h2>
              
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher BL ou Client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
            </div>

            <button
              onClick={() => setShowNewBLModal(true)}
              className="px-4 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white font-bold rounded flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau Bon de Sortie (BL)
            </button>
          </div>

          {/* Mass Action Bar (Shown when items selected) */}
          {selectedBLIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex flex-wrap justify-between items-center gap-3 animate-in fade-in">
              <span className="font-bold text-blue-900">
                ✓ {selectedBLIds.length} Bon(s) de Livraison sélectionné(s) sur ce frigo
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleBatchGenerateInvoices}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Générer des factures pour les BLs sélectionnés"
                >
                  <FileText className="w-4 h-4" />
                  Générer Factures en Masse
                </button>

                <button
                  onClick={handleBatchDelete}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Supprimer définitivement les BLs sélectionnés"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer en Masse
                </button>
              </div>
            </div>
          )}

          {/* Table of BLs */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {frigoBLs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">
                Aucun Bon de Livraison pour le frigo "{activeFrigo?.name}". Cliquez sur "Nouveau Bon de Sortie" pour faire sortir de la marchandise.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="carbon-table text-xs">
                  <thead>
                    <tr>
                      <th className="w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBLIds.length > 0 && selectedBLIds.length === frigoBLs.length}
                          onChange={toggleSelectAll}
                          className="rounded text-[#0f62fe]"
                        />
                      </th>
                      <th>N° BL</th>
                      <th>Date</th>
                      <th>Client Destinataire</th>
                      <th className="text-right">Poids Sorti (Kg)</th>
                      <th className="text-right">Colis</th>
                      <th className="text-right">Montant HT</th>
                      <th>Statut Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frigoBLs.map(bl => {
                      const isSelected = selectedBLIds.includes(bl.id);
                      return (
                        <tr key={bl.id} className={isSelected ? 'bg-blue-50/50' : ''}>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectBL(bl.id)}
                              className="rounded text-[#0f62fe]"
                            />
                          </td>
                          <td className="font-bold text-[#0f62fe]">{bl.blNumber}</td>
                          <td className="text-gray-600">{bl.date}</td>
                          <td className="font-bold text-gray-900">{bl.clientName}</td>
                          <td className="text-right font-bold text-emerald-700">{bl.totalKg.toLocaleString()} Kg</td>
                          <td className="text-right text-gray-700">{bl.totalCartons || '-'} colis</td>
                          <td className="text-right font-bold text-gray-900">{bl.totalHT.toLocaleString()} DH</td>
                          <td>
                            {bl.invoiceId ? (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                Facturé ({bl.invoiceNumber})
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                Non Facturé (BL Seul)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL: NOUVEAU BON DE SORTIE (BL) */}
      {showNewBLModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl border border-gray-300 font-mono text-xs space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#0f62fe]" />
                Nouveau Bon de Sortie — Frigo "{activeFrigo?.name}"
              </h3>
              <button onClick={() => setShowNewBLModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBLSubmit} className="space-y-4">
              
              {/* Client Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Sélectionner Client Destinataire :</label>
                <select
                  value={blClientId}
                  onChange={(e) => setBlClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs font-bold text-gray-900 bg-white"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.companyName}</option>
                  ))}
                </select>
              </div>

              {/* Product Lines */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-gray-800">Lignes de Sortie Produit :</label>
                  <button
                    type="button"
                    onClick={handleAddBLItem}
                    className="text-[#0f62fe] hover:underline font-bold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter Produit
                  </button>
                </div>

                {blItems.map((item, idx) => {
                  const prd = products.find(p => p.id === item.productId);
                  const kgPerCarton = prd?.kgPerCarton || 10;
                  const totalKg = item.quantityColis * kgPerCarton;

                  return (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded border border-gray-200">
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) => handleBLItemChange(idx, 'productId', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-bold bg-white"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          min="1"
                          value={item.quantityColis}
                          onChange={(e) => handleBLItemChange(idx, 'quantityColis', Number(e.target.value))}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-bold"
                          placeholder="Colis"
                        />
                      </div>

                      <div className="w-28 text-right font-bold text-emerald-700">
                        {totalKg.toLocaleString()} Kg
                      </div>

                      {blItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBLItem(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Notice */}
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-900 text-[11px]">
                ⚠️ Ce Bon de Sortie décrémentera automatiquement le stock du frigo. 
                <b> Aucune facture n'est générée automatiquement.</b>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewBLModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-bold hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f62fe] hover:bg-blue-700 text-white font-bold rounded shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Valider la Sortie (BL)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
