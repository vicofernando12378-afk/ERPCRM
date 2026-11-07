import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { ArrowLeftRight, Search, Calendar, MapPin, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';

export const TransfersView: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    stock_id: '',
    from_location: 'PL',
    to_location: 'JA',
    quantity: 1,
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [transfersRes, itemsRes, locRes] = await Promise.all([
        apiFetch<any>('/transfers'),
        apiFetch<any>('/items'),
        apiFetch<any>('/locations'),
      ]);
      setTransfers(transfersRes.transfers || []);
      setItems(itemsRes.items || []);
      setLocations(locRes.locations || []);
      if (itemsRes.items?.length > 0) {
        setForm(f => ({ ...f, stock_id: itemsRes.items[0].stock_id }));
      }
    } catch (err) {
      console.error('Error cargando traslados:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (form.from_location === form.to_location) {
      alert('El almacén de origen y destino deben ser diferentes.');
      return;
    }
    try {
      setSubmitting(true);
      await apiFetch('/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify({
          stock_id: form.stock_id,
          from_location: form.from_location,
          to_location: form.to_location,
          quantity: Number(form.quantity),
          reference: form.reference || `TR-${Date.now()}`,
          notes: form.notes,
        }),
      });
      setIsModalOpen(false);
      setForm(f => ({ ...f, quantity: 1, notes: '', reference: '' }));
      await loadData();
    } catch (err: any) {
      alert(`Error ejecutando traslado: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = transfers.filter(t =>
    (t.stock_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.reference || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.from_location || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.to_location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Traslados de Inventario</h2>
          <p className="text-sm text-slate-500">Movimientos y transferencias físicas entre almacenes y sedes (Stockpile Parity).</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Traslado
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por referencia, ítem o sede..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4">Ítem / Código</th>
                <th className="py-3 px-4">Origen ➔ Destino</th>
                <th className="py-3 px-4">Cantidad</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No hay traslados de inventario registrados.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                        <span>{t.reference || t.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {t.stock_id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {t.from_location}
                        </span>
                        <span className="text-slate-400">➔</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t.to_location}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {t.quantity} un.
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.timestamp ? new Date(t.timestamp._seconds ? t.timestamp._seconds * 1000 : t.timestamp).toLocaleDateString() : 'Hoy'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completado
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Traslado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Nuevo Traslado entre Almacenes</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Producto a Trasladar *</label>
                <select
                  required
                  value={form.stock_id}
                  onChange={(e) => setForm({ ...form, stock_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {items.map(it => (
                    <option key={it.id} value={it.stock_id}>
                      {it.description} ({it.stock_id}) - Stock Total: {it.total_stock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Almacén Origen</label>
                  <select
                    value={form.from_location}
                    onChange={(e) => setForm({ ...form, from_location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Almacén Destino</label>
                  <select
                    value={form.to_location}
                    onChange={(e) => setForm({ ...form, to_location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cantidad *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Referencia</label>
                  <input
                    type="text"
                    placeholder="TR-2026-001"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notas / Motivo</label>
                <input
                  type="text"
                  placeholder="Reposición por baja de stock en sucursal"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Traslado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
