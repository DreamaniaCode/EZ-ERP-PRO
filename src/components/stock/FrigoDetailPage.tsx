import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product } from '../../types';
import { ExportButtons } from '../common/ExportButtons';
import { ProductKpiCardsSection } from './ProductKpiCardsSection';
import { ProductStockHistoryModal } from './ProductStockHistoryModal';
import { EditPurchaseInvoiceModal } from '../purchases/EditPurchaseInvoiceModal';
import { PurchaseImportInvoice } from '../../types';
import { 
  compileUnifiedFrigoMovements, 
  calculateProductAccumulation 
} from '../../utils/frigoStockMovements';
import { 
  ArrowLeft, 
  Warehouse, 
  Package, 
  UserCheck, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Phone, 
  MapPin,
  MessageSquare,
  ExternalLink,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  History,
  RotateCcw,
  Pencil
} from 'lucide-react';

interface FrigoDetailPageProps {
  frigoId: string;
  onBack: () => void;
}

export const FrigoDetailPage: React.FC<FrigoDetailPageProps> = ({ frigoId, onBack }) => {
  const { 
    frigos, 
    stocks, 
    products, 
    deliveryNotes, 
    purchaseInvoices,
    inventoryCounts,
    stockMovements,
    clients 
  } = useERP();

  const [selectedProductId, setSelectedProductId] = useState<string | 'ALL'>('ALL');
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState<PurchaseImportInvoice | null>(null);

  const frigo = frigos.find(f => f.id === frigoId) || frigos[0];

  // 1. Unified movements for this frigo
  const frigoMovements = useMemo(() => {
    if (!frigo) return [];
    return compileUnifiedFrigoMovements({
      frigos,
      products,
      stocks,
      deliveryNotes,
      purchaseInvoices,
      inventoryCounts,
      stockMovements,
      targetFrigoId: frigo.id,
      targetProductId: 'ALL'
    });
  }, [frigos, products, stocks, deliveryNotes, purchaseInvoices, inventoryCounts, stockMovements, frigo]);

  // 2. Product accumulation for this frigo
  const productSummaries = useMemo(() => {
    if (!frigo) return [];
    return calculateProductAccumulation({
      products,
      stocks,
      movements: frigoMovements,
      frigos,
      targetFrigoId: frigo.id
    });
  }, [products, stocks, frigoMovements, frigos, frigo]);

  // Filtered movements if a product card is clicked
  const filteredMovements = useMemo(() => {
    if (selectedProductId === 'ALL') return frigoMovements;
    return frigoMovements.filter(m => m.productId === selectedProductId || m.productCode === selectedProductId);
  }, [frigoMovements, selectedProductId]);

  // Filtered product summaries if a product card is clicked
  const filteredProductSummaries = useMemo(() => {
    if (selectedProductId === 'ALL') return productSummaries;
    return productSummaries.filter(p => p.productId === selectedProductId);
  }, [productSummaries, selectedProductId]);

  if (!frigo) {
    return (
      <div className="p-8 text-center bg-white border rounded-xl shadow-xs">
        <p className="text-gray-500 text-sm">Entrepôt Frigorifique introuvable.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-[#0f62fe] text-white rounded-lg text-xs font-bold">
          Retour aux Frigos
        </button>
      </div>
    );
  }

  // Delivery Notes strictly for this frigo
  const frigoBLs = deliveryNotes.filter(bl => 
    bl.frigoId === frigo.id || 
    bl.frigoName === frigo.name ||
    (frigo.name && bl.frigoName && bl.frigoName.trim().toLowerCase() === frigo.name.trim().toLowerCase())
  );

  // Group BLs by genuine distinct client
  const clientVolumeMap: { [key: string]: { name: string; kg: number; totalHT: number; count: number; clientId?: string } } = {};
  frigoBLs.forEach(bl => {
    const rawName = (bl.clientName || '').trim();
    const matchedClient = (clients || []).find(c =>
      (bl.clientId && c.id === bl.clientId) ||
      (c.name && rawName && (c.name.trim().toLowerCase() === rawName.toLowerCase() || rawName.toLowerCase().includes(c.name.trim().toLowerCase())))
    );

    const clientKey = matchedClient ? matchedClient.id : (rawName ? rawName.toUpperCase() : (bl.clientId || 'CLIENT_DIVERS'));
    const displayName = matchedClient ? (matchedClient.companyName || matchedClient.name) : (rawName || 'Client Divers');

    if (!clientVolumeMap[clientKey]) {
      clientVolumeMap[clientKey] = { 
        name: displayName, 
        kg: 0, 
        totalHT: 0, 
        count: 0,
        clientId: matchedClient?.id || bl.clientId
      };
    }
    clientVolumeMap[clientKey].kg += (bl.totalKg || 0);
    clientVolumeMap[clientKey].totalHT += (bl.totalHT || 0);
    clientVolumeMap[clientKey].count += 1;
  });

  const distinctClientsCount = Object.keys(clientVolumeMap).length;

  // Totals for this frigo
  const totalFrigoKg = productSummaries.reduce((sum, s) => sum + s.currentStockKg, 0);
  const totalFrigoPallets = productSummaries.reduce((sum, s) => sum + s.currentStockPallets, 0);
  const totalFrigoValuationHT = productSummaries.reduce((sum, s) => sum + s.totalValuationCostHT, 0);
  const totalFrigoVenteHT = productSummaries.reduce((sum, s) => sum + s.totalValuationSaleHT, 0);

  return (
    <div className="space-y-6 animate-in fade-in bg-[#f4f4f4] min-h-screen p-4 md:p-6" id="frigo-detail-page">
      
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-gray-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-2 bg-gray-100 hover:bg-[#0f62fe] hover:text-white border border-gray-300 text-gray-800 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Frigos</span>
          </button>
          <span className="text-gray-300">|</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#0f62fe] px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                {frigo.code}
              </span>
              <h1 className="text-lg font-bold text-gray-900">{frigo.name}</h1>
            </div>
            <p className="text-xs text-gray-500 font-mono">Fiche Complète Entrepôt Frigorifique • Situation Stocks & Flux Quai</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons
            filename={`Situation_Frigo_${frigo.code}_${frigo.name.replace(/\s+/g, '_')}`}
            title={`SITUATION FRIGO LOGISTIQUE & VALORISATION - ${frigo.name.toUpperCase()} (${frigo.code})`}
            frigoName={frigo.name}
            excelData={filteredProductSummaries.map(p => ({
              'Code Frigo': frigo.code,
              'Nom Frigo': frigo.name,
              'Emplacement': frigo.location,
              'Code Produit': p.productCode,
              'Désignation Produit': p.productName,
              'Catégorie': p.category,
              'Cumul Entrées (Kg)': p.totalEntriesKg,
              'Cumul Sorties (Kg)': p.totalExitsKg,
              'Stock Restant (Kg)': p.currentStockKg,
              'Palettes': p.currentStockPallets,
              'Prix Revient HT': p.unitCostHT,
              'Prix Vente HT': p.sellingPriceHT,
              'Valorisation Coût HT (DH)': p.totalValuationCostHT,
              'Valorisation Vente HT (DH)': p.totalValuationSaleHT,
              'Dernier Mouvement': `${p.lastMovementDate || '-'} ${p.lastMovementTime || ''}`
            }))}
            pdfElementId="frigo-detail-page"
          />
        </div>
      </div>

      {/* Metadata Banner */}
      <div className="bg-[#161616] text-white p-5 rounded-xl border border-[#393939] shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Emplacement & Ville</div>
          <div className="font-bold text-sm text-white mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0f62fe]" />
            {frigo.location}
          </div>
        </div>

        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Responsable Quai / Contact</div>
          <div className="font-bold text-sm text-white mt-0.5 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-emerald-400" />
            {frigo.managerName || 'Non Assigné'} ({frigo.managerPhone || '-'})
          </div>
        </div>

        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Capacité Frigo (Palettes)</div>
          <div className="font-bold text-sm text-purple-300 mt-0.5">
            {totalFrigoPallets} / {frigo.capacityPallets} Pal. ({frigo.capacityPallets > 0 ? Math.round((totalFrigoPallets / frigo.capacityPallets) * 100) : 0}% Occupé)
          </div>
        </div>

        <div>
          <div className="text-gray-400 text-[10px] uppercase font-bold">Sorties / Clientèle</div>
          <div className="font-bold text-sm text-blue-300 mt-0.5">
            {distinctClientsCount} Clients ({frigoBLs.length} BLs émis)
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLICKABLE PRODUCT KPI CARDS BAR (SPECIFIC TO THIS FRIGO)                  */}
      {/* ========================================================================= */}
      <ProductKpiCardsSection
        productSummaries={productSummaries}
        selectedProductId={selectedProductId}
        onSelectProduct={(pId) => setSelectedProductId(pId)}
        onOpenProductHistory={(prd) => setSelectedProductForHistory(prd)}
        products={products}
        warehouseName={frigo.name}
      />

      {/* SECTION 1: Product Stock & Detailed Financial Valuation with Accumulation */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2 text-[#0f62fe]">
              <Boxes className="w-4 h-4" />
              1. Cumul par Produit & Valorisation Financière du Stock ({frigo.name})
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Cumul des entrées, sorties et stock net restant pour chaque référence
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#0f62fe] rounded text-xs font-mono font-bold">
              {filteredProductSummaries.length} Référence{filteredProductSummaries.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {filteredProductSummaries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
            Aucun produit ne correspond au filtre sélectionné pour cet entrepôt.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="carbon-table text-xs">
              <thead>
                <tr>
                  <th>Code SKU</th>
                  <th>Désignation Produit</th>
                  <th>Catégorie</th>
                  <th className="text-right text-emerald-800 bg-emerald-50/50">Cumul Entrées (Kg)</th>
                  <th className="text-right text-rose-800 bg-rose-50/50">Cumul Sorties (Kg)</th>
                  <th className="text-right font-black text-blue-900 bg-blue-50/50">Stock Restant (Kg)</th>
                  <th className="text-right">Palettes</th>
                  <th className="text-right">Colis</th>
                  <th className="text-right">Prix Revient (HT)</th>
                  <th className="text-right">Prix Vente (HT)</th>
                  <th className="text-right">Valorisation Coût HT</th>
                  <th className="text-right">Valorisation Vente HT</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductSummaries.map(p => {
                  const rawPrd = products.find(prod => prod.id === p.productId);

                  return (
                    <tr key={p.productId} className="hover:bg-blue-50/30 transition-colors">
                      <td className="font-mono font-bold text-[#0f62fe]">{p.productCode}</td>
                      <td className="font-semibold text-gray-900">{p.productName}</td>
                      <td className="text-gray-500">{p.category}</td>
                      <td className="text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                        +{p.totalEntriesKg.toLocaleString()} Kg
                      </td>
                      <td className="text-right font-mono font-bold text-rose-700 bg-rose-50/30">
                        -{p.totalExitsKg.toLocaleString()} Kg
                      </td>
                      <td className="text-right font-mono font-black text-gray-900 bg-blue-50/30 text-sm">
                        {p.currentStockKg.toLocaleString()} Kg
                      </td>
                      <td className="text-right font-mono font-bold text-purple-700">{p.currentStockPallets} Pal.</td>
                      <td className="text-right font-mono text-gray-600">{p.currentStockCartons.toLocaleString()} Colis</td>
                      <td className="text-right font-mono text-gray-600">{p.unitCostHT?.toLocaleString()} DH</td>
                      <td className="text-right font-mono text-blue-700">{p.sellingPriceHT?.toLocaleString()} DH</td>
                      <td className="text-right font-mono font-bold text-purple-700">{p.totalValuationCostHT.toLocaleString()} DH</td>
                      <td className="text-right font-mono font-bold text-emerald-700">{p.totalValuationSaleHT.toLocaleString()} DH</td>
                      <td className="text-center">
                        {rawPrd && (
                          <button
                            type="button"
                            onClick={() => setSelectedProductForHistory(rawPrd)}
                            className="p-1 text-gray-400 hover:text-[#0f62fe] hover:bg-blue-50 rounded transition-colors"
                            title="Historique chronologique"
                          >
                            <History className="w-4 h-4" />
                          </button>
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

      {/* SECTION 2: Chronological Movement Feed (Date, Heure, Quantités) */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2 text-indigo-700">
              <Clock className="w-4 h-4" />
              2. Journal Détaillé des Flux & Mouvements Quai (Date & Heure)
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Historique précis de toutes les entrées et sorties pour l'entrepôt {frigo.name}
            </p>
          </div>
          <span className="text-gray-500 font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded">
            {filteredMovements.length} Mouvement(s)
          </span>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="p-8 text-center text-gray-400 italic border border-dashed rounded-lg">
            Aucun mouvement enregistré pour les filtres sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="carbon-table text-xs">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Flux / Type</th>
                  <th>N° Document</th>
                  <th>Produit</th>
                  <th className="text-right">Impact Quantité</th>
                  <th className="text-right">Palettes</th>
                  <th>Tiers / Opérateur</th>
                  <th>Statut Quai</th>
                  <th>Bon Sortie Photo</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="font-mono font-semibold text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{m.date}</span>
                      </div>
                    </td>

                    <td className="font-mono text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold w-max">
                        <Clock className="w-3 h-3 text-[#0f62fe]" />
                        <span>{m.time}</span>
                      </div>
                    </td>

                    <td>
                      {m.isEntry ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-300">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                          ENTRÉE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-300">
                          <ArrowUpRight className="w-3 h-3 text-rose-700" />
                          SORTIE
                        </span>
                      )}
                    </td>

                    <td className="font-mono font-bold text-[#0f62fe] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{m.documentRef}</span>
                        {m.purchaseInvoiceId && (
                          <button
                            onClick={() => {
                              const pur = purchaseInvoices.find(p => p.id === m.purchaseInvoiceId);
                              if (pur) setEditingPurchaseInvoice(pur);
                            }}
                            className="px-1.5 py-0.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer"
                            title="Modifier cette facture d'achat"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Modifier</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="font-bold text-gray-900 line-clamp-1">{m.productName}</div>
                      <div className="text-[10px] font-mono text-gray-500">{m.productCode}</div>
                    </td>

                    <td className="text-right font-mono font-bold whitespace-nowrap">
                      <span className={m.isEntry ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                        {m.signedKg > 0 ? `+${m.signedKg.toLocaleString()}` : m.signedKg.toLocaleString()} Kg
                      </span>
                    </td>

                    <td className="text-right font-mono text-gray-700">
                      {m.signedPallets > 0 ? `+${m.signedPallets}` : m.signedPallets} Pal.
                    </td>

                    <td className="text-gray-800 font-medium">
                      {m.partyName}
                    </td>

                    <td>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                        ✓ {m.performedBy || 'Validé'}
                      </span>
                    </td>

                    <td>
                      {m.photoUrl ? (
                        <span className="text-emerald-700 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          <span>Photo dispo</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono text-[10px]">Non jointe</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: Client Withdrawals Summary */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3 text-xs">
        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center justify-between border-b pb-2">
          <span className="flex items-center gap-2 text-amber-700">
            <UserCheck className="w-4 h-4" />
            3. Synthèse des Clients Ayant Retiré la Marchandise de ce Frigo
          </span>
          <span className="text-gray-500 font-mono text-xs">{Object.keys(clientVolumeMap).length} Client(s)</span>
        </h3>

        {Object.keys(clientVolumeMap).length === 0 ? (
          <div className="p-6 text-center text-gray-400 italic">Aucune sortie client enregistrée pour ce frigo.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="carbon-table text-xs">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="text-center">Bons de Sortie Émis</th>
                  <th className="text-right">Cumul Poids Retiré (Kg)</th>
                  <th className="text-right">Valeur Totale Sortie (HT)</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(clientVolumeMap).map((cl, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-gray-900">{cl.name}</td>
                    <td className="text-center font-mono font-bold text-blue-700">{cl.count} BLs</td>
                    <td className="text-right font-mono font-bold text-emerald-700">{cl.kg.toLocaleString()} Kg</td>
                    <td className="text-right font-mono font-bold text-gray-900">{cl.totalHT.toLocaleString()} DH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chronological Detailed Product Movement History Modal */}
      {selectedProductForHistory && (
        <ProductStockHistoryModal
          product={selectedProductForHistory}
          isOpen={!!selectedProductForHistory}
          onClose={() => setSelectedProductForHistory(null)}
        />
      )}

      {/* Edit Purchase Invoice Modal */}
      {editingPurchaseInvoice && (
        <EditPurchaseInvoiceModal
          invoice={editingPurchaseInvoice}
          onClose={() => setEditingPurchaseInvoice(null)}
        />
      )}

    </div>
  );
};
