import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExcelExportOptions {
  title?: string;
  frigoName?: string;
  frigoLocation?: string;
  includeTotals?: boolean;
  sheetName?: string;
}

/**
 * Export formatted array of objects to Excel .xlsx file with French Header, Totals, and Frigo Situation
 */
export function exportToExcel(
  data: Record<string, any>[], 
  filename: string, 
  optionsOrSheetName?: string | ExcelExportOptions
) {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  const options: ExcelExportOptions = typeof optionsOrSheetName === 'string'
    ? { sheetName: optionsOrSheetName }
    : (optionsOrSheetName || {});

  const sheetName = options.sheetName || 'Rapport ERP';
  const reportTitle = options.title || filename.replace(/_/g, ' ').toUpperCase();
  const dateStrFR = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const frigoInfo = options.frigoName 
    ? `SITUATION FRIGO: ${options.frigoName.toUpperCase()}${options.frigoLocation ? ` (${options.frigoLocation})` : ''}` 
    : 'SITUATION FRIGO: TOUS LES FRIGOS & ENTREPÔTS';

  // Build 2D array for Excel Sheet
  const sheetRows: any[][] = [];

  // Header Banner rows in French
  sheetRows.push(['EASYERP PRO - NÉGOCE & LOGISTIQUE AGRO-ALIMENTAIRE']);
  sheetRows.push([reportTitle]);
  sheetRows.push([`Date de génération: ${dateStrFR}`]);
  sheetRows.push([frigoInfo]);
  sheetRows.push([]); // Empty row separator

  // Table Column Headers (Keys from data)
  const keys = Object.keys(data[0] || {});
  sheetRows.push(keys);

  // Data rows and calculate totals for numeric columns
  const numericTotals: Record<string, number> = {};
  const numericKeys = new Set<string>();

  data.forEach(item => {
    const rowVals = keys.map(k => {
      const val = item[k];
      if (typeof val === 'number') {
        numericKeys.add(k);
        numericTotals[k] = (numericTotals[k] || 0) + val;
      }
      return val ?? '';
    });
    sheetRows.push(rowVals);
  });

  // Calculate Totals Row at bottom
  if (options.includeTotals !== false && numericKeys.size > 0) {
    const totalsRow = keys.map((k, idx) => {
      if (idx === 0) return 'TOTAL GÉNÉRAL';
      if (numericKeys.has(k)) {
        const sum = numericTotals[k] || 0;
        return Number.isInteger(sum) ? sum : Math.round(sum * 100) / 100;
      }
      return '';
    });
    sheetRows.push(totalsRow);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit column widths
  const maxCols = keys.map((key, colIdx) => {
    let maxLen = key.length;
    sheetRows.forEach(r => {
      const cellVal = r[colIdx];
      const valStr = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 4, 14), 60) };
  });
  worksheet['!cols'] = maxCols;

  const dateFileStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}_${dateFileStr}.xlsx`);
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
 * Helper to download a jsPDF document as a clean file without opening print dialog
 */
export function downloadPdfDoc(doc: jsPDF, filename: string): void {
  const dateFileStr = new Date().toISOString().slice(0, 10);
  const cleanName = filename.toLowerCase().endsWith('.pdf') 
    ? filename 
    : `${filename}_${dateFileStr}.pdf`;

  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
    }, 1500);
  } catch (err) {
    console.warn('Blob download fallback to doc.save:', err);
    try {
      doc.save(cleanName);
    } catch (e) {
      console.error('doc.save failed:', e);
    }
  }
}

/**
 * Clean vector PDF exporter for arbitrary tabular data using jsPDF
 * Directly downloads the PDF file (NO window.print() or printer prompt)
 */
export function exportDataToPdf(
  data: Record<string, any>[],
  filename: string,
  title?: string,
  options?: ExcelExportOptions
): void {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  const keys = Object.keys(data[0] || {});
  if (keys.length === 0) return;

  const isLandscape = keys.length > 5;
  const doc = new jsPDF({
    orientation: isLandscape ? 'l' : 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pw - margin * 2;

  const reportTitle = title || filename.replace(/_/g, ' ').toUpperCase();
  const dateStrFR = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const frigoInfo = options?.frigoName
    ? `SITUATION FRIGO: ${options.frigoName.toUpperCase()}${options.frigoLocation ? ` (${options.frigoLocation})` : ''}`
    : 'SITUATION: TOUS LES FRIGOS & ENTREPÔTS';

  // Calculate Column Widths proportionally
  const colWidths: number[] = [];
  const colNumeric: boolean[] = [];

  keys.forEach((key) => {
    let maxChar = key.length;
    let isNum = true;
    for (let r = 0; r < Math.min(data.length, 30); r++) {
      const v = data[r][key];
      if (v !== undefined && v !== null && v !== '') {
        const s = String(v);
        if (s.length > maxChar) maxChar = s.length;
        if (typeof v !== 'number' && isNaN(Number(String(v).replace(/[\s,DHkg]/gi, '')))) {
          isNum = false;
        }
      }
    }
    colNumeric.push(isNum);
    colWidths.push(Math.max(maxChar, 8));
  });

  const totalChars = colWidths.reduce((a, b) => a + b, 0);
  const finalColWidths = colWidths.map(w => Math.max((w / totalChars) * usableW, 14));
  
  // Re-normalize to exact usableW
  const sumWidths = finalColWidths.reduce((a, b) => a + b, 0);
  const scale = usableW / sumWidths;
  const normalizedWidths = finalColWidths.map(w => w * scale);

  let y = margin;
  let pageNumber = 1;

  const drawPageHeader = () => {
    // Top banner
    doc.setFillColor(15, 98, 254);
    doc.rect(margin, y, usableW, 2, 'F');
    y += 5;

    // Company and System
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('EZ-ERP PRO — SYSTÈME DE GESTION AGRO-ALIMENTAIRE & LOGISTIQUE', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Édité le ${dateStrFR}`, pw - margin, y, { align: 'right' });
    y += 5;

    // Report Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle, margin, y);
    y += 4;

    // Subtitle / Frigo situation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(frigoInfo, margin, y);
    y += 5;

    // Table Header Row
    const headerH = 7.5;
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, usableW, headerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let curX = margin;
    keys.forEach((key, idx) => {
      const colW = normalizedWidths[idx];
      const align = colNumeric[idx] ? 'right' : 'left';
      const textX = align === 'right' ? curX + colW - 2 : curX + 2;
      const truncated = key.length > 18 ? key.slice(0, 16) + '..' : key;
      doc.text(truncated, textX, y + 5, { align: align as any });
      curX += colW;
    });

    y += headerH;
  };

  const drawPageFooter = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, ph - margin - 4, pw - margin, ph - margin - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('EZ-ERP PRO • Document confidentiel d\'exploitation', margin, ph - margin);
    doc.text(`Page ${pageNumber}`, pw - margin, ph - margin, { align: 'right' });
  };

  drawPageHeader();

  // Draw Table Rows
  const rowH = 6;
  const numericTotals: Record<string, number> = {};

  data.forEach((item, rIdx) => {
    // Check page overflow
    if (y + rowH > ph - margin - 12) {
      drawPageFooter();
      doc.addPage();
      pageNumber++;
      y = margin;
      drawPageHeader();
    }

    // Row background zebra
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, usableW, rowH, 'F');
    }

    // Row divider
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH, pw - margin, y + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    let curX = margin;
    keys.forEach((key, cIdx) => {
      const colW = normalizedWidths[cIdx];
      const val = item[key];
      const align = colNumeric[cIdx] ? 'right' : 'left';
      const textX = align === 'right' ? curX + colW - 2 : curX + 2;

      let strVal = val !== undefined && val !== null ? String(val) : '';
      if (typeof val === 'number') {
        numericTotals[key] = (numericTotals[key] || 0) + val;
        strVal = val.toLocaleString('fr-FR');
      }

      // Max characters fit
      const maxChars = Math.floor(colW / 1.7);
      if (strVal.length > maxChars) {
        strVal = strVal.slice(0, maxChars - 1) + '…';
      }

      doc.text(strVal, textX, y + 4.2, { align: align as any });
      curX += colW;
    });

    y += rowH;
  });

  // Totals Row if applicable
  if (Object.keys(numericTotals).length > 0) {
    if (y + rowH > ph - margin - 12) {
      drawPageFooter();
      doc.addPage();
      pageNumber++;
      y = margin;
      drawPageHeader();
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, usableW, rowH + 1, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pw - margin, y);
    doc.line(margin, y + rowH + 1, pw - margin, y + rowH + 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    let curX = margin;
    keys.forEach((key, cIdx) => {
      const colW = normalizedWidths[cIdx];
      if (cIdx === 0) {
        doc.text('TOTAL GÉNÉRAL', curX + 2, y + 4.8);
      } else if (numericTotals[key] !== undefined) {
        const sum = numericTotals[key];
        const sumStr = Number.isInteger(sum) ? sum.toLocaleString('fr-FR') : sum.toFixed(2);
        doc.text(sumStr, curX + colW - 2, y + 4.8, { align: 'right' });
      }
      curX += colW;
    });

    y += rowH + 3;
  }

  drawPageFooter();
  downloadPdfDoc(doc, filename);
}

