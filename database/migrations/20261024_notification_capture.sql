-- Run this migration once in the Supabase SQL Editor before using Android notification capture.
BEGIN;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS notification_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_movimientos_user_notification_id
  ON public.movimientos(user_id, notification_id)
  WHERE notification_id IS NOT NULL;

-- Notification movements are compared with the original account snapshot date.
-- Keep saldo_fecha unchanged so multiple events on the same later day all apply.
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
  ELSIF TG_OP = 'DELETE' THEN
    SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas WHERE id = OLD.cuenta_id FOR UPDATE;
    IF OLD.estado = 'completado' AND (OLD.notification_id IS NULL OR saldo_fecha_corte IS NULL OR OLD.fecha > saldo_fecha_corte) THEN
      IF OLD.tipo = 'ingreso' THEN
        UPDATE public.cuentas SET saldo_actual = saldo_actual - OLD.monto WHERE id = OLD.cuenta_id;
      ELSIF OLD.tipo = 'gasto' THEN
        UPDATE public.cuentas SET saldo_actual = saldo_actual + OLD.monto WHERE id = OLD.cuenta_id;
      END IF;
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

    SELECT saldo_fecha INTO saldo_fecha_corte FROM public.cuentas WHERE id = NEW.cuenta_id FOR UPDATE;
    IF NEW.estado = 'completado' AND (NEW.notification_id IS NULL OR saldo_fecha_corte IS NULL OR NEW.fecha > saldo_fecha_corte) THEN
      IF NEW.tipo = 'ingreso' THEN
        UPDATE public.cuentas SET saldo_actual = saldo_actual + NEW.monto WHERE id = NEW.cuenta_id;
      ELSIF NEW.tipo = 'gasto' THEN
        UPDATE public.cuentas SET saldo_actual = saldo_actual - NEW.monto WHERE id = NEW.cuenta_id;
      END IF;
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
  p_descripcion TEXT
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
  movimiento_creado public.movimientos%ROWTYPE;
  saldo_resultante NUMERIC;
  aplicado BOOLEAN := FALSE;
BEGIN
  IF usuario_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrar el movimiento.';
  END IF;
  IF p_notification_id IS NULL OR p_cuenta_id IS NULL OR p_categoria_id IS NULL
     OR p_tipo NOT IN ('gasto', 'ingreso') OR p_monto IS NULL OR p_monto <= 0
     OR p_moneda NOT IN ('COP', 'USD') OR p_fecha IS NULL
     OR NULLIF(BTRIM(p_descripcion), '') IS NULL OR LENGTH(BTRIM(p_descripcion)) > 255 THEN
    RAISE EXCEPTION 'Los datos del movimiento no son válidos.';
  END IF;

  SELECT * INTO cuenta_seleccionada
  FROM public.cuentas
  WHERE id = p_cuenta_id AND user_id = usuario_id
  FOR UPDATE;
  IF NOT FOUND OR cuenta_seleccionada.moneda <> p_moneda THEN
    RAISE EXCEPTION 'La cuenta no pertenece al usuario o no coincide con la moneda.';
  END IF;
  IF cuenta_seleccionada.tipo = 'credito_libre_inversion'
     OR LOWER(cuenta_seleccionada.nombre) LIKE '%fondo nacional del ahorro%'
     OR LOWER(cuenta_seleccionada.nombre) ~ '\mfna\M' THEN
    RAISE EXCEPTION 'El FNA y los créditos no se usan como cuenta transaccional.';
  END IF;

  SELECT * INTO categoria_seleccionada
  FROM public.categorias
  WHERE id = p_categoria_id AND user_id = usuario_id AND tipo = p_tipo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La categoría no corresponde al tipo de movimiento.';
  END IF;

  INSERT INTO public.movimientos (
    user_id, cuenta_id, categoria_id, tipo, monto, moneda, fecha,
    descripcion, estado, es_recurrente, notas, notification_id
  ) VALUES (
    usuario_id, p_cuenta_id, p_categoria_id, p_tipo, p_monto, p_moneda, p_fecha,
    BTRIM(p_descripcion), 'completado', FALSE,
    '[notificacion-bancaria:' || p_notification_id::TEXT || ']', p_notification_id
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

  SELECT saldo_actual INTO saldo_resultante
  FROM public.cuentas
  WHERE id = movimiento_creado.cuenta_id AND user_id = usuario_id;

  RETURN jsonb_build_object(
    'movement', to_jsonb(movimiento_creado),
    'applied', aplicado,
    'account_balance', saldo_resultante
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_movimiento_notificacion(UUID, UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_notificacion(UUID, UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
