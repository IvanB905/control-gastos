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
    tipo VARCHAR(30) NOT NULL DEFAULT 'efectivo' CHECK (tipo IN ('efectivo', 'banco', 'nequi_daviplata', 'tarjeta_credito', 'credito_libre_inversion', 'ahorro', 'otro')),
    saldo_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_actual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    limite_credito NUMERIC(12, 2),
    ingreso_mensual_estimado NUMERIC(12, 2),
    aporte_mensual NUMERIC(12, 2),
    plazo_meses INT,
    saldo_fecha DATE,
    color VARCHAR(20) DEFAULT '#10B981',
    icono VARCHAR(50) DEFAULT 'Wallet',
    es_predeterminada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.cuentas ALTER COLUMN tipo TYPE VARCHAR(30);
ALTER TABLE public.cuentas ADD COLUMN IF NOT EXISTS limite_credito NUMERIC(12, 2);
ALTER TABLE public.cuentas ADD COLUMN IF NOT EXISTS ingreso_mensual_estimado NUMERIC(12, 2);
ALTER TABLE public.cuentas ADD COLUMN IF NOT EXISTS aporte_mensual NUMERIC(12, 2);
ALTER TABLE public.cuentas ADD COLUMN IF NOT EXISTS plazo_meses INT;
ALTER TABLE public.cuentas ADD COLUMN IF NOT EXISTS saldo_fecha DATE;
ALTER TABLE public.cuentas DROP CONSTRAINT IF EXISTS cuentas_tipo_check;
ALTER TABLE public.cuentas ADD CONSTRAINT cuentas_tipo_check
    CHECK (tipo IN ('efectivo', 'banco', 'nequi_daviplata', 'tarjeta_credito', 'credito_libre_inversion', 'ahorro', 'otro'));

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
    notification_id UUID,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_fecha ON public.movimientos(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_categoria ON public.movimientos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta ON public.movimientos(cuenta_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_movimientos_user_notification_id
    ON public.movimientos(user_id, notification_id) WHERE notification_id IS NOT NULL;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. TRIGGER: Actualización Automática de Saldo en Cuentas
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.aplicar_transferencia_notificada(
    p_usuario_id UUID,
    p_cuenta_id UUID,
    p_monto NUMERIC,
    p_fecha DATE,
    p_notas TEXT,
    p_signo NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    delta NUMERIC;
    cuenta_relacionada_id UUID;
    saldo_fecha_corte DATE;
BEGIN
    IF p_signo NOT IN (-1, 1) OR p_monto IS NULL OR p_monto <= 0 THEN RETURN; END IF;
    IF p_notas LIKE '%[flujo:entrada]%' THEN
        delta := p_monto * p_signo;
    ELSIF p_notas LIKE '%[flujo:salida]%' THEN
        delta := -p_monto * p_signo;
    ELSE
        RETURN;
    END IF;

    SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas
    WHERE id = p_cuenta_id AND user_id = p_usuario_id FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;
    IF saldo_fecha_corte IS NULL OR p_fecha > saldo_fecha_corte THEN
        UPDATE public.cuentas SET saldo_actual = saldo_actual + delta
        WHERE id = p_cuenta_id AND user_id = p_usuario_id;
    END IF;

    cuenta_relacionada_id := COALESCE(
        substring(p_notas FROM '\[destino:([0-9a-f-]{36})\]'),
        substring(p_notas FROM '\[origen:([0-9a-f-]{36})\]')
    )::UUID;
    IF cuenta_relacionada_id IS NULL OR cuenta_relacionada_id = p_cuenta_id THEN RETURN; END IF;

    SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas
    WHERE id = cuenta_relacionada_id AND user_id = p_usuario_id FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;
    IF saldo_fecha_corte IS NULL OR p_fecha > saldo_fecha_corte THEN
        UPDATE public.cuentas SET saldo_actual = saldo_actual - delta
        WHERE id = cuenta_relacionada_id AND user_id = p_usuario_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_transferencia_notificada(UUID, UUID, NUMERIC, DATE, TEXT, NUMERIC) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
DECLARE
    saldo_fecha_corte DATE;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas WHERE id = NEW.cuenta_id FOR UPDATE;
        IF NEW.estado = 'completado' AND (NEW.notification_id IS NULL OR saldo_fecha_corte IS NULL OR NEW.fecha > saldo_fecha_corte) THEN
            IF NEW.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + NEW.monto WHERE id = NEW.cuenta_id;
            ELSIF NEW.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - NEW.monto WHERE id = NEW.cuenta_id;
            END IF;
        END IF;
        IF NEW.notification_id IS NOT NULL AND NEW.tipo = 'transferencia' AND NEW.estado = 'completado' THEN
            PERFORM public.aplicar_transferencia_notificada(NEW.user_id, NEW.cuenta_id, NEW.monto, NEW.fecha, NEW.notas, 1);
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas WHERE id = OLD.cuenta_id FOR UPDATE;
        IF OLD.estado = 'completado' AND (OLD.notification_id IS NULL OR saldo_fecha_corte IS NULL OR OLD.fecha > saldo_fecha_corte) THEN
            IF OLD.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - OLD.monto WHERE id = OLD.cuenta_id;
            ELSIF OLD.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + OLD.monto WHERE id = OLD.cuenta_id;
            END IF;
        END IF;
        IF OLD.notification_id IS NOT NULL AND OLD.tipo = 'transferencia' AND OLD.estado = 'completado' THEN
            PERFORM public.aplicar_transferencia_notificada(OLD.user_id, OLD.cuenta_id, OLD.monto, OLD.fecha, OLD.notas, -1);
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- Revertir el saldo anterior si estaba completado
        SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas WHERE id = OLD.cuenta_id FOR UPDATE;
        IF OLD.estado = 'completado' AND (OLD.notification_id IS NULL OR saldo_fecha_corte IS NULL OR OLD.fecha > saldo_fecha_corte) THEN
            IF OLD.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - OLD.monto WHERE id = OLD.cuenta_id;
            ELSIF OLD.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + OLD.monto WHERE id = OLD.cuenta_id;
            END IF;
        END IF;
        IF OLD.notification_id IS NOT NULL AND OLD.tipo = 'transferencia' AND OLD.estado = 'completado' THEN
            PERFORM public.aplicar_transferencia_notificada(OLD.user_id, OLD.cuenta_id, OLD.monto, OLD.fecha, OLD.notas, -1);
        END IF;

        -- Aplicar el nuevo saldo si está completado
        SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas WHERE id = NEW.cuenta_id FOR UPDATE;
        IF NEW.estado = 'completado' AND (NEW.notification_id IS NULL OR saldo_fecha_corte IS NULL OR NEW.fecha > saldo_fecha_corte) THEN
            IF NEW.tipo = 'ingreso' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual + NEW.monto WHERE id = NEW.cuenta_id;
            ELSIF NEW.tipo = 'gasto' THEN
                UPDATE public.cuentas SET saldo_actual = saldo_actual - NEW.monto WHERE id = NEW.cuenta_id;
            END IF;
        END IF;
        IF NEW.notification_id IS NOT NULL AND NEW.tipo = 'transferencia' AND NEW.estado = 'completado' THEN
            PERFORM public.aplicar_transferencia_notificada(NEW.user_id, NEW.cuenta_id, NEW.monto, NEW.fecha, NEW.notas, 1);
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.registrar_movimiento_notificacion(
    p_notification_id UUID,
    p_cuenta_id UUID,
    p_categoria_id UUID,
    p_tipo TEXT,
    p_monto NUMERIC,
    p_moneda TEXT,
    p_fecha DATE,
    p_descripcion TEXT,
    p_flujo TEXT,
    p_contraparte_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    usuario_id UUID := auth.uid();
    cuenta_seleccionada public.cuentas%ROWTYPE;
    categoria_seleccionada public.categorias%ROWTYPE;
    cuenta_contraparte public.cuentas%ROWTYPE;
    movimiento_creado public.movimientos%ROWTYPE;
    balances JSONB;
    aplicado BOOLEAN := FALSE;
BEGIN
    IF usuario_id IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para registrar el movimiento.';
    END IF;
    IF p_notification_id IS NULL OR p_cuenta_id IS NULL OR p_tipo IS NULL
       OR p_tipo NOT IN ('gasto', 'ingreso', 'transferencia') OR p_monto IS NULL OR p_monto <= 0
       OR p_moneda IS NULL OR p_moneda NOT IN ('COP', 'USD') OR p_fecha IS NULL
       OR NULLIF(BTRIM(p_descripcion), '') IS NULL OR LENGTH(BTRIM(p_descripcion)) > 255 THEN
        RAISE EXCEPTION 'Los datos del movimiento no son válidos.';
    END IF;
    IF p_tipo = 'transferencia' THEN
        IF p_flujo IS NULL OR p_flujo NOT IN ('entrada', 'salida') OR p_categoria_id IS NOT NULL OR p_contraparte_id = p_cuenta_id THEN
            RAISE EXCEPTION 'Revisa la dirección y las cuentas de la transferencia.';
        END IF;
    ELSIF p_categoria_id IS NULL OR p_flujo IS NOT NULL OR p_contraparte_id IS NOT NULL THEN
        RAISE EXCEPTION 'El ingreso o gasto debe tener categoría y no puede incluir una cuenta de transferencia.';
    END IF;

    PERFORM id
    FROM public.cuentas
    WHERE user_id = usuario_id AND id IN (p_cuenta_id, p_contraparte_id)
    ORDER BY id
    FOR UPDATE;
    SELECT * INTO cuenta_seleccionada
    FROM public.cuentas
    WHERE id = p_cuenta_id AND user_id = usuario_id;
    IF NOT FOUND OR cuenta_seleccionada.moneda <> p_moneda THEN
        RAISE EXCEPTION 'La cuenta no pertenece al usuario o no coincide con la moneda.';
    END IF;
    IF cuenta_seleccionada.tipo = 'credito_libre_inversion'
       OR LOWER(cuenta_seleccionada.nombre) LIKE '%fondo nacional del ahorro%'
       OR LOWER(cuenta_seleccionada.nombre) ~ '\mfna\M' THEN
        RAISE EXCEPTION 'El FNA y los créditos no se usan como cuenta transaccional.';
    END IF;

    IF p_contraparte_id IS NOT NULL THEN
        SELECT * INTO cuenta_contraparte
        FROM public.cuentas
        WHERE id = p_contraparte_id AND user_id = usuario_id;
        IF NOT FOUND OR cuenta_contraparte.moneda <> p_moneda
           OR cuenta_contraparte.tipo = 'credito_libre_inversion'
           OR LOWER(cuenta_contraparte.nombre) LIKE '%fondo nacional del ahorro%'
           OR LOWER(cuenta_contraparte.nombre) ~ '\mfna\M' THEN
            RAISE EXCEPTION 'La cuenta relacionada no es válida para esta transferencia.';
        END IF;
    END IF;

    IF p_tipo <> 'transferencia' THEN
        SELECT * INTO categoria_seleccionada
        FROM public.categorias
        WHERE id = p_categoria_id AND user_id = usuario_id AND tipo = p_tipo;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La categoría no corresponde al tipo de movimiento.';
        END IF;
    END IF;

    INSERT INTO public.movimientos (
        user_id, cuenta_id, categoria_id, tipo, monto, moneda, fecha,
        descripcion, estado, es_recurrente, notas, notification_id
    ) VALUES (
        usuario_id, p_cuenta_id, p_categoria_id, p_tipo, p_monto, p_moneda, p_fecha,
        BTRIM(p_descripcion), 'completado', FALSE,
        '[notificacion-bancaria:' || p_notification_id::TEXT || ']' ||
          CASE WHEN p_tipo = 'transferencia' THEN ' [flujo:' || p_flujo || ']' ELSE '' END ||
          CASE WHEN p_contraparte_id IS NULL THEN '' WHEN p_flujo = 'salida' THEN ' [destino:' || p_contraparte_id::TEXT || ']' ELSE ' [origen:' || p_contraparte_id::TEXT || ']' END,
        p_notification_id
    )
    ON CONFLICT (user_id, notification_id) WHERE notification_id IS NOT NULL
    DO NOTHING
    RETURNING * INTO movimiento_creado;

    IF FOUND THEN
        aplicado := TRUE;
    ELSE
        SELECT * INTO movimiento_creado
        FROM public.movimientos
        WHERE user_id = usuario_id AND notification_id = p_notification_id;
    END IF;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se pudo recuperar el movimiento registrado.';
    END IF;

    SELECT jsonb_build_object(movimiento_creado.cuenta_id::TEXT, saldo_actual) INTO balances
    FROM public.cuentas WHERE id = movimiento_creado.cuenta_id AND user_id = usuario_id;
    IF aplicado AND p_tipo = 'transferencia' AND p_contraparte_id IS NOT NULL THEN
        SELECT balances || jsonb_build_object(p_contraparte_id::TEXT, saldo_actual) INTO balances
        FROM public.cuentas WHERE id = p_contraparte_id AND user_id = usuario_id;
    END IF;

    RETURN jsonb_build_object(
        'movement', to_jsonb(movimiento_creado),
        'applied', aplicado,
        'account_balances', balances
    );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_movimiento_notificacion(UUID, UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_notificacion(UUID, UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, TEXT, UUID) TO authenticated;

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
