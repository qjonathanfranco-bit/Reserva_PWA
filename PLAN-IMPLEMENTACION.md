# Plan de implementación — DeporZone / Volleybol

Listado de todo lo que piden los 8 documentos de `C:\Users\jonfr\OneDrive\Desktop\AVANCES`
y cómo se aplica al proyecto `volleybol`.

Leyenda: ✅ ya está · ⏳ parcial · ❌ falta

---

## 0. Bugs actuales que bloquean el MVP (no están en los PDFs)

| # | Problema | Dónde | Arreglo |
|---|---|---|---|
| 0.1 | El precio siempre es **0** → cuotas siempre `0.00` | leía `#input-precio-*`, inputs que no existían | Constantes: wally 40/45/50 (chips), futsal 120, vóley 80; `precioDeSport()` |
| 0.2 | **XSS**: el nombre del jugador se inyectaba como HTML | `renderizarLista` (template string) | Construcción con `textContent` + `DOMPurify.sanitize()` (helpers en `script.js`) |
| 0.3 | El display del timer mostraba 1 s de más | `tiempo--` post-decremento | Control de flujo: muestra → decrementa → si `<=0` termina |
| 0.4 | `proyecto-personal/avance semana 3/` no tiene `index.html` | carpeta hermana | Entregable para otro doc; pendiente de validación |

---

## 1. Doc: HTML Responsivo (Flexbox) y Configuración PWA  ✅ IMPLEMENTADO

Estado: ✅ viewport, `manifest.json`, `theme-color`, un solo `index.html`, registro de SW, botón de instalación, dock responsive.

- [x] **1.1** Botón de instalación PWA: `#btnInstalarPWA` + `beforeinstallprompt` / `appinstalled` (dentro de `script.js`).
- [x] **1.2** Reacomodo vertical/horizontal: `<nav class="dock-acciones">` → fijo abajo en celular vertical, lateral izquierdo en landscape y en la barra superior en escritorio.
- [x] **1.3** Quitado `height:100vh` + `overflow:hidden` del `body`: ahora `min-height:100dvh` + scroll natural (solo el escritorio alto conserva el layout compacto).
- [x] **1.4** Registro del SW movido a `script.js` con log de `reg.scope` (ya no está inline en el HTML y no se creó un archivo aparte).
- [x] **1.5** Probado offline real: con el servidor apagado la página carga completa desde caché (4 secciones, 3 canchas, 30 slides). El botón de instalar aparece cuando el navegador dispara `beforeinstallprompt`.

Archivos tocados: `index.html`, `css/styles.css`, `js/script.js`, `sw.js` (caché v11). Sin archivos nuevos.

## 2. Doc: Mobile-First, Grid y Flexbox  ✅ IMPLEMENTADO

Estado: ✅ base mobile-first, flex-wrap, simulador de vista y breakpoints documentados.

- [x] **2.1** Base mobile-first: `.grid-layout { grid-template-columns: 1fr }` y `@media (min-width:1024px) and (min-height:600px)` → `1fr 1.15fr 1fr`.
- [x] **2.2** `.canchas-row`, `.slots-grid`, `.payment-mini-options`, `.top-row` y `.timer-corner-box` con `flex-wrap`.
- [x] **2.3** Botón **`#btnSimularVista`** (📱 Vista) en el header, con `aria-pressed` y `aria-label`.
- [x] **2.4** Verificado: **0 scroll horizontal** en 390×844, 844×390 y 1280×720.
- [x] **2.5** Breakpoints documentados en el encabezado del bloque responsive de `css/styles.css`: 480 / 1024 + landscape ≤1023.

## 3. Doc: Componentes Reutilizables y Encapsulamiento  ✅ IMPLEMENTADO

Estado: ✅ carpetas `css/` + `js/`, tarjeta `.card-item` generada desde datos y simulación por delegación.

- [x] **3.1** Estructura modular: `css/styles.css` y `js/{script,buscador,carousel-data}.js` (archivos **movidos**, no creados). Rutas actualizadas en `index.html` y `sw.js`.
- [x] **3.2** Las 3 tarjetas de cancha de Wally se generan desde el array `CANCHAS_WALLY` + `pintarCanchas()` → los datos quedan separados de la presentación y se eliminó el HTML repetido.
- [x] **3.3** Tarjeta `.card-item` con `data-id` y clases BEM: `__media`, `__titulo`, `__detalle`, `__estado`, `__accion` y modificador `--activo`.
- [x] **3.4** Simulación con **un solo listener delegado** en `document` para `.btn-simular`: alterna `--activo` y el texto de `__estado` **solo en la tarjeta clicada**.
- [x] **3.5** Namespace delimitado `card-item` (BEM) para el componente. No se renombraron los IDs existentes para no romper selectores.

