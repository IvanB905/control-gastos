-- ==============================================================================
-- SISTEMA CONTROL DE GASTOS v2.0 - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLA: perfiles (Extensión de auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre_completo TEXT,
    avatar_url TEXT,
    moneda_simbolo VARCHAR(10) DEFAULT '$',
    moneda_codigo VARCHAR(10) DEFAULT 'USD',
    pais VARCHAR(100) DEFAULT 'Estados Unidos',
    tema VARCHAR(10) DEFAULT 'dark' CHECK (tema IN ('light', 'dark', 'system')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio perfil" 
    ON public.perfiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
    ON public.perfiles FOR UPDATE 
    USING (auth.uid() = id);

-- ==============================================================================
-- 3. TABLA: cuentas (Billeteras, Bancos, Tarjetas, Ahorros)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (tipo IN ('efectivo', 'banco', 'tarjeta_credito', 'ahorro', 'otro')),
    saldo_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_actual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    color VARCHAR(20) DEFAULT '#10B981',
    icono VARCHAR(50) DEFAULT 'Wallet',
    es_predeterminada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.cuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestión de cuentas propias" 
    ON public.cuentas FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 4. TABLA: categorias
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
    icono VARCHAR(50) DEFAULT '📁',
    color VARCHAR(20) DEFAULT '#6B7280',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestión de categorías propias" 
    ON public.categorias FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 5. TABLA: presupuestos (Metas y topes mensuales por categoría)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    monto_limite NUMERIC(12, 2) NOT NULL CHECK (monto_limite > 0),
    mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio INT NOT NULL CHECK (anio >= 2020),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT uq_presupuesto_categoria_periodo UNIQUE(user_id, categoria_id, mes, anio)
);

ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestión de presupuestos propios" 
    ON public.presupuestos FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 6. TABLA: movimientos (Transacciones financieras)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cuenta_id UUID NOT NULL REFERENCES public.cuentas(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('gasto', 'ingreso', 'transferencia')),
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion VARCHAR(255) NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'completado' CHECK (estado IN ('completado', 'pendiente')),
    es_recurrente BOOLEAN DEFAULT FALSE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_fecha ON public.movimientos(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_categoria ON public.movimientos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta ON public.movimientos(cuenta_id);

ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestión de movimientos propios" 
    ON public.movimientos FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 7. TRIGGER: Inicialización automática de Usuario (Perfil + Cuentas + Categorías)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    nueva_cuenta_id UUID;
BEGIN
    -- 1. Crear Perfil
    INSERT INTO public.perfiles (id, email, nombre_completo, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    );

    -- 2. Crear Billetera Principal por defecto
    INSERT INTO public.cuentas (user_id, nombre, tipo, saldo_inicial, saldo_actual, color, icono, es_predeterminada)
    VALUES (NEW.id, 'Efectivo', 'efectivo', 0.00, 0.00, '#10B981', 'Banknote', TRUE)
    RETURNING id INTO nueva_cuenta_id;

    -- 3. Crear Categorías de Gasto por defecto
    INSERT INTO public.categorias (user_id, nombre, tipo, icono, color) VALUES
    (NEW.id, 'Alimentación', 'gasto', '🍔', '#EF4444'),
    (NEW.id, 'Transporte', 'gasto', '🚗', '#F97316'),
    (NEW.id, 'Vivienda', 'gasto', '🏠', '#8B5CF6'),
    (NEW.id, 'Servicios', 'gasto', '💡', '#06B6D4'),
    (NEW.id, 'Entretenimiento', 'gasto', '🍿', '#EC4899'),
    (NEW.id, 'Salud', 'gasto', '💊', '#14B8A6');

    -- 4. Crear Categorías de Ingreso por defecto
    INSERT INTO public.categorias (user_id, nombre, tipo, icono, color) VALUES
    (NEW.id, 'Salario / Nómina', 'ingreso', '💰', '#10B981'),
    (NEW.id, 'Ventas / Negocio', 'ingreso', '📈', '#3B82F6'),
    (NEW.id, 'Inversiones', 'ingreso', '🪙', '#F59E0B'),
    (NEW.id, 'Otros Ingresos', 'ingreso', '🎁', '#84CC16');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. TRIGGER: Actualización Automática de Saldo en Cuentas
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.estado = 'completado' THEN
            IF NEW.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + NEW.monto WHERE id = NEW.cuenta_id;
            ELSIF NEW.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - NEW.monto WHERE id = NEW.cuenta_id;
            END IF;
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.estado = 'completado' THEN
            IF OLD.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - OLD.monto WHERE id = OLD.cuenta_id;
            ELSIF OLD.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + OLD.monto WHERE id = OLD.cuenta_id;
            END IF;
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- Revertir el saldo anterior si estaba completado
        IF OLD.estado = 'completado' THEN
            IF OLD.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - OLD.monto WHERE id = OLD.cuenta_id;
            ELSIF OLD.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + OLD.monto WHERE id = OLD.cuenta_id;
            END IF;
        END IF;

        -- Aplicar el nuevo saldo si está completado
        IF NEW.estado = 'completado' THEN
            IF NEW.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + NEW.monto WHERE id = NEW.cuenta_id;
            ELSIF NEW.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - NEW.monto WHERE id = NEW.cuenta_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_actualizar_saldo ON public.movimientos;
CREATE TRIGGER trigger_actualizar_saldo
    AFTER INSERT OR UPDATE OR DELETE ON public.movimientos
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_saldo_cuenta();

-- ==============================================================================
-- 9. FUNCIÓN RPC: Resumen Mensual (Ingresos, Gastos, Balance y Presupuestos)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.obtener_resumen_mensual(
    p_user_id UUID,
    p_anio INT,
    p_mes INT
)
RETURNS TABLE (
    total_ingresos NUMERIC,
    total_gastos NUMERIC,
    balance NUMERIC,
    gastos_pendientes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND estado = 'completado' THEN monto ELSE 0 END), 0)::NUMERIC AS total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'gasto' AND estado = 'completado' THEN monto ELSE 0 END), 0)::NUMERIC AS total_gastos,
        (COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND estado = 'completado' THEN monto ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN tipo = 'gasto' AND estado = 'completado' THEN monto ELSE 0 END), 0))::NUMERIC AS balance,
        COALESCE(SUM(CASE WHEN tipo = 'gasto' AND estado = 'pendiente' THEN monto ELSE 0 END), 0)::NUMERIC AS gastos_pendientes
    FROM public.movimientos
    WHERE user_id = p_user_id
      AND EXTRACT(YEAR FROM fecha) = p_anio
      AND EXTRACT(MONTH FROM fecha) = p_mes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
