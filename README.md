# Comercial Elite — catálogo y carrito

**Sitio publicado:** https://macalderonr07.github.io/Reto-1-RDA1/

Sitio web de Comercial Elite, distribuidor de insumos para calzado y marroquinería en
Quito (cueros, sintéticos, suelas, plantillas, hilos, adhesivos, herrajes y
herramienta menor). Es un catálogo con carrito de cotización: el cliente arma un
pedido con precios y cantidades, y lo envía por WhatsApp o correo — no hay pasarela de
pago ni backend, el negocio sigue cerrando la venta directamente con el cliente.

## Estructura de carpetas

```
comercial-elite/
├── index.html          # portada: líneas de producto + novedades
├── catalogo.html        # catálogo filtrable (categoría + texto)
├── producto.html         # ficha de un producto (galería, precio, agregar al carrito)
├── carrito.html           # carrito: CRUD, totales, checkout, historial
├── registro.html           # guarda correo + teléfono para precargar el checkout
├── contacto.html            # formulario de cotización (regex + mailto)
├── nosotros.html              # quiénes somos
├── styles.css                  # paleta, foco visible, portada diagonal
├── data/
│   └── catalogo.json             # "backend" del sitio: productos, precios, categorías
├── js/
│   ├── storage.js                  # AlmacenCE: localStorage/sessionStorage/IndexedDB/cookies
│   ├── validacion.js                # ValidacionCE: regex y feedback de formularios
│   ├── encabezado.js                 # badge del carrito en el header (7 páginas)
│   ├── menu.js                        # menú móvil accesible
│   ├── inicio.js, catalogo.js,         # un script por página (mismo patrón IIFE)
│   │   producto.js, contacto.js,
│   │   carrito.js, registro.js
├── assets/
│   ├── img/                               # fotos e ilustraciones de producto + logo
│   └── catalogo.pdf                        # catálogo descargable
├── robots.txt, sitemap.xml                  # SEO básico
├── scripts/                                  # verificación y publicación (no se publican)
│   ├── verificar-estatico.mjs                 # JS, catálogo, enlaces, orden de scripts
│   ├── verificar-e2e.mjs                       # pruebas en Chromium (axe, celulares, carrito…)
│   └── preparar-sitio.mjs                       # arma _site/ con solo lo publicable
├── .github/workflows/verificar-y-publicar.yml    # CI: verifica y publica en GitHub Pages
├── .htmlvalidate.mjs                              # reglas de html-validate
└── package.json                                    # dependencias de desarrollo (solo para verificar)
```

## Arquitectura técnica

Sitio 100% estático, sin build ni framework: Tailwind se carga por CDN (Play CDN) y
cada página declara su propia paleta en un `<script>` inline (`tailwind.config`). El
JavaScript es un script por página, cada uno un IIFE `(() => { ... })()` con una guard
clause al inicio (`if (!elemento) return;`) para que el mismo archivo pueda incluirse
en páginas donde no aplica sin romper nada.

Dos módulos se comparten entre páginas:

- **`js/storage.js`** expone `window.AlmacenCE`, la única capa que toca
  localStorage/sessionStorage/IndexedDB/cookies. Toda su API devuelve **Promesas**
  (incluidas las operaciones síncronas de localStorage, envueltas para uniformidad) y
  las de IndexedDB están envueltas de verdad (la API nativa es por callbacks). Si el
  almacenamiento persistente falla (cuota llena, navegación privada estricta), cada
  mutación del carrito/registro deja una copia en memoria para que el sitio siga
  funcionando el resto de la sesión, y rechaza la Promesa con un error
  `{ codigo, mensaje }` en español listo para mostrarse en un `role="alert"`.
- **`js/validacion.js`** expone `window.ValidacionCE` con los patrones regex
  (nombre/correo/teléfono/mensaje) y el helper de validación visual que usan
  `contacto.js`, `registro.js` y el checkout de `carrito.js`, para no repetir las
  expresiones regulares en cada formulario.

El catálogo (`data/catalogo.json`) es la única fuente de verdad de nombre/precio de
cada producto: el carrito solo guarda `id` + `cantidad` + timestamps, y siempre resuelve
el resto contra el JSON al mostrarse. Así, si cambia un precio, el carrito lo refleja en
vez de mostrar un dato guardado y caducado.

## Accesibilidad (WCAG 2.2 AA)

- **Paleta verificada por contraste real**, no arbitraria: los verdes de marca se
  calcularon en el mismo matiz del logo (`styles.css`, líneas 1-38) hasta cumplir AA;
  el acento "cuero" para precios/totales (`#8B5E34` claro / `#D9A066` oscuro) se
  verificó igual (5.60:1 / 8.37:1 sobre sus fondos).
