let usuarioSesion = null;

let usuarios = [];

let tablaUsuarios = null;
let estadoUsuarios = null;

let mensajeUsuarios = null;
let textoMensajeUsuarios = null;

let botonNuevoUsuario = null;

let filtroUsuarios = null;
let filtroRol = null;
let filtroEstado = null;

let modalNuevoUsuario = null;
let formularioNuevoUsuario = null;

let nuevoUsuarioNombre = null;
let nuevoUsuarioCorreo = null;
let nuevoUsuarioRol = null;

let mensajeNuevoUsuario = null;
let textoMensajeNuevoUsuario = null;

let botonCancelarNuevoUsuario = null;
let botonGuardarNuevoUsuario = null;

let modalEstadoUsuario = null;
let modalEstadoMensaje = null;
let modalEstadoError = null;
let textoModalEstadoError = null;

let botonCancelarEstado = null;
let botonConfirmarEstado = null;

let usuarioEstadoPendiente = null;


export async function iniciar({ usuario, contenedor }) {
    usuarioSesion = usuario;

    tablaUsuarios = contenedor.querySelector(
        "#tabla-usuarios"
    );

    estadoUsuarios = contenedor.querySelector(
        "#estado-usuarios"
    );

    mensajeUsuarios = contenedor.querySelector(
        "#mensaje-usuarios"
    );

    textoMensajeUsuarios = contenedor.querySelector(
        "#texto-mensaje-usuarios"
    );

    botonNuevoUsuario = contenedor.querySelector(
        "#boton-nuevo-usuario"
    );

    filtroUsuarios = contenedor.querySelector(
        "#filtro-usuarios"
    );

    filtroRol = contenedor.querySelector(
        "#filtro-rol"
    );

    filtroEstado = contenedor.querySelector(
        "#filtro-estado"
    );

    modalNuevoUsuario = contenedor.querySelector(
        "#modal-nuevo-usuario"
    );

    formularioNuevoUsuario = contenedor.querySelector(
        "#form-nuevo-usuario"
    );

    nuevoUsuarioNombre = contenedor.querySelector(
        "#nuevo-usuario-nombre"
    );

    nuevoUsuarioCorreo = contenedor.querySelector(
        "#nuevo-usuario-correo"
    );

    nuevoUsuarioRol = contenedor.querySelector(
        "#nuevo-usuario-rol"
    );

    mensajeNuevoUsuario = contenedor.querySelector(
        "#mensaje-nuevo-usuario"
    );

    textoMensajeNuevoUsuario = contenedor.querySelector(
        "#texto-mensaje-nuevo-usuario"
    );

    botonCancelarNuevoUsuario = contenedor.querySelector(
        "#boton-cancelar-nuevo-usuario"
    );

    botonGuardarNuevoUsuario = contenedor.querySelector(
        "#boton-guardar-nuevo-usuario"
    );

    modalEstadoUsuario = contenedor.querySelector(
        "#modal-estado-usuario"
    );

    modalEstadoMensaje = contenedor.querySelector(
        "#modal-estado-mensaje"
    );

    modalEstadoError = contenedor.querySelector(
        "#modal-estado-error"
    );

    textoModalEstadoError = contenedor.querySelector(
        "#texto-modal-estado-error"
    );

    botonCancelarEstado = contenedor.querySelector(
        "#boton-cancelar-estado"
    );

    botonConfirmarEstado = contenedor.querySelector(
        "#boton-confirmar-estado"
    );


    configurarVista();

    await cargarUsuarios();
}

function configurarVista() {
    const esAdministrador =
        usuarioSesion?.rol?.nombre === "Administrador";

    botonNuevoUsuario.hidden = !esAdministrador;


    botonNuevoUsuario.addEventListener(
        "click",
        abrirNuevoUsuario
    );


    filtroUsuarios.addEventListener(
        "input",
        aplicarFiltros
    );

    filtroRol.addEventListener(
        "change",
        aplicarFiltros
    );

    filtroEstado.addEventListener(
        "change",
        aplicarFiltros
    );


    formularioNuevoUsuario.addEventListener(
        "submit",
        crearUsuario
    );

    botonCancelarNuevoUsuario.addEventListener(
        "click",
        cerrarModalNuevoUsuario
    );


    modalNuevoUsuario
        .querySelectorAll("[data-cerrar-nuevo-usuario]")
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                cerrarModalNuevoUsuario
            );
        });


    botonCancelarEstado.addEventListener(
        "click",
        cerrarModalEstado
    );

    botonConfirmarEstado.addEventListener(
        "click",
        confirmarCambioEstado
    );


    modalEstadoUsuario
        .querySelectorAll("[data-cerrar-modal]")
        .forEach((elemento) => {
            elemento.addEventListener(
                "click",
                cerrarModalEstado
            );
        });
}

