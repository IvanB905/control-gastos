import { create } from 'zustand';
import type { Cuenta, Categoria, Movimiento, Presupuesto, MetaAhorro, ResumenMensual, TipoMoneda } from '../types';
import { supabase } from '../lib/supabase';

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
    ingreso_mensual_estimado: 1869515,
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
  resumenCOP: ResumenMensual;
  resumenUSD: ResumenMensual;
  
  cargarDatos: () => Promise<void>;
  agregarMovimiento: (movimiento: Omit<Movimiento, 'id' | 'created_at'>) => Promise<void>;
  importarMovimientos: (movimientos: Omit<Movimiento, 'id' | 'created_at'>[], opciones?: { actualizarSaldos?: boolean }) => Promise<void>;
  editarMovimiento: (id: string, updated: Partial<Movimiento>) => Promise<void>;
  eliminarMovimiento: (id: string) => Promise<void>;
  agregarCuenta: (cuenta: Omit<Cuenta, 'id' | 'created_at' | 'saldo_actual'>) => Promise<void>;
  actualizarSaldoCuenta: (id: string, saldoActual: number, saldoFecha: string) => Promise<void>;
  eliminarCuenta: (id: string) => Promise<void>;
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

const movementSyncKey = (movement: Movimiento) => {
  const importId = movement.notas?.match(/\[import:([a-z0-9-]+)\]/i)?.[1];
  return [
    movement.cuenta_id,
    importId ? `import:${importId}` : movement.fecha,
    movement.tipo,
    Number(movement.monto).toFixed(2),
    normalizeSyncKey(movement.descripcion),
    movement.moneda,
  ].join('|');
};

