# Desarrollo

Node 24; `npm ci`, `npm start`. Desarrollo apunta a http://localhost:8000/api/v1; producción usa src/environments/environment.prod.ts. Ajusta esa URL cuando cambies Railway y permite el dominio Vercel exacto en CORS del backend.

Validación: `npm test -- --watch=false` y `npm run build -- --configuration production`.

La sesión renueva tokens mediante el backend; requiere desplegar los cambios de backend junto con los clientes. El dashboard carga datos por pestaña y diálogos bajo demanda. La lista de pacientes y el selector de recetas tienen páginas de 50. Se conserva el aviso de tamaño CSS: falta dividir las vistas grandes en componentes con sus propios estilos. No aumentar el presupuesto para ocultarlo.
