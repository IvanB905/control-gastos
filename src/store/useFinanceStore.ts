import { create } from 'zustand';
import type { Cuenta, Categoria, Movimiento, Presupuesto, MetaAhorro, ResumenMensual, TipoMoneda } from '../types';
import { supabase } from '../lib/supabase';

// Cuentas y billeteras colombianas y en USD
const DEFAULT_CUENTAS: Cuenta[] = [
  {
    id: 'c1',
    user_id: 'user1',
    nombre: 'Bancolombia Ahorros',
    tipo: 'banco',
    saldo_inicial: 3000000,
    saldo_actual: 4850000,
    moneda: 'COP',
    color: '#004481',
    icono: 'Landmark',
    es_predeterminada: true,
  },
  {
    id: 'c2',
    user_id: 'user1',
    nombre: 'Nequi / Daviplata',
    tipo: 'nequi_daviplata',
    saldo_inicial: 200000,
    saldo_actual: 620000,
    moneda: 'COP',
    color: '#E11900',
    icono: 'Smartphone',
    es_predeterminada: false,
  },
  {
    id: 'c3',
    user_id: 'user1',
    nombre: 'Efectivo en Mano',
    tipo: 'efectivo',
    saldo_inicial: 100000,
    saldo_actual: 180000,
    moneda: 'COP',
    color: '#10B981',
    icono: 'Banknote',
    es_predeterminada: false,
  },
  {
    id: 'c4',
    user_id: 'user1',
    nombre: 'Tarjeta de Crédito',
    tipo: 'tarjeta_credito',
    saldo_inicial: 0,
    saldo_actual: -540000,
    moneda: 'COP',
    color: '#8B5CF6',
    icono: 'CreditCard',
    es_predeterminada: false,
  },
  {
    id: 'c5',
    user_id: 'user1',
    nombre: 'Cuenta Dólares (USD)',
    tipo: 'ahorro',
    saldo_inicial: 1000,
    saldo_actual: 1450.00,
    moneda: 'USD',
    color: '#F59E0B',
    icono: 'DollarSign',
    es_predeterminada: false,
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

const DEFAULT_MOVIMIENTOS: Movimiento[] = [
  {
    id: 'm1',
    user_id: 'user1',
    cuenta_id: 'c1',
    categoria_id: 'cat6',
    tipo: 'ingreso',
    monto: 4500000,
    moneda: 'COP',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Pago de Nómina / Salario mensual',
    estado: 'completado',
    es_recurrente: true,
  },
  {
    id: 'm2',
    user_id: 'user1',
    cuenta_id: 'c1',
    categoria_id: 'cat1',
    tipo: 'gasto',
    monto: 380000,
    moneda: 'COP',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Mercado del mes (Éxito / Jumbo)',
    estado: 'completado',
    es_recurrente: false,
  },
  {
    id: 'm3',
    user_id: 'user1',
    cuenta_id: 'c2',
    categoria_id: 'cat3',
    tipo: 'gasto',
    monto: 165000,
    moneda: 'COP',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Pago Servicios Públicos (EPM / Enel)',
    estado: 'completado',
    es_recurrente: true,
  },
  {
    id: 'm4',
    user_id: 'user1',
    cuenta_id: 'c4',
    categoria_id: 'cat4',
    tipo: 'gasto',
    monto: 48900,
    moneda: 'COP',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Suscripciones Netflix & Spotify',
    estado: 'completado',
    es_recurrente: true,
  },
  {
    id: 'm5',
    user_id: 'user1',
    cuenta_id: 'c2',
    categoria_id: 'cat2',
    tipo: 'gasto',
    monto: 60000,
    moneda: 'COP',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Gasolina / Transporte',
    estado: 'completado',
    es_recurrente: false,
  },
  {
    id: 'm6',
    user_id: 'user1',
    cuenta_id: 'c5',
    categoria_id: 'cat7',
    tipo: 'ingreso',
    monto: 450.00,
    moneda: 'USD',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Cobro Trabajo Freelance en Dólares',
    estado: 'completado',
    es_recurrente: false,
  },
  {
    id: 'm7',
    user_id: 'user1',
    cuenta_id: 'c1',
    categoria_id: 'cat3',
    tipo: 'gasto',
    monto: 120000,
    moneda: 'COP',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Factura Internet Fibra Óptica',
    estado: 'pendiente',
    es_recurrente: true,
  },
];

const DEFAULT_PRESUPUESTOS: Presupuesto[] = [
  { id: 'p1', user_id: 'user1', categoria_id: 'cat1', monto_limite: 1200000, moneda: 'COP', mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), gasto_actual: 380000 },
  { id: 'p2', user_id: 'user1', categoria_id: 'cat2', monto_limite: 350000, moneda: 'COP', mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), gasto_actual: 60000 },
  { id: 'p3', user_id: 'user1', categoria_id: 'cat4', monto_limite: 200000, moneda: 'COP', mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), gasto_actual: 48900 },
  { id: 'p4', user_id: 'user1', categoria_id: 'cat3', monto_limite: 250000, moneda: 'COP', mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), gasto_actual: 165000 },
];

