import React, { useState } from 'react';
import { apiFetch, mutate } from '../api/client';
import { EmailDocument } from './EmailDocument';
import { docNames, field } from './catalogs';
import { ErrorNotice, Input, Modal, Pager, Row, Table, key, money, today, useList } from './components';

type Can = (right: string) => boolean;
export function DocumentsPage({ type, can }: { type: string; can: Can }) {
  const [revision, setRevision] = useState(0); const list = useList(`/documents/type/${type}`, revision);
  const [creating, setCreating] = useState<string | null>(null); const [detail, setDetail] = useState<Row | null>(null); const [error, setError] = useState('');
  async function open(id: number) { try { setError(''); setDetail(await apiFetch(`/documents/${id}`)); } catch (e: any) { setError(e.message); } }
  const writable = type === 'purchase' ? can('purchase.write') : can('sales.write');
  return <><div className="toolbar"><p>{type === 'invoice' ? 'Documentos comerciales internos. No constituyen emisión fiscal electrónica.' : 'Operaciones con trazabilidad por documento y línea.'}</p>{['order', 'purchase'].includes(type) && writable && <button className="primary" onClick={() => setCreating(type)}>+ {type === 'order' ? 'Nuevo pedido' : 'Nueva compra'}</button>}{type === 'invoice' && can('sales.write') && can('invoice.write') && <button className="primary" onClick={() => setCreating('direct-sale')}>+ Venta directa</button>}</div><ErrorNotice error={error || list.error} />
    <Table rows={list.data.data} columns={ [['number', 'Número'], ['date', 'Fecha'], ['currency', 'Moneda'], ['total', 'Total'], ['paid', 'Cobrado'], ['status', 'Estado']] } action={row => <button onClick={() => open(row.id)}>Ver detalle</button>} /><Pager {...list} />
    {creating && <NewDocument type={creating} close={() => setCreating(null)} done={doc => { setCreating(null); setRevision(n => n + 1); setDetail(doc); }} />}
    {detail && <DocumentDetail doc={detail} can={can} close={() => setDetail(null)} changed={async () => { setRevision(n => n + 1); await open(detail.id); }} />}
  </>;
}

