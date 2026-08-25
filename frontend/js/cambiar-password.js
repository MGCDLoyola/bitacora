const formulario = document.getElementById("form-cambiar-password");
const boton = document.getElementById("boton-cambiar-password");
const spinner = document.getElementById("spinner");
const textoBoton = document.getElementById("texto-boton");

const mensajeError = document.getElementById("mensaje-error");
const textoError = document.getElementById("texto-error");

const passwordNueva = document.getElementById("password-nueva");
const passwordConfirmar = document.getElementById("password-confirmar");

const fecha = document.getElementById("fecha");

fecha.textContent = fechaLegible();

formulario.addEventListener("submit", cambiarPassword);

document.querySelectorAll("[data-toggle-password]").forEach((boton) => {
    boton.addEventListener("click", () => {
        const id = boton.dataset.togglePassword;
        const input = document.getElementById(id);

        if (input.type === "password") {
            input.type = "text";
            boton.setAttribute("aria-label", "Ocultar contraseña");
        } else {
            input.type = "password";
            boton.setAttribute("aria-label", "Mostrar contraseña");
        }
    });
});


async function cambiarPassword(event) {
    event.preventDefault();

    ocultarError();

    const nueva = passwordNueva.value;
    const confirmar = passwordConfirmar.value;

    if (nueva.length < 8) {
        mostrarError(
            "La contraseña debe tener al menos 8 caracteres."
        );
        passwordNueva.focus();
        return;
    }

    if (nueva !== confirmar) {
        mostrarError(
            "Las contraseñas no coinciden."
        );
        passwordConfirmar.focus();
        return;
    }

    setCargando(true);

    try {
        const respuesta = await fetch("/auth/cambiar-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                password_nueva: nueva
            })
        });

        if (!respuesta.ok) {
            mostrarError(await mensajeDeError(respuesta));
            return;
        }

        window.location.href = "/login";

    } catch {
        mostrarError(
            "No se pudo contactar al servidor. Intenta de nuevo."
        );
    } finally {
        setCargando(false);
    }
}


function setCargando(cargando) {
    boton.disabled = cargando;
    passwordNueva.disabled = cargando;
    passwordConfirmar.disabled = cargando;

    spinner.hidden = !cargando;

    textoBoton.textContent = cargando
        ? "Cambiando..."
        : "Cambiar contraseña";
}


function mostrarError(mensaje) {
    textoError.textContent = mensaje;
    mensajeError.hidden = false;
}


function ocultarError() {
    textoError.textContent = "";
    mensajeError.hidden = true;
}


async function mensajeDeError(respuesta) {
    try {
        const cuerpo = await respuesta.json();

        if (cuerpo.detail) {
            return cuerpo.detail;
        }
    } catch {
        // Continuar con el mensaje genérico.
    }

    if (respuesta.status === 401) {
        return "Tu sesión no es válida. Inicia sesión nuevamente.";
    }

    if (respuesta.status === 403) {
        return "Tu sesión no es válida. Inicia sesión nuevamente.";
    }

    return "No se pudo completar el cambio de contraseña.";
}


function fechaLegible() {
    return new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}