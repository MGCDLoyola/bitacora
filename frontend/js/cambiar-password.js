const formulario = document.getElementById("form-cambiar-password");

const passwordNueva = document.getElementById("password-nueva");
const passwordConfirmar = document.getElementById("password-confirmar");

const boton = document.getElementById("boton-cambiar-password");
const spinner = document.getElementById("spinner");
const textoBoton = document.getElementById("texto-boton");

const mensajeError = document.getElementById("mensaje-error");
const textoError = document.getElementById("texto-error");

const fecha = document.getElementById("fecha");

/*
 * Estado inicial
 */

ocultarError();

fecha.textContent = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
});

/*
 * Mostrar / ocultar contraseña
 */

document.querySelectorAll("[data-toggle-password]").forEach((botonAlternar) => {
    botonAlternar.addEventListener("click", () => {
        const id = botonAlternar.dataset.togglePassword;
        const input = document.getElementById(id);

        if (input.type === "password") {
            input.type = "text";

            botonAlternar.setAttribute("aria-label", "Ocultar contraseña");
        } else {
            input.type = "password";

            botonAlternar.setAttribute("aria-label", "Mostrar contraseña");
        }
    });
});

/*
 * Cambio de contraseña
 */

formulario.addEventListener("submit", cambiarPassword);

async function cambiarPassword(event) {
    event.preventDefault();

    ocultarError();

    const nueva = passwordNueva.value.trim();
    const confirmar = passwordConfirmar.value.trim();

    /*
     * Validaciones
     */

    if (!nueva) {
        mostrarError("Ingresa una nueva contraseña.");

        passwordNueva.focus();

        return;
    }

    if (nueva.length < 8) {
        mostrarError("La nueva contraseña debe tener al menos 8 caracteres.");

        passwordNueva.focus();

        return;
    }

    if (!confirmar) {
        mostrarError("Confirma tu nueva contraseña.");

        passwordConfirmar.focus();

        return;
    }

    if (nueva !== confirmar) {
        mostrarError("Las contraseñas no coinciden.");

        passwordConfirmar.focus();

        return;
    }

    /*
     * Envío
     */

    setCargando(true);

    try {
        const respuesta = await fetch("/auth/cambiar-password", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            credentials: "include",

            body: JSON.stringify({
                password_nueva: nueva,
            }),
        });

        if (!respuesta.ok) {
            mostrarError(await obtenerMensajeError(respuesta));

            return;
        }

        /*
         * El backend devuelve 204 y elimina
         * la sesión. Regresamos al login.
         */

        window.location.replace("/login");
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);

        mostrarError("No se pudo contactar al servidor. Intenta de nuevo.");
    } finally {
        setCargando(false);
    }
}

/*
 * Estado de carga
 */

function setCargando(cargando) {
    boton.disabled = cargando;

    passwordNueva.disabled = cargando;
    passwordConfirmar.disabled = cargando;

    spinner.hidden = !cargando;

    textoBoton.textContent = cargando ? "Cambiando..." : "Cambiar contraseña";
}

/*
 * Mensaje de error
 */

function mostrarError(mensaje) {
    textoError.textContent = mensaje;

    mensajeError.hidden = false;
}

function ocultarError() {
    textoError.textContent = "";

    mensajeError.hidden = true;
}

async function obtenerMensajeError(respuesta) {
    try {
        const cuerpo = await respuesta.json();

        if (cuerpo.detail) {
            return cuerpo.detail;
        }
    } catch {
        // La respuesta no contiene JSON.
    }

    switch (respuesta.status) {
        case 401:
            return "La sesión no es válida.";

        case 403:
            return "No tienes autorización para realizar esta acción.";

        case 422:
            return "Los datos proporcionados no son válidos.";

        default:
            return "No se pudo cambiar la contraseña.";
    }
}
