// Validación de formularios compartida: expone window.ValidacionCE para que
// contacto.js, registro.js y el checkout de carrito.js usen los mismos patrones regex
// y el mismo feedback visual/accesible en vez de duplicarlos en cada página.
(() => {
  const patrones = {
    nombre: /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,80}$/,
    correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    telefono: /^[0-9]{7,10}$/,
    mensaje: /^.{5,600}$/s,
  };

  const mensajesError = {
    nombre: "Escribe tu nombre completo (solo letras, mínimo 2 caracteres).",
    correo: "Escribe un correo válido, por ejemplo nombre@empresa.com.",
    telefono: "El teléfono debe tener entre 7 y 10 dígitos, solo números.",
    mensaje: "Cuéntanos brevemente qué producto o línea te interesa.",
  };

  const CLASES_INVALIDO = ["border-error", "bg-error-tint", "dark:border-error-dark", "dark:bg-error-darktint"];
  const CLASES_VALIDO = ["border-elite-borderstrong", "dark:border-elitenight-border"];

  // input/errorEl: elementos del DOM. patron/mensajeError: del campo que se valida.
  // opcional: si está vacío y es opcional, se considera válido sin marcar nada.
  function validarCampo({ input, errorEl, patron, mensajeError, opcional = false }) {
    const campo = input.closest(".campo");
    const valor = input.value.trim();

    if (opcional && valor === "") {
      campo?.removeAttribute("data-invalido");
      input.classList.remove(...CLASES_INVALIDO);
      input.classList.add(...CLASES_VALIDO);
      if (errorEl) errorEl.textContent = "";
      return true;
    }

    const esValido = patron.test(valor);
    if (esValido) {
      campo?.removeAttribute("data-invalido");
      input.classList.remove(...CLASES_INVALIDO);
      input.classList.add(...CLASES_VALIDO);
      if (errorEl) errorEl.textContent = "";
    } else {
      campo?.setAttribute("data-invalido", "");
      input.classList.remove(...CLASES_VALIDO);
      input.classList.add(...CLASES_INVALIDO);
      if (errorEl) errorEl.textContent = mensajeError;
    }
    return esValido;
  }

  window.ValidacionCE = { patrones, mensajesError, CLASES_INVALIDO, CLASES_VALIDO, validarCampo };
})();