## 4. Doc: Accesibilidad Web (a11y), semántica y contraste WCAG  ✅ IMPLEMENTADO

Estado: ✅ `<nav>`, `<h1>` + jerarquía h1→h3, labels asociadas, `:focus-visible`, `aria-pressed`/`aria-live`, alto contraste. ⏳ corrección fina de contraste.

- [x] **4.1** `<nav aria-label="Deportes">` (ya existía desde el Doc 1).
- [x] **4.2** `<h1 class="logo">DeporZone…` (rol semántico del logo) y jerarquía h1 → h2 (títulos de sección) → h3 (`.col-title`).
- [x] **4.3** `<label for="...">` asociados: fecha, hora, nombre del capitán; `aria-label` en nombre del jugador.
- [x] **4.4** `:focus-visible { outline: 3px solid #0d9488 }` global.
- [x] **4.5** `aria-pressed` en modo/pago/slots/filtros; `aria-live="polite"` en cuota, total, estado, contador.
- [x] **4.6** Botón **`#btnSimularContraste`** + `body.alto-contraste` (negro/amarillo, `--text-muted #facc15`).
- [⏳] **4.7** Textos subidos de 9–10.5 px a 10–11.5 px. WCAG no exige 12 px, pero la legibilidad mejora.
- [⏳] **4.8** Verificación de contraste AA de los textos sobre fondos.

## 5a. Extensión de Doc 5 — Horarios y Modo (Mis Reservas, fechas, horarios disponibles)  ✅ IMPLEMENTADO

Pidió "modificar la parte de horarios y modo" → agregado como extensión del Doc 5, marcada abajo en bitácora.

- [x] **5a.1** Sección "Mis Reservas" (por deporte, debajo del grid): tabla con Cancha, Fecha, Hora entrada, Hora salida, Estado y botón de borrar.
- [x] **5a.2** Hora de entrada y salida: al reservar, se registra `fecha` + `horaEntrada` (del slot) y `horaSalida = entrada + 1h` (`DURACION_RESERVA`).
- [x] **5a.3** Validación de fecha: `#fecha-{sport}` tiene `min="2026-01-01" max="2027-12-31"`; si se reserva fuera de esos años → alerta "❌ La fecha no es válida. Solo se atienden 2026 y 2027." y se cancela.
- [x] **5a.4** Lista de horarios disponibles: `#lista-horarios-{sport}` muestra las horas sin reservas activas; se actualiza al cambiar fecha, crear y borrar reservas.
- [x] **5a.5** Slots estáticos marcados ocupados (17:00 wally, 20:00 futsal) siguen igual; los cubiertos por reservas se deshabilitan.
- [x] **5a.6** Modelo de datos: `estadoSistema[sport].reservas = [{ cancha, fecha, horaEntrada, horaSalida, estado }]` — listo para la Base de Datos que viene.

## 5. Doc de Cierre: Accesibilidad HTML5 y HMR

- [ ] **5.1** Un solo `<header>`, `<nav aria-label>`, `<main>` y orden de encabezados (comparte con 4.1/4.2).
- [ ] **5.2** `<article>` para cada tarjeta/sección de deporte y `<footer>`.
- [ ] **5.3** Botón **`#btnAuditarA11Y`** + `#reporteA11Y role="status" aria-live="polite"` que cuente `header, nav, main, article, footer` e imágenes sin `alt`.
- [ ] **5.4** HMR: no aplica a GitHub Pages estático. Elegir: (a) documentarlo, (b) añadir Vite como servidor de desarrollo (`npm run dev`), (c) demo "actualización en vivo sin recarga" con el botón de auditoría.

## 6. Doc: Desarrollo Ágil (MVP) y Smoke Testing  ✅ IMPLEMENTADO

