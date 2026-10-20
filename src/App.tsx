import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { KpiCards } from './components/dashboard/KpiCards';
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
  const { cargarDatos } = useFinanceStore();
  const { activeTab } = useAppStore();
  const { initAuth, user } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos, user]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased transition-colors">
      {/* Sleek Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 md:space-y-7">
          {activeTab === 'dashboard' && (
            <>
              {/* Top KPI Metric Cards */}
              <section>
                <KpiCards />
              </section>

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

      {/* Modal for adding new transactions */}
      <TransactionModal />

      {/* Modal for authentication */}
      <AuthModal />
    </div>
  );
}

export default App;
