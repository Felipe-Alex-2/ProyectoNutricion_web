# Acceso NutriSalud con carrusel

Referencia: `C:/Users/Felipe/Proyectos/ProyectoVestidor/GUIA_LOGIN_REGISTRO_CARRUSEL.md`. Se adaptó su composición de dos columnas a NutriSalud, conservando la autenticación del proyecto.

- Login y registro comparten `AuthShellComponent`, estilos de formulario y `AuthShowcaseComponent`.
- El formulario queda a la izquierda y las escenas a la derecha. A 650 px o menos, el carrusel pasa debajo del formulario y mide 360 px.
- Las escenas cambian cada 10 segundos. Hay botones anterior/siguiente, selección directa y pausa. La rotación se suspende al pasar el puntero, enfocar controles o esconder la pestaña. Con movimiento reducido, comienza pausado. El temporizador se elimina al abandonar la pantalla.
- Cerrar sesión conserva la revocación y limpieza de credenciales y ahora navega a `/`. La expiración de sesión conserva su flujo existente hacia login.
- Se mantienen los validadores, recuperación de contraseña y registro con inicio de sesión automático. No se enviaron datos ni se crearon cuentas reales durante la revisión visual.

## Imagen generada

Herramienta: ImageGen integrado, sin CLI. Asset del proyecto: `public/images/nutrisalud-auth-scenes.webp`, 1672 × 941 px, aproximadamente 212 kB. Tres escenas en un archivo, mostradas mediante recortes SVG sin distorsión. El original permanece en el directorio de imágenes generadas de Codex.

Prompt utilizado:

> Create ONE premium editorial photography triptych image for a nutrition and wellness web app authentication carousel. Landscape overall image, three EQUAL WIDTH vertical photographic panels edge to edge, clean straight boundaries at exactly one third and two thirds. No gutters, no borders, NO TEXT, no lettering, no logos, no UI. Each panel independently composes a portrait scene, important subjects centered within their own third. Consistent soft natural daylight, sophisticated warm mint and teal palette, cream, subtle warm amber accents, natural realistic textures, uplifting calm professional wellness brand. LEFT THIRD: close-up beautiful balanced meal in white ceramic bowl, colorful leafy greens, avocado, quinoa and roasted vegetables on a light mint table with linen and subtle teal napkin, overhead angled editorial food photograph. CENTER THIRD: friendly female Latin American nutritionist wearing muted teal blouse consulting with an adult female patient in a bright welcoming modern nutrition practice, relaxed seated interaction, healthy plant and small bowl of fruit nearby; no medical procedures or visible writing. RIGHT THIRD: adult Latin American woman enjoying a peaceful outdoor walk in green park, light neutral athletic clothes, holding a reusable teal water bottle, warm candid morning light. Composition: leave upper 15 percent and bottom 30 percent of EACH panel visually calm for later UI overlay, all faces and meal well within central area. Photorealistic premium lifestyle photography, credible people, no exaggerated poses. The three panels must be exactly equal width and fill the full image.

## Verificación

Compilación de producción completada. 16 pruebas automatizadas aprobadas, incluyendo el ciclo del carrusel, pausa y controles manuales, preferencia de movimiento reducido, limpieza del temporizador y redirección del logout incluso cuando falla la revocación remota. Se conserva la advertencia previa por tamaño del CSS original del dashboard.