- [x] **6.1** Botón **`#btnSmokeTest`** + `#salidaAudit aria-live` con conteos en vivo: botones, imágenes sin alt, enlaces vacíos, errores de consola, componentes `.card-item`.
- [x] **6.2** Consola limpia y 0 errores 404 → verificado: **todos los assets existen** (4 JPG, 30 SVG, 3 iconos).
- [x] **6.3** Smoke test verificado en flujos: reserva individual (wally 45.00 Bs), cancha B (45.00), smoke de Futsal/Vóley, smoke con jugador anotado.
- [x] **6.4** `README.md` con checklist de pruebas y pasos de despliegue.
- [ ] **6.5** Repo git en la carpeta + commits descriptivos (hoy la carpeta **no** es repo; el repo detectado es `C:\Users\jonfr`).

## 7. Doc: Core Web Vitals, Service Worker, BEM y DOMPurify  ✅ IMPLEMENTADO (parcial)

- [x] **7.1** BEM en el CSS nuevo (`.card-item`, `__estado`, `--activo`, `__accion`…) y eliminado el único `!important`.
- [x] **7.2** DOMPurify por CDN + `htmlSeguro()` + `.text()` en la lista de jugadores (XSS verificado neutralizado).
- [x] **7.3** CLS: `.qr-box-mini { min-height: 56px }`; carrusel con `aspect-ratio`.
- [⏳] **7.4** LCP: jQuery sin `defer` (rompía el orden); `font-display: swap`.
- [x] **7.5** SW: `CACHE = v11`, offline verificado en Doc 1.
- [ ] **7.6** Revisar qué se precachea.

## 8. Material Extra: Psicología del Color y Tendencias  ✅ IMPLEMENTADO (tokens 60-30-10)

- [x] **8.1** Tokens `:root`: `--color-fondo`, `--color-superficie`, `--color-acento`, `--color-texto`, `--color-texto-muted` + regla **60-30-10** en comentarios.
- [⏳] **8.2** Reemplazo progresivo de colores hardcodeados (futuro).
- [⏳] **8.3** Evitar negro puro (opcional).
- [⏳] **8.4** Refactor de otros acentos (opcional).
- [⏳] **8.5** Opcional: Bento Grid.

---

## Botones de demostración obligatorios (para la clase)

| Botón | Doc | Dónde |
|---|---|---|
| `#btnInstalarPWA` | 1 | header |
| `#btnSimularVista` | 2 | header o barra de herramientas |
| `.btn-simular` (por tarjeta) | 3 | cada `.card-item` |
| `#btnSimularContraste` | 4 | header |
| `#btnSmokeTest` | 6 | header (barra "Smoke Test") |

## Orden de trabajo propuesto

1. **Fase 0** — Backup de la carpeta + `git init`.
2. **Fase 1** — Estructura modular y componente de deporte (Doc 3) + botón instalar PWA (Doc 1).
3. **Fase 2** — Responsive mobile-first real (Doc 2).
4. **Fase 3** — Semántica, a11y y alto contraste (Docs 4 y 5).
5. **Fase 4** — DOMPurify, BEM, CLS/LCP y SW (Doc 7).
6. **Fase 5** — Smoke test, auditoría y README (Doc 6).
7. **Fase 6** — Tokens de color 60-30-10 (Doc 8).
8. **Fase 7** — Bugs 0.1 a 0.4 y prueba final offline + instalación.

---

## Bitácora de cambios

### Bugs 0.1-0.3 (arreglados)
- `js/script.js`: precios por deporte (`PRECIOS` + `precioDeSport()`); XSS en `renderizarLista` (construcción con `textContent` + `DOMPurify.sanitize()`); timer muestra → decrementa → cleanup sin +1 s.

### Doc 1 — HTML Responsivo + PWA (completado)
- `index.html`: nav convertido en `<nav class="dock-acciones" aria-label="Deportes">`; nuevo contenedor `.navbar-actions` con `#btnInstalarPWA` y `#theme-toggle` (icono + texto separados); se quitó el registro inline del SW y se agregó `<script src="pwa.js">`.
- Registro del SW movido a `script.js` con log de `scope`.
- `css/styles.css`: base mobile-first, dock fijo inferior, dock lateral en landscape, layout compacto restaurado en `@media (min-width:1024px) and (min-height:600px)`, `aspect-ratio:16/9` en el carrusel móvil y blur del header movido a `::before` (el `backdrop-filter` rompía el `position:fixed` del dock).
- `sw.js`: caché `v6` → `v11`.
- Verificado en 390×844, 844×390 y 1280×720 (sin overflow horizontal, sin errores de consola) y con el servidor apagado (carga desde caché).
- Archivo temporal de pruebas `_test-viewports.html` eliminado.

