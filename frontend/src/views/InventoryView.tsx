import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Plus, ArrowRightLeft, SlidersHorizontal, CheckCircle2, AlertCircle, PackagePlus, ArrowDownToLine, ArrowUpFromLine, Search } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [adjustMode, setAdjustMode] = useState<'in' | 'out'>('in');

  // New Item Form
  const [newItem, setNewItem] = useState({
    stock_id: '',
    description: '',
    category_name: 'Hardware',
    units: 'uds',
    location_id: 'PL',
    initial_stock: 10,
    purchase_price: 50,
    sale_price: 80,
  });

  // Adjust Form
  const [adjustData, setAdjustData] = useState({
    location_id: 'PL',
    quantity: 10,
    reason: 'Ingreso directo de mercadería al inventario'
  });

  // Transfer Form
  const [transferData, setTransferData] = useState({
    from_location: 'PL',
    to_location: 'JA',
    quantity: 5,
    reference: 'Traslado operativo'
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, locRes] = await Promise.all([
        apiFetch<any>('/items'),
        apiFetch<any>('/locations'),
      ]);
      setItems(itemsRes.items || []);
      setLocations(locRes.locations || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiFetch('/items', {
        method: 'POST',
        body: JSON.stringify(newItem)
      });
      setFeedback({
        type: 'success',
        text: `¡Producto ${newItem.description} (${newItem.stock_id}) registrado con éxito con ${newItem.initial_stock} unidades ingresadas a stock!`
      });
      setCreateItemModalOpen(false);
      setNewItem({
        stock_id: '',
        description: '',
        category_name: 'Hardware',
        units: 'uds',
        location_id: 'PL',
        initial_stock: 10,
        purchase_price: 50,
        sale_price: 80,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const delta = adjustMode === 'in' ? Number(adjustData.quantity) : -Number(adjustData.quantity);
      await apiFetch('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          stock_id: selectedStockId,
          location_id: adjustData.location_id,
          qty_delta: delta,
          reason: adjustData.reason
        })
      });
      setFeedback({
        type: 'success',
        text: `Stock del producto ${selectedStockId} actualizado: ${delta > 0 ? '+' : ''}${delta} unidades registradas en ${adjustData.location_id}.`
      });
      setAdjustModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.from_location === transferData.to_location) {
      alert('El almacén de origen y destino deben ser diferentes.');
      return;
    }
    try {
      setSubmitting(true);
      await apiFetch('/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify({
          stock_id: selectedStockId,
          ...transferData,
          quantity: Number(transferData.quantity)
        })
      });
      setFeedback({ type: 'success', text: `Traslado de ${transferData.quantity} unidades completado con éxito.` });
      setTransferModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(it => 
    (it.stock_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (it.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (it.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Catálogo de Productos y Existencias</h2>
          <p className="text-slate-500 text-sm">Ingreso directo de mercadería, ajustes de stock y control multialmacén (Stockpile Parity).</p>
        </div>
        <button
          onClick={() => setCreateItemModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-brand-500/20"
        >
          <PackagePlus className="w-4 h-4" />
          Registrar Nuevo Producto
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar producto por SKU, descripción o categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
        />
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando inventario...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No se encontraron productos en el catálogo. Registrá uno con el botón "+ Registrar Nuevo Producto".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">SKU / Código</th>
                  <th className="px-6 py-3">Descripción</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Sede PL</th>
                  <th className="px-6 py-3">Sede JA</th>
                  <th className="px-6 py-3">Total Stock</th>
                  <th className="px-6 py-3">P. Costo</th>
                  <th className="px-6 py-3">P. Venta</th>
                  <th className="px-6 py-3 text-right">Acciones de Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.stock_id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{item.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {item.category_name || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{item.stocks?.PL || 0}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{item.stocks?.JA || 0}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {item.total_stock} {item.units || 'uds'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">${item.purchase_price || 0}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">${item.sale_price || 0}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedStockId(item.stock_id);
                          setAdjustMode('in');
                          setAdjustData({ location_id: 'PL', quantity: 10, reason: 'Ingreso directo de mercadería' });
                          setAdjustModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                        title="Ingresar más mercadería directamente a este producto"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        + Ingresar Stock
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStockId(item.stock_id);
                          setAdjustMode('out');
                          setAdjustData({ location_id: 'PL', quantity: 1, reason: 'Salida por merma o rotura' });
                          setAdjustModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Registrar merma o egreso"
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5" />
                        Salida
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStockId(item.stock_id);
                          setTransferModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Trasladar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registrar Nuevo Producto */}
      {createItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800">Registrar Producto e Ingreso Inicial</h3>
              </div>
              <button onClick={() => setCreateItemModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateItemSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Código SKU / Stock ID *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. PRD-9001"
                    value={newItem.stock_id}
                    onChange={(e) => setNewItem({ ...newItem, stock_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Hardware, Materiales..."
                    value={newItem.category_name}
                    onChange={(e) => setNewItem({ ...newItem, category_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Descripción del Producto *</label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Cemento Portland Tipo I (Bolsa 42.5kg)"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Precio Compra / Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.purchase_price}
                    onChange={(e) => setNewItem({ ...newItem, purchase_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Precio Venta al Público ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.sale_price}
                    onChange={(e) => setNewItem({ ...newItem, sale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase">Ingreso Inicial de Stock</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Almacén de Ingreso</label>
                    <select
                      value={newItem.location_id}
                      onChange={(e) => setNewItem({ ...newItem, location_id: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Cantidad Inicial</label>
                    <input
                      type="number"
                      min="0"
                      value={newItem.initial_stock}
                      onChange={(e) => setNewItem({ ...newItem, initial_stock: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  {submitting ? 'Guardando...' : 'Crear Producto e Ingresar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ingreso / Ajuste de Stock */}
      {adjustModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${
              adjustMode === 'in' ? 'bg-emerald-50/50' : 'bg-rose-50/50'
            }`}>
              <div className="flex items-center gap-2">
                {adjustMode === 'in' ? <ArrowDownToLine className="w-5 h-5 text-emerald-600" /> : <ArrowUpFromLine className="w-5 h-5 text-rose-600" />}
                <h3 className="font-bold text-slate-800">
                  {adjustMode === 'in' ? 'Ingreso Directo de Mercadería' : 'Salida / Merma de Inventario'}
                </h3>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Afectando producto SKU: <strong className="text-slate-800">{selectedStockId}</strong>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Almacén *</label>
                <select
                  value={adjustData.location_id}
                  onChange={(e) => setAdjustData({ ...adjustData, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Cantidad a {adjustMode === 'in' ? 'Ingresar (+)' : 'Retirar (-)'} *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Motivo / Referencia *</label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Ingreso de lote sin orden previa / sobrante de conteo"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white rounded-lg text-sm font-semibold shadow-sm ${
                    adjustMode === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Guardando...' : (adjustMode === 'in' ? 'Confirmar Ingreso al Stock' : 'Confirmar Salida')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Traslado de Stock */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Traslado de {selectedStockId} entre Almacenes</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Origen</label>
                  <select
                    value={transferData.from_location}
                    onChange={(e) => setTransferData({ ...transferData, from_location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Destino</label>
                  <select
                    value={transferData.to_location}
                    onChange={(e) => setTransferData({ ...transferData, to_location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.loc_code || l.id}>{l.location_name || l.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cantidad a Mover</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
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
