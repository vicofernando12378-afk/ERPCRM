import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { CreditCard, Calendar, CheckCircle2 } from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      try {
        const res = await apiFetch<any>('/payments');
        setPayments(res.payments || []);
      } catch (err) {
        console.error('Error cargando cobros:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Historial de Cobros y Recibos</h2>
        <p className="text-slate-500 text-sm">Registro de transacciones financieras y pagos acreditados</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando pagos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Nº Recibo</th>
                  <th className="px-6 py-3">ID Factura</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Método</th>
                  <th className="px-6 py-3">Monto Cobrado</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{p.receipt_number}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.invoice_id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{p.customer_id}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700">${p.amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-500">{p.payment_date}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{p.reference || 'Sin ref'}</td>
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
