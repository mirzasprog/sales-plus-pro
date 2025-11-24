import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

interface ExportOptions<T> {
  data: T[];
  fileName: string;
  worksheetName: string;
  criteria?: Record<string, string | number | undefined>;
  mapRow?: (item: T) => Record<string, string | number | undefined>;
}

@Injectable({ providedIn: 'root' })
export class ReportExportService {
  exportToXlsx<T>(options: ExportOptions<T>): void {
    const { data, fileName, worksheetName, criteria, mapRow } = options;
    const rows = data.map((item) => (mapRow ? mapRow(item) : (item as Record<string, unknown>)));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);

    const preparedCriteria = Object.entries(criteria ?? {})
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => ({ Kriterij: key, Vrijednost: String(value) }));

    if (preparedCriteria.length) {
      const criteriaSheet = XLSX.utils.json_to_sheet(preparedCriteria);
      XLSX.utils.book_append_sheet(workbook, criteriaSheet, 'Kriteriji');
    }

    const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(workbook, safeFileName);
  }
}
