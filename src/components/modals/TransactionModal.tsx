import React, { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { TipoMovimiento, EstadoMovimiento, TipoMoneda } from '../../types';

export const TransactionModal: React.FC = () => {
  const { isTransactionModalOpen, setTransactionModalOpen, moneda: monedaGlobal } = useAppStore();
  const { categorias, cuentas, agregarMovimiento } = useFinanceStore();

  const [tipo, setTipo] = useState<TipoMovimiento>('gasto');
  const [moneda, setMoneda] = useState<TipoMoneda>(monedaGlobal);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id || '');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [estado, setEstado] = useState<EstadoMovimiento>('completado');
  const [esRecurrente, setEsRecurrente] = useState(false);

  if (!isTransactionModalOpen) return null;

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  const handleCuentaChange = (id: string) => {
    setCuentaId(id);
    const cuentaSeleccionada = cuentas.find((c) => c.id === id);
    if (cuentaSeleccionada) {
      setMoneda(cuentaSeleccionada.moneda);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) return;

    agregarMovimiento({
      user_id: 'user1',
      cuenta_id: cuentaId || cuentas[0]?.id || '',
      categoria_id: categoriaId || categoriasFiltradas[0]?.id || null,
      tipo,
      moneda,
      monto: parsedMonto,
      fecha,
      descripcion: descripcion || (tipo === 'gasto' ? 'Gasto general' : 'Ingreso general'),
      estado,
      es_recurrente: esRecurrente,
    });

    setMonto('');
    setDescripcion('');
    setTransactionModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
            Nuevo Movimiento
          </h3>
          <button
            onClick={() => setTransactionModalOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type Selector (Gasto / Ingreso) */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTipo('gasto');
                setCategoriaId('');
              }}
              className={`py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tipo === 'gasto'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo('ingreso');
                setCategoriaId('');
              }}
              className={`py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tipo === 'ingreso'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Ingreso
            </button>
          </div>

          {/* Currency and Amount */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
                  🇨🇴 COP ($)
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
                  🇺🇸 USD ($)
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">
                $
              </span>
              <input
                type="number"
                step={moneda === 'COP' ? '1' : '0.01'}
                min="1"
                required
                placeholder={moneda === 'COP' ? '50000' : '15.00'}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-4 py-2.5 text-xl font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Descripción
            </label>
            <input
              type="text"
              required
              placeholder={moneda === 'COP' ? 'Ej. Mercado Éxito, Gasolina, Alquiler...' : 'Ej. Suscripción SaaS, Compra Amazon...'}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category & Account Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Billetera / Cuenta
              </label>
              <select
                value={cuentaId}
                onChange={(e) => handleCuentaChange(e.target.value)}
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

          {/* Date & State */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setTransactionModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Guardar Movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
