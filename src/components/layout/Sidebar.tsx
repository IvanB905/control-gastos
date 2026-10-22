import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  PieChart, 
  Bot,
  Settings, 
  Sun, 
  Moon, 
  TrendingUp,
  LogOut,
  LogIn,
  X
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

interface NavItem {
  id: 'dashboard' | 'movimientos' | 'cuentas' | 'presupuestos' | 'asistente' | 'configuracion';
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { id: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'cuentas', label: 'Billeteras & Bancos', icon: Wallet },
  { id: 'presupuestos', label: 'Presupuestos & Metas', icon: PieChart },
  { id: 'asistente', label: 'Asistente financiero', icon: Bot },
  { id: 'configuracion', label: 'Ajustes', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme, activeTab, setActiveTab, isSidebarOpen, setSidebarOpen } = useAppStore();
  const { user, signOut, setAuthModalOpen } = useAuthStore();

  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Modo Demo';
  const userEmail = user?.email || 'Sin sesión activa';

  const handleSelectTab = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 select-none shadow-xl md:shadow-none',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div>
          <div className="h-18 flex items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <TrendingUp className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                  Finanza<span className="text-emerald-500 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 font-semibold border border-emerald-500/20">v2.0</span>
                </span>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Gestión Inteligente</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              Menú Principal
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer',
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('w-4 h-4', isActive ? 'text-emerald-400' : 'text-zinc-400 dark:text-zinc-500')} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Theme Toggle */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            Tema {theme === 'dark' ? 'Oscuro' : 'Claro'}
          </span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Cambiar</span>
        </button>

        {/* User Card */}
        {user ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                {userInitial}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight truncate max-w-[110px]">{userName}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[110px]">{userEmail}</p>
              </div>
            </div>
            <button 
              onClick={() => signOut()}
              title="Cerrar Sesión" 
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>
    </aside>
    </>
  );
};
