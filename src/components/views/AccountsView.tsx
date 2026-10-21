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
  DollarSign
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AccountModal } from '../modals/AccountModal';
import { TransferModal } from '../modals/TransferModal';
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
  const { cuentas, movimientos, eliminarCuenta } = useFinanceStore();

  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null);

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
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {cuenta.moneda}
                  </span>

                  {cuentas.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarCuenta(cuenta.id);
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
    </div>
  );
};
