import React from 'react';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Clock3 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../lib/utils';

export const KpiCards: React.FC = () => {
  const { movimientos } = useFinanceStore();
  const { moneda, selectedMonth, selectedYear } = useAppStore();

  const resumen = movimientos.reduce((totals, movimiento) => {
    const [year, month] = movimiento.fecha.split('-').map(Number);
    if (year !== selectedYear || month !== selectedMonth || movimiento.moneda !== moneda || movimiento.tipo === 'transferencia') {
      return totals;
    }
    if (movimiento.tipo === 'ingreso' && movimiento.estado === 'completado') totals.total_ingresos += movimiento.monto;
    if (movimiento.tipo === 'gasto' && movimiento.estado === 'completado') totals.total_gastos += movimiento.monto;
    if (movimiento.tipo === 'gasto' && movimiento.estado === 'pendiente') totals.gastos_pendientes += movimiento.monto;
    return totals;
  }, { total_ingresos: 0, total_gastos: 0, gastos_pendientes: 0 });
  const balance = resumen.total_ingresos - resumen.total_gastos;

  const cards = [
    {
      title: 'Balance Neto',
      amount: balance,
      subtitle: `Ingresos vs Gastos (${moneda})`,
      icon: TrendingUp,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgIcon: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-800/40',
    },
    {
      title: 'Ingresos Totales',
      amount: resumen.total_ingresos,
      subtitle: `Cobrados este mes (${moneda})`,
      icon: ArrowDownLeft,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgIcon: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40',
    },
    {
      title: 'Gastos Totales',
      amount: resumen.total_gastos,
      subtitle: `Pagados este mes (${moneda})`,
      icon: ArrowUpRight,
      color: 'text-rose-600 dark:text-rose-400',
      bgIcon: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-800/40',
    },
    {
      title: 'Por Pagar (Pendientes)',
      amount: resumen.gastos_pendientes,
      subtitle: `Compromisos a saldar (${moneda})`,
      icon: Clock3,
      color: 'text-amber-600 dark:text-amber-400',
      bgIcon: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-150 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-tight truncate">
                {card.title}
              </span>
              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.bgIcon}`}>
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.color}`} />
              </div>
            </div>

            <div className="mt-2.5 sm:mt-4">
              <div className="text-base sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                {formatCurrency(card.amount, moneda)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 sm:mt-1 font-medium truncate">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
