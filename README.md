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
3. La base de datos real del proyecto `pollos-karen-limpieza` ya tiene aplicadas las migraciones 001, 002 y 003. En otras instalaciones ejecutar las tres migraciones en orden. La función de guardado queda detrás de la Edge Function `submit-cleaning`.
4. Registrar los tres colaboradores reales, sustituyendo los ejemplos:
   ```sql
   insert into public.employees(name)
   values ('Colaborador 1'), ('Colaborador 2'), ('Colaborador 3');
   ```
5. Copiar `.env.example` a `.env` para desarrollo. Incluye la URL y **clave publicable** del nuevo proyecto; no contiene credenciales secretas. El build de producción ya tiene `.env.production` con estos mismos valores públicos.
6. Ejecutar `npm run dev` y abrir la dirección que indica Vite.

**Nunca** introducir una llave `service_role` en `VITE_*`, el navegador o GitHub.

## Antes de publicar
- Las inserciones se realizan mediante la Edge Function pública `submit-cleaning` (sin cuentas individuales) con validación y límites básicos de frecuencia en PostgreSQL. El RPC ya no está disponible directamente para `anon` ni `authenticated`. **Antes de un despliegue público**, fortalecer los controles contra abuso, registrar incidentes y revisar restricciones de origen. Seleccionar un nombre no verifica identidad.
- Las firmas se guardan provisionalmente como texto PNG data URL en una tabla protegida con RLS. Migrar a Supabase Storage privado con subida autorizada desde servidor antes del uso operativo.
- Implementar inicio de sesión del administrador, panel CRUD de colaboradores y actividades, vista autorizada de firmas y reportes PDF.
- Añadir pruebas de integración y revisar aplicación móvil real.
- Una firma dibujada con selección de nombre es una constancia operativa, no verificación técnica de identidad.
- El repositorio no debe incluir datos personales reales ni firmas de empleados.

## Estructura
- `index.html`: punto de entrada.
- `src/main.jsx`: interfaz de colaboradores y captura de firmas.
- `src/style.css`: diseño responsive.
- `supabase/migrations/001_initial.sql`, `002_*`, `003_*`: tablas, RLS y ajustes de seguridad.\n- `supabase/functions/submit-cleaning/index.ts`: registro en servidor sin exponer la llave secreta.
- `.env.example` y `.env.production`: variables públicas de Supabase.

© Pollos Karen.
