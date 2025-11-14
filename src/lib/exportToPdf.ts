import { format } from "date-fns";

import type { Position } from "@/pages/Positions";
import type { ReportSection } from "@/lib/exportToExcel";

type PdfLineStyle = "heading" | "text" | "separator" | "spacer";

type PdfLine = {
  text: string;
  style: PdfLineStyle;
};

type PdfSection = {
  heading: string;
  lines: string[];
};

const STYLE_CONFIG: Record<PdfLineStyle | "title", { fontSize: number; lineHeight: number; skipText?: boolean }> = {
  title: { fontSize: 16, lineHeight: 28 },
  heading: { fontSize: 12, lineHeight: 22 },
  text: { fontSize: 10, lineHeight: 16 },
  separator: { fontSize: 10, lineHeight: 14 },
  spacer: { fontSize: 10, lineHeight: 14, skipText: true },
};

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildTableLines = (
  columns: { key: string; header: string }[],
  rows: Array<Record<string, string | number>>
) => {
  if (rows.length === 0) {
    return ["Nema dostupnih podataka"];
  }

  const widths = columns.map((column) => {
    const headerWidth = column.header.length;
    const maxCellWidth = rows.reduce((max, row) => {
      const raw = row[column.key];
      const text = raw === undefined || raw === null ? "" : String(raw);
      return Math.max(max, text.length);
    }, 0);
    return Math.min(Math.max(headerWidth, maxCellWidth) + 2, 36);
  });

  const formatCell = (value: string | number | undefined, width: number) => {
    const text = value === undefined || value === null ? "" : String(value);
    if (text.length > width) {
      return text.slice(0, Math.max(0, width - 1)) + "…";
    }
    return text.padEnd(width, " ");
  };

  const headerLine = columns
    .map((column, index) => formatCell(column.header, widths[index]))
    .join(" ");
  const separatorLine = widths.map((width) => "-".repeat(Math.max(3, width))).join(" ");

  const dataLines = rows.map((row) =>
    columns
      .map((column, index) => formatCell(row[column.key], widths[index]))
      .join(" ")
  );

  return [headerLine, separatorLine, ...dataLines];
};

const buildPdfLines = (sections: PdfSection[]): PdfLine[] => {
  const lines: PdfLine[] = [];

  sections.forEach((section, index) => {
    lines.push({ text: section.heading, style: "heading" });
    if (section.lines.length === 0) {
      lines.push({ text: "Nema dostupnih podataka", style: "text" });
    } else {
      section.lines.forEach((line) => {
        const style: PdfLineStyle = line.trim().startsWith("-") && line.trim().length > 1 ? "separator" : "text";
        lines.push({ text: line, style });
      });
    }

    if (index !== sections.length - 1) {
      lines.push({ text: "", style: "spacer" });
    }
  });

  if (lines.length === 0) {
    return [{ text: "Nema dostupnih podataka", style: "text" }];
  }

  return lines;
};

const splitIntoPages = (lines: PdfLine[], maxHeight = 700) => {
  const pages: PdfLine[][] = [];
  let currentPage: PdfLine[] = [];
  let currentHeight = 0;

  const pushLine = (line: PdfLine) => {
    const config = STYLE_CONFIG[line.style];
    if (!config) return;

    if (currentHeight + config.lineHeight > maxHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }

    currentPage.push(line);
    currentHeight += config.lineHeight;
  };

  lines.forEach(pushLine);

  if (currentPage.length === 0) {
    currentPage.push({ text: "Nema dostupnih podataka", style: "text" });
  }

  pages.push(currentPage);
  return pages;
};

