// Catálogo: carga data/catalogo.json, renderiza la rejilla y filtra en el
// navegador sin recargar la página (RF-02, RF-04, RNF-04).
// Las tarjetas se pintan con las mismas utilidades de Tailwind que usa el
// resto del sitio; Tailwind Play CDN observa el DOM y genera los estilos
// para estas clases aunque se añadan después de la carga inicial.
(() => {
  const rejilla = document.getElementById("rejillaProductos");
  const contador = document.getElementById("contadorResultados");
  const sinResultados = document.getElementById("sinResultados");
  const errorCarga = document.getElementById("errorCarga");
  const fieldsetCategoria = document.getElementById("filtroCategoria");
  const buscador = document.getElementById("buscador");
  const botonLimpiar = document.getElementById("botonLimpiar");
  const botonLimpiarAlterno = document.getElementById("botonLimpiarAlterno");
  const avisoCarrito = document.getElementById("avisoCarritoGlobal");

  if (!rejilla) return;

  // Botón "Agregar al carrito": color cuero (distinto del verde de marca de la nav/CTAs
  // de WhatsApp) para que la acción de compra se distinga a simple vista; al confirmar
  // se pinta de lima un instante como retroalimentación inmediata (WCAG 4.1.3: el
  // cambio de texto a "Agregado" ya lo anuncia por sí solo, el color es un refuerzo).
  const CLASES_BOTON_AGREGAR =
    "add-carrito relative z-10 mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-elite-cuero px-4 font-bold text-white transition-colors hover:brightness-90 active:brightness-75 dark:bg-elitenight-cuero dark:text-elitenight-ink";
  const CLASES_BOTON_AGREGADO =
    "add-carrito relative z-10 mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-elite-lime px-4 font-bold text-elite-ink transition-colors dark:text-elitenight-ink";

  function confirmarAgregado(boton) {
    const texto = boton.querySelector(".texto-boton-carrito");
    boton.className = CLASES_BOTON_AGREGADO;
    texto.textContent = "✓ Agregado";
    window.clearTimeout(boton._temporizadorConfirmacion);
    boton._temporizadorConfirmacion = window.setTimeout(() => {
      boton.className = CLASES_BOTON_AGREGAR;
      texto.textContent = "Agregar al carrito";
    }, 1400);
  }

  let productos = [];
  let categorias = [];

  const normalizar = (texto) =>
    texto
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const parametros = new URLSearchParams(window.location.search);
  const categoriaInicial = parametros.get("cat");

  function crearFiltrosCategoria() {
    categorias.forEach(({ slug, nombre }) => {
      const total = productos.filter((p) => p.categoria === slug).length;
      const id = `filtro-${slug}`;
      const contenedor = document.createElement("div");
      contenedor.className = "flex min-h-9 items-center gap-2";

      const casilla = document.createElement("input");
      casilla.type = "checkbox";
      casilla.id = id;
      casilla.name = "categoria";
      casilla.value = slug;
      casilla.className = "h-5 w-5 accent-elite-dark dark:accent-elitenight-dark";
      if (categoriaInicial === slug) casilla.checked = true;

      const etiqueta = document.createElement("label");
      etiqueta.setAttribute("for", id);
      etiqueta.textContent = `${nombre} (${total})`;

      contenedor.append(casilla, etiqueta);
      fieldsetCategoria.append(contenedor);
    });
  }

  function crearTarjeta(producto) {
    const li = document.createElement("li");

    const articulo = document.createElement("article");
    articulo.className =
      "tarjeta-producto relative flex h-full flex-col overflow-hidden rounded-lg border border-elite-border bg-white shadow-[0_1px_3px_rgba(26,26,26,0.12)] dark:border-elitenight-border dark:bg-elitenight-bg";
    articulo.dataset.categoria = producto.categoria;
    articulo.dataset.buscable = normalizar(
      [producto.nombre, producto.id, producto.subcategoria, producto.uso].join(" ")
    );

    const figura = document.createElement("figure");
    figura.className = "m-0 bg-elite-tint dark:bg-elitenight-tint";
    const img = document.createElement("img");
    img.src = producto.imagen;
    img.alt = producto.alt;
    // Proporción fija 4:3 y recorte centrado: fotos verticales y horizontales
    // ocupan el mismo espacio y la rejilla no se desalinea.
    img.className = "aspect-[4/3] w-full object-cover";
    img.width = 400;
    img.height = 300;
    img.loading = "lazy";
    const figcaption = document.createElement("figcaption");
    figcaption.className = "sr-only";
    figcaption.textContent = producto.nombre;
    figura.append(img, figcaption);

    const cuerpo = document.createElement("div");
    cuerpo.className = "flex flex-1 flex-col gap-1.5 p-5";

    const h3 = document.createElement("h3");
    h3.className = "mb-0 text-base font-semibold";
    const enlace = document.createElement("a");
    enlace.className =
      "text-elite-dark no-underline after:absolute after:inset-0 after:content-[''] dark:text-elitenight-dark";
    enlace.href = `producto.html?id=${encodeURIComponent(producto.id)}`;
    enlace.textContent = producto.nombre;
    h3.append(enlace);

    const meta = document.createElement("p");
    meta.className = "m-0 text-sm text-elite-text dark:text-elitenight-text";
    meta.textContent = `${producto.id} · ${producto.presentacion}`;

    cuerpo.append(h3, meta);

    if (producto.novedad) {
      const chip = document.createElement("span");
      chip.className =
        "inline-flex w-fit items-center gap-1 rounded-full bg-elite-lime px-3 py-0.5 text-xs font-bold text-elite-ink before:content-['●'] before:text-[0.7em]";
      chip.textContent = "Nuevo ingreso";
      cuerpo.append(chip);
    }

    const precio = document.createElement("p");
    precio.className = "m-0 font-bold text-elite-cuero dark:text-elitenight-cuero";
    precio.textContent = `$${producto.precio.toFixed(2)}`;

    const botonAgregar = document.createElement("button");
    botonAgregar.type = "button";
    botonAgregar.className = CLASES_BOTON_AGREGAR;
    botonAgregar.dataset.id = producto.id;
    botonAgregar.dataset.nombre = producto.nombre;
    botonAgregar.setAttribute("aria-label", `Agregar ${producto.nombre} al carrito`);
    botonAgregar.innerHTML = `<span aria-hidden="true">🛒</span><span class="texto-boton-carrito">Agregar al carrito</span>`;

    cuerpo.append(precio, botonAgregar);

    articulo.append(figura, cuerpo);
    li.append(articulo);
    return li;
  }

  function renderizarProductos() {
    rejilla.innerHTML = "";
    const fragmento = document.createDocumentFragment();
    productos.forEach((producto) => fragmento.append(crearTarjeta(producto)));
    rejilla.append(fragmento);
    rejilla.removeAttribute("aria-busy");
  }

  function categoriasSeleccionadas() {
    return Array.from(fieldsetCategoria.querySelectorAll("input:checked")).map(
      (input) => input.value
    );
  }

  function aplicarFiltros() {
    const seleccionadas = categoriasSeleccionadas();
    const termino = normalizar(buscador.value.trim());
    let visibles = 0;

    rejilla.querySelectorAll(".tarjeta-producto").forEach((tarjeta) => {
      const coincideCategoria =
        seleccionadas.length === 0 || seleccionadas.includes(tarjeta.dataset.categoria);
      const coincideBusqueda = termino === "" || tarjeta.dataset.buscable.includes(termino);
      const visible = coincideCategoria && coincideBusqueda;
      tarjeta.closest("li").hidden = !visible;
      if (visible) visibles += 1;
    });

    contador.textContent =
      visibles === 1 ? "1 producto encontrado" : `${visibles} productos encontrados`;
    sinResultados.hidden = visibles !== 0;

    // Se persiste en sessionStorage (no localStorage): el filtro es parte de la
    // navegación de esta visita, no algo que deba sobrevivir a cerrar la pestaña.
    window.AlmacenCE?.filtros
      .guardar({ busqueda: buscador.value.trim(), categorias: seleccionadas })
      .catch(() => {});
  }

  function anunciarCarrito(texto, esError = false) {
    if (!avisoCarrito) return;
    avisoCarrito.setAttribute("role", esError ? "alert" : "status");
    avisoCarrito.className = esError
      ? "mb-3 font-semibold text-error dark:text-error-dark"
      : "mb-3 font-semibold text-elite-dark dark:text-elitenight-dark";
    avisoCarrito.textContent = texto;
  }

  function limpiarFiltros() {
    fieldsetCategoria.querySelectorAll("input:checked").forEach((input) => {
      input.checked = false;
    });
    buscador.value = "";
    aplicarFiltros();
    buscador.focus();
  }

  function iniciar(datos, filtrosGuardados) {
    productos = datos.productos;
    categorias = datos.categorias;

    crearFiltrosCategoria();
    renderizarProductos();

    // La URL (?cat=) manda sobre el filtro guardado si llega con una categoría;
    // si no, se restaura lo que había en sessionStorage de esta misma pestaña.
    if (!categoriaInicial && filtrosGuardados) {
      if (filtrosGuardados.busqueda) buscador.value = filtrosGuardados.busqueda;
      filtrosGuardados.categorias?.forEach((slug) => {
        const casilla = fieldsetCategoria.querySelector(`input[value="${slug}"]`);
        if (casilla) casilla.checked = true;
      });
    }

    aplicarFiltros();

    fieldsetCategoria.addEventListener("change", aplicarFiltros);
    buscador.addEventListener("input", aplicarFiltros);
    botonLimpiar.addEventListener("click", limpiarFiltros);
    botonLimpiarAlterno?.addEventListener("click", limpiarFiltros);

    rejilla.addEventListener("click", (evento) => {
      const boton = evento.target.closest(".add-carrito");
      if (!boton) return;
      AlmacenCE.carrito
        .agregarItem(boton.dataset.id, 1)
        .then(() => {
          confirmarAgregado(boton);
          anunciarCarrito(`Se agregó ${boton.dataset.nombre} al carrito.`);
        })
        .catch((error) => anunciarCarrito(error.mensaje ?? "No se pudo agregar al carrito.", true));
    });
  }

  Promise.all([
    fetch("data/catalogo.json").then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    }),
    window.AlmacenCE ? AlmacenCE.filtros.obtener().catch(() => null) : Promise.resolve(null),
  ])
    .then(([datos, filtrosGuardados]) => iniciar(datos, filtrosGuardados))
    .catch((error) => {
      console.error("No se pudo cargar el catálogo:", error);
      contador.textContent = "";
      rejilla.hidden = true;
      errorCarga.hidden = false;
    });
})();
