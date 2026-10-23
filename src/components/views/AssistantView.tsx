import React, { useMemo, useState } from 'react';
import { Bot, LockKeyhole, Send, Sparkles, Wallet, CreditCard, GraduationCap, Lightbulb } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency, MESES } from '../../lib/utils';
import { calculateMonthlyPlan, getMonthMovements, normalizeFinanceText } from '../../lib/financialPlan';
import type { MonthlyPlan } from '../../lib/financialPlan';
import type { Cuenta, MetaAhorro, Movimiento, TipoMoneda } from '../../types';

type Message = { id: number; role: 'assistant' | 'user'; text: string };

function answerQuestion(question: string, accounts: Cuenta[], goals: MetaAhorro[], movements: Movimiento[], month: number, year: number, currency: TipoMoneda, plan: MonthlyPlan) {
  const q = normalizeFinanceText(question);
  const monthMovements = getMonthMovements(movements, month, year, currency);
  const income = monthMovements.filter((movement) => movement.tipo === 'ingreso' && movement.estado === 'completado').reduce((sum, movement) => sum + movement.monto, 0);
  const paid = monthMovements.filter((movement) => movement.tipo === 'gasto' && movement.estado === 'completado').reduce((sum, movement) => sum + movement.monto, 0);
  const pending = monthMovements.filter((movement) => movement.tipo === 'gasto' && movement.estado === 'pendiente').reduce((sum, movement) => sum + movement.monto, 0);
  const periodName = `${MESES[month - 1]} ${year}`;

  if (/deuda|debo|credito|tarjeta|prestamo/.test(q)) {
    const debts = accounts.filter((account) => account.moneda === currency && account.saldo_actual < 0 && ['tarjeta_credito', 'credito_libre_inversion'].includes(account.tipo));
    const total = debts.reduce((sum, account) => sum + Math.abs(account.saldo_actual), 0);
    if (!debts.length) return `No encuentro deudas registradas en ${currency}. Revisa la moneda seleccionada y tus cuentas.`;
    const detail = debts.map((account) => `${account.nombre}: ${formatCurrency(Math.abs(account.saldo_actual), currency)}`).join('\n');
    return `Tus deudas registradas en ${currency} suman ${formatCurrency(total, currency)}:\n${detail}\n\nLa tarjeta puede cambiar con nuevos consumos e intereses. Confirma el valor del extracto y la fecha límite antes de planear el pago.`;
  }

  if (/universidad|semestre|meta|ahorr/.test(q)) {
    const matchingGoals = goals.filter((goal) => goal.moneda === currency && /universidad|semestre/i.test(goal.nombre));
    if (!matchingGoals.length) return `No veo una meta de universidad o semestre guardada en ${currency}. Puedes crearla en “Presupuestos & Metas”.`;
    return matchingGoals.map((goal) => {
      const remaining = Math.max(goal.monto_objetivo - goal.monto_actual, 0);
      const monthly = /universidad|semestre/i.test(goal.nombre) ? ` Si tienes seis meses para reunirlo, serían aproximadamente ${formatCurrency(remaining / 6, currency)} al mes.` : '';
      return `${goal.nombre}: faltan ${formatCurrency(remaining, currency)} de una meta de ${formatCurrency(goal.monto_objetivo, currency)}.${monthly}`;
    }).join('\n\n') + '\n\nEste cálculo usa la meta guardada; verifica que el plazo coincida con la fecha real de pago.';
  }

  if (/disponible|puedo gastar|me queda|saldo/.test(q)) {
    const liquid = accounts.filter((account) => account.moneda === currency && ['banco', 'efectivo', 'nequi_daviplata'].includes(account.tipo)).reduce((sum, account) => sum + Math.max(account.saldo_actual, 0), 0);
    const cardBalance = accounts.filter((account) => account.moneda === currency && account.tipo === 'tarjeta_credito' && account.saldo_actual < 0).reduce((sum, account) => sum + Math.abs(account.saldo_actual), 0);
    return `Para ${periodName}, mi proyección deja ${formatCurrency(plan.variableMoney, currency)} para gastos variables después de apartar compromisos y ahorros conocidos.\n\nIngreso mensual previsto: ${formatCurrency(plan.projectedIncome, currency)}; gastos ya pagados: ${formatCurrency(plan.paidExpenses, currency)}; gastos pendientes registrados: ${formatCurrency(plan.pendingExpenses, currency)}; aporte FNA: ${formatCurrency(plan.fnaContribution, currency)}; ahorro del semestre: ${formatCurrency(plan.universityContribution, currency)}.\n\nSaldo actual en cuentas líquidas: ${formatCurrency(liquid, currency)}. El saldo de tarjeta (${formatCurrency(cardBalance, currency)}) queda por fuera hasta confirmar el valor del extracto; por eso esta cifra todavía no es un monto seguro para gastar.`;
  }

  if (/resumen|como voy|mes|ingres|gasto/.test(q)) {
    const balance = income - paid;
    return `Resumen de ${periodName} (${currency}):\nIngresos completados: ${formatCurrency(income, currency)}\nGastos pagados: ${formatCurrency(paid, currency)}\nGastos pendientes registrados: ${formatCurrency(pending, currency)}\nBalance de movimientos completados: ${formatCurrency(balance, currency)}.\n\nEl balance no resta los pendientes. Revisa también los pagos que aún no hayas registrado.`;
  }

  if (/recomend|consejo|prioriz|que hago/.test(q)) {
    const universityGoal = goals.find((goal) => goal.moneda === currency && /universidad|semestre/i.test(goal.nombre));
    const remainingGoal = universityGoal ? Math.max(universityGoal.monto_objetivo - universityGoal.monto_actual, 0) : 0;
    const recommendations = [
      pending > 0 ? `Primero separa los ${formatCurrency(pending, currency)} de gastos pendientes que aparecen para ${periodName}.` : `Revisa que todos los próximos pagos de ${periodName} estén registrados antes de decidir cuánto gastar.`,
      universityGoal ? `Para la meta de semestre faltan ${formatCurrency(remainingGoal, currency)}. Si tienes seis meses, aparta cerca de ${formatCurrency(remainingGoal / 6, currency)} al mes.` : 'Define una meta para pagos grandes y divídela por los meses que faltan para la fecha de pago.',
      accounts.some((account) => account.moneda === currency && account.tipo === 'tarjeta_credito' && account.saldo_actual < 0) ? 'Confirma el valor y la fecha límite del extracto de la tarjeta; usa ese dato para planear el pago y evitar contar las compras dos veces.' : 'Mantén un pequeño margen para imprevistos y revisa los gastos variables al cierre del mes.',
    ];
    return `Con los datos registrados, te sugiero:\n${recommendations.map((recommendation, index) => `${index + 1}. ${recommendation}`).join('\n')}\n\nSon estimaciones basadas en lo que aparece en la app; pueden faltar pagos o cambios recientes.`;
  }

  return 'Puedo ayudarte a revisar tu disponible, resumir ingresos y gastos del mes, consultar deudas o calcular cuánto falta para una meta. Prueba una de las preguntas sugeridas.';
}

