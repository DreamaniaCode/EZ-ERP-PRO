import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { SalesOrder, OrderItem, ProductCategory } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { ShoppingCart, Plus, Search, Filter, Trash2, ArrowUpRight, CheckCircle, Truck } from 'lucide-react';

interface SalesOrdersProps {
  onEditOrder?: (id: string) => void;
  onNewOrder?: () => void;
}

export const SalesOrders: React.FC<SalesOrdersProps> = ({ onEditOrder, onNewOrder }) => {
  const { orders, clients, products, frigos, stocks, createOrder, currentUser } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Order State
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [orderNotes, setOrderNotes] = useState('');

  // Cart items
  const [cartItems, setCartItems] = useState<{
    productId: string;
    frigoId: string;
    quantityKg: number;
    quantityPallets: number;
    unitPriceHT: number;
  }[]>([
    {
      productId: products[0]?.id || '',
      frigoId: frigos[0]?.id || '',
      quantityKg: 800,
      quantityPallets: 1,
      unitPriceHT: products[0]?.sellingPriceHT || 85,
    },
  ]);

  const handleProductSelect = (index: number, productId: string) => {
    const prd = products.find(p => p.id === productId);
    if (!prd) return;
    setCartItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        productId,
        quantityKg: prd.kgPerPallet,
        quantityPallets: 1,
        unitPriceHT: prd.sellingPriceHT,
      };
    }));
  };

  const handleAddItemRow = () => {
    const firstPrd = products[0];
    setCartItems(prev => [
      ...prev,
      {
        productId: firstPrd.id,
        frigoId: frigos[0].id,
        quantityKg: firstPrd.kgPerPallet,
        quantityPallets: 1,
        unitPriceHT: firstPrd.sellingPriceHT,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setCartItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    setCartItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };
      const prd = products.find(p => p.id === updated.productId);
      if (prd && field === 'quantityPallets') {
        updated.quantityKg = Number(value) * prd.kgPerPallet;
      }
      return updated;
    }));
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClientId);
    if (!client || cartItems.length === 0) return;

    const items: OrderItem[] = cartItems.map(cit => {
      const prd = products.find(p => p.id === cit.productId)!;
      const totalHT = cit.quantityKg * cit.unitPriceHT;
      const vatRate = prd.vatRate;
      const totalTTC = totalHT * (1 + vatRate);

      return {
        productId: prd.id,
        productCode: prd.code,
        productName: prd.name,
        category: prd.category,
        frigoId: cit.frigoId,
        quantityKg: Number(cit.quantityKg),
        quantityPallets: Number(cit.quantityPallets),
        unitPriceHT: Number(cit.unitPriceHT),
        vatRate,
        totalHT,
        totalTTC,
        unitCostHT: prd.unitCostHT,
      };
    });

    const newOrder = createOrder({
      clientId: client.id,
      clientName: client.companyName || client.name,
      clientICE: client.ice,
      clientPhone: client.phone,
      clientEmail: client.email,
      date: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate,
      items,
      notes: orderNotes,
      createdByName: currentUser.name,
    });

    setShowAddModal(false);
    alert(`Commande N° ${newOrder.orderNumber} créée avec succès ! Bons de Livraison (BL) générés et ventilés par Frigo.`);
  };

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-4 border border-[#393939] text-white">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-wide flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#0f62fe]" />
            Commandes Ventes & Calculateur de Marge Brute
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Création de Devis/Commandes, Affectation Multi-Frigos par Article et Génération Automatique des BLs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons 
            filename="Commandes_De_Vente"
            title="Registre des Commandes Ventes & Marges Brutes"
            excelData={orders.map(o => ({
              'N° Commande': o.orderNumber,
              'Client': o.clientName,
              'Date Commande': o.date,
              'Date Livraison': o.expectedDeliveryDate,
              'Poids Total (Kg)': o.totalKg,
              'Total Palettes': o.totalPallets,
              'Chiffre d\'Affaires HT (DH)': o.totalHT,
              'Coût de Revient HT (DH)': o.totalCostHT,
              'Marge Brute HT (DH)': o.marginHT || o.grossMarginHT || 0,
              'Marge %': `${(o.marginPct ?? o.marginPercentage ?? 0).toFixed(1)}%`,
              'Statut BL': o.blGenerated ? 'BL Généré' : 'En Attente BL',
            }))}
          />
          <button
            onClick={() => onNewOrder ? onNewOrder() : setShowAddModal(true)}
            className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
          >
            <Plus className="w-4 h-4" />
            Saisir une Nouvelle Commande
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="carbon-card p-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher Commande N°, Client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full carbon-input pl-9 text-xs font-mono"
          />
        </div>
      </div>

      {/* Orders List Table */}
      <div className="carbon-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="carbon-table">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Client</th>
                <th>Date</th>
                <th>Tonnage & Palettes</th>
                <th>Total HT</th>
                <th>Total TTC</th>
                <th>Marge Brute HT</th>
                <th>Marge %</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(ord => (
                <tr key={ord.id}>
                  <td className="font-mono font-bold text-[#0f62fe]">{ord.orderNumber}</td>
                  <td>
                    <div className="font-bold text-gray-900">{ord.clientName}</div>
                    <div className="text-[10px] text-gray-500 font-mono">ICE: {ord.clientICE}</div>
                  </td>
                  <td className="font-mono text-xs text-gray-700">{ord.date}</td>
                  <td className="font-mono text-xs">
                    {ord.items.reduce((acc, i) => acc + i.quantityKg, 0).toLocaleString()} Kg 
                    <div className="text-gray-500">{ord.items.reduce((acc, i) => acc + i.quantityPallets, 0)} Palettes</div>
                  </td>
                  <td className="font-mono font-bold text-gray-900">{ord.totalHT.toLocaleString()} DH</td>
                  <td className="font-mono text-gray-700">{ord.totalTTC.toLocaleString()} DH</td>
                  <td className="font-mono font-bold text-emerald-600">
                    +{ord.grossMarginHT.toLocaleString()} DH
                  </td>
                  <td className="font-mono">
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      {ord.marginPercentage}%
                    </span>
                  </td>
                  <td>
                    <span className="text-xs px-2 py-0.5 font-mono font-bold rounded bg-blue-100 text-blue-800">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 w-full max-w-4xl rounded shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="bg-[#161616] text-white px-4 py-3 flex justify-between items-center border-b border-[#393939] shrink-0">
              <h3 className="font-bold text-sm font-mono uppercase flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#0f62fe]" />
                Création Nouvelle Commande Client & Ventilation Multi-Frigos
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="p-5 space-y-4 overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sélectionner le Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full carbon-input font-bold"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.companyName}) - Solde: {c.currentBalance.toLocaleString()} DH</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date de Livraison Souhaitée</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={e => setExpectedDeliveryDate(e.target.value)}
                    className="w-full carbon-input font-mono"
                  />
                </div>
              </div>

              {/* Order Items Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-bold text-gray-900 uppercase">Articles de la Commande & Affectation des Frigos</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-[#0f62fe] font-bold hover:underline flex items-center gap-1"
                  >
                    + Ajouter une Ligne Produit
                  </button>
                </div>

                <div className="space-y-2">
                  {cartItems.map((item, idx) => {
                    const prd = products.find(p => p.id === item.productId);
                    const stockAvail = stocks
                      .filter(s => s.productId === item.productId && s.frigoId === item.frigoId)
                      .reduce((acc, s) => acc + s.quantityKg, 0);

                    const lineHT = item.quantityKg * item.unitPriceHT;
                    const lineCost = item.quantityKg * (prd ? prd.unitCostHT : 0);
                    const lineMargin = lineHT - lineCost;

                    return (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-300 rounded grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-gray-500 uppercase font-semibold">Produit</label>
                          <select
                            value={item.productId}
                            onChange={e => handleProductSelect(idx, e.target.value)}
                            className="w-full carbon-input text-xs font-mono font-bold"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-gray-500 uppercase font-semibold">Frigo d'Expédition</label>
                          <select
                            value={item.frigoId}
                            onChange={e => handleRowChange(idx, 'frigoId', e.target.value)}
                            className="w-full carbon-input text-xs"
                          >
                            {frigos.map(f => (
                              <option key={f.id} value={f.id}>{f.name.split('-')[0].trim()}</option>
                            ))}
                          </select>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">Dispo: {stockAvail.toLocaleString()} kg</div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 uppercase font-semibold">Palettes</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantityPallets}
                            onChange={e => handleRowChange(idx, 'quantityPallets', Number(e.target.value))}
                            className="w-full carbon-input font-mono text-xs font-bold"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 uppercase font-semibold">Prix HT / Kg</label>
                          <input
                            type="number"
                            step="0.5"
                            value={item.unitPriceHT}
                            onChange={e => handleRowChange(idx, 'unitPriceHT', Number(e.target.value))}
                            className="w-full carbon-input font-mono text-xs font-bold text-blue-700"
                          />
                        </div>

                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            disabled={cartItems.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="sm:col-span-12 flex justify-between text-[11px] font-mono text-gray-600 border-t border-gray-200 pt-1">
                          <span>Total Kg: <b>{item.quantityKg.toLocaleString()} Kg</b></span>
                          <span>Total HT: <b>{lineHT.toLocaleString()} DH</b></span>
                          <span className="text-emerald-700 font-bold">Marge Ligne: +{lineMargin.toLocaleString()} DH</span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="carbon-btn-primary text-xs flex items-center gap-1.5 rounded"
                >
                  <Truck className="w-4 h-4" /> Valider Commande & Générer BLs
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
