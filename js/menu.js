// Menú móvil accesible: botón con aria-expanded/aria-controls (WCAG 4.1.2).
// La lista se muestra/oculta alternando las utilidades "hidden"/"flex" de
// Tailwind en vez de una clase propia como en la versión CSS vanilla.
(() => {
  const boton = document.getElementById("botonMenu");
  const lista = document.getElementById("listaNav");

  if (!boton || !lista) return;

  const cerrarMenu = () => {
    lista.classList.add("hidden");
    lista.classList.remove("flex");
    boton.setAttribute("aria-expanded", "false");
  };

  const abrirMenu = () => {
    lista.classList.remove("hidden");
    lista.classList.add("flex");
    boton.setAttribute("aria-expanded", "true");
  };

  boton.addEventListener("click", () => {
    const estaAbierto = boton.getAttribute("aria-expanded") === "true";
    estaAbierto ? cerrarMenu() : abrirMenu();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && boton.getAttribute("aria-expanded") === "true") {
      cerrarMenu();
      boton.focus();
    }
  });

  document.addEventListener("click", (evento) => {
    const clicFuera = !lista.contains(evento.target) && !boton.contains(evento.target);
    if (clicFuera && boton.getAttribute("aria-expanded") === "true") {
      cerrarMenu();
    }
  });

  const consultaEscritorio = window.matchMedia("(min-width: 48em)");
  const alCambiarAncho = (consulta) => {
    if (consulta.matches) cerrarMenu();
  };
  consultaEscritorio.addEventListener
    ? consultaEscritorio.addEventListener("change", alCambiarAncho)
    : consultaEscritorio.addListener(alCambiarAncho);
})();
