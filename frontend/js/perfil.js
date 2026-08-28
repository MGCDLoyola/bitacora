let usuarioPerfil = null;
let contenedorFirma = null;
let contextoCanvas = null;
let hayTrazo = false;
let dibujando = false;

export async function iniciar({ usuario }) {
    usuarioPerfil = usuario;

    configurarDatos();
    configurarFirma();
    configurarPassword();
    configurarAlternadoresPassword();
}

function configurarDatos() {
    document.getElementById("perfil-nombre").textContent = usuarioPerfil.nombre;
    document.getElementById("perfil-correo").textContent = usuarioPerfil.correo;
    document.getElementById("perfil-rol").textContent =
        usuarioPerfil.rol.nombre;
}

function configurarFirma() {
    contenedorFirma = document.getElementById("perfil-firma");

    configurarPestanas();
    configurarCanvas();
    configurarDropzone();

    document
        .getElementById("perfil-firma-borrar")
        .addEventListener("click", borrarTrazo);

    document
        .getElementById("perfil-firma-guardar")
        .addEventListener("click", guardarFirma);

    if (usuarioPerfil.firma) {
        mostrarFirma();
        cambiarModo("subir");
    } else {
        cambiarModo("dibujar");
    }
}

function configurarPestanas() {
    contenedorFirma.querySelectorAll("[data-modo-boton]").forEach((boton) => {
        boton.addEventListener("click", () => {
            cambiarModo(boton.dataset.modoBoton);
        });
    });
}

function cambiarModo(modo) {
    contenedorFirma.dataset.modo = modo;

    contenedorFirma.querySelectorAll("[data-modo-boton]").forEach((boton) => {
        boton.setAttribute(
            "aria-pressed",
            boton.dataset.modoBoton === modo ? "true" : "false"
        );
    });

    actualizarBotonGuardar();
}

function configurarCanvas() {
    const canvas = document.getElementById("perfil-firma-canvas");
    const relacion = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * relacion;
    canvas.height = rect.height * relacion;

    contextoCanvas = canvas.getContext("2d");
    contextoCanvas.scale(relacion, relacion);
    contextoCanvas.lineWidth = 2.4;
    contextoCanvas.lineCap = "round";
    contextoCanvas.lineJoin = "round";
    contextoCanvas.strokeStyle = "#141a26";

    canvas.addEventListener("pointerdown", (evento) => {
        dibujando = true;

        const punto = obtenerPunto(canvas, evento);
        contextoCanvas.beginPath();
        contextoCanvas.moveTo(punto.x, punto.y);
    });

    canvas.addEventListener("pointermove", (evento) => {
        if (!dibujando) {
            return;
        }

        const punto = obtenerPunto(canvas, evento);
        contextoCanvas.lineTo(punto.x, punto.y);
        contextoCanvas.stroke();

        hayTrazo = true;
        actualizarBotonGuardar();
    });

    window.addEventListener("pointerup", () => {
        dibujando = false;
    });
}

function obtenerPunto(canvas, evento) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: evento.clientX - rect.left,
        y: evento.clientY - rect.top,
    };
}

function borrarTrazo() {
    const canvas = document.getElementById("perfil-firma-canvas");

    contextoCanvas.clearRect(0, 0, canvas.width, canvas.height);
    hayTrazo = false;
    actualizarBotonGuardar();
}

function configurarDropzone() {
    const lienzo = document.getElementById("perfil-firma-vista");
    const archivo = document.getElementById("perfil-firma-archivo");

    archivo.addEventListener("change", () => {
        actualizarArchivoSeleccionado(archivo.files?.[0]);
    });

    lienzo.addEventListener("dragover", (evento) => {
        evento.preventDefault();
        lienzo.classList.add("perfil__firma-dropzone--activa");
    });

    lienzo.addEventListener("dragleave", () => {
        lienzo.classList.remove("perfil__firma-dropzone--activa");
    });

    lienzo.addEventListener("drop", (evento) => {
        evento.preventDefault();
        lienzo.classList.remove("perfil__firma-dropzone--activa");

        const soltado = evento.dataTransfer?.files?.[0];

        if (soltado) {
            archivo.files = evento.dataTransfer.files;
            actualizarArchivoSeleccionado(soltado);
        }
    });
}

function actualizarArchivoSeleccionado(seleccionado) {
    document.getElementById("perfil-firma-nombre").textContent =
        seleccionado?.name || "Ningún archivo seleccionado.";

    actualizarBotonGuardar();
}

function actualizarBotonGuardar() {
    const guardar = document.getElementById("perfil-firma-guardar");
    const archivo = document.getElementById("perfil-firma-archivo");

    if (contenedorFirma.dataset.modo === "dibujar") {
        guardar.disabled = !hayTrazo;
    } else {
        guardar.disabled = !archivo.files?.[0];
    }
}

function mostrarFirma() {
    const imagen = document.getElementById("perfil-firma-imagen");
    const vacia = document.getElementById("perfil-firma-vacia");
    const lienzo = document.getElementById("perfil-firma-vista");

    imagen.src = `/usuarios/me/firma?t=${Date.now()}`;
    imagen.hidden = false;
    vacia.hidden = true;
    lienzo.classList.add("perfil__firma-dropzone--llena");
}

