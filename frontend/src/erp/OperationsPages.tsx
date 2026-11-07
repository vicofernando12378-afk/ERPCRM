import React, { useEffect, useState } from 'react';
import { apiFetch, mutate } from '../api/client';
import { field } from './catalogs';
import { ErrorNotice, Input, Modal, Pager, Row, Table, key, money, useList } from './components';

export function InventoryPage({ movements, canWrite }: { movements: boolean; canWrite: boolean }) {
  const [revision, setRevision] = useState(0); const list = useList(movements ? '/stock/moves' : '/stock', revision);
  const [action, setAction] = useState(''); const [data, setData] = useState<Row>({ quantity: '1' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [requestKey, setRequestKey] = useState(key());
  function begin(a: string) { setAction(a); setData({ quantity: '1' }); setError(''); setRequestKey(key()); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const payload = action === 'transfer' ? { from_location_id: data.from_location_id, to_location_id: data.to_location_id, reason: data.reason, lines: [{ item_id: data.item_id, quantity: data.quantity }] } : data;
      await mutate(`/stock/${action}`, payload, requestKey); setAction(''); setRevision(n => n + 1);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  const fields = [field('item_id', 'Producto', { source: 'items', required: true }), ...(action === 'transfer' ? [field('from_location_id', 'Origen', { source: 'locations', required: true }), field('to_location_id', 'Destino', { source: 'locations', required: true })] : [field('location_id', 'Almacén', { source: 'locations', required: true })]), field('quantity', action === 'adjust' ? 'Cantidad (+ ingreso / − salida)' : 'Cantidad', { type: 'number', step: '0.001', required: true }), field('reason', 'Motivo', { required: true })];
  return <><div className="toolbar"><p>El stock se modifica mediante operaciones auditables.</p>{canWrite && <div className="actions"><button onClick={() => begin('adjust')}>Ajustar stock</button><button className="primary" onClick={() => begin('transfer')}>Transferir</button></div>}</div><ErrorNotice error={list.error} />
    <Table rows={list.data.data} columns={movements ? [['sku', 'SKU'], ['name', 'Producto'], ['location_name', 'Almacén'], ['type', 'Movimiento'], ['quantity', 'Cantidad'], ['balance_after', 'Saldo'], ['reason', 'Motivo']] : [['sku', 'SKU'], ['name', 'Producto'], ['location_name', 'Almacén'], ['quantity', 'Existencia'], ['min_stock', 'Mínimo']]} /><Pager {...list} />
    {action && <Modal title={action === 'transfer' ? 'Transferir existencias' : 'Ajuste de inventario'} close={() => !busy && setAction('')}><form onSubmit={save}><ErrorNotice error={error} /><div className="form-grid">{fields.map(f => <Input key={f.key} field={f} value={data[f.key]} onChange={v => { setData({ ...data, [f.key]: v }); setRequestKey(key()); }} />)}</div><footer><button type="button" onClick={() => setAction('')} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>Confirmar movimiento</button></footer></form></Modal>}
  </>;
}

export function PaymentsPage({ canCancel }: { canCancel: boolean }) {
  const [revision, setRevision] = useState(0); const list = useList('/payments', revision);
  const [selected, setSelected] = useState<Row | null>(null); const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [requestKey, setRequestKey] = useState(key());
  async function cancel(e: React.FormEvent) { e.preventDefault(); setBusy(true); try { await mutate(`/payments/${selected!.id}/cancel`, { reason }, requestKey); setSelected(null); setRevision(n => n + 1); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  return <><p className="muted">Los cobros se registran desde el detalle de cada factura.</p><ErrorNotice error={list.error} /><Table rows={list.data.data} columns={ [['number', 'Recibo'], ['invoice_number', 'Factura'], ['date', 'Fecha'], ['currency', 'Moneda'], ['amount', 'Importe'], ['reference', 'Referencia'], ['status', 'Estado']] } action={canCancel ? row => row.status !== 'cancelled' && <button onClick={() => { setSelected(row); setError(''); setReason(''); setRequestKey(key()); }}>Anular</button> : undefined} /><Pager {...list} />{selected && <Modal title={`Anular cobro ${selected.number}`} close={() => !busy && setSelected(null)}><form onSubmit={cancel}><ErrorNotice error={error} /><Input field={field('reason', 'Motivo', { required: true })} value={reason} onChange={v => { setReason(v); setRequestKey(key()); }} /><footer><button className="primary" disabled={busy}>Confirmar anulación</button></footer></form></Modal>}</>;
}

export function DashboardPage() {
  const [data, setData] = useState<Row | null>(null); const [error, setError] = useState('');
  useEffect(() => { apiFetch('/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  return <><ErrorNotice error={error} /><div className="intro"><span className="eyebrow">VISTA GENERAL</span><h2>Tu operación, en un solo lugar</h2><p>Pedidos, facturación y entregas con información consolidada.</p></div>{data ? <><div className="metrics">{[['orders', 'Pedidos'], ['invoices', 'Facturas'], ['shipments_pending', 'Despachos pendientes'], ['items', 'Productos activos']].filter(([k]) => data[k] !== null).map(([k, label]) => <article key={k}><span>{label}</span><strong>{data[k]}</strong></article>)}</div><h3>Facturación y cobranza por moneda</h3><div className="metrics">{data.totals.map((t: Row) => <article key={t.currency}><span>{t.currency} · Facturado</span><strong>{money(t.total, t.currency)}</strong><small>Cobrado: {money(t.paid, t.currency)}<br />Pendiente: {money(t.balance, t.currency)}</small></article>)}{!data.totals.length && <p className="empty">Aún no hay facturas confirmadas.</p>}</div><h3>Últimos documentos</h3><Table rows={data.recent} columns={ [['number', 'Documento'], ['date', 'Fecha'], ['currency', 'Moneda'], ['total', 'Total'], ['status', 'Estado']] } /></> : <p>Cargando indicadores…</p>}</>;
}

export function ReportsPage() {
  const [type, setType] = useState('sales'); const [data, setData] = useState<Row>({ data: [] }); const [error, setError] = useState(''); const [page, setPage] = useState(1);
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [filter, setFilter] = useState('');
  useEffect(() => { setError(''); apiFetch(`/reports/${type}?page=${page}${filter}`).then(setData).catch(e => setError(e.message)); }, [type, page, filter]);
  return <><div className="toolbar"><select aria-label="Reporte" value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="sales">Ventas y saldos</option><option value="inventory">Valoración de referencia</option></select><a className="button" href={`/api/v1/reports/export/${type}?${filter.replace(/^&/, '')}`}>Exportar CSV</a></div>{type === 'sales' ? <form className="toolbar" onSubmit={e => { e.preventDefault(); setPage(1); setFilter(`${from ? '&from=' + from : ''}${to ? '&to=' + to : ''}`); }}><Input field={field('from', 'Desde', { type: 'date' })} value={from} onChange={setFrom} /><Input field={field('to', 'Hasta', { type: 'date' })} value={to} onChange={setTo} /><button>Aplicar filtros</button></form> : <p className="notice">Valoración con precios actuales de catálogo. No representa costo contable histórico ni incluye conversión de moneda.</p>}<ErrorNotice error={error} />{type === 'sales' && <Table rows={data.totals ?? []} columns={ [['currency', 'Moneda'], ['documents', 'Facturas'], ['subtotal', 'Base'], ['taxes', 'Impuesto'], ['total', 'Total'], ['balance', 'Por cobrar']] } />}<Table rows={type === 'sales' ? data.rows?.data ?? [] : data.data ?? []} columns={type === 'sales' ? [['number', 'Factura'], ['date', 'Fecha'], ['currency', 'Moneda'], ['total', 'Total'], ['paid', 'Cobrado']] : [['sku', 'SKU'], ['name', 'Producto'], ['location', 'Almacén'], ['quantity', 'Cantidad'], ['reference_cost', 'Costo referencial'], ['reference_sale_value', 'Valor de venta']]} /><Pager data={type === 'sales' ? data.rows ?? {} : data} page={page} setPage={setPage} /></>;
}
