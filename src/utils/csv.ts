/**
 * Universal CSV Helper Utility
 * Handles RFC 4180 compliant CSV parsing, generating, and downloading
 */

export function escapeCSVField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCSVField).join(',');
  const rowLines = rows.map(row => row.map(escapeCSVField).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  const csvContent = generateCSV(headers, rows);
  // Prepend UTF-8 BOM so Excel opens Indonesian accents and symbols properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  // Clean potential BOM
  let text = csvText.replace(/^\uFEFF/, '').trim();
  if (!text) return { headers: [], rows: [] };

  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    return fields;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim().replace(/^"+|"+$/g, ''));

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const parsedRow = parseLine(lines[i]);
    // Skip empty lines
    if (parsedRow.some(f => f.trim().length > 0)) {
      rows.push(parsedRow);
    }
  }

  return { headers, rows };
}
