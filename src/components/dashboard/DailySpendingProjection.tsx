import React, { useMemo } from 'react';
import { AlertTriangle, CalendarDays, WalletCards } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { calculateMonthlyPlan } from '../../lib/financialPlan';
import { formatCurrency, MESES } from '../../lib/utils';

export const DailySpendingProjection: React.FC = () => {
  const { cuentas, categorias, movimientos, metasAhorro } = useFinanceStore();
  const { moneda, selectedMonth, selectedYear } = useAppStore();
  const now = new Date();
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
  const isFutureMonth = selectedYear > now.getFullYear()
    || (selectedYear === now.getFullYear() && selectedMonth > now.getMonth() + 1);

  const plan = useMemo(
    () => calculateMonthlyPlan(cuentas, metasAhorro, movimientos, categorias, selectedMonth, selectedYear, moneda),
    [cuentas, categorias, metasAhorro, movimientos, selectedMonth, selectedYear, moneda],
  );

  const liquidBalance = plan.currentLiquidBalance;
  const cardDebt = cuentas
    .filter((account) => account.moneda === moneda && account.tipo === 'tarjeta_credito' && account.saldo_actual < 0)
    .reduce((sum, account) => sum + Math.abs(account.saldo_actual), 0);

  if (!isCurrentMonth && !isFutureMonth) return null;

  const remainingDays = isCurrentMonth ? daysInMonth - now.getDate() + 1 : daysInMonth;
  const dailyProjection = Math.max(plan.variableMoney, 0) / remainingDays;
  const shortfall = Math.max(-plan.variableMoney, 0);
  const periodName = `${MESES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <section aria-labelledby="daily-spending-title" className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs dark:border-emerald-900/50 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <WalletCards className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="daily-spending-title" className="text-sm font-bold text-zinc-900 dark:text-white">
              {isCurrentMonth ? 'Proyección restante del mes' : 'Proyección diaria del mes'}
            </h2>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {periodName} · {remainingDays} {remainingDays === 1 ? 'día' : 'días'} del periodo
            </p>
          </div>
        </div>
        <p className={`text-right text-xl font-extrabold tracking-tight ${shortfall > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
          {formatCurrency(dailyProjection, moneda)}<span className="ml-1 text-xs font-semibold">/ día proyectado</span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Resto proyectado del mes</p>
          <p className={`mt-1 text-sm font-bold ${shortfall > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>
            {formatCurrency(plan.variableMoney, moneda)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Saldo líquido neto (sin FNA)</p>
          <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(liquidBalance, moneda)}</p>
        </div>
        <div className="col-span-2 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70 sm:col-span-1">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Ingreso previsto por recibir</p>
          <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(plan.remainingExpectedIncome, moneda)}</p>
        </div>
      </div>

      {(plan.supplementalIncome > 0 || plan.plannedReserves > 0) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          {plan.supplementalIncome > 0 && <span>Ingresos adicionales ya reflejados en el saldo: <strong>{formatCurrency(plan.supplementalIncome, moneda)}</strong></span>}
          {plan.plannedReserves > 0 && <span>Reserva de imprevistos separada: <strong>{formatCurrency(plan.plannedReserves, moneda)}</strong></span>}
        </div>
      )}

      {shortfall > 0 && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          La proyección al cierre de {periodName} queda por debajo de cero en {formatCurrency(shortfall, moneda)}. Revisa el saldo de las cuentas y los compromisos pendientes.
        </p>
      )}

      {cardDebt > 0 && (
        <p className="mt-3 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
          Saldo de tarjeta por confirmar: {formatCurrency(cardDebt, moneda)}. No se resta automáticamente para evitar duplicar compras ya registradas.
        </p>
      )}

      <p className="mt-3 text-[10px] leading-4 text-zinc-400">
        Es una proyección, no dinero disponible hoy: parte del saldo líquido actual, suma el ingreso previsto que aún no aparece en movimientos y resta compromisos pendientes y ahorros separados. Los gastos pagados ya están reflejados en el saldo actual. Se excluyen el FNA y las tarjetas.
      </p>
    </section>
  );
};
