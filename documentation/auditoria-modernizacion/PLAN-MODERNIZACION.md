# Análisis funcional y plan de modernización del ERP

Fecha: 6 de noviembre de 2026. Estado: propuesta para revisión; implementación pendiente.

## 1. Dictamen y alcance

Recomiendo reconstruir el núcleo transaccional por módulos, conservando los datos y las reglas comerciales que se validen. Actualizar dependencias o rediseñar pantallas no resuelve por sí solo los problemas de integridad, permisos y cobertura funcional encontrados.

La carpeta contiene tres piezas distintas:

| Pieza | Situación observada |
|---|---|
| `source-code-v1.7` | StockPile original, Laravel 5.2; versión fijada 5.2.45 en composer.lock. Backend y vistas Blade integrados. |
| `backend-google` | Reemplazo parcial en TypeScript, Cloud Functions y Firestore. Hay servicios reales, pero también atajos de prueba y reglas incompletas. |
| `frontend` | Interfaz React con ocho vistas y algunas operaciones conectadas al backend. No equivale todavía al ERP original. |
| `documentation/index.html` | Manual original; útil como contexto, pero algunas afirmaciones comerciales no están respaldadas por integraciones en el código. |
| SQL y respaldos | Dump `rencodie_pedidos.sql`, base de ejemplo `db/stockpile.sql` y respaldos históricos. No se ha establecido cuál representa el estado operativo vigente. |

El inventario estático identificó **302 declaraciones activas de rutas hacia controladores, 184 archivos Blade, 34 archivos de controladores incluyendo copias y 38 tablas en el dump principal**. Las rutas no equivalen a funcionalidades independientes: el inventario JSON recoge declaraciones con destino `Controller@method`, incluida la ruta cron; excluye la ruta de caché definida mediante una función anónima.

Se revisaron rutas, controladores y modelos centrales, esquema SQL, migraciones, dependencias fijadas, manual, vistas representativas, servicios nuevos, reglas de acceso, importador y pruebas existentes. Se verificó TypeScript con `tsc --noEmit` en backend y frontend: ambos pasan.

**Límite del diagnóstico:** es una revisión estática y de compilación, no una certificación de funcionamiento. No se arrancó Laravel con datos reales, no se ejecutaron migraciones ni pruebas que escriben en Google Cloud y no se comprobó qué versión está desplegada. Los hallazgos de exposición describen el código local; su alcance en producción requiere comprobar el despliegue. No se modificó código funcional.

## 2. Inventario funcional y destino propuesto

“Parcial” significa que existen piezas en la nueva versión, no que el flujo esté validado para producción. Los controladores mencionados pertenecen a `source-code-v1.7/app/Http/Controllers`.

