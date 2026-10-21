import type { TipoMoneda, TipoMovimiento } from '../types';

export interface ImportRow {
  sourceAccount: string;
  fecha: string;
  descripcion: string;
  tipo: TipoMovimiento;
  monto: number;
  moneda: TipoMoneda;
  categoriaSugerida: string;
  notas: string;
  flujo: 'entrada' | 'salida';
  fingerprint: string;
}

export interface ParsedImport {
  rows: ImportRow[];
  errors: string[];
}

const REQUIRED_HEADERS = [
  'fecha',
  'cuenta',
  'tipo',
  'descripcion',
  'monto_firmado',
  'moneda',
  'categoria_sugerida',
  'nota',
];

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function fingerprint(parts: string[]): string {
  const input = parts.join('|').toLocaleLowerCase('es-CO');
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function parseBankCsv(content: string): ParsedImport {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { rows: [], errors: ['El archivo no contiene movimientos.'] };

  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.toLocaleLowerCase('es-CO'));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return { rows: [], errors: [`Faltan columnas requeridas: ${missingHeaders.join(', ')}.`] };
  }

  const positions = Object.fromEntries(REQUIRED_HEADERS.map((header) => [header, headers.indexOf(header)]));
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  const occurrenceByFingerprint = new Map<string, number>();

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const lineNumber = index + 2;
    const date = values[positions.fecha] || '';
    const sourceAccount = values[positions.cuenta] || '';
    const type = values[positions.tipo]?.toLocaleLowerCase('es-CO');
    const description = values[positions.descripcion] || '';
    const amount = Number(values[positions.monto_firmado]);
    const currency = values[positions.moneda]?.toUpperCase();
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || parsedDate.getFullYear() !== year
      || parsedDate.getMonth() !== month - 1
      || parsedDate.getDate() !== day
    ) {
      errors.push(`Fila ${lineNumber}: fecha inválida.`);
      return;
    }
    if (!sourceAccount || !description || !Number.isFinite(amount) || amount === 0) {
      errors.push(`Fila ${lineNumber}: cuenta, descripción o monto inválido.`);
      return;
    }
    if (type !== 'gasto' && type !== 'ingreso' && type !== 'transferencia') {
      errors.push(`Fila ${lineNumber}: tipo de movimiento no reconocido.`);
      return;
    }
    if (currency !== 'COP' && currency !== 'USD') {
      errors.push(`Fila ${lineNumber}: moneda no compatible (${currency || 'vacía'}).`);
      return;
    }

    const key = fingerprint([date, sourceAccount, type, description, Math.abs(amount).toFixed(2), currency]);
    const occurrence = (occurrenceByFingerprint.get(key) || 0) + 1;
    occurrenceByFingerprint.set(key, occurrence);

    rows.push({
      sourceAccount,
      fecha: date,
      descripcion: description,
      tipo: type,
      monto: Math.abs(amount),
      moneda: currency as TipoMoneda,
      categoriaSugerida: values[positions.categoria_sugerida] || '',
      notas: values[positions.nota] || '',
      flujo: amount < 0 ? 'salida' : 'entrada',
      fingerprint: `${key}-${occurrence}`,
    });
  });

  return { rows, errors };
}

export function importMarker(notes: string | undefined): string | null {
  return notes?.match(/\[import:([a-z0-9-]+)\]/i)?.[1] ?? null;
}
