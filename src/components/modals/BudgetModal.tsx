import React, { useEffect, useState } from 'react';
import { X, PieChart } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import type { Presupuesto, TipoMoneda } from '../../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presupuesto?: Presupuesto | null;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, presupuesto = null }) => {
  const { categorias, agregarPresupuesto, editarPresupuesto } = useFinanceStore();
  const { moneda: monedaGlobal, selectedMonth, selectedYear } = useAppStore();

  const categoriasGasto = categorias.filter((c) => c.tipo === 'gasto');

  const [categoriaId, setCategoriaId] = useState(categoriasGasto[0]?.id || '');
  const [moneda, setMoneda] = useState<TipoMoneda>(monedaGlobal);
  const [montoLimite, setMontoLimite] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCategoriaId(presupuesto?.categoria_id || categoriasGasto[0]?.id || '');
    setMoneda(presupuesto?.moneda || monedaGlobal);
    setMontoLimite(presupuesto ? String(presupuesto.monto_limite) : '');
    setError('');
  }, [
    isOpen,
    presupuesto?.id,
    presupuesto?.categoria_id,
    presupuesto?.monto_limite,
    presupuesto?.moneda,
    categoriasGasto[0]?.id,
    monedaGlobal,
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(montoLimite);
    if (isNaN(parsed) || parsed <= 0 || !categoriaId) {
      setError('Selecciona una categoría y un límite mayor que cero.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      if (presupuesto) {
        await editarPresupuesto(presupuesto.id, { categoria_id: categoriaId, monto_limite: parsed, moneda });
      } else {
        await agregarPresupuesto({
          user_id: 'user1',
          categoria_id: categoriaId,
          monto_limite: parsed,
          moneda,
          mes: selectedMonth,
          anio: selectedYear,
        });
      }
      setMontoLimite('');
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el presupuesto.');
    } finally {
      setIsSaving(false);
    }
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
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
            {presupuesto ? 'Editar Presupuesto Mensual' : 'Fijar Presupuesto Mensual'}
          </h3>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
          {presupuesto ? 'Actualiza la categoría o el límite de este mes.' : 'Establece un límite de gasto para una categoría en el mes'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Categoría */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Categoría a Controlar
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {categoriasGasto.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Moneda y Monto Límite */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Tope Máximo Permitido
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
                min="0"
                required
                placeholder={moneda === 'COP' ? '500000' : '150'}
                value={montoLimite}
                onChange={(e) => setMontoLimite(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-base font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {isSaving ? 'Guardando…' : presupuesto ? 'Guardar Cambios' : 'Guardar Presupuesto'}
            </button>
          </div>
        </form>
        {error && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </div>
  );
};