| Área | Funcionalidad original identificada | Situación React/Firebase | Modernización propuesta |
|---|---|---|---|
| Acceso interno | Login, logout, perfil, cambio y recuperación de contraseña. `LoginController`, `UserController`. | No hay flujo completo de login en la interfaz; API con bypass de pruebas. | Autenticación real, sesiones/token, recuperación segura, bloqueo y MFA para administradores. |
| Usuarios y roles | Miembros del equipo, roles configurables, permisos por acción, actividad comercial por usuario. `UserController`, `RoleController`. | Creación de usuarios/perfil y roles generales; faltan administración y permisos equivalentes. | Matriz por módulo, acción y almacén; auditoría y separación de funciones. |
| Productos | SKU, descripción corta/larga, categoría, unidad, impuesto, imagen, copia y consulta de movimientos. `ItemController`. | Listado, ajustes y traslados; no CRUD completo del catálogo. | Catálogo único, validación de SKU, imágenes seguras, búsqueda y baja lógica. |
| Categorías y unidades | Alta, edición, eliminación; categorías con importación/exportación. `CategoryController`, `UnitController`. | Sin mantenimiento completo. | Maestros con restricciones cuando ya tienen operaciones relacionadas. |
| Precios y tarifas | Precios de venta por tipo y moneda; precios de compra y referencia a proveedor. `ItemController`, `SalesTypeController`. | Un precio de compra/venta por producto en el modelo principal. | Conservar listas de precios y relación proveedor-producto; registrar precio histórico en cada documento. |
| Almacenes | Código, nombre, dirección/contacto, ubicación predeterminada y consultas de stock. `LocationController`. | UI limitada a PL y JA. | Almacenes configurables y permisos por ubicación. |
| Inventario | Suma de movimientos por producto/almacén, ingresos, salidas, ajustes y detalle de transacciones. `ItemController`, modelo `Item`. | Ajustes transaccionales y saldo almacenado. | Libro de movimientos auditable y saldos conciliables, motivos obligatorios y controles de concurrencia. |
| Transferencias | Origen/destino, cantidades, consulta, creación y eliminación de traslado. `StockTransferController`. | Servicio de traslado de un producto con entradas/salidas. | Traslado de varias líneas, validaciones, referencia común y reversión controlada. |
| Códigos de barras | Búsqueda de productos y generación de etiquetas. `BarcodeController`. | No implementado. | Etiquetas imprimibles con formatos acordados y búsqueda por lector. |
| Clientes | Ficha, contacto, identificación tributaria, historial de pedidos/facturas/cobros/despachos, contraseña e importación/exportación. `CustomerController`. | Listado básico. | CRUD, búsqueda, historial consolidado y vinculación con acceso al portal. |
| Sucursales del cliente | Contactos y direcciones independientes de facturación/envío. `CustomerController`, `CustomerPanelController`. | Datos embebidos en importador, sin flujo completo de edición. | Separar sucursal del cliente de almacén propio; preservar ambas direcciones. |
| Proveedores | Ficha, contactos/dirección, historial de compras, importación/exportación. `SupplierController`. | Tipos y colección declarados; falta CRUD/API de gestión. | Maestro completo y relaciones con compras/precios. |
| Compras | Orden con proveedor, almacén, artículos, cantidades, impuestos, precios, fecha, referencia, observaciones; edición, eliminación, filtros y documentos. `PurchaseController`. | Servicio de alta y listado; interfaz principalmente de consulta/recepción. | Pedido de compra completo, estados, cantidades pendientes y anulaciones coherentes. |
| Recepciones | Recepción total automática o manual/parcial; documento, edición, eliminación, filtros, correo, PDF e impresión. `ReceiveController`. | Servicio parcial; UI envía cantidades originales completas. | Recibir solo pendientes, rechazar artículos ajenos/sobre-recepción y conservar histórico. |
| Pedidos de venta | Cliente/sucursal, almacén, líneas, tarifa, descuentos, impuestos, notas, referencia, edición, filtros y documentos. `SalesOrderController`. | Alta básica de una línea en UI y listado; faltan varias capacidades. | Formulario multilínea, cálculo en servidor y estado por cantidades facturadas/despachadas. |
| Facturación | Venta directa que crea pedido automáticamente; varias facturas parciales por pedido o factura automática; detalle, edición/eliminación y documentos. `SalesController`, `SalesOrderController`, `InvoiceController`. | Conversión completa de pedido; no conserva facturación parcial ni venta directa equivalente. | Entidades separadas pedido/factura con líneas vinculadas; impuestos, vencimientos, numeración y anulaciones. |
| Cobranza | Pagos totales/parciales, fecha, medio, referencia, recibos, correo, filtros y eliminación que recalcula saldo. `PaymentController`. | Registro de pago contra factura y listado. | Aplicaciones de pago, validación de saldo, idempotencia, reversión auditada y recibos. |
| Despachos | Preparación manual/automática de cantidades facturadas pendientes; empaquetado/entregado, edición, eliminación y documentos. `ShipmentController`. | Copia todas las líneas del pedido y permite marcar entrega. | Parciales, control de pendientes, trazabilidad y comprobante de entrega. |
| Portal del cliente | Login independiente, perfil, sucursales, historial y descarga/impresión de pedidos, facturas, recibos y despachos. `CustomerPanelController`. | No implementado como portal. | Restaurar con aislamiento estricto por cliente y permisos sobre cada documento. |
| Dashboard | Ventas, costos, utilidad, unidades, impuestos, gráfico de últimos 30 días, pendientes y últimos documentos/pagos. `DashboardController`, modelo `Report`. | Conteos y sumas de la primera página. | Agregados reales sobre todo el conjunto filtrado, conciliados con reportes. |
| Reportes | Stock y valoración, ventas por período/detalle diario, historial de ventas/margen, compras y actividad del equipo; filtros y exportaciones. `ReportController`, `UserController`. | No hay sustituto completo. | Reproducir reportes con definiciones acordadas de venta/costo/margen y filtros consistentes. |
| Empresa y preferencias | Datos, logo, moneda, idioma, fechas, impuestos, métodos y plazos de pago. `SettingController`. | Colección prevista, datos fijos en documentos. | Configuración validada y versionada; separar método de pago de vencimiento. |
| Correo y documentos | Configuración SMTP, prueba, plantillas por idioma y adjuntos de documentos comerciales. `EmailController`, `MailTemplateController`. | Servicio llamado PDF devuelve JSON; impresión desde navegador. | Renderizado real, colas, reintentos, trazabilidad de envío y plantillas comunes. |
| Importación y exportación | CSV para productos, clientes, proveedores y categorías; reportes/documentos PDF/CSV. | ETL parcial específico del dump. | Previsualización, validación por fila, errores descargables e importaciones reanudables. |
| Respaldos y mantenimiento | Listado/generación de respaldos, caché, instalador y ruta cron de reinicialización. | Sin proceso operativo integral verificado. | Backups automáticos, restauración ensayada, despliegue reproducible y tareas privadas programadas. |
| Multiempresa | Código que intenta crear/cambiar bases de empresa. `CompanyController`, helpers. | No implementado. | Tratar como decisión de alcance: el dump no tiene tabla `company` y varias llamadas de selección están comentadas. No asumir que funcionaba. |
| Idiomas | Ocho carpetas de traducción (`ar`, `ch`, `en`, `fr`, `po`, `rs`, `sp`, `tu`), sesión de idioma y plantillas localizadas. | Interfaz principalmente española, textos/moneda fijos. | Español como base y otros idiomas según uso; traducciones consistentes en UI y documentos. |

