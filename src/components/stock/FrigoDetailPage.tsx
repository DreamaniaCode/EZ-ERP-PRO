import React from 'react';
import { useERP } from '../../context/ERPContext';
import { ExportButtons } from '../common/ExportButtons';
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
  ExternalLink
} from 'lucide-react';

interface FrigoDetailPageProps {
  frigoId: string;
  onBack: () => void;
}

export const FrigoDetailPage: React.FC<FrigoDetailPageProps> = ({ frigoId, onBack }) => {
  const { frigos, stocks, products, deliveryNotes, reconcileStocksWithBLs } = useERP();
  const [syncToast, setSyncToast] = React.useState<string | null>(null);

  const frigo = frigos.find(f => f.id === frigoId) || frigos[0];

  if (!frigo) {
    return (
      <div className="p-8 text-center bg-white border rounded">
        <p className="text-gray-500 text-sm">Entrepôt Frigorifique introuvable.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-[#0f62fe] text-white rounded text-xs font-bold">
          Retour aux Frigos
        </button>
      </div>
    );
  }

  // Only show stocks that have a real product in the catalog — no 'Produit Inconnu'
  const frigoStocks = stocks.filter(s =>
    (s.frigoId === frigo.id || s.frigoId === frigo.code || s.frigoId === frigo.name || (frigo.name && s.frigoId?.toLowerCase().includes('ain rabat'))) &&
    s.quantityKg > 0 &&
    products.some(p => p.id === s.productId || p.code === s.productId || p.id.toLowerCase() === s.productId.toLowerCase())
  );
  const frigoBLs = deliveryNotes.filter(bl => bl.frigoId === frigo.id || bl.frigoName === frigo.name);

  // Client breakdown
  const clientVolumeMap: { [key: string]: { name: string; kg: number; totalHT: number; count: number } } = {};
  frigoBLs.forEach(bl => {
    const key = bl.clientId || bl.clientName || 'client-inconnu';
    if (!clientVolumeMap[key]) {
      clientVolumeMap[key] = { name: bl.clientName || 'Client Inconnu', kg: 0, totalHT: 0, count: 0 };
    }
    clientVolumeMap[key].kg += (bl.totalKg || 0);
    clientVolumeMap[key].totalHT += (bl.totalHT || 0);
    clientVolumeMap[key].count += 1;
  });


  // Totals
  const totalFrigoKg = frigoStocks.reduce((sum, s) => sum + s.quantityKg, 0);
  const totalFrigoPallets = frigoStocks.reduce((sum, s) => sum + s.quantityPallets, 0);

  const totalFrigoValuationHT = frigoStocks.reduce((sum, stk) => {
    const prd = products.find(p => p.id === stk.productId);
    return sum + (stk.quantityKg * (prd?.unitCostHT || 0));
  }, 0);

  const totalFrigoVenteHT = frigoStocks.reduce((sum, stk) => {
    const prd = products.find(p => p.id === stk.productId);
    return sum + (stk.quantityKg * (prd?.sellingPriceHT || 0));
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in bg-[#f4f4f4] min-h-screen p-4 md:p-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-gray-200 rounded shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-2 bg-gray-100 hover:bg-[#0f62fe] hover:text-white border border-gray-300 text-gray-800 text-xs font-bold rounded flex items-center gap-2 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la liste des frigos</span>
          </button>
          <span className="text-gray-300">|</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#0f62fe] px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                {frigo.code}
              </span>
              <h1 className="text-lg font-bold text-gray-900">{frigo.name}</h1>
            </div>
            <p className="text-xs text-gray-500 font-mono">Fiche Complète Entrepôt Frigorifique • Valorisation & Quai</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons
            filename={`Situation_Frigo_${frigo.code}_${frigo.name.replace(/\s+/g, '_')}`}
            title={`SITUATION FRIGO LOGISTIQUE & VALORISATION - ${frigo.name.toUpperCase()} (${frigo.code})`}
            frigoName={frigo.name}
            excelData={frigoStocks.map(stk => {
              const prd = products.find(p => p.id === stk.productId);
              const valHT = stk.quantityKg * (prd?.unitCostHT || 0);
              const valVenteHT = stk.quantityKg * (prd?.sellingPriceHT || 0);
              return {
                'Code Frigo': frigo.code,
                'Nom Frigo': frigo.name,
                'Emplacement': frigo.location,
                'Code Produit': prd?.code || 'PRD',
                'Désignation Produit': prd?.name || 'Inconnu',
                'Catégorie': prd?.category || '-',
                'Poids Stocké (Kg)': stk.quantityKg,
                'Nombre Palettes': stk.quantityPallets,
                'Prix Revient Unitaire HT': prd?.unitCostHT || 0,
                'Prix Vente Unitaire HT': prd?.sellingPriceHT || 0,
                'Valorisation Coût HT (DH)': valHT,
                'Valorisation Vente HT (DH)': valVenteHT,
              };
            })}
          />
        </div>
      </div>

      {/* Overview Metadata Banner */}
      <div className="bg-[#161616] text-white p-5 rounded-lg border border-[#393939] shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
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
            {totalFrigoPallets} / {frigo.capacityPallets} Palettes ({frigo.capacityPallets > 0 ? Math.round((totalFrigoPallets / frigo.capacityPallets) * 100) : 0}% Occupé)
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-[10px] font-bold uppercase">Poids Total Stocké</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{totalFrigoKg.toLocaleString()} Kg</div>
          <div className="text-gray-500 text-[11px] mt-1">{totalFrigoPallets} Palettes occupées</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-[10px] font-bold uppercase">Valorisation Coût (HT)</div>
          <div className="text-xl font-bold text-purple-700 mt-1">{totalFrigoValuationHT.toLocaleString()} MAD</div>
          <div className="text-purple-600 text-[11px] mt-1">Valorisation au prix de revient</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-[10px] font-bold uppercase">Valeur de Vente (HT)</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{totalFrigoVenteHT.toLocaleString()} MAD</div>
          <div className="text-emerald-600 text-[11px] mt-1">Valeur marchande théorique</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-[10px] font-bold uppercase">Clientèle Desservie</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{Object.keys(clientVolumeMap).length} Clients</div>
          <div className="text-blue-600 text-[11px] mt-1">{frigoBLs.length} Bons de sortie émis</div>
        </div>
      </div>

      {/* SECTION 1: Product Stock & Detailed Financial Valuation */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2 text-[#0f62fe]">
            <Package className="w-4 h-4" />
            1. État du Stock Physique Réel & Valorisation Financière Précise
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const res = reconcileStocksWithBLs(frigo.id);
                setSyncToast(`✓ Déduction appliquée: ${res.deductedKg.toLocaleString()} Kg déduits sur ${res.blCount} BLs !`);
                setTimeout(() => setSyncToast(null), 5000);
              }}
              className="px-3 py-1.5 bg-[#0f62fe] hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Déduire automatiquement toutes les sorties de BLs du stock de ce frigo"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>⚡ Appliquer Déduction Sorties BLs (-{frigoBLs.reduce((sum, b) => sum + (b.totalKg || 0), 0).toLocaleString()} Kg)</span>
            </button>
            <span className="text-gray-500 font-mono text-xs">({frigoStocks.length} Réf.)</span>
          </div>
        </div>

        {syncToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-mono text-xs font-bold animate-in fade-in">
            {syncToast}
          </div>
        )}

        {frigoStocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded">
            Aucun produit actuellement stocké dans cet entrepôt.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="carbon-table text-xs">
              <thead>
                <tr>
                  <th>Code SKU</th>
                  <th>Désignation Produit</th>
                  <th>Catégorie</th>
                  <th className="text-right">Stock Actuel (Kg)</th>
                  <th className="text-right text-rose-700">Sorties BLs (Kg)</th>
                  <th className="text-right">Palettes</th>
                  <th className="text-right">Prix Revient (HT)</th>
                  <th className="text-right">Prix Vente (HT)</th>
                  <th className="text-right">Valorisation Coût HT</th>
                  <th className="text-right">Valorisation Vente HT</th>
                </tr>
              </thead>
              <tbody>
                {frigoStocks.map(stk => {
                  const prd = products.find(p => p.id === stk.productId);
                  const valHT = stk.quantityKg * (prd?.unitCostHT || 0);
                  const valVenteHT = stk.quantityKg * (prd?.sellingPriceHT || 0);

                  return (
                    <tr key={stk.productId}>
                      <td className="font-mono font-bold text-[#0f62fe]">{prd?.code || 'PRD'}</td>
                      <td className="font-semibold text-gray-900">{prd?.name || 'Produit Inconnu'}</td>
                      <td className="text-gray-500">{prd?.category || '-'}</td>
                      <td className="text-right font-mono font-bold text-gray-900">{stk.quantityKg.toLocaleString()} Kg</td>
                      <td className="text-right font-mono font-bold text-rose-600">
                        {frigoBLs.reduce((sum, bl) => {
                          const item = bl.items?.find(it => 
                            it.productId === stk.productId || 
                            it.productCode === prd?.code ||
                            (it.productName && prd?.name && it.productName.toLowerCase().includes(prd.name.toLowerCase()))
                          );
                          return sum + (item ? Number(item.quantityKg) || 0 : 0);
                        }, 0).toLocaleString()} Kg
                      </td>
                      <td className="text-right font-mono font-bold text-purple-700">{stk.quantityPallets} Pal.</td>
                      <td className="text-right font-mono text-gray-600">{prd?.unitCostHT?.toLocaleString()} DH</td>
                      <td className="text-right font-mono text-blue-700">{prd?.sellingPriceHT?.toLocaleString()} DH</td>
                      <td className="text-right font-mono font-bold text-purple-700">{valHT.toLocaleString()} DH</td>
                      <td className="text-right font-mono font-bold text-emerald-700">{valVenteHT.toLocaleString()} DH</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Clients list */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center justify-between border-b pb-2">
          <span className="flex items-center gap-2 text-amber-700">
            <UserCheck className="w-4 h-4" />
            2. Clients Ayant Acheté / Retiré la Marchandise Depuis ce Frigo
          </span>
          <span className="text-gray-500 font-mono text-xs">{Object.keys(clientVolumeMap).length} Client(s)</span>
        </h3>

        {Object.keys(clientVolumeMap).length === 0 ? (
          <div className="p-6 text-center text-gray-400 italic">Aucune sortie client enregistrée pour ce frigo.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
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

      {/* SECTION 3: Recent BL Movements */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center justify-between border-b pb-2">
          <span className="flex items-center gap-2 text-indigo-700">
            <Layers className="w-4 h-4" />
            3. Historique Chronologique des Bons de Livraison & Sorties Quai
          </span>
          <span className="text-gray-500 font-mono text-xs">{frigoBLs.length} Mouvement(s)</span>
        </h3>

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="carbon-table text-xs">
            <thead>
              <tr>
                <th>N° BL</th>
                <th>Date</th>
                <th>Client Destinataire</th>
                <th className="text-right">Poids (Kg)</th>
                <th className="text-right">Montant TTC</th>
                <th>Statut Chargement Quai</th>
                <th>Bon Sortie Photo</th>
              </tr>
            </thead>
            <tbody>
              {frigoBLs.map(bl => (
                <tr key={bl.id}>
                  <td className="font-mono font-bold text-[#0f62fe]">{bl.blNumber}</td>
                  <td className="font-mono text-gray-600">{bl.date}</td>
                  <td className="font-semibold text-gray-900">{bl.clientName}</td>
                  <td className="text-right font-mono font-bold text-gray-900">{bl.totalKg.toLocaleString()} Kg</td>
                  <td className="text-right font-mono font-bold text-purple-700">{bl.totalTTC.toLocaleString()} DH</td>
                  <td>
                    {bl.frigoEmployeeApproved ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                        ✓ Approuvé ({bl.frigoApprovedBy})
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                        En attente
                      </span>
                    )}
                  </td>
                  <td>
                    {bl.bonDeSortiePhotoUrl ? (
                      <span className="text-emerald-700 font-mono text-[10px] font-bold">📷 Photo dispo</span>
                    ) : (
                      <span className="text-gray-400 font-mono text-[10px]">Non jointe</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
