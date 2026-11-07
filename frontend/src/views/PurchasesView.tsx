import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Plus, PackageCheck, CheckCircle2, AlertCircle, ShoppingCart, Calendar, Building, MapPin, Truck } from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Aux data for forms
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [receiveLocation, setReceiveLocation] = useState('PL');

  // New PO form state
  const [newPo, setNewPo] = useState({
    supplier_id: '',
    location_id: 'PL',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [{ stock_id: '', description: '', quantity: 1, purchase_price: 10 }]
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchRes, suppRes, locRes, itemsRes] = await Promise.all([
        apiFetch<any>('/purchases'),
        apiFetch<any>('/suppliers'),
        apiFetch<any>('/locations'),
        apiFetch<any>('/items'),
      ]);
      setPurchases(purchRes.purchases || []);
      setSuppliers(suppRes.suppliers || []);
      setLocations(locRes.locations || []);
      setItems(itemsRes.items || []);

      if (suppRes.suppliers?.length > 0) {
        setNewPo(prev => ({
          ...prev,
          supplier_id: suppRes.suppliers[0].id,
        }));
      }
      if (itemsRes.items?.length > 0) {
        const first = itemsRes.items[0];
        setNewPo(prev => ({
          ...prev,
          items: [{ stock_id: first.stock_id, description: first.description, quantity: 1, purchase_price: first.purchase_price || 10 }]
        }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    if (items.length === 0) return;
    const first = items[0];
    setNewPo(prev => ({
      ...prev,
      items: [...prev.items, { stock_id: first.stock_id, description: first.description, quantity: 1, purchase_price: first.purchase_price || 10 }]
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...newPo.items];
    if (field === 'stock_id') {
      const match = items.find(i => i.stock_id === value);
      updated[index].stock_id = value;
      if (match) {
        updated[index].description = match.description;
        updated[index].purchase_price = match.purchase_price || 10;
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setNewPo({ ...newPo, items: updated });
  };

  const handleRemoveItemRow = (index: number) => {
    if (newPo.items.length <= 1) return;
    setNewPo({ ...newPo, items: newPo.items.filter((_, idx) => idx !== index) });
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const supplier = suppliers.find(s => s.id === newPo.supplier_id);
      await apiFetch('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: newPo.supplier_id,
          supplier_name: supplier?.supp_name || 'Proveedor General',
          location_id: newPo.location_id,
          order_date: newPo.order_date,
          items: newPo.items.map(it => ({
            stock_id: it.stock_id,
            description: it.description,
            quantity: Number(it.quantity),
            purchase_price: Number(it.purchase_price)
          })),
          notes: newPo.notes
        })
      });
      setFeedback({ type: 'success', text: 'Orden de compra creada con éxito. Ahora podés registrar la recepción física para ingresar el stock.' });
      setCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;

    try {
      setSubmitting(true);
      const itemsToReceive = (selectedPo.items || []).map((it: any) => ({
        stock_id: it.stock_id,
        quantity: it.quantity
      }));

      const res = await apiFetch<any>(`/purchases/${selectedPo.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          location_id: receiveLocation,
          items_received: itemsToReceive,
          notes: 'Recepción física completada desde panel web'
        })
      });

      setFeedback({
        type: 'success',
        text: `¡Mercadería ingresada al inventario con éxito! (Comprobante de Recepción ${res.receive_number}). El stock físico fue aumentado en Firestore.`
      });
      setReceiveModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Notifications */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto text-xs underline font-normal">Cerrar</button>
        </div>
      )}

      {/* Header with Call-to-action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Órdenes de Compra y Abastecimiento</h2>
          <p className="text-slate-500 text-sm">Gestioná pedidos a proveedores e ingresá físicamente mercadería al stock (Stockpile Parity).</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden de Compra
        </button>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando órdenes de compra...</div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No hay órdenes de compra registradas. Creá tu primera orden con el botón "+ Nueva Orden de Compra".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Nº PO</th>
                  <th className="px-6 py-3">Proveedor</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Almacén Destino</th>
                  <th className="px-6 py-3">Ítems Solicitados</th>
                  <th className="px-6 py-3">Monto Total</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acción de Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{po.po_number || po.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{po.supplier_name}</td>
                    <td className="px-6 py-4 text-slate-500">{po.order_date}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {po.location_id || 'PL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {(po.items || []).map((it: any) => `${it.description} (x${it.quantity})`).join(', ')}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">${Number(po.total_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        po.status === 'received'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                      }`}>
                        {po.status === 'received' ? 'INGRESADO A STOCK' : 'PENDIENTE DE RECEPCIÓN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {po.status !== 'received' ? (
                        <button
                          onClick={() => {
                            setSelectedPo(po);
                            setReceiveLocation(po.location_id || 'PL');
                            setReceiveModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          Recibir Mercadería
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Completado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear Nueva Orden de Compra */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800">Nueva Orden de Compra (Abastecimiento)</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Proveedor *</label>
                  <select
                    value={newPo.supplier_id}
                    onChange={(e) => setNewPo({ ...newPo, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.supp_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Almacén Destino *</label>
                  <select
                    value={newPo.location_id}
                    onChange={(e) => setNewPo({ ...newPo, location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha de Pedido</label>
                  <input
                    type="date"
                    value={newPo.order_date}
                    onChange={(e) => setNewPo({ ...newPo, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Productos a Comprar *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                  >
                    + Agregar Otro Ítem
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  {newPo.items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <select
                        value={row.stock_id}
                        onChange={(e) => handleItemChange(idx, 'stock_id', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded bg-white"
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.stock_id}>{it.description} ({it.stock_id})</option>
                        ))}
                      </select>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cant."
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-center"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="P. Costo"
                          value={row.purchase_price}
                          onChange={(e) => handleItemChange(idx, 'purchase_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-right font-mono"
                        />
                      </div>
                      <span className="w-24 text-right font-bold text-slate-800">
                        ${(row.quantity * row.purchase_price).toFixed(2)}
                      </span>
                      {newPo.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-slate-400 hover:text-rose-600 px-1 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  placeholder="Pedido programado para entrega quincenal"
                  value={newPo.notes}
                  onChange={(e) => setNewPo({ ...newPo, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <div className="text-sm font-semibold text-slate-700">
                  Total Orden:{' '}
                  <span className="text-base font-bold text-brand-600 font-mono">
                    ${newPo.items.reduce((acc, it) => acc + (it.quantity * it.purchase_price), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                  >
                    {submitting ? 'Generando...' : 'Crear Orden de Compra'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Recepción de Mercadería */}
      {receiveModalOpen && selectedPo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2 text-emerald-800">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold">Ingreso Físico de Mercadería a Almacén</h3>
              </div>
              <button onClick={() => setReceiveModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleReceiveGoods} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p><strong>Orden de Compra:</strong> {selectedPo.po_number || selectedPo.id}</p>
                <p><strong>Proveedor:</strong> {selectedPo.supplier_name}</p>
                <p><strong>Monto:</strong> ${selectedPo.total_amount?.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Almacén Receptor del Stock *</label>
                <select
                  value={receiveLocation}
                  onChange={(e) => setReceiveLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Al confirmar, las existencias se sumarán inmediatamente en este almacén dentro de Firestore y se generará el movimiento auditado.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-1">Ítems a Ingresar:</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto">
                  {(selectedPo.items || []).map((it: any, i: number) => (
                    <div key={i} className="py-1.5 flex justify-between text-xs">
                      <span className="font-medium text-slate-800">{it.description} ({it.stock_id})</span>
                      <span className="font-bold text-emerald-700">+{it.quantity} unidades</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  {submitting ? 'Ingresando...' : 'Confirmar Ingreso al Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
