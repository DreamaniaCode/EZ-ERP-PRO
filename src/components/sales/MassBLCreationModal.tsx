import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { useToast } from '../common/CarbonToastContainer';
import { SearchableProductSelect } from '../common/SearchableProductSelect';
import { SearchableClientSelect } from '../common/SearchableClientSelect';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Truck, 
  Building2, 
  Calendar, 
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface MassBLRow {
  id: string;
  date: string;
  companyId: string;
  clientId: string;
  frigoId: string;
  productId: string;
  productName: string;
  productCode: string;
  kgPerCarton: number;
  quantityCartons: number;
  quantityKg: number;
  unitPriceHT: number;
  totalHT: number;
}

interface MassBLCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
  onSuccess?: () => void;
}

export const MassBLCreationModal: React.FC<MassBLCreationModalProps> = ({
  isOpen,
  onClose,
  initialClientId,
  onSuccess,
}) => {
  const { 
    clients, 
    frigos, 
    products, 
    stocks, 
    companies, 
    activeCompanyId, 
    activeCompany, 
    addBL, 
    deliveryNotes, 
    currentUser 
  } = useERP();

  const { notifySuccess, notifyError, notifyWarning } = useToast();

  const defaultCompId = activeCompanyId !== 'ALL' ? activeCompanyId : companies[0]?.id || 'STE_1';
  const defaultFrigoId = frigos[0]?.id || '';
  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper to retrieve memorized repartition name
  const getSavedRepartitionName = (prdId: string, kgPack?: number): string | null => {
    if (!prdId) return null;
    try {
      const raw = localStorage.getItem('erp_custom_repartition_names');
      if (!raw) return null;
      const map = JSON.parse(raw);
      const key = `${prdId}_${kgPack || 10}`;
      return map[key] || null;
    } catch {
      return null;
    }
  };

  const createInitialRow = (): MassBLRow => {
    const prd = products[0];
    const kgPack = prd?.kgPerCarton || 10;
    const price = prd?.sellingPriceHT || 0;
    const savedName = prd ? getSavedRepartitionName(prd.id, kgPack) : '';

    return {
      id: `mrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: todayStr,
      companyId: defaultCompId,
      clientId: initialClientId || (clients[0]?.id || ''),
      frigoId: defaultFrigoId,
      productId: prd?.id || '',
      productName: savedName || (prd?.name || ''),
      productCode: prd?.code || '',
      kgPerCarton: kgPack,
      quantityCartons: 10,
      quantityKg: 10 * kgPack,
      unitPriceHT: price,
      totalHT: 10 * kgPack * price,
    };
  };

  const [rows, setRows] = useState<MassBLRow[]>([createInitialRow()]);
  const [isHistoricalAutoApprove, setIsHistoricalAutoApprove] = useState<boolean>(true);
  const [globalDate, setGlobalDate] = useState<string>(todayStr);
  const [globalFrigoId, setGlobalFrigoId] = useState<string>(defaultFrigoId);
  const [globalCompanyId, setGlobalCompanyId] = useState<string>(defaultCompId);

  if (!isOpen) return null;

  // Add new row
  const handleAddRow = () => {
    const prd = products[0];
    const kgPack = prd?.kgPerCarton || 10;
    const price = prd?.sellingPriceHT || 0;
    const savedName = prd ? getSavedRepartitionName(prd.id, kgPack) : '';

    const newRow: MassBLRow = {
      id: `mrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: globalDate || todayStr,
      companyId: globalCompanyId || defaultCompId,
      clientId: initialClientId || (clients[0]?.id || ''),
      frigoId: globalFrigoId || defaultFrigoId,
      productId: prd?.id || '',
      productName: savedName || (prd?.name || ''),
      productCode: prd?.code || '',
      kgPerCarton: kgPack,
      quantityCartons: 10,
      quantityKg: 10 * kgPack,
      unitPriceHT: price,
      totalHT: 10 * kgPack * price,
    };
    setRows([...rows, newRow]);
  };

  // Duplicate specific row
  const handleDuplicateRow = (index: number) => {
    const target = rows[index];
    if (!target) return;
    const duplicated: MassBLRow = {
      ...target,
      id: `mrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    const next = [...rows];
    next.splice(index + 1, 0, duplicated);
    setRows(next);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      notifyWarning('Vous devez conserver au moins une ligne dans la saisie.');
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  // Update specific row field with bidirectional calculation
  const handleRowChange = (index: number, field: keyof MassBLRow, value: any) => {
    const next = [...rows];
    const row = { ...next[index], [field]: value };
    const prd = products.find(p => p.id === row.productId);
    const kgPack = row.kgPerCarton > 0 ? row.kgPerCarton : (prd?.kgPerCarton || 10);

    if (field === 'productId') {
      if (prd) {
        row.productCode = prd.code;
        row.kgPerCarton = prd.kgPerCarton || 10;
        row.unitPriceHT = prd.sellingPriceHT || 0;
        const savedCustomName = getSavedRepartitionName(prd.id, row.kgPerCarton);
        row.productName = savedCustomName || prd.name;
        row.quantityKg = Math.round(row.quantityCartons * row.kgPerCarton * 100) / 100;
        row.totalHT = Math.round(row.quantityKg * row.unitPriceHT * 100) / 100;
      }
    }

    if (field === 'kgPerCarton') {
      const newKg = Math.max(0.1, Number(value) || 1);
      row.kgPerCarton = newKg;
      const savedCustomName = getSavedRepartitionName(row.productId, newKg);
      if (savedCustomName) row.productName = savedCustomName;
      if (row.quantityCartons > 0) {
        row.quantityKg = Math.round(row.quantityCartons * newKg * 100) / 100;
      } else if (row.quantityKg > 0) {
        row.quantityCartons = Math.round((row.quantityKg / newKg) * 100) / 100;
      }
      row.totalHT = Math.round(row.quantityKg * row.unitPriceHT * 100) / 100;
    }

    if (field === 'quantityCartons') {
      const cartons = Number(value) || 0;
      row.quantityCartons = cartons;
      row.quantityKg = Math.round(cartons * kgPack * 100) / 100;
      row.totalHT = Math.round(row.quantityKg * row.unitPriceHT * 100) / 100;
    }

    if (field === 'quantityKg') {
      const kg = Number(value) || 0;
      row.quantityKg = kg;
      row.quantityCartons = Math.round((kg / kgPack) * 100) / 100;
      row.totalHT = Math.round(kg * row.unitPriceHT * 100) / 100;
    }

    if (field === 'unitPriceHT') {
      const price = Number(value) || 0;
      row.unitPriceHT = price;
      row.totalHT = Math.round(row.quantityKg * price * 100) / 100;
    }

    next[index] = row;
    setRows(next);
  };

  // Quick Apply to all rows
  const handleApplyGlobalDate = () => {
    setRows(rows.map(r => ({ ...r, date: globalDate })));
    notifySuccess(`Date "${globalDate}" appliquée à toutes les lignes.`);
  };

  const handleApplyGlobalFrigo = () => {
    setRows(rows.map(r => ({ ...r, frigoId: globalFrigoId })));
    notifySuccess('Frigo d\'expédition appliqué à toutes les lignes.');
  };

  const handleApplyGlobalCompany = () => {
    setRows(rows.map(r => ({ ...r, companyId: globalCompanyId })));
    notifySuccess('Société émettrice appliquée à toutes les lignes.');
  };

  // Calculations
  const totalCartonsAll = rows.reduce((sum, r) => sum + Number(r.quantityCartons || 0), 0);
  const totalKgAll = rows.reduce((sum, r) => sum + Number(r.quantityKg || 0), 0);
  const totalHTAll = rows.reduce((sum, r) => sum + Number(r.totalHT || 0), 0);

  // Validate and submit mass BL creation
  const handleValidateAndSubmit = () => {
    // 1. Validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.clientId) {
        notifyError(`Ligne N° ${i + 1} : Veuillez sélectionner un client.`);
        return;
      }
      if (!r.frigoId) {
        notifyError(`Ligne N° ${i + 1} : Veuillez sélectionner un frigo.`);
        return;
      }
      if (!r.productId) {
        notifyError(`Ligne N° ${i + 1} : Veuillez sélectionner un produit.`);
        return;
      }
      if (!r.quantityKg || r.quantityKg <= 0) {
        notifyError(`Ligne N° ${i + 1} : La quantité doit être supérieure à 0 Kg.`);
        return;
      }
    }

    let createdCount = 0;
    const nowTime = Date.now();

    rows.forEach((r, idx) => {
      const client = clients.find(c => c.id === r.clientId);
      const frigo = frigos.find(f => f.id === r.frigoId);
      const prd = products.find(p => p.id === r.productId);
      const comp = companies.find(c => c.id === r.companyId) || activeCompany || companies[0];
      const prefix = comp?.blPrefix || 'BL';
      const blSeq = deliveryNotes.length + createdCount + 1;
      const blNumber = `${prefix}-2026-${String(blSeq).padStart(4, '0')}`;

      const isPastDate = Boolean(r.date && r.date < todayStr);
      const autoApprove = isHistoricalAutoApprove || isPastDate;

      const itemPallets = prd && prd.kgPerPallet ? Math.ceil(r.quantityKg / prd.kgPerPallet) : 1;

      const newBL: any = {
        id: `bl-${nowTime + idx}`,
        createdAt: new Date(nowTime + idx * 1000).toISOString(),
        companyId: r.companyId,
        blNumber,
        orderId: '',
        orderNumber: '',
        clientId: r.clientId,
        clientName: client ? (client.name || client.companyName) : 'Client',
        clientAddress: client?.address || '',
        clientPhone: client?.phone || '',
        clientEmail: client?.email || '',
        frigoId: r.frigoId,
        frigoName: frigo ? frigo.name : 'Frigo Principal',
        date: r.date,
        items: [
          {
            productId: r.productId,
            productCode: r.productCode || (prd?.code || 'PRD-000'),
            productName: r.productName || (prd?.name || 'Produit'),
            quantityKg: r.quantityKg,
            quantityCartons: r.quantityCartons,
            kgPerCarton: r.kgPerCarton,
            packagingFormat: `${r.kgPerCarton} Kg`,
            theoreticalKg: r.quantityKg,
            weighedKg: r.quantityKg,
            isWeighed: autoApprove,
            quantityPallets: itemPallets,
            unitPriceHT: r.unitPriceHT,
            totalHT: r.totalHT,
          }
        ],
        totalKg: r.quantityKg,
        totalCartons: r.quantityCartons,
        totalPallets: itemPallets,
        totalHT: r.totalHT,
        totalTTC: r.totalHT,
        status: autoApprove ? 'LIVRÉ' : 'EN_ATTENTE_FRIGO',
        stockDecremented: true,
        frigoEmployeeApproved: autoApprove,
        frigoApprovedBy: autoApprove ? (currentUser?.name || 'Saisie en Masse') : undefined,
        frigoApprovedAt: autoApprove ? (r.date ? `${r.date}T12:00:00.000Z` : new Date().toISOString()) : undefined,
        signedByName: autoApprove ? (client ? (client.name || client.companyName) : 'Client') : undefined,
        signedAt: autoApprove ? (r.date ? `${r.date}T12:00:00.000Z` : new Date().toISOString()) : undefined,
        whatsappSent: autoApprove,
        emailSent: false,
        logs: [
          {
            id: `log-${Date.now()}-${idx}`,
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
            action: autoApprove 
              ? 'Création rapide en masse & Validation automatique rétroactive' 
              : 'Création rapide en masse du Bon de Livraison',
            author: currentUser?.name || 'Saisie en Masse'
          }
        ]
      };

      addBL(newBL);
      createdCount++;
    });

    notifySuccess(`✅ ${createdCount} Bon(s) de Livraison créé(s) avec succès en masse !`, 'Succès Saisie en Masse');
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden border border-gray-300">
        
        {/* Modal Header */}
        <div className="bg-[#161616] text-white px-6 py-4 flex justify-between items-center border-b border-[#393939] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-black shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold uppercase tracking-wider text-white">
                  Saisie & Création en Masse des BLs
                </h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                  {rows.length} BL(s) dans la grille
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Idéal pour saisir rapidement vos anciens bons d'expédition ou multiples livraisons
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              title="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Global Toolbar Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            
            {/* Global Date Batch Apply */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-300 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[11px] font-bold text-gray-600">Date par défaut:</span>
              <input
                type="date"
                value={globalDate}
                onChange={e => setGlobalDate(e.target.value)}
                className="text-xs font-bold text-gray-900 border-0 p-0 focus:ring-0 bg-transparent"
              />
              <button
                type="button"
                onClick={handleApplyGlobalDate}
                className="ml-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-blue-700 font-bold"
                title="Appliquer cette date à toutes les lignes"
              >
                Appliquer à tous
              </button>
            </div>

            {/* Global Frigo Batch Apply */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-300 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[11px] font-bold text-gray-600">Frigo par défaut:</span>
              <select
                value={globalFrigoId}
                onChange={e => setGlobalFrigoId(e.target.value)}
                className="text-xs font-bold text-gray-900 border-0 p-0 focus:ring-0 bg-transparent"
              >
                {frigos.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyGlobalFrigo}
                className="ml-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-blue-700 font-bold"
                title="Appliquer ce frigo à toutes les lignes"
              >
                Appliquer à tous
              </button>
            </div>

            {/* Global Company Batch Apply */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-300 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-600">Société:</span>
              <select
                value={globalCompanyId}
                onChange={e => setGlobalCompanyId(e.target.value)}
                className="text-xs font-bold text-gray-900 border-0 p-0 focus:ring-0 bg-transparent"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyGlobalCompany}
                className="ml-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-blue-700 font-bold"
                title="Appliquer cette société à toutes les lignes"
              >
                Appliquer à tous
              </button>
            </div>

          </div>

          {/* Historical Auto-Approval Checkbox */}
          <label className="flex items-center gap-2 bg-emerald-50 text-emerald-950 px-3 py-1.5 rounded-lg border border-emerald-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isHistoricalAutoApprove}
              onChange={e => setIsHistoricalAutoApprove(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-bold">
              ⚡ Valider directement (Bons Historiques livrés sans protocole Frigo)
            </span>
          </label>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-mono text-[11px] uppercase tracking-wider border-b border-gray-300">
                <th className="p-2.5 w-12 text-center">N°</th>
                <th className="p-2.5 w-32">Date</th>
                <th className="p-2.5 min-w-[220px]">Client Destinataire *</th>
                <th className="p-2.5 w-40">Frigo Origine *</th>
                <th className="p-2.5 min-w-[260px]">Produit & Format *</th>
                <th className="p-2.5 w-28 text-center bg-blue-50/50">Stock Dispo</th>
                <th className="p-2.5 w-24 text-center">Colis</th>
                <th className="p-2.5 w-28 text-center bg-amber-50/50">Total Kg *</th>
                <th className="p-2.5 w-24 text-right">Prix HT/Kg</th>
                <th className="p-2.5 w-28 text-right font-bold text-gray-900">Total HT</th>
                <th className="p-2.5 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {rows.map((row, index) => {
                const prd = products.find(p => p.id === row.productId);
                const currentStock = stocks.find(s => s.frigoId === row.frigoId && s.productId === row.productId);
                const availKg = currentStock ? currentStock.quantityKg : 0;
                const isStockSufficient = availKg >= row.quantityKg;

                return (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-blue-50/30 transition-colors ${!isStockSufficient ? 'bg-red-50/40' : ''}`}
                  >
                    {/* Index */}
                    <td className="p-2 text-center font-mono font-bold text-gray-400">
                      #{index + 1}
                    </td>

                    {/* Date */}
                    <td className="p-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={e => handleRowChange(index, 'date', e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded font-mono text-xs font-bold text-gray-800 bg-white"
                      />
                    </td>

                    {/* Client */}
                    <td className="p-2">
                      <SearchableClientSelect
                        clients={clients}
                        value={row.clientId}
                        onChange={val => handleRowChange(index, 'clientId', val)}
                        placeholder="Choisir le client..."
                      />
                    </td>

                    {/* Frigo */}
                    <td className="p-2">
                      <select
                        value={row.frigoId}
                        onChange={e => handleRowChange(index, 'frigoId', e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded text-xs font-bold text-gray-800 bg-white"
                      >
                        {frigos.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Product & Format */}
                    <td className="p-2">
                      <SearchableProductSelect
                        products={products}
                        value={row.productId}
                        onChange={val => handleRowChange(index, 'productId', val)}
                        stocks={stocks}
                        frigoId={row.frigoId}
                        placeholder="Choisir le produit..."
                      />

                      {/* Format quick buttons & custom name */}
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        {[
                          { label: '12k', kg: 12 },
                          { label: '3k', kg: 3 },
                          { label: '2k', kg: 2 },
                          { label: '1k', kg: 1 },
                          { label: '0.5k', kg: 0.5 },
                        ].map(fmt => (
                          <button
                            key={fmt.kg}
                            type="button"
                            onClick={() => handleRowChange(index, 'kgPerCarton', fmt.kg)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                              row.kgPerCarton === fmt.kg 
                                ? 'bg-blue-600 text-white border-blue-700' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                            }`}
                          >
                            {fmt.label}
                          </button>
                        ))}
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={row.kgPerCarton || ''}
                          onChange={e => handleRowChange(index, 'kgPerCarton', e.target.value)}
                          className="w-11 px-1 py-0.5 text-[9px] font-mono font-bold text-center border border-gray-300 rounded bg-white"
                          title="Kg par colis"
                        />
                      </div>

                      <div className="mt-1">
                        <input
                          type="text"
                          value={row.productName}
                          onChange={e => handleRowChange(index, 'productName', e.target.value)}
                          placeholder="Nom sur Bon (ex: Dattes 3kg)..."
                          className="w-full text-[10px] font-bold text-gray-800 border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50/80 focus:bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </td>

                    {/* Stock available live */}
                    <td className="p-2 text-center font-mono">
                      <div className={`px-2 py-1 rounded font-bold text-[11px] ${
                        availKg <= 0
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : availKg < row.quantityKg
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {availKg.toLocaleString()} Kg
                      </div>
                      <div className="text-[9px] text-gray-500 mt-0.5">
                        {isStockSufficient ? '🟢 Dispo' : '🔴 Insuffisant'}
                      </div>
                    </td>

                    {/* Quantity Colis */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.quantityCartons || ''}
                        onChange={e => handleRowChange(index, 'quantityCartons', e.target.value)}
                        className="w-full p-1.5 text-center border border-gray-300 rounded font-mono font-bold text-amber-800 bg-white"
                        placeholder="Colis"
                      />
                    </td>

                    {/* Quantity Kg */}
                    <td className="p-2 bg-amber-50/30">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.quantityKg || ''}
                        onChange={e => handleRowChange(index, 'quantityKg', e.target.value)}
                        className="w-full p-1.5 text-center border border-amber-300 rounded font-mono font-bold text-gray-900 bg-white"
                        placeholder="Kg"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.unitPriceHT || ''}
                        onChange={e => handleRowChange(index, 'unitPriceHT', e.target.value)}
                        className="w-full p-1.5 text-right border border-gray-300 rounded font-mono text-xs font-semibold text-gray-800 bg-white"
                        placeholder="Prix"
                      />
                    </td>

                    {/* Total HT */}
                    <td className="p-2 text-right font-mono font-bold text-gray-900 text-xs">
                      {row.totalHT.toLocaleString()} DH
                    </td>

                    {/* Row Actions */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(index)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Dupliquer cette ligne"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Row Bar */}
        <div className="px-6 py-2 bg-gray-50 border-t border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une ligne de BL</span>
            </button>
            <button
              type="button"
              onClick={() => handleDuplicateRow(rows.length - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Dupliquer dernière ligne</span>
            </button>
          </div>

          {/* Quick Summary Counts */}
          <div className="flex items-center gap-4 text-xs font-mono font-bold text-gray-700">
            <span>Total Lignes : <strong className="text-gray-900">{rows.length} BLs</strong></span>
            <span>Total Colis : <strong className="text-amber-800">{totalCartonsAll.toLocaleString()}</strong></span>
            <span>Poids Total : <strong className="text-blue-700">{totalKgAll.toLocaleString()} Kg</strong></span>
            <span>Montant Global HT : <strong className="text-emerald-700">{totalHTAll.toLocaleString()} DH</strong></span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleValidateAndSubmit}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Valider et Créer les {rows.length} Bon(s) de Livraison</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
