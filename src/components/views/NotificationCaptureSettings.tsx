import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, BellRing, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency } from '../../lib/utils';
import { notificationReader, type CapturedBankNotification } from '../../lib/notificationReader';
import type { Cuenta } from '../../types';

type AccessState = 'checking' | 'granted' | 'denied' | 'unavailable';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function suggestAccount(notification: CapturedBankNotification, accounts: Cuenta[]) {
  const currencyAccounts = accounts.filter((account) => account.moneda === notification.currency);
  const hintedAccount = currencyAccounts.find((account) => account.tipo === notification.accountHint);
  if (hintedAccount) return hintedAccount.id;
  const description = normalize(notification.description);
  if (notification.type === 'gasto' && /tarjeta|compra|mastercard/.test(description)) {
    const card = currencyAccounts.find((account) => account.tipo === 'tarjeta_credito');
    if (card) return card.id;
  }
  const bank = currencyAccounts.find((account) => account.tipo === 'banco');
  return bank?.id || currencyAccounts[0]?.id || '';
}

export const NotificationCaptureSettings: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const { cuentas, categorias, movimientos, registrarMovimientoNotificacion } = useFinanceStore();
  const [access, setAccess] = useState<AccessState>('checking');
  const [captured, setCaptured] = useState<CapturedBankNotification[]>([]);
  const [accountById, setAccountById] = useState<Record<string, string>>({});
  const [categoryById, setCategoryById] = useState<Record<string, string>>({});
  const [amountById, setAmountById] = useState<Record<string, string>>({});
  const [dateById, setDateById] = useState<Record<string, string>>({});
  const [typeById, setTypeById] = useState<Record<string, 'ingreso' | 'gasto' | 'transferencia'>>({});
  const [flowById, setFlowById] = useState<Record<string, 'entrada' | 'salida'>>({});
  const [counterpartById, setCounterpartById] = useState<Record<string, string>>({});
  const [descriptionById, setDescriptionById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isAndroidApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  const refresh = useCallback(async () => {
    if (!isAndroidApp) { setAccess('unavailable'); setCaptured([]); return; }
    setAccess('checking');
    try {
      const result = await notificationReader.getStatus();
      setAccess(result.granted ? 'granted' : 'denied');
      if (result.granted) {
        const data = await notificationReader.getPending();
        setCaptured(data.notifications.filter((item) => !movimientos.some((movement) => movement.notas?.includes(`[notificacion-bancaria:${item.id}]`))));
      } else setCaptured([]);
    } catch {
      setAccess('denied');
      setMessage('No se pudo consultar el acceso. Intenta actualizar el estado.');
    }
  }, [isAndroidApp, movimientos]);

  useEffect(() => {
    void refresh();
    const onResume = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [refresh]);

  const accountsByCurrency = useMemo(() => cuentas.filter((account) => {
    const name = normalize(account.nombre);
    return account.tipo !== 'credito_libre_inversion' && !name.includes('fondo nacional del ahorro') && !/\bfna\b/.test(name);
  }), [cuentas]);

  const save = async (item: CapturedBankNotification) => {
    const cuentaId = accountById[item.id] || suggestAccount(item, cuentas);
    const tipo = typeById[item.id] || item.type;
    const flujo = flowById[item.id] || item.flow || '';
    const counterpartId = counterpartById[item.id] || '';
    const categoriaId = categoryById[item.id] || '';
    const amount = Number(amountById[item.id] ?? String(item.amount));
    const date = dateById[item.id] || item.date;
    if (!cuentaId || (tipo !== 'transferencia' && !categoriaId)) { setMessage('Selecciona una cuenta y categoría para guardar el movimiento.'); return; }
    if (tipo === 'transferencia' && flujo !== 'entrada' && flujo !== 'salida') { setMessage('Indica si la transferencia entró o salió de la cuenta seleccionada.'); return; }
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setMessage('Revisa el monto y la fecha antes de guardar.'); return; }
    setBusyId(item.id);
    setMessage(null);
    try {
      await registrarMovimientoNotificacion({
        user_id: '',
        cuenta_id: cuentaId,
        categoria_id: tipo === 'transferencia' ? null : categoriaId,
        tipo,
        monto: amount,
        moneda: item.currency,
        fecha: date,
        descripcion: descriptionById[item.id]?.trim() || item.description,
        estado: 'completado',
        es_recurrente: false,
      }, item.id, tipo === 'transferencia' ? { flow: flujo, counterpartId: counterpartId || undefined } : undefined);
      await notificationReader.removePending({ id: item.id });
      setCaptured((current) => current.filter((notification) => notification.id !== item.id));
      setMessage('Movimiento guardado y sincronizado con tu cuenta.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.');
    } finally { setBusyId(null); }
  };

  const discard = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await notificationReader.removePending({ id });
      setCaptured((current) => current.filter((item) => item.id !== id));
      setMessage('Detección descartada del teléfono.');
    } catch { setMessage('No se pudo descartar la detección.'); }
    finally { setBusyId(null); }
  };

  return (
    <section aria-labelledby="notification-capture-title" className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-emerald-600 dark:text-emerald-400"><BellRing className="w-5 h-5" /></div>
        <div className="min-w-0 flex-1">
          <h3 id="notification-capture-title" className="text-base font-bold text-zinc-900 dark:text-white">Lectura de notificaciones de movimientos</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Detecta pagos y transferencias de varias apps bancarias compatibles y prepara borradores para revisar.</p>
        </div>
        {isAndroidApp && <button type="button" onClick={() => void refresh()} aria-label="Actualizar detecciones" className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"><RefreshCw className="h-4 w-4" /></button>}
      </div>

      {!isAndroidApp ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        <div className="flex items-start gap-2"><Smartphone className="h-4 w-4 mt-0.5 shrink-0" /><p>Esta función requiere la app instalada en Android. La web de Vercel no puede leer las notificaciones del teléfono; iOS tampoco ofrece este acceso general a notificaciones de otras apps.</p></div>
      </div> : <>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 p-3.5 space-y-2">
          <div className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-200"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" /><p>Android permite al servicio acceder a notificaciones. Finanza filtra localmente una lista explícita de apps bancarias y billeteras compatibles (Bancolombia, Nequi, BBVA, Banco de Bogotá, Banco Caja Social, Davivienda, DaviPlata, DAVIbank, Banco de Occidente, Banco Agrario, bico, Lulo y Nu); no guarda su texto completo y conserva solo borradores que reconoce como movimientos. Nada se sincroniza hasta que revises y apruebes cada uno.</p></div>
          <p className="pl-6 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">Puedes quitar el acceso en cualquier momento desde Ajustes de Android → Acceso a notificaciones. Las notificaciones de otras apps no se guardan. Revisa monto, fecha, tipo y cuenta antes de aprobar cada movimiento.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {access === 'checking' ? <LoaderCircle className="h-4 w-4 animate-spin text-zinc-400" /> : access === 'granted' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">{access === 'checking' ? 'Consultando permiso…' : access === 'granted' ? 'Acceso activado' : 'Acceso desactivado'}</span>
          </div>
          {access === 'granted' ? <span className="text-xs text-zinc-500">{captured.length} borrador{captured.length === 1 ? '' : 'es'} por revisar</span> : <button type="button" onClick={() => void notificationReader.openSettings()} disabled={access === 'checking'} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">Activar acceso en Android</button>}
        </div>

        {!isAuthenticated && <p role="status" className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">Inicia sesión para sincronizar los movimientos que apruebes.</p>}

        {captured.length > 0 && <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Movimientos detectados</h4>
          {captured.map((item) => {
            const availableAccounts = accountsByCurrency.filter((account) => account.moneda === item.currency);
            const selectedAccount = accountById[item.id] || suggestAccount(item, availableAccounts);
            const movementType = typeById[item.id] || item.type;
            const categoriesForType = categorias.filter((category) => category.tipo === movementType);
            const selectedCategory = categoryById[item.id] || '';
            const flow = flowById[item.id] || item.flow || '';
            const counterpartId = counterpartById[item.id] || '';
            return <article key={item.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white break-words">{item.description}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{item.source} · Fecha y tipo sugeridos para revisar</p>
                </div>
                <strong className={`shrink-0 text-sm ${movementType === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : movementType === 'transferencia' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{movementType === 'ingreso' ? '+' : movementType === 'transferencia' ? '↔' : '−'}{formatCurrency(Number(amountById[item.id] ?? item.amount), item.currency)}</strong>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] font-medium text-zinc-500">Descripción
                  <input type="text" maxLength={100} value={descriptionById[item.id] ?? item.description} onChange={(event) => setDescriptionById((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white" />
                </label>
                <label className="text-[11px] font-medium text-zinc-500">Monto detectado
                  <input type="number" min="0.01" step="0.01" inputMode="decimal" value={amountById[item.id] ?? item.amount} onChange={(event) => setAmountById((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white" />
                </label>
                <label className="text-[11px] font-medium text-zinc-500">Fecha del movimiento
                  <input type="date" value={dateById[item.id] ?? item.date} onChange={(event) => setDateById((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white" />
                </label>
                <label className="text-[11px] font-medium text-zinc-500">Tipo de movimiento
                  <select value={movementType} onChange={(event) => { const nextType = event.target.value as 'ingreso' | 'gasto' | 'transferencia'; setTypeById((current) => ({ ...current, [item.id]: nextType })); setCategoryById((current) => ({ ...current, [item.id]: '' })); }} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white">
                    <option value="gasto">Pago / gasto</option><option value="ingreso">Ingreso</option><option value="transferencia">Transferencia</option>
                  </select>
                </label>
                <label className="text-[11px] font-medium text-zinc-500">Cuenta
                  <select value={selectedAccount} onChange={(event) => setAccountById((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white">
                    {availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.nombre}</option>)}
                  </select>
                </label>
                {movementType === 'transferencia' ? <>
                  <label className="text-[11px] font-medium text-zinc-500">Dirección de la transferencia
                    <select value={flow} onChange={(event) => setFlowById((current) => ({ ...current, [item.id]: event.target.value as 'entrada' | 'salida' }))} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white"><option value="">Confirma la dirección</option><option value="salida">Salió de la cuenta seleccionada</option><option value="entrada">Entró a la cuenta seleccionada</option></select>
                  </label>
                  <label className="text-[11px] font-medium text-zinc-500">Otra cuenta relacionada (opcional)
                    <select value={counterpartId} onChange={(event) => setCounterpartById((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white"><option value="">No la tengo registrada / cuenta externa</option>{availableAccounts.filter((account) => account.id !== selectedAccount).map((account) => <option key={account.id} value={account.id}>{account.nombre}</option>)}</select>
                  </label>
                </> : <label className="text-[11px] font-medium text-zinc-500">Categoría
                  <select value={selectedCategory} onChange={(event) => setCategoryById((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white">
                    {!categoriesForType.some((category) => category.id === selectedCategory) && <option value="">Selecciona una categoría</option>}
                    {categoriesForType.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                  </select>
                </label>}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => void discard(item.id)} disabled={busyId === item.id} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Descartar</button>
                <button type="button" onClick={() => void save(item)} disabled={!isAuthenticated || busyId === item.id || !availableAccounts.length || (movementType !== 'transferencia' && !categoriesForType.length) || (movementType === 'transferencia' && !flowById[item.id] && !item.flow) || counterpartId === selectedAccount} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{busyId === item.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Guardar movimiento</button>
              </div>
            </article>;
          })}
        </div>}

        {access === 'granted' && captured.length === 0 && <p role="status" className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-6 text-center text-xs text-zinc-500">Todavía no hay movimientos detectados. Cuando llegue una notificación compatible de una app bancaria admitida aparecerá aquí para revisión.</p>}
      </>}

      {message && <p role="status" className="text-xs text-zinc-600 dark:text-zinc-300">{message}</p>}
    </section>
  );
};
