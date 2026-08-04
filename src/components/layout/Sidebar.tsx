import React from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { AppUser, hasModuleAccess } from '../../types/permissions';
import type { ExtendedNavTab } from '../../App';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  ShoppingCart, 
  Ship, 
  ClipboardCheck, 
  FileText, 
  Landmark, 
  Receipt, 
  Users, 
  Building2,
  Warehouse,
  Building,
  Lock,
  ChevronRight,
  UserCog,
  FileUp,
  Database
} from 'lucide-react';

export type NavTab = 
  | 'DASHBOARD'
  | 'PRODUCTS_STOCK'
  | 'DELIVERY_NOTES'
  | 'SALES_ORDERS'
  | 'CLIENTS'
  | 'PURCHASES_IMPORTS'
  | 'MULTI_SITE_INVENTORY'
  | 'INVOICING'
  | 'TREASURY_CHEQUES'
  | 'EXPENSES'
  | 'DIRECTORY'
  | 'FRIGO_MANAGEMENT'
  | 'COMPANY_INFO';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  appUser?: AppUser;
  onNavigateExtended?: (tab: ExtendedNavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isMobileOpen = false,
  onCloseMobile,
  appUser,
  onNavigateExtended
}) => {
  const { t } = useTranslation();
  const { currentUser, frigos, deliveryNotes, chequesEffets } = useERP();

  // Pending BL count assigned to active frigo (if frigo role)
  const pendingFrigoBLsCount = deliveryNotes.filter(bl => {
    if (currentUser.role === 'RESPONSABLE_FRIGO' && currentUser.assignedFrigoId) {
      return !bl.frigoEmployeeApproved && bl.frigoId === currentUser.assignedFrigoId;
    }
    return !bl.frigoEmployeeApproved;
  }).length;

  // Cheques & Effets maturing within the next 7 days (or overdue)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingChequesCount = chequesEffets.filter(c => {
    if (c.status === 'ENCAISSE' || c.status === 'IMPAYE_REJETE') return false;
    const dueDate = new Date(c.dueDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 7;
  }).length;

  const isTabAllowed = (tab: NavTab): boolean => {
    // If we have AppUser permissions, use them
    if (appUser?.permissions) {
      const moduleMap: Record<string, string> = {
        'DASHBOARD': 'DASHBOARD',
        'PRODUCTS_STOCK': 'PRODUCTS',
        'DELIVERY_NOTES': 'BL',
        'CLIENTS': 'CLIENTS',
        'SALES_ORDERS': 'SALES_ORDERS',
        'PURCHASES_IMPORTS': 'PURCHASES',
        'MULTI_SITE_INVENTORY': 'INVENTORY',
        'INVOICING': 'INVOICING',
        'TREASURY_CHEQUES': 'TREASURY',
        'EXPENSES': 'EXPENSES',
        'DIRECTORY': 'SUPPLIERS',
        'FRIGO_MANAGEMENT': 'FRIGO_MGMT',
        'COMPANY_INFO': 'COMPANY_INFO',
      };
      const module = moduleMap[tab];
      if (module) {
        return hasModuleAccess(appUser.permissions, module as any);
      }
    }

    // Fallback to role-based check
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'RESPONSABLE_FRIGO' || appUser?.role === 'RESPONSABLE_FRIGO') {
      return tab === 'DELIVERY_NOTES';
    }
    
    switch (tab) {
      case 'DASHBOARD':
        return true;
      case 'PRODUCTS_STOCK':
      case 'DELIVERY_NOTES':
      case 'MULTI_SITE_INVENTORY':
      case 'CLIENTS':
      case 'DIRECTORY':
        return true;
      case 'SALES_ORDERS':
        return currentUser.role === 'COMMERCIAL' || currentUser.role === 'ADMIN';
      case 'PURCHASES_IMPORTS':
        return currentUser.role === 'COMPTABLE' || currentUser.role === 'COMMERCIAL' || currentUser.role === 'ADMIN';
      case 'INVOICING':
      case 'TREASURY_CHEQUES':
      case 'EXPENSES':
        return currentUser.role === 'COMPTABLE' || currentUser.role === 'ADMIN';
      default:
        return true;
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'DASHBOARD', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'PRODUCTS_STOCK', label: t('nav.products'), icon: Package },
    { id: 'DELIVERY_NOTES', label: t('nav.deliveryNotes'), icon: Truck, badge: pendingFrigoBLsCount },
    { id: 'CLIENTS', label: t('nav.clients'), icon: Users },
    { id: 'SALES_ORDERS', label: t('nav.salesOrders'), icon: ShoppingCart },
    { id: 'PURCHASES_IMPORTS', label: t('nav.purchases'), icon: Ship },
    { id: 'MULTI_SITE_INVENTORY', label: t('nav.inventory'), icon: ClipboardCheck },
    { id: 'INVOICING', label: t('nav.invoicing'), icon: FileText },
    { id: 'TREASURY_CHEQUES', label: t('nav.treasury'), icon: Landmark, badge: upcomingChequesCount },
    { id: 'EXPENSES', label: t('nav.expenses'), icon: Receipt },
    { id: 'DIRECTORY', label: t('nav.suppliers'), icon: Building2 },
    { id: 'FRIGO_MANAGEMENT', label: t('nav.frigoMgmt'), icon: Warehouse },
    { id: 'COMPANY_INFO', label: t('nav.companyInfo'), icon: Building },
  ];

  // Extra nav items for admin
  const isAdmin = appUser?.role === 'ADMIN' || currentUser.role === 'ADMIN';

  const assignedFrigo = currentUser.assignedFrigoId 
    ? frigos.find(f => f.id === currentUser.assignedFrigoId) 
    : null;

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside className={`
        fixed md:relative top-0 bottom-0 z-50
        w-72 sm:w-64 bg-[#161616] border-[#393939] border-r rtl:border-r-0 rtl:border-l flex-col justify-between shrink-0
        transition-all duration-200 ease-in-out
        ${isMobileOpen 
          ? 'flex left-0 rtl:left-auto rtl:right-0 shadow-2xl' 
          : 'hidden md:flex'}
      `}>



        <div className="py-3 overflow-y-auto max-h-[calc(100vh-60px)] md:max-h-none">
          
          {/* User Context Banner if Responsable Frigo */}
          {assignedFrigo && (
            <div className="mx-3 mb-3 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs text-emerald-200">
              <div className="font-semibold text-[11px] text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {t('frigos.title')}
              </div>
              <div className="font-bold text-white mt-1">{assignedFrigo.name}</div>
              <div className="text-[10px] text-emerald-300 mt-0.5">{assignedFrigo.location}</div>
            </div>
          )}

          {/* Navigation Section */}
          <div className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>{t('app.name')}</span>
          </div>

          <nav className="space-y-1 px-2">
            {navItems.map(item => {
              const allowed = isTabAllowed(item.id);
              if (!allowed) return null;
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full text-start px-3 py-3 sm:py-2.5 rounded transition-all flex items-center justify-between group active:scale-[0.99] ${
                    isActive
                      ? 'bg-[#0f62fe] text-white font-medium shadow'
                      : 'text-gray-300 hover:bg-[#262626] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <div className="truncate">
                      <div className="text-xs sm:text-xs font-semibold truncate leading-snug">{item.label}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 rtl:rotate-180" />}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Separator + Extra Features */}
          <div className="mx-3 my-3 border-t border-[#393939]" />
          
          <div className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('common.actions')}
          </div>

          <nav className="space-y-1 px-2">
            {/* Import BL */}
            <button
              onClick={() => {
                if (onNavigateExtended) onNavigateExtended('IMPORT_BL');
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full text-start px-3 py-2.5 rounded transition-all flex items-center gap-3 text-gray-300 hover:bg-[#262626] hover:text-white group"
            >
              <FileUp className="w-4 h-4 text-gray-400 group-hover:text-white shrink-0" />
              <span className="text-xs font-semibold truncate">{t('nav.importBL')}</span>
            </button>

            {/* Backup */}
            <button
              onClick={() => {
                if (onNavigateExtended) onNavigateExtended('BACKUP');
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full text-start px-3 py-2.5 rounded transition-all flex items-center gap-3 text-gray-300 hover:bg-[#262626] hover:text-white group"
            >
              <Database className="w-4 h-4 text-gray-400 group-hover:text-white shrink-0" />
              <span className="text-xs font-semibold truncate">{t('nav.backup')}</span>
            </button>

            {/* Users (Admin only) */}
            {isAdmin && (
              <button
                onClick={() => {
                  if (onNavigateExtended) onNavigateExtended('USERS');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-start px-3 py-2.5 rounded transition-all flex items-center gap-3 text-gray-300 hover:bg-[#262626] hover:text-white group"
              >
                <UserCog className="w-4 h-4 text-gray-400 group-hover:text-white shrink-0" />
                <span className="text-xs font-semibold truncate">{t('nav.users')}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Carbon Footer */}
        <div className="p-3 border-t border-[#262626] bg-[#0d0d0d] text-[11px] text-gray-400 hidden md:block">
          <div className="font-mono text-[10px] text-gray-300 font-semibold mb-0.5">
            {t('app.name')}
          </div>
          <div className="text-[10px] text-gray-400">
            ERP Négoce • PWA Mobile
          </div>
        </div>
      </aside>
    </>
  );
};

