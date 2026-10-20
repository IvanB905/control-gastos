import { create } from 'zustand';
import type { TipoMoneda } from '../types';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  selectedMonth: number;
  selectedYear: number;
  setSelectedPeriod: (month: number, year: number) => void;
  moneda: TipoMoneda;
  setMoneda: (moneda: TipoMoneda) => void;
  isTransactionModalOpen: boolean;
  setTransactionModalOpen: (open: boolean) => void;
  activeTab: 'dashboard' | 'movimientos' | 'cuentas' | 'presupuestos' | 'configuracion';
  setActiveTab: (tab: 'dashboard' | 'movimientos' | 'cuentas' | 'presupuestos' | 'configuracion') => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const initialTheme = (localStorage.getItem('fintech_theme') as 'light' | 'dark') || 
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark');

if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const initialMoneda = (localStorage.getItem('fintech_moneda') as TipoMoneda) || 'COP';

export const useAppStore = create<AppState>((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    localStorage.setItem('fintech_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  setSelectedPeriod: (month, year) => set({ selectedMonth: month, selectedYear: year }),
  moneda: initialMoneda,
  setMoneda: (moneda) => {
    localStorage.setItem('fintech_moneda', moneda);
    set({ moneda });
  },
  isTransactionModalOpen: false,
  setTransactionModalOpen: (open) => set({ isTransactionModalOpen: open }),
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
