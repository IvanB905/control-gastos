import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  PieChart, 
  Plus 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setTransactionModalOpen } = useAppStore();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200/80 dark:border-zinc-800/80 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg select-none">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Tab 1: Dashboard / Inicio */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-0.5 tracking-tight">Inicio</span>
        </button>

        {/* Tab 2: Movimientos */}
        <button
          onClick={() => setActiveTab('movimientos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'movimientos'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-0.5 tracking-tight">Movimientos</span>
        </button>

        {/* Center Floating Action Button: + Nuevo Movimiento */}
        <div className="flex items-center justify-center flex-1 px-1">
          <button
            onClick={() => setTransactionModalOpen(true)}
            aria-label="Registrar nuevo movimiento"
            className="w-11 h-11 -mt-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition-all cursor-pointer ring-4 ring-white dark:ring-zinc-950"
          >
            <Plus className="w-6 h-6 stroke-[2.8]" />
          </button>
        </div>

        {/* Tab 3: Cuentas & Billeteras */}
        <button
          onClick={() => setActiveTab('cuentas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'cuentas'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Wallet className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-0.5 tracking-tight">Cuentas</span>
        </button>

        {/* Tab 4: Presupuestos & Metas */}
        <button
          onClick={() => setActiveTab('presupuestos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'presupuestos'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <PieChart className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-0.5 tracking-tight">Metas</span>
        </button>
      </div>
    </nav>
  );
};
