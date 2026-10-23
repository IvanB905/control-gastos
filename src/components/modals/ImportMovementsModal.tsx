import React, { useMemo, useState } from 'react';
import { AlertCircle, Check, FileUp, LoaderCircle, X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';
import { parseBankCsv, importMarker, type ImportRow } from '../../lib/bankCsv';
import type { Cuenta, Movimiento, TipoMoneda } from '../../types';

interface ImportMovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AccountGroup {
  key: string;
  sourceAccount: string;
  moneda: TipoMoneda;
}

function suggestedAccount(group: AccountGroup, accounts: Cuenta[]): string {
  const compatible = accounts.filter((account) => account.moneda === group.moneda);
  const prefersCard = group.sourceAccount.toLocaleLowerCase('es-CO').includes('mastercard');
  const preferred = compatible.find((account) => account.tipo === (prefersCard ? 'tarjeta_credito' : 'banco'));
  return (prefersCard ? preferred : preferred || compatible[0])?.id || '';
}

function findCategory(row: ImportRow, categories: ReturnType<typeof useFinanceStore.getState>['categorias']) {
  const suggestion = row.categoriaSugerida.toLocaleLowerCase('es-CO');
  const matchingType = categories.filter((category) => category.tipo === (row.tipo === 'ingreso' ? 'ingreso' : 'gasto'));
  const includes = (terms: string[]) => matchingType.find((category) =>
    terms.some((term) => category.nombre.toLocaleLowerCase('es-CO').includes(term))
  )?.id || null;

  if (suggestion.includes('salario')) return includes(['salario', 'nómina', 'nomina']);
  if (suggestion.includes('rendimientos')) return includes(['rendimiento', 'inversion', 'inversión']);
  if (suggestion.includes('mercado')) return includes(['mercado', 'alimentación', 'alimentacion', 'comida']);
  if (suggestion.includes('combustible')) return includes(['gasolina', 'transporte']);
  if (suggestion.includes('comida')) return includes(['alimentación', 'alimentacion', 'comida']);
  if (suggestion.includes('servicios digitales')) return includes(['suscrip', 'entretenimiento', 'ocio']);
  if (suggestion.includes('telefonía')) return includes(['servicio', 'comunicación', 'comunicacion']);
  if (suggestion.includes('comisiones')) return includes(['comisión', 'comision', 'banco']);
  if (suggestion.includes('transporte')) return includes(['transporte']);
  return null;
}

function formatAmount(amount: number, currency: TipoMoneda) {
  return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

export const ImportMovementsModal: React.FC<ImportMovementsModalProps> = ({ isOpen, onClose }) => {
  const { cuentas, categorias, movimientos, importarMovimientos } = useFinanceStore();
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [updateBalances, setUpdateBalances] = useState(false);

  const groups = useMemo<AccountGroup[]>(() => {
    const unique = new Map<string, AccountGroup>();
    rows.forEach((row) => {
      const key = `${row.sourceAccount}|${row.moneda}`;
      unique.set(key, { key, sourceAccount: row.sourceAccount, moneda: row.moneda });
    });
    return [...unique.values()];
  }, [rows]);

  const rowsAlreadyImported = useMemo(() => {
    const markers = new Set(movimientos.map((movement) => importMarker(movement.notas)).filter(Boolean));
    return rows.filter((row) => markers.has(row.fingerprint));
  }, [movimientos, rows]);

  const readyRows = rows.filter((row) => !rowsAlreadyImported.includes(row));
  const hasAccountMappings = groups.every((group) => {
    const account = cuentas.find((item) => item.id === accountMap[group.key]);
    return account?.moneda === group.moneda;
  });
  const hasMissingCardAccount = groups.some((group) =>
    group.sourceAccount.toLocaleLowerCase('es-CO').includes('mastercard')
      && !cuentas.some((account) => account.tipo === 'tarjeta_credito' && account.moneda === group.moneda)
  );

  if (!isOpen) return null;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setSaveError('');
    setSavedCount(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setRows([]);
      setErrors(['El archivo supera el límite de 2 MB.']);
      return;
    }

    try {
      const parsed = parseBankCsv(await file.text());
      setFileName(file.name);
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setAccountMap(Object.fromEntries(
        [...new Map(parsed.rows.map((row) => [`${row.sourceAccount}|${row.moneda}`, {
          key: `${row.sourceAccount}|${row.moneda}`,
          sourceAccount: row.sourceAccount,
          moneda: row.moneda,
        }])).values()].map((group) => [group.key, suggestedAccount(group, cuentas)])
      ));
    } catch {
      setRows([]);
      setErrors(['No se pudo leer el archivo. Verifica que sea un CSV UTF-8 válido.']);
    }
  };

  const handleImport = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const toMovement = (row: ImportRow, accountId: string, marker: string, forcedType?: 'transferencia', forcedFlow?: 'entrada' | 'salida') => {
        const categoryId = forcedType ? null : findCategory(row, categorias);
        const type = forcedType || row.tipo;
        const importNote = `[import:${marker}]`;
        const directionNote = type === 'transferencia' ? `[flujo:${forcedFlow || row.flujo}]` : '';
        return {
          user_id: cuentas.find((account) => account.id === accountId)?.user_id || 'local',
          cuenta_id: accountId,
          categoria_id: categoryId,
          tipo: type,
          monto: row.monto,
          moneda: row.moneda,
          fecha: row.fecha,
          descripcion: forcedType ? `Abono a Mastercard · ${row.descripcion}` : row.descripcion,
          estado: 'completado' as const,
          es_recurrente: false,
          notas: [row.notas, importNote, directionNote].filter(Boolean).join(' '),
        } satisfies Omit<Movimiento, 'id' | 'created_at'>;
      };

      const selectedRows = readyRows.map((row) => {
        const accountId = accountMap[`${row.sourceAccount}|${row.moneda}`];
        return toMovement(row, accountId, row.fingerprint);
      });

      const existingMarkers = new Set(movimientos.map((movement) => importMarker(movement.notas)).filter(Boolean));
      const cardPayments = rows.filter((row) => row.tipo === 'transferencia' && /PAGO .*TC MASTER/i.test(row.descripcion));
      cardPayments.forEach((row) => {
        const marker = `transfer-${row.fingerprint}`;
        if (existingMarkers.has(marker)) return;
        const cardGroup = groups.find((group) =>
          group.moneda === row.moneda && group.sourceAccount.toLocaleLowerCase('es-CO').includes('mastercard')
        );
        const cardAccountId = cardGroup ? accountMap[cardGroup.key] : '';
        if (cardAccountId) selectedRows.push(toMovement(row, cardAccountId, marker, 'transferencia', 'entrada'));
      });

      await importarMovimientos(selectedRows, { actualizarSaldos: updateBalances });
      setSavedCount(selectedRows.length);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la importación.');
    } finally {
      setIsSaving(false);
    }
  };

  const summary = (tipo: ImportRow['tipo']) => readyRows.filter((row) => row.tipo === tipo).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/55 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:max-h-[92vh]">
        <div className="flex items-start justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
          <div>
            <h2 id="import-title" className="text-lg font-bold text-zinc-900 dark:text-white">Importar extracto bancario</h2>
            <p className="mt-1 text-xs text-zinc-500">Carga el CSV de movimientos y revisa las cuentas antes de guardarlo.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-7 text-center hover:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900/60">
            <FileUp className="mb-2 h-6 w-6 text-emerald-600" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Seleccionar archivo CSV</span>
            <span className="mt-1 text-xs text-zinc-500">{fileName || 'UTF-8, máximo 2 MB'}</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
          </label>

          {errors.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="mb-1 flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Revisa el archivo</div>
              {errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}
              {errors.length > 8 && <p>Y {errors.length - 8} filas más con errores.</p>}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(['ingreso', 'gasto', 'transferencia'] as const).map((type) => (
                  <div key={type} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{type === 'ingreso' ? 'Ingresos' : type === 'gasto' ? 'Gastos' : 'Transferencias'}</p>
                    <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{summary(type)}</p>
                  </div>
                ))}
              </div>

              {rowsAlreadyImported.length > 0 && (
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                  {rowsAlreadyImported.length} movimiento(s) ya estaban importados y se omitirán.
                </p>
              )}

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Asignar cuentas</h3>
                {groups.map((group) => (
                  <label key={group.key} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1.2fr]">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{group.sourceAccount} · {group.moneda}</span>
                    <select
                      value={accountMap[group.key] || ''}
                      onChange={(event) => setAccountMap((current) => ({ ...current, [group.key]: event.target.value }))}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    >
                      <option value="">Selecciona una cuenta compatible</option>
                      {cuentas.filter((account) => account.moneda === group.moneda && (!group.sourceAccount.toLocaleLowerCase('es-CO').includes('mastercard') || account.tipo === 'tarjeta_credito')).map((account) => (
                        <option key={account.id} value={account.id}>{account.nombre} · {account.tipo}</option>
                      ))}
                    </select>
                  </label>
                ))}
                {!hasAccountMappings && <p className="text-xs text-rose-600">Cada origen necesita una cuenta de la misma moneda.</p>}
                {hasMissingCardAccount && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    Falta una tarjeta de crédito en una de las monedas del extracto. Crea la cuenta antes de importar.
                    <button onClick={() => { onClose(); setActiveTab('cuentas'); }} className="ml-2 font-bold underline">Ir a Cuentas</button>
                  </div>
                )}
              </section>

              <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-[90px_1fr_auto] gap-3 bg-zinc-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                  <span>Fecha</span><span>Descripción</span><span className="text-right">Monto</span>
                </div>
                <div className="max-h-56 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
                  {rows.slice(0, 30).map((row) => (
                    <div key={row.fingerprint} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 px-3 py-2 text-xs">
                      <span className="text-zinc-500">{row.fecha}</span>
                      <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200" title={row.descripcion}>{row.descripcion}<small className="ml-2 text-zinc-400">{row.tipo} · {row.categoriaSugerida}</small></span>
                      <span className="whitespace-nowrap text-right font-semibold text-zinc-900 dark:text-white">{row.tipo === 'ingreso' ? '+' : row.tipo === 'gasto' ? '−' : '↔'}{formatAmount(row.monto, row.moneda)}</span>
                    </div>
                  ))}
                  {rows.length > 30 && <p className="px-3 py-2 text-center text-xs text-zinc-400">Vista previa de 30 de {rows.length} movimientos</p>}
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-xs dark:border-zinc-800">
                <input type="checkbox" checked={updateBalances} onChange={(event) => setUpdateBalances(event.target.checked)} className="mt-0.5 accent-emerald-600" />
                <span><strong className="text-zinc-800 dark:text-zinc-200">Actualizar saldos con estos movimientos.</strong> Actívalo solo si los saldos iniciales de las cuentas son los del comienzo del extracto. Si tus saldos ya son actuales, déjalo desmarcado.</span>
              </label>
              <p className="text-[11px] leading-5 text-zinc-500">
                Los pagos a tarjeta se guardan como transferencias vinculadas entre ambas cuentas, así no se duplican como gasto. Las transferencias a Nequi y los retiros se conservan como transferencias de salida.
              </p>
            </>
          )}

          {saveError && <p role="alert" className="text-xs text-rose-600">{saveError}</p>}
          {savedCount !== null && <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" /> Importados {savedCount} movimientos.</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">{savedCount !== null ? 'Cerrar' : 'Cancelar'}</button>
          {savedCount === null && (
            <button
              onClick={handleImport}
              disabled={!rows.length || !readyRows.length || !hasAccountMappings || isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              Importar {readyRows.length} movimientos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
