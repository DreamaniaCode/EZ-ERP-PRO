import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export generic array of objects to Excel .xlsx file
 */
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportColumn {
  key: string;
  label: string;
}

/**
 * Export generic array of objects to Excel .xlsx file
 */
export function exportToExcel(data: Record<string, any>[], filename: string, sheetName: string = 'Données') {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit column widths
  const maxCols = Object.keys(data[0] || {}).map(key => {
    let maxLen = key.length;
    data.forEach(row => {
      const valStr = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
  });
  worksheet['!cols'] = maxCols;

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}

/**
 * Export generic array of objects to CSV with UTF-8 BOM (proper Arabic support in Excel)
 */
export function exportToCsv(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  const keys = Object.keys(data[0]);
  const headerRow = keys.map(k => `"${k.replace(/"/g, '""')}"`).join(',');
  
  const bodyRows = data.map(row => {
    return keys
      .map(k => {
        const val = row[k] !== undefined && row[k] !== null ? String(row[k]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // \uFEFF is UTF-8 Byte Order Mark, crucial for Excel opening Arabic CSVs correctly
  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filename}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Unified Export Model Helper for Excel, CSV and PDF
 */
export function exportDataModel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  format: 'excel' | 'csv' | 'pdf',
  title?: string
) {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  // Format data using mapped columns
  const formattedData = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      obj[col.label] = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
    });
    return obj;
  });

  if (format === 'excel') {
    exportToExcel(formattedData, filename, title || filename);
  } else if (format === 'csv') {
    exportToCsv(formattedData, filename);
  } else if (format === 'pdf') {
    const headers = columns.map(c => c.label);
    const rows = data.map(row => columns.map(c => (row[c.key] !== undefined && row[c.key] !== null ? String(row[c.key]) : '')));
    printDataReport(title || filename, headers, rows);
  }
}

/**
 * Capture HTML container or table and export clean PDF document
 */
export async function exportElementToPdf(elementId: string, filename: string, title?: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    pdf.save(`${filename}_${dateStr}.pdf`);
  } catch (err) {
    console.error('Erreur export PDF:', err);
    window.print();
  }
}

/**
 * Print window formatted export helper
 */
export function printDataReport(title: string, headers: string[], rows: (string | number)[][]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les fenêtres surgissantes pour l\'impression.');
    return;
  }

  const isArabic = /[\u0600-\u06FF]/.test(title + (headers[0] || ''));
  const dir = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'right' : 'left';

  const tableRowsHtml = rows
    .map(
      row =>
        `<tr style="border-bottom: 1px solid #e5e7eb;">${row
          .map(cell => `<td style="padding: 8px 12px; font-size: 12px; text-align: ${textAlign};">${cell}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const tableHeaderHtml = headers
    .map(h => `<th style="padding: 10px 12px; font-size: 12px; font-weight: bold; background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; text-align: ${textAlign};">${h}</th>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html dir="${dir}">
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #111827; direction: ${dir}; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0f62fe; padding-bottom: 12px; }
          .title { font-size: 20px; font-weight: bold; color: #0f62fe; }
          .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          <div class="subtitle">Généré le ${new Date().toLocaleDateString('fr-FR')} - EZ-ERP PRO</div>
        </div>
        <table>
          <thead><tr>${tableHeaderHtml}</tr></thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