const DEFAULT_METAS_AHORRO: MetaAhorro[] = [
  {
    id: 'meta1',
    user_id: 'user1',
    nombre: 'Viaje a San Andrés / Vacaciones',
    monto_objetivo: 4000000,
    monto_actual: 2800000,
    moneda: 'COP',
    fecha_limite: '2026-12-15',
    color: '#06B6D4',
    icono: 'Plane',
  },
  {
    id: 'meta2',
    user_id: 'user1',
    nombre: 'Fondo de Emergencia (6 meses)',
    monto_objetivo: 10000000,
    monto_actual: 6200000,
    moneda: 'COP',
    fecha_limite: '2027-06-30',
    color: '#10B981',
    icono: 'ShieldCheck',
  },
  {
    id: 'meta3',
    user_id: 'user1',
    nombre: 'Nuevo Equipo / Laptop Pro',
    monto_objetivo: 1200,
    monto_actual: 750,
    moneda: 'USD',
    fecha_limite: '2026-11-30',
    color: '#8B5CF6',
    icono: 'Laptop',
  },
];

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
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  cuentas: DEFAULT_CUENTAS,
  categorias: DEFAULT_CATEGORIAS,
  movimientos: DEFAULT_MOVIMIENTOS,
  presupuestos: DEFAULT_PRESUPUESTOS,
  metasAhorro: DEFAULT_METAS_AHORRO,
  isLoading: false,
  resumenCOP: {
    total_ingresos: 4500000,
    total_gastos: 653900,
    balance: 3846100,
    gastos_pendientes: 120000,
  },
  resumenUSD: {
    total_ingresos: 450.00,
    total_gastos: 0.00,
    balance: 450.00,
    gastos_pendientes: 0.00,
  },

  calcularResumenes: () => {
    const { movimientos, presupuestos } = get();
    
    let cop_ingresos = 0;
    let cop_gastos = 0;
    let cop_pendientes = 0;

    let usd_ingresos = 0;
    let usd_gastos = 0;
    let usd_pendientes = 0;

    // Calcular gasto actual por categoría en presupuestos
    const gastoPorCategoriaCOP: { [catId: string]: number } = {};
    const gastoPorCategoriaUSD: { [catId: string]: number } = {};

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
            if (m.categoria_id) {
              gastoPorCategoriaCOP[m.categoria_id] = (gastoPorCategoriaCOP[m.categoria_id] || 0) + m.monto;
            }
          } else {
            usd_gastos += m.monto;
            if (m.categoria_id) {
              gastoPorCategoriaUSD[m.categoria_id] = (gastoPorCategoriaUSD[m.categoria_id] || 0) + m.monto;
            }
          }
        }
      } else if (m.estado === 'pendiente' && m.tipo === 'gasto') {
        if (isCOP) cop_pendientes += m.monto;
        else usd_pendientes += m.monto;
      }
    });

    // Actualizar presupuestos con el gasto real calculado
    const presupuestosActualizados = presupuestos.map((p) => {
      const gasto = p.moneda === 'COP' 
        ? gastoPorCategoriaCOP[p.categoria_id] || 0 
        : gastoPorCategoriaUSD[p.categoria_id] || 0;
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('movimientos').insert([{ ...nuevo, user_id: session.user.id }]);
      }
    } catch (e) {
      console.warn('Registro local guardado');
    }
  },

  editarMovimiento: async (id, updated) => {
    set((state) => ({
      movimientos: state.movimientos.map((m) => (m.id === id ? { ...m, ...updated } : m)),
    }));
    get().calcularResumenes();

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

    try {
      await supabase.from('presupuestos').delete().eq('id', id);
    } catch (e) {}
  },

  agregarMetaAhorro: async (meta) => {
    const id = `meta_${Date.now()}`;
    const nuevaMeta: MetaAhorro = { ...meta, id };
    set((state) => ({ metasAhorro: [...state.metasAhorro, nuevaMeta] }));
  },

  abonarAMetaAhorro: async (id, monto) => {
    set((state) => ({
      metasAhorro: state.metasAhorro.map((m) =>
        m.id === id ? { ...m, monto_actual: m.monto_actual + monto } : m
      ),
    }));
  },

  eliminarMetaAhorro: async (id) => {
    set((state) => ({
      metasAhorro: state.metasAhorro.filter((m) => m.id !== id),
    }));
  },

  agregarCategoria: async (cat) => {
    const id = `cat_${Date.now()}`;
    const nuevaCat: Categoria = { ...cat, id };
    set((state) => ({ categorias: [...state.categorias, nuevaCat] }));

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

    try {
      await supabase.from('categorias').delete().eq('id', id);
    } catch (e) {}
  },
}));