- **Foco visible propio** (`:focus-visible` global, nunca `outline: none` sin
  reemplazo), **skip-link** al contenido, objetivos táctiles ≥ 44px (Ley de Fitts).
- **No depender solo del color**: el ítem de nav activo cambia de forma además de
  color; los enlaces llevan subrayado; los errores de formulario llevan texto, no solo
  un borde rojo.
- **Formularios**: errores junto al campo con `aria-describedby`, confirmaciones en
  `role="status"`/`aria-live="polite"`, errores bloqueantes en `role="alert"`.
- **`prefers-reduced-motion`** respetado en toda animación/transición.
- Navegación completa por teclado: el botón "Agregar al carrito" de cada tarjeta del
  catálogo está por encima (`z-10`) del enlace que cubre toda la tarjeta, para que Tab
  + Enter/Espacio lo activen sin disparar la navegación de la tarjeta.

## Persistencia: qué vive dónde y por qué

| Mecanismo | Dato | Por qué |
|---|---|---|
| `localStorage` (`ce_carrito_v1`) | Carrito: id + cantidad + `agregadoEn`/`actualizadoEn` | Debe sobrevivir a cerrar el navegador y a recargar la página |
| `localStorage` (`ce_registro_v1`) | Solo correo + teléfono del registro | Mismo motivo: evitar reescribir los datos en cada visita |
| `sessionStorage` (`ce_filtros_catalogo_v1`) | Texto buscado + categorías marcadas en el catálogo | Es estado de navegación de la visita actual, no algo que deba persistir para siempre |
| `IndexedDB` (`ComercialEliteDB` → `pedidos`) | Historial de pedidos ya enviados (fecha, ítems, total, medio) | Estructura más rica que un par clave/valor; se consulta como lista, no como un único blob |
| Cookie (`ce_ultima_actualizacion`, 30 días) | Solo una fecha ISO, sin datos personales | Marca de "última actualización" visible en el carrito, pensada como ejercicio de uso de cookies sin guardar PII en ellas |

## Cómo ejecutar localmente

El sitio no necesita **servidor dinámico** (no hay Node/PHP/backend alguno). Sin
embargo, el catálogo se carga con `fetch("data/catalogo.json")`, y **Chrome bloquea
`fetch()` contra `file://` por su política de CORS** cuando `index.html` se abre con
doble clic (Firefox sí lo permite). Para desarrollar sin tropezar con esto:

- Abrir la carpeta con Firefox, **o**
- Levantar un servidor estático simple (no dinámico) en la carpeta, por ejemplo:
  ```
  python3 -m http.server 8080
  ```
  y entrar a `http://localhost:8080/`, **o**
  usar la extensión "Live Server" de VS Code.

## Verificación y despliegue en GitHub Pages

El sitio se publica con GitHub Actions (`.github/workflows/verificar-y-publicar.yml`)
en cada push a `main`. El workflow tiene dos jobs y **el segundo solo corre si el
primero pasa completo**; si algo falla, el sitio publicado queda como estaba:

1. **Verificar el sitio**
   - `npm run verificar:estatico` — sintaxis de todo `js/`, estructura de
     `data/catalogo.json` (ids únicos, categorías existentes, precios, ≥ 3 fotos por
     producto con texto alternativo y archivo existente), que cada `src`/`href` local
     de las 7 páginas exista, y que `storage.js` se cargue antes que sus consumidores.
   - `npm run verificar:html` — `html-validate` (reglas recomendadas + WCAG) sobre
     las 7 páginas.
   - `npm run verificar:e2e` — Chromium con Playwright en escritorio, iPhone SE,
     Pixel 5 e iPad Mini: sin errores de JS, sin scroll horizontal, **0 violaciones
     de axe-core (WCAG 2.2 AA)**, y las funciones clave: filtros por URL/texto y su
     restauración desde `sessionStorage`, ficha y galería, carrito persistente en
     `localStorage`, checkout (validación, envío con Enter, historial en IndexedDB,
     cookie) y registro.
2. **Publicar en GitHub Pages** — `npm run preparar-sitio` arma `_site/` solo con
   las páginas y sus recursos (sin `scripts/`, `node_modules` ni el README) y se
   despliega con `actions/deploy-pages`.

En un pull request solo se verifica, no se publica. Para correr lo mismo en local:

```
npm ci
npx playwright install chromium
npm run verificar
```

> Las pruebas en navegador necesitan internet porque Tailwind se carga desde su CDN.
