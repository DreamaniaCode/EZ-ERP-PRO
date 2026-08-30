import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Landmark,
  TrendingUp,
  Warehouse
} from 'lucide-react'
import { NavTab } from '../layout/Sidebar'

interface MoneyFocusKpiRowProps {
  totalSalesHT: number
  grossMarginHT: number
  globalMarginPct: number
  totalStockValuationHT: number
  totalStockKg: number
  sitesCount?: number
  totalReceivablesTTC: number
  overdueClientsCount?: number
  totalChequesAmount: number
  chequesCount?: number
  onNavigate: (tab: NavTab) => void
}

const money = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} DH`

/**
 * "Money Focus" KPI hierarchy: one oversized CA HT / marge panel leading the
 * dashboard, with Stock Global, Créances and Chèques stacked beside it as
 * compact clickable rows.
 */
export const MoneyFocusKpiRow: React.FC<MoneyFocusKpiRowProps> = ({
  totalSalesHT,
  grossMarginHT,
  globalMarginPct,
  totalStockValuationHT,
  totalStockKg,
  sitesCount = 0,
  totalReceivablesTTC,
  overdueClientsCount = 0,
  totalChequesAmount,
  chequesCount = 0,
  onNavigate
}) => {
  const { t } = useTranslation()

  const marginPct = Number.isFinite(globalMarginPct) ? Math.max(0, globalMarginPct) : 0
  const costPct = Math.max(0, 100 - marginPct)
  const marginLabel = `${marginPct.toFixed(1).replace('.', ',')}%`

  const miniKpis = [
    {
      id: 'stock',
      label: t('dashboard.stockValuation', 'Stock Global'),
      value: totalStockValuationHT,
      sub: `${Math.round(totalStockKg).toLocaleString('fr-FR')} Kg${
        sitesCount > 0 ? ` sur ${sitesCount} sites` : ''
      }`,
      danger: false,
      icon: Warehouse,
      tab: 'MULTI_SITE_INVENTORY' as NavTab,
      title: 'Cliquer pour afficher l’inventaire multi-sites'
    },
    {
      id: 'receivables',
      label: t('clients.receivables', 'Créances (TTC)'),
      value: totalReceivablesTTC,
      sub:
        overdueClientsCount > 0
          ? `${overdueClientsCount} clients en retard`
          : 'Aucun retard client',
      danger: overdueClientsCount > 0,
      icon: AlertTriangle,
      tab: 'CLIENTS' as NavTab,
      title: 'Cliquer pour afficher les comptes clients'
    },
    {
      id: 'cheques',
      label: t('dashboard.pendingCheques', 'Chèques'),
      value: totalChequesAmount,
      sub: `${chequesCount} à encaisser`,
      danger: false,
      icon: Landmark,
      tab: 'TREASURY_CHEQUES' as NavTab,
      title: 'Cliquer pour afficher la trésorerie & les chèques'
    }
  ]

  return (
    <section
      aria-label={t('dashboard.title', 'Tableau de Bord & Marges')}
      className="flex flex-col gap-3 xl:flex-row animate-fade-in"
    >
      {/* Hero — CA HT & marge */}
      <article
        onClick={() => onNavigate('DELIVERY_NOTES')}
        title="Cliquer pour afficher la liste des Bons de Livraison & Ventes"
        className="carbon-card group flex cursor-pointer flex-col justify-center gap-2.5 border-l-4 border-l-[#0f62fe] p-4 transition-all hover:shadow-md active:scale-[0.995] sm:p-6 xl:w-[62%] xl:shrink-0"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 transition-colors group-hover:text-[#0f62fe]">
            {t('dashboard.totalRevenue', 'CA HT')}
          </h2>
          <span className="flex items-center gap-1 border border-[#0f62fe] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[#0f62fe]">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            Indicateur Clé
          </span>
        </div>

        <p className="truncate font-mono text-[32px] font-bold leading-none tracking-tight text-gray-900 sm:text-[46px]">
          {money(totalSalesHT)}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-0.5 font-mono text-sm font-bold text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            {t('dashboard.grossMargin', 'Marge')}: {money(grossMarginHT)}
          </span>
          <span className="bg-emerald-600 px-1.5 py-px font-mono text-xs font-bold text-white">
            {marginLabel}
          </span>
        </div>

        <div className="mt-1">
          <div className="mb-1 flex justify-between text-[9.5px] font-semibold uppercase tracking-wider text-gray-400">
            <span>Répartition du CA HT</span>
            <span>Coût vs Marge</span>
          </div>
          <div
            className="flex h-4 w-full overflow-hidden bg-[#e8e8e8]"
            role="img"
            aria-label={`Marge de ${marginLabel} sur le chiffre d'affaires HT`}
          >
            <div
              className="h-4 bg-[#c6c6c6] transition-[width] duration-500 ease-out"
              style={{ width: `${costPct}%` }}
            />
            <div
              className="flex h-4 items-center justify-end bg-[#0f62fe] pr-1.5 transition-[width] duration-500 ease-out"
              style={{ width: `${marginPct}%` }}
            >
              <span className="whitespace-nowrap text-[9px] font-bold text-white">
                {marginLabel}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* Compact stacked KPIs */}
      <div className="carbon-card flex flex-1 flex-col overflow-hidden">
        {miniKpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => onNavigate(kpi.tab)}
              title={kpi.title}
              className={`group flex flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f4f4f4] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f62fe] ${
                index < miniKpis.length - 1 ? 'border-b border-[#e8e8e8]' : ''
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`hidden shrink-0 rounded p-1.5 transition-colors sm:block ${
                    kpi.danger
                      ? 'bg-red-50 text-[#da1e28] group-hover:bg-[#da1e28] group-hover:text-white'
                      : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 transition-colors group-hover:text-[#0f62fe]">
                    {kpi.label}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[10px] ${
                      kpi.danger ? 'font-semibold text-[#da1e28]' : 'text-gray-400'
                    }`}
                  >
                    {kpi.sub}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                <span className="font-mono text-base font-bold text-gray-900 sm:text-[17px]">
                  {money(kpi.value)}
                </span>
                <ChevronRight
                  className="h-3 w-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
