type CsvValue = string | number | null | undefined;

function escapeCsv(value: CsvValue): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Genera y descarga un archivo CSV.
 * Incluye BOM para que Excel muestre bien las tildes y la ñ.
 */
export function downloadCsv(fileName: string, headers: string[], rows: CsvValue[][]): void {
  const content = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