async function guardarFirma() {
    if (contenedorFirma.dataset.modo === "dibujar") {
        const blob = await exportarFirmaDibujada();
        enviarFirma(new File([blob], "firma.png", { type: "image/png" }));
        return;
    }

    const archivo = document.getElementById("perfil-firma-archivo");
    const seleccionado = archivo.files?.[0];

    if (seleccionado) {
        enviarFirma(seleccionado);
    }
}

function exportarFirmaDibujada() {
    const canvas = document.getElementById("perfil-firma-canvas");

    const compuesto = document.createElement("canvas");
    compuesto.width = canvas.width;
    compuesto.height = canvas.height;

    const contexto = compuesto.getContext("2d");
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, compuesto.width, compuesto.height);
    contexto.drawImage(canvas, 0, 0);

    return new Promise((resolve) => {
        compuesto.toBlob(resolve, "image/png");
    });
}

async function enviarFirma(archivoAEnviar) {
    const guardar = document.getElementById("perfil-firma-guardar");

    const datos = new FormData();
    datos.append("archivo", archivoAEnviar);

    guardar.disabled = true;
    guardar.innerHTML = `
    <span class="boton__spinner"></span>
    Guardando...
  `;

    limpiarMensaje();

    try {
        const respuesta = await fetch("/usuarios/me/firma", {
            method: "POST",
            credentials: "include",
            body: datos,
        });

        if (!respuesta.ok) {
            throw new Error(await obtenerMensajeError(respuesta));
        }

        usuarioPerfil = await respuesta.json();

        document.getElementById("perfil-firma-archivo").value = "";
        actualizarArchivoSeleccionado(null);
        borrarTrazo();

        mostrarFirma();
        cambiarModo("subir");
    } catch (error) {
        mostrarMensaje(error.message);
    } finally {
        guardar.textContent = "Guardar firma";
        actualizarBotonGuardar();
    }
}

function configurarPassword() {
    const formulario = document.getElementById("perfil-password-form");
    const nueva = document.getElementById("perfil-password-nueva");
    const confirmacion = document.getElementById(
        "perfil-password-confirmacion"
    );

    formulario.addEventListener("submit", cambiarPassword);

    nueva.addEventListener("input", actualizarCoincidencia);
    confirmacion.addEventListener("input", actualizarCoincidencia);
}

function actualizarCoincidencia() {
    const nueva = document.getElementById("perfil-password-nueva").value;
    const confirmacion = document.getElementById(
        "perfil-password-confirmacion"
    ).value;

    const contenedor = document.getElementById("perfil-password-coincidencia");
    const texto = document.getElementById("perfil-password-coincidencia-texto");

    if (!confirmacion) {
        contenedor.hidden = true;
        return;
    }

    contenedor.hidden = false;

    const coincide = nueva === confirmacion;

    contenedor.classList.toggle("perfil__coincidencia--ok", coincide);
    contenedor.classList.toggle("perfil__coincidencia--error", !coincide);

    texto.textContent = coincide
        ? "Las contraseñas coinciden."
        : "Las contraseñas no coinciden.";
}

async function cambiarPassword(evento) {
    evento.preventDefault();

    const passwordActual = document.getElementById(
        "perfil-password-actual"
    ).value;

    const passwordNueva = document.getElementById(
        "perfil-password-nueva"
    ).value;

    const passwordConfirmacion = document.getElementById(
        "perfil-password-confirmacion"
    ).value;

    if (passwordNueva !== passwordConfirmacion) {
        mostrarMensaje("Las nuevas contraseñas no coinciden.");
        return;
    }

    const boton = document.getElementById("perfil-password-guardar");

    boton.disabled = true;
    boton.innerHTML = `
    <span class="boton__spinner"></span>
    Cambiando...
  `;

    limpiarMensaje();

    try {
        const respuesta = await fetch("/auth/cambiar-password", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                password_actual: passwordActual,
                password_nueva: passwordNueva,
            }),
        });

        if (!respuesta.ok) {
            throw new Error(await obtenerMensajeError(respuesta));
        }

        window.location.replace("/login");
    } catch (error) {
        mostrarMensaje(error.message);

        boton.disabled = false;
        boton.textContent = "Cambiar contraseña";
    }
}

function configurarAlternadoresPassword() {
    document.querySelectorAll("[data-password-target]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const input = document.getElementById(boton.dataset.passwordTarget);

            const mostrar = input.type === "password";

            input.type = mostrar ? "text" : "password";
            boton.textContent = mostrar ? "Ocultar" : "Ver";
            boton.setAttribute(
                "aria-label",
                mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
            );
        });
    });
}

async function obtenerMensajeError(respuesta) {
    try {
        const cuerpo = await respuesta.json();

        if (cuerpo.detail) {
            return cuerpo.detail;
        }
    } catch {}

    if (respuesta.status === 401) {
        return "La sesión no es válida.";
    }

    if (respuesta.status === 403) {
        return "No tienes autorización para realizar esta operación.";
    }

    return "No se pudo completar la solicitud.";
}

function mostrarMensaje(mensaje) {
    document.getElementById("perfil-mensaje-texto").textContent = mensaje;
    document.getElementById("perfil-mensaje").hidden = false;
}

function limpiarMensaje() {
    document.getElementById("perfil-mensaje-texto").textContent = "";
    document.getElementById("perfil-mensaje").hidden = true;
}
