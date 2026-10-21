import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  DollarSign, 
  Database, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  User, 
  LogOut, 
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Server,
  Layers
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { CategoryModal } from '../modals/CategoryModal';
import { formatCurrency } from '../../lib/utils';

export const SettingsView: React.FC = () => {
  const { categorias, eliminarCategoria, movimientos, cuentas, presupuestos, metasAhorro, cargarDatos, restablecerDatosDemo } = useFinanceStore();
  const { moneda, setMoneda } = useAppStore();
  const { user, signOut, setAuthModalOpen } = useAuthStore();

  const [activeCategoryTab, setActiveCategoryTab] = useState<'gasto' | 'ingreso'>('gasto');
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<'gasto' | 'ingreso'>('gasto');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === activeCategoryTab);

  const getMovimientosCount = (catId: string) => {
    return movimientos.filter((m) => m.categoria_id === catId).length;
  };

  const handleOpenAddCategory = (tipo: 'gasto' | 'ingreso') => {
    setModalInitialType(tipo);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = (id: string, nombre: string) => {
    const count = getMovimientosCount(id);
    if (count > 0) {
      if (!confirm(`La categoría "${nombre}" tiene ${count} movimiento(s) asociados. ¿Deseas eliminarla de todas formas?`)) {
        return;
      }
    } else {
      if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) {
        return;
      }
    }
    eliminarCategoria(id);
  };

  const handleExportJSON = () => {
    const backupData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      monedaActiva: moneda,
      cuentas,
      categorias,
      movimientos,
      presupuestos,
      metasAhorro,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fintech-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setStatusMessage('Copia de respaldo JSON descargada exitosamente.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleResetDemoData = () => {
    if (confirm('¿Deseas restablecer la configuración inicial de tus cuentas? Esto borrará movimientos, presupuestos, metas y otros datos guardados localmente.')) {
      restablecerDatosDemo();
      setStatusMessage('Datos restablecidos al estado inicial correctamente.');
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Configuración & Preferencias
        </h2>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Gestiona rubros de clasificación, monedas de visualización, seguridad en la nube y respaldos.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid of Settings Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Categories Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Categorías de Clasificación
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Personaliza las etiquetas de tus ingresos y gastos para métricas exactas
                </p>
              </div>

              <button
                onClick={() => handleOpenAddCategory(activeCategoryTab)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Categoría</span>
              </button>
            </div>

            {/* Type Switcher Tabs */}
            <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-xl mb-5 w-fit">
              <button
                onClick={() => setActiveCategoryTab('gasto')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeCategoryTab === 'gasto'
                    ? 'bg-white dark:bg-zinc-900 text-rose-500 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Gastos ({categorias.filter((c) => c.tipo === 'gasto').length})</span>
              </button>

              <button
                onClick={() => setActiveCategoryTab('ingreso')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeCategoryTab === 'ingreso'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-500 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Ingresos ({categorias.filter((c) => c.tipo === 'ingreso').length})</span>
              </button>
            </div>

            {/* Categories List / Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoriasFiltradas.map((cat) => {
                const count = getMovimientosCount(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs text-white text-xs font-bold"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {cat.nombre}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {count === 0 ? 'Sin movimientos' : `${count} movimiento${count > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: cat.color }}
                        title={`Color: ${cat.color}`}
                      />
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {categoriasFiltradas.length === 0 && (
                <div className="col-span-2 py-8 text-center text-xs text-zinc-400">
                  No hay categorías registradas en esta sección.
                </div>
              )}
            </div>
          </div>

          {/* Currency Configuration Module */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Sistema Multidivisa: COP & USD
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
              Elige la moneda principal de trabajo. Puedes alternar al instante desde la barra superior en cualquier momento.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Colombian Pesos (COP) */}
              <div
                onClick={() => setMoneda('COP')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  moneda === 'COP'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇨🇴</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Pesos Colombianos (COP)
                    </span>
                  </div>
                  {moneda === 'COP' && (
                    <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">
                      Activa
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                  Formato estándar colombiano sin centavos, con separador de miles.
                </p>
                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-900 py-1.5 px-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800">
                  Ejemplo: {formatCurrency(4500000, 'COP')}
                </div>
              </div>

              {/* Option 2: US Dollars (USD) */}
              <div
                onClick={() => setMoneda('USD')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  moneda === 'USD'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇺🇸</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Dólares Americanos (USD)
                    </span>
                  </div>
                  {moneda === 'USD' && (
                    <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">
                      Activa
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                  Formato bancario estadounidense con 2 decimales y separador por coma.
                </p>
                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-900 py-1.5 px-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800">
                  Ejemplo: {formatCurrency(1450, 'USD')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Supabase Cloud, Auth & Backup */}
        <div className="space-y-6">
          
          {/* Supabase Connection Status Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Nube Supabase
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Conectado
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Base de datos PostgreSQL en tiempo real con políticas RLS para control granular de acceso.
            </p>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-100 dark:border-zinc-800/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Endpoint:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[170px]" title="https://tkdzsalivxswdezpnrtb.supabase.co">
                  tkdzsalivxswdezpnrtb
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Seguridad:</span>
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  RLS Activo
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Autenticación:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {user ? 'Sesión Supabase' : 'Modo Híbrido'}
                </span>
              </div>
            </div>

            {/* User Session Action */}
            {user ? (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate text-xs">
                    <div className="font-semibold text-zinc-900 dark:text-white truncate">
                      {user.email}
                    </div>
                    <div className="text-[10px] text-zinc-400">Usuario autenticado</div>
                  </div>
                </div>

                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión en Supabase</span>
                </button>
              </div>
            )}
          </div>

          {/* Backup & System Operations */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Copia de Seguridad & Datos
              </h3>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Exporta una copia completa en JSON o restablece la configuración inicial de tus cuentas.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleExportJSON}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Copia de Seguridad JSON</span>
              </button>

              <button
                onClick={handleResetDemoData}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar / Restablecer Datos</span>
              </button>
            </div>
          </div>

          {/* About Platform */}
          <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 text-[11px] text-zinc-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Control de Gastos & Finanzas v2.0</span>
            </div>
            <p>
              Arquitectura moderna basada en React 19, TypeScript, Tailwind CSS v4, Zustand y Supabase PostgreSQL.
            </p>
            <div className="pt-2 text-[10px] text-zinc-500 border-t border-zinc-200/40 dark:border-zinc-800/40">
              🇨🇴 Peso Colombiano (COP) • 🇺🇸 Dólar Americano (USD)
            </div>
          </div>

        </div>

      </div>

      {/* Category Creation Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        tipoInicial={modalInitialType}
      />
    </div>
  );
};
