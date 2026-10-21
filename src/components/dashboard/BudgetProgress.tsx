import React from 'react';
import { PieChart } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../lib/utils';

export const BudgetProgress: React.FC = () => {
  const { presupuestos, categorias } = useFinanceStore();
  const { moneda, selectedMonth, selectedYear } = useAppStore();

  const presupuestosFiltrados = presupuestos.filter(
    (p) => p.moneda === moneda && p.mes === selectedMonth && p.anio === selectedYear,
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-500" />
            Límites & Presupuestos ({moneda})
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Control de gastos mensual por categoría
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {presupuestosFiltrados.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            No hay presupuestos configurados en {moneda}.
          </p>
        ) : (
          presupuestosFiltrados.map((p) => {
            const cat = categorias.find((c) => c.id === p.categoria_id);
            const gastado = p.gasto_actual || 0;
            const porcentaje = p.monto_limite > 0 ? Math.round((gastado / p.monto_limite) * 100) : 0;
            const isExceeded = gastado > p.monto_limite;
            const isDanger = porcentaje >= 90;
            const isWarning = porcentaje >= 75 && !isDanger;
            const status = isExceeded
              ? `Superado por ${formatCurrency(gastado - p.monto_limite, p.moneda)}`
              : porcentaje >= 90
                ? `Quedan ${formatCurrency(p.monto_limite - gastado, p.moneda)}`
                : porcentaje >= 75
                  ? `Vas en ${porcentaje}% del límite`
                  : `Disponible ${formatCurrency(p.monto_limite - gastado, p.moneda)}`;

            return (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {cat?.nombre || 'Categoría'}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                    <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(gastado, p.moneda)}</span> / {formatCurrency(p.monto_limite, p.moneda)}
                    <span className={`ml-2 font-bold ${isExceeded || isDanger ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                      ({porcentaje}%)
                    </span>
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div
                  className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label={`${cat?.nombre || 'Categoría'}: ${porcentaje}% del presupuesto utilizado`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(porcentaje, 100)}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDanger 
                        ? 'bg-rose-500' 
                        : isWarning 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(porcentaje, 100)}%` }}
                  />
                </div>
                <p role={isExceeded ? 'alert' : 'status'} className={`text-[11px] font-medium ${isExceeded || isDanger ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {status}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
