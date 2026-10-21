import React from 'react';
import { ArrowDownLeft, ArrowUpRight, BriefcaseBusiness, Repeat2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../lib/utils';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO');

export const MonthlySummary: React.FC = () => {
  const { movimientos, categorias } = useFinanceStore();
  const { moneda, selectedMonth, selectedYear } = useAppStore();
  const payrollCategoryIds = new Set(categorias
    .filter((category) => category.tipo === 'ingreso' && /nomina|salario/.test(normalize(category.nombre)))
    .map((category) => category.id));

  const totals = movimientos.reduce((result, movement) => {
    const [year, month] = movement.fecha.split('-').map(Number);
    if (year !== selectedYear || month !== selectedMonth || movement.moneda !== moneda) return result;

    if (movement.tipo === 'transferencia') {
      const notes = movement.notas || '';
      if (notes.includes('[flujo:entrada]')) return result;
      if (notes.includes('[flujo:salida]') || !notes.includes('[import:')) result.transfers += movement.monto;
      return result;
    }
    if (movement.estado !== 'completado') return result;
    if (movement.tipo === 'ingreso') {
      if (movement.categoria_id && payrollCategoryIds.has(movement.categoria_id)) result.payroll += movement.monto;
      else result.otherIncome += movement.monto;
    }
    if (movement.tipo === 'gasto') result.expenses += movement.monto;
    return result;
  }, { payroll: 0, otherIncome: 0, expenses: 0, transfers: 0 });

  const items = [
    { label: 'Nómina', amount: totals.payroll, icon: BriefcaseBusiness, color: 'text-indigo-600 dark:text-indigo-400', hint: 'Ingresos completados en categorías Nómina o Salario' },
    { label: 'Otros ingresos', amount: totals.otherIncome, icon: ArrowDownLeft, color: 'text-emerald-600 dark:text-emerald-400', hint: 'Ingresos completados distintos de nómina' },
    { label: 'Gastos', amount: totals.expenses, icon: ArrowUpRight, color: 'text-rose-600 dark:text-rose-400', hint: 'Gastos completados del periodo' },
    { label: 'Transferencias salientes', amount: totals.transfers, icon: Repeat2, color: 'text-amber-600 dark:text-amber-400', hint: 'Movimientos salientes; no se cuentan como gasto ni ingreso' },
  ];

  return (
    <section aria-label="Desglose del mes" className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Desglose del mes</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ingresos, gastos y transferencias en {moneda}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(({ label, amount, icon: Icon, color, hint }) => (
          <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{label}</span>
            </div>
            <p className="mt-2 text-base font-bold text-zinc-900 dark:text-white">{formatCurrency(amount, moneda)}</p>
            <p className="mt-1 text-[10px] leading-4 text-zinc-500 dark:text-zinc-400">{hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
