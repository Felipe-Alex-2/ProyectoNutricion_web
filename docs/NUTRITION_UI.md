# Planes y alimentación (CU-13 a CU-18)

## Paciente

**Mi plan** muestra el plan aprobado por el profesional. **Mi alimentación** permite registrar una comida manualmente, analizar una foto con IA y consultar el historial con calorías y macronutrientes. Una respuesta perdida en un registro manual conserva el identificador al reintentar para evitar duplicados.

La consulta y el registro sin conexión están implementados en la app móvil, incluyendo cola segura, reintentos y consulta del plan descargado. La web indica este acceso al paciente.

## Profesional y administrador

**Atención nutricional → Alimentación y fotos IA** permite usar el análisis propio o seleccionar un paciente autorizado. El backend verifica clínica y vínculo; los controles del navegador no sustituyen esa autorización. El registro manual de un paciente se realiza desde su propia cuenta.

La generación de planes se encuentra en la atención del paciente mediante el modal existente. Aprobar asigna el plan inmediatamente; crear una receta adicional no es un paso obligatorio. El paciente recibe una notificación y puede consultarlo en web y móvil.

## Publicación

Web principal: https://main.d15488ot8dvqa1.amplifyapp.com

API: https://proyectonutricionbackend-production-8308.up.railway.app/api/v1

`environment.prod.ts` utiliza el dominio público HTTPS; `environment.ts` conserva la API local para desarrollo. Las claves de Gemini se configuran exclusivamente en las variables del servicio backend de Railway.

Validación: `npm test -- --watch=false` y `npm run build`. El aviso previo de tamaño del CSS del dashboard no impide la compilación.
