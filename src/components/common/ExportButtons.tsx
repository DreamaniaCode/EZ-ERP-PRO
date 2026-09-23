import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { exportToExcel, exportToCsv, exportElementToPdf, exportDataToPdf } from '../../utils/exportUtils';

interface ExportButtonsProps {
  filename: string;
  title?: string;
  frigoName?: string;
  frigoLocation?: string;
  excelData?: Record<string, any>[];
  pdfElementId?: string;
  pdfHeaders?: string[];
  pdfRows?: (string | number)[][];
  sheetName?: string;
  size?: 'sm' | 'md';
  onExportPdf?: () => void;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  filename,
  title = 'Rapport ERP',
  frigoName,
  frigoLocation,
  excelData,
  pdfElementId,
  pdfHeaders,
  pdfRows,
  sheetName = 'Données',
  size = 'md',
  onExportPdf,
}) => {
  const { t } = useTranslation();

  const handleExcelExport = () => {
    if (excelData && excelData.length > 0) {
      exportToExcel(excelData, filename, {
        title,
        frigoName,
        frigoLocation,
        includeTotals: true,
        sheetName,
      });
    } else {
      alert(t('common.noData', 'Aucune donnée à exporter.'));
    }
  };

  const handleCsvExport = () => {
    if (excelData && excelData.length > 0) {
      exportToCsv(excelData, filename);
    } else {
      alert(t('common.noData', 'Aucune donnée à exporter.'));
    }
  };

  const handlePdfExport = () => {
    if (onExportPdf) {
      onExportPdf();
      return;
    }
    if (excelData && excelData.length > 0) {
      exportDataToPdf(excelData, filename, title, {
        frigoName,
        frigoLocation,
      });
    } else if (pdfElementId && document.getElementById(pdfElementId)) {
      exportElementToPdf(pdfElementId, filename, title);
    } else if (pdfHeaders && pdfRows && pdfRows.length > 0) {
      const rowsObj = pdfRows.map(r => {
        const obj: Record<string, any> = {};
        pdfHeaders.forEach((h, idx) => {
          obj[h] = r[idx] ?? '';
        });
        return obj;
      });
      exportDataToPdf(rowsObj, filename, title, { frigoName, frigoLocation });
    } else {
      alert(t('common.noData', 'Aucune donnée à exporter en PDF.'));
    }
  };

  const btnPadding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleExcelExport}
        className={`flex items-center gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded transition shadow-sm ${btnPadding}`}
        title="Exporter vers Microsoft Excel (.xlsx)"
      >
        <FileSpreadsheet className={iconSize} />
        <span>Excel</span>
      </button>

      <button
        onClick={handleCsvExport}
        className={`flex items-center gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded transition shadow-sm ${btnPadding}`}
        title="Exporter en fichier CSV (UTF-8)"
      >
        <Download className={iconSize} />
        <span>CSV</span>
      </button>

      <button
        onClick={handlePdfExport}
        className={`flex items-center gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded transition shadow-sm ${btnPadding}`}
        title="Exporter ou Imprimer en PDF"
      >
        <FileText className={iconSize} />
        <span>PDF</span>
      </button>
    </div>
  );
};

