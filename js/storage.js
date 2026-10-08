// Capa de persistencia compartida: expone window.AlmacenCE para que
// catalogo.js/producto.js/contacto.js/carrito.js/registro.js/encabezado.js no repitan
// claves de localStorage ni manejo de errores. Toda la API devuelve Promesas —incluido
// localStorage, que es síncrono— para que el resto del código trate la persistencia de
// forma uniforme (y para envolver IndexedDB, que sí es asíncrono de verdad).
//
// Si localStorage/sessionStorage fallan (cuota llena, modo privado estricto), cada
// mutación deja la cache en memoria al día y RECHAZA con un error estructurado
// { codigo, mensaje }; quien llama debe mostrar `error.mensaje` (ya en español, listo
// para role="alert") y seguir leyendo con los métodos obtener()/contarUnidades(), que
// siguen reflejando el cambio aunque no haya quedado guardado para la próxima visita.
(() => {
  const CLAVE_CARRITO = "ce_carrito_v1";
  const CLAVE_REGISTRO = "ce_registro_v1";
  const CLAVE_FILTROS = "ce_filtros_catalogo_v1";
  const CLAVE_NOMBRE_COTIZANTE = "ce_nombre_cotizante_v1";
  const COOKIE_ACTUALIZACION = "ce_ultima_actualizacion";
  const DB_NOMBRE = "ComercialEliteDB";
  const DB_VERSION = 1;
  const ALMACEN_PEDIDOS = "pedidos";

  function crearError(codigo, mensaje) {
    const error = new Error(mensaje);
    error.codigo = codigo;
    error.mensaje = mensaje;
    return error;
  }

  function leerJSON(storage, clave, porDefecto) {
    try {
      const crudo = storage.getItem(clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch {
      return porDefecto;
    }
  }

  function escribirJSON(storage, clave, datos) {
    try {
      storage.setItem(clave, JSON.stringify(datos));
      return true;
    } catch {
      return false;
    }
  }

  // ---- Cookie de última actualización (sin datos personales) ----
  function fijarCookie(nombre, valor, dias) {
    const segundos = dias * 24 * 60 * 60;
    document.cookie = `${nombre}=${encodeURIComponent(valor)}; path=/; max-age=${segundos}; SameSite=Lax`;
  }

  function leerCookie(nombre) {
    const buscado = `${nombre}=`;
    const fila = document.cookie.split("; ").find((parte) => parte.startsWith(buscado));
    return fila ? decodeURIComponent(fila.slice(buscado.length)) : null;
  }

  function marcarActualizacionInterno() {
    try {
      fijarCookie(COOKIE_ACTUALIZACION, new Date().toISOString(), 30);
    } catch {
      // Cookies bloqueadas (navegación privada estricta): no afecta al carrito/registro.
    }
  }

  const cookies = {
    marcarActualizacion() {
      return Promise.resolve().then(marcarActualizacionInterno);
    },
    obtenerUltimaActualizacion() {
      return Promise.resolve().then(() => leerCookie(COOKIE_ACTUALIZACION));
    },
  };

  // ---- Carrito (localStorage, con cache en memoria para la pestaña actual) ----
  let cacheCarrito = null;

  function obtenerCarritoInterno() {
    if (!cacheCarrito) {
      cacheCarrito = leerJSON(localStorage, CLAVE_CARRITO, { version: 1, items: [] });
    }
    return cacheCarrito;
  }

  function persistirCarrito(datosCarrito) {
    cacheCarrito = datosCarrito;
    marcarActualizacionInterno();
    const ok = escribirJSON(localStorage, CLAVE_CARRITO, datosCarrito);
    if (!ok) {
      throw crearError(
        "ALMACENAMIENTO_NO_DISPONIBLE",
        "No se pudo guardar el carrito de forma permanente en este navegador. Seguirá funcionando mientras no cierres esta pestaña."
      );
    }
  }

  function mutarCarrito(mutador) {
    return Promise.resolve().then(() => {
      const actual = obtenerCarritoInterno();
      mutador(actual);
      let errorPersistencia = null;
      try {
        persistirCarrito(actual);
      } catch (error) {
        errorPersistencia = error;
      }
      document.dispatchEvent(new CustomEvent("ce:carrito-actualizado", { detail: actual }));
      if (errorPersistencia) throw errorPersistencia;
      return actual;
    });
  }

  const carrito = {
    obtener() {
      return Promise.resolve().then(() => obtenerCarritoInterno());
    },
    agregarItem(id, cantidad = 1) {
      return mutarCarrito((datosCarrito) => {
        const ahora = new Date().toISOString();
        const existente = datosCarrito.items.find((item) => item.id === id);
        if (existente) {
          existente.cantidad += cantidad;
          existente.actualizadoEn = ahora;
        } else {
          datosCarrito.items.push({ id, cantidad, agregadoEn: ahora, actualizadoEn: ahora });
        }
      });
    },
    actualizarCantidad(id, cantidad) {
      return mutarCarrito((datosCarrito) => {
        if (cantidad <= 0) {
          datosCarrito.items = datosCarrito.items.filter((item) => item.id !== id);
          return;
        }
        const item = datosCarrito.items.find((i) => i.id === id);
        if (!item) throw crearError("ITEM_NO_ENCONTRADO", "Ese producto ya no está en el carrito.");
        item.cantidad = cantidad;
        item.actualizadoEn = new Date().toISOString();
      });
    },
    eliminarItem(id) {
      return mutarCarrito((datosCarrito) => {
        datosCarrito.items = datosCarrito.items.filter((item) => item.id !== id);
      });
    },
    vaciar() {
      return mutarCarrito((datosCarrito) => {
        datosCarrito.items = [];
      });
    },
    contarUnidades() {
      return carrito.obtener().then((datosCarrito) => datosCarrito.items.reduce((suma, item) => suma + item.cantidad, 0));
    },
  };

  // ---- Registro del cliente: solo correo + teléfono (localStorage) ----
  let cacheRegistro;

  function obtenerRegistroInterno() {
    if (cacheRegistro === undefined) {
      cacheRegistro = leerJSON(localStorage, CLAVE_REGISTRO, null);
    }
    return cacheRegistro;
  }

  const registro = {
    obtener() {
      return Promise.resolve().then(obtenerRegistroInterno);
    },
    guardar({ correo, telefono }) {
      return Promise.resolve().then(() => {
        const datos = { correo, telefono, guardadoEn: new Date().toISOString() };
        cacheRegistro = datos;
        marcarActualizacionInterno();
        const ok = escribirJSON(localStorage, CLAVE_REGISTRO, datos);
        if (!ok) {
          throw crearError(
            "ALMACENAMIENTO_NO_DISPONIBLE",
            "No se pudieron guardar tus datos de forma permanente en este navegador."
          );
        }
        return datos;
      });
    },
    borrar() {
      return Promise.resolve().then(() => {
        cacheRegistro = null;
        marcarActualizacionInterno();
        try {
          localStorage.removeItem(CLAVE_REGISTRO);
        } catch {
          // Si falla, al menos esta pestaña ya no los usa en memoria.
        }
      });
    },
  };

  // ---- Filtros del catálogo (sessionStorage): nunca bloquea el filtrado si falla ----
  const filtros = {
    obtener() {
      return Promise.resolve().then(() => leerJSON(sessionStorage, CLAVE_FILTROS, { busqueda: "", categorias: [] }));
    },
    guardar(datosFiltros) {
      return Promise.resolve().then(() => {
        escribirJSON(sessionStorage, CLAVE_FILTROS, datosFiltros);
      });
    },
  };

  // ---- Nombre del cliente/empresa que cotiza (sessionStorage, NO localStorage): a
  // diferencia del correo/teléfono de AlmacenCE.registro, este dato es solo de la
  // visita actual, no algo que deba quedar guardado en el dispositivo entre sesiones.
  const sesionCliente = {
    obtenerNombre() {
      return Promise.resolve().then(() => leerJSON(sessionStorage, CLAVE_NOMBRE_COTIZANTE, null));
    },
    guardarNombre(nombre) {
      return Promise.resolve().then(() => {
        escribirJSON(sessionStorage, CLAVE_NOMBRE_COTIZANTE, nombre);
      });
    },
  };

  // ---- Historial de pedidos enviados (IndexedDB) ----
  let promesaDB = null;

  function abrirBaseDatos() {
    if (!("indexedDB" in window)) {
      return Promise.reject(crearError("INDEXEDDB_NO_SOPORTADO", "Este navegador no permite guardar el historial de pedidos."));
    }
    if (promesaDB) return promesaDB;
    promesaDB = new Promise((resolve, reject) => {
      const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);
      peticion.onupgradeneeded = () => {
        const db = peticion.result;
        if (!db.objectStoreNames.contains(ALMACEN_PEDIDOS)) {
          const almacen = db.createObjectStore(ALMACEN_PEDIDOS, { keyPath: "id", autoIncrement: true });
          almacen.createIndex("porFecha", "fecha");
          almacen.createIndex("porCorreo", "correo");
        }
      };
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(crearError("INDEXEDDB_ERROR", "No se pudo abrir el historial de pedidos."));
      peticion.onblocked = () => reject(crearError("INDEXEDDB_BLOQUEADO", "El historial de pedidos está bloqueado por otra pestaña abierta."));
    });
    return promesaDB;
  }

  const pedidos = {
    agregar(pedido) {
      return abrirBaseDatos().then(
        (db) =>
          new Promise((resolve, reject) => {
            const transaccion = db.transaction(ALMACEN_PEDIDOS, "readwrite");
            const peticion = transaccion.objectStore(ALMACEN_PEDIDOS).add(pedido);
            peticion.onsuccess = () => resolve(peticion.result);
            peticion.onerror = () => reject(crearError("INDEXEDDB_ERROR", "No se pudo guardar el pedido en el historial."));
          })
      );
    },
    listar() {
      return abrirBaseDatos().then(
        (db) =>
          new Promise((resolve, reject) => {
            const transaccion = db.transaction(ALMACEN_PEDIDOS, "readonly");
            const peticion = transaccion.objectStore(ALMACEN_PEDIDOS).getAll();
            peticion.onsuccess = () => {
              const resultado = (peticion.result || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
              resolve(resultado);
            };
            peticion.onerror = () => reject(crearError("INDEXEDDB_ERROR", "No se pudo leer el historial de pedidos."));
          })
      );
    },
  };

  window.AlmacenCE = { carrito, registro, filtros, sesionCliente, pedidos, cookies };
})();
