// Página del carrito: CRUD completo sobre AlmacenCE.carrito, subtotales/total
// recalculados en cada render, checkout por WhatsApp/correo (sin pago real, sigue
// siendo B2B de cotización) y, al enviar, un registro en el historial de IndexedDB.
// El precio/nombre de cada línea siempre se resuelve contra data/catalogo.json (nunca
// se guarda duplicado en el carrito), así que si un producto cambia de precio o se
// retira del catálogo, el carrito lo refleja en vez de mostrar un dato caducado.
(() => {
  const listaCarrito = document.getElementById("listaCarrito");
  if (!listaCarrito) return;

  const WHATSAPP_NUMERO = "593999999999";
  const CORREO_VENTAS = "ventas@comercialelite.com";

  const carritoVacio = document.getElementById("carritoVacio");
  const totalCarritoEl = document.getElementById("totalCarrito");
  const contadorItemsEl = document.getElementById("contadorItemsCarrito");
  const avisoAlmacenamiento = document.getElementById("avisoAlmacenamiento");
  const botonVaciar = document.getElementById("botonVaciarCarrito");
  const seccionHistorial = document.getElementById("seccionHistorial");
  const avisoHistorial = document.getElementById("avisoHistorial");
  const listaHistorial = document.getElementById("listaHistorial");
  const ultimaActualizacionEl = document.getElementById("ultimaActualizacion");
  const estadoCheckout = document.getElementById("estadoCheckout");
  const campoNombreCheckout = document.getElementById("nombreCheckout");
  const campoCorreoCheckout = document.getElementById("correoCheckout");
  const campoTelefonoCheckout = document.getElementById("telefonoCheckout");

  const { patrones, mensajesError, validarCampo: validarCampoCE } = window.ValidacionCE;

  let catalogoPorId = new Map();

  function formatearMoneda(valor) {
    return `$${valor.toFixed(2)}`;
  }

  function mostrarAvisoAlmacenamiento(mensaje) {
    avisoAlmacenamiento.hidden = false;
    avisoAlmacenamiento.textContent = mensaje;
  }

  function ocultarAvisoAlmacenamiento() {
    avisoAlmacenamiento.hidden = true;
  }

  function pintarUltimaActualizacion(fechaISO) {
    if (!fechaISO) {
      ultimaActualizacionEl.textContent = "";
      return;
    }
    const fecha = new Date(fechaISO);
    ultimaActualizacionEl.textContent = `Última actualización: ${fecha.toLocaleString("es-EC", {
      dateStyle: "medium",
      timeStyle: "short",
    })}`;
  }

  function actualizarCantidad(id, cantidad) {
    AlmacenCE.carrito
      .actualizarCantidad(id, cantidad)
      .then(ocultarAvisoAlmacenamiento)
      .catch((error) => mostrarAvisoAlmacenamiento(error.mensaje ?? "No se pudo actualizar el carrito."));
  }

  function eliminar(id) {
    AlmacenCE.carrito
      .eliminarItem(id)
      .then(ocultarAvisoAlmacenamiento)
      .catch((error) => mostrarAvisoAlmacenamiento(error.mensaje ?? "No se pudo actualizar el carrito."));
  }

  function crearFilaCarrito(item) {
    const producto = catalogoPorId.get(item.id);
    const li = document.createElement("li");
    li.className =
      "flex flex-wrap items-center gap-3 rounded-lg border border-elite-border p-3 dark:border-elitenight-border";

    // Rojo + ícono de papelera: el borrado es destructivo y debe distinguirse a
    // simple vista de los controles de edición (cantidad), no solo por la palabra.
    const botonEliminar = document.createElement("button");
    botonEliminar.type = "button";
    botonEliminar.className =
      "ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-error px-4 font-bold text-error transition-colors hover:bg-error-tint dark:border-error-dark dark:text-error-dark dark:hover:bg-error-darktint";
    botonEliminar.innerHTML = `<span aria-hidden="true">🗑</span> Eliminar`;
    botonEliminar.addEventListener("click", () => eliminar(item.id));

    if (!producto) {
      const aviso = document.createElement("p");
      aviso.className = "m-0 flex-1 text-sm text-error dark:text-error-dark";
      aviso.textContent = `El producto ${item.id} ya no está disponible en el catálogo.`;
      botonEliminar.setAttribute("aria-label", `Eliminar ${item.id} del carrito`);
      li.append(aviso, botonEliminar);
      return li;
    }

    const img = document.createElement("img");
    img.src = producto.imagen;
    img.alt = "";
    img.width = 64;
    img.height = 64;
    img.className = "h-16 w-16 shrink-0 rounded-lg object-cover";

    const info = document.createElement("div");
    info.className = "min-w-40 flex-1";
    const nombre = document.createElement("a");
    nombre.href = `producto.html?id=${encodeURIComponent(producto.id)}`;
    nombre.className = "font-semibold text-elite-dark dark:text-elitenight-dark";
    nombre.textContent = producto.nombre;
    const precioUnitario = document.createElement("p");
    precioUnitario.className = "m-0 text-sm text-elite-text dark:text-elitenight-text";
    precioUnitario.textContent = `${formatearMoneda(producto.precio)} c/u`;
    info.append(nombre, precioUnitario);

    // Stepper −/+ en vez de un <input type="number"> pelado: el clic/tap es un
    // objetivo más grande y obvio que los flechines nativos del input, y sigue
    // siendo editable a mano para quien prefiera teclear la cantidad.
    const grupoCantidad = document.createElement("div");
    grupoCantidad.className = "flex items-stretch";
    grupoCantidad.setAttribute("role", "group");
    grupoCantidad.setAttribute("aria-label", `Cantidad de ${producto.nombre}`);

    const botonRestar = document.createElement("button");
    botonRestar.type = "button";
    botonRestar.className =
      "min-h-11 min-w-11 rounded-l-lg border-2 border-r-0 border-elite-borderstrong bg-white text-lg font-bold text-elite-ink dark:border-elitenight-border dark:bg-elitenight-bg dark:text-elitenight-text";
    botonRestar.textContent = "−";
    botonRestar.setAttribute("aria-label", `Restar una unidad de ${producto.nombre}`);
    botonRestar.addEventListener("click", () => actualizarCantidad(item.id, item.cantidad - 1));

    const campoCantidad = document.createElement("input");
    campoCantidad.type = "number";
    campoCantidad.min = "1";
    campoCantidad.step = "1";
    campoCantidad.value = String(item.cantidad);
    campoCantidad.className =
      "min-h-11 w-14 border-2 border-elite-borderstrong px-1 text-center text-elite-text dark:border-elitenight-border dark:bg-elitenight-bg dark:text-elitenight-text";
    campoCantidad.setAttribute("aria-label", `Cantidad de ${producto.nombre}`);
    campoCantidad.addEventListener("change", () => {
      const nuevaCantidad = Math.max(0, parseInt(campoCantidad.value, 10) || 0);
      actualizarCantidad(item.id, nuevaCantidad);
    });

    const botonSumar = document.createElement("button");
    botonSumar.type = "button";
    botonSumar.className =
      "min-h-11 min-w-11 rounded-r-lg border-2 border-l-0 border-elite-borderstrong bg-white text-lg font-bold text-elite-ink dark:border-elitenight-border dark:bg-elitenight-bg dark:text-elitenight-text";
    botonSumar.textContent = "+";
    botonSumar.setAttribute("aria-label", `Sumar una unidad de ${producto.nombre}`);
    botonSumar.addEventListener("click", () => actualizarCantidad(item.id, item.cantidad + 1));

    grupoCantidad.append(botonRestar, campoCantidad, botonSumar);

    const subtotal = document.createElement("p");
    subtotal.className = "m-0 w-24 text-right font-bold text-elite-cuero dark:text-elitenight-cuero";
    subtotal.textContent = formatearMoneda(producto.precio * item.cantidad);

    botonEliminar.setAttribute("aria-label", `Eliminar ${producto.nombre} del carrito`);
    li.append(img, info, grupoCantidad, subtotal, botonEliminar);
    return li;
  }

  function renderizar(datosCarrito) {
    const items = datosCarrito.items;
    listaCarrito.innerHTML = "";
    const fragmento = document.createDocumentFragment();
    items.forEach((item) => fragmento.append(crearFilaCarrito(item)));
    listaCarrito.append(fragmento);

    carritoVacio.hidden = items.length !== 0;
    listaCarrito.hidden = items.length === 0;
    botonVaciar.hidden = items.length === 0;

    const total = items.reduce((suma, item) => {
      const producto = catalogoPorId.get(item.id);
      return suma + (producto ? producto.precio * item.cantidad : 0);
    }, 0);
    const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);

    totalCarritoEl.textContent = formatearMoneda(total);
    contadorItemsEl.textContent = unidades === 1 ? "1 producto" : `${unidades} productos`;
  }

  botonVaciar.addEventListener("click", () => {
    if (!window.confirm("¿Vaciar todo el carrito?")) return;
    AlmacenCE.carrito
      .vaciar()
      .then(ocultarAvisoAlmacenamiento)
      .catch((error) => mostrarAvisoAlmacenamiento(error.mensaje ?? "No se pudo vaciar el carrito."));
  });

  document.addEventListener("ce:carrito-actualizado", (evento) => {
    renderizar(evento.detail);
    AlmacenCE.cookies.obtenerUltimaActualizacion().then(pintarUltimaActualizacion);
  });

  // ---- Historial de pedidos (IndexedDB) ----
  function crearFilaHistorial(pedido) {
    const li = document.createElement("li");
    li.className = "rounded-lg border border-elite-border p-3 text-sm dark:border-elitenight-border";
    const fecha = new Date(pedido.fecha).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
    const medio = pedido.medio === "whatsapp" ? "WhatsApp" : "correo";
    const cantidadProductos = pedido.items.length === 1 ? "1 producto" : `${pedido.items.length} productos`;
    const solicitante = pedido.nombre ? `${pedido.nombre} — ` : "";
    li.innerHTML = `<time datetime="${pedido.fecha}">${fecha}</time> — ${solicitante}${cantidadProductos} — <strong>${formatearMoneda(
      pedido.total
    )}</strong> (enviado por ${medio})`;
    return li;
  }

  function renderizarHistorial() {
    return AlmacenCE.pedidos
      .listar()
      .then((pedidosGuardados) => {
        avisoHistorial.hidden = true;
        if (pedidosGuardados.length === 0) {
          seccionHistorial.hidden = true;
          return;
        }
        seccionHistorial.hidden = false;
        listaHistorial.innerHTML = "";
        pedidosGuardados.forEach((pedido) => listaHistorial.append(crearFilaHistorial(pedido)));
      })
      .catch((error) => {
        seccionHistorial.hidden = false;
        avisoHistorial.hidden = false;
        avisoHistorial.textContent = error.mensaje ?? "No se pudo cargar el historial de pedidos en este navegador.";
        listaHistorial.innerHTML = "";
      });
  }

  // ---- Checkout: validación + envío por WhatsApp/correo ----
  function validarCorreoCheckout() {
    return validarCampoCE({
      input: campoCorreoCheckout,
      errorEl: document.getElementById("errorCorreoCheckout"),
      patron: patrones.correo,
      mensajeError: mensajesError.correo,
    });
  }

  function validarTelefonoCheckout() {
    return validarCampoCE({
      input: campoTelefonoCheckout,
      errorEl: document.getElementById("errorTelefonoCheckout"),
      patron: patrones.telefono,
      mensajeError: mensajesError.telefono,
      opcional: true,
    });
  }

  function validarNombreCheckout() {
    return validarCampoCE({
      input: campoNombreCheckout,
      errorEl: document.getElementById("errorNombreCheckout"),
      patron: patrones.nombre,
      mensajeError: mensajesError.nombre,
    });
  }

  campoNombreCheckout.addEventListener("blur", validarNombreCheckout);
  campoCorreoCheckout.addEventListener("blur", validarCorreoCheckout);
  campoTelefonoCheckout.addEventListener("blur", validarTelefonoCheckout);

  function mostrarEstadoCheckout(texto, esError) {
    estadoCheckout.hidden = false;
    estadoCheckout.className = esError
      ? "mb-5 rounded-lg border-2 border-error bg-error-tint p-4 text-error dark:border-error-dark dark:bg-error-darktint dark:text-error-dark"
      : "mb-5 rounded-lg border-2 border-elite-dark bg-elite-tint p-4 dark:border-elitenight-dark dark:bg-elitenight-tint";
    estadoCheckout.textContent = texto;
  }

  function construirMensajePedido(nombre, datosCarrito, total) {
    const lineas = datosCarrito.items.map((item) => {
      const producto = catalogoPorId.get(item.id);
      if (!producto) return `${item.id} x${item.cantidad}`;
      return `${producto.nombre} (${item.id}) x${item.cantidad} — ${formatearMoneda(producto.precio * item.cantidad)}`;
    });
    return `Pedido Comercial Elite\nSolicitado por: ${nombre}\n\n${lineas.join("\n")}\n\nTotal: ${formatearMoneda(total)}`;
  }

  function enviarPedido(medio) {
    const nombreValido = validarNombreCheckout();
    const correoValido = validarCorreoCheckout();
    const telefonoValido = validarTelefonoCheckout();
    if (!nombreValido || !correoValido || !telefonoValido) {
      mostrarEstadoCheckout("Revisa los campos marcados en rojo antes de enviar.", true);
      return;
    }

    AlmacenCE.carrito.obtener().then((datosCarrito) => {
      if (datosCarrito.items.length === 0) {
        mostrarEstadoCheckout("Tu carrito está vacío.", true);
        return;
      }

      const total = datosCarrito.items.reduce((suma, item) => {
        const producto = catalogoPorId.get(item.id);
        return suma + (producto ? producto.precio * item.cantidad : 0);
      }, 0);

      const nombre = campoNombreCheckout.value.trim();
      const correo = campoCorreoCheckout.value.trim();
      const telefono = campoTelefonoCheckout.value.trim();
      const mensaje = construirMensajePedido(nombre, datosCarrito, total);

      if (medio === "whatsapp") {
        window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener");
      } else {
        const asunto = encodeURIComponent("Pedido de cotización — Comercial Elite");
        window.location.href = `mailto:${CORREO_VENTAS}?subject=${asunto}&body=${encodeURIComponent(mensaje)}`;
      }

      const itemsHistorial = datosCarrito.items.map((item) => {
        const producto = catalogoPorId.get(item.id);
        return {
          id: item.id,
          nombre: producto ? producto.nombre : item.id,
          cantidad: item.cantidad,
          precio: producto ? producto.precio : 0,
          subtotal: producto ? producto.precio * item.cantidad : 0,
        };
      });

      Promise.all([
        // El nombre/empresa que cotiza es solo de esta sesión (sessionStorage), a
        // diferencia de correo/teléfono que sí se guardan de forma permanente.
        AlmacenCE.sesionCliente.guardarNombre(nombre).catch(() => {}),
        AlmacenCE.registro.guardar({ correo, telefono }).catch(() => {}),
        AlmacenCE.pedidos
          .agregar({ fecha: new Date().toISOString(), nombre, correo, telefono, items: itemsHistorial, total, medio })
          .then(renderizarHistorial)
          .catch((error) => {
            seccionHistorial.hidden = false;
            avisoHistorial.hidden = false;
            avisoHistorial.textContent = error.mensaje ?? "No se pudo guardar el pedido en el historial.";
          }),
      ]).then(() => {
        mostrarEstadoCheckout(
          medio === "whatsapp"
            ? "Se abrió WhatsApp con tu pedido listo para enviar."
            : "Se abrió tu cliente de correo con el pedido listo para enviar.",
          false
        );
        AlmacenCE.carrito.vaciar().catch(() => {});
      });
    });
  }

  // WhatsApp es el botón submit del formulario: así Enter en cualquier campo envía
  // el pedido por el medio principal (WCAG H32), igual que hacer clic en el botón.
  document.getElementById("formularioCheckout").addEventListener("submit", (evento) => {
    evento.preventDefault();
    enviarPedido("whatsapp");
  });
  document.getElementById("botonEnviarCorreo").addEventListener("click", () => enviarPedido("correo"));

  // ---- Carga inicial ----
  Promise.all([
    fetch("data/catalogo.json").then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    }),
    AlmacenCE.carrito.obtener(),
    AlmacenCE.registro.obtener().catch(() => null),
    AlmacenCE.sesionCliente.obtenerNombre().catch(() => null),
    AlmacenCE.cookies.obtenerUltimaActualizacion().catch(() => null),
  ])
    .then(([datosCatalogo, datosCarrito, datosRegistro, nombreSesion, fechaActualizacion]) => {
      catalogoPorId = new Map(datosCatalogo.productos.map((producto) => [producto.id, producto]));
      renderizar(datosCarrito);
      pintarUltimaActualizacion(fechaActualizacion);
      if (nombreSesion && !campoNombreCheckout.value) campoNombreCheckout.value = nombreSesion;
      if (datosRegistro) {
        if (!campoCorreoCheckout.value) campoCorreoCheckout.value = datosRegistro.correo || "";
        if (!campoTelefonoCheckout.value) campoTelefonoCheckout.value = datosRegistro.telefono || "";
      }
      return renderizarHistorial();
    })
    .catch((error) => {
      console.error("No se pudo cargar el carrito:", error);
      mostrarAvisoAlmacenamiento("No pudimos cargar tu carrito. Intenta recargar la página.");
    });
})();
