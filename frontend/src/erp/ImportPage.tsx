import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import { ErrorNotice, Row, Table, key } from './components';

export function ImportPage() {
  const [table, setTable] = useState('items'); const [file, setFile] = useState<File | null>(null); const [result, setResult] = useState<Row | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [requestKey, setRequestKey] = useState(key());
  async function upload(apply: boolean) {
    if (!file) return; setBusy(true); setError('');
    const form = new FormData(); form.set('file', file); form.set('apply', apply ? '1' : '0');
    try { setResult(await apiFetch(`/imports/${table}`, { method: 'POST', body: form, headers: { 'Idempotency-Key': requestKey } })); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <><p className="notice">Importa nuevos registros desde CSV. Primero se valida el archivo completo. No se actualizan ni eliminan registros existentes. Máximo 1000 filas y 2 MB.</p><div className="toolbar"><select aria-label="Tipo de importación" value={table} onChange={e => { setTable(e.target.value); setResult(null); setRequestKey(key()); }}><option value="items">Productos</option><option value="customers">Clientes</option><option value="suppliers">Proveedores</option><option value="categories">Categorías</option></select><a className="button" href={`/api/v1/imports/${table}/template`}>Descargar plantilla</a></div><input aria-label="Archivo CSV" type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setRequestKey(key()); }} /><div className="actions" style={{ marginTop: 18 }}><button disabled={!file || busy} onClick={() => upload(false)}>Validar y previsualizar</button>{result && !result.applied && !result.errors?.length && result.valid_rows > 0 && <button className="primary" disabled={busy} onClick={() => upload(true)}>Importar {result.valid_rows} registros</button>}</div><ErrorNotice error={error} />{result && <><p className={`notice ${result.applied ? 'success' : ''}`}>{result.applied ? 'Importación completada' : 'Validación terminada'} · {result.valid_rows} filas válidas</p>{result.errors?.length > 0 && <Table rows={result.errors.map((e: Row) => ({ row: e.row, errors: e.errors.join(' ') }))} columns={ [['row', 'Fila'], ['errors', 'Errores']] } />}{result.preview?.length > 0 && <Table rows={result.preview} columns={Object.keys(result.preview[0]).map(k => [k, k])} />}</>}</>;
}