No encontré módulos completos de contabilidad de doble partida, nómina, producción, activos fijos, conciliación bancaria, cuentas por pagar a proveedores, embudo CRM, oportunidades, actividades comerciales, integración tributaria electrónica ni integraciones efectivas con transportistas/pasarelas. Son **ampliaciones posibles**, no funcionalidades que deba atribuir al sistema. Registrar “PayPal”, “tarjeta” o “Yape” como medio de pago no equivale a procesar pagos en esas plataformas. Tampoco la etiqueta “FACTURA ELECTRÓNICA” del prototipo demuestra una integración fiscal.

## 3. Reglas de negocio que deben preservarse o decidirse

### Compras e inventario

1. Crear una orden de compra no ingresa stock: en `PurchaseController::store` la escritura del movimiento está comentada.
2. La recepción total o parcial crea el movimiento de entrada. Hay tres campos históricos de cantidades recibidas/facturadas con significados que deben reconciliarse; no se deben migrar como si fueran equivalentes.
3. Stock histórico = suma de `stock_moves.qty` por SKU y ubicación. Cada traslado tiene salida y entrada; no debe cambiar la existencia global.
4. El sistema viejo edita y elimina movimientos al corregir documentos. La reconstrucción debe conservar la capacidad de corregir mediante contramovimientos, motivo, usuario y vínculo al original.

### Ventas y entregas

1. Un pedido puede crearse sin stock; no representa reserva física automática.
2. La factura genera la salida de stock. El despacho controla entrega de cantidades ya facturadas y no vuelve a descontarlas.
3. Un pedido puede generar varias facturas parciales. Cada línea necesita cantidad pedida, facturada, anulada y despachada.
4. La venta directa crea también un pedido en el legado. Mantener trazabilidad equivalente aunque la nueva pantalla simplifique el proceso.
5. Los descuentos e impuestos deben recalcularse en backend. No aceptar como autoridad el total enviado por el navegador.
6. Si se decide descontar al despachar en vez de al facturar, será un cambio de negocio explícito: requerirá reservas, saldos separados y tratamiento de facturas históricas pendientes de entrega.

### Cobros y documentos

