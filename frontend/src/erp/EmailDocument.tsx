import React, { useState } from 'react';
import { mutate } from '../api/client';
import { field } from './catalogs';
import { ErrorNotice, Input, Row, key } from './components';

export function EmailDocument({ doc, close }: { doc: Row; close: () => void }) {
  const [data, setData] = useState<Row>({ to: doc.party_snapshot?.email ?? '', subject: `Documento ${doc.number}`, message: `Adjuntamos el documento ${doc.number}.` }); const [requestKey, setRequestKey] = useState(key()); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function send(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { const r = await mutate(`/documents/${doc.id}/email`, data, requestKey); setSuccess(r.message); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  return <form className="action-form" onSubmit={send}><h3>Enviar documento por correo</h3><ErrorNotice error={error} />{success ? <p className="notice success">{success}</p> : <>{[field('to', 'Destinatario', { type: 'email', required: true }), field('subject', 'Asunto', { required: true }), field('message', 'Mensaje', { required: true })].map(f => <Input key={f.key} field={f} value={data[f.key]} onChange={v => { setData({ ...data, [f.key]: v }); setRequestKey(key()); }} />)}<p className="muted">Se enviará una copia PDF al destinatario indicado.</p></>}<footer><button type="button" disabled={busy} onClick={close}>Cerrar</button>{!success && <button className="primary" disabled={busy}>Confirmar envío</button>}</footer></form>;
}
