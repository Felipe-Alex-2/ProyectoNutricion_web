# NutriSalud · Rediseño de la interfaz web

Implementado sobre la aplicación Angular existente. Referencia visual: las cuatro capturas aportadas por el usuario. Guía consultada: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), instalada en el directorio personal de skills de Codex.

## Dirección visual

Soft Clay UI: fondo menta claro, superficies blancas, turquesa, tarjetas de 28 px, sombras suaves, iconos SVG y tipografía Plus Jakarta Sans. Se conserva el modo oscuro. Los tokens compartidos están en `src/soft-ui.css`, importados desde `src/styles.css`.

## Experiencias

- `/`: landing pública con información de NutriSalud y acceso a registro, inicio de sesión y espacio personal. El panel ilustrativo está identificado como ejemplo y no expone datos de pacientes.
- `/dashboard`, para clientes: espacio personal con navegación superior, notificaciones y menú de cuenta. Incluye plan aprobado, recetas asignadas, menú semanal, vinculación, ficha de salud, citas, chat Carlitos, análisis de comida, suscripción, comprobantes PDF y edición del perfil. Se utilizan las API existentes; los accesos Premium continúan bajo autorización del backend.
- `/dashboard`, para el equipo: se conservan los módulos y permisos existentes. Se renuevan el menú lateral, encabezado, panel inicial, formularios y superficies. En pantallas estrechas el menú se despliega mediante un botón; cuando está cerrado queda fuera de la navegación por teclado.

## Datos y alcance

El panel inicial consulta datos del backend: pacientes activos, citas confirmadas y pendientes, agenda por mes y últimos movimientos de caja. El filtro de organización está disponible para ADMIN_SAAS. Al abrir un módulo desde el resumen se transmite el contexto de organización a sus filtros. Las respuestas de una selección anterior se descartan cuando llega una respuesta atrasada.

La gráfica representa **citas programadas**, excluye cancelaciones y permite ver 3, 6 o 12 meses. No representa consultas completadas: el sistema actual aún no tiene un estado que certifique la atención. El contador del directorio consulta hasta 5.000 pacientes y muestra `+` al alcanzar ese límite.

El catálogo de roles del backend contiene ADMIN_SAAS, ADMIN_ORGANIZATION, NUTRICIONISTA y CLIENTE. Caja mantiene estos permisos; este cambio no crea un rol CAJERO ni modifica autorizaciones del backend.

Este trabajo cambia la interfaz web y expone funciones existentes al cliente. No modifica la aplicación Flutter ni añade PWA, biometría, IA offline, pagos QR o una nueva API de voz.

## Verificación

- Compilación de producción completada.
- 12 pruebas automatizadas: incluye validación de ficha y consentimiento, acceso a recetas asignadas, exclusión de navegación administrativa del cliente, rechazo de archivos no admitidos y protección frente a respuestas atrasadas al cambiar de organización.
- Revisión visual en navegador de landing, panel del personal, Caja, espacio del cliente y plan semanal; revisión a 375 px y del modo oscuro.
- Las pantallas autenticadas se revisaron en una copia temporal aislada, con cuentas y datos ficticios, sin enviar solicitudes al backend real. Las capturas de `docs/ui/` lo indican. No se completaron transacciones ni llamadas reales de IA durante la verificación.
- La hoja de estilos original del dashboard conserva su advertencia de presupuesto: aproximadamente 77,67 kB frente al umbral de advertencia de 60 kB; la compilación no falla.

## Capturas de revisión

- `ui/panel-personal.jpg`: resumen del administrador, datos ficticios.
- `ui/espacio-cliente.jpg`: inicio del cliente, datos ficticios.
- `ui/cliente-movil.jpg`: cliente en pantalla estrecha, datos ficticios.
- `ui/landing.jpg`: landing pública.