const buildPageContent = (title: string, lines: PdfLine[], pageIndex: number, totalPages: number) => {
  const marginLeft = 48;
  const startY = 800;
  let currentY = startY;
  let currentFont = -1;

  const commands: string[] = ["BT"];

  const setFont = (size: number) => {
    if (currentFont !== size) {
      commands.push(`/F1 ${size} Tf`);
      currentFont = size;
    }
  };

  const titleLabel =
    totalPages > 1 ? `${title} (strana ${pageIndex + 1}/${totalPages})` : title;
  setFont(STYLE_CONFIG.title.fontSize);
  commands.push(`1 0 0 1 ${marginLeft} ${currentY} Tm`);
  commands.push(`(${escapePdfText(titleLabel)}) Tj`);
  currentY -= STYLE_CONFIG.title.lineHeight;

  lines.forEach((line) => {
    const config = STYLE_CONFIG[line.style];
    if (!config) return;

    currentY -= config === STYLE_CONFIG.separator ? 2 : 0;
    if (currentY < 60) {
      return;
    }

    if (!config.skipText) {
      setFont(config.fontSize);
      commands.push(`1 0 0 1 ${marginLeft} ${currentY} Tm`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
    }

    currentY -= config.lineHeight;
  });

  commands.push("ET");
  return commands.join("\n");
};

const generateSimplePdf = (title: string, sections: PdfSection[]) => {
  const lines = buildPdfLines(sections);
  const pages = splitIntoPages(lines);
  const totalPages = pages.length;

  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3 + pages.length * 2;

  const objects: { id: number; content: string }[] = [];
  objects.push({ id: catalogId, content: `<< /Type /Catalog /Pages ${pagesId} 0 R >>` });

  const pageRefs: string[] = [];
  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    pageRefs.push(`${pageId} 0 R`);

    const contentStream = buildPageContent(title, pageLines, index, totalPages);
    const length = new TextEncoder().encode(contentStream).length;

    const pageObject =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    const contentObject = `<< /Length ${length} >>\nstream\n${contentStream}\nendstream`;

    objects.push({ id: pageId, content: pageObject });
    objects.push({ id: contentId, content: contentObject });
  });

  const pagesObject = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>`;
  objects.splice(1, 0, { id: pagesId, content: pagesObject });

  objects.push({ id: fontId, content: "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>" });

  let pdf = "%PDF-1.4\n";
  const offsets: Record<number, number> = { 0: 0 };

  objects.forEach((object) => {
    offsets[object.id] = pdf.length;
    pdf += `${object.id} 0 obj\n${object.content}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  const totalObjects = fontId;
  pdf += `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjects; i++) {
    const offset = offsets[i] ?? 0;
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjects + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([new TextEncoder().encode(pdf)], { type: "application/pdf" });
};

const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportPositionsToPdf = (positions: Position[], storeName?: string) => {
  const columns = [
    { key: "store", header: "Prodavnica" },
    { key: "position_number", header: "Broj pozicije" },
    { key: "format", header: "Format" },
    { key: "display_type", header: "Tip" },
    { key: "tenant", header: "Zakupac" },
    { key: "status", header: "Status" },
    { key: "expiry_date", header: "Datum isteka" },
  ];

  const rows = positions.map((pos) => ({
    store: pos.store_id,
    position_number: pos.position_number,
    format: pos.format || "-",
    display_type: pos.display_type || "-",
    tenant: pos.tenant || "-",
    status: pos.status === "free" ? "Slobodno" : pos.status === "occupied" ? "Zauzeto" : "Delimično",
    expiry_date: pos.expiry_date ? format(new Date(pos.expiry_date), "dd.MM.yyyy") : "-",
  }));

  const sectionHeading = storeName ? `Pozicije - ${storeName}` : "Pozicije";
  const lines = buildTableLines(columns, rows);
  const pdf = generateSimplePdf(sectionHeading, [{ heading: sectionHeading, lines }]);
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
  const filename = `pozicije_${storeName ? storeName + '_' : ''}${timestamp}.pdf`;
  downloadBlob(pdf, filename);
};

export const exportReportsToPdf = (sections: ReportSection[], storeName?: string) => {
  const preparedSections: PdfSection[] = sections.map((section) => {
    const columns = section.columns.map((column) => ({ key: column.key, header: column.header }));
    const lines = buildTableLines(columns, section.rows);
    return {
      heading: section.title,
      lines,
    };
  });

  if (preparedSections.length === 0) {
    preparedSections.push({ heading: "Izveštaji", lines: ["Nema dostupnih podataka"] });
  }

  const title = storeName ? `Izveštaji - ${storeName}` : "Izveštaji";
  const pdf = generateSimplePdf(title, preparedSections);
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
  const filename = `izvestaji_${storeName ? storeName + '_' : ''}${timestamp}.pdf`;
  downloadBlob(pdf, filename);
};
