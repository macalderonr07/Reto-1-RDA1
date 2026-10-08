// Arma _site/ con SOLO lo que se publica en GitHub Pages: las páginas y sus
// recursos. Quedan afuera los scripts de verificación, node_modules, la config de
// html-validate y el README. Lo usa el workflow de Actions después de que todas
// las verificaciones pasaron.

import { cpSync, rmSync, mkdirSync } from "node:fs";

const PUBLICO = [
  "index.html",
  "catalogo.html",
  "producto.html",
  "carrito.html",
  "registro.html",
  "contacto.html",
  "nosotros.html",
  "styles.css",
  "robots.txt",
  "sitemap.xml",
  "assets",
  "data",
  "js",
];

rmSync("_site", { recursive: true, force: true });
mkdirSync("_site");
for (const ruta of PUBLICO) cpSync(ruta, `_site/${ruta}`, { recursive: true });
console.log(`✔ _site/ listo con: ${PUBLICO.join(", ")}`);
