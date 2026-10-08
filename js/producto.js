// Ficha de producto: lee ?id= de la URL y pinta el detalle desde
// data/catalogo.json (RF-03).
(() => {
  const estadoCarga = document.getElementById("estadoCarga");
  const ficha = document.getElementById("fichaProducto");
  const errorProducto = document.getElementById("errorProducto");
  const seccionRelacionados = document.getElementById("seccionRelacionados");
  const rejillaRelacionados = document.getElementById("rejillaRelacionados");

  if (!ficha) return;

  const TELEFONO_WHATSAPP = "593999999999";
  const CORREO_VENTAS = "ventas@comercialelite.com";

  function crearTarjetaRelacionada(producto) {
    const li = document.createElement("li");
    li.innerHTML = `
      <article class="relative flex h-full flex-col overflow-hidden rounded-lg border border-elite-border bg-white shadow-[0_1px_3px_rgba(26,26,26,0.12)] dark:border-elitenight-border dark:bg-elitenight-bg">
        <figure class="m-0 bg-elite-tint dark:bg-elitenight-tint">
          <img class="aspect-[4/3] w-full object-cover" src="${producto.imagen}" alt="${producto.alt}" width="400" height="300" loading="lazy">
          <figcaption class="sr-only">${producto.nombre}</figcaption>
        </figure>
        <div class="flex flex-1 flex-col gap-1.5 p-5">
          <h3 class="mb-0 text-base font-semibold"><a class="text-elite-dark no-underline after:absolute after:inset-0 after:content-[''] dark:text-elitenight-dark" href="producto.html?id=${encodeURIComponent(producto.id)}">${producto.nombre}</a></h3>
          <p class="m-0 text-sm text-elite-text dark:text-elitenight-text">${producto.id} · ${producto.presentacion}</p>
        </div>
      </article>
    `;
    return li;
  }

  // Galería: imagen principal con proporción fija + miniaturas (botones).
  // Accesibilidad: cada miniatura es un <button> con nombre propio y
  // aria-pressed; el pie de foto es aria-live para anunciar el cambio; las
  // flechas del teclado recorren las miniaturas.
  function crearGaleria(producto) {
    const imagenes =
      producto.imagenes && producto.imagenes.length > 0
        ? producto.imagenes
        : [{ src: producto.imagen, alt: producto.alt }];
    const figura = document.getElementById("figuraPrincipal");
    const total = imagenes.length;

    figura.innerHTML = `
      <div class="overflow-hidden rounded-lg border border-elite-border bg-elite-tint dark:border-elitenight-border dark:bg-elitenight-tint">
        <img class="aspect-[4/3] w-full object-contain" id="imagenPrincipal" src="${imagenes[0].src}" alt="${imagenes[0].alt}" width="800" height="600">
      </div>
      <figcaption class="mt-1.5 text-sm text-elite-text dark:text-elitenight-text" id="pieImagen" aria-live="polite"></figcaption>
    `;
    const principal = figura.querySelector("#imagenPrincipal");
    const pie = figura.querySelector("#pieImagen");
    const botones = [];

    function seleccionar(indice) {
      const { src, alt } = imagenes[indice];
      principal.src = src;
      principal.alt = alt;
      pie.textContent = total > 1 ? `Imagen ${indice + 1} de ${total}: ${producto.nombre}` : producto.nombre;
      botones.forEach((boton, i) => {
        const activo = i === indice;
        boton.setAttribute("aria-pressed", String(activo));
        boton.classList.toggle("border-elite-dark", activo);
        boton.classList.toggle("dark:border-elitenight-dark", activo);
        boton.classList.toggle("border-transparent", !activo);
      });
    }

    if (total > 1) {
      const lista = document.createElement("ul");
      lista.className = "mt-3 grid grid-cols-3 gap-2 s30:grid-cols-4";
      lista.setAttribute("aria-label", "Imágenes del producto");
      imagenes.forEach(({ src, alt }, indice) => {
        const li = document.createElement("li");
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className =
          "block min-h-11 w-full overflow-hidden rounded-lg border-4 border-transparent bg-elite-tint p-0 dark:bg-elitenight-tint";
        boton.setAttribute("aria-label", `Ver imagen ${indice + 1} de ${total}: ${alt}`);
        boton.innerHTML = `<img class="aspect-[4/3] w-full object-cover" src="${src}" alt="" width="200" height="150" loading="lazy">`;
        boton.addEventListener("click", () => seleccionar(indice));
        boton.addEventListener("keydown", (evento) => {
          const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evento.key];
          if (!paso) return;
          evento.preventDefault();
          const siguiente = (indice + paso + total) % total;
          botones[siguiente].focus();
          seleccionar(siguiente);
        });
        botones.push(boton);
        li.append(boton);
        lista.append(li);
      });
      figura.after(lista);
    }
    seleccionar(0);
  }

  function mostrarProducto(producto, todos) {
    document.title = `${producto.nombre} — Comercial Elite`;
    const meta = document.getElementById("descripcionPagina");
    if (meta) {
      meta.setAttribute(
        "content",
        `${producto.nombre}: ${producto.presentacion}. ${producto.uso}.`
      );
    }

    document.getElementById("migaProducto").textContent = producto.nombre;

    crearGaleria(producto);

    document.getElementById("nombreProducto").textContent = producto.nombre;
    document.getElementById("codigoProducto").textContent = producto.id;
    document.getElementById("presentacionProducto").textContent = producto.presentacion;
    document.getElementById("coloresProducto").textContent = producto.colores.join(", ");
    document.getElementById("usoProducto").textContent = producto.uso;
    document.getElementById("precioProducto").textContent = `$${producto.precio.toFixed(2)}`;

    const estadoCarritoProducto = document.getElementById("estadoCarritoProducto");
    const campoCantidad = document.getElementById("cantidadProducto");
    const botonAgregarCarrito = document.getElementById("botonAgregarCarrito");
    const textoBotonAgregar = botonAgregarCarrito.querySelector(".texto-boton-carrito");

    function leerCantidad() {
      return Math.max(1, parseInt(campoCantidad.value, 10) || 1);
    }

    document.getElementById("botonRestarCantidad").addEventListener("click", () => {
      campoCantidad.value = Math.max(1, leerCantidad() - 1);
    });
    document.getElementById("botonSumarCantidad").addEventListener("click", () => {
      campoCantidad.value = leerCantidad() + 1;
    });
    campoCantidad.addEventListener("change", () => {
      campoCantidad.value = leerCantidad();
    });

    botonAgregarCarrito.addEventListener("click", () => {
      const cantidad = leerCantidad();
      campoCantidad.value = cantidad;

      AlmacenCE.carrito
        .agregarItem(producto.id, cantidad)
        .then(() => {
          estadoCarritoProducto.className = "mb-3 empty:hidden text-sm text-elite-dark dark:text-elitenight-dark";
          estadoCarritoProducto.textContent = `Se agregó ${cantidad} × ${producto.nombre} al carrito.`;

          // Retroalimentación inmediata junto al botón: cambia a lima + "✓ Agregado"
          // un instante, además del texto en estadoCarritoProducto (WCAG 1.4.1: el
          // texto es lo que confirma la acción, el color es solo refuerzo visual).
          botonAgregarCarrito.className =
            "add-carrito inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-elite-lime px-6 font-bold text-elite-ink no-underline transition-colors dark:text-elitenight-ink";
          textoBotonAgregar.textContent = "✓ Agregado";
          window.clearTimeout(botonAgregarCarrito._temporizadorConfirmacion);
          botonAgregarCarrito._temporizadorConfirmacion = window.setTimeout(() => {
            botonAgregarCarrito.className =
              "add-carrito inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-elite-cuero px-6 font-bold text-white no-underline transition-colors hover:brightness-90 active:brightness-75 dark:bg-elitenight-cuero dark:text-elitenight-ink";
            textoBotonAgregar.textContent = "Agregar al carrito";
          }, 1400);
        })
        .catch((error) => {
          estadoCarritoProducto.className = "mb-3 empty:hidden text-sm text-error dark:text-error-dark";
          estadoCarritoProducto.textContent = error.mensaje ?? "No se pudo agregar al carrito.";
        });
    });

    const mensajeWhatsApp = encodeURIComponent(
      `Hola, quiero cotizar el producto ${producto.id} - ${producto.nombre}.`
    );
    document.getElementById(
      "enlaceWhatsApp"
    ).href = `https://wa.me/${TELEFONO_WHATSAPP}?text=${mensajeWhatsApp}`;

    const asuntoCorreo = encodeURIComponent(`Cotización ${producto.id} — ${producto.nombre}`);
    const cuerpoCorreo = encodeURIComponent(
      `Hola,\n\nQuisiera solicitar una cotización para:\n\nProducto: ${producto.nombre}\nCódigo: ${producto.id}\nPresentación: ${producto.presentacion}\n\nGracias.`
    );
    document.getElementById(
      "enlaceCorreo"
    ).href = `mailto:${CORREO_VENTAS}?subject=${asuntoCorreo}&body=${cuerpoCorreo}`;

    const relacionados = todos
      .filter((p) => p.categoria === producto.categoria && p.id !== producto.id)
      .slice(0, 3);

    if (relacionados.length > 0) {
      rejillaRelacionados.innerHTML = "";
      relacionados.forEach((p) => rejillaRelacionados.append(crearTarjetaRelacionada(p)));
      seccionRelacionados.hidden = false;
    }

    estadoCarga.hidden = true;
    ficha.hidden = false;
  }

  function mostrarError() {
    estadoCarga.hidden = true;
    errorProducto.hidden = false;
  }

  const parametros = new URLSearchParams(window.location.search);
  const id = parametros.get("id");

  if (!id) {
    mostrarError();
    return;
  }

  fetch("data/catalogo.json")
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then((datos) => {
      const producto = datos.productos.find((p) => p.id === id);
      if (!producto) {
        mostrarError();
        return;
      }
      mostrarProducto(producto, datos.productos);
    })
    .catch((error) => {
      console.error("No se pudo cargar la ficha de producto:", error);
      mostrarError();
    });
})();
