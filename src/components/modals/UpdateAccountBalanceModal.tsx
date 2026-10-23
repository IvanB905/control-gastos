import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { Cuenta } from '../../types';

interface UpdateAccountBalanceModalProps {
  cuenta: Cuenta | null;
  onClose: () => void;
}

export const UpdateAccountBalanceModal: React.FC<UpdateAccountBalanceModalProps> = ({ cuenta, onClose }) => {
  const actualizarSaldoCuenta = useFinanceStore((state) => state.actualizarSaldoCuenta);
  const [saldo, setSaldo] = useState(cuenta?.saldo_actual.toString() ?? '');
  const [fecha, setFecha] = useState(cuenta?.saldo_fecha ?? new Date().toISOString().slice(0, 10));
  const [ingresoMensual, setIngresoMensual] = useState(cuenta?.ingreso_mensual_estimado?.toString() ?? '');
  const [error, setError] = useState('');

  if (!cuenta) return null;

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    const valor = Number(saldo);
    const ingresoEstimado = ingresoMensual.trim() === '' ? undefined : Number(ingresoMensual);
    if (!Number.isFinite(valor) || !fecha || (ingresoEstimado !== undefined && (!Number.isFinite(ingresoEstimado) || ingresoEstimado < 0))) {
      setError('Ingresa un saldo y una fecha válidos.');
      return;
    }
    try {
      await actualizarSaldoCuenta(cuenta.id, valor, fecha, cuenta.tipo === 'banco' ? ingresoEstimado : undefined);
      onClose();
    } catch {
      setError('No se pudo guardar el saldo. Intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/55 p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="balance-modal-title">
      <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 sm:max-h-[92vh] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="balance-modal-title" className="text-base font-bold text-zinc-900 dark:text-white">Actualizar saldo</h2>
            <p className="mt-1 text-xs text-zinc-500">{cuenta.nombre}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          El saldo reemplaza el valor de la cuenta y su fecha de referencia. El ingreso mensual estimado es solo una proyección; no crea movimientos.
        </p>
        <form onSubmit={guardar} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor="account-balance" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Saldo actual ({cuenta.moneda})</label>
            <input id="account-balance" type="number" step="0.01" required value={saldo} onChange={(event) => setSaldo(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label htmlFor="account-balance-date" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Saldo correspondiente al</label>
            <input id="account-balance-date" type="date" required value={fecha} onChange={(event) => setFecha(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
          </div>
          {cuenta.tipo === 'banco' && (
            <div className="space-y-1">
              <label htmlFor="account-monthly-income" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Ingreso mensual estimado ({cuenta.moneda})</label>
              <input id="account-monthly-income" type="number" min="0" step="1" value={ingresoMensual} onChange={(event) => setIngresoMensual(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            </div>
          )}
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancelar</button>
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
};
