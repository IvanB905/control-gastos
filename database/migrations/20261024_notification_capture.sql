-- Run this migration once in the Supabase SQL Editor before using Android notification capture.
BEGIN;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS notification_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_movimientos_user_notification_id
  ON public.movimientos(user_id, notification_id)
  WHERE notification_id IS NOT NULL;

-- Notification movements are compared with the original account snapshot date.
-- Keep saldo_fecha unchanged so multiple events on the same later day all apply.
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
  IF TG_OP = 'INSERT' THEN
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
  ELSIF TG_OP = 'DELETE' THEN
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
  ELSIF TG_OP = 'UPDATE' THEN
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

DROP FUNCTION IF EXISTS public.registrar_movimiento_notificacion(UUID, UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT);

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

NOTIFY pgrst, 'reload schema';
COMMIT;
