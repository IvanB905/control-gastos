import { create } from 'zustand';
import type { Cuenta, Categoria, Movimiento, Presupuesto, MetaAhorro, ResumenMensual, TipoMoneda } from '../types';
import { supabase } from '../lib/supabase';
import { countsTowardAvailableBalance } from '../lib/utils';
import { importMarker } from '../lib/bankCsv';

function movementBalanceDelta(movement: Movimiento) {
  if (movement.estado !== 'completado') return 0;
  if (movement.tipo === 'ingreso') return movement.monto;
  if (movement.tipo === 'gasto') return -movement.monto;
  if (movement.notas?.includes('[flujo:salida]')) return -movement.monto;
  if (movement.notas?.includes('[flujo:entrada]')) return movement.monto;
  return 0;
}

// Configuración inicial basada en las cuentas informadas por el usuario.
const DEFAULT_CUENTAS: Cuenta[] = [
  {
    id: 'c1',
    user_id: 'user1',
    nombre: 'Bancolombia Nómina',
    tipo: 'banco',
    saldo_inicial: 1931002.86,
    saldo_actual: 1931002.86,
    moneda: 'COP',
    color: '#004481',
    icono: 'Landmark',
    es_predeterminada: true,
    // Nómina + bono de transporte de $400.000 al mes. El bono semanal es el mismo ingreso.
    ingreso_mensual_estimado: 2269516,
    saldo_fecha: '2026-09-30',
  },
  {
    id: 'c2',
    user_id: 'user1',
    nombre: 'Nequi',
    tipo: 'nequi_daviplata',
    saldo_inicial: 0,
    saldo_actual: 0,
    moneda: 'COP',
    color: '#E11900',
    icono: 'Smartphone',
    es_predeterminada: false,
  },
  {
    id: 'c3',
    user_id: 'user1',
    nombre: 'Fondo Nacional del Ahorro',
    tipo: 'ahorro',
    saldo_inicial: 400000,
    saldo_actual: 400000,
    moneda: 'COP',
    color: '#F59E0B',
    icono: 'ShieldCheck',
    es_predeterminada: false,
    aporte_mensual: 200000,
    saldo_fecha: '2026-10-21',
  },
  {
    id: 'c4',
    user_id: 'user1',
    nombre: 'Mastercard Bancolombia',
    tipo: 'tarjeta_credito',
    saldo_inicial: -536271,
    saldo_actual: -536271,
    moneda: 'COP',
    color: '#8B5CF6',
    icono: 'CreditCard',
    es_predeterminada: false,
    limite_credito: 1500000,
    saldo_fecha: '2026-10-21',
  },
  {
    id: 'c5',
    user_id: 'user1',
    nombre: 'Crédito libre inversión Bancolombia',
    tipo: 'credito_libre_inversion',
    saldo_inicial: -12600000,
    saldo_actual: -12600000,
    moneda: 'COP',
    color: '#DC2626',
    icono: 'CreditCard',
    es_predeterminada: false,
    plazo_meses: 60,
    saldo_fecha: '2026-10-21',
  },
  {
    id: 'c6',
    user_id: 'user1',
    nombre: 'Mastercard Bancolombia USD',
    tipo: 'tarjeta_credito',
    saldo_inicial: -6,
    saldo_actual: -6,
    moneda: 'USD',
    color: '#6366F1',
    icono: 'CreditCard',
    es_predeterminada: false,
    saldo_fecha: '2026-09-30',
  },
];

const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: 'cat1', user_id: 'user1', nombre: 'Mercado & Supermercado', tipo: 'gasto', icono: 'Utensils', color: '#EF4444' },
  { id: 'cat2', user_id: 'user1', nombre: 'Transporte & Gasolina', tipo: 'gasto', icono: 'Car', color: '#F97316' },
  { id: 'cat3', user_id: 'user1', nombre: 'Servicios Públicos (Luz/Agua)', tipo: 'gasto', icono: 'Home', color: '#8B5CF6' },
  { id: 'cat4', user_id: 'user1', nombre: 'Ocio, Cine & Suscripciones', tipo: 'gasto', icono: 'Tv', color: '#EC4899' },
  { id: 'cat5', user_id: 'user1', nombre: 'Salud & Medicamentos', tipo: 'gasto', icono: 'HeartPulse', color: '#06B6D4' },
  { id: 'cat6', user_id: 'user1', nombre: 'Salario / Quincena', tipo: 'ingreso', icono: 'Briefcase', color: '#10B981' },
  { id: 'cat7', user_id: 'user1', nombre: 'Freelance / Honorarios', tipo: 'ingreso', icono: 'Laptop', color: '#3B82F6' },
  { id: 'cat8', user_id: 'user1', nombre: 'Rendimientos / Inversiones', tipo: 'ingreso', icono: 'TrendingUp', color: '#84CC16' },
];

const DEFAULT_MOVIMIENTOS: Movimiento[] = [];

const DEFAULT_PRESUPUESTOS: Presupuesto[] = [];

const DEFAULT_METAS_AHORRO: MetaAhorro[] = [];

interface FinanceState {
  cuentas: Cuenta[];
  categorias: Categoria[];
  movimientos: Movimiento[];
  presupuestos: Presupuesto[];
  metasAhorro: MetaAhorro[];
  isLoading: boolean;
  syncError: string | null;
  resumenCOP: ResumenMensual;
  resumenUSD: ResumenMensual;
  
  cargarDatos: () => Promise<void>;
  agregarMovimiento: (movimiento: Omit<Movimiento, 'id' | 'created_at'>) => Promise<void>;
  programarPagoTarjeta: (datos: { origenId: string; destinoId: string; monto: number; fecha: string; descripcion: string }) => Promise<void>;
  programarRecordatorioTarjetaUSD: (datos: { cuentaId: string; monto: number; fecha: string; descripcion: string }) => Promise<void>;
  actualizarFechaRecordatorioTarjetaUSD: (id: string, fecha: string) => Promise<void>;
  marcarPagoPendiente: (id: string) => Promise<void>;
  marcarRecordatorioTarjetaUSD: (id: string) => Promise<void>;
  registrarMovimientoNotificacion: (movimiento: Omit<Movimiento, 'id' | 'created_at'>, notificationId: string, transfer?: { flow: 'entrada' | 'salida'; counterpartId?: string }) => Promise<void>;
  importarMovimientos: (movimientos: Omit<Movimiento, 'id' | 'created_at'>[], opciones?: { actualizarSaldos?: boolean }) => Promise<void>;
  reconciliarPagosImportados: () => Promise<{ pagosConciliados: number; abonoTarjeta: number }>;
  reconciliarSaldosImportados: () => Promise<{ movimientosAplicados: number; cuentasActualizadas: number }>;
  editarMovimiento: (id: string, updated: Partial<Movimiento>) => Promise<void>;
  eliminarMovimiento: (id: string) => Promise<void>;
  agregarCuenta: (cuenta: Omit<Cuenta, 'id' | 'created_at' | 'saldo_actual'>) => Promise<void>;
  actualizarSaldoCuenta: (id: string, saldoActual: number, saldoFecha: string, ingresoMensualEstimado?: number) => Promise<void>;
  eliminarCuenta: (id: string) => Promise<void>;
  consolidarCuentas: (origenId: string, destinoId: string) => Promise<number>;
  realizarTransferencia: (origenId: string, destinoId: string, monto: number, descripcion: string, fecha: string) => Promise<void>;
  agregarPresupuesto: (presupuesto: Omit<Presupuesto, 'id'>) => Promise<void>;
  eliminarPresupuesto: (id: string) => Promise<void>;
  agregarMetaAhorro: (meta: Omit<MetaAhorro, 'id'>) => Promise<void>;
  abonarAMetaAhorro: (id: string, monto: number) => Promise<void>;
  eliminarMetaAhorro: (id: string) => Promise<void>;
  agregarCategoria: (cat: Omit<Categoria, 'id'>) => Promise<void>;
  eliminarCategoria: (id: string) => Promise<void>;
  calcularResumenes: () => void;
  restablecerDatosDemo: () => void;
}

const LOCAL_STORAGE_KEY = 'fintech_data_v2';
const CARD_PAYMENT_MARKER = '[calendario-pago-tarjeta]';
const USD_CARD_REMINDER_MARKER = '[recordatorio-pago-tarjeta-usd]';
const reconciledImportMarker = (movementId: string) => `[conciliado-a-plan:${movementId}]`;
const reconciliationNote = (movementId: string) => `[conciliado-import:${movementId}]`;

function withoutTransferFlow(notes?: string | null) {
  return (notes || '').replace(/\[flujo:(?:entrada|salida)\]/g, '').trim();
}

function getScheduledTransferDestination(notas?: string) {
  return notas?.match(/\[destino:([^\]]+)\]/)?.[1] || null;
}

const loadSavedData = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

const rawSavedLocalData = loadSavedData();

// Actualiza el perfil inicial dentro de datos locales antiguos sin tocar
// movimientos, categorías, presupuestos ni metas del usuario.
const migrateSavedProfile = (saved: any) => {
  if (!saved || saved.perfilPersonalVersion >= 1 || !Array.isArray(saved.cuentas)) return saved;

  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const profileByName = new Map(DEFAULT_CUENTAS.map((cuenta) => [normalize(cuenta.nombre), cuenta]));
  const matchingAccounts = saved.cuentas.filter((cuenta: Cuenta) => profileByName.has(normalize(cuenta.nombre)));
  if (matchingAccounts.length === 0) return saved;

  const cuentasActualizadas = saved.cuentas.map((cuenta: Cuenta) => {
    const perfil = profileByName.get(normalize(cuenta.nombre));
    if (!perfil) return cuenta;
    // Conserva el ID para no romper movimientos asociados a la cuenta.
    return { ...cuenta, ...perfil, id: cuenta.id, user_id: cuenta.user_id || perfil.user_id };
  });
  const nombresExistentes = new Set(cuentasActualizadas.map((cuenta: Cuenta) => normalize(cuenta.nombre)));
  DEFAULT_CUENTAS.forEach((cuenta) => {
    if (!nombresExistentes.has(normalize(cuenta.nombre))) cuentasActualizadas.push(cuenta);
  });

  return { ...saved, cuentas: cuentasActualizadas, perfilPersonalVersion: 1 };
};

