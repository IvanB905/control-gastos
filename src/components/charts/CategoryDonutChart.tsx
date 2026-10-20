import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { PieChart } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#64748B', '#84CC16'
];

export const CategoryDonutChart: React.FC = () => {
  const { movimientos, categorias } = useFinanceStore();
  const { moneda, theme } = useAppStore();

  // Filtrar gastos completados de la moneda activa
  const gastos = movimientos.filter(
    (m) => m.tipo === 'gasto' && m.estado === 'completado' && m.moneda === moneda
  );

  // Agrupar por categoría
  const totalPorCategoria: { [catId: string]: number } = {};
  let totalGastos = 0;

  gastos.forEach((g) => {
    const catId = g.categoria_id || 'sin_categoria';
    totalPorCategoria[catId] = (totalPorCategoria[catId] || 0) + g.monto;
    totalGastos += g.monto;
  });

  const catIds = Object.keys(totalPorCategoria);

  const labels = catIds.map((id) => {
    const cat = categorias.find((c) => c.id === id);
    return cat ? cat.nombre : 'Varios / General';
  });

  const dataValues = catIds.map((id) => totalPorCategoria[id]);
  const colors = catIds.map((id, index) => {
    const cat = categorias.find((c) => c.id === id);
    return cat?.color || PALETTE[index % PALETTE.length];
  });

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: colors,
        borderColor: theme === 'dark' ? '#18181b' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = totalGastos > 0 ? Math.round((val / totalGastos) * 100) : 0;
            return ` ${context.label}: ${formatCurrency(val, moneda)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-500" />
            Gastos por Categoría ({moneda})
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Distribución porcentual de egresos
          </p>
        </div>
      </div>

      {gastos.length === 0 ? (
        <div className="h-60 flex flex-col items-center justify-center text-center text-zinc-400 text-xs">
          <PieChart className="w-10 h-10 mb-2 stroke-1 text-zinc-300 dark:text-zinc-700" />
          <p>No hay gastos registrados en {moneda} para este periodo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart Canvas with Center Total */}
          <div className="relative h-52 w-full flex items-center justify-center">
            <Doughnut key={`${theme}-${moneda}`} data={data} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Total Gastado
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {formatCurrency(totalGastos, moneda)}
              </span>
            </div>
          </div>

          {/* Clean Custom Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 max-h-36 overflow-y-auto">
            {catIds.map((id, idx) => {
              const amount = totalPorCategoria[id];
              const pct = totalGastos > 0 ? Math.round((amount / totalGastos) * 100) : 0;
              const cat = categorias.find((c) => c.id === id);

              return (
                <div key={id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors[idx] }}
                    />
                    <span className="text-zinc-700 dark:text-zinc-300 truncate font-medium text-[11px]">
                      {cat?.nombre || 'General'}
                    </span>
                  </div>
                  <span className="text-zinc-400 font-mono text-[10px] shrink-0 font-bold">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
