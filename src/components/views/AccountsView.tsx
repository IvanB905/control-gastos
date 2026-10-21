import React, { useState } from 'react';
import { 
  Plus, 
  ArrowRightLeft, 
  Trash2, 
  Landmark, 
  Smartphone, 
  Banknote, 
  CreditCard, 
  ShieldCheck, 
  Wallet,
  DollarSign,
  PencilLine,
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AccountModal } from '../modals/AccountModal';
import { TransferModal } from '../modals/TransferModal';
import { UpdateAccountBalanceModal } from '../modals/UpdateAccountBalanceModal';
import type { TipoCuenta } from '../../types';

const getAccountIcon = (tipo: TipoCuenta) => {
  switch (tipo) {
    case 'banco':
      return Landmark;
    case 'nequi_daviplata':
      return Smartphone;
    case 'efectivo':
      return Banknote;
    case 'tarjeta_credito':
    case 'credito_libre_inversion':
      return CreditCard;
    case 'ahorro':
      return ShieldCheck;
    default:
      return Wallet;
  }
};

export const AccountsView: React.FC = () => {
  const { cuentas, movimientos, eliminarCuenta, consolidarCuentas } = useFinanceStore();

  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null);
  const [cuentaParaActualizar, setCuentaParaActualizar] = useState<typeof cuentas[number] | null>(null);
  const [mergingCuentaId, setMergingCuentaId] = useState<string | null>(null);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);

  const movementCounts = new Map(cuentas.map((cuenta) => [
    cuenta.id,
    movimientos.filter((movimiento) => movimiento.cuenta_id === cuenta.id).length,
  ]));
  const accountGroups = new Map<string, typeof cuentas>();
  cuentas.forEach((cuenta) => {
    const key = `${cuenta.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-CO')}|${cuenta.tipo}|${cuenta.moneda}`;
    accountGroups.set(key, [...(accountGroups.get(key) || []), cuenta]);
  });
  const mergeTargetBySource = new Map<string, typeof cuentas[number]>();
  accountGroups.forEach((group) => {
    if (group.length < 2) return;
    const ranked = [...group].sort((a, b) => (
      (movementCounts.get(b.id) || 0) - (movementCounts.get(a.id) || 0)
      || (a.created_at || '').localeCompare(b.created_at || '')
    ));
    ranked.slice(1).forEach((source) => mergeTargetBySource.set(source.id, ranked[0]));
  });

  const handleConsolidateAccount = async (source: typeof cuentas[number], target: typeof cuentas[number]) => {
    const visibleCount = movementCounts.get(source.id) || 0;
    if (!window.confirm(`Se moverán todos los movimientos asociados a esta cuenta duplicada a “${target.nombre}” y después se quitará el duplicado. La cuenta que se conservará tiene ${movementCounts.get(target.id) || 0} movimientos visibles. ¿Continuar?`)) return;

    setMergingCuentaId(source.id);
    setMergeMessage(null);
    try {
      const movedCount = await consolidarCuentas(source.id, target.id);
      setMergeMessage(`Cuenta consolidada. Se conservaron sus movimientos en “${target.nombre}”.`);
      if (movedCount !== visibleCount) {
        setMergeMessage(`Cuenta consolidada. Se reasignaron ${movedCount} movimientos guardados en la nube a “${target.nombre}”.`);
      }
    } catch (error) {
      setMergeMessage(error instanceof Error ? error.message : 'No se pudo consolidar la cuenta.');
    } finally {
      setMergingCuentaId(null);
    }
  };

  // Cálculos consolidados
  const totalCOP = cuentas
    .filter((c) => c.moneda === 'COP' && c.tipo !== 'tarjeta_credito' && c.tipo !== 'credito_libre_inversion')
    .reduce((acc, c) => acc + c.saldo_actual, 0);

  const totalUSD = cuentas
    .filter((c) => c.moneda === 'USD' && c.tipo !== 'tarjeta_credito' && c.tipo !== 'credito_libre_inversion')
    .reduce((acc, c) => acc + c.saldo_actual, 0);

  const deudaTotal = cuentas
    .filter((c) => c.tipo === 'tarjeta_credito' || c.tipo === 'credito_libre_inversion')
    .reduce((acc, c) => acc + Math.abs(c.saldo_actual), 0);

  const movimientosCuenta = selectedCuentaId
    ? movimientos.filter((m) => m.cuenta_id === selectedCuentaId)
    : movimientos;

  const selectedCuenta = cuentas.find((c) => c.id === selectedCuentaId);

  return (
    <div className="space-y-6">
      {/* View Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Billeteras, Bancos & Tarjetas
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Administra tus cuentas financieras y transfiere saldos entre ellas
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setTransferModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
            <span>Transferir Fondos</span>
          </button>

          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Cuenta</span>
          </button>
        </div>
      </div>

      {mergeMessage && (
        <p role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          {mergeMessage}
        </p>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
            Disponible (COP)
          </span>
          <span className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white block mt-1 truncate">
            {formatCurrency(totalCOP, 'COP')}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
            Dólares (USD)
          </span>
          <span className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400 block mt-1 truncate">
            {formatCurrency(totalUSD, 'USD')}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
            Deuda Total (COP)
          </span>
          <span className="text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400 block mt-1 truncate">
            {formatCurrency(deudaTotal, 'COP')}
          </span>
        </div>
      </div>

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cuentas.map((cuenta) => {
          const Icon = getAccountIcon(cuenta.tipo);
          const isSelected = selectedCuentaId === cuenta.id;
          const isNegative = cuenta.saldo_actual < 0;

          return (
            <div
              key={cuenta.id}
              onClick={() => setSelectedCuentaId(isSelected ? null : cuenta.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              {/* Account Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: cuenta.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                      {cuenta.nombre}
                    </h4>
                    <span className="text-[11px] text-zinc-400 font-medium capitalize">
                      {cuenta.tipo === 'credito_libre_inversion' ? 'crédito libre inversión' : cuenta.tipo.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); setCuentaParaActualizar(cuenta); }}
                    aria-label={`Actualizar saldo de ${cuenta.nombre}`}
                    title="Actualizar saldo"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-600 dark:hover:bg-zinc-800"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {cuenta.moneda}
                  </span>

                  {cuentas.length > 1 && (movementCounts.get(cuenta.id) || 0) === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void eliminarCuenta(cuenta.id).catch((error) => {
                          setMergeMessage(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.');
                        });
                      }}
                      className="p-1 text-zinc-300 hover:text-red-500 rounded-lg transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Account Balance */}
              <div className="mt-6 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-wider">
                    Saldo Actual
                  </span>
                  <span className={`text-2xl font-extrabold tracking-tight ${isNegative ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                    {formatCurrency(cuenta.saldo_actual, cuenta.moneda)}
                  </span>
                </div>

                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {isSelected ? 'Ocultar historial' : 'Ver movimientos →'}
                </span>
              </div>

              {mergeTargetBySource.has(cuenta.id) && (
                <button
                  type="button"
                  disabled={mergingCuentaId !== null}
                  onClick={(event) => {
                    event.stopPropagation();
                    const target = mergeTargetBySource.get(cuenta.id);
                    if (target) void handleConsolidateAccount(cuenta, target);
                  }}
                  className="mt-4 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-60 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950"
                >
                  {mergingCuentaId === cuenta.id ? 'Consolidando…' : `Consolidar con la cuenta de ${movementCounts.get(mergeTargetBySource.get(cuenta.id)!.id) || 0} movimientos`}
                </button>
              )}

              {(cuenta.limite_credito || cuenta.ingreso_mensual_estimado || cuenta.aporte_mensual || cuenta.plazo_meses || cuenta.saldo_fecha) && (
                <div className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800">
                  {cuenta.limite_credito && <p>Cupo: {formatCurrency(cuenta.limite_credito, cuenta.moneda)} · Disponible: {formatCurrency(Math.max(0, cuenta.limite_credito - Math.abs(cuenta.saldo_actual)), cuenta.moneda)}</p>}
                  {cuenta.ingreso_mensual_estimado && <p>Nómina mensual estimada: {formatCurrency(cuenta.ingreso_mensual_estimado, cuenta.moneda)}</p>}
                  {cuenta.aporte_mensual && <p>Aporte mensual: {formatCurrency(cuenta.aporte_mensual, cuenta.moneda)}</p>}
                  {cuenta.plazo_meses && <p>Plazo: {cuenta.plazo_meses} meses</p>}
                  {cuenta.saldo_fecha && <p>Saldo de referencia: {formatDate(cuenta.saldo_fecha)}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Account Specific Movements Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight mb-4">
          {selectedCuenta 
            ? `Movimientos de ${selectedCuenta.nombre} (${movimientosCuenta.length})` 
            : `Todos los Movimientos de tus Cuentas (${movimientos.length})`}
        </h3>

        {movimientosCuenta.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">
            No hay movimientos registrados en esta cuenta.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {movimientosCuenta.slice(0, 8).map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {m.descripcion}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {formatDate(m.fecha)} • <span className="capitalize">{m.tipo}</span>
                  </p>
                </div>
                <span className={`text-xs font-bold ${
                  m.tipo === 'gasto' ? 'text-rose-600 dark:text-rose-400' : m.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                }`}>
                  {m.tipo === 'gasto' ? '-' : '+'}{formatCurrency(m.monto, m.moneda)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setAccountModalOpen(false)}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setTransferModalOpen(false)}
      />
      {cuentaParaActualizar && (
        <UpdateAccountBalanceModal
          cuenta={cuentaParaActualizar}
          onClose={() => setCuentaParaActualizar(null)}
        />
      )}
    </div>
  );
};
