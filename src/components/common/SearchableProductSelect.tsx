import React, { useState, useRef, useEffect } from 'react';
import { Product, FrigoStockLevel } from '../../types';
import { Search, ChevronDown, Check, X, Package } from 'lucide-react';

interface SearchableProductSelectProps {
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  className?: string;
  stocks?: FrigoStockLevel[];
  frigoId?: string;
  disabled?: boolean;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  value,
  onChange,
  placeholder = 'Rechercher ou sélectionner un produit...',
  className = '',
  stocks,
  frigoId,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(p => p.id === value || p.code === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.origin && p.origin.toLowerCase().includes(q))
    );
  });

  const handleSelect = (prdId: string) => {
    onChange(prdId);
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
        className={`w-full border rounded px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition select-none ${
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
            : isOpen
            ? 'bg-white border-[#0f62fe] ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-[#0f62fe] border border-blue-200 shrink-0">
              {selectedProduct.code}
            </span>
            <span className="text-xs font-bold text-gray-900 truncate">
              {selectedProduct.name}
            </span>
            {selectedProduct.origin && (
              <span className="text-[10px] text-gray-500 hidden sm:inline-block">
                ({selectedProduct.origin})
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400 truncate">
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-1.5 text-gray-400">
          {selectedProduct && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (products.length > 0) onChange(products[0].id);
              }}
              className="hover:text-gray-600 p-0.5"
              title="Changer de produit"
            >
              <Search className="w-3.5 h-3.5 text-[#0f62fe]" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0f62fe]' : ''}`} />
        </div>
      </div>

      {/* Search & Suggestions Floating Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-gray-900 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 min-w-[280px]">
          
          {/* Integrated Search Input Header */}
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tapez nom, code, origine..."
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

          {/* Product Items List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(prd => {
                const isSelected = prd.id === value || prd.code === value;
                
                // Check stock if frigoId and stocks are available
                let stockInfo = '';
                if (stocks && frigoId) {
                  const stk = stocks.find(s => s.frigoId === frigoId && s.productId === prd.id);
                  if (stk) {
                    stockInfo = `${stk.quantityKg.toLocaleString()} kg (${stk.quantityPallets}p)`;
                  }
                }

                return (
                  <div
                    key={prd.id}
                    onClick={() => handleSelect(prd.id)}
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
                          {prd.code}
                        </span>
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {prd.name}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2">
                        <span>{prd.sellingPriceHT} DH/kg</span>
                        {prd.origin && <span>• {prd.origin}</span>}
                        {stockInfo && (
                          <span className="text-emerald-700 font-semibold">• Stock: {stockInfo}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#0f62fe] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {prd.kgPerCarton}kg/colis
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-gray-500 italic">
                Aucun produit correspondant à "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer stats */}
          <div className="p-1.5 bg-gray-50 border-t border-gray-200 text-[10px] font-mono text-gray-500 flex justify-between px-3">
            <span>{filteredProducts.length} référence{filteredProducts.length > 1 ? 's' : ''}</span>
            <span>Sélection rapide</span>
          </div>

        </div>
      )}

    </div>
  );
};
