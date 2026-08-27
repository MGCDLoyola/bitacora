const app = document.getElementById("app");
const estadoCarga = document.getElementById("estado-carga");

const navegacion = document.getElementById("navegacion");

const usuarioNombre = document.getElementById("usuario-nombre");
const usuarioRol = document.getElementById("usuario-rol");

const contenidoPrincipal = document.getElementById("contenido-principal");
const botonCerrarSesion = document.getElementById("boton-cerrar-sesion");

const mensajeAplicacion = document.getElementById("mensaje-aplicacion");
const textoMensajeAplicacion = document.getElementById(
    "texto-mensaje-aplicacion"
);

const navegacionPorRol = {
    Administrador: [
        {
            id: "gestiones",
            texto: "Gestión de expedientes",
        },
        {
            id: "usuarios",
            texto: "Usuarios",
        },
    ],

    Supervisor: [
        {
            id: "gestiones",
            texto: "Gestión de expedientes",
        },
        {
            id: "usuarios",
            texto: "Usuarios",
        },
    ],

    Cobranza: [
        {
            id: "gestiones",
            texto: "Gestión de expedientes",
        },
    ],

    Visualizador: [
        {
            id: "gestiones",
            texto: "Gestión de expedientes",
        },
    ],
};

const vistas = {
    gestiones: {},
    usuarios: {},
    expediente: {},
};

let usuarioActual = null;
let vistaActual = null;

iniciar();

async function iniciar() {
    try {
        usuarioActual = await obtenerUsuarioActual();

        configurarUsuario(usuarioActual);
        configurarNavegacion(usuarioActual.rol.nombre);

        const vistaInicial = obtenerVistaInicial(usuarioActual.rol.nombre);

        if (vistaInicial !== null) {
            history.replaceState(
                {
                    vista: vistaInicial,
                    datos: {},
                },
                "",
                window.location.pathname
            );

            await cargarVista(vistaInicial, {});
        }

        estadoCarga.hidden = true;
        app.hidden = false;
    } catch (error) {
        estadoCarga.hidden = true;

        if (error.status === 401 || error.status === 403) {
            window.location.href = "/login";
            return;
        }

        mostrarError(error.message || "No se pudo cargar la aplicación.");
    }
}

async function obtenerUsuarioActual() {
    const respuesta = await fetch("/auth/me", {
        method: "GET",
        credentials: "include",
    });

    if (!respuesta.ok) {
        const error = new Error(await mensajeDeError(respuesta));

        error.status = respuesta.status;

        throw error;
    }

    return await respuesta.json();
}

function configurarUsuario(usuario) {
    usuarioNombre.textContent = usuario.nombre;
    usuarioRol.textContent = usuario.rol.nombre;
}

function configurarNavegacion(rol) {
    navegacion.innerHTML = "";

    const opciones = navegacionPorRol[rol] || [];

    opciones.forEach((opcion) => {
        const elemento = document.createElement("button");

        elemento.type = "button";
        elemento.className = "navegacion__item";
        elemento.dataset.vista = opcion.id;

        elemento.innerHTML = `
            <span class="navegacion__texto">
                ${opcion.texto}
            </span>
        `;

        elemento.addEventListener("click", () => {
            navegar(opcion.id);
        });

        navegacion.appendChild(elemento);
    });
}

function obtenerVistaInicial(rol) {
    const opciones = navegacionPorRol[rol] || [];

    if (opciones.length === 0) {
        return null;
    }

    return opciones[0].id;
}

async function navegar(idVista, datos = {}) {
    const vista = vistas[idVista];

    if (!vista) {
        mostrarError("La vista solicitada no está disponible.");
        return;
    }

    vistaActual = idVista;

    history.pushState(
        {
            vista: idVista,
            datos: datos,
        },
        "",
        window.location.pathname
    );

    actualizarNavegacionActiva(idVista);

    limpiarMensajeError();

    await cargarVista(idVista, datos);
}

window.navegar = navegar;

window.addEventListener("popstate", async (event) => {
    const estado = event.state;

    if (!estado?.vista) {
        return;
    }

    const idVista = estado.vista;

    const datos = estado.datos ?? {};

    if (!vistas[idVista]) {
        return;
    }

    vistaActual = idVista;

    actualizarNavegacionActiva(idVista);

    limpiarMensajeError();

    await cargarVista(idVista, datos);
});

function actualizarNavegacionActiva(idVista) {
    document.querySelectorAll(".navegacion__item").forEach((elemento) => {
        elemento.classList.toggle(
            "navegacion__item--activo",
            elemento.dataset.vista === idVista
        );
    });
}

async function cargarVista(idVista, datos = {}) {
    contenidoPrincipal.innerHTML = "";

    try {
        const respuesta = await fetch(`/static/vistas/${idVista}.html`);

        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar la vista "${idVista}".`);
        }

        contenidoPrincipal.innerHTML = await respuesta.text();

        const modulo = await obtenerModuloVista(idVista);

        if (modulo?.iniciar) {
            await modulo.iniciar({
                usuario: usuarioActual,
                contenedor: contenidoPrincipal,
                ...datos,
            });
        }
    } catch (error) {
        contenidoPrincipal.innerHTML = "";

        mostrarError(error.message || "No se pudo cargar la vista.");
    }
}

async function obtenerModuloVista(idVista) {
    switch (idVista) {
        case "gestiones":
            return await import("./gestiones.js");

        case "usuarios":
            return await import("./usuarios.js");

        case "expediente":
            return await import("./expediente.js");

        default:
            return null;
    }
}

async function cerrarSesion() {
    botonCerrarSesion.disabled = true;

    try {
        const respuesta = await fetch("/auth/logout", {
            method: "POST",
            credentials: "include",
        });

        if (!respuesta.ok && respuesta.status !== 401) {
            throw new Error(await mensajeDeError(respuesta));
        }
    } catch (error) {
        mostrarError(error.message || "No se pudo cerrar la sesión.");

        botonCerrarSesion.disabled = false;
        return;
    }

    window.location.replace("/login");
}

botonCerrarSesion.addEventListener("click", cerrarSesion);

async function mensajeDeError(respuesta) {
    try {
        const cuerpo = await respuesta.json();

        if (cuerpo.detail) {
            return cuerpo.detail;
        }
    } catch {
        // La respuesta no contiene JSON.
    }

    if (respuesta.status === 401) {
        return "La sesión no es válida.";
    }

    if (respuesta.status === 403) {
        return "No tienes autorización para acceder.";
    }

    if (respuesta.status === 404) {
        return "No se encontró el recurso solicitado.";
    }

    return "No se pudo completar la solicitud.";
}

function mostrarError(mensaje) {
    textoMensajeAplicacion.textContent = mensaje;
    mensajeAplicacion.hidden = false;
}

function limpiarMensajeError() {
    textoMensajeAplicacion.textContent = "";
    mensajeAplicacion.hidden = true;
}
