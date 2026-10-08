// Formulario de cotización: validación con regex en el navegador (ValidacionCE,
// compartida con registro.js y el checkout del carrito) y envío vía mailto (sitio sin
// backend, RF-08). Errores en texto junto al campo, enlazados con aria-describedby
// (WCAG 3.3.1 / 3.3.2). El estado inválido se refleja alternando utilidades de color
// de Tailwind sobre el propio campo, en vez del selector CSS ".campo[data-invalido] input"
// de la versión vanilla.
(() => {
  const formulario = document.getElementById("formularioContacto");
  if (!formulario) return;

  const CORREO_VENTAS = "ventas@comercialelite.com";

  const { patrones, mensajesError, validarCampo: validarCampoCE } = window.ValidacionCE;

  const estadoFormulario = document.getElementById("estadoFormulario");
  const CLASES_ESTADO_OK = ["border-elite-dark", "bg-elite-tint", "dark:border-elitenight-dark", "dark:bg-elitenight-tint"];
  const CLASES_ESTADO_ERROR = ["border-error", "bg-error-tint", "dark:border-error-dark", "dark:bg-error-darktint"];

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function validarCampo(nombreCampo, opcional = false) {
    const input = document.getElementById(nombreCampo);
    const errorEl = document.getElementById(`error${capitalizar(nombreCampo)}`);
    return validarCampoCE({
      input,
      errorEl,
      patron: patrones[nombreCampo],
      mensajeError: mensajesError[nombreCampo],
      opcional,
    });
  }

  ["nombre", "correo", "mensaje"].forEach((campo) => {
    document.getElementById(campo).addEventListener("blur", () => validarCampo(campo));
  });
  document.getElementById("telefono").addEventListener("blur", () => validarCampo("telefono", true));

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const nombreValido = validarCampo("nombre");
    const correoValido = validarCampo("correo");
    const telefonoValido = validarCampo("telefono", true);
    const mensajeValido = validarCampo("mensaje");

    const todoValido = nombreValido && correoValido && telefonoValido && mensajeValido;

    if (!todoValido) {
      estadoFormulario.hidden = false;
      estadoFormulario.dataset.tipo = "error";
      estadoFormulario.classList.remove(...CLASES_ESTADO_OK);
      estadoFormulario.classList.add(...CLASES_ESTADO_ERROR);
      estadoFormulario.textContent = "Revisa los campos marcados en rojo antes de enviar.";
      formulario.querySelector("[data-invalido] input, [data-invalido] textarea")?.focus();
      return;
    }

    const datos = new FormData(formulario);
    const asunto = encodeURIComponent(`Solicitud de cotización — ${datos.get("nombre")}`);
    const cuerpo = encodeURIComponent(
      `Nombre: ${datos.get("nombre")}\n` +
        `Correo: ${datos.get("correo")}\n` +
        `Teléfono: ${datos.get("telefono") || "No indicado"}\n\n` +
        `Mensaje:\n${datos.get("mensaje")}`
    );

    window.location.href = `mailto:${CORREO_VENTAS}?subject=${asunto}&body=${cuerpo}`;

    estadoFormulario.hidden = false;
    estadoFormulario.dataset.tipo = "exito";
    estadoFormulario.classList.remove(...CLASES_ESTADO_ERROR);
    estadoFormulario.classList.add(...CLASES_ESTADO_OK);
    estadoFormulario.textContent =
      "Se abrió tu cliente de correo con la solicitud lista para enviar. Si prefieres, también puedes escribirnos por WhatsApp.";
    formulario.reset();
  });

  // Precarga correo/teléfono si ya se guardaron desde registro.html (no bloqueante:
  // si falla la lectura, el formulario simplemente queda vacío).
  if (window.AlmacenCE) {
    AlmacenCE.registro
      .obtener()
      .then((datosGuardados) => {
        if (!datosGuardados) return;
        const campoCorreo = document.getElementById("correo");
        const campoTelefono = document.getElementById("telefono");
        if (campoCorreo && !campoCorreo.value) campoCorreo.value = datosGuardados.correo;
        if (campoTelefono && !campoTelefono.value) campoTelefono.value = datosGuardados.telefono;
      })
      .catch(() => {});
  }
})();
