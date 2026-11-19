import type { Categoria, Cuenta, MetaAhorro, Movimiento, TipoMoneda } from '../types';

export type MonthlyPlan = {
  estimatedIncome: number;
  recordedIncome: number;
  supplementalIncome: number;
  projectedIncome: number;
  paidExpenses: number;
  pendingExpenses: number;
  plannedReserves: number;
  fnaContribution: number;
  universityContribution: number;
  variableMoney: number;
};

export const normalizeFinanceText = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function isPlannedSavingsReserve(movement: Movimiento, categories: Categoria[]) {
  if (movement.tipo !== 'gasto' || movement.estado !== 'pendiente') return false;
  const categoryName = categories.find((category) => category.id === movement.categoria_id)?.nombre || '';
  return /ahorro y reservas|imprevistos/.test(normalizeFinanceText(categoryName))
    || /imprevistos/.test(normalizeFinanceText(movement.descripcion));
}

export function getMonthMovements(movements: Movimiento[], month: number, year: number, currency: TipoMoneda) {
  return movements.filter((movement) => {
    const [movementYear, movementMonth] = movement.fecha.split('-').map(Number);
    return movementYear === year && movementMonth === month && movement.moneda === currency && movement.tipo !== 'transferencia';
  });
}

const CARD_PAYMENT_MARKER = '[calendario-pago-tarjeta]';
const USD_CARD_REMINDER_MARKER = '[recordatorio-pago-tarjeta-usd]';

export function calculateMonthlyPlan(
  accounts: Cuenta[],
  goals: MetaAhorro[],
  movements: Movimiento[],
  categories: Categoria[],
  month: number,
  year: number,
  currency: TipoMoneda,
): MonthlyPlan {
  const monthlyMovements = movements.filter((movement) => {
    const [movementYear, movementMonth] = movement.fecha.split('-').map(Number);
    return movementYear === year && movementMonth === month && movement.moneda === currency;
  });
  const items = monthlyMovements.filter((movement) => movement.tipo !== 'transferencia');
  const estimatedIncome = accounts
    .filter((account) => account.moneda === currency && account.tipo === 'banco')
    .reduce((sum, account) => sum + (account.ingreso_mensual_estimado || 0), 0);
  const payrollCategoryIds = new Set(categories
    .filter((category) => category.tipo === 'ingreso' && /nomina|salario/.test(normalizeFinanceText(category.nombre)))
    .map((category) => category.id));
  const eligibleIncomes = items
    .filter((movement) => movement.tipo === 'ingreso' && movement.estado === 'completado'
      && !/desembolso|prestamo|credito|avance/.test(normalizeFinanceText(movement.descripcion)));
  const recordedIncome = eligibleIncomes
    .reduce((sum, movement) => sum + movement.monto, 0);
  const supplementalIncome = eligibleIncomes
    .filter((movement) => !movement.categoria_id || !payrollCategoryIds.has(movement.categoria_id))
    .reduce((sum, movement) => sum + movement.monto, 0);
  const paidExpenses = items
    .filter((movement) => movement.tipo === 'gasto' && movement.estado === 'completado')
    .reduce((sum, movement) => sum + movement.monto, 0);
  const pendingExpenses = monthlyMovements
    .filter((movement) => movement.tipo === 'gasto' && movement.estado === 'pendiente' && !isPlannedSavingsReserve(movement, categories))
    .reduce((sum, movement) => sum + movement.monto, 0)
    + monthlyMovements
      .filter((movement) => movement.tipo === 'transferencia'
        && movement.estado === 'pendiente'
        && (movement.notas?.startsWith(CARD_PAYMENT_MARKER) || movement.notas?.startsWith(USD_CARD_REMINDER_MARKER)))
      .reduce((sum, movement) => sum + movement.monto, 0);
  const plannedReserves = monthlyMovements
    .filter((movement) => isPlannedSavingsReserve(movement, categories))
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
  const projectedIncome = estimatedIncome + supplementalIncome;
  const variableMoney = projectedIncome - paidExpenses - pendingExpenses - plannedReserves - fnaContribution - universityContribution;

  return { estimatedIncome, recordedIncome, supplementalIncome, projectedIncome, paidExpenses, pendingExpenses, plannedReserves, fnaContribution, universityContribution, variableMoney };
}
