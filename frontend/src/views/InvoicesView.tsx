import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { CreditCard, Printer, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const InvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pay Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentRef, setPaymentRef] = useState('');

  // Print Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<any>(null);

  const loadInvoices = async () => {
    try {
      const res = await apiFetch<any>('/invoices');
      setInvoices(res.invoices || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const res = await apiFetch<any>(`/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          reference: paymentRef
        })
      });

      setFeedback({
        type: 'success',
        text: `Pago registrado con éxito. Recibo emitido: ${res.receipt?.receipt_number}. Saldo restante: $${res.remaining_balance}.`
      });
      setPayModalOpen(false);
      loadInvoices();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handlePrintClick = async (invoiceId: string) => {
    try {
      const doc = await apiFetch<any>(`/invoices/${invoiceId}/print`);
      setPrintDoc(doc);
      setPrintModalOpen(true);
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

      <div>
        <h2 className="text-lg font-bold text-slate-800">Facturación y Cuentas por Cobrar</h2>
        <p className="text-slate-500 text-sm">Registro de comprobantes fiscales, cobranzas y saldos pendientes</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando facturas emitidas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Nº Factura</th>
                  <th className="px-6 py-3">Ref. Pedido</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Total Factura</th>
                  <th className="px-6 py-3">Pagado</th>
                  <th className="px-6 py-3">Saldo</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const balance = (inv.total_amount || 0) - (inv.paid_amount || 0);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{inv.order_reference || '-'}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{inv.customer_name || 'Danilo'}</td>
                      <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">${inv.total_amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">${inv.paid_amount?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 font-semibold text-rose-700">${balance.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          inv.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : inv.payment_status === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {inv.payment_status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {inv.payment_status !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentAmount(balance);
                              setPayModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pagar
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintClick(inv.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registrar Pago */}
      {payModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Registrar Cobranza</h3>
            <p className="text-slate-500 text-sm mb-4">Factura: <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoice_number}</span></p>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto a Cobrar ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(selectedInvoice.total_amount || 0) - (selectedInvoice.paid_amount || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50"
                >
                  <option value="transfer">Transferencia Bancaria</option>
                  <option value="cash">Efectivo en Caja</option>
                  <option value="yape">Yape / Plin</option>
                  <option value="card">Tarjeta de Crédito/Débito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Referencia / Nº Operación</label>
                <input
                  type="text"
                  placeholder="Ej: OPE-992211"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vista e Impresión de Factura */}
      {printModalOpen && printDoc && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">StockPile ERP Cloud</span>
                <h2 className="text-2xl font-black text-slate-900 mt-0.5">{printDoc.document_type}</h2>
                <p className="font-mono text-sm font-semibold text-slate-500 mt-1">{printDoc.invoice_number}</p>
              </div>
              <button 
                onClick={() => setPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 my-6 text-xs text-slate-600">
              <div>
                <p className="font-bold text-slate-900 uppercase">Emisor:</p>
                <p className="font-semibold text-slate-800">{printDoc.company.name}</p>
                <p>{printDoc.company.tax_id}</p>
                <p>{printDoc.company.address}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 uppercase">Cliente:</p>
                <p className="font-semibold text-slate-800">{printDoc.customer.name}</p>
                <p>{printDoc.customer.email}</p>
                <p>Fecha de Emisión: {printDoc.date}</p>
              </div>
            </div>

            {/* Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden my-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Cant.</th>
                    <th className="p-3">P. Unit</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {printDoc.items.map((it: any) => (
                    <tr key={it.item_no}>
                      <td className="p-3">{it.item_no}</td>
                      <td className="p-3 font-medium">{it.description}</td>
                      <td className="p-3">{it.quantity}</td>
                      <td className="p-3">${it.unit_price}</td>
                      <td className="p-3 text-right font-bold">${it.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Monto Total:</span>
                  <span className="font-bold text-slate-900">${printDoc.financials.total_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Monto Pagado:</span>
                  <span className="font-bold">${printDoc.financials.paid_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                  <span>Saldo Pendiente:</span>
                  <span className={printDoc.financials.balance_due > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    ${printDoc.financials.balance_due?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Imprimir Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
