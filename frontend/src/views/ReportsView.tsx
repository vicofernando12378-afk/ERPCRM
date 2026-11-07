import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { BarChart3, TrendingUp, DollarSign, Package, ShoppingCart, Percent, Layers, Download } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'sales'>('stock');
  const [stockReport, setStockReport] = useState<any>(null);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const [stockRes, salesRes] = await Promise.all([
        apiFetch<any>('/reports/stock-on-hand'),
        apiFetch<any>('/reports/sales-summary'),
      ]);
      setStockReport(stockRes);
      setSalesReport(salesRes);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Suite de Reportes</h2>
          <p className="text-sm text-slate-500">Métricas analíticas de inventario en mano, valorización y balance comercial (Stockpile Parity).</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'stock'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock en Mano (Valorización)
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sales'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Balance Comercial y Ventas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Cargando suite de análisis...
        </div>
      ) : activeTab === 'stock' ? (
        /* TAB 1: Stock on Hand Report */
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Unidades Físicas</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stockReport?.summary?.total_units || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">{stockReport?.summary?.total_items || 0} ítems en catálogo</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Valor Costo Total</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">${stockReport?.summary?.cost_value?.toLocaleString() || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Basado en precio de compra</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Valor Venta Estimado</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">${stockReport?.summary?.retail_value?.toLocaleString() || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Basado en precio de lista</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Margen Proyectado</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{stockReport?.summary?.margin_percent || 0}%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Margen bruto global</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Detalle de Stock Valorizado por Ítem</h3>
              <button 
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" />
                Imprimir / PDF
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">Stock Total</th>
                    <th className="py-3 px-4 text-right">P. Costo</th>
                    <th className="py-3 px-4 text-right">P. Venta</th>
                    <th className="py-3 px-4 text-right">Valor Costo</th>
                    <th className="py-3 px-4 text-right">Valor Venta</th>
                    <th className="py-3 px-4 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(stockReport?.items || []).map((it: any) => (
                    <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 text-xs">
                        {it.stock_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {it.description}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {it.category}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {it.total_stock} un.
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 text-xs">
                        ${it.purchase_price}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 text-xs">
                        ${it.sale_price}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-amber-700 text-xs">
                        ${it.cost_value?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700 text-xs">
                        ${it.retail_value?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          Number(it.margin_percent) >= 0 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {it.margin_percent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: Sales Summary Report */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Pedidos de Venta</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{salesReport?.total_orders || 0}</p>
              <p className="text-xs text-slate-400 mt-2">Órdenes registradas en el sistema</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Facturado</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">${salesReport?.total_invoiced_amount?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-400 mt-2">{salesReport?.total_invoices || 0} facturas emitidas</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Cobrado</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">${salesReport?.total_collected_amount?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-400 mt-2">{salesReport?.total_payments_recorded || 0} recibos de pago</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Saldo por Cobrar</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">${salesReport?.outstanding_balance?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-400 mt-2">Cuentas por cobrar pendientes</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-2">Resumen Ejecutivo</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              La cartera comercial mantiene un porcentaje de cobro de{' '}
              <strong className="text-slate-800">
                {salesReport?.total_invoiced_amount > 0 
                  ? ((salesReport.total_collected_amount / salesReport.total_invoiced_amount) * 100).toFixed(1) 
                  : 0}%
              </strong>. Todos los comprobantes y pagos se auditan en tiempo real en Google Cloud Firestore.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
