import React from 'react';
import { NavTab } from './Sidebar';
import { ChevronRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface SubHeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

const tabLabels: Record<NavTab, string> = {
  DASHBOARD: 'Tableau de Bord & Marges Globales',
  PRODUCTS_STOCK: 'Produits, Prix HT & Stock Multi-Frigos',
  DELIVERY_NOTES: 'Bons de Livraison (BL) & Logistique Quai',
  CLIENTS: 'Gestion des Clients, Solde & Échéances (ICE)',
  SALES_ORDERS: 'Commandes Ventes & Marge Brute',
  PURCHASES_IMPORTS: 'Factures Achats & Arrivées Conteneurs',
  MULTI_SITE_INVENTORY: 'Inventaires Multi-Sites & Écarts',
  INVOICING: 'Facturation Intégrée & Créances',
  TREASURY_CHEQUES: 'Trésorerie, Chèques & Effets',
  EXPENSES: 'Gestion des Dépenses Opérationnelles',
  DIRECTORY: 'Répertoire Fournisseurs & Intervenants (ICE)',
  FRIGO_MANAGEMENT: 'Gestion des Entrepôts Frigorifiques & Capacités',
  COMPANY_INFO: 'Informations Entreprise & En-tête Documentaire',
};

export const SubHeader: React.FC<SubHeaderProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, frigos } = useERP();
  const assignedFrigo = currentUser.assignedFrigoId ? frigos.find(f => f.id === currentUser.assignedFrigoId) : null;

  return (
    <div className="h-10 bg-white border-b border-[#e0e0e0] flex items-center justify-between px-3 sm:px-4 text-xs text-[#525252] shrink-0 font-mono overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className="hover:text-[#0f62fe] transition-colors font-medium"
        >
          EasyERP Pro
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-[#161616] font-semibold truncate max-w-[200px] sm:max-w-none">{tabLabels[activeTab]}</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] whitespace-nowrap shrink-0 ml-3">
        {assignedFrigo ? (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Quai: {assignedFrigo.name.split('-')[0].trim()}
          </span>
        ) : (
          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-semibold text-[10px] sm:text-xs">
            Vue Multi-Frigos
          </span>
        )}
        <span className="text-[#24a148] flex items-center gap-1 hidden md:flex">
          <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" style={{ animationDuration: '6s' }} />
          Sync Cloud ERP
        </span>
      </div>
    </div>
  );
};
