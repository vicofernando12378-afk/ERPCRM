export type Field = { key: string; label: string; type?: string; required?: boolean; source?: string; options?: string[]; step?: string };
export const field = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, ...extra });
const contact = [field('name', 'Nombre', { required: true }), field('tax_id', 'Identificación fiscal'), field('email', 'Correo', { type: 'email' }), field('phone', 'Teléfono'), field('address', 'Dirección')];
const basic = [field('name', 'Nombre', { required: true })];
export const catalogs: Record<string, { title: string; fields: Field[] }> = {
  items: { title: 'Productos', fields: [field('sku', 'Código / SKU', { required: true }), ...basic, field('description', 'Descripción'), field('category_id', 'Categoría', { source: 'categories' }), field('unit_id', 'Unidad', { source: 'units', required: true }), field('tax_id', 'Impuesto', { source: 'taxes' }), field('purchase_price', 'Precio de compra', { type: 'number', step: '0.01', required: true }), field('sale_price', 'Precio de venta', { type: 'number', step: '0.01', required: true }), field('min_stock', 'Stock mínimo', { type: 'number', step: '0.001', required: true }), field('barcode', 'Código de barras')] },
  customers: { title: 'Clientes', fields: contact }, suppliers: { title: 'Proveedores', fields: contact },
  branches: { title: 'Sucursales de clientes', fields: [field('customer_id', 'Cliente', { source: 'customers', required: true }), ...basic, field('contact', 'Contacto'), field('billing_address', 'Dirección de facturación'), field('shipping_address', 'Dirección de envío')] },
  locations: { title: 'Almacenes', fields: [field('code', 'Código', { required: true }), ...contact.filter(f => f.key !== 'tax_id')] },
  categories: { title: 'Categorías', fields: basic }, units: { title: 'Unidades', fields: basic },
  taxes: { title: 'Impuestos', fields: [...basic, field('rate', 'Tasa (%)', { type: 'number', step: '0.01', required: true })] },
  payment_methods: { title: 'Medios de pago', fields: basic }, price_lists: { title: 'Tarifas', fields: basic },
  prices: { title: 'Precios por tarifa', fields: [field('item_id', 'Producto', { source: 'items', required: true }), field('price_list_id', 'Tarifa', { source: 'price_lists', required: true }), field('currency', 'Moneda', { options: ['PEN', 'USD', 'EUR'], required: true }), field('price', 'Precio', { type: 'number', step: '0.01', required: true })] },
};
export const docNames: Record<string, string> = { purchase: 'Órdenes de compra', receipt: 'Recepciones', order: 'Pedidos de venta', invoice: 'Facturas internas', shipment: 'Despachos' };
export const statusNames: Record<string, string> = { confirmed: 'Confirmado', cancelled: 'Anulado', packed: 'Preparado', delivered: 'Entregado' };
