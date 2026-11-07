import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import { field } from './catalogs';
import { ErrorNotice, Input } from './components';

export function RecoveryForm({ close }: { close: () => void }) {
  const params = new URLSearchParams(location.search); const token = params.get('reset_token');
  const [email, setEmail] = useState(params.get('email') ?? ''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await apiFetch(token ? '/reset-password' : '/forgot-password', { method: 'POST', body: JSON.stringify(token ? { token, email, password, password_confirmation: confirmation } : { email }) }); setMessage(result.message); setPassword(''); setConfirmation(''); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <form className="login-card" onSubmit={submit}><span className="eyebrow">RECUPERAR ACCESO</span><h2>{token ? 'Nueva contraseña' : 'Restablecer contraseña'}</h2><ErrorNotice error={error} />{message ? <p className="notice success">{message}</p> : <><Input field={field('email', 'Correo electrónico', { required: true, type: 'email' })} value={email} onChange={setEmail} />{token && <><Input field={field('password', 'Nueva contraseña', { required: true, type: 'password' })} value={password} onChange={setPassword} /><Input field={field('confirmation', 'Repetir contraseña', { required: true, type: 'password' })} value={confirmation} onChange={setConfirmation} /></>}<button className="primary" disabled={busy}>{token ? 'Restablecer' : 'Enviar instrucciones'}</button></>}<button type="button" style={{ marginTop: 16 }} onClick={() => { history.replaceState(null, '', location.pathname); close(); }}>Volver al acceso</button></form>;
}
