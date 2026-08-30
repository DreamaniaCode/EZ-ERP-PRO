import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface CategoryValuationRow {
  category: string
  valuationHT: number
  salesHT: number
  marginPct: number
}

interface CategoryValuationSurfaceProps {
  data: CategoryValuationRow[]
  title?: string
  subtitle?: string
  onSelectCategory?: (category: string) => void
}

const RAMP = ['#0f62fe', '#4589ff', '#78a9ff', '#a6c8ff', '#d0e2ff']

const money = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} DH`
const pct = (value: number) => `${(value || 0).toFixed(1).replace('.', ',')}%`

/**
 * Category valuation surface: the CA HT bars on the left, the drill-down
 * table (stock valorisé / CA HT / marge %) on the right, linked selection.
 */
export const CategoryValuationSurface: React.FC<CategoryValuationSurfaceProps> = ({
  data,
  title,
  subtitle,
  onSelectCategory
}) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (category: string) => {
    setSelected(current => (current === category ? null : category))
    onSelectCategory?.(category)
  }

  if (data.length === 0) {
    return (
      <section className="carbon-card p-10 text-center">
        <p className="text-sm font-semibold text-gray-900">Aucune donnée par catégorie</p>
        <p className="mt-1 text-xs text-gray-500">
          Enregistrez un bon de livraison ou un stock pour alimenter cette vue.
        </p>
      </section>
    )
  }

  const max = Math.max(...data.map(row => row.salesHT || row.valuationHT), 1)
  const totalValuation = data.reduce((sum, row) => sum + row.valuationHT, 0)
  const totalSales = data.reduce((sum, row) => sum + row.salesHT, 0)
  const totalMarginPct =
    totalSales > 0
      ? (data.reduce((sum, row) => sum + (row.salesHT * row.marginPct) / 100, 0) / totalSales) * 100
      : 0

  return (
    <section className="carbon-card flex flex-1 flex-col overflow-hidden animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e0e0e0] px-4 py-2.5">
        <div>
          <h2 className="text-[13.5px] font-bold text-gray-900">
            {title ??
              t(
                'dashboard.categoryValuation',
                "Valorisation & Chiffre d'Affaires HT par Catégorie"
              )}
          </h2>
          <p className="mt-0.5 text-[10.5px] text-gray-500">
            {subtitle ?? 'Cliquer sur une famille pour voir les produits associés'}
          </p>
        </div>
        <span className="border border-[#0f62fe] px-2 py-1 text-[10px] uppercase tracking-wider text-[#0f62fe]">
          {data.length} Familles
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Bars */}
        <div className="flex flex-col justify-center gap-2.5 border-b border-[#e0e0e0] px-4 py-3 lg:w-[44%] lg:border-b-0 lg:border-r">
          {data.map((row, index) => {
            const value = row.salesHT || row.valuationHT
            const isSelected = selected === row.category
            return (
              <button
                key={row.category}
                type="button"
                onClick={() => handleSelect(row.category)}
                aria-pressed={isSelected}
                className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f62fe]"
              >
                <span className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
                  <span
                    className={`font-semibold ${isSelected ? 'text-[#0f62fe]' : 'text-gray-900'}`}
                  >
                    {row.category}
                  </span>
                  <span className="whitespace-nowrap font-mono text-gray-500">{money(value)}</span>
                </span>
                <span className="block h-2.5 w-full bg-[#e8e8e8]">
                  <span
                    className="block h-2.5 transition-[width] duration-500 ease-out"
                    style={{
                      width: `${(value / max) * 100}%`,
                      backgroundColor: RAMP[index % RAMP.length]
                    }}
                  />
                </span>
              </button>
            )
          })}
        </div>

        {/* Drill-down table */}
        <div className="flex-1 overflow-x-auto px-4 py-3">
          <table className="carbon-table">
            <caption className="sr-only">
              Stock valorisé, chiffre d&apos;affaires HT et marge par catégorie
            </caption>
            <thead>
              <tr>
                <th scope="col">Catégorie</th>
                <th scope="col" className="!text-right">
                  Stock Valorisé
                </th>
                <th scope="col" className="!text-right">
                  CA HT
                </th>
                <th scope="col" className="!text-right">
                  Marge %
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={row.category}
                  onClick={() => handleSelect(row.category)}
                  className={`cursor-pointer ${selected === row.category ? 'bg-[#edf5ff]' : ''}`}
                >
                  <td className="text-[11.5px] text-gray-900">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 align-middle"
                      style={{ backgroundColor: RAMP[index % RAMP.length] }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold">{row.category}</span>
                  </td>
                  <td className="text-right font-mono text-[11.5px]">{money(row.valuationHT)}</td>
                  <td className="text-right font-mono text-[11.5px]">{money(row.salesHT)}</td>
                  <td className="text-right text-[11.5px] font-semibold text-emerald-600">
                    {pct(row.marginPct)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="text-[11.5px] font-bold text-gray-900">Total</td>
                <td className="text-right font-mono text-[11.5px] font-bold text-gray-900">
                  {money(totalValuation)}
                </td>
                <td className="text-right font-mono text-[11.5px] font-bold text-gray-900">
                  {money(totalSales)}
                </td>
                <td className="text-right text-[11.5px] font-bold text-emerald-600">
                  {pct(totalMarginPct)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  )
}
