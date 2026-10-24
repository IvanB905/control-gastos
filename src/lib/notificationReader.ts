import { registerPlugin } from '@capacitor/core';

export interface CapturedBankNotification {
  id: string;
  amount: number;
  currency: 'COP' | 'USD';
  type: 'ingreso' | 'gasto' | 'transferencia';
  flow?: 'entrada' | 'salida';
  date: string;
  description: string;
  source: string;
  accountHint: 'banco' | 'nequi_daviplata' | 'tarjeta_credito';
  detectedAt: number;
}

interface NotificationReaderPlugin {
  getStatus(): Promise<{ granted: boolean }>;
  openSettings(): Promise<void>;
  getPending(): Promise<{ notifications: CapturedBankNotification[] }>;
  removePending(options: { id: string }): Promise<void>;
}

export const notificationReader = registerPlugin<NotificationReaderPlugin>('NotificationReader');
