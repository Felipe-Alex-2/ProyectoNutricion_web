# Web: trabajo del nutricionista sin conexión

Al iniciar sesión con una cuenta del equipo se descarga una copia por usuario, empresa y sucursal. El panel superior del área de trabajo muestra **Última copia**, **Copiar ahora**, **Sincronizar pendientes** y una lista numerada de las operaciones guardadas.

El aviso **Modo offline · Sin conexión** permanece visible al desplazarse; la lista numerada se abre automáticamente al haber pendientes. Con Wi-Fi conectado pero sin acceso al servidor, los reintentos mantienen el aviso hasta recuperar una respuesta real.

La copia incluye pacientes accesibles, anamnesis, registros y evaluación nutricional disponible, planes, recetas, citas e información de caja y sucursales. Los pacientes se descargan por páginas, no solo los primeros 50. Las consultas de pacientes por búsqueda y estado funcionan sobre esa colección descargada. Los datos de lectura caducan a los 30 días.

Sin conexión se permite:

- Consultar la información descargada y los planes y recetas.
- Crear recetas, incluyendo los pacientes seleccionados, como pendientes de sincronizar.
- Guardar cobros **solo en efectivo** como pendientes. No se suman a ingresos confirmados ni se generan comprobantes hasta que el servidor acepte el registro.

PayPal, generación con IA y cambios de registros clínicos requieren conexión. Una receta pendiente se muestra identificada; su edición requiere sincronizarla primero. Los errores de permisos, datos o conflictos permanecen visibles en el panel con opciones de reintentar o descartar.

La copia se actualiza cada hora mientras la web está abierta y al regresar a una pestaña cuya copia tenga más de una hora. Los navegadores pueden suspender pestañas en segundo plano: no es una tarea del servidor ni funciona con el navegador cerrado. Al recuperar internet se sincroniza la cola y luego se actualiza la copia. Los reintentos conservan el identificador original para evitar duplicados.

El contenido se almacena cifrado con AES-GCM en IndexedDB, con una clave no exportable del navegador. La copia y los pendientes pertenecen a este navegador/dispositivo; borrar los datos del sitio los elimina. El usuario debe volver a su empresa/sucursal para sincronizar las operaciones de ese espacio.

## Uso y despliegue

Publicar backend y web juntos. No se requieren variables nuevas ni migraciones para esta función. Abrir la web con internet, iniciar sesión y esperar la última copia antes de probar sin conexión. Para poder recargar la página completamente sin internet se requiere el build de producción con el service worker registrado, mediante HTTPS o localhost; `ng serve` de desarrollo no registra ese service worker. [Documentación de Angular](https://angular.dev/ecosystem/service-workers/getting-started).

Validar con `npm test -- --watch=false --include=src/app/core/services/offline.spec.ts` y `npm run build`.

Prueba manual: esperar la copia, desactivar internet, abrir un paciente y su evaluación/plan, crear una receta, registrar un cobro en efectivo, recargar la página y revisar la cola. Recuperar internet y verificar que cada operación aparezca una sola vez y que el comprobante del cobro esté disponible después de sincronizar.
