import React, { useState } from 'react';
import { 
  Plus, 
  PieChart, 
  Target, 
  Trash2, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  PiggyBank
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Movimiento } from '../../types';
import { BudgetModal } from '../modals/BudgetModal';
import { SavingsGoalModal } from '../modals/SavingsGoalModal';

const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function getActualIncome(movements: Movimiento[], month: number, year: number, currency: string) {
  return movements.reduce((total, movement) => {
    const [movementYear, movementMonth] = movement.fecha.split('-').map(Number);
    const isCreditDisbursement = /desembolso|prestamo|credito|avance/.test(normalizeText(movement.descripcion));
    if (movement.tipo === 'ingreso' && movement.estado === 'completado' && movement.moneda === currency && movementYear === year && movementMonth === month && !isCreditDisbursement) {
      return total + movement.monto;
    }
    return total;
  }, 0);
}

export const BudgetsView: React.FC = () => {
  const { 
    presupuestos, 
    categorias, 
    metasAhorro, 
    cuentas,
    movimientos,
    eliminarPresupuesto, 
    abonarAMetaAhorro, 
    eliminarMetaAhorro 
  } = useFinanceStore();
  const { moneda, selectedMonth, selectedYear } = useAppStore();

  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setGoalModalOpen] = useState(false);
  const [abonoMetaId, setAbonoMetaId] = useState<string | null>(null);
  const [montoAbono, setMontoAbono] = useState('');

  // Filtrar presupuestos para la moneda y el periodo seleccionados.
  const presupuestosFiltrados = presupuestos.filter(
    (p) => p.moneda === moneda && p.mes === selectedMonth && p.anio === selectedYear,
  );
  const metasFiltradas = metasAhorro.filter((m) => m.moneda === moneda);

  // Cálculos de presupuestos
  const totalPresupuestado = presupuestosFiltrados.reduce((acc, p) => acc + p.monto_limite, 0);
  const totalGastado = presupuestosFiltrados.reduce((acc, p) => acc + (p.gasto_actual || 0), 0);
  const margenDisponible = totalPresupuestado - totalGastado;
  const ingresosRecibidos = getActualIncome(movimientos, selectedMonth, selectedYear, moneda);
  const ingresoPrevisto = cuentas
    .filter((cuenta) => cuenta.tipo === 'banco' && cuenta.moneda === moneda)
    .reduce((total, cuenta) => total + (cuenta.ingreso_mensual_estimado || 0), 0);
  const gastosDelMes = movimientos.filter((movimiento) => {
    const [year, month] = movimiento.fecha.split('-').map(Number);
    return movimiento.moneda === moneda && movimiento.tipo === 'gasto' && year === selectedYear && month === selectedMonth;
  });
  const gastosPagados = gastosDelMes
    .filter((movimiento) => movimiento.estado === 'completado')
    .reduce((total, movimiento) => total + movimiento.monto, 0);
  const gastosPendientes = gastosDelMes
    .filter((movimiento) => movimiento.estado === 'pendiente')
    .reduce((total, movimiento) => total + movimiento.monto, 0);
  const porcentajeIngresoRecibido = ingresoPrevisto > 0 ? Math.min(Math.round((ingresosRecibidos / ingresoPrevisto) * 100), 100) : 0;
  const porcentajeIngresoLabel = ingresosRecibidos > 0 && porcentajeIngresoRecibido === 0 ? '<1%' : `${porcentajeIngresoRecibido}%`;
  const porcentajeGastoConsumido = totalPresupuestado > 0 ? Math.min(Math.round((gastosPagados / totalPresupuestado) * 100), 100) : 0;

  // Cálculos de metas
  const totalAhorradoMetas = metasFiltradas.reduce((acc, m) => acc + m.monto_actual, 0);

  const handleAbonar = (e: React.FormEvent, metaId: string) => {
    e.preventDefault();
    const val = parseFloat(montoAbono);
    if (!isNaN(val) && val > 0) {
      abonarAMetaAhorro(metaId, val);
      setMontoAbono('');
      setAbonoMetaId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* View Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Presupuestos & Metas de Ahorro ({moneda})
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Controla tus límites de gasto mensual y alcanza tus objetivos de ahorro
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setGoalModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nueva Meta de Ahorro</span>
          </button>

          <button
            onClick={() => setBudgetModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Fijar Presupuesto</span>
          </button>
        </div>
      </div>

      <section aria-labelledby="plan-vs-real-title" className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div>
          <h3 id="plan-vs-real-title" className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Plan del mes frente a lo real</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Las proyecciones se muestran aparte de los movimientos ya registrados.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Ingresos</span>
              <span className="text-[10px] text-zinc-400">{porcentajeIngresoLabel} del previsto recibido</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden" role="progressbar" aria-label="Porcentaje del ingreso previsto que ya se recibió" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentajeIngresoRecibido}>
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${porcentajeIngresoRecibido}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="block text-zinc-400">Ingreso previsto</span><strong className="text-zinc-900 dark:text-white">{formatCurrency(ingresoPrevisto, moneda)}</strong></div>
              <div><span className="block text-zinc-400">Ingresos recibidos</span><strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(ingresosRecibidos, moneda)}</strong></div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Gastos</span>
              <span className={`text-[10px] font-semibold ${gastosPagados > totalPresupuestado ? 'text-rose-500' : 'text-zinc-400'}`}>
                {totalPresupuestado > 0 ? `${porcentajeGastoConsumido}% del presupuesto usado` : 'Fija presupuestos por categoría'}
              </span>
            </div>
            {totalPresupuestado > 0 ? (
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden" role="progressbar" aria-label="Porcentaje del presupuesto de gastos consumido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentajeGastoConsumido}>
                <div className={`h-full rounded-full transition-all ${gastosPagados > totalPresupuestado ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${porcentajeGastoConsumido}%` }} />
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Aún no has fijado un límite de gasto para comparar.</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="block text-zinc-400">Límite presupuestado</span><strong className="text-zinc-900 dark:text-white">{formatCurrency(totalPresupuestado, moneda)}</strong></div>
              <div><span className="block text-zinc-400">Gastos pagados</span><strong className="text-rose-600 dark:text-rose-400">{formatCurrency(gastosPagados, moneda)}</strong></div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Pendiente por pagar: <strong>{formatCurrency(gastosPendientes, moneda)}</strong></p>
          </div>
        </div>
        <p className="text-[10px] leading-4 text-zinc-400">Los ingresos recibidos suman movimientos completados y excluyen desembolsos de créditos. Los gastos presupuestados suman tus límites por categoría; las transferencias no se cuentan como gasto.</p>
      </section>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
            Presupuesto
          </span>
          <span className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white block mt-1 truncate">
            {formatCurrency(totalPresupuestado, moneda)}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
            Total Gastado
          </span>
          <span className="text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400 block mt-1 truncate">
            {formatCurrency(totalGastado, moneda)}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
            Margen Libre
          </span>
          <span className={`text-base sm:text-xl font-bold block mt-1 truncate ${margenDisponible < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(margenDisponible, moneda)}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
            En Ahorros
          </span>
          <span className="text-base sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 block mt-1 truncate">
            {formatCurrency(totalAhorradoMetas, moneda)}
          </span>
        </div>
      </div>

      {/* Section 1: Presupuestos Mensuales por Categoría */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-500" />
              Presupuestos Mensuales por Categoría
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Límites fijados para el mes actual
            </p>
          </div>
        </div>

        {presupuestosFiltrados.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 text-xs">
            No has configurado presupuestos en {moneda}. Haz clic en "+ Fijar Presupuesto" para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {presupuestosFiltrados.map((p) => {
              const cat = categorias.find((c) => c.id === p.categoria_id);
              const gastado = p.gasto_actual || 0;
              const porcentaje = p.monto_limite > 0 ? Math.round((gastado / p.monto_limite) * 100) : 0;
              const isExceeded = gastado > p.monto_limite;
              const isDanger = porcentaje >= 90;
              const isWarning = porcentaje >= 75 && !isDanger;

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat?.color || '#10B981' }}
                      />
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        {cat?.nombre || 'Categoría'}
                      </span>
                    </div>

                    <button
                      onClick={() => eliminarPresupuesto(p.id)}
                      className="p-1 text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                      title="Eliminar presupuesto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Numbers */}
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-zinc-500">
                      Gastado: <strong className="text-zinc-900 dark:text-white">{formatCurrency(gastado, p.moneda)}</strong>
                    </span>
                    <span className="text-zinc-400 font-mono">
                      Límite: {formatCurrency(p.monto_limite, p.moneda)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-700/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                      <span>{porcentaje}% consumido</span>
                      <span role={isExceeded ? 'alert' : 'status'} className={isExceeded || isDanger ? 'text-rose-500 font-bold' : isWarning ? 'text-amber-500' : 'text-emerald-500'}>
                        {isExceeded
                          ? `Superado por ${formatCurrency(gastado - p.monto_limite, p.moneda)}`
                          : isDanger
                            ? `Quedan ${formatCurrency(p.monto_limite - gastado, p.moneda)}`
                            : isWarning
                              ? `Consumo alto · quedan ${formatCurrency(p.monto_limite - gastado, p.moneda)}`
                              : `Disponible ${formatCurrency(p.monto_limite - gastado, p.moneda)}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Metas de Ahorro / Alcancías Digitales */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-indigo-500" />
              Metas de Ahorro & Alcancías ({moneda})
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Fondos reservados para proyectos futuros y sueños
            </p>
          </div>
        </div>

        {metasFiltradas.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 text-xs">
            No tienes metas de ahorro activas en {moneda}. Haz clic en "+ Nueva Meta de Ahorro" para definir una.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {metasFiltradas.map((meta) => {
              const porcentaje = Math.min(Math.round((meta.monto_actual / meta.monto_objetivo) * 100), 100);
              const restante = Math.max(meta.monto_objetivo - meta.monto_actual, 0);
              const isCompleted = meta.monto_actual >= meta.monto_objetivo;

              return (
                <div
                  key={meta.id}
                  className="p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                        {meta.nombre}
                      </h4>
                      {meta.fecha_limite && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1 font-medium">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          Meta: {formatDate(meta.fecha_limite)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => eliminarMetaAhorro(meta.id)}
                      className="p-1 text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                      title="Eliminar meta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Amounts */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                        {formatCurrency(meta.monto_actual, meta.moneda)}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400">
                        de {formatCurrency(meta.monto_objetivo, meta.moneda)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 space-y-1">
                      <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${porcentaje}%`, backgroundColor: meta.color }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                        <span>{porcentaje}% alcanzado</span>
                        <span>Faltan: {formatCurrency(restante, meta.moneda)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action: Abonar dinero */}
                  {abonoMetaId === meta.id ? (
                    <form onSubmit={(e) => handleAbonar(e, meta.id)} className="flex items-center gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                      <input
                        type="number"
                        placeholder="Monto"
                        autoFocus
                        value={montoAbono}
                        onChange={(e) => setMontoAbono(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg cursor-pointer"
                      >
                        Abonar
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbonoMetaId(null)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 text-xs"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setAbonoMetaId(meta.id)}
                      className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Abonar Dinero</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
      />

      <SavingsGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setGoalModalOpen(false)}
      />
    </div>
  );
};
