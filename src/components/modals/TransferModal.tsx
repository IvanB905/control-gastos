import React, { useState } from 'react';
import { X, ArrowRightLeft, ArrowDown } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency } from '../../lib/utils';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  const { cuentas, realizarTransferencia } = useFinanceStore();

  const [origenId, setOrigenId] = useState(cuentas[0]?.id || '');
  const [destinoId, setDestinoId] = useState(cuentas[1]?.id || '');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  if (!isOpen) return null;

  const cuentaOrigen = cuentas.find((c) => c.id === origenId);
  const cuentaDestino = cuentas.find((c) => c.id === destinoId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0 || origenId === destinoId) return;

    realizarTransferencia(origenId, destinoId, parsedMonto, descripcion, fecha);
    setMonto('');
    setDescripcion('');
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
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
            Transferencia entre Cuentas
          </h3>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
          Mueve dinero entre tus billeteras (no altera tus balances de ingresos o gastos)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cuenta Origen */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Desde (Origen)
            </label>
            <select
              value={origenId}
              onChange={(e) => setOrigenId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({formatCurrency(c.saldo_actual, c.moneda)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center -my-2">
            <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <ArrowDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Cuenta Destino */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Hacia (Destino)
            </label>
            <select
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {cuentas
                .filter((c) => c.id !== origenId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({formatCurrency(c.saldo_actual, c.moneda)})
                  </option>
                ))}
            </select>
          </div>

          {/* Monto a Transferir */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Monto a Transferir ({cuentaOrigen?.moneda || 'COP'})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                $
              </span>
              <input
                type="number"
                step={cuentaOrigen?.moneda === 'COP' ? '1' : '0.01'}
                min="1"
                required
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-base font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Fecha y Concepto */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Concepto / Nota (Opcional)
            </label>
            <input
              type="text"
              placeholder={`Ej. Recarga Nequi desde ${cuentaOrigen?.nombre || 'Banco'}`}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Fecha de Transferencia
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

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
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Confirmar Transferencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
