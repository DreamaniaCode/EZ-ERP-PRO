import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types';
import { Shield, ChevronDown, Check, Building2, User, Mail, Database, LogOut } from 'lucide-react';
import { signOut } from '../../lib/firebase';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, setCurrentUser, users, frigos } = useERP();
  const [isOpen, setIsOpen] = useState(false);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin (Gérant)';
      case 'ADMIN': return 'Direction / Admin';
      case 'COMMERCIAL': return 'Agent Commercial';
      case 'RESPONSABLE_FRIGO': return 'Responsable Frigo';
      case 'AGENT_STOCK': return 'Agent Stock & Logistique';
      case 'COMPTABLE_FACTURES': return 'Facturation & Comptabilité';
      case 'COMPTABLE': return 'Comptabilité & Finance';
      case 'CONTROLEUR': return 'Contrôleur (Audit)';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN': return 'bg-purple-900/80 text-purple-200 border-purple-700';
      case 'COMMERCIAL': return 'bg-blue-900/80 text-blue-200 border-blue-700';
      case 'RESPONSABLE_FRIGO': return 'bg-emerald-900/80 text-emerald-200 border-emerald-700';
      case 'AGENT_STOCK': return 'bg-cyan-900/80 text-cyan-200 border-cyan-700';
      case 'COMPTABLE_FACTURES':
      case 'COMPTABLE': return 'bg-amber-900/80 text-amber-200 border-amber-700';
      case 'CONTROLEUR': return 'bg-sky-900/80 text-sky-200 border-sky-700';
      default: return 'bg-gray-800 text-gray-200 border-gray-700';
    }
  };

  const isSuperAdminOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
  const assignedFrigo = currentUser.assignedFrigoId 
    ? frigos.find(f => f.id === currentUser.assignedFrigoId) 
    : null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#262626] hover:bg-[#393939] border border-[#525252] rounded text-white text-xs transition-colors"
        title="Profil et session utilisateur"
      >
        <img
          src={currentUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60"}
          alt={currentUser.name}
          className="w-5 h-5 rounded-full object-cover border border-[#6f6f6f]"
        />
        <div className="text-left leading-tight hidden min-[540px]:block">
          <div className="font-medium text-gray-200 text-xs truncate max-w-[100px] sm:max-w-[130px]">{currentUser.name}</div>
          <div className="text-[10px] text-gray-400">
            {getRoleLabel(currentUser.role)}
            {assignedFrigo && (
              <span className="ml-1 text-emerald-400 font-semibold">
                ({assignedFrigo.name.split('-')[0].trim()})
              </span>
            )}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#161616] border border-[#393939] shadow-2xl z-50 rounded divide-y divide-[#262626]">
          {/* Active User Card Header */}
          <div className="p-3 bg-[#1e1e1e]">
            <div className="flex items-center gap-3">
              <img 
                src={currentUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60"} 
                alt={currentUser.name} 
                className="w-10 h-10 rounded-full object-cover border-2 border-[#0f62fe]" 
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 text-gray-500 shrink-0" />
                  {currentUser.email || 'Session active'}
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </div>
            </div>

            {assignedFrigo && (
              <div className="mt-2 p-2 bg-emerald-950/50 border border-emerald-800/80 rounded text-xs text-emerald-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-semibold text-emerald-300">Quai assigné : </span>
                  <span className="font-bold text-white">{assignedFrigo.name}</span>
                </div>
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-[#333333] flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PostgreSQL Cloud Connecté
              </span>
              <span>v2026.08</span>
            </div>
          </div>

          {/* Admin Switcher only */}
          {isSuperAdminOrAdmin && users.length > 1 && (
            <div>
              <div className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 bg-[#141414]">
                <Shield className="w-3 h-3 text-[#0f62fe]" />
                Comptes Équipe (Aperçu Administrateur)
              </div>
              <div className="py-1 max-h-48 overflow-y-auto">
                {users.map(u => {
                  const isSelected = u.id === currentUser.id;
                  const uFrigo = u.assignedFrigoId ? frigos.find(f => f.id === u.assignedFrigoId) : null;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start justify-between hover:bg-[#262626] transition-colors ${
                        isSelected ? 'bg-[#262626] text-white' : 'text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-medium truncate">{u.name}</div>
                          <div className="flex items-center gap-1">
                            <span className={`text-[9px] px-1.5 py-0.2 border rounded ${getRoleBadgeColor(u.role)}`}>
                              {getRoleLabel(u.role)}
                            </span>
                            {uFrigo && (
                              <span className="text-[9px] text-emerald-400 truncate">
                                • {uFrigo.name.split('-')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0f62fe] shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
