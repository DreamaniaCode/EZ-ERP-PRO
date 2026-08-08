import React, { useState } from 'react';
import { TrendingUp, Boxes, Layers, Palette, BarChart3, RefreshCw } from 'lucide-react';

interface CylinderDataPoint {
  label: string;
  value: number;
  subValue?: string;
  growthPct?: number;
  color?: string;
}

interface CylinderKpiChartProps {
  title: string;
  subtitle?: string;
  data: CylinderDataPoint[];
  unit?: string;
  maxVal?: number;
  onItemClick?: (item: CylinderDataPoint) => void;
}


export const COLOR_PALETTES = [
  {
    id: 'cyber-neon',
    name: 'Cyber Néon Cyan / Violet',
    cylinders: [
      { top: '#06b6d4', body: 'linear-gradient(180deg, #06b6d4 0%, #0284c7 50%, #0369a1 100%)', shine: 'rgba(255,255,255,0.4)', text: '#0284c7' },
      { top: '#8b5cf6', body: 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)', shine: 'rgba(255,255,255,0.4)', text: '#7c3aed' },
      { top: '#10b981', body: 'linear-gradient(180deg, #10b981 0%, #059669 50%, #047857 100%)', shine: 'rgba(255,255,255,0.4)', text: '#059669' },
      { top: '#f59e0b', body: 'linear-gradient(180deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', shine: 'rgba(255,255,255,0.4)', text: '#d97706' },
      { top: '#ec4899', body: 'linear-gradient(180deg, #ec4899 0%, #db2777 50%, #be185d 100%)', shine: 'rgba(255,255,255,0.4)', text: '#db2777' },
    ]
  },
  {
    id: 'emerald-gold',
    name: 'Émeraude & Or Royal',
    cylinders: [
      { top: '#10b981', body: 'linear-gradient(180deg, #34d399 0%, #10b981 50%, #065f46 100%)', shine: 'rgba(255,255,255,0.5)', text: '#047857' },
      { top: '#f59e0b', body: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #78350f 100%)', shine: 'rgba(255,255,255,0.5)', text: '#b45309' },
      { top: '#3b82f6', body: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 50%, #1e40af 100%)', shine: 'rgba(255,255,255,0.5)', text: '#1d4ed8' },
      { top: '#a855f7', body: 'linear-gradient(180deg, #c084fc 0%, #a855f7 50%, #581c87 100%)', shine: 'rgba(255,255,255,0.5)', text: '#7e22ce' },
      { top: '#ef4444', body: 'linear-gradient(180deg, #f87171 0%, #ef4444 50%, #991b1b 100%)', shine: 'rgba(255,255,255,0.5)', text: '#b91c1c' },
    ]
  },
  {
    id: 'carbon-[#0f62fe]',
    name: 'IBM Carbon Tech Blue',
    cylinders: [
      { top: '#0f62fe', body: 'linear-gradient(180deg, #4589ff 0%, #0f62fe 50%, #002d9c 100%)', shine: 'rgba(255,255,255,0.5)', text: '#0f62fe' },
      { top: '#0072c3', body: 'linear-gradient(180deg, #1192e8 0%, #0072c3 50%, #003a6d 100%)', shine: 'rgba(255,255,255,0.5)', text: '#0072c3' },
      { top: '#6fdc8c', body: 'linear-gradient(180deg, #a7f0ba 0%, #6fdc8c 50%, #0e6027 100%)', shine: 'rgba(255,255,255,0.5)', text: '#0e6027' },
      { top: '#8a3ffc', body: 'linear-gradient(180deg, #be95ff 0%, #8a3ffc 50%, #491d8b 100%)', shine: 'rgba(255,255,255,0.5)', text: '#8a3ffc' },
      { top: '#ff8389', body: 'linear-gradient(180deg, #ffb3b8 0%, #ff8389 50%, #a2191f 100%)', shine: 'rgba(255,255,255,0.5)', text: '#da1e28' },
    ]
  }
];

export const CylinderKpiChart: React.FC<CylinderKpiChartProps> = ({
  title,
  subtitle,
  data,
  unit = 'DH',
  maxVal,
  onItemClick
}) => {
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);

  const activePalette = COLOR_PALETTES[selectedPaletteIndex];
  const calculatedMax = maxVal || Math.max(...data.map(d => d.value), 100);

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4 font-mono">
      
      {/* Header with Palette Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0f62fe]" />
            {title}
          </h2>
          {subtitle && <p className="text-[11px] text-gray-500 font-sans">{subtitle}</p>}
        </div>

        {/* Dynamic Color Palette Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded border border-gray-200 text-xs">
          <Palette className="w-3.5 h-3.5 text-gray-600 ml-1" />
          <span className="text-[10px] font-bold text-gray-500 uppercase mr-1">Couleurs:</span>
          {COLOR_PALETTES.map((pal, idx) => (
            <button
              key={pal.id}
              onClick={() => setSelectedPaletteIndex(idx)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                selectedPaletteIndex === idx 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title={pal.name}
            >
              {idx === 0 ? 'Cyber' : idx === 1 ? 'Émeraude' : 'Carbon'}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Cylinders Graphic Stage */}
      <div className="pt-6 pb-2 px-2 flex items-end justify-around gap-4 min-h-[220px] bg-gradient-to-b from-gray-50/50 to-gray-100/60 rounded-xl border border-gray-200 shadow-inner">
        {data.map((item, index) => {
          const colorTheme = activePalette.cylinders[index % activePalette.cylinders.length];
          const heightPct = Math.max(15, Math.min(100, Math.round((item.value / calculatedMax) * 100)));

          return (
            <div 
              key={index} 
              onClick={() => onItemClick && onItemClick(item)}
              className={`flex flex-col items-center group relative w-full max-w-[90px] ${onItemClick ? 'cursor-pointer' : ''}`}
              title={onItemClick ? `Cliquer pour ouvrir ${item.label}` : ''}
            >

              
              {/* Value Floating Badge */}
              <div className="mb-2 text-center transition-all transform group-hover:-translate-y-1">
                {item.growthPct !== undefined && (
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full mb-0.5 ${
                    item.growthPct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {item.growthPct >= 0 ? `+${item.growthPct}%` : `${item.growthPct}%`}
                  </span>
                )}
                <div className="text-xs font-bold text-gray-900 font-mono">
                  {item.value.toLocaleString()} <span className="text-[9px] font-normal text-gray-500">{unit}</span>
                </div>
              </div>

              {/* 3D Cylinder Container */}
              <div className="relative w-12 md:w-16 flex flex-col justify-end" style={{ height: '140px' }}>
                
                {/* Cylinder Shadow at Base */}
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-3 rounded-[50%] bg-black/20 blur-[2px] transition-all group-hover:bg-black/35"
                />

                {/* 3D Cylinder Fill Column */}
                <div 
                  className="relative w-full rounded-b-[50%/10px] transition-all duration-700 ease-out cursor-pointer group-hover:brightness-110 shadow-lg"
                  style={{
                    height: `${heightPct}%`,
                    background: colorTheme.body,
                  }}
                >
                  {/* Cylinder Metallic Top Cap Ellipse */}
                  <div 
                    className="absolute -top-2 left-0 w-full h-4 rounded-[50%] border-t border-white/60 shadow-sm"
                    style={{
                      backgroundColor: colorTheme.top,
                      boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.7)'
                    }}
                  />

                  {/* Vertical Specular Light Streak Highlight */}
                  <div 
                    className="absolute top-0 left-2 w-1.5 h-full opacity-60 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)'
                    }}
                  />
                </div>

              </div>

              {/* Label below cylinder */}
              <div className="mt-3 text-center">
                <div className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-[#0f62fe] transition-colors">
                  {item.label}
                </div>
                {item.subValue && (
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {item.subValue}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
