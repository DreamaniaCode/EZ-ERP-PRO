import React from 'react';
import { useTranslation } from 'react-i18next';
import { useERP } from '../../context/ERPContext';
import { AppUser, hasModuleAccess } from '../../types/permissions';
import { signOut } from '../../lib/firebase';
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
  ChevronRight, 
  UserCog, 
  FileUp, 
  Database,
  X,
  LogOut,
  Clock,
  Sparkles,
  ShieldCheck,
  Scissors
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
  const { t, i18n } = useTranslation();
  const { currentUser, frigos, deliveryNotes, chequesEffets, activeCompany } = useERP();

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

  const handleLogout = async () => {
    try {
      localStorage.removeItem('erp_local_session');
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('erp_local_session');
      window.location.href = '/';
    }
  };

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
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') return true;
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
        return ['COMMERCIAL', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.role as any);
      case 'PURCHASES_IMPORTS':
        return ['COMPTABLE', 'COMPTABLE_FACTURES', 'COMMERCIAL', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.role as any);
      case 'INVOICING':
      case 'TREASURY_CHEQUES':
      case 'EXPENSES':
        return ['COMPTABLE', 'COMPTABLE_FACTURES', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.role as any);
      default:
        return true;
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; section?: string }[] = [
    { id: 'DASHBOARD', label: t('nav.dashboard'), icon: LayoutDashboard, section: 'core' },
    { id: 'PRODUCTS_STOCK', label: t('nav.products'), icon: Package, section: 'core' },
    { id: 'DELIVERY_NOTES', label: t('nav.deliveryNotes'), icon: Truck, badge: pendingFrigoBLsCount, section: 'core' },
    { id: 'FRIGO_MANAGEMENT', label: t('nav.frigoMgmt'), icon: Warehouse, section: 'core' },
    { id: 'MULTI_SITE_INVENTORY', label: t('nav.inventory'), icon: ClipboardCheck, section: 'core' },
    
    { id: 'SALES_ORDERS', label: t('nav.salesOrders'), icon: ShoppingCart, section: 'sales' },
    { id: 'CLIENTS', label: t('nav.clients'), icon: Users, section: 'sales' },
    { id: 'DIRECTORY', label: t('nav.suppliers'), icon: Building2, section: 'sales' },
    { id: 'PURCHASES_IMPORTS', label: t('nav.purchases'), icon: Ship, section: 'sales' },

    { id: 'INVOICING', label: t('nav.invoicing'), icon: FileText, section: 'finance' },
    { id: 'TREASURY_CHEQUES', label: t('nav.treasury'), icon: Landmark, badge: upcomingChequesCount, section: 'finance' },
    { id: 'EXPENSES', label: t('nav.expenses'), icon: Receipt, section: 'finance' },
    
    { id: 'COMPANY_INFO', label: t('nav.companyInfo'), icon: Building, section: 'settings' },
  ];

  // Extra nav items permissions
  const isAdmin = appUser?.role === 'SUPER_ADMIN' || appUser?.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
  const canImportBL = hasModuleAccess(appUser?.permissions, 'IMPORT_BL') || ['SUPER_ADMIN', 'ADMIN', 'AGENT_STOCK', 'COMMERCIAL', 'COMPTABLE_FACTURES'].includes(currentUser.role as any);
  const canBackup = hasModuleAccess(appUser?.permissions, 'BACKUP') || isAdmin;
  const canManageUsers = hasModuleAccess(appUser?.permissions, 'USERS') || isAdmin;

  const assignedFrigo = currentUser.assignedFrigoId 
    ? frigos.find(f => f.id === currentUser.assignedFrigoId) 
    : null;

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden transition-opacity animate-fade-in"
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside className={`
        fixed md:relative top-0 bottom-0 z-50
        w-80 sm:w-64 bg-[#161616] border-[#393939] border-r rtl:border-r-0 rtl:border-l flex flex-col justify-between shrink-0
        transition-all duration-300 ease-in-out
        ${isMobileOpen 
          ? 'translate-x-0 left-0 rtl:left-auto rtl:right-0 shadow-2xl' 
          : '-translate-x-full md:translate-x-0 hidden md:flex'}
      `}>

        {/* Mobile Drawer Top Header */}
        <div className="p-4 border-b border-[#262626] bg-[#1a1a1a] flex items-center justify-between md:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 p-0.5 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-md">
              <img src="/ez_erp_logo.jpg" alt="Logo" className="w-full h-full rounded-lg object-cover" />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                EasyERP <span className="text-[#0f62fe]">PRO</span>
              </div>
              <div className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]">
                {activeCompany?.name || 'Négoce Dattes'}
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#262626] rounded-xl transition-colors touch-manipulation"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* User Identity Pill (Mobile Only) */}
        <div className="px-4 py-3 bg-[#111111] border-b border-[#262626] md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0f62fe] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {(currentUser.name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white truncate max-w-[150px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] font-mono text-blue-400 font-semibold">
                  {currentUser.role}
                </div>
              </div>
            </div>

            {assignedFrigo && (
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                {assignedFrigo.name.split('-')[0].trim()}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Scrollable Body */}
        <div className="py-3 px-2 overflow-y-auto flex-1 space-y-1">
          
          {/* User Context Banner if Responsable Frigo */}
          {assignedFrigo && (
            <div className="mx-1 mb-3 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200">
              <div className="font-semibold text-[10px] text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('frigos.title')}
              </div>
              <div className="font-bold text-white mt-0.5">{assignedFrigo.name}</div>
              <div className="text-[10px] text-emerald-300">{assignedFrigo.location}</div>
            </div>
          )}

          {/* Core Operations Section */}
          <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('nav.operations', 'Opérations & Stocks')}
          </div>

          <nav className="space-y-0.5">
            {navItems.filter(item => item.section === 'core').map(item => {
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
                  className={`w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#0f62fe] text-white font-bold shadow-md'
                      : 'text-gray-300 hover:bg-[#262626] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 rtl:rotate-180" />}
                  </div>
                </button>
              );
            })}

            {/* Direct Reconditionnement Page Button */}
            {onNavigateExtended && currentUser?.role !== 'RESPONSABLE_FRIGO' && (
              <button
                onClick={() => {
                  onNavigateExtended('STOCK_REPACKAGING');
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98] ${
                  (activeTab as any) === 'STOCK_REPACKAGING'
                    ? 'bg-purple-600 text-white font-bold shadow-md'
                    : 'text-purple-300 hover:bg-[#262626] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Scissors className="w-4 h-4 text-purple-400 group-hover:text-white shrink-0" />
                  <span className="text-xs font-semibold truncate">Reconditionnement</span>
                </div>
                {(activeTab as any) === 'STOCK_REPACKAGING' && <ChevronRight className="w-3.5 h-3.5 text-white/80 rtl:rotate-180" />}
              </button>
            )}
          </nav>

          {/* Sales & Directory Section */}
          <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('nav.sales', 'Ventes & Répertoire')}
          </div>

          <nav className="space-y-0.5">
            {navItems.filter(item => item.section === 'sales').map(item => {
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
                  className={`w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#0f62fe] text-white font-bold shadow-md'
                      : 'text-gray-300 hover:bg-[#262626] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 rtl:rotate-180" />}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Finance Section */}
          <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('nav.finance', 'Finance & Trésorerie')}
          </div>

          <nav className="space-y-0.5">
            {navItems.filter(item => item.section === 'finance').map(item => {
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
                  className={`w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#0f62fe] text-white font-bold shadow-md'
                      : 'text-gray-300 hover:bg-[#262626] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 rtl:rotate-180" />}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Administration & Config */}
          <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('nav.settings', 'Administration')}
          </div>

          <nav className="space-y-0.5">
            {navItems.filter(item => item.section === 'settings').map(item => {
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
                  className={`w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#0f62fe] text-white font-bold shadow-md'
                      : 'text-gray-300 hover:bg-[#262626] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 rtl:rotate-180" />}
                </button>
              );
            })}

            {/* Extra Action Pages */}
            {canImportBL && (
              <button
                onClick={() => {
                  if (onNavigateExtended) onNavigateExtended('IMPORT_BL');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center gap-3 text-gray-300 hover:bg-[#262626] hover:text-white group"
              >
                <FileUp className="w-4 h-4 text-emerald-400 group-hover:text-white shrink-0" />
                <span className="text-xs font-semibold truncate">{t('nav.importBL')}</span>
              </button>
            )}

            {canBackup && (
              <button
                onClick={() => {
                  if (onNavigateExtended) onNavigateExtended('BACKUP');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center gap-3 text-gray-300 hover:bg-[#262626] hover:text-white group"
              >
                <Database className="w-4 h-4 text-cyan-400 group-hover:text-white shrink-0" />
                <span className="text-xs font-semibold truncate">{t('nav.backup')}</span>
              </button>
            )}

            {canManageUsers && (
              <button
                onClick={() => {
                  if (onNavigateExtended) onNavigateExtended('USERS');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-start px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center gap-3 text-gray-300 hover:bg-[#262626] hover:text-white group"
              >
                <UserCog className="w-4 h-4 text-amber-400 group-hover:text-white shrink-0" />
                <span className="text-xs font-semibold truncate">{t('nav.users')}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Drawer Bottom Footer (with Logout on Mobile) */}
        <div className="p-3 border-t border-[#262626] bg-[#0d0d0d] text-[11px] text-gray-400">
          <div className="flex items-center justify-between mb-2 md:hidden">
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('auth.logout', 'Se Déconnecter')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span className="font-mono font-semibold text-gray-300">EasyERP PRO • v2026</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connecté
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

