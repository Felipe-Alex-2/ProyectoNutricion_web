# Paquetes y revisión funcional

## Menú del equipo

El menú se define en `staff-navigation.model.ts` y se presenta mediante `StaffNavigationComponent`.

| Paquete | Secciones |
| --- | --- |
| Inicio | Resumen |
| Pacientes | Gestión de pacientes, vinculación |
| Atención nutricional | Evaluación nutricional, planes y recetas, citas |
| Caja y pagos | Caja y cobros; comprobantes dentro del flujo de pago |
| Reportes y analítica | Consulta, filtros y exportación de reportes |
| Administración | Organizaciones, equipo, roles y permisos |
| Seguridad y auditoría | Bitácora y copias de seguridad |

Los paquetes abiertos permanecen expandidos al navegar y se cierran únicamente al pulsar su encabezado. Se pueden mantener varios abiertos. Al cambiar de sección se abre su paquete sin cerrar los demás. Se ocultan paquetes o enlaces no autorizados para el rol. Las notificaciones están en la campana superior. Perfil continúa en el acceso personal del encabezado. La organización del menú no altera las autorizaciones del backend ni crea roles nuevos.

## Corrección de vistas superpuestas

Perfil dependía de un booleano independiente de la sección activa. Ahora depende de `activeTab === 'perfil'`; `isEditing` se deriva del mismo estado. Se probó Perfil → cada sección del menú y Perfil → Notificaciones.

Al navegar se cierran todos los modales, incluidos los que antes faltaban: receta, plan IA y detalle de pago. También se detienen grabación y reproducción de voz. Una respuesta tardía al guardar perfil no devuelve al usuario a otra página ni presenta mensajes en una sección ajena. El cliente tampoco presenta errores de una operación anterior después de cambiar de página.

Las secciones se sincronizan con `?tab=`. Se comprobó navegación por URL y con Atrás/Adelante. Se conservan los alias antiguos de pagos/suscripciones. Las rutas desconocidas vuelven al resumen y las secciones administrativas continúan limitadas por rol.

Se corrigió además la condición de apertura del modal de restauración para que coincida con los administradores autorizados por la API. No se ejecutó ninguna restauración real.

## Comprobaciones ejecutadas

| Área | Resultado |
| --- | --- |
| Web: compilación de producción | Correcta |
| Web: suite de pruebas | 23 pruebas aprobadas |
| Backend: `backend/.venv/Scripts/python.exe -m pytest tests -q` | 60 pruebas aprobadas |
| Móvil: `flutter test --no-pub` | 28 pruebas aprobadas |
| Móvil: `flutter analyze --no-pub` | Sin problemas |
| Navegador | Paquetes, Perfil → Caja, Atrás y Adelante revisados con datos ficticios |

Las suites existentes incluyen autenticación, sesiones, aislamiento por organización, permisos, recetas, registros clínicos, planes IA, validaciones, pagos y comprobantes, así como comportamiento de caché, suscripciones y pantallas móviles. Las pruebas nuevas cubren los siete paquetes, cada salida del perfil, cierre de modales, respuestas tardías y navegación por URL.

## Alcance y límites

Las pruebas del backend emplean una base SQLite aislada. La revisión visual autenticada utiliza una copia temporal con datos ficticios y sin acceso al backend real. No se cargaron datos clínicos reales ni se realizaron pagos, restauraciones, envíos de correo o solicitudes reales a Gemini/PayPal. Por tanto, estos resultados no certifican las credenciales ni la conectividad de los proveedores en producción.

Persisten las advertencias de deprecación de las dependencias de pruebas del backend y la advertencia ya existente del CSS original del dashboard: aproximadamente 77,67 kB frente al umbral de aviso de 60 kB. No impiden la compilación ni las pruebas.

Captura: `docs/ui/paquetes-navegacion.jpg`.