async function cargarUsuarios() {
    ocultarMensaje();
    mostrarCarga();

    try {
        const respuesta = await fetch(
            "/usuarios",
            {
                method: "GET",
                credentials: "include"
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                await mensajeDeError(respuesta)
            );
        }

        usuarios = await respuesta.json();

        cargarOpcionesRol();
        aplicarFiltros();

    } catch (error) {
        mostrarError(
            error.message ||
            "No se pudieron cargar los usuarios."
        );

    } finally {
        ocultarCarga();
    }
}


function cargarOpcionesRol() {
    const roles = [
        ...new Map(
            usuarios.map((usuario) => [
                usuario.rol.id,
                usuario.rol
            ])
        ).values()
    ].sort(
        (a, b) =>
            a.nombre.localeCompare(
                b.nombre,
                "es"
            )
    );

    const valorActual = filtroRol.value;

    filtroRol.innerHTML = `
        <option value="">
            Todos
        </option>

        ${roles.map((rol) => `
            <option value="${rol.id}">
                ${escaparHtml(rol.nombre)}
            </option>
        `).join("")}
    `;

    const existeValor = roles.some(
        (rol) =>
            String(rol.id) === valorActual
    );

    filtroRol.value = existeValor
        ? valorActual
        : "";
}


function aplicarFiltros() {
    const busqueda =
        filtroUsuarios.value
            .trim()
            .toLocaleLowerCase("es-MX");

    const rolSeleccionado =
        filtroRol.value;

    const estadoSeleccionado =
        filtroEstado.value;

    const usuariosFiltrados =
        usuarios.filter((usuario) => {

            const coincideBusqueda =
                !busqueda ||
                usuario.nombre
                    .toLocaleLowerCase("es-MX")
                    .includes(busqueda) ||
                usuario.correo
                    .toLocaleLowerCase("es-MX")
                    .includes(busqueda);

            const coincideRol =
                !rolSeleccionado ||
                String(usuario.rol.id) === rolSeleccionado;

            const coincideEstado =
                !estadoSeleccionado ||
                (
                    estadoSeleccionado === "activo" &&
                    usuario.activo
                ) ||
                (
                    estadoSeleccionado === "inactivo" &&
                    !usuario.activo
                );

            return (
                coincideBusqueda &&
                coincideRol &&
                coincideEstado
            );
        });

    renderizarUsuarios(usuariosFiltrados);
}


function renderizarUsuarios(usuariosFiltrados) {
    if (usuariosFiltrados.length === 0) {
        tablaUsuarios.innerHTML = `
            <div class="tabla-vacia">
                <p class="u-cuerpo u-texto-terciario">
                    No hay usuarios que coincidan con los filtros.
                </p>
            </div>
        `;

        return;
    }

    const filas = usuariosFiltrados
        .map((usuario) => crearFilaUsuario(usuario))
        .join("");

    tablaUsuarios.innerHTML = `
        <table class="tabla">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Firma</th>
                    <th class="tabla__columna-acciones">
                        Acciones
                    </th>
                </tr>
            </thead>

            <tbody>
                ${filas}
            </tbody>
        </table>
    `;

    configurarAcciones();
}


