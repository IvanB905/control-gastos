import React from 'react';
import { Plus, Calendar, ChevronLeft, ChevronRight, Bell, Menu, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { MESES } from '../../lib/utils';

export const Header: React.FC = () => {
  const { 
    selectedMonth, 
    selectedYear, 
    setSelectedPeriod, 
    moneda, 
    setMoneda,
    setTransactionModalOpen,
    toggleSidebar,
    theme,
    toggleTheme
  } = useAppStore();

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedPeriod(12, selectedYear - 1);
    } else {
      setSelectedPeriod(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedPeriod(1, selectedYear + 1);
    } else {
      setSelectedPeriod(selectedMonth + 1, selectedYear);
    }
  };

  return (
    <header className="h-16 md:h-18 px-4 md:px-8 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left side: Hamburger (mobile) + Month & Year Navigator */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 md:hidden text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Month Selector */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-0.5 sm:p-1 shadow-xs">
          <button
            onClick={handlePrevMonth}
            className="p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          
          <div className="px-2 sm:px-3 flex items-center gap-1.5 font-semibold text-[11px] sm:text-xs tracking-tight text-zinc-900 dark:text-white min-w-[95px] sm:min-w-[120px] justify-center select-none">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
            <span>{MESES[selectedMonth - 1]} {selectedYear}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <button
          onClick={() => setSelectedPeriod(new Date().getMonth() + 1, new Date().getFullYear())}
          className="hidden sm:inline-block text-xs font-medium px-2.5 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          Hoy
        </button>
      </div>

      {/* Right Actions: Currency Switcher + Notifications + New Transaction */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Currency Switcher: COP / USD */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 sm:p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-[11px] sm:text-xs font-semibold">
          <button
            onClick={() => setMoneda('COP')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              moneda === 'COP'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Pesos Colombianos"
          >
            <span>🇨🇴</span>
            <span className="hidden xs:inline">COP</span>
          </button>
          <button
            onClick={() => setMoneda('USD')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              moneda === 'USD'
                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Dólares Americanos"
          >
            <span>🇺🇸</span>
            <span className="hidden xs:inline">USD</span>
          </button>
        </div>

        {/* Quick Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          title={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>

        {/* Notifications Icon (visible on tablet+) */}
        <button className="hidden md:flex p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors relative cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white dark:ring-zinc-950"></span>
        </button>

        {/* Primary CTA: + Nuevo Movimiento */}
        <button
          onClick={() => setTransactionModalOpen(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Nuevo Movimiento</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>
    </header>
  );
};
