import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    itemCount: 0,
    orderCount: 0,
    customerCount: 0,
    totalStockUnits: 0,
    orders: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [itemsRes, ordersRes, customersRes] = await Promise.all([
          apiFetch<any>('/items'),
          apiFetch<any>('/orders'),
          apiFetch<any>('/customers'),
        ]);

        const totalStock = (itemsRes.items || []).reduce(
          (acc: number, item: any) => acc + (item.total_stock || 0),
          0
        );

        setStats({
          itemCount: itemsRes.count || 0,
          orderCount: ordersRes.count || 0,
          customerCount: customersRes.count || 0,
          totalStockUnits: totalStock,
          orders: ordersRes.orders || [],
        });
      } catch (err) {
        console.error('Error cargando métricas:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mr-3" />
        Cargando datos desde Google Cloud...
      </div>
    );
  }

  const statCards = [
    {
      title: 'Productos en Catálogo',
      value: stats.itemCount,
      subtitle: `${stats.totalStockUnits} unidades totales`,
      icon: Package,
      color: 'bg-blue-500',
      action: () => onNavigate('inventory')
    },
    {
      title: 'Órdenes de Venta',
      value: stats.orderCount,
      subtitle: 'Histórico registrado',
      icon: ShoppingCart,
      color: 'bg-emerald-500',
      action: () => onNavigate('orders')
    },
    {
      title: 'Clientes Registrados',
      value: stats.customerCount,
      subtitle: 'Con sucursales activas',
      icon: Users,
      color: 'bg-purple-500',
      action: () => onNavigate('customers')
    },
    {
      title: 'Estado del Servidor',
      value: 'Online',
      subtitle: 'Cloud Functions v2 (Serverless)',
      icon: TrendingUp,
      color: 'bg-amber-500',
      action: () => {}
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.subtitle}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.color} text-white flex items-center justify-center shadow-inner`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold">Gestión Rápida de Operaciones</h2>
          <p className="text-slate-300 text-sm mt-0.5">Accedé a los flujos principales con descuento automático de inventario</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            + Nuevo Pedido de Venta
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ajustar Stock
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Órdenes de Compra
          </button>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Órdenes de Venta Recientes</h3>
          <button 
            onClick={() => onNavigate('orders')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Ver todas →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Nº Orden</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Almacén</th>
                <th className="px-6 py-3">Monto</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-slate-800">{order.order_number}</td>
                  <td className="px-6 py-3.5">{order.customer_name || 'Danilo'}</td>
                  <td className="px-6 py-3.5 text-slate-500">{order.order_date}</td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {order.location_id}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">${order.total_amount?.toFixed(2)}</td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'invoiced'
                        ? 'bg-purple-100 text-purple-700'
                        : order.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
