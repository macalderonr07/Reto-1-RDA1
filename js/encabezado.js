// Badge del carrito en el header: se repite en las 7 páginas. Se mantiene al día
// consultando AlmacenCE al cargar y escuchando "ce:carrito-actualizado" (disparado por
// storage.js en cada mutación), así no depende de qué página hizo el cambio.
(() => {
  const enlace = document.getElementById("enlaceCarrito");
  const contador = document.getElementById("contadorCarrito");
  if (!enlace || !contador || !window.AlmacenCE) return;

  function pintar(cantidad, conPulso = false) {
    contador.textContent = String(cantidad);
    enlace.setAttribute("aria-label", cantidad === 1 ? "Carrito, 1 producto" : `Carrito, ${cantidad} productos`);
    if (conPulso) {
      contador.classList.remove("carrito-pulso");
      // Reinicia la animación aunque dos cambios lleguen muy seguido.
      void contador.offsetWidth;
      contador.classList.add("carrito-pulso");
    }
  }

  AlmacenCE.carrito.contarUnidades().then((cantidad) => pintar(cantidad)).catch(() => pintar(0));

  document.addEventListener("ce:carrito-actualizado", (evento) => {
    const total = evento.detail.items.reduce((suma, item) => suma + item.cantidad, 0);
    pintar(total, true);
  });
})();
