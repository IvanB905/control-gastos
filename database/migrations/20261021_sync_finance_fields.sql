-- Add the account and currency fields expected by the deployed client.
-- Run once in the Supabase SQL Editor for this project before retrying sync.
BEGIN;

ALTER TABLE public.cuentas
  ADD COLUMN IF NOT EXISTS ingreso_mensual_estimado NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS aporte_mensual NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS plazo_meses INT,
  ADD COLUMN IF NOT EXISTS saldo_fecha DATE;

ALTER TABLE public.cuentas DROP CONSTRAINT IF EXISTS cuentas_tipo_check;
ALTER TABLE public.cuentas ADD CONSTRAINT cuentas_tipo_check
  CHECK (tipo IN ('efectivo', 'banco', 'nequi_daviplata', 'tarjeta_credito', 'credito_libre_inversion', 'ahorro', 'otro'));

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'COP';
ALTER TABLE public.movimientos DROP CONSTRAINT IF EXISTS movimientos_moneda_check;
ALTER TABLE public.movimientos ADD CONSTRAINT movimientos_moneda_check
  CHECK (moneda IN ('COP', 'USD'));
UPDATE public.movimientos AS movimiento
SET moneda = cuenta.moneda
FROM public.cuentas AS cuenta
WHERE movimiento.cuenta_id = cuenta.id AND cuenta.moneda = 'USD' AND movimiento.moneda = 'COP';

ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'COP';
ALTER TABLE public.presupuestos DROP CONSTRAINT IF EXISTS presupuestos_moneda_check;
ALTER TABLE public.presupuestos ADD CONSTRAINT presupuestos_moneda_check
  CHECK (moneda IN ('COP', 'USD'));

COMMIT;

NOTIFY pgrst, 'reload schema';
