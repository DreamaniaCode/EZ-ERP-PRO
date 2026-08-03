import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { NavTab } from '../layout/Sidebar';
import { 
  Search, 
  X, 
  Truck, 
  FileText, 
  Users, 
  Package, 
  Building2, 
  Warehouse, 
  Landmark, 
  Receipt, 
  ShoppingCart,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { 
    deliveryNotes, 
    invoices, 
    clients, 
    suppliers, 
    products, 
    orders, 
    frigos, 
    chequesEffets, 
    expenses 
  } = useERP();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'BL' | 'INVOICE' | 'CLIENT' | 'PRODUCT' | 'FRIGO' | 'CHEQUE'>('ALL');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open search handled by parent or state
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search Results Compilation
  const matchedBLs = !q ? [] : deliveryNotes.filter(b => 
    b.blNumber.toLowerCase().includes(q) ||
    b.clientName.toLowerCase().includes(q) ||
    b.frigoName.toLowerCase().includes(q) ||
    b.orderNumber.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedInvoices = !q ? [] : invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(q) ||
    i.clientName.toLowerCase().includes(q) ||
    i.clientICE.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedClients = !q ? [] : clients.filter(c => 
    c.name.toLowerCase().includes(q) ||
    c.companyName.toLowerCase().includes(q) ||
    c.ice.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.phone.toLowerCase().includes(q) ||
    c.city.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedProducts = !q ? [] : products.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.code.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.origin.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedFrigos = !q ? [] : frigos.filter(f => 
    f.name.toLowerCase().includes(q) ||
    f.code.toLowerCase().includes(q) ||
    f.location.toLowerCase().includes(q) ||
    f.managerName.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedCheques = !q ? [] : chequesEffets.filter(c => 
    c.referenceNumber.toLowerCase().includes(q) ||
    c.partyName.toLowerCase().includes(q) ||
    c.bankName.toLowerCase().includes(q)
  ).slice(0, 5);

  const totalResultsCount = 
    matchedBLs.length + 
    matchedInvoices.length + 
    matchedClients.length + 
    matchedProducts.length + 
    matchedFrigos.length + 
    matchedCheques.length;

  const handleSelectResult = (tab: NavTab) => {
    onNavigate(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white rounded-xl border border-gray-300 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Bar Input Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#0f62fe] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Rechercher tout dans l'ERP (BL, Client, Produit, Facture, Frigo, Chèque)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded font-mono shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Filter Category Pills */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              activeCategory === 'ALL' ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tout ({totalResultsCount})
          </button>

          <button
            onClick={() => setActiveCategory('BL')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              activeCategory === 'BL' ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            BLs ({matchedBLs.length})
          </button>

          <button
            onClick={() => setActiveCategory('CLIENT')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              activeCategory === 'CLIENT' ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Clients ({matchedClients.length})
          </button>

          <button
            onClick={() => setActiveCategory('PRODUCT')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              activeCategory === 'PRODUCT' ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Produits ({matchedProducts.length})
          </button>

          <button
            onClick={() => setActiveCategory('INVOICE')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              activeCategory === 'INVOICE' ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Factures ({matchedInvoices.length})
          </button>

          <button
            onClick={() => setActiveCategory('FRIGO')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              activeCategory === 'FRIGO' ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Frigos ({matchedFrigos.length})
          </button>
        </div>

        {/* Results List View */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {!query && (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Search className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-medium">Tapez un numéro de BL, un nom de client, un frigo, ou un produit...</p>
              <p className="text-[11px] text-gray-400">Raccourci clavier: <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded font-mono">K</kbd></p>
            </div>
          )}

          {query && totalResultsCount === 0 && (
            <div className="py-12 text-center text-gray-500">
              <p className="font-bold text-sm text-gray-700">Aucun résultat trouvé pour "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Vérifiez l'orthographe ou essayez d'autres mots-clés.</p>
            </div>
          )}

          {/* BLs Results */}
          {(activeCategory === 'ALL' || activeCategory === 'BL') && matchedBLs.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-gray-500 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#0f62fe]" />
                <span>Bons de Livraison ({matchedBLs.length})</span>
              </div>
              <div className="space-y-1">
                {matchedBLs.map(bl => (
                  <div
                    key={bl.id}
                    onClick={() => handleSelectResult('DELIVERY_NOTES')}
                    className="p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="font-mono font-bold text-[#0f62fe]">{bl.blNumber}</div>
                      <div className="font-semibold text-gray-800">{bl.clientName}</div>
                      <div className="text-[10px] text-gray-500">{bl.frigoName} • {bl.date} • {bl.totalKg.toLocaleString()} Kg</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {bl.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clients Results */}
          {(activeCategory === 'ALL' || activeCategory === 'CLIENT') && matchedClients.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-gray-500 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Clients ({matchedClients.length})</span>
              </div>
              <div className="space-y-1">
                {matchedClients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectResult('CLIENTS')}
                    className="p-2.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="font-bold text-gray-900">{c.name} <span className="text-gray-500 font-mono text-[10px]">({c.code})</span></div>
                      <div className="text-gray-600 text-[11px]">ICE: {c.ice} • Ville: {c.city}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        Solde: {c.currentBalance.toLocaleString()} DH
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Results */}
          {(activeCategory === 'ALL' || activeCategory === 'PRODUCT') && matchedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-gray-500 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-purple-600" />
                <span>Produits Catalog ({matchedProducts.length})</span>
              </div>
              <div className="space-y-1">
                {matchedProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectResult('PRODUCTS_STOCK')}
                    className="p-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="font-mono font-bold text-purple-700">{p.code}</div>
                      <div className="font-bold text-gray-900">{p.name}</div>
                      <div className="text-[10px] text-gray-500">{p.category} • Origine: {p.origin}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-800">
                        {p.sellingPriceHT} DH/Kg HT
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices Results */}
          {(activeCategory === 'ALL' || activeCategory === 'INVOICE') && matchedInvoices.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-gray-500 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Factures Clients ({matchedInvoices.length})</span>
              </div>
              <div className="space-y-1">
                {matchedInvoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectResult('INVOICING')}
                    className="p-2.5 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 rounded flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="font-mono font-bold text-amber-700">{inv.invoiceNumber}</div>
                      <div className="font-bold text-gray-900">{inv.clientName}</div>
                      <div className="text-[10px] text-gray-500">{inv.date} • Statut: {inv.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-900">
                        {inv.totalTTC.toLocaleString()} DH TTC
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frigos Results */}
          {(activeCategory === 'ALL' || activeCategory === 'FRIGO') && matchedFrigos.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-gray-500 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                <span>Entrepôts Frigo ({matchedFrigos.length})</span>
              </div>
              <div className="space-y-1">
                {matchedFrigos.map(f => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectResult('FRIGO_MANAGEMENT')}
                    className="p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="font-mono font-bold text-blue-700">{f.code}</div>
                      <div className="font-bold text-gray-900">{f.name}</div>
                      <div className="text-[10px] text-gray-500">{f.location} • Resp: {f.managerName} ({f.managerPhone})</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-700">
                        Capacité: {f.capacityPallets} Pal.
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 flex items-center justify-between">
          <span>Cliquez sur un élément pour y accéder directement</span>
          <span className="font-mono">Total {totalResultsCount} correspondances</span>
        </div>
      </div>
    </div>
  );
};
