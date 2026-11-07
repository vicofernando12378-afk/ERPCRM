import React, { useState } from 'react';
import { mutate } from '../api/client';
import { catalogs, field } from './catalogs';
import { ErrorNotice, Input, Modal, Pager, Row, Table, key, useList } from './components';
import { ItemImage } from './ItemImage';

export function CatalogPage({ table, canWrite }: { table: string; canWrite: boolean }) {
  const [imageItem, setImageItem] = useState<Row | null>(null);
  const spec = catalogs[table]; const [revision, setRevision] = useState(0); const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
  const list = useList(`/catalog/${table}?q=${encodeURIComponent(search)}`, revision);
  const [editing, setEditing] = useState<Row | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const payload = Object.fromEntries(spec.fields.map(f => [f.key, editing![f.key] === '' ? null : editing![f.key]]));
      if (table !== 'prices') payload.active = !!editing!.active;
      await mutate(`/catalog/${table}${editing!.id ? `/${editing!.id}` : ''}`, payload, key(), editing!.id ? 'PUT' : 'POST'); setEditing(null); setRevision(n => n + 1);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <><div className="toolbar"><form onSubmit={e => { e.preventDefault(); setSearch(query); }}><input aria-label="Buscar" placeholder="Buscar por nombre o código…" value={query} onChange={e => setQuery(e.target.value)} /><button>Buscar</button></form>{canWrite && <button className="primary" onClick={() => { setError(''); setEditing({ active: true, purchase_price: '0', sale_price: '0', min_stock: '0', currency: 'PEN' }); }}>+ Nuevo registro</button>}</div>
    <ErrorNotice error={list.error} />{list.loading && <p aria-live="polite">Cargando…</p>}
    <Table rows={list.data.data} columns={[...spec.fields.slice(0, 5).map(f => [f.key, f.label] as [string, string]), ...(table !== 'prices' ? [['active', 'Estado'] as [string, string]] : [])]} action={row => <>{canWrite && <button onClick={() => { setError(''); setEditing({ ...row }); }}>Editar</button>}{table === 'items' && canWrite && <button onClick={() => setImageItem(row)}>Imagen</button>}{table === 'items' && <a className="button" href={`/api/v1/items/${row.id}/barcode`} target="_blank" rel="noreferrer">Etiqueta</a>}</>} />
    <Pager {...list} />
    {imageItem && <ItemImage item={imageItem} close={() => setImageItem(null)} done={() => setRevision(n => n + 1)} />}
    {editing && <Modal title={editing.id ? `Editar · ${spec.title}` : `Nuevo · ${spec.title}`} close={() => !busy && setEditing(null)}><form onSubmit={save}><ErrorNotice error={error} /><div className="form-grid">{spec.fields.map(f => <Input key={f.key} field={f} value={editing[f.key]} onChange={v => setEditing({ ...editing, [f.key]: v })} />)}{table !== 'prices' && <label className="check"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Activo</label>}</div><footer><button type="button" onClick={() => setEditing(null)} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button></footer></form></Modal>}
  </>;
}
