import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import { ErrorNotice, Modal, Row } from './components';
export function ItemImage({ item, close, done }: { item: Row; close: () => void; done: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) { e.preventDefault(); if (!file) return; setBusy(true); try { const form = new FormData(); form.set('file', file); await apiFetch(`/items/${item.id}/image`, { method: 'POST', body: form }); done(); close(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  return <Modal title={`Imagen · ${item.name}`} close={() => !busy && close()}><ErrorNotice error={error} />{item.image_path && <img alt={item.name} src={`/api/v1/items/${item.id}/image`} style={{ maxWidth: 300, maxHeight: 250, objectFit: 'contain', marginBottom: 20 }} />}<form onSubmit={save}><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Imagen del producto" onChange={e => setFile(e.target.files?.[0] ?? null)} /><p className="muted">JPEG, PNG o WebP; máximo 4 MB y 6000 × 6000 píxeles.</p><footer><button className="primary" disabled={busy || !file}>Guardar imagen</button></footer></form></Modal>;
}
