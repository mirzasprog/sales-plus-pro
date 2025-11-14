import * as XLSX from 'xlsx';
import { format } from 'date-fns';

import { Position } from '@/pages/Positions';

export interface ReportColumn {
  key: string;
  header: string;
}

export interface ReportSection {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
}

export const exportPositionsToExcel = (positions: Position[], storeName?: string) => {
  // Prepare data for Excel
  const excelData = positions.map((pos) => ({
    'Prodavnica': pos.store_id,
    'Broj pozicije': pos.position_number,
    'Format': pos.format,
    'Tip': pos.display_type,
    'Namena': pos.purpose || '-',
    'Departman': pos.department || '-',
    'Kategorija': pos.category || '-',
    'Najbliža osoba': pos.nearest_person || '-',
    'Odgovorna osoba': pos.responsible_person || '-',
    'Zakupac': pos.tenant || '-',
    'Datum isteka': pos.expiry_date ? format(new Date(pos.expiry_date), 'dd.MM.yyyy') : '-',
    'Status': pos.status === 'free' ? 'Slobodno' : 'Zauzeto',
    'X pozicija': pos.x,
    'Y pozicija': pos.y,
    'Širina': pos.width,
    'Visina': pos.height,
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Prodavnica
    { wch: 15 }, // Broj pozicije
    { wch: 12 }, // Format
    { wch: 15 }, // Tip
    { wch: 20 }, // Namena
    { wch: 15 }, // Departman
    { wch: 15 }, // Kategorija
    { wch: 20 }, // Najbliža osoba
    { wch: 20 }, // Odgovorna osoba
    { wch: 25 }, // Zakupac
    { wch: 15 }, // Datum isteka
    { wch: 12 }, // Status
    { wch: 10 }, // X pozicija
    { wch: 10 }, // Y pozicija
    { wch: 10 }, // Širina
    { wch: 10 }, // Visina
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  const sheetName = storeName || 'Pozicije';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = `pozicije_${storeName ? storeName + '_' : ''}${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);
};

export const exportReportsToExcel = (sections: ReportSection[], storeName?: string) => {
  const workbook = XLSX.utils.book_new();

  sections.forEach((section) => {
    if (section.rows.length === 0) {
      return;
    }

    const headers = section.columns.map((column) => column.header);
    const sheetData = section.rows.map((row) => {
      const entry: Record<string, string | number> = {};
      section.columns.forEach((column) => {
        const raw = row[column.key];
        entry[column.header] = raw === undefined || raw === null ? '' : raw;
      });
      return entry;
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
    worksheet['!cols'] = section.columns.map(() => ({ wch: 18 }));

    const sanitizedTitle = section.title.replace(/[^\w\u0080-\uFFFF]+/g, ' ').trim() || 'Izveštaj';
    const sheetName = sanitizedTitle.slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  if (workbook.SheetNames.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([["Nema dostupnih podataka"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Izveštaj');
  }

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = `izvestaji_${storeName ? storeName + '_' : ''}${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
};
