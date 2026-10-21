import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { KpiCards } from './components/dashboard/KpiCards';
import { MonthlySummary } from './components/dashboard/MonthlySummary';
import { AccountsGrid } from './components/dashboard/AccountsGrid';
import { RecentTransactions } from './components/dashboard/RecentTransactions';
import { BudgetProgress } from './components/dashboard/BudgetProgress';
import { AccountsView } from './components/views/AccountsView';
import { MovementsView } from './components/views/MovementsView';
import { BudgetsView } from './components/views/BudgetsView';
import { SettingsView } from './components/views/SettingsView';
import { IncomeExpenseBarChart } from './components/charts/IncomeExpenseBarChart';
import { CategoryDonutChart } from './components/charts/CategoryDonutChart';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/auth/AuthModal';
import { useFinanceStore } from './store/useFinanceStore';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';

export function App() {
  const { cargarDatos, syncError, isLoading: isFinanceLoading } = useFinanceStore();
  const { activeTab, theme } = useAppStore();
  const { initAuth, user, isLoading: isAuthLoading, setAuthModalOpen } = useAuthStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthLoading) return;
    cargarDatos();
  }, [cargarDatos, user, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400" role="status" aria-live="polite">
        Verificando sesión…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-5 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl" aria-hidden="true">🔒</div>
          <h1 className="text-xl font-semibold">Tus finanzas están protegidas</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Inicia sesión para consultar tus cuentas y movimientos. Sin una sesión activa no se muestra información financiera.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            Iniciar sesión
          </button>
        </section>
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased transition-colors">
      {/* Sleek Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 md:space-y-7 pb-24 md:pb-8">
          {syncError && (
            <section role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <p>{syncError}</p>
              <button
                type="button"
                onClick={() => void cargarDatos()}
                disabled={isFinanceLoading}
                className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                {isFinanceLoading ? 'Sincronizando…' : 'Reintentar sincronización'}
              </button>
            </section>
          )}
          {activeTab === 'dashboard' && (
            <>
              {/* Top KPI Metric Cards */}
              <section>
                <KpiCards />
              </section>

              <MonthlySummary />

              {/* Wallets & Bank Accounts Carousel/Grid */}
              <section>
                <AccountsGrid />
              </section>

              {/* Interactive Financial Charts: Bar + Donut */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <IncomeExpenseBarChart />
                </div>
                <div>
                  <CategoryDonutChart />
                </div>
              </section>

              {/* Core Transactions and Budgets Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <RecentTransactions />
                </div>
                <div className="space-y-6">
                  <BudgetProgress />
                </div>
              </div>
            </>
          )}

          {activeTab === 'movimientos' && (
            <MovementsView />
          )}

          {activeTab === 'cuentas' && (
            <AccountsView />
          )}

          {activeTab === 'presupuestos' && (
            <BudgetsView />
          )}

          {activeTab === 'configuracion' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile only) */}
      <MobileBottomNav />

      {/* Modal for adding new transactions */}
      <TransactionModal />

      {/* Modal for authentication */}
      <AuthModal />
    </div>
  );
}

export default App;
