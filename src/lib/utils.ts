import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Cuenta } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Moneda = 'COP' | 'USD';

export function formatCurrency(amount: number, moneda: Moneda = 'COP'): string {
  if (moneda === 'COP') {
    // Formato colombiano: sin decimales para montos enteros, separador de miles con punto
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Formato USD: con 2 decimales
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function countsTowardAvailableBalance(account: Pick<Cuenta, 'tipo' | 'nombre'>): boolean {
  if (account.tipo === 'tarjeta_credito' || account.tipo === 'credito_libre_inversion') return false;
  const normalizedName = account.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return !(/\bfna\b|fondo nacional del ahorro/.test(normalizedName));
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