1. Los cobros pertenecen a facturas y modifican saldo. Validar importe positivo, moneda, fecha y saldo pendiente.
2. Un reintento de red no debe duplicar factura, pago, recepción ni movimiento.
3. Eliminar físicamente una factura cobrada/despachada debe reemplazarse por una anulación con reglas y dependencias claras.
4. El dashboard viejo calcula costos/margen a partir de compras agregadas; no constituye una política formal de costeo. Acordar costo promedio/FIFO u otra regla antes de prometer equivalencia contable.
5. Catálogo de monedas y tarifas no acredita conversión cambiaria integral. Si se requiere multimoneda, definir moneda del documento, tipo de cambio y redondeo histórico.

## 4. Hallazgos prioritarios con evidencia

| Prioridad | Hallazgo verificable | Evidencia local | Acción propuesta |
|---|---|---|---|
| P0 | Ruta pública `cronjob` ejecuta seeders; estos incluyen `truncate`; además limpia carpetas de imágenes/logos. | `app/Http/routes.php:8`, `CronController.php:12`, `database/seeds/LocationTableSeeder.php:18`. | Retirar de acceso HTTP; separar datos demo y tareas operativas. Verificar primero si existe despliegue expuesto. |
| P0 | API nueva permite identidad administrativa mediante cabecera de prueba. | `backend-google/src/middleware/authGuard.ts`; `frontend/src/api/client.ts`. | Eliminar bypass accesible al cliente; pruebas únicamente con entorno aislado. |
| P0 | Rutas nuevas de negocio no usan authGuard/roleGuard; solo usuarios/perfil lo aplican. | `backend-google/src/index.ts`. | Autenticación global y autorización por operación y recurso. |
| P0 | Importador asigna 100 unidades a PL y 50 a JA por producto. | `backend-google/src/migration/importLegacySql.ts`. | No usarlo para migración real; reconstruir saldos desde movimientos conciliados. |
| P1 | Portal legado consulta/modifica registros por ID recibido sin comprobar titularidad en varios métodos. | `CustomerPanelController::salesOrder`, `branchEdit`, `branchUpdate`, `viewOrderDetails`. | Limitar consultas al cliente autenticado y probar accesos cruzados. Hay middleware de cliente, pero no basta para aislar registros. |
| P1 | Permisos de formularios no se repiten sistemáticamente en sus escrituras. | Rutas `create-user`/`save-user`, `role/create`/`role/save`; controladores correspondientes. | Autorizar también POST/acciones y exportaciones. |
| P1 | Las 38 tablas del dump usan MyISAM; las operaciones comerciales escriben múltiples tablas por separado. | `rencodie_pedidos.sql`; `SalesController::store`, `PaymentController::createPayment`. | Motor transaccional, restricciones, transacciones completas y prueba de concurrencia. No se afirma que el servidor actual conserve ese motor sin inspeccionarlo. |
| P1 | Lecturas y escrituras Firestore intercaladas dentro de bucles de facturación/recepción. | `sales.service.ts::convertOrderToInvoice`, `purchase.service.ts::receiveGoods`. | Leer todos los documentos antes de escribir; probar dos o más líneas y SKU repetido. Firestore exige lecturas previas a escrituras [S4]. |
| P1 | Impuesto calculado como cero aunque se recibe tax_percent. | `sales.service.ts::createOrder`. | Motor de impuestos/redondeo y pruebas de descuentos más impuestos. |
| P1 | Recepción nueva no comprueba pertenencia a orden ni máximo pendiente; UI reenvía cantidad total. | `purchase.service.ts::receiveGoods`, `PurchasesView.tsx`. | Validar por línea y recibir solo cantidades pendientes. |
| P1 | Despacho nuevo copia el pedido entero sin controlar cantidades ya facturadas/despachadas. | `shipment.service.ts::createShipment`. | Vincular líneas y controlar parciales y reintentos. |
| P1 | Importación incompleta y susceptible a pérdida de significado. | Importador: primer INSERT por tabla, lote único, precios colapsados, detalles sin impuestos, relaciones parciales. | ETL por esquema completo, IDs estables, lotes, conciliación y reanudación. |
| P1 | Reglas Firestore permiten a staff modificar directamente inventario/documentos; esto puede evitar la lógica de servicios. | `backend-google/firestore.rules`. | Impedir escrituras directas de saldos/documentos o aplicar invariantes equivalentes; el Admin SDK omite estas reglas [S5]. |
| P1 | Creación de usuario captura errores de Auth y continúa guardando perfil; incluye contraseña predeterminada. | `user.service.ts`. | Fallar de forma explícita, compensar operaciones incompletas e invitar con credencial individual. |
| P2 | Numeración nueva usa solo últimos seis dígitos de milisegundos; no garantiza unicidad. | Servicios de compras, ventas, pagos y recepciones. | Series/correlativos atómicos con restricción única; conservar número antiguo como referencia histórica. |
| P2 | Listados limitan resultados pero no ofrecen cursor; dashboard presenta primera página como total. | `index.ts`, `DashboardView.tsx`. | Paginación real, orden estable, filtros y métricas agregadas. |
| P2 | No hay validación Zod aplicada pese a declararse como dependencia; se confía en DTO TypeScript y user_id enviado. | Servicios y rutas del backend. | Validación en ejecución, cantidades finitas/positivas, porcentajes válidos e identidad desde sesión. |
| P2 | Importes `double` y `number`; documentos incluyen datos empresariales fijos; alerta de stock genera documentos repetidos. | Dump SQL, `pdf.service.ts`, `onStockAlert.ts`. | Decimales exactos, configuración real y alertas con deduplicación/resolución. |

