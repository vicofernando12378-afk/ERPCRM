import React, { useEffect, useState } from 'react';
import { Boxes, LayoutDashboard, Package, ShoppingCart, Truck, CreditCard, Users, Settings, LogOut, BarChart3, Menu } from 'lucide-react';
import { apiFetch } from '../api/client';
import { catalogs, docNames, field } from './catalogs';
import { ErrorNotice, Input, Row } from './components';
import { CatalogPage } from './CatalogPage';
import { DocumentsPage } from './DocumentsPage';
import { DashboardPage, InventoryPage, PaymentsPage, ReportsPage } from './OperationsPages';
import { AuditPage, SettingsPage, UsersPage } from './AdminPages';
import { ImportPage } from './ImportPage';
import { RolesPage } from './RolesPage';
import { RecoveryForm } from './RecoveryForm';
import './erp.css';

export default function ErpApp() {
  const [recovery, setRecovery] = useState(new URLSearchParams(location.search).has('reset_token'));
  const [session, setSession] = useState<Row | null>(null); const [initializing, setInitializing] = useState(true); const [view, setView] = useState('dashboard'); const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch('/me').then(result => { if (result.user && Array.isArray(result.permissions)) setSession(result); }).catch(e => { if (e.status !== 401) setError(e.message); }).finally(() => setInitializing(false));
    const reset = () => { setSession(null); setView('dashboard'); }; window.addEventListener('erp:unauthorized', reset); return () => window.removeEventListener('erp:unauthorized', reset);
  }, []);
  async function login(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { setSession(await apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) })); setPassword(''); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  async function logout() { try { await apiFetch('/logout', { method: 'POST' }); setSession(null); setView('dashboard'); } catch (e: any) { setError(e.message); } }
  if (initializing) return <div className="login-screen"><p>Cargando sesión…</p></div>;
  if (!session && recovery) return <div className="login-screen"><RecoveryForm close={() => setRecovery(false)} /></div>;
  if (!session) return <div className="login-screen"><div className="login-brand"><Boxes size={44} /><span>ERP<span className="brand-dot">.</span></span><h1>Todo tu negocio.<br />Una operación conectada.</h1><p>Inventario, compras, ventas y cobranza.</p></div><form className="login-card" onSubmit={login}><span className="eyebrow">ACCESO SEGURO</span><h2>Bienvenido</h2><p>Ingresa con tu cuenta de trabajo.</p><ErrorNotice error={error} /><Input field={field('email', 'Correo electrónico', { required: true, type: 'email' })} value={email} onChange={setEmail} /><Input field={field('password', 'Contraseña', { required: true, type: 'password' })} value={password} onChange={setPassword} /><button className="primary" disabled={busy}>{busy ? 'Ingresando…' : 'Iniciar sesión'}</button><button type="button" style={{ marginTop: 16, width: '100%' }} onClick={() => setRecovery(true)}>Olvidé mi contraseña</button></form></div>;
  const can = (permission: string) => session.permissions.includes('*') || session.permissions.includes(permission);
  const customer = session.user.role === 'customer';
  const nav: { key: string; title: string; icon?: any; group?: string }[] = [{ key: 'dashboard', title: 'Vista general', icon: LayoutDashboard }, ...(!customer ? [{ key: 'catalog:items', title: 'Productos', icon: Package }, { key: 'stock', title: 'Existencias', icon: Boxes }, { key: 'moves', title: 'Movimientos', icon: Boxes }, { key: 'catalog:customers', title: 'Clientes', icon: Users }, { key: 'catalog:suppliers', title: 'Proveedores', icon: Users }, { key: 'doc:purchase', title: 'Compras', icon: ShoppingCart }, { key: 'doc:receipt', title: 'Recepciones', icon: Truck }] : []), { key: 'doc:order', title: 'Pedidos', icon: ShoppingCart }, { key: 'doc:invoice', title: 'Facturas internas', icon: CreditCard }, { key: 'payments', title: 'Cobros', icon: CreditCard }, { key: 'doc:shipment', title: 'Despachos', icon: Truck }, ...(can('catalog.write') ? [{ key: 'imports', title: 'Importar CSV', icon: Package }] : []), ...(can('reports') ? [{ key: 'reports', title: 'Reportes', icon: BarChart3 }] : []), ...(!customer ? Object.entries(catalogs).filter(([k]) => !['items', 'customers', 'suppliers'].includes(k)).map(([k, v]) => ({ key: `catalog:${k}`, title: v.title, group: 'Configuración' })) : []), ...(can('admin') ? [{ key: 'users', title: 'Usuarios', icon: Users }, { key: 'roles', title: 'Roles y permisos', icon: Users }, { key: 'settings', title: 'Empresa', icon: Settings }, { key: 'audit', title: 'Auditoría', icon: Settings }] : []), { key: 'profile', title: 'Mi contraseña', icon: Settings }];
  const title = nav.find(n => n.key === view)?.title ?? 'ERP';
  const page = view === 'dashboard' ? <DashboardPage /> : view.startsWith('catalog:') ? <CatalogPage table={view.split(':')[1]} canWrite={can('catalog.write')} /> : view.startsWith('doc:') ? <DocumentsPage type={view.split(':')[1]} can={can} /> : ['stock', 'moves'].includes(view) ? <InventoryPage movements={view === 'moves'} canWrite={can('inventory.write')} /> : view === 'payments' ? <PaymentsPage canCancel={can('cancel')} /> : view === 'imports' ? <ImportPage /> : view === 'reports' ? <ReportsPage /> : view === 'roles' ? <RolesPage /> : view === 'users' ? <UsersPage /> : view === 'audit' ? <AuditPage /> : <SettingsPage profile={view === 'profile'} />;
  return <div className="erp-shell"><aside className={menuOpen ? 'open' : ''}><div className="erp-logo"><Boxes /><strong>ERP<span>.</span></strong><small>GESTIÓN</small></div><nav>{nav.map(n => <button key={n.key} className={view === n.key ? 'selected' : ''} onClick={() => { setView(n.key); setMenuOpen(false); }}>{n.icon ? <n.icon size={17} /> : <span className="nav-dot" />}{n.title}</button>)}</nav><div className="user-card"><strong>{session.user.name}</strong><small>{session.user.email}</small><button onClick={logout}><LogOut size={15} /> Cerrar sesión</button></div></aside><div className="erp-workspace"><header className="topbar"><button className="mobile-menu" aria-label="Menú" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button><div><span className="eyebrow">{customer ? 'PORTAL DEL CLIENTE' : 'CENTRO DE OPERACIONES'}</span><h1>{title}</h1></div><span className="role-pill">{session.user.role}</span></header><main key={view}>{error && <ErrorNotice error={error} />}{page}</main></div></div>;
}
