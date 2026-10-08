// Pruebas de extremo a extremo en un navegador real (Chromium con Playwright).
// Las corre GitHub Actions antes de publicar; a mano: npm run verificar:e2e
//
// Levanta su propio servidor estático y comprueba, en escritorio y en celulares
// emulados, las 7 páginas:
//   - Sin errores de JavaScript ni en consola.
//   - Sin scroll horizontal (la página cabe en la pantalla).
//   - Accesibilidad WCAG 2.2 AA con axe-core: 0 violaciones.
// Y las funciones clave: filtros del catálogo (URL, texto, sessionStorage), ficha
// de producto, carrito en localStorage, checkout (validación, Enter, historial en
// IndexedDB, cookie) y registro.
//
// Los valores esperados se calculan desde data/catalogo.json (no están fijos en
// el código), así la prueba sigue sirviendo si se agregan productos.
// Nota: Tailwind se carga desde su CDN, así que las pruebas necesitan internet.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";
import { chromium, devices } from "playwright";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const CATALOGO = JSON.parse(readFileSync("data/catalogo.json", "utf8"));
const RAIZ = process.cwd();

// ------------------------------------------------------------ servidor estático
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};
const servidor = createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const archivo = normalize(join(RAIZ, ruta.endsWith("/") ? `${ruta}index.html` : ruta));
  if (!archivo.startsWith(RAIZ)) return res.writeHead(403).end();
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] ?? "application/octet-stream" }).end(cuerpo);
  } catch {
    res.writeHead(404).end("No encontrado");
  }
});
await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
const BASE = `http://localhost:${servidor.address().port}/`;

// ------------------------------------------------------------ mini framework
const fallos = [];
let pruebas = 0;
async function prueba(nombre, fn) {
  pruebas += 1;
  try {
    await fn();
    console.log(`  ✔ ${nombre}`);
  } catch (error) {
    fallos.push(`${nombre}: ${error.message}`);
    console.log(`  ✘ ${nombre}\n      ${error.message}`);
  }
}
function esperar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function vigilar(pagina) {
  const errores = [];
  pagina.on("pageerror", (e) => errores.push(`JS: ${e.message}`));
  pagina.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text()}`));
  return errores;
}

// Cada página indica qué esperar para considerarse "cargada" (su JS ya pintó).
const LISTA = {
  "index.html": "main",
  "catalogo.html": "#rejillaProductos:not([aria-busy]) li",
  [`producto.html?id=${CATALOGO.productos[0].id}`]: "#fichaProducto:not([hidden])",
  "carrito.html": "#totalCarrito",
  "registro.html": "#formularioRegistro",
  "contacto.html": "#formularioContacto",
  "nosotros.html": "main",
};

async function revisarPagina(pagina, ruta, errores) {
  // Se juntan TODOS los problemas de la página antes de fallar, para que el
  // reporte de Actions los muestre de una vez.
  const problemas = [];
  await pagina.goto(BASE + ruta);
  await pagina.waitForLoadState("networkidle");
  await pagina.waitForSelector(LISTA[ruta], { state: "attached" });
  await pagina.waitForTimeout(300); // Tailwind CDN genera estilos de lo recién pintado
  const { ancho, pantalla } = await pagina.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    pantalla: document.documentElement.clientWidth,
  }));
  if (ancho > pantalla) problemas.push(`hay scroll horizontal (${ancho}px de contenido en ${pantalla}px de pantalla)`);
  await pagina.addScriptTag({ content: AXE });
  const { violations } = await pagina.evaluate(() =>
    window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })
  );
  if (violations.length) {
    problemas.push(
      `axe encontró ${violations.length} violación(es): ` +
        violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`).join("; ")
    );
  }
  problemas.push(...errores);
  esperar(problemas.length === 0, problemas.join("\n      "));
}

