import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { MapPin, Mail, Phone } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await apiFetch<any>('/customers');
        setCustomers(res.customers || []);
      } catch (err) {
        console.error('Error cargando clientes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Cartera de Clientes y Sucursales</h2>
        <p className="text-slate-500 text-sm">Directorio de clientes y puntos de despacho</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Cargando clientes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((cust) => (
            <div key={cust.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{cust.name}</h3>
                  <span className="text-xs font-mono text-slate-400">ID: {cust.id}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Activo
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{cust.email || 'Sin correo registrado'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{cust.phone || 'Sin teléfono'}</span>
                </div>
              </div>

              {/* Branches */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sucursales de Despacho:</p>
                <div className="space-y-1.5">
                  {(cust.branches || []).map((br: any) => (
                    <div key={br.branch_id} className="flex items-start gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-brand-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">{br.branch_name}</p>
                        <p className="text-[11px] text-slate-500">{br.shipping_address || 'Dirección general'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
