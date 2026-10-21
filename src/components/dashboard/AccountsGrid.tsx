import React from 'react';
import { 
  Landmark, 
  Banknote, 
  CreditCard, 
  ShieldCheck, 
  Wallet,
  Smartphone,
  DollarSign
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../lib/utils';
import type { TipoCuenta } from '../../types';

const getAccountIcon = (tipo: TipoCuenta) => {
  switch (tipo) {
    case 'banco':
      return Landmark;
    case 'nequi_daviplata':
      return Smartphone;
    case 'efectivo':
      return Banknote;
    case 'tarjeta_credito':
    case 'credito_libre_inversion':
      return CreditCard;
    case 'ahorro':
      return ShieldCheck;
    default:
      return Wallet;
  }
};

export const AccountsGrid: React.FC = () => {
  const { cuentas } = useFinanceStore();
  const { moneda } = useAppStore();

  const totalCuentas = cuentas
    .filter((c) => c.moneda === moneda && c.tipo !== 'tarjeta_credito' && c.tipo !== 'credito_libre_inversion')
    .reduce((acc, c) => acc + c.saldo_actual, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
            Tus Billeteras & Bancos ({moneda})
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Saldo acumulado disponible: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(totalCuentas, moneda)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {cuentas.map((cuenta) => {
          const Icon = getAccountIcon(cuenta.tipo);
          const isNegative = cuenta.saldo_actual < 0;

          return (
            <div
              key={cuenta.id}
              className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] sm:text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                  {cuenta.nombre}
                </span>
                <div 
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: cuenta.color }}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>

              <div className="mt-2.5 sm:mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-zinc-400 block truncate">
                    {cuenta.tipo === 'credito_libre_inversion' ? 'crédito libre inversión' : cuenta.tipo.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {cuenta.moneda}
                  </span>
                </div>
                <span className={`text-sm sm:text-lg font-bold tracking-tight block mt-0.5 truncate ${isNegative ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                  {formatCurrency(cuenta.saldo_actual, cuenta.moneda)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
