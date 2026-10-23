import type { Cuenta, MetaAhorro, Movimiento, TipoMoneda } from '../types';

export type MonthlyPlan = {
  estimatedIncome: number;
  recordedIncome: number;
  projectedIncome: number;
  paidExpenses: number;
  pendingExpenses: number;
  fnaContribution: number;
  universityContribution: number;
  variableMoney: number;
};

export const normalizeFinanceText = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function getMonthMovements(movements: Movimiento[], month: number, year: number, currency: TipoMoneda) {
  return movements.filter((movement) => {
    const [movementYear, movementMonth] = movement.fecha.split('-').map(Number);
    return movementYear === year && movementMonth === month && movement.moneda === currency && movement.tipo !== 'transferencia';
  });
}

export function calculateMonthlyPlan(
  accounts: Cuenta[],
  goals: MetaAhorro[],
  movements: Movimiento[],
  month: number,
  year: number,
  currency: TipoMoneda,
): MonthlyPlan {
  const items = getMonthMovements(movements, month, year, currency);
  const estimatedIncome = accounts
    .filter((account) => account.moneda === currency && account.tipo === 'banco')
    .reduce((sum, account) => sum + (account.ingreso_mensual_estimado || 0), 0);
  const recordedIncome = items
    .filter((movement) => movement.tipo === 'ingreso' && !/desembolso|prestamo|credito|avance/.test(normalizeFinanceText(movement.descripcion)))
    .reduce((sum, movement) => sum + movement.monto, 0);
  const paidExpenses = items
    .filter((movement) => movement.tipo === 'gasto' && movement.estado === 'completado')
    .reduce((sum, movement) => sum + movement.monto, 0);
  const pendingExpenses = items
    .filter((movement) => movement.tipo === 'gasto' && movement.estado === 'pendiente')
    .reduce((sum, movement) => sum + movement.monto, 0);

  const fnaAccounts = accounts.filter((account) => account.tipo === 'ahorro'
    && /fna|fondo nacional del ahorro/.test(normalizeFinanceText(account.nombre))
    && account.moneda === currency
    && (account.aporte_mensual || 0) > 0);
  const fnaContribution = fnaAccounts.reduce((sum, account) => {
    const contributionAlreadyPlannedAsExpense = items.some((movement) => {
      const mentionsAccount = movement.cuenta_id === account.id
        || /fna|fondo nacional del ahorro/.test(normalizeFinanceText(movement.descripcion));
      return mentionsAccount && movement.tipo === 'gasto' && movement.monto >= (account.aporte_mensual || 0) * 0.9;
    });
    return sum + (contributionAlreadyPlannedAsExpense ? 0 : account.aporte_mensual || 0);
  }, 0);

  const universityContribution = goals
    .filter((goal) => goal.moneda === currency && /universidad|semestre/i.test(goal.nombre))
    .reduce((sum, goal) => sum + Math.max(goal.monto_objetivo - goal.monto_actual, 0) / 6, 0);
  const projectedIncome = Math.max(estimatedIncome, recordedIncome);
  const variableMoney = projectedIncome - paidExpenses - pendingExpenses - fnaContribution - universityContribution;

  return { estimatedIncome, recordedIncome, projectedIncome, paidExpenses, pendingExpenses, fnaContribution, universityContribution, variableMoney };
}