const savedLocalData = migrateSavedProfile(rawSavedLocalData);
if (savedLocalData && savedLocalData !== rawSavedLocalData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedLocalData));
  } catch (e) {}
}

const persistLocally = (state: FinanceState) => {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        cuentas: state.cuentas,
        categorias: state.categorias,
        movimientos: state.movimientos,
        presupuestos: state.presupuestos,
        metasAhorro: state.metasAhorro,
        perfilPersonalVersion: 1,
      })
    );
  } catch (e) {}
};

const normalizeSyncKey = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-CO');
const accountSyncKey = (account: Cuenta) => [normalizeSyncKey(account.nombre), account.tipo, account.moneda].join('|');

const movementSyncKey = (movement: Movimiento, accountIdentity?: string) => {
  const importId = movement.notas?.match(/\[import:([a-z0-9-]+)\]/i)?.[1];
  if (importId) return 'import:' + importId;
  return [
    accountIdentity || movement.cuenta_id,
    movement.fecha,
    movement.tipo,
    Number(movement.monto).toFixed(2),
    normalizeSyncKey(movement.descripcion),
    movement.moneda,
  ].join('|');
};

const dedupeImportedMovements = (movements: Movimiento[]) => {
  const seenMarkers = new Set<string>();
  return movements.filter((movement) => {
    const importId = movement.notas?.match(/\[import:([a-z0-9-]+)\]/i)?.[1];
    if (!importId) return true;
    if (seenMarkers.has(importId)) return false;
    seenMarkers.add(importId);
    return true;
  });
};

const insertRowsWithSchemaFallback = async (table: 'cuentas' | 'categorias' | 'movimientos' | 'presupuestos', rows: Record<string, unknown>[]) => {
  const payload = rows.map((row) => ({ ...row }));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await supabase.from(table).insert(payload).select();
    if (!result.error) return result;
    const missingColumn = result.error.code === 'PGRST204'
      ? result.error.message.match(/Could not find the '([^']+)' column/)?.[1]
      : undefined;
    if (!missingColumn || !payload.some((row) => missingColumn in row)) return result;
    payload.forEach((row) => { delete row[missingColumn]; });
  }
  throw new Error(`La tabla ${table} no acepta el formato de datos de esta app.`);
};

const updateRowWithSchemaFallback = async (table: 'cuentas', values: Record<string, unknown>, id: string, userId: string) => {
  const payload = { ...values };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await supabase.from(table).update(payload).eq('id', id).eq('user_id', userId);
    if (!result.error) return result;
    const missingColumn = result.error.code === 'PGRST204'
      ? result.error.message.match(/Could not find the '([^']+)' column/)?.[1]
      : undefined;
    if (!missingColumn || !(missingColumn in payload)) return result;
    delete payload[missingColumn];
  }
  throw new Error(`La tabla ${table} no acepta la actualización de saldo.`);
};

// Merges this browser's saved finance data into the authenticated user's cloud data.
// Natural keys make repeated sign-ins safe and preserve existing cloud records.
const performLocalDataSync = async (userId: string, local: Pick<FinanceState, 'cuentas' | 'categorias' | 'movimientos' | 'presupuestos'>) => {
  const accountResult = await supabase.from('cuentas').select('*').eq('user_id', userId);
  if (accountResult.error) throw accountResult.error;
  const cloudAccounts = (accountResult.data || []) as Cuenta[];
  const accountIds = new Map<string, string>();
  const localAccountByCloudId = new Map<string, Cuenta>();
  const accountKey = accountSyncKey;

  for (const localAccount of local.cuentas) {
    const key = accountKey(localAccount);
    let cloudAccount = cloudAccounts.find((account) => accountKey(account) === key);
    if (!cloudAccount) {
      const { id: _id, created_at: _createdAt, ...payload } = localAccount;
      const result = await insertRowsWithSchemaFallback('cuentas', [{ ...payload, user_id: userId }]);
      if (result.error || !result.data) throw result.error || new Error('No se pudo sincronizar una cuenta.');
      cloudAccount = (result.data[0]) as Cuenta;
      cloudAccounts.push(cloudAccount);
    } else if ((localAccount.saldo_fecha || '') > (cloudAccount.saldo_fecha || '')) {
      const result = await updateRowWithSchemaFallback('cuentas', { saldo_actual: localAccount.saldo_actual, saldo_fecha: localAccount.saldo_fecha }, cloudAccount.id, userId);
      if (result.error) throw result.error;
      cloudAccount = { ...cloudAccount, saldo_actual: localAccount.saldo_actual, saldo_fecha: localAccount.saldo_fecha };
      cloudAccounts[cloudAccounts.findIndex((account) => accountKey(account) === key)] = cloudAccount;
    }
    accountIds.set(localAccount.id, cloudAccount.id);
    localAccountByCloudId.set(cloudAccount.id, localAccount);
  }

  const categoryResult = await supabase.from('categorias').select('*').eq('user_id', userId);
  if (categoryResult.error) throw categoryResult.error;
  const cloudCategories = (categoryResult.data || []) as Categoria[];
  const categoryIds = new Map<string, string>();
  const categoryKey = (category: Categoria) => `${normalizeSyncKey(category.nombre)}|${category.tipo}`;

  for (const localCategory of local.categorias) {
    const key = categoryKey(localCategory);
    let cloudCategory = cloudCategories.find((category) => categoryKey(category) === key);
    if (!cloudCategory) {
      const { id: _id, created_at: _createdAt, ...payload } = localCategory;
      const result = await insertRowsWithSchemaFallback('categorias', [{ ...payload, user_id: userId }]);
      if (result.error || !result.data) throw result.error || new Error('No se pudo sincronizar una categoría.');
      cloudCategory = result.data[0] as Categoria;
      cloudCategories.push(cloudCategory);
    }
    categoryIds.set(localCategory.id, cloudCategory.id);
  }

  const movementResult = await supabase.from('movimientos').select('*').eq('user_id', userId);
  if (movementResult.error) throw movementResult.error;
  const accountCurrencyById = new Map(cloudAccounts.map((account) => [account.id, account.moneda]));
  const cloudMovements = ((movementResult.data || []) as Movimiento[]).map((movement) => ({
    ...movement,
    moneda: movement.moneda || accountCurrencyById.get(movement.cuenta_id) || 'COP',
  }));
  const cloudAccountIdentityById = new Map(cloudAccounts.map((account) => [account.id, accountKey(account)]));
  const dedupedCloudMovements = dedupeImportedMovements(cloudMovements);
  const knownMovementKeys = new Set(dedupedCloudMovements.map((movement) =>
    movementSyncKey(movement, cloudAccountIdentityById.get(movement.cuenta_id))
  ));
  const missingMovements = local.movimientos.flatMap((movement) => {
    const mappedAccount = accountIds.get(movement.cuenta_id);
    if (!mappedAccount) return [];
    const synced = {
      ...movement,
      user_id: userId,
      cuenta_id: mappedAccount,
      categoria_id: movement.categoria_id ? categoryIds.get(movement.categoria_id) || null : null,
    };
    const key = movementSyncKey(synced, cloudAccountIdentityById.get(mappedAccount));
    if (knownMovementKeys.has(key)) return [];
    knownMovementKeys.add(key);
    const { id: _id, created_at: _createdAt, cuenta: _account, categoria: _category, ...payload } = synced;
    return [payload];
  });
  if (missingMovements.length) {
    const result = await insertRowsWithSchemaFallback('movimientos', missingMovements);
    if (result.error) throw result.error;
    dedupedCloudMovements.push(...((result.data || []) as Movimiento[]).map((movement) => ({
      ...movement,
      moneda: movement.moneda || accountCurrencyById.get(movement.cuenta_id) || 'COP',
    })));
  }

  const budgetResult = await supabase.from('presupuestos').select('*').eq('user_id', userId);
  if (budgetResult.error) throw budgetResult.error;
  const cloudBudgets = (budgetResult.data || []) as Presupuesto[];
  const budgetKey = (budget: Presupuesto) => [budget.categoria_id, budget.monto_limite, budget.moneda, budget.mes, budget.anio].join('|');
  const knownBudgetKeys = new Set(cloudBudgets.map(budgetKey));
  const missingBudgets = local.presupuestos.flatMap((budget) => {
    const mappedCategory = categoryIds.get(budget.categoria_id);
    if (!mappedCategory) return [];
    const synced = { ...budget, user_id: userId, categoria_id: mappedCategory };
    if (knownBudgetKeys.has(budgetKey(synced))) return [];
    knownBudgetKeys.add(budgetKey(synced));
    const { id: _id, categoria: _category, gasto_actual: _spent, ...payload } = synced;
    return [payload];
  });
  if (missingBudgets.length) {
    const result = await insertRowsWithSchemaFallback('presupuestos', missingBudgets);
    if (result.error) throw result.error;
    cloudBudgets.push(...((result.data || []) as Presupuesto[]));
  }

  // The database movement trigger recalculates balances while inserting history.
  // Restore each account's chosen snapshot after the historical rows are merged.
  for (const accountId of accountIds.values()) {
    const target = cloudAccounts.find((account) => account.id === accountId);
    if (!target) continue;
    const result = await updateRowWithSchemaFallback('cuentas', { saldo_actual: target.saldo_actual, saldo_fecha: target.saldo_fecha || null }, accountId, userId);
    if (result.error) throw result.error;
  }

  const accountsForState = cloudAccounts.map((account) => {
    const localAccount = localAccountByCloudId.get(account.id);
    return localAccount ? {
      ...account,
      ingreso_mensual_estimado: account.ingreso_mensual_estimado ?? localAccount.ingreso_mensual_estimado,
      aporte_mensual: account.aporte_mensual ?? localAccount.aporte_mensual,
      plazo_meses: account.plazo_meses ?? localAccount.plazo_meses,
      limite_credito: account.limite_credito ?? localAccount.limite_credito,
      saldo_fecha: account.saldo_fecha ?? localAccount.saldo_fecha,
    } : account;
  });
  const localBudgetByCloudKey = new Map(local.presupuestos.map((budget) => {
    const mappedCategory = categoryIds.get(budget.categoria_id) || budget.categoria_id;
    return [[mappedCategory, budget.mes, budget.anio].join('|'), budget];
  }));
  const budgetsForState = cloudBudgets.map((budget) => {
    const localBudget = localBudgetByCloudKey.get([budget.categoria_id, budget.mes, budget.anio].join('|'));
    return { ...budget, moneda: budget.moneda || localBudget?.moneda || 'COP' };
  });
  return { cuentas: accountsForState, categorias: cloudCategories, movimientos: dedupedCloudMovements, presupuestos: budgetsForState };
};

