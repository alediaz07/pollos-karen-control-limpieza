# Pollos Karen · Control de Limpieza

Aplicación web independiente para registrar limpieza libre de **baños, cocina y mesas (limpieza general)**, con selección de colaborador en un dispositivo compartido y firma manuscrita digital.

## Estado
**Primera versión de desarrollo (no lista para producción).** El formulario y la captura táctil están implementados. Supabase, gestión administrativa, PDFs y despliegue requieren configuración adicional.

## Características del prototipo
- Registro de baños, cocina y limpieza general de mesas, sin horarios fijos.
- Checklist obligatorio por área.
- Selección de colaborador activo; no necesita contraseña individual.
- Firma táctil dibujada con el dedo o lápiz y opción de borrar.
- Guardado atómico en PostgreSQL mediante RPC, con fecha/hora del servidor.
- Políticas RLS para restringir lectura del historial y firmas a administradores.
- Pantalla preliminar de historial; falta implementar inicio de sesión administrativo.

## Instalación
1. Clonar el repositorio y ejecutar `npm install`.
2. Crear un proyecto **nuevo e independiente** en Supabase.
3. Ejecutar `supabase/migrations/001_initial.sql` desde el SQL Editor de Supabase.
4. Registrar los tres colaboradores reales, sustituyendo los ejemplos:
   ```sql
   insert into public.employees(name)
   values ('Colaborador 1'), ('Colaborador 2'), ('Colaborador 3');
   ```
5. Copiar `.env.example` a `.env` y completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores públicos del nuevo proyecto.
6. Ejecutar `npm run dev` y abrir la dirección que indica Vite.

**Nunca** introducir una llave `service_role` en `VITE_*`, el navegador o GitHub.

## Antes de publicar
- El RPC de registro se invoca anónimamente para permitir acceso compartido. Protegerlo tras un gateway/Edge Function, límite de solicitudes y medidas contra abuso. Tal como está, **no debe exponerse en internet** sin esas protecciones.
- Las firmas de esta versión se guardan como texto PNG data URL en tabla con RLS. Migrar a Supabase Storage privado con subida autorizada desde servidor.
- Implementar inicio de sesión del administrador, panel CRUD de colaboradores y actividades, vista autorizada de firmas y reportes PDF.
- Añadir pruebas de integración y revisar aplicación móvil real.
- Una firma dibujada con selección de nombre es una constancia operativa, no verificación técnica de identidad.
- El repositorio no debe incluir datos personales reales ni firmas de empleados.

## Estructura
- `index.html`: punto de entrada.
- `src/main.jsx`: interfaz de colaboradores y captura de firmas.
- `src/style.css`: diseño responsive.
- `supabase/migrations/001_initial.sql`: tablas, RLS y RPC.
- `.env.example`: variables públicas de Supabase.

© Pollos Karen.
