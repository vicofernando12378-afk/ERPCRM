import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Settings, Building, MapPin, Tag, QrCode, Printer, CheckCircle2, Save } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'company' | 'master' | 'barcode'>('company');
  const [settings, setSettings] = useState<any>({
    company_name: '',
    tax_id: '',
    phone: '',
    email: '',
    address: '',
    default_currency: 'USD',
    currency_symbol: '$',
    default_tax_rate: 18,
    stock_threshold_alert: 10,
  });
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Barcode Generator State (Stockpile barcode/create parity)
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [barcodeQty, setBarcodeQty] = useState(12);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [settRes, locRes, itemsRes] = await Promise.all([
        apiFetch<any>('/settings'),
        apiFetch<any>('/locations'),
        apiFetch<any>('/items'),
      ]);
      setSettings(settRes || {});
      setLocations(locRes.locations || []);
      setItems(itemsRes.items || []);
      if (itemsRes.items?.length > 0) {
        setSelectedItem(itemsRes.items[0]);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Error guardando configuración: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>
          <p className="text-sm text-slate-500">Parámetros de empresa, sedes de almacén e impresión de códigos de barra (Stockpile Parity).</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'company' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Empresa y Finanzas
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'master' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Almacenes y Sedes
          </button>
          <button
            onClick={() => setActiveTab('barcode')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'barcode' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Códigos de Barra
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Cargando configuración...
        </div>
      ) : activeTab === 'company' ? (
        /* TAB 1: Company & Finance Settings */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-3xl">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-slate-800 text-sm">Datos Corporativos y Régimen Fiscal</h3>
            </div>
            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardado en Firestore
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={settings.company_name || ''}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Identificación Fiscal / RUC *</label>
                <input
                  type="text"
                  required
                  value={settings.tax_id || ''}
                  onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Teléfono Central</label>
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Dirección Fiscal</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Moneda Principal</label>
                <select
                  value={settings.default_currency || 'USD'}
                  onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="USD">Dólares (USD)</option>
                  <option value="PEN">Soles (PEN)</option>
                  <option value="EUR">Euros (EUR)</option>
                  <option value="MXN">Pesos (MXN)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Símbolo</label>
                <input
                  type="text"
                  value={settings.currency_symbol || '$'}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tasa Impuesto (%)</label>
                <input
                  type="number"
                  value={settings.default_tax_rate || 18}
                  onChange={(e) => setSettings({ ...settings, default_tax_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Parámetros'}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'master' ? (
        /* TAB 2: Locations & Warehouses */
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-sm">Almacenes y Sedes Operativas</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nombre de Sede</th>
                    <th className="py-3 px-4">Dirección de Entrega</th>
                    <th className="py-3 px-4">Por Defecto</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locations.map(loc => (
                    <tr key={loc.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 text-xs">
                        {loc.loc_code || loc.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {loc.location_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {loc.delivery_address || 'Sede Principal'}
                      </td>
                      <td className="py-3 px-4">
                        {loc.is_default ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">Principal</span>
                        ) : (
                          <span className="text-slate-400 text-xs">Secundario</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Activo
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
        /* TAB 3: Barcode Generator (Stockpile barcode/create parity) */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-brand-600" />
              Generador de Etiquetas con Código de Barras (Stockpile Parity)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Seleccionar Producto</label>
                <select
                  value={selectedItem?.id || ''}
                  onChange={(e) => setSelectedItem(items.find(i => i.id === e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.description} — SKU/Código: {it.stock_id} (P. Venta: ${it.sale_price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cantidad de Etiquetas</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={barcodeQty}
                  onChange={(e) => setBarcodeQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <button
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir {barcodeQty} Etiquetas
              </button>
            </div>
          </div>

          {/* Barcode Print Grid Preview */}
          {selectedItem && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Vista Previa de Impresión</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: barcodeQty }).map((_, i) => (
                  <div key={i} className="border border-dashed border-slate-300 rounded-lg p-3 text-center space-y-1 bg-slate-50/50">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{selectedItem.description}</p>
                    {/* Simulated Code 128 Barcode Graphic */}
                    <div className="h-10 flex items-center justify-center gap-[2px] py-1 bg-white border border-slate-200 rounded px-2">
                      <div className="w-[2px] h-7 bg-black" />
                      <div className="w-[1px] h-7 bg-black" />
                      <div className="w-[3px] h-7 bg-black" />
                      <div className="w-[1px] h-7 bg-black" />
                      <div className="w-[2px] h-7 bg-black" />
                      <div className="w-[4px] h-7 bg-black" />
                      <div className="w-[1px] h-7 bg-black" />
                      <div className="w-[2px] h-7 bg-black" />
                      <div className="w-[3px] h-7 bg-black" />
                      <div className="w-[1px] h-7 bg-black" />
                      <div className="w-[2px] h-7 bg-black" />
                    </div>
                    <p className="font-mono text-[10px] font-bold text-slate-600 tracking-wider">*{selectedItem.stock_id}*</p>
                    <p className="text-[10px] font-semibold text-slate-700">${selectedItem.sale_price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