Existen `.env`, respaldos y un archivo `serviceAccountKey.json` en el árbol. No se reprodujo su contenido. Revisar permisos, historial y exclusiones; sustituir credenciales distribuidas por gestión de secretos y rotar las que se confirme que fueron expuestas. La presencia del archivo no prueba por sí sola una filtración.

Hay rutas cuyo método no se encuentra en su controlador ni en la base revisada: `ItemController@update`, `SalesController@pdfview`, `SettingController@company`, `ReportController@purchaseYearList`, `ReceiveController@allStore`. Esto indica residuos o enlaces rotos potenciales, no que toda esa área carezca de implementación: por ejemplo, recepción total sí existe en `allReceive`. El detector también señala `CustomerAuth\\AuthController@login`, pero ese método se incorpora mediante el trait de autenticación y no se considera faltante.

## 5. Tecnología: qué reemplazar y qué aprovechar

| Componente observado | Tratamiento |
|---|---|
| Laravel 5.2.45 y requisito PHP >=5.5.9 | Proyecto nuevo con versión soportada; el requisito no demuestra la versión de PHP instalada. No encadenar una actualización de diez generaciones como estrategia principal. |
| Helpers con mcrypt y recuperación de contraseña propia | Sustituir por autenticación y criptografía del framework moderno. |
| PHPExcel 1.8.1 / Excel 2.1 | Reemplazar por solución mantenida de CSV/XLSX compatible con el stack elegido. PHPExcel está archivado [S3]. |
| Dompdf 0.8.x, paquetes antiguos de backup/HTML | Sustituir o actualizar a implementaciones mantenidas, con validación de renderizado y restauración. |
| Gulp 3, Elixir 5, Bootstrap 3 | Rehacer compilación e interfaz; conservar solo flujos y referencias visuales útiles. |
| React/TypeScript existentes | Aprovechar estructura visual y conceptos, tras corregir autenticación, datos fijos y cobertura. No asumir que cada componente está terminado. |
| Firebase/Cloud Functions | Arquitectura alternativa viable, pero requiere completar consistencia, controles de acceso, reportes y migración. Compilar no prueba paridad. |
| Pruebas existentes | Laravel tiene prueba de ejemplo; scripts nuevos hacen operaciones y registran resultados, sin una batería completa de invariantes. Crear pruebas de negocio aisladas. |

### Opción recomendada: núcleo relacional modular

Propuesta de base: **Laravel 13, PHP 8.5 con parche vigente, MySQL 8.4/InnoDB, React + TypeScript**, almacenamiento de documentos/imágenes separado y ejecución de correo/exportaciones mediante colas. Laravel 13 y PHP 8.5 figuran en las políticas actuales consultadas; las versiones exactas de todos los paquetes deben fijarse al iniciar y comprobarse en conjunto [S1, S2].

Organizar como una sola aplicación con módulos internos separados: identidad, maestros, inventario, compras, ventas, cobranza, logística, reportes y portal. Cada módulo expone operaciones explícitas y evita escrituras dispersas entre controladores. Usar restricciones de base, importes decimales y eventos posteriores a la confirmación de la transacción. No es necesario introducir microservicios para este alcance.

