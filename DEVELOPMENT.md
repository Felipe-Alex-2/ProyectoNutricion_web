# Desarrollo

Node 24; `npm ci`, `npm start`. Desarrollo apunta a http://localhost:8000/api/v1; producción usa src/environments/environment.prod.ts. Ajusta esa URL cuando cambies Railway y permite el dominio Vercel exacto en CORS del backend.

Validación: `npm test -- --watch=false` y `npm run build -- --configuration production`.

La sesión renueva tokens mediante el backend; requiere desplegar los cambios de backend junto con los clientes. El dashboard carga datos por pestaña y diálogos bajo demanda. La lista de pacientes y el selector de recetas tienen páginas de 50. Se conserva el aviso de tamaño CSS: falta dividir las vistas grandes en componentes con sus propios estilos. No aumentar el presupuesto para ocultarlo.


## PWA de NutriSalud

Producción genera `manifest.webmanifest`, iconos propios y el service worker de Angular.
La identidad estable es `/nutrisalud-app`; no reutilizar este ID en otros proyectos.
El nombre instalado es NutriSalud y el inicio es `/?source=pwa-nutrisalud`.
El alcance es la raíz de este despliegue: está pensado para el dominio dedicado de
NutriSalud (actualmente `main.d15488ot8dvqa1.amplifyapp.com`).

Para separar Nutrición de Vestidor:

- Publicar cada app en un dominio o subdominio diferente. El ID propio distingue la
  instalación; el origen separado también aísla service workers y almacenamiento.
- En local, usar un puerto diferente para cada proyecto. No alternar proyectos en
  el mismo `localhost:puerto` con PWAs instaladas o service workers activos.
- Si se alojan bajo un mismo origen, usar carpetas hermanas sin solapamiento,
  ajustar `base href`, `start_url`, `scope` y la ruta del service worker, y recompilar.
  Cambiar únicamente el nombre o el icono no resuelve un alcance compartido.
- No se modifica ni desinstala Vestidor desde este proyecto. Una instalación antigua
  creada con identidad compartida puede requerir quitar ese acceso y reinstalar
  desde la URL correcta. No borrar datos del navegador sin revisar qué contienen.

El aviso usa el diálogo del navegador cuando está disponible. En iPhone/iPad ofrece
las instrucciones para Safari; se oculta en modo instalado y se puede cerrar.
HTTPS es necesario en producción; localhost permite probar localmente.

El service worker conserva el código y los recursos de la interfaz para abrirla sin
red después de una primera carga. No añade caché de respuestas clínicas, tokens,
pagos ni llamadas a Railway; las funciones que consultan el backend requieren red.
Las nuevas versiones se descargan y se usan al volver a abrir la app.
En el hosting, servir los archivos PWA reales antes del fallback SPA; no convertir
`ngsw-worker.js`, `ngsw.json` o `manifest.webmanifest` en respuestas HTML.
Las cabeceras de actualización están configuradas en `customHttp.yml` para Amplify
y `vercel.json` para Vercel.

Prueba local, con un puerto reservado para NutriSalud:

```powershell
npm run build
npx http-server dist/web/browser -p 4280 -c-1
```

Abrir `http://localhost:4280`, revisar Application → Manifest / Service Workers en
DevTools y comprobar la instalación. `npm start` no registra el service worker de
producción. En el dispositivo se instalará desde la URL HTTPS tras desplegar.
