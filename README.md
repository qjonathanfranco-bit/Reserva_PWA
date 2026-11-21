# Volleybol — DeporZone Arena Gaming Hub

PWA para reservar canchas de volleyball (Wally), wallyball y futsal. Con carousel, buscador de imágenes, temas oscuro/claro y modo alto contraste.

## Estructura

| Archivo | Función |
|---|---|
| `index.html` | Punto de entrada, semántica accesible, secciones por deporte, "Mis Reservas", panel de Smoke Test |
| `css/styles.css` | Glass panel, tokens de color 60-30-10, BEM (`.card-item__*`), responsive mobile-first |
| `js/script.js` | Reserva de canchas (individual/conjunto), timers, Smoke Test, carousel, Simulationes (Docs 1, 3, 5) |
| `js/carousel-data.js` | Datos de galería (10 imágenes por deporte) |
| `js/buscador.js` | Buscador de imágenes (Wikimedia Commons / Google CSE) |
| `sw.js` | Service Worker: caché offline + actualización en segundo plano |
| `manifest.json` | Metadatos de la PWA (standalone, iconos) |

## Base de datos (Supabase)

La app sigue usando PostgreSQL, pero ahora se conecta a **Supabase** mediante un connection string.

1. En Supabase entra en **Project Settings → Database → Connection string**, pestaña **URI / Session**, y copia la cadena (sustituye `[YOUR-PASSWORD]` por la contraseña del proyecto).
2. Copia la plantilla y pega tu cadena:
   ```
   copy .env.example .env
   ```
   Edita `.env` y deja `DATABASE_URL=postgresql://postgres:...`. El archivo `.env` está en `.gitignore`: **no lo subas a Git**.
3. Crea las tablas y los datos iniciales en Supabase:
   ```
   python seed_db.py
   ```
   Usuario por defecto: `admin` / contraseña `volleybol`.
4. **Si vienes del PostgreSQL local** y quieres conservar usuarios, reservas y precios:
   ```
   python migrate_data.py export   -> volleybol_backup.json (ya generado)
   python seed_db.py               -> crea el schema en Supabase
   python migrate_data.py import   -> vuelca tus datos a Supabase
   ```

Al arrancar el backend verás `[Volleybol] Base de datos: ...` con el destino real (la contraseña se oculta). Si no hay `.env`, se usa el PostgreSQL local anterior como respaldo.

## Cómo probar

1. Asegúrate de haber ejecutado `python seed_db.py` contra Supabase (paso anterior).

2. **Arrancar el backend** (sirve la página **y** la API en el puerto 5000):
   ```
   python backend.py
   ```
   Abrir: **http://127.0.0.1:5000/**  ← usa esta URL para el login y el registro.

   > El login y "Crear usuario" llaman a `/api/login` y `/api/registrar`, que solo
   > existen en `backend.py`. Si abres la página con `python -m http.server 8123`
   > (o haciendo doble clic en `index.html`), el navegador pedía la API al servidor
   > estático y salía *"No se pudo conectar con el servidor"* / *"Error al registrar"*.
   > Ahora las peticiones se redirigen solas al backend (`http://127.0.0.1:5000`),
   > así que también funciona si dejas el servidor estático en el 8123; eso sí,
   > **backend.py debe estar corriendo**.

3. **Abrir consola (F12)**: sin errores de carga ni excepciones.
4. **Smoke Test**: pulsar "🔎 Ejecutar Smoke Test DOM". Debe salir un resumen:
   botones, imágenes sin alt, enlaces vacíos y errores de consola (debe estar 0).
5. **Verificar prices**: en la sección de wally (40–50 Bs), futsal (120 Bs) y vóley (80 Bs).
6. **Offline**: cerrar el servidor y recargar → la app debe cargar desde caché.

**Horarios:** un slot se muestra `(Ocupado)` solo si hay una reserva real para la fecha elegida; si no hay reservas, todos los horarios están libres. No hay campo "Hora": el primer horario libre queda seleccionado y al tocar cualquier slot se elige ese horario.

**Horas y precios:**
- En "⚙️ 1. Horarios y Modo" eliges **1 a 4 horas** por deporte. Eso cambia la hora de salida, bloquea las horas consecutivas y multiplica el precio total (precio/hora × horas), la cuota por jugador y el monto del QR.
- El botón **💲 Precios** de la barra superior abre un panel para editar el precio de cada cancha y guardarlo en PostgreSQL (`PATCH /api/canchas/<id>`). Los cambios aparecen al instante en toda la app.

## Accesibilidad y calidad

- `:focus-visible` visible en todo.
- Alto contraste con `#0d9488` (tokens `--color-acento`).
- Galería lazy loading y `aspect-ratio` para evitar CLS.
- Validación de reservas solo 2026-2027 (Doc 5a).