function NewDocument({ type, close, done }: { type: string; close: () => void; done: (d: Row) => void }) {
  const [data, setData] = useState<Row>({ date: today(), currency: 'PEN' });
  const [lines, setLines] = useState<Row[]>([{ item_id: '', quantity: '1', unit_price: '0', discount_percent: '0', tax_percent: '0' }]);
  const [requestKey, setRequestKey] = useState(key()); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  function changeData(k: string, v: any) { setRequestKey(key()); setData(d => ({ ...d, [k]: v })); }
  function changeLine(i: number, k: string, v: any) { setRequestKey(key()); setLines(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l)); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { done(await mutate(`/documents/type/${type}`, { ...data, lines }, requestKey)); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal title={type === 'direct-sale' ? 'Venta directa' : `Nuevo · ${docNames[type]}`} close={() => !busy && close()}><form onSubmit={save}><ErrorNotice error={error} /><div className="form-grid">
    <Input field={field(type === 'purchase' ? 'supplier_id' : 'customer_id', type === 'purchase' ? 'Proveedor' : 'Cliente', { required: true, source: type === 'purchase' ? 'suppliers' : 'customers' })} value={data[type === 'purchase' ? 'supplier_id' : 'customer_id']} onChange={v => changeData(type === 'purchase' ? 'supplier_id' : 'customer_id', v)} />
    <Input field={field('location_id', 'Almacén', { required: true, source: 'locations' })} value={data.location_id} onChange={v => changeData('location_id', v)} />
    {type !== 'purchase' && <Input field={field('branch_id', 'Sucursal del cliente', { source: 'branches' })} value={data.branch_id} onChange={v => changeData('branch_id', v)} />}
    <Input field={field('date', 'Fecha', { required: true, type: 'date' })} value={data.date} onChange={v => changeData('date', v)} />
    <Input field={field('currency', 'Moneda', { required: true, options: ['PEN', 'USD', 'EUR'] })} value={data.currency} onChange={v => changeData('currency', v)} />
    <Input field={field('notes', 'Observaciones')} value={data.notes} onChange={v => changeData('notes', v)} />
  </div><h3>Artículos</h3>{lines.map((line, i) => <div className="line-editor" key={i}>
    <Input field={field('item_id', 'Producto', { required: true, source: 'items' })} value={line.item_id} onChange={v => changeLine(i, 'item_id', v)} />
    {[[ 'quantity', 'Cantidad', '0.001'], ['unit_price', 'Precio', '0.01'], ['discount_percent', 'Descuento %', '0.01'], ['tax_percent', 'Impuesto %', '0.01']].map(([k, label, step]) => <Input key={k} field={field(k, label, { type: 'number', step, required: true })} value={line[k]} onChange={v => changeLine(i, k, v)} />)}
    <button type="button" aria-label={`Quitar línea ${i + 1}`} disabled={lines.length === 1 || busy} onClick={() => { setLines(lines.filter((_, j) => j !== i)); setRequestKey(key()); }}>×</button>
  </div>)}<button type="button" disabled={busy} onClick={() => { setLines([...lines, { item_id: '', quantity: '1', unit_price: '0', discount_percent: '0', tax_percent: '0' }]); setRequestKey(key()); }}>+ Añadir artículo</button><p className="muted">Precios e impuestos se confirman por línea. El servidor calcula y valida todos los totales.</p><footer><button type="button" disabled={busy} onClick={close}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar documento'}</button></footer></form></Modal>;
}

export function DocumentDetail({ doc, can, close, changed }: { doc: Row; can: Can; close: () => void; changed: () => Promise<void> }) {
  const [action, setAction] = useState(''); const [data, setData] = useState<Row>({ date: today() }); const [quantities, setQuantities] = useState<Row>({});
  const [requestKey, setRequestKey] = useState(key()); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const derived = ['receipt', 'invoice', 'shipment'].includes(action);
  const labels: Row = { receipt: 'Recibir mercadería', invoice: 'Facturar', shipment: 'Preparar despacho', pay: 'Registrar cobro', cancel: 'Anular documento', deliver: 'Confirmar entrega' };
  const available: [string, string][] = [];
  if (doc.status !== 'cancelled') {
    if (doc.type === 'purchase' && can('purchase.write')) available.push(['receipt', labels.receipt]);
    if (doc.type === 'order' && can('invoice.write')) available.push(['invoice', labels.invoice]);
    if (doc.type === 'order' && can('shipment.write')) available.push(['shipment', labels.shipment]);
    if (doc.type === 'invoice' && can('payment.write') && Number(doc.paid) < Number(doc.total)) available.push(['pay', labels.pay]);
    if (doc.type === 'shipment' && doc.status === 'packed' && can('shipment.write')) available.push(['deliver', labels.deliver]);
    if (can('cancel')) available.push(['cancel', labels.cancel]);
  }
  function begin(a: string) {
    setAction(a); setError(''); setRequestKey(key()); setData({ date: today(), amount: (Number(doc.total) - Number(doc.paid)).toFixed(2) });
    setQuantities(Object.fromEntries(doc.lines.map((l: Row) => [l.id, Math.max(0, (a === 'shipment' ? Number(l.invoice_quantity) : Number(l.quantity)) - Number(l[`${a}_quantity`] ?? 0)).toFixed(3)])));
  }
  function change(k: string, v: any) { setRequestKey(key()); setData(d => ({ ...d, [k]: v })); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      let body: Row = action === 'deliver' ? {} : action === 'cancel' ? { reason: data.reason } : action === 'pay' ? { date: data.date, amount: data.amount, payment_method_id: data.payment_method_id, reference: data.reference } : { date: data.date, ...(data.due_date ? { due_date: data.due_date } : {}), lines: doc.lines.filter((l: Row) => Number(quantities[l.id]) > 0).map((l: Row) => ({ line_id: l.id, quantity: quantities[l.id] })) };
      await mutate(`/documents/${doc.id}/${derived ? `derive/${action}` : action}`, body, requestKey);
      setAction(''); await changed();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal title={`${doc.number} · ${docNames[doc.type]}`} close={() => !busy && close()}><ErrorNotice error={error} /><div className="document-meta"><strong>{doc.party_snapshot?.name}</strong><span>{doc.date}</span><span>{doc.currency}</span><strong>{money(doc.total, doc.currency)}</strong></div>
    <Table rows={doc.lines} columns={ [['description', 'Producto'], ['quantity', 'Cantidad'], ['unit_price', 'Precio'], ['discount_percent', 'Dto. %'], ['tax_percent', 'Imp. %'], ['total', 'Total'], ...(doc.type === 'order' ? [['invoice_quantity', 'Facturado'], ['shipment_quantity', 'Despachado']] : doc.type === 'purchase' ? [['receipt_quantity', 'Recibido']] : [])] as [string, string][] } />
    <div className="document-totals">Base: {money(doc.subtotal, doc.currency)} · Impuestos: {money(doc.tax_total, doc.currency)} · Cobrado: {money(doc.paid, doc.currency)}</div>
    <div className="actions document-actions">{available.map(([a, label]) => <button key={a} disabled={busy} onClick={() => begin(a)}>{label}</button>)}{can(doc.type === 'purchase' || doc.type === 'receipt' ? 'purchase.write' : doc.type === 'invoice' ? 'invoice.write' : doc.type === 'shipment' ? 'shipment.write' : 'sales.write') && <button onClick={() => { setEmailOpen(!emailOpen); setAction(''); }}>Enviar por correo</button>}<a className="button" href={`/api/v1/documents/${doc.id}/pdf`} target="_blank" rel="noreferrer">Imprimir / PDF</a></div>
    {emailOpen && <EmailDocument doc={doc} close={() => setEmailOpen(false)} />}
    {action && <form className="action-form" onSubmit={submit}><h3>{labels[action]}</h3>{derived && <><Input field={field('date', 'Fecha', { required: true, type: 'date' })} value={data.date} onChange={v => change('date', v)} />{action === 'invoice' && <Input field={field('due_date', 'Vencimiento', { type: 'date' })} value={data.due_date} onChange={v => change('due_date', v)} />}{doc.lines.map((l: Row) => <Input key={l.id} field={field(String(l.id), `${l.description} · Cantidad a procesar`, { type: 'number', step: '0.001', required: true })} value={quantities[l.id]} onChange={v => { setRequestKey(key()); setQuantities({ ...quantities, [l.id]: v }); }} />)}<p className="muted">Deja en cero las líneas que no deseas procesar. Se verifican los pendientes en el servidor.</p></>}
      {action === 'pay' && <div className="form-grid">{[field('amount', 'Importe', { required: true, type: 'number', step: '0.01' }), field('date', 'Fecha', { required: true, type: 'date' }), field('payment_method_id', 'Medio de pago', { required: true, source: 'payment_methods' }), field('reference', 'Referencia')].map(f => <Input key={f.key} field={f} value={data[f.key]} onChange={v => change(f.key, v)} />)}</div>}
      {action === 'cancel' && <Input field={field('reason', 'Motivo de anulación', { required: true })} value={data.reason} onChange={v => change('reason', v)} />}
      {action === 'deliver' && <p>Confirma que la mercadería fue entregada al cliente.</p>}<footer><button type="button" disabled={busy} onClick={() => setAction('')}>Volver</button><button className="primary" disabled={busy}>{busy ? 'Procesando…' : 'Confirmar'}</button></footer></form>}
    {doc.children.length > 0 && <><h3>Documentos relacionados</h3><Table rows={doc.children} columns={ [['number', 'Número'], ['date', 'Fecha'], ['total', 'Total'], ['status', 'Estado']] } /></>}
    {doc.payments.length > 0 && <><h3>Cobros</h3><Table rows={doc.payments} columns={ [['number', 'Recibo'], ['date', 'Fecha'], ['amount', 'Importe'], ['status', 'Estado']] } /></>}
    {doc.cancellation_reason && <p className="notice">Motivo de anulación: {doc.cancellation_reason}</p>}
  </Modal>;
}
