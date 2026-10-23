import React, { useState } from 'react';
import { X, Target } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import type { TipoMoneda } from '../../types';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { label: 'Esmeralda', value: '#10B981' },
  { label: 'Azul FinTech', value: '#3B82F6' },
  { label: 'Púrpura / Nu', value: '#8B5CF6' },
  { label: 'Cyan Viajes', value: '#06B6D4' },
  { label: 'Dorado Metas', value: '#F59E0B' },
  { label: 'Rosa / Ocio', value: '#EC4899' },
];

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({ isOpen, onClose }) => {
  const { agregarMetaAhorro } = useFinanceStore();
  const { moneda: monedaGlobal } = useAppStore();

  const [nombre, setNombre] = useState('');
  const [montoObjetivo, setMontoObjetivo] = useState('');
  const [montoInicial, setMontoInicial] = useState('');
  const [moneda, setMoneda] = useState<TipoMoneda>(monedaGlobal);
  const [fechaLimite, setFechaLimite] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0].value);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const obj = parseFloat(montoObjetivo);
    const act = parseFloat(montoInicial) || 0;
    if (isNaN(obj) || obj <= 0 || !nombre) return;

    agregarMetaAhorro({
      user_id: 'user1',
      nombre,
      monto_objetivo: obj,
      monto_actual: act,
      moneda,
      fecha_limite: fechaLimite || undefined,
      color,
      icono: 'Target',
    });

    setNombre('');
    setMontoObjetivo('');
    setMontoInicial('');
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
            <Target className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
            Nueva Meta de Ahorro
          </h3>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
          Crea una alcancía o fondo específico para cumplir tus sueños
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre de la Meta */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Nombre de la Meta / Sueño
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Vacaciones fin de año, Comprar Carro, Fondo..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Moneda */}
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Moneda
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

          {/* Montos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Monto Objetivo ({moneda})
              </label>
              <input
                type="number"
                step={moneda === 'COP' ? '1000' : '1'}
                required
                placeholder="0"
                value={montoObjetivo}
                onChange={(e) => setMontoObjetivo(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Ahorrado Actualmente
              </label>
              <input
                type="number"
                step={moneda === 'COP' ? '1000' : '1'}
                placeholder="0"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Fecha Límite */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Fecha Estimada para Lograrlo (Opcional)
            </label>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Color Distintivo
            </label>
            <div className="flex items-center gap-2">
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
              Crear Meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
