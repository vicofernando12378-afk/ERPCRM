import React, { useEffect, useState } from 'react';
import { apiFetch, mutate } from '../api/client';
import { field } from './catalogs';
import { ErrorNotice, Input, Modal, Pager, Row, Table, key, useList } from './components';

export function SettingsPage({ profile = false }: { profile?: boolean }) {
  const [data, setData] = useState<Row>({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [success, setSuccess] = useState('');
  useEffect(() => { if (!profile) apiFetch('/settings').then(setData).catch(e => setError(e.message)); }, [profile]);
  const fields = profile ? [field('current_password', 'Contraseña actual', { type: 'password', required: true }), field('password', 'Nueva contraseña (12 caracteres, letras y números)', { type: 'password', required: true }), field('password_confirmation', 'Repetir contraseña', { type: 'password', required: true })] : [field('name', 'Razón social / nombre', { required: true }), field('tax_id', 'Identificación fiscal'), field('address', 'Dirección'), field('email', 'Correo', { type: 'email' }), field('phone', 'Teléfono'), field('currency', 'Moneda principal', { options: ['PEN', 'USD', 'EUR'], required: true })];
  async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); setSuccess(''); setError(''); try { await mutate(profile ? '/password' : '/settings', data, key(), profile ? 'POST' : 'PUT'); setSuccess('Cambios guardados.'); if (profile) setData({}); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  return <form className="settings-form" onSubmit={save}><ErrorNotice error={error} />{success && <p className="notice success">{success}</p>}<div className="form-grid">{fields.map(f => <Input key={f.key} field={f} value={data[f.key]} onChange={v => setData({ ...data, [f.key]: v })} />)}</div><footer><button className="primary" disabled={busy}>Guardar cambios</button></footer></form>;
}

export function UsersPage() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => { apiFetch('/roles').then(r => setRoles(r.data.map((role: Row) => role.slug))).catch(() => {}); }, []);
  const [revision, setRevision] = useState(0); const list = useList('/users', revision); const [edit, setEdit] = useState<Row | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { const data = Object.fromEntries(['name', 'email', 'role', 'active', 'customer_id', 'password'].map(k => [k, edit![k] ?? null])); await mutate(`/users${edit!.id ? '/' + edit!.id : ''}`, data, key(), edit!.id ? 'PUT' : 'POST'); setEdit(null); setRevision(n => n + 1); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  const fields = [field('name', 'Nombre', { required: true }), field('email', 'Correo', { required: true, type: 'email' }), field('role', 'Rol', { required: true, options: roles }), field('password', 'Contraseña (12 caracteres, letras y números)', { required: !edit?.id, type: 'password' }), ...(edit?.role === 'customer' ? [field('customer_id', 'Cliente asociado', { required: true, source: 'customers' })] : [])];
  return <><div className="toolbar"><p>Admin: administración · Manager: operación completa · Sales: ventas · Warehouse: almacén · Finance: cobros · Customer: portal.</p><button className="primary" onClick={() => { setError(''); setEdit({ role: 'sales', active: true }); }}>+ Usuario</button></div><ErrorNotice error={list.error} /><Table rows={list.data.data} columns={ [['name', 'Nombre'], ['email', 'Correo'], ['role', 'Rol'], ['active', 'Estado']] } action={row => <button onClick={() => { setError(''); setEdit({ ...row }); }}>Editar</button>} /><Pager {...list} />{edit && <Modal title={edit.id ? 'Editar usuario' : 'Nuevo usuario'} close={() => !busy && setEdit(null)}><form onSubmit={save}><ErrorNotice error={error} /><div className="form-grid">{fields.map(f => <Input key={f.key} field={f} value={edit[f.key]} onChange={v => setEdit({ ...edit, [f.key]: v })} />)}<label className="check"><input type="checkbox" checked={!!edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} /> Activo</label></div><footer><button className="primary" disabled={busy}>Guardar usuario</button></footer></form></Modal>}</>;
}

export function AuditPage() {
  const list = useList('/audit', 0);
  return <><ErrorNotice error={list.error} /><Table rows={list.data.data} columns={ [['created_at', 'Fecha'], ['user_id', 'Usuario'], ['action', 'Acción'], ['entity', 'Entidad'], ['entity_id', 'Registro'], ['details', 'Detalle']] } /><Pager {...list} /></>;
}
