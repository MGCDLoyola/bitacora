const app = document.getElementById("app");
const estadoCarga = document.getElementById("estado-carga");

const navegacion = document.getElementById("navegacion");

const usuarioNombre = document.getElementById("usuario-nombre");
const usuarioRol = document.getElementById("usuario-rol");

const botonPerfil = document.getElementById("boton-perfil");

const contenidoPrincipal = document.getElementById("contenido-principal");
const botonCerrarSesion = document.getElementById("boton-cerrar-sesion");

const mensajeAplicacion = document.getElementById("mensaje-aplicacion");
const textoMensajeAplicacion = document.getElementById(
    "texto-mensaje-aplicacion"
);

/* ─────────────────────────────────────────────
   NAVEGACIÓN POR ROL
   ───────────────────────────────────────────── */

const navegacionPorRol = {
    Administrador: [
        {
            id: "gestiones",
            texto: "Gestión de expedientes",
        },
        {
            id: "expedientes",
            texto: "Expedientes",
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
            id: "expedientes",
            texto: "Expedientes",
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
        {
            id: "expedientes",
            texto: "Expedientes",
        },
    ],

    Visualizador: [
        {
            id: "gestiones",
            texto: "Gestión de expedientes",
        },
        {
            id: "expedientes",
            texto: "Expedientes",
        },
    ],
};

/* ─────────────────────────────────────────────
   VISTAS DISPONIBLES
   ───────────────────────────────────────────── */

const vistas = {
    gestiones: {},
    usuarios: {},
    expediente: {},
    expedientes: {},
    expediente_c: {},
    perfil: {},
};

/* ─────────────────────────────────────────────
   ESTADO DE LA APLICACIÓN
   ───────────────────────────────────────────── */

let usuarioActual = null;
let vistaActual = null;

/* ─────────────────────────────────────────────
   INICIALIZACIÓN
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   USUARIO AUTENTICADO
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   NAVEGACIÓN PRINCIPAL
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   NAVEGACIÓN ENTRE VISTAS
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   HISTORIAL DEL NAVEGADOR
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   CARGA DE VISTAS
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   MÓDULOS DE LAS VISTAS
   ───────────────────────────────────────────── */

async function obtenerModuloVista(idVista) {
    switch (idVista) {
        case "gestiones":
            return await import("./gestiones.js");

        case "usuarios":
            return await import("./usuarios.js");

        case "expediente":
            return await import("./expediente.js");

        case "expedientes":
            return await import("./expedientes.js");

        case "expediente_c":
            return await import("./expediente_c.js");

        case "perfil":
            return await import("./perfil.js");

        default:
            return null;
    }
}

/* ─────────────────────────────────────────────
   CIERRE DE SESIÓN
   ───────────────────────────────────────────── */

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

botonPerfil.addEventListener("click", () => {
    navegar("perfil");
});

botonCerrarSesion.addEventListener("click", cerrarSesion);

/* ─────────────────────────────────────────────
   MANEJO DE ERRORES HTTP
   ───────────────────────────────────────────── */

async function mensajeDeError(respuesta) {
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
        return "No tienes autorización para acceder.";
    }

    if (respuesta.status === 404) {
        return "No se encontró el recurso solicitado.";
    }

    return "No se pudo completar la solicitud.";
}

/* ─────────────────────────────────────────────
   MENSAJES DE LA APLICACIÓN
   ───────────────────────────────────────────── */

function mostrarError(mensaje) {
    textoMensajeAplicacion.textContent = mensaje;
    mensajeAplicacion.hidden = false;
}

function limpiarMensajeError() {
    textoMensajeAplicacion.textContent = "";
    mensajeAplicacion.hidden = true;
}
