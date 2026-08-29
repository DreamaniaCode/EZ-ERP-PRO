import React, { useState, useRef, useEffect } from 'react';
import { Client } from '../../types';
import { Search, ChevronDown, Check, X, User, Phone, MapPin, Building } from 'lucide-react';

interface SearchableClientSelectProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableClientSelect: React.FC<SearchableClientSelectProps> = ({
  clients,
  value,
  onChange,
  placeholder = 'Sélectionner ou rechercher un client...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find(c => c.id === value);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 320 && rect.top > 320;
      
      const width = Math.max(rect.width, 380);
      let left = rect.left;
      if (left + width > window.innerWidth - 16) {
        left = window.innerWidth - width - 16;
      }
      if (left < 16) left = 16;

      setDropdownStyle({
        position: 'fixed',
        top: openUpwards ? `${Math.max(10, rect.top - 310)}px` : `${rect.bottom + 4}px`,
        left: `${left}px`,
        width: `${width}px`,
        zIndex: 999999,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredClients = clients.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.ice && c.ice.toLowerCase().includes(q))
    );
  });

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      
      {/* Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full border rounded px-3 py-2 flex items-center justify-between cursor-pointer transition select-none ${
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
            : isOpen
            ? 'bg-white border-[#0f62fe] ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#0f62fe] border border-blue-200 shrink-0">
              {selectedClient.code || 'CLT'}
            </span>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-gray-900 truncate">
                {selectedClient.companyName || selectedClient.name}
              </span>
              {(selectedClient.city || selectedClient.phone) && (
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 truncate">
                  {selectedClient.city && <span>📍 {selectedClient.city}</span>}
                  {selectedClient.phone && <span>📞 {selectedClient.phone}</span>}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-400 truncate">
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-2 text-gray-400">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0f62fe]' : ''}`} />
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border-2 border-gray-900 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tapez nom, société, ville, tel, ICE..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-mono font-medium border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-blue-500"
                onClick={e => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Client List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 overscroll-contain">
            {filteredClients.length > 0 ? (
              filteredClients.map(c => {
                const isSelected = c.id === value;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-blue-50/90 text-blue-900 font-bold'
                        : 'hover:bg-gray-100/80 text-gray-800'
                    }`}
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          isSelected ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {c.code || 'CLT'}
                        </span>
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {c.name} {c.companyName && c.companyName !== c.name ? `(${c.companyName})` : ''}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2 flex-wrap">
                        {c.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-gray-400" />{c.city}</span>}
                        {c.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3 text-gray-400" />{c.phone}</span>}
                        {c.ice && <span>ICE: {c.ice}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#0f62fe] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        c.currentBalance !== undefined && c.currentBalance > 0 && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold">
                            Solde: {c.currentBalance.toLocaleString()} DH
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-gray-500 italic">
                Aucun client trouvé pour "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-1.5 bg-gray-50 border-t border-gray-200 text-[10px] font-mono text-gray-500 flex justify-between px-3">
            <span>{filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}</span>
            <span>Sélection exacte par ID</span>
          </div>
        </div>
      )}
    </div>
  );
};
