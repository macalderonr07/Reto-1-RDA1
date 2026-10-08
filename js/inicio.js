// Inicio: lee data/catalogo.json para (1) las novedades y (2) las fotos de las
// ventanas diagonales de cada línea, así nunca quedan desactualizadas respecto
// al catálogo (RF-05, RNF-04). Si falla la carga se conserva el contenido
// escrito en el HTML como respaldo.
(() => {
  const lista = document.getElementById("listaNovedades");

  const formateador = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Foto de cada ventana: UN producto representativo de la línea (el primero
  // con foto real; si todos son ilustraciones, el primero). Las imágenes
  // marcadas "ilustracion" en el JSON se tiñen con el color de la ventana; las
  // fotos reales se muestran tal cual.
  function elegirRepresentante(productos) {
    return productos.find((p) => !p.ilustracion) || productos[0];
  }

  function pintarVentanas(productos) {
    document.querySelectorAll(".ventana[data-cat]").forEach((ventana) => {
      const deLaLinea = productos.filter((p) => p.categoria === ventana.dataset.cat);
      if (deLaLinea.length === 0) return;
      const producto = elegirRepresentante(deLaLinea);

      const contenedor = ventana.querySelector(".ventana-foto");
      if (contenedor) {
        const img = document.createElement("img");
        img.src = producto.imagen;
        img.alt = "";
        if (producto.ilustracion) img.className = "foto-ilustracion";
        contenedor.replaceChildren(img);
      }

      const nombre = ventana.querySelector(".ventana-producto");
      if (nombre) nombre.textContent = producto.nombre;
    });
  }

  function pintarNovedades(productos) {
    if (!lista) return;
    const novedades = productos
      .filter((producto) => producto.novedad)
      .sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso))
      .slice(0, 3);

    if (novedades.length === 0) return;

    lista.innerHTML = "";
    novedades.forEach((producto) => {
      const li = document.createElement("li");
      li.className = "flex flex-wrap items-baseline gap-3 border-b border-elite-border py-2 dark:border-elitenight-border";
      const time = document.createElement("time");
      time.className = "font-bold whitespace-nowrap text-elite-dark dark:text-elitenight-dark";
      time.dateTime = producto.fechaIngreso;
      time.textContent = formateador.format(new Date(`${producto.fechaIngreso}T00:00:00`));
      const enlace = document.createElement("a");
      enlace.href = `producto.html?id=${encodeURIComponent(producto.id)}`;
      enlace.textContent = `Nuevo ingreso: ${producto.nombre}`;
      li.append(time, " ", enlace);
      lista.append(li);
    });
  }

  fetch("data/catalogo.json")
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then((datos) => {
      pintarVentanas(datos.productos);
      pintarNovedades(datos.productos);
    })
    .catch((error) => {
      console.error("No se pudo cargar el catálogo en el inicio:", error);
    });
})();
