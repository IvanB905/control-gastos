import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency, MESES } from '../../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const IncomeExpenseBarChart: React.FC = () => {
  const { movimientos } = useFinanceStore();
  const { moneda, theme } = useAppStore();

  const currentMonth = new Date().getMonth();
  
  // Generar etiquetas de los últimos 4 meses
  const labels = [
    MESES[(currentMonth - 3 + 12) % 12],
    MESES[(currentMonth - 2 + 12) % 12],
    MESES[(currentMonth - 1 + 12) % 12],
    MESES[currentMonth],
  ];

  // Calcular ingresos y gastos por mes simulados / reales
  const isCOP = moneda === 'COP';
  const factor = isCOP ? 1000 : 1;

  const data = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: isCOP 
          ? [3800000, 4200000, 3900000, 4500000] 
          : [1200, 1400, 1100, 1450],
        backgroundColor: '#10B981',
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Gastos',
        data: isCOP 
          ? [1200000, 1850000, 1400000, 653900] 
          : [450, 620, 510, 280],
        backgroundColor: '#F43F5E',
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const isDark = theme === 'dark';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: isDark ? '#A1A1AA' : '#71717A',
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 11,
            family: 'system-ui',
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            return ` ${context.dataset.label}: ${formatCurrency(val, moneda)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDark ? '#71717A' : '#52525B',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: isDark ? '#27272A' : '#E4E4E7',
        },
        ticks: {
          color: isDark ? '#71717A' : '#52525B',
          font: {
            size: 10,
          },
          callback: (value: any) => {
            if (isCOP) {
              return `$${(value / 1000000).toFixed(1)}M`;
            }
            return `$${value}`;
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
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Flujo Mensual: Ingresos vs Gastos ({moneda})
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Comparativa histórica de desempeño financiero
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <Bar key={`${theme}-${moneda}`} data={data} options={options} />
      </div>
    </div>
  );
};
