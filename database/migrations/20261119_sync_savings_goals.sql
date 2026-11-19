-- Run this migration once in the Supabase SQL Editor before deploying goal sync.
BEGIN;

CREATE TABLE IF NOT EXISTS public.metas_ahorro (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
  monto_objetivo NUMERIC(12, 2) NOT NULL CHECK (monto_objetivo > 0),
  monto_actual NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monto_actual >= 0),
  moneda VARCHAR(3) NOT NULL CHECK (moneda IN ('COP', 'USD')),
  fecha_limite DATE,
  color VARCHAR(20) NOT NULL DEFAULT '#10B981',
  icono VARCHAR(50) NOT NULL DEFAULT 'Target',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_metas_ahorro_usuario ON public.metas_ahorro(user_id);

ALTER TABLE public.metas_ahorro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestión de metas propias" ON public.metas_ahorro;
CREATE POLICY "Gestión de metas propias"
  ON public.metas_ahorro FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.metas_ahorro TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