### Extensión de Doc 5 — Horarios y Modo (completado)
- `index.html`: secciones "Mis Reservas" (tabla con Cancha, Fecha, Hora entrada, Hora salida, Estado, 🗑) por deporte; inputs `#fecha-*` con `min="2026-01-01" max="2027-12-31"`; `.tabla-scroll`.
- `js/script.js`: array `HORARIOS_BASE`, `DURACION_RESERVA = 1`, `estadoSistema[sport].reservas = []`, `renderizarMisReservas()`, `actualizarHorariosDisponibles()`, `calcularHorariosDisponibles()`, `horaOcupada()`, `sumarHoras()`, `fechaValida()`; alerta de fecha inválida en `btn-finalizar-*`; timer marca reservas como `Terminada`; `.btn-res-borrar` / `.btn-res-limpiar`.
- **Verificado**: reserva 2026-11-22 14:00 → fila "A | 2026-11-22 | 14:00 | 15:00 | Activa"; lista "Horarios disponibles: 15:00, 16:00, 18:00, 19:00"; slot 14:00 deshabilitado; 2028 → alerta; borrar → horarios vuelven a estar disponibles.

### Doc 2 — Mobile-First, Grid y Flexbox (completado)
- `index.html`: botón `#btnSimularVista` (📱 Vista).
- `script.js`: handler → alterna `.sim-movil` en `.dashboard-wrapper`.
- `css/styles.css`: `.dashboard-wrapper.sim-movil` (1 columna, ancho máx. 380 px) sin `!important`; breakpoints documentados.
- Proyecto queda con **7 archivos**: `index.html`, `manifest.json`, `sw.js`, `css/styles.css`, `js/script.js`, `js/buscador.js`, `js/carousel-data.js`.

### Doc 3 — Componentes y Encapsulamiento (completado)
- **Reorganización**: `styles.css` → `css/styles.css`; `script.js`, `buscador.js`, `carousel-data.js` → `js/`.
- `index.html`: las 3 tarjetas de cancha de Wally se quitaron del HTML; el contenedor se llena desde JS.
- `js/script.js`: `CANCHAS_WALLY` (datos) + `pintarCanchas()` + listener delegado `.btn-simular`.
- Verificado: 3 tarjetas, simulación afecta solo a una, selección real de cancha sigue funcionando, 0 errores de consola y 0 404.

### Doc 4 — Accesibilidad (completado)
- `index.html`: `<h1 class="logo">`, jerarquía h1→h2→h3, `role="group"` + `aria-label` en modos/filtros, `aria-pressed` en botones, `aria-live` en cuota/total/estado, labels `for`, `aria-label` en inputs, `#btnSimularContraste`.
- `css/styles.css`: `.sr-only`, `:focus-visible`, `body.alto-contraste` (negro/amarillo), tamaños de texto subidos (9–10.5 px → 10–11.5 px).
- Verificado en navegador: 1 h1, 0 h4, labels asociados (9), `aria-pressed`/`aria-live` funcionan.

### Doc 6 — Smoke Testing (completado)
- `index.html`: barra `#smoke-test-bar` con `#btnSmokeTest` y `#salidaAudit` (`aria-live="polite"`); nuevo script `dompurify` en head.
- `js/script.js`: contador `__erroresConsola` + `htmlSeguro()`; `smokeTestDom()` reporta botones, imágenes sin alt, enlaces vacíos, errores de consola y `.card-item`.
- `README.md` creado.
- Verificado: "Smoke Test OK · Botones: 93 | Imágenes sin alt: 0 | Enlaces vacíos: 0 | Errores consola: 0 | Componentes .card-item: 3".

### Doc 7 — CWV, SW, BEM y DOMPurify (parcial)
- DOMPurify por CDN + `htmlSeguro()` en `renderizarLista`; XSS neutralizado (verificado).
- CLS: `.qr-box-mini { min-height: 56px }`; carrusel con `aspect-ratio`.
- BEM: clases nuevas usan `card-item`.
- SW: `deporzone-v11`, offline verificado.

### Doc 8 — Psicología del Color (tokens 60-30-10)
- Tokens `--color-fondo/superficie/acento/texto/texto-muted` en `:root`.
