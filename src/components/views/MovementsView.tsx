import React, { useState } from 'react';
import { 
  Plus, 
  Download, 
  Search, 
  Trash2, 
  Edit3, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import type { Movimiento, TipoMovimiento, EstadoMovimiento } from '../../types';
import { ImportMovementsModal } from '../modals/ImportMovementsModal';

export const MovementsView: React.FC = () => {
  const { movimientos, categorias, cuentas, eliminarMovimiento } = useFinanceStore();
  const { setTransactionModalOpen } = useAppStore();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoMovimiento | 'todos'>('todos');
  const [cuentaFiltro, setCuentaFiltro] = useState<string>('todas');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoMovimiento | 'todos'>('todos');
  const [monedaFiltro, setMonedaFiltro] = useState<'todas' | 'COP' | 'USD'>('todas');

  // Edit modal state
  const [editingMovement, setEditingMovement] = useState<Movimiento | null>(null);
  const [isImportOpen, setImportOpen] = useState(false);

  // Apply filters
  const filteredMovimientos = movimientos.filter((m) => {
    const matchesSearch = m.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFiltro === 'todos' || m.tipo === tipoFiltro;
    const matchesCuenta = cuentaFiltro === 'todas' || m.cuenta_id === cuentaFiltro;
    const matchesCategoria = categoriaFiltro === 'todas' || m.categoria_id === categoriaFiltro;
    const matchesEstado = estadoFiltro === 'todos' || m.estado === estadoFiltro;
    const matchesMoneda = monedaFiltro === 'todas' || m.moneda === monedaFiltro;

    return matchesSearch && matchesTipo && matchesCuenta && matchesCategoria && matchesEstado && matchesMoneda;
  });

  // Calculate filtered totals
  const totalIngresosCOP = filteredMovimientos
    .filter((m) => m.tipo === 'ingreso' && m.moneda === 'COP' && m.estado === 'completado')
    .reduce((acc, m) => acc + m.monto, 0);

  const totalGastosCOP = filteredMovimientos
    .filter((m) => m.tipo === 'gasto' && m.moneda === 'COP' && m.estado === 'completado')
    .reduce((acc, m) => acc + m.monto, 0);

  // Export to Excel / CSV function
  const handleExportCSV = () => {
    if (filteredMovimientos.length === 0) return;

    // Encabezados con compatibilidad Excel
    const headers = ['Fecha', 'Descripción', 'Tipo', 'Categoría', 'Billetera / Cuenta', 'Monto', 'Moneda', 'Estado'];
    
    const rows = filteredMovimientos.map((m) => {
      const cat = categorias.find((c) => c.id === m.categoria_id);
      const cta = cuentas.find((c) => c.id === m.cuenta_id);
      return [
        m.fecha,
        `"${m.descripcion.replace(/"/g, '""')}"`,
        m.tipo.toUpperCase(),
        cat ? `"${cat.nombre}"` : 'General',
        cta ? `"${cta.nombre}"` : 'Cuenta',
        m.monto,
        m.moneda,
        m.estado === 'completado' ? 'PAGADO' : 'PENDIENTE',
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Finanza_Movimientos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Registro de Movimientos
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Filtra, analiza y descarga el historial completo de tus finanzas
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 px-2 sm:min-h-0 sm:w-auto sm:gap-2 sm:px-3.5 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[11px] sm:text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 px-2 sm:min-h-0 sm:w-auto sm:gap-2 sm:px-3.5 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[11px] sm:text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setTransactionModalOpen(true)}
            className="col-span-2 flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 sm:col-span-1 sm:min-h-0 sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] sm:text-xs text-zinc-500">Filtrados</span>
          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
            {filteredMovimientos.length} de {movimientos.length}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] sm:text-xs text-zinc-500">Ingresos</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(totalIngresosCOP, 'COP')}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] sm:text-xs text-zinc-500">Gastos</span>
          <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
            -{formatCurrency(totalGastosCOP, 'COP')}
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="relative col-span-2 lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por concepto o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Tipo */}
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="ingreso">Solo Ingresos</option>
            <option value="gasto">Solo Gastos</option>
            <option value="transferencia">Solo Transferencias</option>
          </select>

          {/* Cuenta */}
          <select
            value={cuentaFiltro}
            onChange={(e) => setCuentaFiltro(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todas">Todas las Cuentas</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          {/* Moneda */}
          <select
            value={monedaFiltro}
            onChange={(e) => setMonedaFiltro(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todas">Todas las Monedas</option>
            <option value="COP">🇨🇴 Solo COP</option>
            <option value="USD">🇺🇸 Solo USD</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden">
        {filteredMovimientos.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
            <p>No se encontraron movimientos con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredMovimientos.map((m) => {
              const isGasto = m.tipo === 'gasto';
              const isTransfer = m.tipo === 'transferencia';
              const categoria = categorias.find((c) => c.id === m.categoria_id);
              const cuenta = cuentas.find((c) => c.id === m.cuenta_id);

              return (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Left: Icon & Info */}
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isTransfer
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                          : isGasto
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}
                    >
                      {isTransfer ? (
                        <ArrowRightLeft className="w-5 h-5" />
                      ) : isGasto ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="break-words text-sm font-semibold text-zinc-900 dark:text-white">
                          {m.descripcion}
                        </span>
                        {m.estado === 'pendiente' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-2.5 h-2.5" />
                            Pendiente
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                        <span>{formatDate(m.fecha)}</span>
                        <span>•</span>
                        <span>{categoria?.nombre || 'General'}</span>
                        <span>•</span>
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">
                          {cuenta?.nombre || 'Cuenta'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between gap-3 pl-[3.375rem] sm:justify-end sm:pl-0">
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold tracking-tight block ${
                          isTransfer
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : isGasto
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isTransfer ? '⇄ ' : isGasto ? '- ' : '+ '}
                        {formatCurrency(m.monto, m.moneda)}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-zinc-400">
                        {m.moneda}
                      </span>
                    </div>

                    {/* Action buttons: Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingMovement(m)}
                        className="flex min-h-10 min-w-10 items-center justify-center p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Editar movimiento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => eliminarMovimiento(m.id)}
                        className="flex min-h-10 min-w-10 items-center justify-center p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar movimiento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditTransactionModal
        movimiento={editingMovement}
        isOpen={Boolean(editingMovement)}
        onClose={() => setEditingMovement(null)}
      />
      <ImportMovementsModal isOpen={isImportOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};
