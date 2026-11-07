import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Field, statusNames } from './catalogs';

export type Row = Record<string, any>;
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const money = (v: unknown, currency = 'PEN') => new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(Number(v ?? 0));
export const key = () => crypto.randomUUID();

export function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  useEffect(() => { const listener = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener); }, [close]);
  return <div className="erp-overlay"><section className="erp-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" aria-label="Cerrar" onClick={close}>×</button></header>{children}</section></div>;
}
export function ErrorNotice({ error }: { error: string }) { return error ? <div role="alert" className="notice error">{error}</div> : null; }
export function Status({ value }: { value: string }) { return <span className={`status ${value}`}>{statusNames[value] ?? value}</span>; }

export function Input({ field, value, onChange }: { field: Field; value: any; onChange: (value: any) => void }) {
  const [options, setOptions] = useState<Row[]>([]); const [error, setError] = useState('');
  useEffect(() => {
    if (!field.source) return;
    let cancelled = false;
    async function load() {
      try {
        let page = 1; let rows: Row[] = []; let last = 1;
        do { const result = await apiFetch(`/catalog/${field.source}?per_page=100&page=${page}`); rows = rows.concat(result.data); last = result.last_page; page++; } while (page <= last && !cancelled);
        if (!cancelled) setOptions(rows);
      } catch (e: any) { if (!cancelled) setError(e.message); }
    }
    load(); return () => { cancelled = true; };
  }, [field.source]);
  return <label className="field"><span>{field.label}{field.required ? ' *' : ''}</span>{field.source || field.options ?
    <select aria-label={field.label} required={field.required} value={value ?? ''} onChange={e => onChange(field.source ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}>
      <option value="">Seleccionar</option>{field.options?.map(o => <option key={o} value={o}>{o}</option>)}{options.filter(o => o.active || o.id === Number(value)).map(o => <option key={o.id} value={o.id}>{o.sku ? `${o.sku} · ` : ''}{o.name}{!o.active ? ' (inactivo)' : ''}</option>)}
    </select> : <input aria-label={field.label} type={field.type ?? 'text'} step={field.step} required={field.required} value={value ?? ''} onChange={e => onChange(e.target.value)} />}{error && <small role="alert">{error}</small>}</label>;
}

export function Pager({ data, page, setPage }: { data: Row; page: number; setPage: (n: number) => void }) {
  return <div className="pager"><span>{data.total ?? 0} registros · Página {page} de {data.last_page ?? 1}</span><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><button disabled={page >= (data.last_page ?? 1)} onClick={() => setPage(page + 1)}>Siguiente</button></div>;
}

export function Table({ rows, columns, action }: { rows: Row[]; columns: [string, string][]; action?: (row: Row) => React.ReactNode }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map(([k, label]) => <th key={k}>{label}</th>)}{action && <th>Acciones</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{columns.map(([k]) => <td key={k}>{k === 'status' ? <Status value={row[k]} /> : k === 'active' ? (row[k] ? 'Activo' : 'Inactivo') : String(row[k] ?? '—')}</td>)}{action && <td className="actions">{action(row)}</td>}</tr>)}{!rows.length && <tr><td colSpan={columns.length + (action ? 1 : 0)} className="empty">No hay registros para mostrar.</td></tr>}</tbody></table></div>;
}

export function useList(path: string, revision: number) {
  const [page, setPage] = useState(1); const [data, setData] = useState<Row>({ data: [] }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { setPage(1); }, [path]);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    apiFetch(`${path}${path.includes('?') ? '&' : '?'}page=${page}`).then(r => { if (live) setData(r); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [path, page, revision]);
  return { data, page, setPage, error, loading };
}
