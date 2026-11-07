import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Truck, Search, Calendar, MapPin, PackageCheck, AlertCircle } from 'lucide-react';

interface ReceivesViewProps {
  onNavigate?: (view: string) => void;
}

export const ReceivesView: React.FC<ReceivesViewProps> = ({ onNavigate }) => {
  const [receives, setReceives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReceives();
  }, []);

  async function loadReceives() {
    try {
      setLoading(true);
      const res = await apiFetch<any>('/receives');
      setReceives(res.receives || []);
    } catch (err) {
      console.error('Error cargando recepciones de compra:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = receives.filter(r =>
    (r.receive_number || r.id || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.order_reference || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.location_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Recepciones de Compra</h2>
          <p className="text-sm text-slate-500">Historial de mercancía ingresada al almacén desde órdenes de compra (Stockpile Parity).</p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('purchases')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-brand-500/20"
          >
            <Truck className="w-4 h-4" />
            Gestionar Órdenes de Compra
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por guía de recepción, orden de compra o almacén..."
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
                <th className="py-3 px-4">Guía / Recepción</th>
                <th className="py-3 px-4">Orden de Compra</th>
                <th className="py-3 px-4">Almacén Destino</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Ítems Recibidos</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Cargando historial de recepciones...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se han registrado recepciones físicas de compra aún.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-brand-600" />
                        <span>{r.receive_number || r.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {r.order_reference || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.location_id || 'PL'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.receive_date || (r.created_at ? new Date(r.created_at._seconds ? r.created_at._seconds * 1000 : r.created_at).toLocaleDateString() : 'Hoy')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {Array.isArray(r.items) ? (
                        <span>{r.items.reduce((acc: number, it: any) => acc + (it.received_quantity || it.quantity || 0), 0)} unidades</span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <PackageCheck className="w-3 h-3 text-emerald-600" />
                        Ingresado a Stock
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