function crearFilaUsuario(usuario) {
    const estado = usuario.activo
        ? "Activo"
        : "Inactivo";

    const claseEstado = usuario.activo
        ? "tabla__estado--activo"
        : "tabla__estado--inactivo";

    const firma = usuario.firma
        ? "Sí"
        : "No";

    const esAdministrador =
        usuarioSesion?.rol?.nombre === "Administrador";

    const accionEstado = usuario.activo
        ? "Desactivar"
        : "Activar";

    const acciones = esAdministrador
        ? `
            <div class="tabla__acciones-grupo">

                <button
                    type="button"
                    class="tabla__accion"
                    data-accion="editar"
                    data-id="${usuario.id}"
                >
                    Editar
                </button>

                <button
                    type="button"
                    class="tabla__accion tabla__accion--estado"
                    data-accion="estado"
                    data-id="${usuario.id}"
                    data-activo="${usuario.activo}"
                    data-nombre="${escaparHtml(usuario.nombre)}"
                >
                    ${accionEstado}
                </button>

            </div>
        `
        : "";

    return `
        <tr>
            <td>
                <span class="tabla__nombre">
                    ${escaparHtml(usuario.nombre)}
                </span>
            </td>

            <td>
                <span class="tabla__correo">
                    ${escaparHtml(usuario.correo)}
                </span>
            </td>

            <td>
                ${escaparHtml(usuario.rol.nombre)}
            </td>

            <td>
                <span class="tabla__estado ${claseEstado}">
                    ${estado}
                </span>
            </td>

            <td>
                ${firma}
            </td>

            <td class="tabla__acciones">
                ${acciones}
            </td>
        </tr>
    `;
}


function configurarAcciones() {
    tablaUsuarios
        .querySelectorAll("[data-accion]")
        .forEach((boton) => {
            boton.addEventListener(
                "click",
                manejarAccion
            );
        });
}


function manejarAccion(event) {
    const boton = event.currentTarget;
    const accion = boton.dataset.accion;
    const idUsuario = Number(
        boton.dataset.id
    );

    if (accion === "editar") {
        editarUsuario(idUsuario);
        return;
    }

    if (accion === "estado") {
        const activo =
            boton.dataset.activo === "true";

        const nombre =
            boton.dataset.nombre;

        abrirModalEstado(
            idUsuario,
            nombre,
            activo
        );
    }
}

async function abrirNuevoUsuario() {
    ocultarErrorNuevoUsuario();

    formularioNuevoUsuario.reset();

    nuevoUsuarioRol.innerHTML = `
        <option value="">
            Cargando roles...
        </option>
    `;

    nuevoUsuarioRol.disabled = true;

    modalNuevoUsuario.hidden = false;

    try {
        await cargarRoles();

        nuevoUsuarioRol.focus();

    } catch (error) {
        mostrarErrorNuevoUsuario(
            error.message ||
            "No se pudieron cargar los roles."
        );
    }
}


async function cargarRoles() {
    const respuesta = await fetch(
        "/roles/",
        {
            method: "GET",
            credentials: "include"
        }
    );

    if (!respuesta.ok) {
        throw new Error(
            await mensajeDeError(respuesta)
        );
    }

    const roles = await respuesta.json();

    nuevoUsuarioRol.innerHTML = `
        <option value="">
            Selecciona un rol
        </option>

        ${roles.map((rol) => `
            <option value="${rol.id}">
                ${escaparHtml(rol.nombre)}
            </option>
        `).join("")}
    `;

    nuevoUsuarioRol.disabled = false;
}


function cerrarModalNuevoUsuario() {
    modalNuevoUsuario.hidden = true;

    formularioNuevoUsuario.reset();

    ocultarErrorNuevoUsuario();
}


async function crearUsuario(event) {
    event.preventDefault();

    ocultarErrorNuevoUsuario();

    const nombre =
        nuevoUsuarioNombre.value.trim();

    const correo =
        nuevoUsuarioCorreo.value.trim();

    const idRol =
        nuevoUsuarioRol.value;


    if (!nombre) {
        mostrarErrorNuevoUsuario(
            "Ingresa el nombre completo."
        );

        nuevoUsuarioNombre.focus();

        return;
    }


    if (!correo) {
        mostrarErrorNuevoUsuario(
            "Ingresa el correo."
        );

        nuevoUsuarioCorreo.focus();

        return;
    }


    if (!idRol) {
        mostrarErrorNuevoUsuario(
            "Selecciona un rol."
        );

        nuevoUsuarioRol.focus();

        return;
    }


    setCargandoNuevoUsuario(true);


    try {
        const respuesta = await fetch(
            "/usuarios",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    nombre,
                    correo,
                    id_rol: Number(idRol),
                    activo: true
                })
            }
        );


        if (!respuesta.ok) {
            mostrarErrorNuevoUsuario(
                await mensajeDeError(respuesta)
            );

            return;
        }


        cerrarModalNuevoUsuario();

        await cargarUsuarios();


    } catch {
        mostrarErrorNuevoUsuario(
            "No se pudo contactar al servidor. Intenta de nuevo."
        );

    } finally {
        setCargandoNuevoUsuario(false);
    }
}