// Merges this browser's saved finance data into the authenticated user's cloud data.
// Natural keys make repeated sign-ins safe and preserve existing cloud records.
const performLocalDataSync = async (userId: string, local: Pick<FinanceState, 'cuentas' | 'categorias' | 'movimientos' | 'presupuestos'>) => {
  const accountResult = await supabase.from('cuentas').select('*').eq('user_id', userId);
  if (accountResult.error) throw accountResult.error;
  const cloudAccounts = (accountResult.data || []) as Cuenta[];
  const accountIds = new Map<string, string>();
  const accountKey = (account: Cuenta) => [normalizeSyncKey(account.nombre), account.tipo, account.moneda].join('|');

  for (const localAccount of local.cuentas) {
    const key = accountKey(localAccount);
    let cloudAccount = cloudAccounts.find((account) => accountKey(account) === key);
    if (!cloudAccount) {
      const { id: _id, created_at: _createdAt, ...payload } = localAccount;
      const result = await supabase.from('cuentas').insert([{ ...payload, user_id: userId }]).select().single();
      if (result.error || !result.data) throw result.error || new Error('No se pudo sincronizar una cuenta.');
      cloudAccount = result.data as Cuenta;
      cloudAccounts.push(cloudAccount);
    } else if ((localAccount.saldo_fecha || '') > (cloudAccount.saldo_fecha || '')) {
      const result = await supabase.from('cuentas')
        .update({ saldo_actual: localAccount.saldo_actual, saldo_fecha: localAccount.saldo_fecha })
        .eq('id', cloudAccount.id).eq('user_id', userId).select().single();
      if (result.error || !result.data) throw result.error || new Error('No se pudo sincronizar el saldo de una cuenta.');
      cloudAccount = result.data as Cuenta;
      cloudAccounts[cloudAccounts.findIndex((account) => accountKey(account) === key)] = cloudAccount;
    }
    accountIds.set(localAccount.id, cloudAccount.id);
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
      const result = await supabase.from('categorias').insert([{ ...payload, user_id: userId }]).select().single();
      if (result.error || !result.data) throw result.error || new Error('No se pudo sincronizar una categoría.');
      cloudCategory = result.data as Categoria;
      cloudCategories.push(cloudCategory);
    }
    categoryIds.set(localCategory.id, cloudCategory.id);
  }

  const movementResult = await supabase.from('movimientos').select('*').eq('user_id', userId);
  if (movementResult.error) throw movementResult.error;
  const cloudMovements = (movementResult.data || []) as Movimiento[];
  const knownMovementKeys = new Set(cloudMovements.map(movementSyncKey));
  const missingMovements = local.movimientos.flatMap((movement) => {
    const mappedAccount = accountIds.get(movement.cuenta_id);
    if (!mappedAccount) return [];
    const synced = {
      ...movement,
      user_id: userId,
      cuenta_id: mappedAccount,
      categoria_id: movement.categoria_id ? categoryIds.get(movement.categoria_id) || null : null,
    };
    if (knownMovementKeys.has(movementSyncKey(synced))) return [];
    knownMovementKeys.add(movementSyncKey(synced));
    const { id: _id, created_at: _createdAt, cuenta: _account, categoria: _category, ...payload } = synced;
    return [payload];
  });
  if (missingMovements.length) {
    const result = await supabase.from('movimientos').insert(missingMovements).select();
    if (result.error) throw result.error;
    cloudMovements.push(...((result.data || []) as Movimiento[]));
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
    const result = await supabase.from('presupuestos').insert(missingBudgets).select();
    if (result.error) throw result.error;
    cloudBudgets.push(...((result.data || []) as Presupuesto[]));
  }

  return { cuentas: cloudAccounts, categorias: cloudCategories, movimientos: cloudMovements, presupuestos: cloudBudgets };
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
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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
        const local = get();
        const synced = await syncLocalDataToCloud(userId, {
          cuentas: local.cuentas,
          categorias: local.categorias,
          movimientos: local.movimientos,
          presupuestos: local.presupuestos,
        });
        set({ ...synced });
        get().calcularResumenes();
        persistLocally(get());
        set({ isLoading: false });
        return;
      }

      const [resCuentas, resCategorias, resMovimientos, resPresupuestos] = await Promise.all([
        supabase.from('cuentas').select('*').eq('user_id', userId),
        supabase.from('categorias').select('*').eq('user_id', userId),
        supabase.from('movimientos').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
        supabase.from('presupuestos').select('*').eq('user_id', userId),
      ]);

      if (resCuentas.data && resCuentas.data.length > 0) {
        set({ cuentas: resCuentas.data });
      }
      if (resCategorias.data && resCategorias.data.length > 0) {
        set({ categorias: resCategorias.data });
      }
      if (resMovimientos.data && resMovimientos.data.length > 0) {
        set({ movimientos: resMovimientos.data });
      }
      if (resPresupuestos.data && resPresupuestos.data.length > 0) {
        set({ presupuestos: resPresupuestos.data });
      }

      get().calcularResumenes();
    } catch (error) {
      console.error('Error al cargar datos desde Supabase:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  agregarMovimiento: async (nuevo) => {
    const id = `m_${Date.now()}`;
    const movimientoCreado: Movimiento = { ...nuevo, id };

    set((state) => ({
      movimientos: [movimientoCreado, ...state.movimientos],
      cuentas: state.cuentas.map((c) => {
        if (c.id === nuevo.cuenta_id && nuevo.estado === 'completado') {
          return {
            ...c,
            saldo_actual: nuevo.tipo === 'ingreso' ? c.saldo_actual + nuevo.monto : c.saldo_actual - nuevo.monto,
          };
        }
        return c;
      }),
    }));

    get().calcularResumenes();
    persistLocally(get());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('movimientos').insert([{ ...nuevo, user_id: session.user.id }]);
      }
    } catch (e) {
      console.warn('Registro local guardado');
    }
  },

  importarMovimientos: async (nuevos, opciones) => {
    if (nuevos.length === 0) return;

    const actualizarSaldos = opciones?.actualizarSaldos ?? false;
    const fechaUltimaPorCuenta = new Map<string, string>();
    if (actualizarSaldos) {
      nuevos.forEach((movimiento) => {
        if (movimiento.estado !== 'completado') return;
        const fechaActual = fechaUltimaPorCuenta.get(movimiento.cuenta_id) || '';
        if (movimiento.fecha > fechaActual) fechaUltimaPorCuenta.set(movimiento.cuenta_id, movimiento.fecha);
      });
    }
    const { data: { session } } = await supabase.auth.getSession();
    let importados: Movimiento[];

    if (session) {
      const cuentaIds = [...new Set(nuevos.map((movimiento) => movimiento.cuenta_id))];
      let saldosAnteriores: { id: string; saldo_actual: number }[] = [];
      if (!actualizarSaldos) {
        const { data, error } = await supabase
          .from('cuentas')
          .select('id, saldo_actual')
          .eq('user_id', session.user.id)
          .in('id', cuentaIds);
        if (error || !data) throw error || new Error('No se pudieron leer los saldos actuales.');
        saldosAnteriores = data;
      }

      const { data, error } = await supabase
        .from('movimientos')
        .insert(nuevos.map((movimiento) => ({ ...movimiento, user_id: session.user.id })))
        .select();

      if (error || !data) throw error || new Error('No se pudo guardar la importación.');
      importados = data as Movimiento[];

      if (actualizarSaldos) {
        const transferenciasPorCuenta = new Map<string, number>();
        importados.forEach((movimiento) => {
          if (movimiento.tipo !== 'transferencia') return;
          const delta = movimiento.notas?.includes('[flujo:salida]')
            ? -movimiento.monto
            : movimiento.notas?.includes('[flujo:entrada]') ? movimiento.monto : 0;
          transferenciasPorCuenta.set(movimiento.cuenta_id, (transferenciasPorCuenta.get(movimiento.cuenta_id) || 0) + delta);
        });

        for (const [cuentaId, delta] of transferenciasPorCuenta) {
          if (!delta) continue;
          const { data: cuentaActual, error: readError } = await supabase
            .from('cuentas')
            .select('saldo_actual')
            .eq('id', cuentaId)
            .single();
          if (readError || !cuentaActual) throw readError || new Error('No se pudo actualizar el saldo de la cuenta.');
          const { error: updateError } = await supabase
            .from('cuentas')
            .update({
              saldo_actual: Number(cuentaActual.saldo_actual) + delta,
              ...(fechaUltimaPorCuenta.has(cuentaId) ? { saldo_fecha: fechaUltimaPorCuenta.get(cuentaId) } : {}),
            })
            .eq('id', cuentaId);
          if (updateError) throw updateError;
        }
      } else {
        for (const cuenta of saldosAnteriores) {
          const { error: updateError } = await supabase
            .from('cuentas')
            .update({ saldo_actual: cuenta.saldo_actual })
            .eq('id', cuenta.id);
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
        const saldoDelta = importados.reduce((delta, movimiento) => {
          if (movimiento.cuenta_id !== cuenta.id || movimiento.estado !== 'completado') return delta;
          if (movimiento.tipo === 'ingreso') return delta + movimiento.monto;
          if (movimiento.tipo === 'gasto') return delta - movimiento.monto;
          if (movimiento.tipo === 'transferencia') {
            if (movimiento.notas?.includes('[flujo:salida]')) return delta - movimiento.monto;
            if (movimiento.notas?.includes('[flujo:entrada]')) return delta + movimiento.monto;
          }
          return delta;
        }, 0);
        const fechaImportada = fechaUltimaPorCuenta.get(cuenta.id);
        const saldoFecha = fechaImportada && fechaImportada > (cuenta.saldo_fecha || '')
          ? fechaImportada
          : cuenta.saldo_fecha;
        return saldoDelta
          ? { ...cuenta, saldo_actual: cuenta.saldo_actual + saldoDelta, saldo_fecha: saldoFecha }
          : cuenta;
      }),
    }));
    get().calcularResumenes();
    persistLocally(get());
  },

  editarMovimiento: async (id, updated) => {
    set((state) => ({
      movimientos: state.movimientos.map((m) => (m.id === id ? { ...m, ...updated } : m)),
    }));
    get().calcularResumenes();
    persistLocally(get());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('movimientos').update(updated).eq('id', id);
      }
    } catch (e) {}
  },

  eliminarMovimiento: async (id) => {
    set((state) => ({
      movimientos: state.movimientos.filter((m) => m.id !== id),
    }));
    get().calcularResumenes();
    persistLocally(get());

    try {
      await supabase.from('movimientos').delete().eq('id', id);
    } catch (e) {}
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
        await supabase.from('cuentas').insert([{
          ...cuenta,
          saldo_actual: cuenta.saldo_inicial,
          user_id: session.user.id,
        }]);
      }
    } catch (e) {
      console.warn('Cuenta guardada localmente');
    }
  },

  actualizarSaldoCuenta: async (id, saldoActual, saldoFecha) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase
        .from('cuentas')
        .update({ saldo_actual: saldoActual, saldo_fecha: saldoFecha })
        .eq('id', id)
        .eq('user_id', session.user.id);
      if (error) throw error;
    }

    set((state) => ({
      cuentas: state.cuentas.map((cuenta) => cuenta.id === id
        ? { ...cuenta, saldo_actual: saldoActual, saldo_fecha: saldoFecha }
        : cuenta),
    }));
    persistLocally(get());
  },

  eliminarCuenta: async (id) => {
    set((state) => ({
      cuentas: state.cuentas.filter((c) => c.id !== id),
    }));
    persistLocally(get());

    try {
      await supabase.from('cuentas').delete().eq('id', id);
    } catch (e) {}
  },

  realizarTransferencia: async (origenId, destinoId, monto, descripcion, fecha) => {
    const { cuentas } = get();
    const origen = cuentas.find((c) => c.id === origenId);
    const destino = cuentas.find((c) => c.id === destinoId);

    if (!origen || !destino || monto <= 0) return;

    set((state) => ({
      cuentas: state.cuentas.map((c) => {
        if (c.id === origenId) {
          return { ...c, saldo_actual: c.saldo_actual - monto };
        }
        if (c.id === destinoId) {
          return { ...c, saldo_actual: c.saldo_actual + monto };
        }
        return c;
      }),
      movimientos: [
        {
          id: `m_${Date.now()}`,
          user_id: origen.user_id,
          cuenta_id: origenId,
          categoria_id: null,
          tipo: 'transferencia',
          monto,
          moneda: origen.moneda,
          fecha,
          descripcion: descripcion || `Transferencia: ${origen.nombre} ➔ ${destino.nombre}`,
          estado: 'completado',
          es_recurrente: false,
        },
        ...state.movimientos,
      ],
    }));
    persistLocally(get());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await Promise.all([
          supabase.from('cuentas').update({ saldo_actual: origen.saldo_actual - monto }).eq('id', origenId),
          supabase.from('cuentas').update({ saldo_actual: destino.saldo_actual + monto }).eq('id', destinoId),
          supabase.from('movimientos').insert([{
            user_id: session.user.id,
            cuenta_id: origenId,
            tipo: 'transferencia',
            monto,
            fecha,
            descripcion: descripcion || `Transferencia: ${origen.nombre} ➔ ${destino.nombre}`,
            estado: 'completado',
          }]),
        ]);
      }
    } catch (e) {
      console.warn('Transferencia guardada localmente');
    }
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