La base relacional encaja con pedidos, líneas, facturas parciales, pagos, recepciones y reportes cruzados que ya existen. Esta es una recomendación de ingeniería por las relaciones encontradas, no una conclusión de que Firestore no soporte transacciones.

Google Cloud puede seguir siendo una opción de alojamiento; elegirlo no obliga a utilizar Firestore como libro principal del ERP. El costo y operación de una base gestionada deben estimarse con volumen real, no prometerse gratuitos.

### Alternativa: continuar el backend Firebase

Conservar React, TypeScript, Auth, Functions y Firestore, completando los módulos de la matriz. Exige rediseñar relaciones e IDs, escrituras privilegiadas, transacciones multilínea, agregados, límites de documentos, consultas y conciliación. Mantener migración y entornos de prueba separados; evitar editar saldos desde SDK cliente.

La carpeta `.antigravityrules` documenta una dirección previa hacia Firebase y restricciones de costos. Se registra como antecedente, pero la solicitud actual es evaluar un plan. La opción relacional es una propuesta de cambio de dirección que se decidirá contigo. Si se elige Firebase, el núcleo financiero también requiere atomicidad; no conviene mantener la regla local que limita transacciones únicamente a stock. Tampoco `maxInstances: 1` garantiza gasto cero.

| Decisión | Relacional modular | Continuar Firestore |
|---|---|---|
| Relaciones y reportes | Modelo cercano al negocio legado, joins y restricciones. | Requiere desnormalización y agregados mantenidos. |
| Trabajo existente aprovechable | UI y especificación de flujos; backend se reconstruye. | UI y servicios, después de corregirlos. |
| Integridad | Transacciones, claves foráneas e índices únicos. | Transacciones y validación de relaciones en aplicación. |
| Operación | Base y aplicación con respaldos y monitoreo. | Operación distribuida y control de lecturas/escrituras/eventos. |
| Recomendación | Preferida para recuperar toda la funcionalidad del ERP. | Elegible si conservar Firebase es una prioridad explícita. |

## 6. Migración de datos

El dump principal tiene 38 tablas. Este es el mapa inicial completo, agrupado por destino:

| Tablas de origen | Tratamiento |
|---|---|
| `item_code`, `stock_master`, `stock_category`, `item_unit`, `item_tax_types` | Productos, categorías, unidades e impuestos. Conciliar duplicación de maestros y conservar imágenes del sistema de archivos. |
| `sale_prices`, `sales_types`, `purchase_prices` | Tarifas, listas y precios por proveedor/moneda; no reducir a un único valor. |
| `location`, `stock_moves`, `stock_transfer` | Almacenes, libro histórico y traslados. Saldos derivados y conciliados. |
| `debtors_master`, `cust_branch`, `suppliers` | Clientes, sucursales/direcciones, proveedores; preservar IDs antiguos y duplicados documentados. |
| `purch_orders`, `purch_order_details`, `receive_orders`, `receive_order_details` | Compras y recepciones con líneas vinculadas y cantidades pendientes. |
| `sales_orders`, `sales_order_details` | Separar pedidos 201 y facturas 202; conservar referencias, relaciones, descuentos/impuestos, cantidades y estado histórico. |
| `shipment`, `shipment_details` | Despachos, líneas, estado y fechas. |
| `payment_history`, `payment_terms`, `invoice_payment_terms` | Cobros, medios y vencimientos. Validar semántica: los nombres históricos son confusos. |
| `users`, `roles`, `permissions`, `role_user`, `permission_role` | Identidad y autorización. No copiar sesiones; verificar estrategia de hash o restablecimiento de contraseñas. |
| `preference`, `currency`, `countries`, `email_config`, `email_temp_details` | Configuración, catálogos y plantillas. Secretos de correo se configuran mediante canal seguro. |
| `backup`, `migrations`, `password_resets` | Archivo técnico histórico; no activar tokens ni metadatos de migración viejos en la aplicación nueva. |

Proceso propuesto:

