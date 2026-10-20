import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { TipoCuenta, TipoMoneda } from '../../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { label: 'Bancolombia Azul', value: '#004481' },
  { label: 'Nu Morado', value: '#820AD1' },
  { label: 'Davivienda Rojo', value: '#ED1C24' },
  { label: 'Lulo Naranja', value: '#FF6B00' },
  { label: 'Esmeralda / Efectivo', value: '#10B981' },
  { label: 'Dorado / Ahorro', value: '#F59E0B' },
  { label: 'Cyan Tecnológico', value: '#06B6D4' },
  { label: 'Gris Oscuro / Titanio', value: '#3F3F46' },
];

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { agregarCuenta } = useFinanceStore();

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCuenta>('banco');
  const [moneda, setMoneda] = useState<TipoMoneda>('COP');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0].value);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(saldoInicial) || 0;

    agregarCuenta({
      user_id: 'user1',
      nombre,
      tipo,
      moneda,
      saldo_inicial: monto,
      color,
      icono: tipo === 'banco' ? 'Landmark' : tipo === 'nequi_daviplata' ? 'Smartphone' : 'Banknote',
      es_predeterminada: false,
    });

    setNombre('');
    setSaldoInicial('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mb-1">
          Nueva Billetera o Cuenta
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
          Agrega tus bancos, billeteras digitales o cuentas en dólares
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre de la Cuenta */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Nombre de la Cuenta
            </label>
            <input
              type="text"
              required
              placeholder="Ej. NuBank, Davivienda, Nequi, Payoneer..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Tipo y Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Tipo de Cuenta
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoCuenta)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="banco">Banco Tradicional</option>
                <option value="nequi_daviplata">Billetera (Nequi/Daviplata)</option>
                <option value="efectivo">Efectivo Físico</option>
                <option value="tarjeta_credito">Tarjeta de Crédito</option>
                <option value="ahorro">Fondo de Ahorro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as TipoMoneda)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="COP">🇨🇴 Pesos (COP)</option>
                <option value="USD">🇺🇸 Dólares (USD)</option>
              </select>
            </div>
          </div>

          {/* Saldo Inicial */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Saldo Inicial ({moneda})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                $
              </span>
              <input
                type="number"
                step={moneda === 'COP' ? '1' : '0.01'}
                placeholder="0"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-sm font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Paleta de Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Color de Identificación
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setColor(p.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    color === p.value ? 'scale-115 border-white ring-2 ring-zinc-400 shadow-sm' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: p.value }}
                  title={p.label}
                />
              ))}
            </div>
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
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Crear Cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
