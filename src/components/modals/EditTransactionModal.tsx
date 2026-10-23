import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { Movimiento, EstadoMovimiento, TipoMoneda } from '../../types';

interface EditTransactionModalProps {
  movimiento: Movimiento | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  movimiento,
  isOpen,
  onClose,
}) => {
  const { categorias, cuentas, editarMovimiento } = useFinanceStore();

  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [moneda, setMoneda] = useState<TipoMoneda>('COP');
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<EstadoMovimiento>('completado');
  const [esRecurrente, setEsRecurrente] = useState(false);

  useEffect(() => {
    if (movimiento) {
      setMonto(movimiento.monto.toString());
      setDescripcion(movimiento.descripcion);
      setCategoriaId(movimiento.categoria_id || '');
      setCuentaId(movimiento.cuenta_id);
      setMoneda(movimiento.moneda || 'COP');
      setFecha(movimiento.fecha);
      setEstado(movimiento.estado);
      setEsRecurrente(movimiento.es_recurrente || false);
    }
  }, [movimiento]);

  if (!isOpen || !movimiento) return null;

  const categoriasFiltradas = categorias.filter((c) => c.tipo === movimiento.tipo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) return;

    editarMovimiento(movimiento.id, {
      monto: parsedMonto,
      descripcion,
      categoria_id: categoriaId || null,
      cuenta_id: cuentaId,
      moneda,
      fecha,
      estado,
      es_recurrente: esRecurrente,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl relative dark:border-zinc-800 dark:bg-zinc-900 sm:max-h-[92vh] sm:p-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
            movimiento.tipo === 'gasto' ? 'bg-rose-500' : 'bg-emerald-500'
          }`}>
            {movimiento.tipo === 'gasto' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight capitalize">
            Editar {movimiento.tipo}
          </h3>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
          Modifica los detalles del movimiento seleccionado
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto y Moneda */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Monto
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMoneda('COP')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    moneda === 'COP'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  COP ($)
                </button>
                <button
                  type="button"
                  onClick={() => setMoneda('USD')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    moneda === 'USD'
                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                $
              </span>
              <input
                type="number"
                step={moneda === 'COP' ? '1' : '0.01'}
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-base font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Descripción
            </label>
            <input
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Categoría y Billetera */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Categoría
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {categoriasFiltradas.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Billetera / Cuenta
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.moneda})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoMovimiento)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="completado">Pagado / Cobrado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          {/* Es recurrente */}
          <label className="flex items-center gap-2 pt-1 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={esRecurrente}
              onChange={(e) => setEsRecurrente(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Gasto o ingreso recurrente (fijo mensual)</span>
          </label>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
