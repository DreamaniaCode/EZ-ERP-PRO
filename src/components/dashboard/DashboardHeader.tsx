import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Plus, QrCode, Search, TrendingUp } from 'lucide-react'
import { NavTab } from '../layout/Sidebar'

interface DashboardHeaderProps {
  pendingBLs: number
  showQuickAccess?: boolean
  onNavigate: (tab: NavTab) => void
  onExport?: () => void
  onNewOrder?: () => void
}

/** Dashboard banner + QR quick access bar */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  pendingBLs,
  showQuickAccess = true,
  onNavigate,
  onExport,
  onNewOrder
}) => {
  const { t } = useTranslation()
  const [code, setCode] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    window.history.pushState({}, '', `/?bl=${encodeURIComponent(code.trim())}`)
    onNavigate('DELIVERY_NOTES')
  }

  return (
    <header className="carbon-card-dark px-4 pb-3 pt-3.5 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-3 xl:flex-row">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <TrendingUp className="h-[18px] w-[18px] text-[#0f62fe]" aria-hidden="true" />
            {t('dashboard.title', 'Tableau de Bord & Marges')}
          </h1>
          <p className="mt-0.5 text-[11px] text-[#a8a8a8]">
            {t('app.description', 'Négoce de Dattes Locales & Importées • Suivi Logistique & Financier en Temps Réel')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNewOrder ? onNewOrder() : onNavigate('SALES_ORDERS')}
            className="carbon-btn-primary flex items-center gap-1 !px-3 !py-1.5 text-[11px]"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {t('orders.addOrder', 'Nouvelle Commande')}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('DELIVERY_NOTES')}
            className="border border-[#da1e28] px-3 py-1.5 text-[11px] text-[#ff8389] transition-colors hover:bg-[#da1e28]/20"
          >
            {t('dashboard.pendingBLs', 'BL en Attente')} ({pendingBLs})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('MULTI_SITE_INVENTORY')}
            className="border border-[#525252] px-3 py-1.5 text-[11px] text-[#f4f4f4] transition-colors hover:bg-[#262626]"
          >
            {t('nav.inventory', 'Inventaires Multi-Sites')}
          </button>
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-1 border border-[#525252] px-3 py-1.5 text-[11px] text-[#f4f4f4] transition-colors hover:bg-[#262626]"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              Exporter
            </button>
          )}
        </div>
      </div>

      {showQuickAccess ? (
        <form
          onSubmit={handleSearch}
          className="mt-2.5 flex flex-col items-stretch gap-2.5 border border-[#393939] bg-[#262626] px-3 py-1.5 sm:flex-row sm:items-center"
        >
          <label
            htmlFor="bl-quick-access"
            className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-[#d0d0d0]"
          >
            <QrCode className="h-3.5 w-3.5 text-[#0f62fe]" aria-hidden="true" />
            {t('bl.quickSearch', 'Accès Direct BL par QR Code')}
          </label>
          <input
            id="bl-quick-access"
            type="text"
            value={code}
            onChange={event => setCode(event.target.value)}
            placeholder={t('bl.searchPlaceholder', 'Scannez un QR code ou saisissez un lien/code BL...')}
            className="flex-1 border border-[#525252] bg-[#161616] px-2.5 py-1.5 text-[11.5px] text-[#e8e8e8] outline-none placeholder:text-[#8d8d8d] focus:border-[#0f62fe]"
          />
          <button
            type="submit"
            className="carbon-btn-secondary flex items-center justify-center gap-1 whitespace-nowrap !px-3.5 !py-1.5 text-[11px]"
          >
            <Search className="h-3 w-3" aria-hidden="true" />
            {t('common.search', 'Rechercher')}
          </button>
        </form>
      ) : null}
    </header>
  )
}
