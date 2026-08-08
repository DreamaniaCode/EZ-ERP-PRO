import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

export interface BarChartDataPoint {
  label: string;
  value: number;
  subValue?: string;
  growthPct?: number;
}

interface StandardKpiBarChartProps {
  title: string;
  subtitle?: string;
  data: BarChartDataPoint[];
  unit?: string;
  maxVal?: number;
  onItemClick?: (item: BarChartDataPoint) => void;
}

const BAR_COLORS = [
  'bg-[#0f62fe]',
  'bg-[#10b981]',
  'bg-[#8b5cf6]',
  'bg-[#f59e0b]',
  'bg-[#ec4899]',
  'bg-[#06b6d4]'
];

export const StandardKpiBarChart: React.FC<StandardKpiBarChartProps> = ({
  title,
  subtitle,
  data,
  unit = 'DH',
  maxVal,
  onItemClick
}) => {
  const maxValue = maxVal || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4 font-mono">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0f62fe]" />
            {title}
          </h2>
          {subtitle && <p className="text-[11px] text-gray-500 font-sans mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Bar List */}
      <div className="space-y-3.5 pt-1">
        {data.map((item, index) => {
          const pct = Math.min(100, Math.round((item.value / maxValue) * 100));
          const colorClass = BAR_COLORS[index % BAR_COLORS.length];

          return (
            <div 
              key={index} 
              onClick={() => onItemClick && onItemClick(item)}
              className={`p-2.5 rounded-md border border-gray-100 hover:border-gray-300 bg-gray-50/50 hover:bg-blue-50/30 transition-all ${
                onItemClick ? 'cursor-pointer group' : ''
              }`}
            >
              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                <span className="text-gray-900 group-hover:text-[#0f62fe] transition-colors truncate max-w-[60%]">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  {item.subValue && (
                    <span className="text-[10px] text-gray-500 font-normal">
                      {item.subValue}
                    </span>
                  )}
                  <span className="text-[#0f62fe] font-mono font-extrabold">
                    {item.value.toLocaleString()} {unit}
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden flex items-center p-0.5">
                <div 
                  className={`h-full rounded-full ${colorClass} transition-all duration-500 shadow-sm`}
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <div className="py-6 text-center text-gray-400 text-xs italic font-sans">
            Aucune donnée disponible.
          </div>
        )}
      </div>

    </div>
  );
};
