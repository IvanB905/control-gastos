import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trash2, 
  Clock, 
  Search
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { TipoMovimiento } from '../../types';

export const RecentTransactions: React.FC = () => {
  const { movimientos, categorias, cuentas, eliminarMovimiento } = useFinanceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TipoMovimiento | 'todos'>('todos');

  const filteredMovimientos = movimientos.filter((m) => {
    const matchesSearch = m.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'todos' || m.tipo === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs">
      {/* Table Header and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
            Movimientos Recientes
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Registro en Pesos Colombianos (COP) y Dólares (USD)
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar movimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'todos'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('ingreso')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'ingreso'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setFilterType('gasto')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'gasto'
                  ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Gastos
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredMovimientos.length === 0 ? (
        <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
          No hay movimientos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {filteredMovimientos.map((m) => {
            const isGasto = m.tipo === 'gasto';
            const categoria = categorias.find((c) => c.id === m.categoria_id);
            const cuenta = cuentas.find((c) => c.id === m.cuenta_id);
            const monedaMovimiento = m.moneda || cuenta?.moneda || 'COP';

            return (
              <div
                key={m.id}
                className="py-3.5 flex items-center justify-between group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 px-2 rounded-xl transition-colors"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isGasto
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}
                  >
                    {isGasto ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {m.descripcion}
                      </span>
                      {m.estado === 'pendiente' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" />
                          Pendiente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      <span>{formatDate(m.fecha)}</span>
                      <span>•</span>
                      <span>{categoria?.nombre || 'General'}</span>
                      <span>•</span>
                      <span className="font-medium text-zinc-500 dark:text-zinc-400">
                        {cuenta?.nombre || 'Cuenta'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-bold tracking-tight ${
                      isGasto ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isGasto ? '-' : '+'}{formatCurrency(m.monto, monedaMovimiento)}
                  </span>

                  <button
                    onClick={() => eliminarMovimiento(m.id)}
                    className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Eliminar movimiento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