1. Identificar origen oficial: dump vigente, fecha de corte, archivos de imágenes y datos creados después en Firebase. Si hay operaciones reales allí, reconciliar ambas fuentes.
2. Guardar una copia verificable y restaurarla en un entorno aislado. No fusionar a ciegas todos los respaldos.
3. Perfilar cantidades de registros, claves duplicadas, referencias huérfanas, SKU con ceros iniciales, fechas inválidas, monedas, cantidades fraccionarias y saldos negativos.
4. Crear tabla de equivalencias de IDs por entidad, preservando número/referencia original; nunca transformar un SKU numérico textual de manera que pierda ceros.
5. Migrar maestros, cabeceras y líneas en orden de dependencias; después movimientos, cobros y documentos. Importador idempotente, por lotes y con errores recuperables. Preferir extracción desde SQL restaurado frente a interpretar un dump con expresiones regulares.
6. Conciliar por SKU/almacén, cliente/factura y compra/línea. Registrar diferencias y su resolución: no ajustar automáticamente para que cuadren.
7. Ensayar al menos una migración completa con tiempos, informe de errores y restauración.
8. En el corte, congelar escrituras del origen, migrar delta, conciliar y habilitar el destino. Mantener legado solo lectura.
9. Definir reversión antes del corte: si el destino ya recibió operaciones, exportarlas/reconciliarlas; volver a una copia antigua sin ellas perdería transacciones.

## 7. Plan de acción por fases

Estimación orientativa de esfuerzo, no compromiso de calendario: **22–34 semanas-persona**, antes de contingencia, para recuperar el alcance identificado con pruebas y migración. Supone una empresa, operación web, sin contabilidad integral ni integración fiscal nueva; depende de calidad de datos y disponibilidad para validar. Para planificación reservar 20–30% de contingencia. Con más personas puede haber trabajo paralelo, pero datos, inventario y ventas tienen dependencias reales.

| Fase | Entregables concretos | Dependencias | Esfuerzo orientativo | Condición de salida |
|---|---|---|---|---|
| 0. Validación y contención | Confirmar versión en uso, datos oficiales, usuarios/almacenes, cerrar accesos de prueba si están expuestos y respaldar; aprobar matriz y arquitectura. | Revisión de este plan. | 1–2 semanas-persona | Alcance, fuente de datos y reglas de stock acordados. |
| 1. Base de aplicación | Entornos separados, autenticación, permisos, auditoría, migraciones, CI, manejo de errores, colas, secretos y restauración inicial. | Fase 0. | 2–3 | Pruebas de acceso y aislamiento pasan; despliegue de pruebas reproducible. |
| 2. Maestros | Empresa/preferencias, usuarios/roles, clientes/sucursales, proveedores, productos, categorías, unidades, impuestos, tarifas, almacenes e importación inicial. | Fase 1. | 3–4 | Altas/ediciones/importaciones y restricciones funcionales verificadas. |
| 3. Inventario y compras | Libro de movimientos, ajustes, traslados, compras, recepciones parciales/totales y anulaciones. | Fase 2. | 4–6 | Stock conciliado; concurrencia y recepción parcial verificadas. |
| 4. Ventas, facturación y cobranza | Pedidos multilínea, venta directa, facturación parcial/total, descuentos, impuestos, pagos, saldos y numeración. | Fase 3. | 5–7 | Un ciclo de venta completo cuadra en documentos, stock y cobros. |
| 5. Logística, portal y documentos | Despachos parciales, entregas, portal, PDF/impresión, etiquetas y correo con plantillas. | Fases 2 y 4. | 3–5 | Cliente accede solo a lo suyo; entregas no duplican salida de stock. |
| 6. Reportes, migración final y puesta en marcha | Dashboard/reportes reconciliados, restauración ensayada, carga, migración final, manuales, capacitación y seguimiento. | Todas las anteriores. | 4–7 | Aceptación operativa, conciliaciones aprobadas y reversión ensayada. |

Cada fase produce una demostración con datos de prueba y una lista de aceptación. La migración se prepara desde fase 0 y se ensaya a medida que aparecen módulos; no se posterga todo el trabajo de datos hasta el final. Tampoco se reemplaza el sistema operativo por una versión que solo cubra el primer grupo de pantallas.

## 8. Pruebas y criterios de aceptación