const localSyncsInFlight = new Map<string, ReturnType<typeof performLocalDataSync>>();
const syncLocalDataToCloud = (userId: string, local: Pick<FinanceState, 'cuentas' | 'categorias' | 'movimientos' | 'presupuestos'>) => {
  const ongoing = localSyncsInFlight.get(userId);
  if (ongoing) return ongoing;
  const sync = performLocalDataSync(userId, local);
  localSyncsInFlight.set(userId, sync);
  void sync.finally(() => localSyncsInFlight.delete(userId));
  return sync;
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  cuentas: savedLocalData?.cuentas || DEFAULT_CUENTAS,
  categorias: savedLocalData?.categorias || DEFAULT_CATEGORIAS,
  movimientos: savedLocalData?.movimientos || DEFAULT_MOVIMIENTOS,
  presupuestos: savedLocalData?.presupuestos || DEFAULT_PRESUPUESTOS,
  metasAhorro: savedLocalData?.metasAhorro || DEFAULT_METAS_AHORRO,
  isLoading: false,
  syncError: null,
  resumenCOP: {
    total_ingresos: 0,
    total_gastos: 0,
    balance: 0,
    gastos_pendientes: 0,
  },
  resumenUSD: {
    total_ingresos: 0,
    total_gastos: 0,
    balance: 0,
    gastos_pendientes: 0,
  },

  calcularResumenes: () => {
    const { movimientos, presupuestos } = get();
    
    let cop_ingresos = 0;
    let cop_gastos = 0;
    let cop_pendientes = 0;

    let usd_ingresos = 0;
    let usd_gastos = 0;
    let usd_pendientes = 0;

    movimientos.forEach((m) => {
      if (m.tipo === 'transferencia') return;

      const isCOP = m.moneda === 'COP';

      if (m.estado === 'completado') {
        if (m.tipo === 'ingreso') {
          if (isCOP) cop_ingresos += m.monto;
          else usd_ingresos += m.monto;
        }
        if (m.tipo === 'gasto') {
          if (isCOP) {
            cop_gastos += m.monto;
          } else {
            usd_gastos += m.monto;
          }
        }
      } else if (m.estado === 'pendiente' && m.tipo === 'gasto') {
        if (isCOP) cop_pendientes += m.monto;
        else usd_pendientes += m.monto;
      }
    });

    // Cada presupuesto suma solo los gastos del mes y año que le corresponden.
    const presupuestosActualizados = presupuestos.map((p) => {
      const gasto = movimientos.reduce((total, movimiento) => {
        const [year, month] = movimiento.fecha.split('-').map(Number);
        if (
          movimiento.tipo === 'gasto'
          && movimiento.estado === 'completado'
          && movimiento.categoria_id === p.categoria_id
          && movimiento.moneda === p.moneda
          && month === p.mes
          && year === p.anio
        ) return total + movimiento.monto;
        return total;
      }, 0);
      return { ...p, gasto_actual: gasto };
    });

    set({
      presupuestos: presupuestosActualizados,
      resumenCOP: {
        total_ingresos: cop_ingresos,
        total_gastos: cop_gastos,
        balance: cop_ingresos - cop_gastos,
        gastos_pendientes: cop_pendientes,
      },
      resumenUSD: {
        total_ingresos: usd_ingresos,
        total_gastos: usd_gastos,
        balance: usd_ingresos - usd_gastos,
        gastos_pendientes: usd_pendientes,
      },
    });
  },

  cargarDatos: async () => {
    set({ isLoading: true, syncError: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ cuentas: [], categorias: [], movimientos: [], presupuestos: [], metasAhorro: [] });
        get().calcularResumenes();
        set({ isLoading: false });
        return;
      }

      const userId = session.user.id;

      const localSnapshot = loadSavedData();
      const localDataNeedsSync = Boolean(localSnapshot && (
        (Array.isArray(localSnapshot.movimientos) && localSnapshot.movimientos.length > 0)
        || (Array.isArray(localSnapshot.presupuestos) && localSnapshot.presupuestos.length > 0)
        || (Array.isArray(localSnapshot.cuentas) && localSnapshot.cuentas.some((localAccount: Cuenta) =>
          !DEFAULT_CUENTAS.some((defaultAccount) => normalizeSyncKey(defaultAccount.nombre) === normalizeSyncKey(localAccount.nombre)
            && defaultAccount.moneda === localAccount.moneda)))
        || (Array.isArray(localSnapshot.categorias) && localSnapshot.categorias.some((localCategory: Categoria) =>
          !DEFAULT_CATEGORIAS.some((defaultCategory) => normalizeSyncKey(defaultCategory.nombre) === normalizeSyncKey(localCategory.nombre)
            && defaultCategory.tipo === localCategory.tipo)))
      ));

      if (localDataNeedsSync) {
        // Only migrate browser-only data into a brand-new cloud profile. Re-running
        // this merge on every load can restore cloud rows the user already deleted.
        const [cloudAccounts, cloudCategories, cloudMovements, cloudBudgets] = await Promise.all([
          supabase.from('cuentas').select('id').eq('user_id', userId).limit(1),
          supabase.from('categorias').select('id').eq('user_id', userId).limit(1),
          supabase.from('movimientos').select('id').eq('user_id', userId).limit(1),
          supabase.from('presupuestos').select('id').eq('user_id', userId).limit(1),
        ]);
        const migrationCheckError = [cloudAccounts.error, cloudCategories.error, cloudMovements.error, cloudBudgets.error].find(Boolean);
        if (migrationCheckError) throw migrationCheckError;
        const cloudProfileHasData = [cloudAccounts.data, cloudCategories.data, cloudMovements.data, cloudBudgets.data]
          .some((rows) => (rows?.length || 0) > 0);

        if (!cloudProfileHasData) {
          const local = get();
          const synced = await syncLocalDataToCloud(userId, {
            cuentas: local.cuentas,
            categorias: local.categorias,
            movimientos: local.movimientos,
            presupuestos: local.presupuestos,
          });
          set({ ...synced, syncError: null });
          get().calcularResumenes();
          persistLocally(get());
          set({ isLoading: false });
          return;
        }
      }

      const [resCuentas, resCategorias, resMovimientos, resPresupuestos] = await Promise.all([
        supabase.from('cuentas').select('*').eq('user_id', userId),
        supabase.from('categorias').select('*').eq('user_id', userId),
        supabase.from('movimientos').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
        supabase.from('presupuestos').select('*').eq('user_id', userId),
      ]);

      const queryError = [resCuentas.error, resCategorias.error, resMovimientos.error, resPresupuestos.error].find(Boolean);
      if (queryError) throw queryError;
      set({
        cuentas: resCuentas.data || [],
        categorias: resCategorias.data || [],
        movimientos: dedupeImportedMovements((resMovimientos.data || []) as Movimiento[]),
        presupuestos: resPresupuestos.data || [],
        syncError: null,
      });

      get().calcularResumenes();
    } catch (error) {
      const detail = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error al cargar datos desde Supabase:', detail);
      set({ syncError: 'No se pudieron sincronizar tus datos con tu cuenta. Revisa la configuración de Supabase y vuelve a intentar.' });
    } finally {
      set({ isLoading: false });
    }
  },

  agregarMovimiento: async (nuevo) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para guardar el movimiento en tu cuenta.');
    const account = get().cuentas.find((item) => item.id === nuevo.cuenta_id);
    if (!account) throw new Error('Selecciona una cuenta válida.');
    if (account.moneda !== nuevo.moneda) throw new Error('La moneda del movimiento no coincide con la cuenta.');
    if (!Number.isFinite(nuevo.monto) || nuevo.monto <= 0) throw new Error('El monto debe ser mayor que cero.');

    const { data, error } = await supabase.from('movimientos')
      .insert([{ ...nuevo, user_id: session.user.id }])
      .select('*')
      .single();
    if (error || !data) {
      console.error('No se pudo guardar el movimiento en Supabase:', error?.message || 'sin fila devuelta');
      throw new Error('No se guardó el movimiento en la nube. Revisa tu conexión e inténtalo de nuevo.');
    }

    const movimientoCreado = data as Movimiento;
    const { data: refreshedAccount, error: balanceError } = await supabase.from('cuentas')
      .select('*')
      .eq('id', nuevo.cuenta_id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    set((state) => ({
      movimientos: [movimientoCreado, ...state.movimientos],
      cuentas: state.cuentas.map((item) => item.id === nuevo.cuenta_id && refreshedAccount ? refreshedAccount as Cuenta : item),
      syncError: balanceError || !refreshedAccount
        ? 'El movimiento se guardó, pero no se pudo actualizar el saldo visible. Recarga los datos.'
        : null,
    }));
    get().calcularResumenes();
    persistLocally(get());
  },

  programarPagoTarjeta: async ({ origenId, destinoId, monto, fecha, descripcion }) => {
    const { cuentas, movimientos } = get();
    const origen = cuentas.find((cuenta) => cuenta.id === origenId);
    const destino = cuentas.find((cuenta) => cuenta.id === destinoId);
    if (!origen || !destino || origen.id === destino.id) throw new Error('Selecciona una cuenta bancaria y una tarjeta diferentes.');
    if (origen.moneda !== destino.moneda || origen.moneda !== 'COP') throw new Error('El pago programado debe usar la misma moneda de la cuenta bancaria y la tarjeta.');
    if (origen.tipo === 'tarjeta_credito' || destino.tipo !== 'tarjeta_credito') throw new Error('Selecciona una cuenta de origen y una tarjeta de crédito como destino.');
    if (!countsTowardAvailableBalance(origen)) throw new Error('El Fondo Nacional del Ahorro no puede usarse como cuenta de origen para este pago.');
    if (!Number.isFinite(monto) || monto <= 0) throw new Error('Ingresa un valor de extracto válido.');
    const yaExiste = movimientos.some((movimiento) =>
      movimiento.tipo === 'transferencia' &&
      (movimiento.notas?.startsWith(CARD_PAYMENT_MARKER) || movimiento.notas?.startsWith(USD_CARD_REMINDER_MARKER)) &&
      movimiento.notas.includes(`[destino:${destinoId}]`) &&
      movimiento.fecha.slice(0, 7) === fecha.slice(0, 7)
    );
    if (yaExiste) throw new Error('Ya existe un pago programado para esta tarjeta en este mes.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para programar el pago de la tarjeta.');

    const misplacedReminder = movimientos.find((movement) =>
      movement.estado === 'pendiente'
      && movement.tipo === 'gasto'
      && movement.descripcion.startsWith(`Pago mínimo tarjeta ${destino.nombre}`)
      && movement.monto === monto
      && movement.moneda === 'COP'
      && movement.fecha.slice(0, 7) === fecha.slice(0, 7)
    );
    const paymentFields = {
      cuenta_id: origenId,
      categoria_id: null,
      tipo: 'transferencia' as const,
      monto,
      moneda: origen.moneda,
      fecha,
      descripcion,
      estado: 'pendiente' as const,
      es_recurrente: false,
      notas: `${CARD_PAYMENT_MARKER}[destino:${destinoId}]`,
    };

    if (misplacedReminder) {
      const { data, error } = await supabase.from('movimientos')
        .update(paymentFields)
        .eq('id', misplacedReminder.id)
        .eq('user_id', session.user.id)
        .eq('estado', 'pendiente')
        .select('*')
        .single();
      if (error || !data) throw error || new Error('No se pudo corregir el recordatorio guardado.');
      set((state) => ({ movimientos: state.movimientos.map((item) => item.id === misplacedReminder.id ? data as Movimiento : item) }));
      persistLocally(get());
      get().calcularResumenes();
      return;
    }

    const nuevoPago = {
      user_id: session.user.id,
      ...paymentFields,
    };
    const { data, error } = await supabase.from('movimientos').insert([nuevoPago]).select('*').single();
    if (error || !data) throw error || new Error('No se pudo programar el pago de la tarjeta.');

    set((state) => ({ movimientos: [data as Movimiento, ...state.movimientos] }));
    persistLocally(get());
    get().calcularResumenes();
  },

  programarRecordatorioTarjetaUSD: async ({ cuentaId, monto, fecha, descripcion }) => {
    const { cuentas, movimientos } = get();
    const cuenta = cuentas.find((item) => item.id === cuentaId);
    if (!cuenta || cuenta.tipo !== 'tarjeta_credito' || cuenta.moneda !== 'USD') throw new Error('Selecciona la tarjeta de crédito en USD.');
    if (!Number.isFinite(monto) || monto <= 0) throw new Error('Ingresa un valor mínimo válido en USD.');
    const alreadyScheduled = movimientos.some((movement) =>
      movement.tipo === 'transferencia'
      && movement.notas?.startsWith(USD_CARD_REMINDER_MARKER)
      && movement.notas.includes(`[destino:${cuentaId}]`)
      && movement.fecha.slice(0, 7) === fecha.slice(0, 7)
    );
    if (alreadyScheduled) throw new Error('Ya existe un recordatorio para esta tarjeta en este mes.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para guardar el recordatorio.');
    const reminder = {
      user_id: session.user.id,
      cuenta_id: cuentaId,
      categoria_id: null,
      tipo: 'transferencia' as const,
      monto,
      moneda: 'USD' as const,
      fecha,
      descripcion,
      estado: 'pendiente' as const,
      es_recurrente: false,
      notas: `${USD_CARD_REMINDER_MARKER}[destino:${cuentaId}]`,
    };
    const { data, error } = await supabase.from('movimientos').insert([reminder]).select('*').single();
    if (error || !data) throw error || new Error('No se pudo guardar el recordatorio.');
    set((state) => ({ movimientos: [data as Movimiento, ...state.movimientos] }));
    persistLocally(get());
    get().calcularResumenes();
  },

  actualizarFechaRecordatorioTarjetaUSD: async (id, fecha) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para actualizar el recordatorio.');
    const movement = get().movimientos.find((item) => item.id === id);
    if (!movement || movement.estado !== 'pendiente' || !movement.notas?.startsWith(USD_CARD_REMINDER_MARKER)) {
      throw new Error('No se encontró un recordatorio USD pendiente para editar.');
    }
    const { data, error } = await supabase.from('movimientos')
      .update({ fecha })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('estado', 'pendiente')
      .select('*')
      .single();
    if (error || !data) throw error || new Error('No se pudo actualizar la fecha del recordatorio.');
    set((state) => ({ movimientos: state.movimientos.map((item) => item.id === id ? data as Movimiento : item) }));
    persistLocally(get());
    get().calcularResumenes();
  },

  marcarPagoPendiente: async (id) => {
    const { movimientos, cuentas } = get();
    const movimiento = movimientos.find((item) => item.id === id);
    if (!movimiento || movimiento.estado !== 'pendiente') throw new Error('Este pago ya no está pendiente. Actualiza la vista y vuelve a revisar.');

    const origen = cuentas.find((cuenta) => cuenta.id === movimiento.cuenta_id);
    if (!origen) throw new Error('No se encontró la cuenta asociada al pago.');

    const deltas = new Map<string, number>();
    if (movimiento.tipo === 'gasto') {
      deltas.set(origen.id, -movimiento.monto);
    } else if (movimiento.tipo === 'ingreso') {
      deltas.set(origen.id, movimiento.monto);
    } else {
      if (!movimiento.notas?.startsWith(CARD_PAYMENT_MARKER)) throw new Error('Este movimiento no es un pago de tarjeta programado desde el calendario.');
      const destinoId = getScheduledTransferDestination(movimiento.notas);
      const destino = destinoId ? cuentas.find((cuenta) => cuenta.id === destinoId) : undefined;
      if (!destino || destino.moneda !== origen.moneda) throw new Error('No se encontró la tarjeta vinculada a esta programación.');
      deltas.set(origen.id, -movimiento.monto);
      deltas.set(destino.id, movimiento.monto);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para confirmar este pago.');

    const accountUpdates = [...deltas.entries()].map(([accountId, delta]) => {
      const account = cuentas.find((item) => item.id === accountId)!;
      return { account, balance: account.saldo_actual + delta };
    });
    const { data: updatedMovement, error: movementError } = await supabase
      .from('movimientos')
      .update({ estado: 'completado' })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('estado', 'pendiente')
      .select('id');
    if (movementError) throw movementError;
    if (!updatedMovement?.length) throw new Error('El pago cambió en otra sesión. Actualiza los datos e inténtalo de nuevo.');

    const updatedAccounts: typeof accountUpdates = [];
    try {
      for (const update of accountUpdates) {
        const { error } = await supabase
          .from('cuentas')
          .update({ saldo_actual: update.balance })
          .eq('id', update.account.id)
          .eq('user_id', session.user.id);
        if (error) throw error;
        updatedAccounts.push(update);
      }
    } catch (error) {
      await Promise.all([
        supabase.from('movimientos').update({ estado: 'pendiente' }).eq('id', id).eq('user_id', session.user.id),
        ...updatedAccounts.map(({ account }) => supabase.from('cuentas').update({ saldo_actual: account.saldo_actual }).eq('id', account.id).eq('user_id', session.user.id)),
      ]);
      throw error;
    }

    set((state) => ({
      movimientos: state.movimientos.map((item) => item.id === id ? { ...item, estado: 'completado' } : item),
      cuentas: state.cuentas.map((account) => {
        const update = accountUpdates.find((candidate) => candidate.account.id === account.id);
        return update ? { ...account, saldo_actual: update.balance } : account;
      }),
    }));
    persistLocally(get());
    get().calcularResumenes();
  },

  marcarRecordatorioTarjetaUSD: async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para actualizar el recordatorio.');
    const movement = get().movimientos.find((item) => item.id === id);
    if (!movement || movement.estado !== 'pendiente' || !movement.notas?.startsWith(USD_CARD_REMINDER_MARKER)) {
      throw new Error('Este recordatorio ya no está pendiente.');
    }
    const { data, error } = await supabase.from('movimientos')
      .update({ estado: 'completado' })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('estado', 'pendiente')
      .select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('El recordatorio cambió. Actualiza la vista e inténtalo de nuevo.');
    set((state) => ({ movimientos: state.movimientos.map((item) => item.id === id ? { ...item, estado: 'completado' } : item) }));
    persistLocally(get());
    get().calcularResumenes();
  },

  registrarMovimientoNotificacion: async (nuevo, notificationId, transfer) => {
    const { cuentas, categorias } = get();
    const cuenta = cuentas.find((item) => item.id === nuevo.cuenta_id);
    if (!cuenta || cuenta.moneda !== nuevo.moneda) throw new Error('La cuenta seleccionada no coincide con la moneda detectada.');
    if ((!countsTowardAvailableBalance(cuenta) && cuenta.tipo !== 'tarjeta_credito') || cuenta.tipo === 'credito_libre_inversion') throw new Error('Elige una cuenta transaccional; el FNA y los créditos no se usan como cuenta de movimientos.');
    if (nuevo.tipo === 'transferencia') {
      if (!transfer || !['entrada', 'salida'].includes(transfer.flow)) throw new Error('Indica si la transferencia entró o salió de la cuenta seleccionada.');
      if (transfer.counterpartId === nuevo.cuenta_id) throw new Error('La cuenta relacionada debe ser distinta de la cuenta del movimiento.');
      if (transfer.counterpartId) {
        const counterpart = cuentas.find((item) => item.id === transfer.counterpartId);
        if (!counterpart || counterpart.moneda !== nuevo.moneda || counterpart.tipo === 'credito_libre_inversion' || !countsTowardAvailableBalance(counterpart) && counterpart.tipo !== 'tarjeta_credito') throw new Error('Selecciona una cuenta relacionada válida y en la misma moneda.');
      }
    } else {
      if (nuevo.tipo !== 'ingreso' && nuevo.tipo !== 'gasto') throw new Error('El tipo de movimiento no es válido.');
      if (!categorias.some((category) => category.id === nuevo.categoria_id && category.tipo === nuevo.tipo)) throw new Error('Selecciona una categoría del mismo tipo del movimiento.');
    }
    const parsedDate = new Date(`${nuevo.fecha}T00:00:00.000Z`);
    if (!/^[0-9a-f-]{36}$/i.test(notificationId) || !Number.isFinite(nuevo.monto) || nuevo.monto <= 0 || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== nuevo.fecha || !nuevo.descripcion.trim() || nuevo.descripcion.length > 255) throw new Error('El identificador, monto, fecha o descripción del movimiento no son válidos.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para guardar el movimiento detectado en tu cuenta.');
    const { data, error } = await supabase.rpc('registrar_movimiento_notificacion', {
      p_notification_id: notificationId,
      p_cuenta_id: nuevo.cuenta_id,
      p_categoria_id: nuevo.categoria_id,
      p_tipo: nuevo.tipo,
      p_monto: nuevo.monto,
      p_moneda: nuevo.moneda,
      p_fecha: nuevo.fecha,
      p_descripcion: nuevo.descripcion,
      p_flujo: transfer?.flow ?? null,
      p_contraparte_id: transfer?.counterpartId || null,
    });
    if (error) throw error;
    const result = data as { movement?: Movimiento; account_balances?: Record<string, number>; applied?: boolean } | null;
    if (!result?.movement || !result.account_balances || !Object.keys(result.account_balances).length) throw new Error('Supabase no devolvió el movimiento registrado.');
    const savedMovement = result.movement;
    const serverBalances = result.account_balances;

    set((state) => ({
      movimientos: state.movimientos.some((item) => item.id === savedMovement.id)
        ? state.movimientos.map((item) => item.id === savedMovement.id ? savedMovement : item)
        : [savedMovement, ...state.movimientos],
      cuentas: state.cuentas.map((item) => Object.prototype.hasOwnProperty.call(serverBalances, item.id)
        ? { ...item, saldo_actual: Number(serverBalances[item.id]) }
        : item),
    }));
    persistLocally(get());
    get().calcularResumenes();
  },

  reconciliarSaldosImportados: async () => {
    const { cuentas, movimientos } = get();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para actualizar los saldos de tus cuentas.');

    const cuentasPorId = new Map(cuentas.map((cuenta) => [cuenta.id, cuenta]));
    const cambios = new Map<string, { delta: number; fecha: string; movimientos: number }>();
    movimientos.forEach((movimiento) => {
      const cuenta = cuentasPorId.get(movimiento.cuenta_id);
      if (!importMarker(movimiento.notas) || movimiento.estado !== 'completado' || !cuenta?.saldo_fecha || movimiento.fecha <= cuenta.saldo_fecha) return;
      const delta = movementBalanceDelta(movimiento);
      if (!delta) return;
      const actual = cambios.get(cuenta.id) || { delta: 0, fecha: cuenta.saldo_fecha, movimientos: 0 };
      actual.delta += delta;
      actual.fecha = movimiento.fecha > actual.fecha ? movimiento.fecha : actual.fecha;
      actual.movimientos += 1;
      cambios.set(cuenta.id, actual);
    });

    if (cambios.size === 0) return { movimientosAplicados: 0, cuentasActualizadas: 0 };
    const actualizaciones = [...cambios.entries()].map(([id, cambio]) => {
      const cuenta = cuentasPorId.get(id)!;
      return { cuenta, saldo_actual: cuenta.saldo_actual + cambio.delta, saldo_fecha: cambio.fecha, ...cambio };
    });
    const guardadas: typeof actualizaciones = [];
    try {
      for (const actualizacion of actualizaciones) {
        const { error } = await supabase.from('cuentas')
          .update({ saldo_actual: actualizacion.saldo_actual, saldo_fecha: actualizacion.saldo_fecha })
          .eq('id', actualizacion.cuenta.id)
          .eq('user_id', session.user.id);
        if (error) throw error;
        guardadas.push(actualizacion);
      }
    } catch (error) {
      await Promise.all(guardadas.map(({ cuenta }) => supabase.from('cuentas')
        .update({ saldo_actual: cuenta.saldo_actual, saldo_fecha: cuenta.saldo_fecha || null })
        .eq('id', cuenta.id).eq('user_id', session.user.id)));
      throw error;
    }

    const fechasPorCuenta = new Map(actualizaciones.map((item) => [item.cuenta.id, item]));
    set((state) => ({
      cuentas: state.cuentas.map((cuenta) => {
        const actualizacion = fechasPorCuenta.get(cuenta.id);
        return actualizacion
          ? { ...cuenta, saldo_actual: actualizacion.saldo_actual, saldo_fecha: actualizacion.saldo_fecha }
          : cuenta;
      }),
    }));
    get().calcularResumenes();
    persistLocally(get());
    return {
      movimientosAplicados: actualizaciones.reduce((total, item) => total + item.movimientos, 0),
      cuentasActualizadas: actualizaciones.length,
    };
  },

  importarMovimientos: async (nuevos, opciones) => {
    if (nuevos.length === 0) return;

    const actualizarSaldos = opciones?.actualizarSaldos ?? false;
    const fechaUltimaPorCuenta = new Map<string, string>();
    if (actualizarSaldos) {
      nuevos.forEach((movimiento) => {
        const cuenta = get().cuentas.find((item) => item.id === movimiento.cuenta_id);
        if (movimiento.estado !== 'completado' || (cuenta?.saldo_fecha && movimiento.fecha <= cuenta.saldo_fecha)) return;
        const fechaActual = fechaUltimaPorCuenta.get(movimiento.cuenta_id) || '';
        if (movimiento.fecha > fechaActual) fechaUltimaPorCuenta.set(movimiento.cuenta_id, movimiento.fecha);
      });
    }
    const { data: { session } } = await supabase.auth.getSession();
    let importados: Movimiento[];

    if (session) {
      const cuentaIds = [...new Set(nuevos.map((movimiento) => movimiento.cuenta_id))];
      const { data, error } = await supabase
        .from('movimientos')
        .insert(nuevos.map((movimiento) => ({ ...movimiento, user_id: session.user.id })))
        .select();

      if (error || !data) throw error || new Error('No se pudo guardar la importación.');
      importados = data as Movimiento[];

      if (actualizarSaldos) {
        for (const cuentaId of cuentaIds) {
          const { data: cuentaActual, error: readError } = await supabase
            .from('cuentas')
            .select('saldo_actual, saldo_fecha')
            .eq('id', cuentaId)
            .eq('user_id', session.user.id)
            .single();
          if (readError || !cuentaActual) throw readError || new Error('No se pudo actualizar el saldo de la cuenta.');
          const movimientosPosteriores = importados.filter((movimiento) => movimiento.cuenta_id === cuentaId
            && movimiento.estado === 'completado' && movimiento.fecha > (cuentaActual.saldo_fecha || ''));
          const delta = movimientosPosteriores.reduce((total, movimiento) => total + movementBalanceDelta(movimiento), 0);
          const fechaSaldo = movimientosPosteriores.reduce((latest, movimiento) => movimiento.fecha > latest ? movimiento.fecha : latest, cuentaActual.saldo_fecha || '');
          if (movimientosPosteriores.length === 0) continue;
          const { error: updateError } = await supabase
            .from('cuentas')
            .update({
              saldo_actual: Number(cuentaActual.saldo_actual) + delta,
              saldo_fecha: fechaSaldo || null,
            })
            .eq('id', cuentaId)
            .eq('user_id', session.user.id);
          if (updateError) throw updateError;
        }
      }
    } else {
      importados = nuevos.map((movimiento, index) => ({
        ...movimiento,
        id: `import_${Date.now()}_${index}`,
      }));
    }

    set((state) => ({
      movimientos: [...importados, ...state.movimientos],
      cuentas: state.cuentas.map((cuenta) => {
        if (!actualizarSaldos) return cuenta;
        const movimientosPosteriores = importados.filter((movimiento) => movimiento.cuenta_id === cuenta.id
          && movimiento.estado === 'completado' && movimiento.fecha > (cuenta.saldo_fecha || ''));
        const saldoDelta = movimientosPosteriores.reduce((delta, movimiento) => delta + movementBalanceDelta(movimiento), 0);
        const fechaImportada = fechaUltimaPorCuenta.get(cuenta.id);
        const saldoFecha = fechaImportada && fechaImportada > (cuenta.saldo_fecha || '')
          ? fechaImportada
          : cuenta.saldo_fecha;
        return movimientosPosteriores.length > 0
          ? { ...cuenta, saldo_actual: cuenta.saldo_actual + saldoDelta, saldo_fecha: saldoFecha }
          : cuenta;
      }),
    }));
    get().calcularResumenes();
    persistLocally(get());
  },

  reconciliarPagosImportados: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para conciliar los pagos importados.');

    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO');
    let pagosConciliados = 0;
    let abonoTarjeta = 0;

    // A completed loan payment replaces the matching planned expense. The
    // imported row is retained as an audit reference but becomes balance-neutral.
    const importedLoanPayments = get().movimientos.filter((movement) =>
      movement.estado === 'completado' && movement.tipo === 'gasto'
      && Boolean(importMarker(movement.notas))
      && !movement.notas?.includes('[conciliado-a-plan:')
      && normalize(movement.descripcion).includes('pago credito suc virtual')
    );
    for (const actual of importedLoanPayments) {
      const actualAccount = get().cuentas.find((account) => account.id === actual.cuenta_id);
      const month = actual.fecha.slice(0, 7);
      const plans = get().movimientos.filter((movement) =>
        movement.estado === 'pendiente' && movement.tipo === 'gasto'
        && movement.cuenta_id === actual.cuenta_id
        && movement.moneda === actual.moneda
        && movement.fecha.slice(0, 7) === month
        && Math.abs(movement.monto - actual.monto) <= 1
        && normalize(movement.descripcion).includes('cuota credito libre inversion')
      );
      if (!actualAccount || plans.length !== 1) continue;
      const plan = plans[0];
      const previousPlan = {
        monto: plan.monto,
        fecha: plan.fecha,
        descripcion: plan.descripcion,
        categoria_id: plan.categoria_id,
        notas: plan.notas,
        estado: plan.estado,
      };
      const planNotes = [plan.notas, reconciliationNote(actual.id)].filter(Boolean).join(' ');
      const { data: updatedPlan, error: planError } = await supabase.from('movimientos')
        .update({
          monto: actual.monto,
          fecha: actual.fecha,
          descripcion: `Pago crédito libre inversión · ${actual.descripcion}`,
          categoria_id: actual.categoria_id,
          notas: planNotes,
          estado: 'completado',
        })
        .eq('id', plan.id)
        .eq('user_id', session.user.id)
        .eq('estado', 'pendiente')
        .select('*')
        .maybeSingle();
      if (planError || !updatedPlan) {
        throw new Error('No se pudo actualizar la cuota del crédito; el movimiento importado no se modificó.');
      }

      const referenceNotes = [withoutTransferFlow(actual.notas), reconciledImportMarker(plan.id)].filter(Boolean).join(' ');
      const { data: updatedActual, error: actualError } = await supabase.from('movimientos')
        .update({ tipo: 'transferencia', categoria_id: null, notas: referenceNotes })
        .eq('id', actual.id)
        .eq('user_id', session.user.id)
        .eq('tipo', 'gasto')
        .select('*')
        .maybeSingle();
      if (actualError || !updatedActual) {
        const { data: rolledBackPlan, error: rollbackError } = await supabase.from('movimientos')
          .update(previousPlan)
          .eq('id', plan.id)
          .eq('user_id', session.user.id)
          .eq('estado', 'completado')
          .select('id');
        const rollbackFailed = Boolean(rollbackError) || !rolledBackPlan?.some((row) => row.id === plan.id);
        if (rollbackFailed) set({ syncError: 'La conciliación del crédito quedó incompleta. Recarga los datos y revisa ese pago.' });
        throw new Error(rollbackFailed
          ? 'No se pudo completar ni revertir la conciliación del crédito. Recarga los datos antes de continuar.'
          : 'No se pudo conciliar el pago del crédito; se revirtió el cambio del compromiso.');
      }
      set((state) => ({ movimientos: state.movimientos.map((movement) =>
        movement.id === plan.id ? updatedPlan as Movimiento
          : movement.id === actual.id ? updatedActual as Movimiento
            : movement
      ) }));
      pagosConciliados += 1;
    }

    // A card payment already reduced the bank balance when imported. Link that
    // same transfer to the card, complete the plan without a second bank debit,
    // and apply the credit to the liability only when it is newer than its snapshot.
    const importedCardPayments = get().movimientos.filter((movement) =>
      movement.estado === 'completado' && movement.tipo === 'transferencia'
      && Boolean(importMarker(movement.notas))
      && !movement.notas?.includes('[conciliado-a-plan:')
      && normalize(movement.descripcion).includes('pago suc virt tc master pesos')
      && movement.notas?.includes('[flujo:salida]')
    );
    for (const actual of importedCardPayments) {
      const month = actual.fecha.slice(0, 7);
      const plans = get().movimientos.filter((movement) =>
        movement.estado === 'pendiente' && movement.tipo === 'transferencia'
        && movement.notas?.startsWith(CARD_PAYMENT_MARKER)
        && movement.cuenta_id === actual.cuenta_id
        && movement.moneda === actual.moneda
        && movement.fecha.slice(0, 7) === month
        && movement.monto === actual.monto
      );
      if (plans.length !== 1) continue;
      const plan = plans[0];
      const cardId = getScheduledTransferDestination(plan.notas || undefined);
      const card = get().cuentas.find((account) => account.id === cardId);
      const source = get().cuentas.find((account) => account.id === actual.cuenta_id);
      if (!card || !source || card.tipo !== 'tarjeta_credito' || card.moneda !== actual.moneda) continue;

      const adjustCardBalance = !card.saldo_fecha || actual.fecha > card.saldo_fecha;
      const oldCardBalance = Number(card.saldo_actual);
      const newCardBalance = oldCardBalance + (adjustCardBalance ? actual.monto : 0);
      const newBalanceDate = adjustCardBalance ? actual.fecha : card.saldo_fecha;
      if (adjustCardBalance) {
        const { data, error } = await supabase.from('cuentas')
          .update({ saldo_actual: newCardBalance, saldo_fecha: newBalanceDate })
          .eq('id', card.id)
          .eq('user_id', session.user.id)
          .eq('saldo_actual', oldCardBalance)
          .select('id');
        if (error || !data?.some((row) => row.id === card.id)) {
          throw new Error('El saldo de la tarjeta cambió en otra sesión. Actualiza los datos y vuelve a conciliar.');
        }
      }

      const previousPlan = { monto: plan.monto, fecha: plan.fecha, descripcion: plan.descripcion, notas: plan.notas, estado: plan.estado };
      const planNotes = [plan.notas, '[flujo:salida]', reconciliationNote(actual.id)].filter(Boolean).join(' ');
      const { data: updatedPlan, error: planError } = await supabase.from('movimientos')
        .update({
          monto: actual.monto,
          fecha: actual.fecha,
          descripcion: `Pago tarjeta Mastercard · ${actual.descripcion}`,
          notas: planNotes,
          estado: 'completado',
        })
        .eq('id', plan.id)
        .eq('user_id', session.user.id)
        .eq('estado', 'pendiente')
        .select('*')
        .maybeSingle();
      if (planError || !updatedPlan) {
        let rollbackFailed = false;
        if (adjustCardBalance) {
          const { data, error } = await supabase.from('cuentas')
            .update({ saldo_actual: oldCardBalance, saldo_fecha: card.saldo_fecha || null })
            .eq('id', card.id)
            .eq('user_id', session.user.id)
            .eq('saldo_actual', newCardBalance)
            .eq('saldo_fecha', newBalanceDate)
            .select('id');
          rollbackFailed = Boolean(error) || !data?.some((row) => row.id === card.id);
        }
        if (rollbackFailed) set({ syncError: 'La conciliación de tarjeta quedó incompleta. Recarga los datos y revisa la deuda.' });
        throw new Error(rollbackFailed
          ? 'No se pudo completar ni revertir la conciliación de tarjeta. Recarga los datos antes de continuar.'
          : 'No se pudo completar el pago programado de tarjeta; el saldo se revirtió.');
      }

      const referenceNotes = [withoutTransferFlow(actual.notas), reconciledImportMarker(plan.id)].filter(Boolean).join(' ');
      const { data: updatedActual, error: actualError } = await supabase.from('movimientos')
        .update({ notas: referenceNotes })
        .eq('id', actual.id)
        .eq('user_id', session.user.id)
        .select('*')
        .maybeSingle();
      if (actualError || !updatedActual) {
        const { data: rolledBackPlan, error: rollbackPlanError } = await supabase.from('movimientos')
          .update(previousPlan)
          .eq('id', plan.id)
          .eq('user_id', session.user.id)
          .eq('estado', 'completado')
          .select('id');
        const planRollbackFailed = Boolean(rollbackPlanError) || !rolledBackPlan?.some((row) => row.id === plan.id);
        let rollbackBalanceError: unknown = null;
        if (adjustCardBalance) {
          const { data, error } = await supabase.from('cuentas')
            .update({ saldo_actual: oldCardBalance, saldo_fecha: card.saldo_fecha || null })
            .eq('id', card.id)
            .eq('user_id', session.user.id)
            .eq('saldo_actual', newCardBalance)
            .eq('saldo_fecha', newBalanceDate)
            .select('id');
          rollbackBalanceError = error || !data?.some((row) => row.id === card.id);
        }
        if (planRollbackFailed || rollbackBalanceError) set({ syncError: 'La conciliación de tarjeta quedó incompleta. Recarga los datos y revisa la deuda.' });
        throw new Error(planRollbackFailed || rollbackBalanceError
          ? 'No se pudo completar ni revertir la conciliación de tarjeta. Recarga los datos antes de continuar.'
          : 'No se pudo vincular el movimiento importado; se revirtió la conciliación.');
      }

      set((state) => ({
        movimientos: state.movimientos.map((movement) => movement.id === plan.id ? updatedPlan as Movimiento
          : movement.id === actual.id ? updatedActual as Movimiento : movement),
        cuentas: state.cuentas.map((account) => account.id === card.id && adjustCardBalance
          ? { ...account, saldo_actual: newCardBalance, saldo_fecha: newBalanceDate }
          : account),
      }));
      pagosConciliados += 1;
      if (adjustCardBalance) abonoTarjeta += actual.monto;
    }

    if (pagosConciliados) {
      set({ syncError: null });
      get().calcularResumenes();
      persistLocally(get());
    }
    return { pagosConciliados, abonoTarjeta };
  },

  editarMovimiento: async (id, updated) => {
    const previous = get().movimientos.find((item) => item.id === id);
    if (!previous) throw new Error('No se encontró el movimiento. Actualiza la lista e inténtalo de nuevo.');
    if (previous.tipo === 'transferencia') throw new Error('Las transferencias no se pueden editar desde este formulario.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para editar el movimiento en tu cuenta.');
    const nextAccountId = updated.cuenta_id || previous.cuenta_id;
    const nextAccount = get().cuentas.find((item) => item.id === nextAccountId);
    if (!nextAccount) throw new Error('Selecciona una cuenta válida.');
    if ((updated.moneda || previous.moneda) !== nextAccount.moneda) throw new Error('La moneda del movimiento no coincide con la cuenta.');
    if (updated.monto !== undefined && (!Number.isFinite(updated.monto) || updated.monto <= 0)) throw new Error('El monto debe ser mayor que cero.');

    const { data, error } = await supabase.from('movimientos')
      .update(updated)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('*')
      .single();
    if (error || !data) {
      console.error('No se pudo editar el movimiento en Supabase:', error?.message || 'sin fila devuelta');
      throw new Error('No se guardaron los cambios en la nube. Revisa tu conexión e inténtalo de nuevo.');
    }

    const updatedAccountIds = [...new Set([previous.cuenta_id, (data as Movimiento).cuenta_id])];
    const { data: refreshedAccounts, error: accountError } = await supabase.from('cuentas')
      .select('*')
      .eq('user_id', session.user.id)
      .in('id', updatedAccountIds);
    if (accountError || updatedAccountIds.some((accountId) => !refreshedAccounts?.some((item) => item.id === accountId))) {
      set((state) => ({
        movimientos: state.movimientos.map((item) => item.id === id ? data as Movimiento : item),
        syncError: 'El movimiento se guardó, pero no se pudo actualizar el saldo visible. Recarga los datos.',
      }));
      get().calcularResumenes();
      persistLocally(get());
      throw new Error('El movimiento sí se guardó, pero no se pudo actualizar el saldo visible. Recarga los datos.');
    }

    set((state) => ({
      movimientos: state.movimientos.map((item) => item.id === id ? data as Movimiento : item),
      cuentas: state.cuentas.map((account) => refreshedAccounts?.find((item) => item.id === account.id) || account),
      syncError: null,
    }));
    get().calcularResumenes();
    persistLocally(get());
  },

  eliminarMovimiento: async (id) => {
    const deletedMovement = get().movimientos.find((movement) => movement.id === id);
    if (!deletedMovement) return;
    if (deletedMovement.tipo === 'transferencia' && !deletedMovement.notification_id) {
      throw new Error('Esta transferencia manual no se puede eliminar todavía porque sus dos saldos deben revertirse juntos.');
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para eliminar movimientos sincronizados.');
    {
      const { data: deletedRows, error: deleteError } = await supabase.from('movimientos')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select('id');
      if (deleteError) throw deleteError;

      // Local migrations can assign a different id to an existing cloud row.
      // Match the exact transaction before considering the deletion complete.
      if (!deletedRows?.length) {
        const { data: matches, error: matchError } = await supabase.from('movimientos')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('cuenta_id', deletedMovement.cuenta_id)
          .eq('fecha', deletedMovement.fecha)
          .eq('tipo', deletedMovement.tipo)
          .eq('monto', deletedMovement.monto)
          .eq('moneda', deletedMovement.moneda)
          .eq('estado', deletedMovement.estado)
          .eq('descripcion', deletedMovement.descripcion)
          .limit(1);
        if (matchError) throw matchError;
        if (matches?.[0]) {
          const { data: fallbackDeleted, error: fallbackError } = await supabase.from('movimientos')
            .delete()
            .eq('id', matches[0].id)
            .eq('user_id', session.user.id)
            .select('id');
          if (fallbackError) throw fallbackError;
          if (!fallbackDeleted?.length) throw new Error('No se pudo confirmar la eliminación del movimiento en la nube.');
        } else throw new Error('No se encontró el movimiento en la nube; no se eliminó de la lista. Recarga los datos.');
      }
    }

    const relatedAccountId = deletedMovement.tipo === 'transferencia'
      ? deletedMovement.notas?.match(/\[(?:destino|origen):([0-9a-f-]{36})\]/i)?.[1]
      : undefined;
    const accountIds = [...new Set([deletedMovement.cuenta_id, relatedAccountId].filter((value): value is string => Boolean(value)))];
    const { data: refreshedAccounts, error: balanceError } = await supabase.from('cuentas')
      .select('*')
      .eq('user_id', session.user.id)
      .in('id', accountIds);
    set((state) => ({
      movimientos: state.movimientos.filter((m) => m.id !== id),
      cuentas: state.cuentas.map((account) => refreshedAccounts?.find((item) => item.id === account.id) as Cuenta || account),
      syncError: balanceError || accountIds.some((accountId) => !refreshedAccounts?.some((account) => account.id === accountId))
        ? 'El movimiento se eliminó, pero no se pudieron actualizar los saldos visibles. Recarga los datos.'
        : null,
    }));
    get().calcularResumenes();
    persistLocally(get());
  },

  agregarCuenta: async (cuenta) => {
    const id = `c_${Date.now()}`;
    const nuevaCuenta: Cuenta = {
      ...cuenta,
      id,
      saldo_actual: cuenta.saldo_inicial,
      es_predeterminada: false,
    };

    set((state) => ({
      cuentas: [...state.cuentas, nuevaCuenta],
    }));
    persistLocally(get());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase.from('cuentas').insert([{
          ...cuenta,
          saldo_actual: cuenta.saldo_inicial,
          user_id: session.user.id,
        }]);
        if (error) throw error;
      }
    } catch (e) {
      console.warn('Cuenta guardada localmente');
      set({ syncError: 'La cuenta quedó en este navegador, pero no se guardó en la nube. Usa Reintentar sincronización.' });
    }
  },

  actualizarSaldoCuenta: async (id, saldoActual, saldoFecha, ingresoMensualEstimado) => {
    const { data: { session } } = await supabase.auth.getSession();
    const updates = {
      saldo_actual: saldoActual,
      saldo_fecha: saldoFecha,
      ...(ingresoMensualEstimado === undefined ? {} : { ingreso_mensual_estimado: ingresoMensualEstimado }),
    };
    if (session) {
      const { error } = await supabase
        .from('cuentas')
        .update(updates)
        .eq('id', id)
        .eq('user_id', session.user.id);
      if (error) throw error;
    }

    set((state) => ({
      cuentas: state.cuentas.map((cuenta) => cuenta.id === id
        ? {
          ...cuenta,
          saldo_actual: saldoActual,
          saldo_fecha: saldoFecha,
          ...(ingresoMensualEstimado === undefined ? {} : { ingreso_mensual_estimado: ingresoMensualEstimado }),
        }
        : cuenta),
    }));
    persistLocally(get());
  },

  eliminarCuenta: async (id) => {
    const { cuentas, movimientos } = get();
    if (movimientos.some((movimiento) => movimiento.cuenta_id === id)) {
      throw new Error('Esta cuenta tiene movimientos. Consolídala con otra cuenta antes de eliminarla.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para eliminar una cuenta.');
    const { data: movimientosNube, error: lecturaError } = await supabase
      .from('movimientos')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('cuenta_id', id);
    if (lecturaError) throw lecturaError;
    if (movimientosNube?.length) {
      throw new Error('Esta cuenta aún tiene movimientos en la nube. Consolídala antes de eliminarla.');
    }

    const { error } = await supabase
      .from('cuentas')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);
    if (error) throw error;

    set((state) => ({ cuentas: state.cuentas.filter((cuenta) => cuenta.id !== id) }));
    persistLocally(get());
  },

  consolidarCuentas: async (origenId, destinoId) => {
    if (origenId === destinoId) throw new Error('Selecciona dos cuentas diferentes.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para consolidar tus cuentas.');

    const { cuentas } = get();
    const origen = cuentas.find((cuenta) => cuenta.id === origenId);
    const destino = cuentas.find((cuenta) => cuenta.id === destinoId);
    if (!origen || !destino || accountSyncKey(origen) !== accountSyncKey(destino)) {
      throw new Error('Solo se pueden consolidar cuentas duplicadas del mismo tipo y moneda.');
    }

    const userId = session.user.id;
    const { data: filasOrigen, error: lecturaError } = await supabase
      .from('movimientos')
      .select('id')
      .eq('user_id', userId)
      .eq('cuenta_id', origenId);
    if (lecturaError) throw lecturaError;

    const movimientosPorReasignar = filasOrigen || [];
    if (movimientosPorReasignar.length > 0) {
      const { data: reasignados, error: reasignacionError } = await supabase
        .from('movimientos')
        .update({ cuenta_id: destinoId })
        .eq('user_id', userId)
        .eq('cuenta_id', origenId)
        .select('id');
      if (reasignacionError) throw reasignacionError;
      if ((reasignados || []).length !== movimientosPorReasignar.length) {
        throw new Error('La cantidad de movimientos cambió durante la consolidación. No se eliminó la cuenta duplicada; vuelve a cargar y reintenta.');
      }
    }

    // El trigger de movimientos recalcula saldos durante la reasignación.
    // Conserva el saldo de referencia de la cuenta que se mantiene.
    const { error: saldoError } = await supabase
      .from('cuentas')
      .update({ saldo_actual: destino.saldo_actual, saldo_fecha: destino.saldo_fecha || null })
      .eq('id', destinoId)
      .eq('user_id', userId);
    if (saldoError) throw new Error(`Los movimientos se reasignaron, pero no se pudo conservar el saldo: ${saldoError.message}`);

    const { data: eliminadas, error: eliminacionError } = await supabase
      .from('cuentas')
      .delete()
      .eq('id', origenId)
      .eq('user_id', userId)
      .select('id');
    if (eliminacionError) throw new Error(`Los movimientos se conservaron en la cuenta principal, pero no se pudo quitar el duplicado: ${eliminacionError.message}`);
    if (!eliminadas?.some((cuenta) => cuenta.id === origenId)) {
      throw new Error('Los movimientos se conservaron, pero no se encontró el duplicado para eliminarlo. Recarga la vista.');
    }

    set((state) => ({
      cuentas: state.cuentas.filter((cuenta) => cuenta.id !== origenId),
      movimientos: dedupeImportedMovements(state.movimientos.map((movimiento) => (
        movimiento.cuenta_id === origenId ? { ...movimiento, cuenta_id: destinoId } : movimiento
      ))),
      syncError: null,
    }));
    get().calcularResumenes();
    persistLocally(get());
    return movimientosPorReasignar.length;
  },

  realizarTransferencia: async (origenId, destinoId, monto, descripcion, fecha) => {
    if (origenId === destinoId) throw new Error('Selecciona dos cuentas diferentes.');
    if (!Number.isFinite(monto) || monto <= 0) throw new Error('El monto debe ser mayor que cero.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(`${fecha}T00:00:00`).getTime())) throw new Error('Selecciona una fecha válida.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inicia sesión para transferir entre tus cuentas.');

    const { data: accounts, error: accountError } = await supabase.from('cuentas')
      .select('*')
      .eq('user_id', session.user.id)
      .in('id', [origenId, destinoId]);
    if (accountError) throw new Error('No se pudieron verificar las cuentas. Actualiza los datos e inténtalo de nuevo.');
    const origen = accounts?.find((account) => account.id === origenId) as Cuenta | undefined;
    const destino = accounts?.find((account) => account.id === destinoId) as Cuenta | undefined;
    if (!origen || !destino) throw new Error('No se encontraron las dos cuentas en tu perfil. Actualiza los datos e inténtalo de nuevo.');
    if (origen.moneda !== destino.moneda) throw new Error('Las cuentas deben usar la misma moneda para transferir.');
    if (!countsTowardAvailableBalance(origen)) throw new Error('El FNA y las cuentas de crédito no se pueden usar como origen de una transferencia.');
    if (Number(origen.saldo_actual) < monto) throw new Error('El saldo de origen no alcanza para esta transferencia.');

    const nombreMovimiento = descripcion.trim() || `Transferencia: ${origen.nombre} ➔ ${destino.nombre}`;
    const { data: movementData, error: movementError } = await supabase.from('movimientos')
      .insert([{
        user_id: session.user.id,
        cuenta_id: origenId,
        categoria_id: null,
        tipo: 'transferencia',
        monto,
        moneda: origen.moneda,
        fecha,
        descripcion: nombreMovimiento,
        estado: 'completado',
        es_recurrente: false,
        notas: `[flujo:salida][destino:${destinoId}]`,
      }])
      .select('*')
      .single();
    if (movementError || !movementData) {
      console.error('No se pudo registrar la transferencia en Supabase:', movementError?.message || 'sin fila devuelta');
      throw new Error('No se registró la transferencia en la nube. No se modificaron los saldos.');
    }

    const persistedMovement = movementData as Movimiento;
    const origenSaldoAnterior = Number(origen.saldo_actual);
    const destinoSaldoAnterior = Number(destino.saldo_actual);
    const aplicaOrigen = !origen.saldo_fecha || fecha > origen.saldo_fecha;
    const aplicaDestino = !destino.saldo_fecha || fecha > destino.saldo_fecha;
    const cambios = [
      ...(aplicaOrigen ? [{ cuenta: origen, anterior: origenSaldoAnterior, nuevo: origenSaldoAnterior - monto }] : []),
      ...(aplicaDestino ? [{ cuenta: destino, anterior: destinoSaldoAnterior, nuevo: destinoSaldoAnterior + monto }] : []),
    ];
    const aplicados: typeof cambios = [];

    try {
      for (const cambio of cambios) {
        const { data, error } = await supabase.from('cuentas')
          .update({ saldo_actual: cambio.nuevo })
          .eq('id', cambio.cuenta.id)
          .eq('user_id', session.user.id)
          .eq('saldo_actual', cambio.anterior)
          .select('id');
        if (error) throw error;
        if (!data?.some((row) => row.id === cambio.cuenta.id)) {
          throw new Error('El saldo cambió en otra sesión.');
        }
        aplicados.push(cambio);
      }
    } catch (error) {
      const rollbackOrder = [...aplicados].reverse();
      const rollbackResults = await Promise.all([
        ...rollbackOrder.map((cambio) => supabase.from('cuentas')
          .update({ saldo_actual: cambio.anterior })
          .eq('id', cambio.cuenta.id)
          .eq('user_id', session.user.id)
          .eq('saldo_actual', cambio.nuevo)
          .select('id')),
        supabase.from('movimientos').delete()
          .eq('id', persistedMovement.id)
          .eq('user_id', session.user.id)
          .select('id'),
      ]);
      const rollbackFailed = rollbackResults.some((result) => result.error)
        || rollbackResults.slice(0, rollbackOrder.length).some((result, index) => !result.data?.some((row) => row.id === rollbackOrder[index].cuenta.id))
        || !rollbackResults[rollbackResults.length - 1]?.data?.some((row) => row.id === persistedMovement.id);
      if (rollbackFailed) {
        set({ syncError: 'La transferencia necesita revisión: no se pudo confirmar que todas las partes volvieran a su estado anterior. Recarga las cuentas.' });
        throw new Error('La transferencia tuvo un fallo y la reversión no se pudo confirmar. Recarga las cuentas antes de volver a intentarlo.');
      }
      console.error('Se revirtió la transferencia incompleta:', error instanceof Error ? error.message : 'error de sincronización');
      throw new Error('No se completó la transferencia. La operación fue revertida; actualiza los saldos e inténtalo de nuevo.');
    }

    set((state) => ({
      cuentas: state.cuentas.map((account) => {
        const cambio = cambios.find((item) => item.cuenta.id === account.id);
        return cambio ? { ...account, saldo_actual: cambio.nuevo } : account;
      }),
      movimientos: [persistedMovement, ...state.movimientos],
      syncError: null,
    }));
    get().calcularResumenes();
    persistLocally(get());
  },

  agregarPresupuesto: async (p) => {
    const id = `p_${Date.now()}`;
    const nuevoPresupuesto: Presupuesto = { ...p, id, gasto_actual: 0 };
    set((state) => ({ presupuestos: [...state.presupuestos, nuevoPresupuesto] }));
    get().calcularResumenes();
    persistLocally(get());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('presupuestos').insert([{ ...p, user_id: session.user.id }]);
      }
    } catch (e) {}
  },

  eliminarPresupuesto: async (id) => {
    set((state) => ({
      presupuestos: state.presupuestos.filter((p) => p.id !== id),
    }));
    persistLocally(get());

    try {
      await supabase.from('presupuestos').delete().eq('id', id);
    } catch (e) {}
  },

  agregarMetaAhorro: async (meta) => {
    const id = `meta_${Date.now()}`;
    const nuevaMeta: MetaAhorro = { ...meta, id };
    set((state) => ({ metasAhorro: [...state.metasAhorro, nuevaMeta] }));
    persistLocally(get());
  },

  abonarAMetaAhorro: async (id, monto) => {
    set((state) => ({
      metasAhorro: state.metasAhorro.map((m) =>
        m.id === id ? { ...m, monto_actual: m.monto_actual + monto } : m
      ),
    }));
    persistLocally(get());
  },

  eliminarMetaAhorro: async (id) => {
    set((state) => ({
      metasAhorro: state.metasAhorro.filter((m) => m.id !== id),
    }));
    persistLocally(get());
  },

  agregarCategoria: async (cat) => {
    const id = `cat_${Date.now()}`;
    const nuevaCat: Categoria = { ...cat, id };
    set((state) => ({ categorias: [...state.categorias, nuevaCat] }));
    persistLocally(get());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('categorias').insert([{ ...cat, user_id: session.user.id }]);
      }
    } catch (e) {}
  },

  eliminarCategoria: async (id) => {
    set((state) => ({
      categorias: state.categorias.filter((c) => c.id !== id),
    }));
    persistLocally(get());

    try {
      await supabase.from('categorias').delete().eq('id', id);
    } catch (e) {}
  },

  restablecerDatosDemo: () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
    set({
      cuentas: DEFAULT_CUENTAS,
      categorias: DEFAULT_CATEGORIAS,
      movimientos: DEFAULT_MOVIMIENTOS,
      presupuestos: DEFAULT_PRESUPUESTOS,
      metasAhorro: DEFAULT_METAS_AHORRO,
    });
    get().calcularResumenes();
  },
}));
