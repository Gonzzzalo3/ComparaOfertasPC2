# ComparaOfertas

Catálogo web de demostración para comparar ofertas de cadenas. Permite buscar productos, filtrar por categoría y tienda, normalizar precios por kilogramo/litro/unidad, comparar presentaciones, guardar favoritos y umbrales en el navegador y armar una lista para ver el total por tienda.

## Stack

- **React 19 + Vite 6:** interfaz rápida y adaptable a móvil.
- **Node 22 + Express 5:** API REST pequeña, entrega la web y consulta el catálogo.
- **Supabase Postgres + `supabase-js`:** catálogo compartido de promociones. La API solo hace `SELECT` y la tabla aplica Row Level Security para exponer ofertas vigentes y con stock.
- **Render:** servicio web Node para publicar frontend y API bajo un mismo origen.
- **GitHub Actions:** lint, pruebas de reglas de negocio y API, auditoría de dependencias y build; Render puede esperar a que pasen los checks.

El sitio inicia con un catálogo ficticio de 14 ofertas. La interfaz lo identifica como demostración y recomienda verificar cada oferta en la tienda. No se necesita ninguna credencial para probar el modo local.

## Ejecutar en local

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. La API de desarrollo escucha en el puerto 10000. Para validar el paquete de producción: `npm run check`.

## Conectar Supabase

1. Ejecuta `supabase/migrations/202611190001_initial.sql` en el SQL Editor del proyecto.
2. Define `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `.env` local o como variables privadas del servicio en Render. Copia el endpoint y la clave pública (`anon` o publishable) desde la configuración del proyecto. La clave `service_role` no se usa.
3. Reinicia el servidor. `/api/health` debe indicar `dataMode: "supabase"`.

Las ofertas se pueden actualizar desde el SQL Editor con permisos de administrador. El rol `anon` solo tiene permiso de lectura condicionado por la política RLS; la app no expone endpoints para escribir en la base.

## Flujo de ramas

- `main`: versión candidata y despliegue.
- `test`: integración y cambios que pasan CI.
- Trabaja en `test`, publica el resultado, valida GitHub Actions y abre un Pull Request `test` → `main`. La revisión individual termina en el merge; Render está configurado para desplegar `main` después de CI.

## Endpoints

- `GET /api/health`: estado, modo de datos y huso horario.
- `GET /api/offers?q=&category=&chain=`: ofertas vigentes, ordenadas por precio normalizado.

En modo demo, precios, nombres de tiendas y enlaces son datos ficticios. Los favoritos, umbrales, lista y reportes de muestra se almacenan solo en `localStorage` del dispositivo.