// ------------------------------------------------------------ pruebas
const navegador = await chromium.launch();
const DISPOSITIVOS = {
  "escritorio 1366px": { viewport: { width: 1366, height: 900 } },
  "iPhone SE": devices["iPhone SE"],
  "Pixel 5": devices["Pixel 5"],
  "iPad Mini": devices["iPad Mini"],
};

try {
  console.log("\n▶ Páginas: errores, scroll horizontal y accesibilidad (axe, WCAG 2.2 AA)");
  for (const [nombre, opciones] of Object.entries(DISPOSITIVOS)) {
    const contexto = await navegador.newContext(opciones);
    for (const ruta of Object.keys(LISTA)) {
      await prueba(`${nombre} · ${ruta}`, async () => {
        const pagina = await contexto.newPage();
        const errores = vigilar(pagina);
        await revisarPagina(pagina, ruta, errores);
        await pagina.close();
      });
    }
    await contexto.close();
  }

  console.log("\n▶ Funciones");
  const contexto = await navegador.newContext({ viewport: { width: 1366, height: 900 } });
  const pagina = await contexto.newPage();
  const errores = vigilar(pagina);
  // El checkout abre WhatsApp en otra pestaña: se intercepta para no salir a internet.
  await contexto.addInitScript(() => {
    window.open = (url) => {
      window.__abierto = url;
      return null;
    };
  });
  const tarjetasVisibles = () => pagina.locator("#rejillaProductos > li:not([hidden])").count();

  await prueba("Catálogo: muestra todos los productos del JSON", async () => {
    await pagina.goto(BASE + "catalogo.html");
    await pagina.waitForSelector("#rejillaProductos:not([aria-busy]) li", { state: "attached" });
    const total = await tarjetasVisibles();
    esperar(total === CATALOGO.productos.length, `hay ${total} tarjetas, se esperaban ${CATALOGO.productos.length}`);
  });

  const categoria = CATALOGO.categorias[0];
  await prueba(`Catálogo: ?cat=${categoria.slug} filtra por categoría`, async () => {
    const esperados = CATALOGO.productos.filter((p) => p.categoria === categoria.slug).length;
    await pagina.goto(BASE + `catalogo.html?cat=${categoria.slug}`);
    await pagina.waitForSelector("#rejillaProductos:not([aria-busy]) li", { state: "attached" });
    const visibles = await tarjetasVisibles();
    esperar(visibles === esperados, `se ven ${visibles}, se esperaban ${esperados}`);
    esperar(await pagina.isChecked(`#filtro-${categoria.slug}`), "la casilla de la categoría no quedó marcada");
  });

  const buscado = CATALOGO.productos[1];
  await prueba("Catálogo: búsqueda por texto sin tildes y persistencia en sessionStorage", async () => {
    await pagina.goto(BASE + "catalogo.html");
    await pagina.waitForSelector("#rejillaProductos:not([aria-busy]) li", { state: "attached" });
    await pagina.click("#botonLimpiar");
    await pagina.fill("#buscador", buscado.id.toLowerCase());
    esperar((await tarjetasVisibles()) === 1, `buscar "${buscado.id}" no dejó exactamente 1 resultado`);
    await pagina.reload();
    await pagina.waitForSelector("#rejillaProductos:not([aria-busy]) li", { state: "attached" });
    esperar((await pagina.inputValue("#buscador")) === buscado.id.toLowerCase(), "el filtro no se restauró al recargar");
    esperar((await tarjetasVisibles()) === 1, "tras recargar no se aplicó el filtro guardado");
    await pagina.click("#botonLimpiar");
  });

  const producto = CATALOGO.productos[0];
  await prueba(`Ficha: galería de ${producto.imagenes.length} fotos y datos de ${producto.id}`, async () => {
    await pagina.goto(BASE + `producto.html?id=${producto.id}`);
    await pagina.waitForSelector("#fichaProducto:not([hidden])");
    esperar((await pagina.textContent("#nombreProducto")) === producto.nombre, "el nombre no coincide");
    esperar((await pagina.textContent("#precioProducto")) === `$${producto.precio.toFixed(2)}`, "el precio no coincide");
    const imgs = await pagina.locator("#figuraPrincipal ~ * button, #fichaProducto button[aria-pressed]").count();
    esperar(imgs === producto.imagenes.length, `hay ${imgs} miniaturas, se esperaban ${producto.imagenes.length}`);
  });

  await prueba("Carrito: agregar 2 unidades desde la ficha y que persista al recargar", async () => {
    await pagina.fill("#cantidadProducto", "2");
    await pagina.click("#botonAgregarCarrito");
    await pagina.waitForFunction(() => document.getElementById("contadorCarrito").textContent === "2");
    await pagina.reload();
    await pagina.waitForFunction(() => document.getElementById("contadorCarrito").textContent === "2", null, { timeout: 5000 });
  });

  await prueba("Carrito: muestra la línea y el total calculado desde el catálogo", async () => {
    await pagina.goto(BASE + "carrito.html");
    await pagina.waitForSelector("#listaCarrito li");
    const total = await pagina.textContent("#totalCarrito");
    esperar(total.includes((producto.precio * 2).toFixed(2)), `el total dice "${total}"`);
  });

  await prueba("Checkout: Enter con campos vacíos muestra errores (no envía)", async () => {
    await pagina.focus("#nombreCheckout");
    await pagina.keyboard.press("Enter");
    await pagina.waitForSelector("#estadoCheckout:not([hidden])");
    const error = await pagina.textContent("#errorNombreCheckout");
    esperar(error.trim().length > 0, "no se mostró el error junto al campo nombre");
    esperar(!(await pagina.evaluate(() => window.__abierto)), "se envió el pedido con campos inválidos");
  });

  await prueba("Checkout: pedido válido abre WhatsApp, guarda historial (IndexedDB) y vacía el carrito", async () => {
    await pagina.fill("#nombreCheckout", "Taller de prueba");
    await pagina.fill("#correoCheckout", "prueba@ejemplo.com");
    await pagina.fill("#telefonoCheckout", "0991234567");
    await pagina.keyboard.press("Enter");
    await pagina.waitForSelector("#listaHistorial li");
    const abierto = await pagina.evaluate(() => window.__abierto);
    esperar(abierto?.startsWith("https://wa.me/"), `se abrió "${abierto}"`);
    await pagina.waitForFunction(() => document.getElementById("contadorCarrito").textContent === "0");
    const cookie = (await contexto.cookies()).find((c) => c.name === "ce_ultima_actualizacion");
    esperar(cookie, "no se creó la cookie ce_ultima_actualizacion");
  });

  await prueba("Registro: guarda correo y teléfono en localStorage", async () => {
    await pagina.goto(BASE + "registro.html");
    await pagina.waitForSelector("#datosGuardados");
    const guardado = await pagina.evaluate(() => JSON.parse(localStorage.getItem("ce_registro_v1") ?? "null"));
    esperar(guardado?.correo === "prueba@ejemplo.com", `localStorage tiene ${JSON.stringify(guardado)}`);
    await pagina.waitForFunction(() => document.getElementById("datosGuardados").textContent.includes("prueba@ejemplo.com"));
  });

  await prueba("Ficha inexistente muestra el error (sin inyectar el id como HTML)", async () => {
    await pagina.goto(BASE + "producto.html?id=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
    await pagina.waitForSelector("#errorProducto:not([hidden])");
    esperar((await pagina.locator("img[src=x]").count()) === 0, "el id de la URL se insertó como HTML");
  });

  await prueba("Sin errores de JavaScript durante las pruebas de funciones", async () => {
    esperar(errores.length === 0, errores.join(" | "));
  });

  await contexto.close();
} finally {
  await navegador.close();
  servidor.close();
}

console.log("");
if (fallos.length) {
  console.error(`✘ ${fallos.length} de ${pruebas} pruebas fallaron.`);
  process.exit(1);
}
console.log(`✔ ${pruebas} pruebas en navegador sin problemas.`);