/**
 * Dedicated, beautifully formatted Stock History PDF generator for a specific product
 * Includes Product Details Card, Frigo Breakdown, and Chronological Movements Table
 */
export function exportProductHistoryPdf(
  product: {
    code: string;
    name: string;
    category: string;
    origin?: string;
    sellingPriceHT?: number;
    unitCostHT?: number;
    kgPerCarton?: number;
    cartonsPerPallet?: number;
    kgPerPallet?: number;
    minStockAlertKg?: number;
    description?: string;
  },
  movements: {
    date: string;
    time: string;
    type: string;
    documentRef: string;
    orderRef?: string;
    frigoName: string;
    partyName: string;
    changeKg: number;
    changePallets: number;
    unitPriceHT?: number;
    totalHT?: number;
    status?: string;
    notes?: string;
  }[],
  summary: {
    effectiveStockKg: number;
    totalPallets: number;
    totalEntriesKg: number;
    totalExitsKg: number;
    frigoBreakdown?: { frigoName: string; quantityKg: number; quantityPallets: number }[];
  }
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pw = doc.internal.pageSize.getWidth(); // 297mm
  const ph = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 10;
  const usableW = pw - margin * 2; // 277mm

  const dateStrFR = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let pageNumber = 1;
  let y = margin;

  const drawPageFooter = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, ph - margin - 4, pw - margin, ph - margin - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`EZ-ERP PRO • Fiche Historique Produit [${product.code} - ${product.name}]`, margin, ph - margin);
    doc.text(`Généré le ${dateStrFR} — Page ${pageNumber}`, pw - margin, ph - margin, { align: 'right' });
  };

  // 1. Top Header Banner
  doc.setFillColor(15, 98, 254);
  doc.rect(margin, y, usableW, 2, 'F');
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('EZ-ERP PRO — RAPPORT DÉTAILLÉ DE STOCK & HISTORIQUE DES MOUVEMENTS', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Édité le ${dateStrFR}`, pw - margin, y, { align: 'right' });
  y += 5;

  // 2. Product Specifications & KPI Box (Page 1)
  const cardH = 26;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, usableW, cardH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, usableW, cardH, 2, 2, 'S');

  // Col 1: Product Identity
  const col1X = margin + 4;
  doc.setFillColor(15, 98, 254);
  doc.roundedRect(col1X, y + 3, 28, 5.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(product.code, col1X + 14, y + 7, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(product.name, col1X + 31, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Catégorie : ${product.category}  •  Origine : ${product.origin || 'Maroc'}`, col1X, y + 14);
  doc.text(`Conditionnement : ${product.kgPerCarton || 5} kg/colis  •  ${product.cartonsPerPallet || 160} colis/pal (${product.kgPerPallet || 800} kg/pal)`, col1X, y + 19);
  if (product.minStockAlertKg) {
    doc.text(`Seuil alerte mini : ${product.minStockAlertKg.toLocaleString()} kg`, col1X, y + 23.5);
  }

  // Col 2: Financials & Pricing
  const col2X = margin + 115;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('TARIFICATION & RENTABILITÉ :', col2X, y + 6);

  const sellPrice = product.sellingPriceHT || 0;
  const costPrice = product.unitCostHT || 0;
  const marginKg = Math.max(0, sellPrice - costPrice);
  const marginPct = sellPrice > 0 ? ((marginKg / sellPrice) * 100).toFixed(1) : '0';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Prix Vente HT : `, col2X, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`${sellPrice.toFixed(2)} DH / kg`, col2X + 24, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Coût Revient HT : `, col2X, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(`${costPrice.toFixed(2)} DH / kg`, col2X + 24, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Marge Brute HT : `, col2X, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 98, 254);
  doc.text(`+${marginKg.toFixed(2)} DH/kg (${marginPct}%)`, col2X + 24, y + 22);

  // Col 3: Stock Summary Badges
  const col3X = margin + 195;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col3X, y + 3, usableW - 195 - 4, 20, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('STOCK ACTUEL DISPONIBLE :', col3X + 3, y + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 98, 254);
  doc.text(`${summary.effectiveStockKg.toLocaleString()} Kg`, col3X + 3, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`(${summary.totalPallets} Palettes)`, col3X + 45, y + 13.5);

  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`+ Entrées (Achats) : ${summary.totalEntriesKg.toLocaleString()} kg`, col3X + 3, y + 18.5);

  doc.setTextColor(225, 29, 72);
  doc.text(`- Sorties (BLs) : ${summary.totalExitsKg.toLocaleString()} kg`, col3X + 45, y + 18.5);

  y += cardH + 5;

  // Frigo Breakdown mini-pill if exists
  if (summary.frigoBreakdown && summary.frigoBreakdown.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const frigoStr = summary.frigoBreakdown
      .filter(f => f.quantityKg > 0)
      .map(f => `${f.frigoName} : ${f.quantityKg.toLocaleString()} kg (${f.quantityPallets} pal)`)
      .join('  •  ');

    if (frigoStr) {
      doc.text(`Répartition Frigos : ${frigoStr}`, margin + 2, y);
      y += 4;
    }
  }

  // 3. Movement Log Table
  const headers = [
    { title: 'Date', w: 22, align: 'left' },
    { title: 'Heure', w: 16, align: 'left' },
    { title: 'Type Mouvement', w: 32, align: 'left' },
    { title: 'Réf. Document', w: 26, align: 'left' },
    { title: 'Commande', w: 20, align: 'left' },
    { title: 'Tiers (Client / Fournisseur)', w: 46, align: 'left' },
    { title: 'Entrepôt Frigo', w: 34, align: 'left' },
    { title: 'Impact Kg', w: 23, align: 'right' },
    { title: 'Palettes', w: 16, align: 'right' },
    { title: 'P.U HT', w: 18, align: 'right' },
    { title: 'Total HT', w: 24, align: 'right' },
  ];

  const headerH = 7;
  const drawTableHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, usableW, headerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let curX = margin;
    headers.forEach(h => {
      const textX = h.align === 'right' ? curX + h.w - 2 : curX + 2;
      doc.text(h.title, textX, y + 4.8, { align: h.align as any });
      curX += h.w;
    });

    y += headerH;
  };

  drawTableHeader();

  // Draw Movement Rows
  const rowH = 6;
  movements.forEach((mv, idx) => {
    if (y + rowH > ph - margin - 12) {
      drawPageFooter();
      doc.addPage();
      pageNumber++;
      y = margin;

      // Repeat condensed header on subsequent pages
      doc.setFillColor(15, 98, 254);
      doc.rect(margin, y, usableW, 1.5, 'F');
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Historique des mouvements — ${product.code} (${product.name})`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Suite — Page ${pageNumber}`, pw - margin, y, { align: 'right' });
      y += 4;

      drawTableHeader();
    }

    // Zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, usableW, rowH, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH, pw - margin, y + rowH);

    let curX = margin;

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(mv.date || '-', curX + 2, y + 4.2);
    curX += headers[0].w;

    // Time
    doc.text(mv.time || '-', curX + 2, y + 4.2);
    curX += headers[1].w;

    // Type Movement Badge text
    const isEntry = mv.type === 'ENTREE_ACHAT';
    const isExit = mv.type === 'SORTIE_BL';
    const typeLabel = isEntry ? 'Entrée (Achat)' : isExit ? 'Sortie (BL)' : 'Ajustement';

    if (isEntry) doc.setTextColor(16, 185, 129);
    else if (isExit) doc.setTextColor(225, 29, 72);
    else doc.setTextColor(79, 70, 229);

    doc.setFont('helvetica', 'bold');
    doc.text(typeLabel, curX + 2, y + 4.2);
    curX += headers[2].w;

    // Document Ref
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 98, 254);
    doc.text(mv.documentRef || '-', curX + 2, y + 4.2);
    curX += headers[3].w;

    // Order Ref
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(mv.orderRef || '-', curX + 2, y + 4.2);
    curX += headers[4].w;

    // Party Name (Client / Supplier)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const partyTruncated = (mv.partyName || '-').slice(0, 26);
    doc.text(partyTruncated, curX + 2, y + 4.2);
    curX += headers[5].w;

    // Frigo
    doc.setTextColor(71, 85, 105);
    const frigoTruncated = (mv.frigoName || '-').split('-')[0].trim().slice(0, 18);
    doc.text(frigoTruncated, curX + 2, y + 4.2);
    curX += headers[6].w;

    // Change Kg
    const kgStr = mv.changeKg > 0 ? `+${mv.changeKg.toLocaleString()} kg` : `${mv.changeKg.toLocaleString()} kg`;
    if (mv.changeKg > 0) doc.setTextColor(16, 185, 129);
    else doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.text(kgStr, curX + headers[7].w - 2, y + 4.2, { align: 'right' });
    curX += headers[7].w;

    // Pallets
    const palStr = mv.changePallets > 0 ? `+${mv.changePallets}` : `${mv.changePallets}`;
    doc.setTextColor(109, 40, 217);
    doc.text(palStr, curX + headers[8].w - 2, y + 4.2, { align: 'right' });
    curX += headers[8].w;

    // PU HT
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const puStr = mv.unitPriceHT ? `${mv.unitPriceHT.toFixed(2)}` : '-';
    doc.text(puStr, curX + headers[9].w - 2, y + 4.2, { align: 'right' });
    curX += headers[9].w;

    // Total HT
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const totStr = mv.totalHT ? `${mv.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH` : '-';
    doc.text(totStr, curX + headers[10].w - 2, y + 4.2, { align: 'right' });

    y += rowH;
  });

  drawPageFooter();
  downloadPdfDoc(doc, `Historique_Stock_${product.code}`);
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
    exportDataToPdf(formattedData, filename, title || filename);
  }
}

/**
 * Capture HTML container or table and export clean PDF document with safe download
 */
export async function exportElementToPdf(elementId: string, filename: string, title?: string) {
  const element = document.getElementById(elementId);
  if (!element) {
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

    downloadPdfDoc(pdf, filename);
  } catch (err) {
    console.error('Erreur exportElementToPdf:', err);
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