function setCargandoNuevoUsuario(cargando) {
    botonGuardarNuevoUsuario.disabled = cargando;
    botonCancelarNuevoUsuario.disabled = cargando;

    nuevoUsuarioNombre.disabled = cargando;
    nuevoUsuarioCorreo.disabled = cargando;
    nuevoUsuarioRol.disabled = cargando;

    botonGuardarNuevoUsuario.textContent =
        cargando
            ? "Creando..."
            : "Crear usuario";
}


function mostrarErrorNuevoUsuario(mensaje) {
    textoMensajeNuevoUsuario.textContent = mensaje;
    mensajeNuevoUsuario.hidden = false;
}


function ocultarErrorNuevoUsuario() {
    textoMensajeNuevoUsuario.textContent = "";
    mensajeNuevoUsuario.hidden = true;
}

function editarUsuario(idUsuario) {
    console.log(
        "Editar usuario:",
        idUsuario
    );
}

function abrirModalEstado(
    idUsuario,
    nombre,
    activo
) {
    usuarioEstadoPendiente = {
        id: idUsuario,
        nombre,
        activo
    };

    const accion = activo
        ? "desactivar"
        : "activar";

    modalEstadoMensaje.textContent =
        `¿Estás seguro de que deseas ${accion} al usuario "${nombre}"?`;

    botonConfirmarEstado.textContent =
        activo
            ? "Desactivar usuario"
            : "Activar usuario";

    ocultarErrorModal();

    modalEstadoUsuario.hidden = false;

    botonConfirmarEstado.focus();
}


function cerrarModalEstado() {
    usuarioEstadoPendiente = null;

    ocultarErrorModal();

    modalEstadoUsuario.hidden = true;
}


async function confirmarCambioEstado() {
    if (usuarioEstadoPendiente === null) {
        return;
    }

    const {
        id,
        activo
    } = usuarioEstadoPendiente;

    ocultarErrorModal();

    botonConfirmarEstado.disabled = true;
    botonCancelarEstado.disabled = true;

    try {
        const respuesta = await fetch(
            `/usuarios/${id}/estado`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    activo: !activo
                })
            }
        );

        if (!respuesta.ok) {
            mostrarErrorModal(
                await mensajeDeError(respuesta)
            );

            return;
        }

        cerrarModalEstado();

        await cargarUsuarios();

    } catch {
        mostrarErrorModal(
            "No se pudo contactar al servidor. Intenta de nuevo."
        );

    } finally {
        botonConfirmarEstado.disabled = false;
        botonCancelarEstado.disabled = false;
    }
}

function mostrarCarga() {
    estadoUsuarios.hidden = false;
}


function ocultarCarga() {
    estadoUsuarios.hidden = true;
}


function mostrarError(mensaje) {
    textoMensajeUsuarios.textContent = mensaje;
    mensajeUsuarios.hidden = false;
}


function ocultarMensaje() {
    textoMensajeUsuarios.textContent = "";
    mensajeUsuarios.hidden = true;
}


function mostrarErrorModal(mensaje) {
    textoModalEstadoError.textContent = mensaje;
    modalEstadoError.hidden = false;
}


function ocultarErrorModal() {
    textoModalEstadoError.textContent = "";
    modalEstadoError.hidden = true;
}


async function mensajeDeError(respuesta) {
    try {
        const cuerpo = await respuesta.json();

        if (cuerpo.detail) {
            return cuerpo.detail;
        }

    } catch {
    }


    if (respuesta.status === 400) {
        return "La información proporcionada no es válida.";
    }


    if (respuesta.status === 401) {
        return "La sesión no es válida.";
    }


    if (respuesta.status === 403) {
        return "No tienes autorización para realizar esta acción.";
    }


    if (respuesta.status === 404) {
        return "No se encontró el recurso solicitado.";
    }


    if (respuesta.status === 409) {
        return "No se pudo completar la operación debido a una regla de negocio.";
    }


    if (respuesta.status === 500) {
        return "Ocurrió un error interno del servidor.";
    }


    return "No se pudo completar la solicitud.";
}

function escaparHtml(valor) {
    const elemento = document.createElement("div");

    elemento.textContent = valor ?? "";

    return elemento.innerHTML;
}