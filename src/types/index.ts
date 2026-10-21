export type TipoMovimiento = 'gasto' | 'ingreso' | 'transferencia';
export type EstadoMovimiento = 'completado' | 'pendiente';
export type TipoCuenta = 'banco' | 'efectivo' | 'nequi_daviplata' | 'tarjeta_credito' | 'credito_libre_inversion' | 'ahorro' | 'otro';
export type TipoMoneda = 'COP' | 'USD';

export interface Perfil {
  id: string;
  email: string;
  nombre_completo: string;
  avatar_url: string;
  moneda_principal: TipoMoneda;
  pais: string;
  tema: 'light' | 'dark' | 'system';
}

export interface Cuenta {
  id: string;
  user_id: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo_inicial: number;
  saldo_actual: number;
  moneda: TipoMoneda;
  color: string;
  icono: string;
  es_predeterminada: boolean;
  limite_credito?: number;
  ingreso_mensual_estimado?: number;
  aporte_mensual?: number;
  plazo_meses?: number;
  saldo_fecha?: string;
  created_at?: string;
}

export interface Categoria {
  id: string;
  user_id: string;
  nombre: string;
  tipo: 'gasto' | 'ingreso';
  icono: string;
  color: string;
  created_at?: string;
}

export interface Presupuesto {
  id: string;
  user_id: string;
  categoria_id: string;
  monto_limite: number;
  moneda: TipoMoneda;
  mes: number;
  anio: number;
  categoria?: Categoria;
  gasto_actual?: number;
}

export interface MetaAhorro {
  id: string;
  user_id: string;
  nombre: string;
  monto_objetivo: number;
  monto_actual: number;
  moneda: TipoMoneda;
  fecha_limite?: string;
  color: string;
  icono: string;
}

export interface Movimiento {
  id: string;
  user_id: string;
  cuenta_id: string;
  categoria_id: string | null;
  tipo: TipoMovimiento;
  monto: number;
  moneda: TipoMoneda;
  fecha: string;
  descripcion: string;
  estado: EstadoMovimiento;
  es_recurrente: boolean;
  notas?: string;
  created_at?: string;
  cuenta?: Cuenta;
  categoria?: Categoria;
}

export interface ResumenMensual {
  total_ingresos: number;
  total_gastos: number;
  balance: number;
  gastos_pendientes: number;
}
