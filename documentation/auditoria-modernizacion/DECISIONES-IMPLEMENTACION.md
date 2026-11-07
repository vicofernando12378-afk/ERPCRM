# Decisiones de implementación — 7 de noviembre de 2026

## Confirmadas

El usuario autorizó la modernización y seleccionó Laravel moderno + PHP, React y base relacional, sin Firebase. Se utiliza MySQL 8.4/InnoDB. rencodie_pedidos.sql contiene datos de prueba.

## Implementado para revisión local

Laravel 13 y PHP 8.5 con sesiones/CSRF, permisos por rol, catálogos, compras, recepciones, pedidos, facturas internas, despachos, cobros, inventario, ajustes, traslados, anulaciones, auditoría, PDF, códigos de barras, imágenes, importaciones CSV y reportes básicos. Recuperación de contraseña y cola de correo preparadas; SMTP real pendiente.

Las operaciones de documentos y stock usan transacciones, bloqueo de filas, importes exactos y claves de idempotencia. La factura descuenta stock; el despacho no vuelve a descontarlo. Las anulaciones generan contramovimientos y respetan dependencias.

## Migración

Maestros del legado importados con una tabla de correspondencias. Historial y saldos no migrados: el origen de prueba presenta un saldo negativo para SKU 131313 en PL. No se fabricaron existencias. legacy_demo queda aislada y accesible en lectura para el importador.

## Pendientes de la modernización completa

- Revisión funcional de cada módulo por el negocio y cierre de diferencias con el inventario original.
- Conciliación de documentos históricos y definición de saldos iniciales válidos.
- Reportes avanzados, precios y condiciones comerciales, y ampliaciones del portal.
- Integración fiscal, si se requiere; actualmente son facturas internas.
- SMTP real, despliegue, HTTPS y operación de respaldos/monitorización en producción.
- Validación de Docker Compose en un entorno con Docker instalado.

Consultar README.md para acceso, pruebas y respaldo. Se conserva el plan original como referencia del alcance completo; esta entrega no lo declara concluido.