| Caso | Resultado esperado |
|---|---|
| Compra de 10 unidades; recibir 4 y después 6 | Stock aumenta 10 en total; pendientes 6 y después 0; dos recepciones trazables. |
| Recibir un producto ajeno a la compra o más del pendiente | Rechazo completo, sin cambios parciales. |
| Pedido de 10; facturar 3 y después 7 | Dos facturas vinculadas; salida de 10 en total; nunca una tercera por cantidades ya facturadas. |
| Dos usuarios intentan vender la última unidad | Solo una operación confirma; sin stock negativo. |
| Documento de dos o más líneas y SKU repetido | Se aplica una política explícita de consolidación o rechazo, sin perder movimientos ni romper la transacción. |
| Pago parcial y reenvío de la misma solicitud | Un solo cobro, saldo correcto; importe mayor al saldo se rechaza o se trata según política aprobada. |
| Despachar una parte y luego el resto | Solo cantidades facturadas pendientes; stock no se descuenta nuevamente. |
| Anulación de recepción/factura/pago con dependencias | Rechazo o reversión autorizada; conserva histórico y recalcula saldos. |
| Acceso de otro cliente o empleado sin permiso | Datos y operaciones denegados en API, PDF, exportaciones y UI. |
| Más de 50 registros | Todas las páginas accesibles; totales/reportes completos, sin depender del tamaño de página. |
| Impuestos, descuentos, decimales y moneda | Resultados acordados por línea/documento, consistentes entre UI, base, PDF y reportes. |
| Restauración y migración repetida | Recuperación completa y ausencia de duplicados; diferencias detectadas y explicadas. |

Condiciones mínimas para producción: ninguna brecha P0/P1 abierta en el alcance activo; importes y existencias conciliados sin diferencias inexplicadas; roles verificados; backups restaurables; documentos revisados; prueba operativa por usuarios responsables. Metas de rendimiento, concurrencia y recuperación se fijan con volumen y tolerancia de interrupción reales.

## 9. Decisiones para tu revisión

1. **Arquitectura:** recomendación relacional con Laravel moderno, o continuar la dirección Firebase documentada en la carpeta.
2. **Alcance:** recuperar primero el ERP comercial/inventario existente; confirmar si CRM comercial, contabilidad, cuentas por pagar o facturación electrónica deben añadirse como proyectos explícitos.
3. **Operación:** una o varias empresas, almacenes, usuarios, volumen y necesidad de trabajo sin conexión.
4. **Reglas:** salida al facturar o al despachar; reservas; stock negativo; precios/impuestos; monedas y costeo; anulaciones y devoluciones.
5. **Datos:** cuál es la fuente vigente y si el prototipo Firebase ya contiene operaciones reales.
6. **Prioridad:** qué módulos se usan diariamente, qué reportes/documentos son imprescindibles y qué funciones pueden retirarse de forma acordada.

La implementación empieza después de revisar estas decisiones. Este documento propone cobertura y orden de trabajo; no autoriza un cambio de plataforma ni un despliegue por sí mismo.

## 10. Evidencia y fuentes

El archivo hermano `inventario-tecnico.json` enumera rutas con línea de origen y las 38 tablas/columnas, sin copiar registros de clientes ni credenciales. Su detección de métodos es textual y no resuelve herencia/traits; por ello no debe utilizarse sola como prueba de ruta rota.

Evidencia principal: `source-code-v1.7/app/Http/routes.php`, controladores y modelos citados, `composer.json`, `composer.lock`, `rencodie_pedidos.sql`, `documentation/index.html`, `backend-google/src`, `backend-google/firestore.rules` y `frontend/src`.

Fuentes primarias consultadas para verificar soporte y comportamiento técnico:

- [S1: Laravel, versiones y soporte](https://laravel.com/framework/docs/13.x/releases).
- [S2: PHP, versiones soportadas](https://www.php.net/supported-versions.php).
- [S3: PHPExcel, repositorio archivado](https://github.com/PHPOffice/PHPExcel).
- [S4: Firestore, transacciones y escrituras por lotes](https://firebase.google.com/docs/firestore/manage-data/transactions).
- [S5: Firestore, reglas y bibliotecas de servidor](https://firebase.google.com/docs/firestore/security/rules-conditions).
- [S6: MySQL, características de MyISAM](https://dev.mysql.com/doc/refman/8.4/en/myisam-storage-engine.html).