const suggestions = [
  { label: '¿Cuánto me queda para gastar?', icon: Wallet },
  { label: '¿Cómo voy con el semestre?', icon: GraduationCap },
  { label: '¿Cuánto debo?', icon: CreditCard },
  { label: 'Dame un resumen del mes', icon: Lightbulb },
];

export const AssistantView: React.FC = () => {
  const { cuentas, movimientos, metasAhorro } = useFinanceStore();
  const { selectedMonth, selectedYear, moneda } = useAppStore();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const plan = useMemo(
    () => calculateMonthlyPlan(cuentas, metasAhorro, movimientos, selectedMonth, selectedYear, moneda),
    [cuentas, metasAhorro, movimientos, selectedMonth, selectedYear, moneda],
  );

  const overview = useMemo(() => {
    const items = getMonthMovements(movimientos, selectedMonth, selectedYear, moneda);
    const income = items.filter((item) => item.tipo === 'ingreso' && item.estado === 'completado').reduce((sum, item) => sum + item.monto, 0);
    const expenses = items.filter((item) => item.tipo === 'gasto' && item.estado === 'completado').reduce((sum, item) => sum + item.monto, 0);
    const debt = cuentas.filter((account) => account.moneda === moneda && account.saldo_actual < 0 && ['tarjeta_credito', 'credito_libre_inversion'].includes(account.tipo)).reduce((sum, account) => sum + Math.abs(account.saldo_actual), 0);
    const remainingGoal = metasAhorro.filter((goal) => goal.moneda === moneda && /universidad|semestre/i.test(goal.nombre)).reduce((sum, goal) => sum + Math.max(goal.monto_objetivo - goal.monto_actual, 0), 0);
    return { income, expenses, debt, remainingGoal };
  }, [cuentas, movimientos, metasAhorro, moneda, selectedMonth, selectedYear]);

  const cardDebt = cuentas
    .filter((account) => account.moneda === moneda && account.tipo === 'tarjeta_credito' && account.saldo_actual < 0)
    .reduce((sum, account) => sum + Math.abs(account.saldo_actual), 0);

  const ask = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const response = answerQuestion(trimmed, cuentas, metasAhorro, movimientos, selectedMonth, selectedYear, moneda, plan);
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: trimmed }, { id: Date.now() + 1, role: 'assistant', text: response }]);
    setQuestion('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Bot className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Tu asistente privado</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Asistente financiero</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Revisa tus números y toma decisiones con más claridad.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <LockKeyhole className="h-3.5 w-3.5" />
          Cálculos dentro de la app; sin proveedor de IA externo
        </div>
      </header>

      <section aria-label={`Resumen de ${MESES[selectedMonth - 1]} ${selectedYear}`} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { title: 'Ingresos recibidos', value: overview.income, icon: Sparkles, tone: 'text-emerald-600 dark:text-emerald-400' },
          { title: 'Gastos pagados', value: overview.expenses, icon: Wallet, tone: 'text-rose-600 dark:text-rose-400' },
          { title: 'Deuda registrada', value: overview.debt, icon: CreditCard, tone: 'text-amber-600 dark:text-amber-400' },
          { title: 'Falta para universidad', value: overview.remainingGoal, icon: GraduationCap, tone: 'text-indigo-600 dark:text-indigo-400' },
        ].map(({ title, value, icon: Icon, tone }) => (
          <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
              <Icon className={`h-4 w-4 ${tone}`} />
            </div>
            <p className="mt-3 text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency(value, moneda)}</p>
            <p className="mt-1 text-[11px] text-zinc-400">{MESES[selectedMonth - 1]} {selectedYear} · {moneda}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900/50 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Plan mensual · {MESES[selectedMonth - 1]} {selectedYear}</p>
            <h2 className="mt-1 text-base font-bold text-zinc-900 dark:text-white">Disponible proyectado para gastos variables</h2>
          </div>
          <p className={`text-2xl font-extrabold tracking-tight ${plan.variableMoney < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {formatCurrency(plan.variableMoney, moneda)}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Ingreso previsto', value: plan.projectedIncome },
            { label: 'Gastos pagados', value: plan.paidExpenses },
            { label: 'Gastos pendientes', value: plan.pendingExpenses },
            { label: 'Aporte mensual FNA', value: plan.fnaContribution },
            { label: 'Ahorro estimado semestre', value: plan.universityContribution },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-800/70">
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
              <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(value, moneda)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-semibold">Pago de tarjeta no incluido: {formatCurrency(cardDebt, moneda)} de saldo actual.</p>
          <p>Confirma el valor del extracto antes de usar el disponible proyectado. Se muestra aparte para evitar contar las compras y el pago de la tarjeta dos veces.</p>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-zinc-400">El ingreso previsto toma el mayor valor entre tu estimado mensual y los ingresos registrados, sin sumar ambos. El ahorro del semestre asume seis meses; el cálculo solo incluye datos guardados y no contempla gastos que falten por registrar.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><Bot className="h-5 w-5" /></div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Hablemos de tus finanzas</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Respuestas basadas en tus movimientos y cuentas guardados.</p>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5" aria-live="polite">
          {messages.length === 0 ? (
            <div className="rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              Hola. Puedo resumir el mes, mostrar tus deudas y revisar el avance de tus metas. Solo recomiendo: no registro movimientos ni cambio tus datos.
            </div>
          ) : messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'}`}>
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {suggestions.map(({ label, icon: Icon }) => (
              <button key={label} type="button" onClick={() => ask(label)} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300">
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); ask(question); }} className="flex items-center gap-2">
            <label htmlFor="assistant-question" className="sr-only">Escribe tu pregunta financiera</label>
            <input id="assistant-question" maxLength={300} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta sobre tu disponible, deudas o metas…" className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
            <button type="submit" disabled={!question.trim()} aria-label="Enviar pregunta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-[11px] leading-5 text-zinc-400">Las respuestas reflejan solo datos registrados y no sustituyen la revisión de extractos o fechas de pago. Ninguna acción se ejecuta automáticamente.</p>
        </div>
      </section>
    </div>
  );
};
