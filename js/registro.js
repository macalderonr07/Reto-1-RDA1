// Registro: guarda únicamente correo + teléfono (AlmacenCE.registro) para precargar
// el checkout del carrito y el formulario de contacto. Da control total al usuario
// sobre ese dato con un botón de borrado explícito.
(() => {
  const formulario = document.getElementById("formularioRegistro");
  if (!formulario) return;

  const { patrones, mensajesError, validarCampo: validarCampoCE } = window.ValidacionCE;

  const estadoRegistro = document.getElementById("estadoRegistro");
  const datosGuardadosEl = document.getElementById("datosGuardados");
  const botonBorrar = document.getElementById("botonBorrarRegistro");
  const campoCorreo = document.getElementById("correoRegistro");
  const campoTelefono = document.getElementById("telefonoRegistro");

  const CLASES_ESTADO_OK = ["border-elite-dark", "bg-elite-tint", "dark:border-elitenight-dark", "dark:bg-elitenight-tint"];
  const CLASES_ESTADO_ERROR = ["border-error", "bg-error-tint", "dark:border-error-dark", "dark:bg-error-darktint"];

  function validarCorreo() {
    return validarCampoCE({
      input: campoCorreo,
      errorEl: document.getElementById("errorCorreoRegistro"),
      patron: patrones.correo,
      mensajeError: mensajesError.correo,
    });
  }

  function validarTelefono() {
    return validarCampoCE({
      input: campoTelefono,
      errorEl: document.getElementById("errorTelefonoRegistro"),
      patron: patrones.telefono,
      mensajeError: mensajesError.telefono,
    });
  }

  campoCorreo.addEventListener("blur", validarCorreo);
  campoTelefono.addEventListener("blur", validarTelefono);

  function pintarDatosGuardados(datos) {
    if (!datos) {
      datosGuardadosEl.textContent = "No tienes datos guardados en este navegador.";
      botonBorrar.hidden = true;
      return;
    }
    const fecha = new Date(datos.guardadoEn).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
    datosGuardadosEl.textContent = `Correo: ${datos.correo} · Teléfono: ${datos.telefono} (guardado el ${fecha})`;
    botonBorrar.hidden = false;
  }

  function mostrarEstado(texto, esError) {
    estadoRegistro.hidden = false;
    estadoRegistro.classList.remove(...CLASES_ESTADO_OK, ...CLASES_ESTADO_ERROR);
    estadoRegistro.classList.add(...(esError ? CLASES_ESTADO_ERROR : CLASES_ESTADO_OK));
    estadoRegistro.textContent = texto;
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const correoValido = validarCorreo();
    const telefonoValido = validarTelefono();
    if (!correoValido || !telefonoValido) {
      mostrarEstado("Revisa los campos marcados en rojo antes de guardar.", true);
      formulario.querySelector("[data-invalido] input")?.focus();
      return;
    }

    AlmacenCE.registro
      .guardar({ correo: campoCorreo.value.trim(), telefono: campoTelefono.value.trim() })
      .then((datos) => {
        mostrarEstado("Tus datos se guardaron en este navegador.", false);
        pintarDatosGuardados(datos);
      })
      .catch((error) => {
        mostrarEstado(error.mensaje ?? "No se pudieron guardar tus datos.", true);
      });
  });

  botonBorrar.addEventListener("click", () => {
    AlmacenCE.registro.borrar().then(() => {
      formulario.reset();
      mostrarEstado("Tus datos se borraron de este navegador.", false);
      pintarDatosGuardados(null);
    });
  });

  AlmacenCE.registro.obtener().then((datos) => {
    pintarDatosGuardados(datos);
    if (datos) {
      campoCorreo.value = datos.correo;
      campoTelefono.value = datos.telefono;
    }
  });
})();
