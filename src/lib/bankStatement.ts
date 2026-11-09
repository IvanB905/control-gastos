import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { fingerprintImport, parseBankCsv, type ImportRow, type ParsedImport } from './bankCsv';

type CellValue = string | number | Date | null | undefined;

function normalizeHeader(value: CellValue): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').trim();
}

function parseExcelDate(value: CellValue, XLSX: typeof import('xlsx')): string | null {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    date = new Date(parsed.y, parsed.m - 1, parsed.d);
  } else {
    const text = String(value ?? '').trim();
    const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) {
      date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      if (date.getFullYear() !== Number(iso[1]) || date.getMonth() !== Number(iso[2]) - 1 || date.getDate() !== Number(iso[3])) return null;
      return `${iso[1]}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!match) return null;
    let year = Number(match[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    date = new Date(year, Number(match[2]) - 1, Number(match[1]));
  }
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseAmount(value: CellValue): number {
  if (typeof value === 'number') return value;
  let cleaned = String(value ?? '').replace(/[$\s]/g, '');
  const comma = cleaned.lastIndexOf(',');
  const period = cleaned.lastIndexOf('.');
  if (comma >= 0 && period >= 0) {
    cleaned = comma > period ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  } else if (comma >= 0) {
    cleaned = /,\d{3}$/.test(cleaned) ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  } else if (/\.\d{3}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  }
  return Number(cleaned);
}

function classify(description: string, signedAmount: number): Pick<ImportRow, 'tipo' | 'categoriaSugerida' | 'flujo'> {
  const text = normalizeHeader(description);
  if (text.includes('partners telecom') || text.includes('une epm')) {
    return { tipo: 'gasto', categoriaSugerida: 'Telefonía y servicios', flujo: 'salida' };
  }
  if (/\b(transf|transferencias?|retiros?)\b/.test(text) || text.includes('pago suc virt tc master') || text.includes('pago autom tc master')) {
    return { tipo: 'transferencia', categoriaSugerida: 'Transferencia', flujo: signedAmount < 0 ? 'salida' : 'entrada' };
  }
  if (signedAmount > 0) {
    const payroll = text.includes('nomi') || text.includes('nomina') || text.includes('salario');
    return { tipo: 'ingreso', categoriaSugerida: payroll ? 'Salario' : 'Rendimientos / Inversiones', flujo: 'entrada' };
  }
  if (text.includes('interes') || text.includes('rendimiento')) {
    return { tipo: 'ingreso', categoriaSugerida: 'Rendimientos / Inversiones', flujo: 'entrada' };
  }
  if (text.includes('compra intl') || text.includes('google') || text.includes('apple') || text.includes('opencode')) {
    return { tipo: 'gasto', categoriaSugerida: 'Servicios digitales', flujo: 'salida' };
  }
  if (text.includes('eds ') || text.includes('combustible')) {
    return { tipo: 'gasto', categoriaSugerida: 'Combustible', flujo: 'salida' };
  }
  if (text.includes('mercado') || text.includes('autoservic') || text.includes('tienda d1') || text.includes('dollarcity') || text.includes('rappi') || text.includes('el original')) {
    return { tipo: 'gasto', categoriaSugerida: 'Mercado', flujo: 'salida' };
  }
  return { tipo: 'gasto', categoriaSugerida: 'Otros gastos', flujo: 'salida' };
}

function buildRow(date: string, sourceAccount: string, description: string, signedAmount: number, reference: string): ImportRow {
  const classification = classify(description, signedAmount);
  const currency = 'COP' as const;
  const fingerprint = fingerprintImport([date, sourceAccount, classification.tipo, description, Math.abs(signedAmount).toFixed(2), currency]);
  return {
    sourceAccount,
    fecha: date,
    descripcion: description,
    tipo: classification.tipo,
    monto: Math.abs(signedAmount),
    moneda: currency,
    categoriaSugerida: classification.categoriaSugerida,
    notas: reference ? `Referencia bancaria: ${reference}` : '',
    flujo: classification.flujo,
    fingerprint,
  };
}

const bankHeaders = {
  fecha: ['fecha', 'date'],
  descripcion: ['descripcion', 'description', 'movimiento', 'concepto'],
  valor: ['valor', 'monto', 'amount', 'valor del movimiento'],
  referencia: ['referencia', 'referencia 1', 'documento'],
};

export async function parseBankSpreadsheet(buffer: ArrayBuffer, filename: string): Promise<ParsedImport> {
  const XLSX = await import('xlsx');
  if (/\.xls$/i.test(filename) && !/\.xlsx$/i.test(filename)) {
    const codepages = await import('xlsx/dist/cpexcel.full.mjs');
    XLSX.set_cptable(codepages);
  }
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  if (workbook.SheetNames.length > 20) return { rows: [], errors: ['El archivo supera el límite de 20 hojas.'] };
  let foundTable = false;
  const occurrenceByFingerprint = new Map<string, number>();
  const fileDefaultAccount = filename.toLocaleLowerCase('es-CO').includes('mastercard') ? 'Bancolombia Mastercard' : 'Bancolombia Nómina';

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const values = XLSX.utils.sheet_to_json<CellValue[]>(sheet, { header: 1, raw: true, defval: null, blankrows: false });
    if (values.length > 20_000) {
      errors.push(`${sheetName}: la hoja supera el límite de 20.000 filas.`);
      return;
    }
    const headerIndex = values.findIndex((row) => {
      const headers = row.map(normalizeHeader);
      return bankHeaders.fecha.some((key) => headers.includes(key))
        && bankHeaders.descripcion.some((key) => headers.includes(key))
        && bankHeaders.valor.some((key) => headers.includes(key));
    });
    if (headerIndex < 0) return;
    foundTable = true;
    const headers = values[headerIndex].map(normalizeHeader);
    const column = (aliases: string[]) => headers.findIndex((header) => aliases.includes(header));
    const dateColumn = column(bankHeaders.fecha);
    const descriptionColumn = column(bankHeaders.descripcion);
    const amountColumn = column(bankHeaders.valor);
    const referenceColumn = column(bankHeaders.referencia);

    values.slice(headerIndex + 1).forEach((row, index) => {
      const lineNumber = index + headerIndex + 2;
      const date = parseExcelDate(row[dateColumn], XLSX);
      const description = String(row[descriptionColumn] ?? '').trim();
      const amount = parseAmount(row[amountColumn]);
      const reference = referenceColumn >= 0 ? String(row[referenceColumn] ?? '').trim() : '';
      if (!date || !description || !Number.isFinite(amount) || amount === 0) {
        if (row.some((cell) => cell != null && String(cell).trim())) errors.push(`${sheetName}, fila ${lineNumber}: no se pudo reconocer fecha, descripción o valor.`);
        return;
      }
      const importedRow = buildRow(date, fileDefaultAccount, description, amount, reference);
      const occurrence = (occurrenceByFingerprint.get(importedRow.fingerprint) || 0) + 1;
      occurrenceByFingerprint.set(importedRow.fingerprint, occurrence);
      importedRow.fingerprint = `${importedRow.fingerprint}-${occurrence}`;
      rows.push(importedRow);
    });
  });

  if (!foundTable) return { rows: [], errors: ['No encontré una tabla con columnas Fecha, Descripción y Valor. Descarga el detalle de movimientos de Bancolombia en Excel.'] };
  if (!rows.length && !errors.length) errors.push('El archivo no contiene movimientos para importar.');
  return { rows, errors };
}

interface PdfTextItem {
  str: string;
  transform: number[];
}

export async function parseBancolombiaPdf(buffer: ArrayBuffer): Promise<ParsedImport> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  if (document.numPages > 50) {
    await loadingTask.destroy();
    return { rows: [], errors: ['El PDF supera el límite de 50 páginas. Exporta un periodo más corto desde Bancolombia.'] };
  }
  const allItems: Array<{ page: number; x: number; y: number; text: string }> = [];
  let statementYear = new Date().getFullYear();
  let sourceAccount = 'Bancolombia Nómina';

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    (content.items as PdfTextItem[]).forEach((item) => {
      if (!item.str?.trim()) return;
      const x = item.transform[4];
      const y = item.transform[5];
      const text = item.str.trim();
      const periodYear = text.match(/(?:DESDE|HASTA)\s*:?\s*\d{4}\/\d{2}\/\d{2}/i);
      const year = periodYear?.[0].match(/\d{4}/);
      if (year) statementYear = Number(year[0]);
      if (/NÚMERO\s*$/i.test(text)) {
        const next = (content.items as PdfTextItem[]).find((candidate) => Math.abs(candidate.transform[5] - y) < 1 && candidate.transform[4] > x + 20 && /^\d{8,}$/.test(candidate.str.trim()));
        if (next) sourceAccount = `Ahorros Bancolombia ${next.str.trim().slice(-4)}`;
      }
      allItems.push({ page: pageNumber, x, y, text });
    });
  }
  await loadingTask.destroy();

  const rowGroups: Array<{ page: number; y: number; items: typeof allItems }> = [];
  allItems.forEach((item) => {
    let group = rowGroups.find((entry) => entry.page === item.page && Math.abs(entry.y - item.y) < 1.4);
    if (!group) {
      group = { page: item.page, y: item.y, items: [] };
      rowGroups.push(group);
    }
    group.items.push(item);
  });

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  const occurrenceByFingerprint = new Map<string, number>();
  rowGroups.forEach((group) => {
    const dateItem = group.items.find((item) => item.x < 75 && /^\d{1,2}\/\d{1,2}$/.test(item.text));
    if (!dateItem) return;
    const description = group.items.filter((item) => item.x >= 75 && item.x < 265).sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
    const valueItems = group.items.filter((item) => item.x >= 430 && item.x < 530 && /-?[\d,]+\.\d{2}/.test(item.text));
    const amountText = valueItems.map((item) => item.text).find((text) => /-/.test(text)) || valueItems.at(-1)?.text;
    if (!description || !amountText) {
      errors.push(`Página ${group.page}: se omitió una fila que no se pudo leer con claridad.`);
      return;
    }
    const amount = parseAmount(amountText);
    const [day, month] = dateItem.text.split('/').map(Number);
    const date = `${statementYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!Number.isFinite(amount) || amount === 0 || month < 1 || month > 12 || day < 1 || day > 31) {
      errors.push(`Página ${group.page}: se omitió una fila con fecha o valor inválido.`);
      return;
    }
    const importedRow = buildRow(date, sourceAccount, description, amount, '');
    const occurrence = (occurrenceByFingerprint.get(importedRow.fingerprint) || 0) + 1;
    occurrenceByFingerprint.set(importedRow.fingerprint, occurrence);
    importedRow.fingerprint = `${importedRow.fingerprint}-${occurrence}`;
    rows.push(importedRow);
  });

  if (!rows.length) return { rows: [], errors: ['No pude reconocer la tabla de movimientos de este PDF. Si es un extracto escaneado o de tarjeta de crédito, usa el archivo Excel de movimientos de Bancolombia.'] };
  return { rows, errors };
}

export async function parseBankFile(file: File): Promise<ParsedImport> {
  if (/\.csv$/i.test(file.name)) return parseBankCsv(await file.text());
  if (/\.pdf$/i.test(file.name)) return parseBancolombiaPdf(await file.arrayBuffer());
  if (/\.(xls|xlsx)$/i.test(file.name)) return parseBankSpreadsheet(await file.arrayBuffer(), file.name);
  return { rows: [], errors: ['Formato no compatible. Selecciona un archivo CSV, Excel (XLS/XLSX) o PDF de Bancolombia.'] };
}
