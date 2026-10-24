import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, CreditCard, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate, countsTowardAvailableBalance } from '../../lib/utils';
import type { Movimiento } from '../../types';

const CARD_PAYMENT_MARKER = '[calendario-pago-tarjeta]';

function getDestinationId(notas?: string) {
  return notas?.match(/\[destino:([^\]]+)\]/)?.[1] || null;
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  return { start, end };
}

function getDueStatus(date: string, today: Date, completed: boolean) {
  if (completed) return { label: 'Pagado', className: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40', Icon: CheckCircle2 };
  const [year, month, day] = date.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((due.getTime() - todayLocal.getTime()) / 86400000);
  if (days < 0) return { label: 'Vencido', className: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40', Icon: AlertTriangle };
  if (days === 0) return { label: 'Vence hoy', className: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40', Icon: Clock3 };
  return { label: `En ${days} día${days === 1 ? '' : 's'}`, className: 'text-zinc-600 bg-zinc-100 dark:text-zinc-300 dark:bg-zinc-800', Icon: Clock3 };
}

export const PaymentCalendar: React.FC<{ month: number; year: number }> = ({ month, year }) => {
  const { cuentas, movimientos, marcarPagoPendiente, programarPagoTarjeta } = useFinanceStore();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const { start, end } = monthBounds(year, month);
  const copCards = cuentas.filter((account) => account.tipo === 'tarjeta_credito' && account.moneda === 'COP');
  const liquidAccounts = cuentas.filter((account) => account.moneda === 'COP' && account.tipo !== 'tarjeta_credito' && countsTowardAvailableBalance(account));

  const items = useMemo(() => movimientos
    .filter((movement) => movement.fecha >= start && movement.fecha <= end && (
      movement.tipo === 'gasto' || (movement.tipo === 'transferencia' && movement.notas?.startsWith(CARD_PAYMENT_MARKER))
    ))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.descripcion.localeCompare(b.descripcion)), [movimientos, start, end]);

  const handleSchedule = async (card: typeof copCards[number]) => {
    const amount = Number(amounts[card.id]);
    const sourceId = sources[card.id] || liquidAccounts[0]?.id;
    if (!Number.isFinite(amount) || amount <= 0) { setError('Ingresa el valor COP del extracto de la tarjeta.'); return; }
    if (!sourceId) { setError('No hay una cuenta líquida en COP para registrar el origen del pago.'); return; }
    setBusyId(card.id);
    setError(null);
    try {
      await programarPagoTarjeta({
        origenId: sourceId,
        destinoId: card.id,
        monto: amount,
        fecha: `${year}-${String(month).padStart(2, '0')}-18`,
        descripcion: `Pago tarjeta ${card.nombre} (extracto ${String(month).padStart(2, '0')}/${year})`,
      });
      setAmounts((current) => ({ ...current, [card.id]: '' }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la programación.');
    } finally { setBusyId(null); }
  };

  const handleMarkPaid = async (movement: Movimiento) => {
    setBusyId(movement.id);
    setError(null);
    try { await marcarPagoPendiente(movement.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo confirmar el pago.'); }
    finally { setBusyId(null); }
  };

  const monthHasCardPayment = (cardId: string) => items.some((movement) =>
    movement.tipo === 'transferencia' && getDestinationId(movement.notas) === cardId
  );

  return (
    <section aria-labelledby="payment-calendar-title" className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-emerald-600 dark:text-emerald-400"><CalendarDays className="w-5 h-5" /></div>
        <div>
          <h3 id="payment-calendar-title" className="text-base font-bold text-zinc-900 dark:text-white">Calendario de pagos</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Compromisos de {new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}. Los avisos aparecen aquí dentro de la app.</p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}

      {copCards.map((card) => {
        const existing = monthHasCardPayment(card.id);
        return <div key={card.id} className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-4 h-4 mt-0.5 text-indigo-500" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{card.nombre}</p>
                <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">Vence el 18</span>
              </div>
              {existing ? <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">Pago del extracto registrado para este mes. Revisa su estado en la lista.</p> : <>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Confirma el valor COP del extracto antes de programar el pago.</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <label className="sr-only" htmlFor={`card-amount-${card.id}`}>Valor del extracto</label>
                  <input id={`card-amount-${card.id}`} inputMode="decimal" type="number" min="1" step="1" value={amounts[card.id] || ''} onChange={(event) => setAmounts((current) => ({ ...current, [card.id]: event.target.value }))} placeholder="Valor del extracto (COP)" className="min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white" />
                  <label className="sr-only" htmlFor={`card-source-${card.id}`}>Cuenta de origen</label>
                  <select id={`card-source-${card.id}`} value={sources[card.id] || liquidAccounts[0]?.id || ''} onChange={(event) => setSources((current) => ({ ...current, [card.id]: event.target.value }))} className="min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white" disabled={liquidAccounts.length === 0}>
                    {liquidAccounts.map((account) => <option key={account.id} value={account.id}>{account.nombre}</option>)}
                  </select>
                  <button type="button" onClick={() => void handleSchedule(card)} disabled={busyId === card.id || liquidAccounts.length === 0} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${busyId === card.id ? 'animate-spin' : ''}`} /> Programar
                  </button>
                </div>
              </>}
            </div>
          </div>
        </div>;
      })}

      {items.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-8 text-center text-xs text-zinc-500">No hay pagos registrados para este mes. Las cuentas FNA y de crédito no se ofrecen como origen de pago.</p> : <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((movement) => {
          const status = getDueStatus(movement.fecha, today, movement.estado === 'completado');
          const StatusIcon = status.Icon;
          const destination = movement.tipo === 'transferencia' ? cuentas.find((account) => account.id === getDestinationId(movement.notas)) : undefined;
          const label = movement.tipo === 'transferencia' ? `Pago tarjeta · ${destination?.nombre || 'Tarjeta'}` : movement.descripcion;
          return <article key={movement.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="w-10 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-1.5 py-2 text-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{movement.fecha.slice(8, 10)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white break-words">{label}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{formatDate(movement.fecha)} · {cuentas.find((account) => account.id === movement.cuenta_id)?.nombre || 'Cuenta'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 pl-[52px] sm:pl-0">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{formatCurrency(movement.monto, movement.moneda)}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${status.className}`}><StatusIcon className="w-3 h-3" />{status.label}</span>
              {movement.estado === 'pendiente' && <button type="button" onClick={() => void handleMarkPaid(movement)} disabled={busyId === movement.id} className="rounded-lg border border-emerald-200 dark:border-emerald-900 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50">{busyId === movement.id ? 'Guardando…' : 'Marcar pagado'}</button>}
            </div>
          </article>;
        })}
      </div>}
      <p className="text-[10px] leading-4 text-zinc-400">Al confirmar un gasto pendiente se actualiza el saldo de su cuenta. El pago de tarjeta se guarda como transferencia para no duplicarlo como gasto.</p>
    </section>
  );
};
