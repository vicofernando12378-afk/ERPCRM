import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  FileText, 
  CreditCard, 
  Truck, 
  ShoppingBag, 
  Layers,
  Building,
  PackageCheck,
  ArrowLeftRight,
  BarChart3,
  Settings,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'inventory', label: 'Inventario / Ítems', icon: Package },
    
    // Ventas
    { 
      id: 'sales-group',
      label: 'Ventas y Facturación', 
      isHeader: true 
    },
    { id: 'orders', label: 'Pedidos de Venta', icon: ShoppingCart, subItem: true },
    { id: 'invoices', label: 'Facturas Emitidas', icon: FileText, subItem: true },
    { id: 'payments', label: 'Cobros y Recibos', icon: CreditCard, subItem: true },
    { id: 'shipments', label: 'Despachos / Envíos', icon: Truck, subItem: true },

    // Compras y Proveedores
    { 
      id: 'purchases-group',
      label: 'Abastecimiento y Compras', 
      isHeader: true 
    },
    { id: 'suppliers', label: 'Proveedores', icon: Building, subItem: true },
    { id: 'purchases', label: 'Órdenes de Compra', icon: ShoppingBag, subItem: true },
    { id: 'receives', label: 'Recepciones de Compra', icon: PackageCheck, subItem: true },

    // Movimientos y Reportes
    { 
      id: 'operations-group',
      label: 'Operaciones y Análisis', 
      isHeader: true 
    },
    { id: 'transfers', label: 'Traslados de Stock', icon: ArrowLeftRight, subItem: true },
    { id: 'reports', label: 'Suite de Reportes', icon: BarChart3, subItem: true },

    // Administración
    { 
      id: 'admin-group',
      label: 'Administración', 
      isHeader: true 
    },
    { id: 'settings', label: 'Configuración y Empresa', icon: Settings, subItem: true },
    { id: 'team', label: 'Equipo y Roles (RBAC)', icon: ShieldCheck, subItem: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-lg">StockPile</span>
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-semibold uppercase">Cloud</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          if (item.isHeader) {
            return (
              <div 
                key={item.id} 
                className="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
              >
                {item.label}
              </div>
            );
          }

          const Icon = item.icon!;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              } ${item.subItem ? 'pl-5' : ''}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <p className="text-slate-300 font-medium">Google Cloud Serverless</p>
            <p className="text-slate-400 text-[11px]">crm-erps (us-central1)</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
