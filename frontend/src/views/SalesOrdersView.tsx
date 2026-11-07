import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Plus, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';

export const SalesOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Order Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer_id: 'CUST-1',
    customer_name: 'Danilo',
    location_id: 'PL',
    stock_id: '1',
    description: 'Arena',
    quantity: 5,
    unit_price: 15,
  });

  const loadOrders = async () => {
    try {
      const res = await apiFetch<any>('/orders');
      setOrders(res.orders || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleInvoiceOrder = async (orderId: string, orderNumber: string) => {
    try {
      const res = await apiFetch<any>(`/orders/${orderId}/invoice`, {
        method: 'POST',
        body: JSON.stringify({ user_id: 'web-user' })
      });
      setFeedback({ 
        type: 'success', 
        text: `¡Pedido ${orderNumber} facturado con éxito! Factura generada: ${res.invoice?.invoice_number}. Stock descontado automáticamente.` 
      });
      loadOrders();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: newOrder.customer_id,
          customer_name: newOrder.customer_name,
          location_id: newOrder.location_id,
          items: [
            {
              stock_id: newOrder.stock_id,
              description: newOrder.description,
              quantity: Number(newOrder.quantity),
              unit_price: Number(newOrder.unit_price)
            }
          ]
        })
      });
      setFeedback({ type: 'success', text: 'Nuevo Pedido de Venta creado correctamente.' });
      setModalOpen(false);
      loadOrders();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto text-xs underline font-normal">Cerrar</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Órdenes de Venta y Cotizaciones</h2>
          <p className="text-slate-500 text-sm">Circuito comercial: Pedido ➔ Facturación atómica con descuento de inventario</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-500 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Pedido de Venta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando pedidos de venta...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Nº Orden</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Almacén</th>
                  <th className="px-6 py-3">Ítems</th>
                  <th className="px-6 py-3">Monto Total</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{ord.order_number}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{ord.customer_name || 'Danilo'}</td>
                    <td className="px-6 py-4 text-slate-500">{ord.order_date}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {ord.location_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {(ord.items || []).map((i: any) => `${i.description} (x${i.quantity})`).join(', ') || 'Sin ítems'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">${ord.total_amount?.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        ord.status === 'invoiced'
                          ? 'bg-purple-100 text-purple-700'
                          : ord.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ord.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {ord.status !== 'invoiced' ? (
                        <button
                          onClick={() => handleInvoiceOrder(ord.id, ord.order_number)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold hover:bg-brand-100 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Facturar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Facturado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear Pedido */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Nuevo Pedido de Venta</h3>
            <p className="text-slate-500 text-sm mb-4">Ingresá los datos del pedido comercial</p>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
                  <input
                    type="text"
                    value={newOrder.customer_name}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Almacén de Salida</label>
                  <select
                    value={newOrder.location_id}
                    onChange={(e) => setNewOrder({ ...newOrder, location_id: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  >
                    <option value="PL">PL - Primary Location</option>
                    <option value="JA">JA - Jackson Av</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Producto</label>
                <select
                  value={newOrder.stock_id}
                  onChange={(e) => {
                    const desc = e.target.value === '1' ? 'Arena' : (e.target.value === '131313' ? 'COLLAR THE BEST' : 'uguygyu');
                    setNewOrder({ ...newOrder, stock_id: e.target.value, description: desc });
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50"
                >
                  <option value="1">Arena (SKU: 1)</option>
                  <option value="131313">COLLAR THE BEST (SKU: 131313)</option>
                  <option value="55656556">uguygyu (SKU: 55656556)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Precio Unitario ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={newOrder.unit_price}
                    onChange={(e) => setNewOrder({ ...newOrder, unit_price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-500"
                >
                  Guardar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
