import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Truck, CheckCircle2, Clock } from 'lucide-react';

export const ShipmentsView: React.FC = () => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShipments = async () => {
    try {
      const res = await apiFetch<any>('/shipments');
      setShipments(res.shipments || []);
    } catch (err) {
      console.error('Error cargando despachos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const handleDeliver = async (shipmentId: string) => {
    try {
      await apiFetch(`/shipments/${shipmentId}/deliver`, { method: 'POST' });
      loadShipments();
    } catch (err: any) {
      alert(`Error confirmando entrega: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Despachos y Guías de Remisión</h2>
        <p className="text-slate-500 text-sm">Control logístico y seguimiento de pedidos despachados</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando despachos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Nº Guía</th>
                  <th className="px-6 py-3">Ref. Pedido</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Dirección de Entrega</th>
                  <th className="px-6 py-3">Transportista</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{s.shipment_number}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.order_number}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{s.customer_name}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">{s.shipping_address}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">{s.carrier} ({s.tracking_number || 'S/T'})</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {s.status === 'delivered' ? 'ENTREGADO' : 'DESPACHADO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.status !== 'delivered' && (
                        <button
                          onClick={() => handleDeliver(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"
                        >
                          Confirmar Entrega
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
