# ERP modernizado — entorno de revisión

Aplicación local con Laravel 13, PHP 8.5, MySQL 8.4/InnoDB y React. Sin Firebase.

## Acceso local

Ejecutar `./scripts/start-local.ps1` desde esta carpeta y abrir http://127.0.0.1:3100.
El usuario y la contraseña generados están en `.tools/acceso-local.txt`. No versionar este archivo.
Las herramientas portables y bases locales están en `.tools`; no son parte del código distribuible.

## Funciones disponibles

- Sesiones, recuperación de contraseña, usuarios, roles configurables y auditoría.
- Productos, imágenes, códigos de barras, clientes, proveedores y catálogos auxiliares.
- Compras y recepciones parciales; pedidos, venta directa, facturas internas y despachos parciales.
- Cobros, anulaciones con reversión y bloqueo de dependencias.
- Inventario, movimientos, ajustes y traslados con control de existencias.
- Panel, reportes de ventas e inventario, CSV, PDF e importación CSV con vista previa.
- Preparación de documentos por correo mediante cola. El transporte local es `log`: no entrega correo real. Se requiere configurar SMTP y ejecutar `php artisan queue:work` para entregas reales.

Las facturas son documentos internos; no incluyen integración fiscal electrónica.

## Validación y respaldo

- `./scripts/test-local.ps1 -MySQL`: pruebas aisladas en erp_testing y compilación React.
- Desde frontend: `npx playwright test` (requiere Chromium de Playwright o PLAYWRIGHT_CHROMIUM_EXECUTABLE).
- Desde backend: `../.tools/php/php.exe artisan erp:reconcile`.
- `./scripts/backup-local.ps1`: respaldo SQL y archivos privados. Evitar escrituras durante el respaldo para una copia consistente entre base y archivos.
- `./.tools/php/php.exe scripts/verify-restore.php`: restaurar el último SQL en una base nueva y comparar cantidades de registros. Conservar también la configuración y APP_KEY por un canal seguro.

## Datos y pendientes

El SQL legado es de prueba. Se importaron maestros con correspondencias de identificadores; documentos y saldos históricos permanecen aislados en legacy_demo. Se detectó un saldo negativo y no se inventaron existencias para corregirlo.

Esta es una implementación local para revisión, no el cierre de toda la modernización. Faltan validación funcional del negocio, conciliación de la migración histórica, reportes avanzados, integración fiscal si corresponde y puesta en producción. Docker Compose está preparado con MySQL, PHP, Nginx y trabajador de colas, pero no se ha probado porque Docker no está instalado.

El código vigente está en backend y frontend/src/erp. source-code-v1.7 y backend-google son referencias históricas. No ejecutar despliegues Firebase heredados.
