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
            .update({ saldo_actual: Number(cuentaActual.saldo_actual) + delta })
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
        return saldoDelta ? { ...cuenta, saldo_actual: cuenta.saldo_actual + saldoDelta } : cuenta;
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
