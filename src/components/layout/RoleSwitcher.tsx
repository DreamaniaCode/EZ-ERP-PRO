import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types';
import { Shield, ChevronDown, Check, Building2, User } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, setCurrentUser, users, frigos } = useERP();
  const [isOpen, setIsOpen] = useState(false);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'Direction / Admin';
      case 'COMMERCIAL': return 'Agent Commercial';
      case 'RESPONSABLE_FRIGO': return 'Responsable Frigo';
      case 'COMPTABLE': return 'Comptabilité & Finance';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-900/80 text-purple-200 border-purple-700';
      case 'COMMERCIAL': return 'bg-blue-900/80 text-blue-200 border-blue-700';
      case 'RESPONSABLE_FRIGO': return 'bg-emerald-900/80 text-emerald-200 border-emerald-700';
      case 'COMPTABLE': return 'bg-amber-900/80 text-amber-200 border-amber-700';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 bg-[#262626] hover:bg-[#393939] border border-[#525252] rounded text-white text-xs transition-colors"
        title="Changer de rôle pour simuler l'accès d'un autre utilisateur"
      >
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-5 h-5 rounded-full object-cover border border-[#6f6f6f]"
        />
        <div className="text-left leading-tight hidden sm:block">
          <div className="font-medium text-gray-200">{currentUser.name}</div>
          <div className="text-[10px] text-gray-400">
            {getRoleLabel(currentUser.role)}
            {currentUser.assignedFrigoId && (
              <span className="ml-1 text-emerald-400">
                ({frigos.find(f => f.id === currentUser.assignedFrigoId)?.name.split('-')[0].trim()})
              </span>
            )}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#161616] border border-[#393939] shadow-2xl z-50 rounded divide-y divide-[#262626]">
          <div className="p-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#0f62fe]" />
            Simulateur de Rôle (RBAC ERP)
          </div>
          <div className="py-1 max-h-80 overflow-y-auto">
            {users.map(u => {
              const isSelected = u.id === currentUser.id;
              const assignedFrigo = u.assignedFrigoId ? frigos.find(f => f.id === u.assignedFrigoId) : null;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-start justify-between hover:bg-[#262626] transition-colors ${
                    isSelected ? 'bg-[#262626] text-white' : 'text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <div className="text-xs font-medium">{u.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.2 border rounded ${getRoleBadgeColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                      {assignedFrigo && (
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" />
                          {assignedFrigo.name}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#0f62fe] mt-1" />}
                </button>
              );
            })}
          </div>
          <div className="p-2 text-[10px] text-gray-400 bg-[#0d0d0d] italic">
            💡 Basculez de rôle pour tester les vues restreintes des Responsables Frigo (BL quai), Comptable (Chèques/Effets) ou Ventes.
          </div>
        </div>
      )}
    </div>
  );
};
