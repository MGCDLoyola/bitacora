let usuarioSesion = null;

let usuarios = [];
let usuariosFiltradosActuales = [];
let usuariosSeleccionados = new Set();

let rolesCatalogo = null;

let tablaUsuarios = null;
let checkboxTodos = null;
let estadoUsuarios = null;

let mensajeUsuarios = null;
let textoMensajeUsuarios = null;

let botonNuevoUsuario = null;

let filtroUsuarios = null;
let filtroRol = null;
let filtroEstado = null;

let barraSeleccion = null;
let barraSeleccionTexto = null;
let botonRolMasivo = null;
let botonActivarMasivo = null;
let botonDesactivarMasivo = null;
let botonCancelarSeleccion = null;

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

let idsEstadoPendiente = [];
let activoDestinoPendiente = null;

let modalCambiarRol = null;
let modalRolMensaje = null;
let modalRolSelect = null;
let modalRolError = null;
let textoModalRolError = null;

let botonCancelarRol = null;
let botonConfirmarRol = null;

let idsRolPendiente = [];

export async function iniciar({ usuario, contenedor }) {
    usuarioSesion = usuario;

    tablaUsuarios = contenedor.querySelector("#tabla-usuarios");

    estadoUsuarios = contenedor.querySelector("#estado-usuarios");

    mensajeUsuarios = contenedor.querySelector("#mensaje-usuarios");

    textoMensajeUsuarios = contenedor.querySelector("#texto-mensaje-usuarios");

    botonNuevoUsuario = contenedor.querySelector("#boton-nuevo-usuario");

    filtroUsuarios = contenedor.querySelector("#filtro-usuarios");

    filtroRol = contenedor.querySelector("#filtro-rol");

    filtroEstado = contenedor.querySelector("#filtro-estado");

    barraSeleccion = contenedor.querySelector("#barra-seleccion");

    barraSeleccionTexto = contenedor.querySelector("#barra-seleccion-texto");

    botonRolMasivo = contenedor.querySelector("#boton-rol-masivo");

    botonActivarMasivo = contenedor.querySelector("#boton-activar-masivo");

    botonDesactivarMasivo = contenedor.querySelector(
        "#boton-desactivar-masivo"
    );

    botonCancelarSeleccion = contenedor.querySelector(
        "#boton-cancelar-seleccion"
    );

    modalNuevoUsuario = contenedor.querySelector("#modal-nuevo-usuario");

    formularioNuevoUsuario = contenedor.querySelector("#form-nuevo-usuario");

    nuevoUsuarioNombre = contenedor.querySelector("#nuevo-usuario-nombre");

    nuevoUsuarioCorreo = contenedor.querySelector("#nuevo-usuario-correo");

    nuevoUsuarioRol = contenedor.querySelector("#nuevo-usuario-rol");

    mensajeNuevoUsuario = contenedor.querySelector("#mensaje-nuevo-usuario");

    textoMensajeNuevoUsuario = contenedor.querySelector(
        "#texto-mensaje-nuevo-usuario"
    );

    botonCancelarNuevoUsuario = contenedor.querySelector(
        "#boton-cancelar-nuevo-usuario"
    );

    botonGuardarNuevoUsuario = contenedor.querySelector(
        "#boton-guardar-nuevo-usuario"
    );

    modalEstadoUsuario = contenedor.querySelector("#modal-estado-usuario");

    modalEstadoMensaje = contenedor.querySelector("#modal-estado-mensaje");

    modalEstadoError = contenedor.querySelector("#modal-estado-error");

    textoModalEstadoError = contenedor.querySelector(
        "#texto-modal-estado-error"
    );

    botonCancelarEstado = contenedor.querySelector("#boton-cancelar-estado");

    botonConfirmarEstado = contenedor.querySelector("#boton-confirmar-estado");

    modalCambiarRol = contenedor.querySelector("#modal-cambiar-rol");

    modalRolMensaje = contenedor.querySelector("#modal-rol-mensaje");

    modalRolSelect = contenedor.querySelector("#modal-rol-select");

    modalRolError = contenedor.querySelector("#modal-rol-error");

    textoModalRolError = contenedor.querySelector("#texto-modal-rol-error");

    botonCancelarRol = contenedor.querySelector("#boton-cancelar-rol");

    botonConfirmarRol = contenedor.querySelector("#boton-confirmar-rol");

    configurarVista();

    await cargarUsuarios();
}

function configurarVista() {
    const esAdministrador = usuarioSesion?.rol?.nombre === "Administrador";

    botonNuevoUsuario.hidden = !esAdministrador;

    botonNuevoUsuario.addEventListener("click", abrirNuevoUsuario);

    filtroUsuarios.addEventListener("input", aplicarFiltros);

    filtroRol.addEventListener("change", aplicarFiltros);

    filtroEstado.addEventListener("change", aplicarFiltros);

    formularioNuevoUsuario.addEventListener("submit", crearUsuario);

    botonCancelarNuevoUsuario.addEventListener(
        "click",
        cerrarModalNuevoUsuario
    );

    modalNuevoUsuario
        .querySelectorAll("[data-cerrar-nuevo-usuario]")
        .forEach((elemento) => {
            elemento.addEventListener("click", cerrarModalNuevoUsuario);
        });

    botonCancelarEstado.addEventListener("click", cerrarModalEstado);

    botonConfirmarEstado.addEventListener("click", confirmarCambioEstado);

    modalEstadoUsuario
        .querySelectorAll("[data-cerrar-modal]")
        .forEach((elemento) => {
            elemento.addEventListener("click", cerrarModalEstado);
        });

    botonCancelarRol.addEventListener("click", cerrarModalRol);

    botonConfirmarRol.addEventListener("click", confirmarCambioRol);

    modalCambiarRol
        .querySelectorAll("[data-cerrar-modal-rol]")
        .forEach((elemento) => {
            elemento.addEventListener("click", cerrarModalRol);
        });

    botonCancelarSeleccion.addEventListener("click", cancelarSeleccion);

    botonRolMasivo.addEventListener("click", () =>
        abrirModalRol([...usuariosSeleccionados])
    );

    botonActivarMasivo.addEventListener("click", () =>
        abrirModalEstado([...usuariosSeleccionados], true)
    );

    botonDesactivarMasivo.addEventListener("click", () =>
        abrirModalEstado([...usuariosSeleccionados], false)
    );
}

async function cargarUsuarios() {
    ocultarMensaje();
    mostrarCarga();

    try {
        const respuesta = await fetch("/usuarios", {
            method: "GET",
            credentials: "include",
        });

        if (!respuesta.ok) {
            throw new Error(await mensajeDeError(respuesta));
        }

        usuarios = await respuesta.json();

        cargarOpcionesRol();
        aplicarFiltros();
    } catch (error) {
        mostrarError(error.message || "No se pudieron cargar los usuarios.");
    } finally {
        ocultarCarga();
    }
}

function cargarOpcionesRol() {
    const roles = [
        ...new Map(
            usuarios.map((usuario) => [usuario.rol.id, usuario.rol])
        ).values(),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const valorActual = filtroRol.value;

    filtroRol.innerHTML = `
        <option value="">
            Todos
        </option>

        ${roles
            .map(
                (rol) => `
            <option value="${rol.id}">
                ${escaparHtml(rol.nombre)}
            </option>
        `
            )
            .join("")}
    `;

    const existeValor = roles.some((rol) => String(rol.id) === valorActual);

    filtroRol.value = existeValor ? valorActual : "";
}

function aplicarFiltros() {
    const busqueda = filtroUsuarios.value.trim().toLocaleLowerCase("es-MX");

    const rolSeleccionado = filtroRol.value;

    const estadoSeleccionado = filtroEstado.value;

    const usuariosFiltrados = usuarios.filter((usuario) => {
        const coincideBusqueda =
            !busqueda ||
            usuario.nombre.toLocaleLowerCase("es-MX").includes(busqueda) ||
            usuario.correo.toLocaleLowerCase("es-MX").includes(busqueda);

        const coincideRol =
            !rolSeleccionado || String(usuario.rol.id) === rolSeleccionado;

        const coincideEstado =
            !estadoSeleccionado ||
            (estadoSeleccionado === "activo" && usuario.activo) ||
            (estadoSeleccionado === "inactivo" && !usuario.activo);

        return coincideBusqueda && coincideRol && coincideEstado;
    });

    renderizarUsuarios(usuariosFiltrados);
}

function permisosFila(usuario) {
    const esAdministrador = usuarioSesion?.rol?.nombre === "Administrador";

    const esSupervisor = usuarioSesion?.rol?.nombre === "Supervisor";

    const esUsuarioAdministrador = usuario.rol.nombre === "Administrador";

    const esUnoMismo = usuario.id === usuarioSesion?.id;

    return {
        puedeCambiarRol:
            esAdministrador && (!esUsuarioAdministrador || esUnoMismo),

        puedeCambiarEstado:
            (esAdministrador || esSupervisor) && !esUsuarioAdministrador,
    };
}

function usuarioEsSeleccionable(usuario) {
    const { puedeCambiarRol, puedeCambiarEstado } = permisosFila(usuario);

    return puedeCambiarRol || puedeCambiarEstado;
}

function renderizarUsuarios(usuariosFiltrados) {
    usuariosFiltradosActuales = usuariosFiltrados;

    if (usuariosFiltrados.length === 0) {
        tablaUsuarios.innerHTML = `
            <div class="tabla-vacia">
                <p class="u-cuerpo u-texto-terciario">
                    No hay usuarios que coincidan con los filtros.
                </p>
            </div>
        `;

        checkboxTodos = null;

        actualizarBarraAcciones();

        return;
    }

    const filas = usuariosFiltrados
        .map((usuario) => crearFilaUsuario(usuario))
        .join("");

    tablaUsuarios.innerHTML = `
        <table class="tabla">
            <thead>
                <tr>
                    <th class="tabla__columna-checkbox">
                        <input
                            type="checkbox"
                            id="checkbox-todos"
                            class="tabla__checkbox"
                        >
                    </th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Firma</th>
                    <th class="tabla__columna-acciones">
                    </th>
                </tr>
            </thead>

            <tbody>
                ${filas}
            </tbody>
        </table>
    `;

    configurarAcciones();

    actualizarBarraAcciones();
}

function crearFilaUsuario(usuario) {
    const estado = usuario.activo ? "Activo" : "Inactivo";

    const claseEstado = usuario.activo
        ? "tabla__estado--activo"
        : "tabla__estado--inactivo";

    const firma = usuario.firma ? "Sí" : "No";

    const { puedeCambiarRol, puedeCambiarEstado } = permisosFila(usuario);

    const accionEstado = usuario.activo ? "Desactivar" : "Activar";

    const botones = [];

    if (puedeCambiarRol) {
        botones.push(`
            <button
                type="button"
                class="tabla__accion"
                data-accion="rol"
                data-id="${usuario.id}"
            >
                Cambiar rol
            </button>
        `);
    }

    if (puedeCambiarEstado) {
        botones.push(`
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
        `);
    }

    const acciones = botones.length
        ? `
            <div class="tabla__acciones-grupo">
                ${botones.join("")}
            </div>
        `
        : "";

    const checkbox = usuarioEsSeleccionable(usuario)
        ? `
            <input
                type="checkbox"
                class="tabla__checkbox"
                data-checkbox-usuario
                data-id="${usuario.id}"
                ${usuariosSeleccionados.has(usuario.id) ? "checked" : ""}
            >
        `
        : "";

    return `
        <tr>
            <td class="tabla__columna-checkbox">
                ${checkbox}
            </td>

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
    checkboxTodos = tablaUsuarios.querySelector("#checkbox-todos");

    if (checkboxTodos) {
        checkboxTodos.addEventListener("change", manejarCheckboxTodos);
    }

    tablaUsuarios.querySelectorAll("[data-accion]").forEach((boton) => {
        boton.addEventListener("click", manejarAccion);
    });

    tablaUsuarios
        .querySelectorAll("[data-checkbox-usuario]")
        .forEach((checkbox) => {
            checkbox.addEventListener("change", manejarCheckboxUsuario);
        });

    actualizarCheckboxTodos();
}

function manejarAccion(event) {
    const boton = event.currentTarget;
    const accion = boton.dataset.accion;
    const idUsuario = Number(boton.dataset.id);

    if (accion === "rol") {
        abrirModalRol([idUsuario]);
        return;
    }

    if (accion === "estado") {
        const activo = boton.dataset.activo === "true";

        const nombre = boton.dataset.nombre;

        abrirModalEstado([idUsuario], !activo, nombre);
    }
}

function manejarCheckboxUsuario(event) {
    const checkbox = event.currentTarget;
    const id = Number(checkbox.dataset.id);

    if (checkbox.checked) {
        usuariosSeleccionados.add(id);
    } else {
        usuariosSeleccionados.delete(id);
    }

    actualizarCheckboxTodos();
    actualizarBarraAcciones();
}

function manejarCheckboxTodos(event) {
    const marcar = event.currentTarget.checked;

    usuariosFiltradosActuales
        .filter(usuarioEsSeleccionable)
        .forEach((usuario) => {
            if (marcar) {
                usuariosSeleccionados.add(usuario.id);
            } else {
                usuariosSeleccionados.delete(usuario.id);
            }
        });

    renderizarUsuarios(usuariosFiltradosActuales);
}

function actualizarCheckboxTodos() {
    if (!checkboxTodos) {
        return;
    }

    const seleccionables = usuariosFiltradosActuales.filter(
        usuarioEsSeleccionable
    );

    if (seleccionables.length === 0) {
        checkboxTodos.checked = false;
        checkboxTodos.indeterminate = false;
        checkboxTodos.disabled = true;

        return;
    }

    checkboxTodos.disabled = false;

    const seleccionadosVisibles = seleccionables.filter((usuario) =>
        usuariosSeleccionados.has(usuario.id)
    );

    checkboxTodos.checked =
        seleccionadosVisibles.length === seleccionables.length;

    checkboxTodos.indeterminate =
        seleccionadosVisibles.length > 0 &&
        seleccionadosVisibles.length < seleccionables.length;
}

function actualizarBarraAcciones() {
    const cantidad = usuariosSeleccionados.size;

    barraSeleccion.hidden = cantidad === 0;

    if (cantidad === 0) {
        return;
    }

    barraSeleccionTexto.textContent =
        cantidad === 1
            ? "1 usuario seleccionado"
            : `${cantidad} usuarios seleccionados`;

    const esAdministrador = usuarioSesion?.rol?.nombre === "Administrador";

    const esSupervisor = usuarioSesion?.rol?.nombre === "Supervisor";

    botonRolMasivo.hidden = !esAdministrador;
    botonActivarMasivo.hidden = !(esAdministrador || esSupervisor);
    botonDesactivarMasivo.hidden = !(esAdministrador || esSupervisor);
}

function cancelarSeleccion() {
    usuariosSeleccionados.clear();

    renderizarUsuarios(usuariosFiltradosActuales);
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
        const roles = await obtenerCatalogoRoles();

        poblarSelectRoles(nuevoUsuarioRol, roles);

        nuevoUsuarioRol.disabled = false;

        nuevoUsuarioRol.focus();
    } catch (error) {
        mostrarErrorNuevoUsuario(
            error.message || "No se pudieron cargar los roles."
        );
    }
}

async function obtenerCatalogoRoles() {
    if (rolesCatalogo) {
        return rolesCatalogo;
    }

    const respuesta = await fetch("/roles/", {
        method: "GET",
        credentials: "include",
    });

    if (!respuesta.ok) {
        throw new Error(await mensajeDeError(respuesta));
    }

    rolesCatalogo = await respuesta.json();

    return rolesCatalogo;
}

function poblarSelectRoles(select, roles, incluirPlaceholder = true) {
    select.innerHTML = `
        ${
            incluirPlaceholder
                ? `
            <option value="">
                Selecciona un rol
            </option>
        `
                : ""
        }

        ${roles
            .map(
                (rol) => `
            <option value="${rol.id}">
                ${escaparHtml(rol.nombre)}
            </option>
        `
            )
            .join("")}
    `;
}

function cerrarModalNuevoUsuario() {
    modalNuevoUsuario.hidden = true;

    formularioNuevoUsuario.reset();

    ocultarErrorNuevoUsuario();
}

async function crearUsuario(event) {
    event.preventDefault();

    ocultarErrorNuevoUsuario();

    const nombre = nuevoUsuarioNombre.value.trim();

    const correo = nuevoUsuarioCorreo.value.trim();

    const idRol = nuevoUsuarioRol.value;

    if (!nombre) {
        mostrarErrorNuevoUsuario("Ingresa el nombre completo.");

        nuevoUsuarioNombre.focus();

        return;
    }

    if (!correo) {
        mostrarErrorNuevoUsuario("Ingresa el correo.");

        nuevoUsuarioCorreo.focus();

        return;
    }

    if (!idRol) {
        mostrarErrorNuevoUsuario("Selecciona un rol.");

        nuevoUsuarioRol.focus();

        return;
    }

    setCargandoNuevoUsuario(true);

    try {
        const respuesta = await fetch("/usuarios", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                nombre,
                correo,
                id_rol: Number(idRol),
                activo: true,
            }),
        });

        if (!respuesta.ok) {
            mostrarErrorNuevoUsuario(await mensajeDeError(respuesta));

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

    botonGuardarNuevoUsuario.textContent = cargando
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

function abrirModalRol(ids) {
    idsRolPendiente = ids;

    ocultarErrorModalRol();

    modalRolMensaje.textContent =
        ids.length === 1
            ? "Selecciona el nuevo rol para este usuario."
            : `Selecciona el nuevo rol para los ${ids.length} usuarios seleccionados.`;

    modalRolSelect.innerHTML = `
        <option value="">
            Cargando roles...
        </option>
    `;

    modalRolSelect.disabled = true;

    modalCambiarRol.hidden = false;

    cargarRolesModal(ids);
}

async function cargarRolesModal(ids) {
    try {
        const roles = await obtenerCatalogoRoles();

        poblarSelectRoles(modalRolSelect, roles, true);

        if (ids.length === 1) {
            const usuario = usuarios.find((usuario) => usuario.id === ids[0]);

            if (usuario) {
                modalRolSelect.value = String(usuario.rol.id);
            }
        }

        modalRolSelect.disabled = false;

        modalRolSelect.focus();
    } catch (error) {
        mostrarErrorModalRol(
            error.message || "No se pudieron cargar los roles."
        );
    }
}

function cerrarModalRol() {
    idsRolPendiente = [];

    ocultarErrorModalRol();

    modalCambiarRol.hidden = true;
}

async function confirmarCambioRol() {
    if (idsRolPendiente.length === 0) {
        return;
    }

    const idRol = modalRolSelect.value;

    if (!idRol) {
        mostrarErrorModalRol("Selecciona un rol.");

        return;
    }

    ocultarErrorModalRol();

    botonConfirmarRol.disabled = true;
    botonCancelarRol.disabled = true;

    try {
        const respuesta =
            idsRolPendiente.length === 1
                ? await fetch(`/usuarios/${idsRolPendiente[0]}`, {
                      method: "PATCH",
                      headers: {
                          "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                          id_rol: Number(idRol),
                      }),
                  })
                : await fetch("/usuarios/rol-masivo", {
                      method: "PATCH",
                      headers: {
                          "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                          ids: idsRolPendiente,
                          id_rol: Number(idRol),
                      }),
                  });

        if (!respuesta.ok) {
            mostrarErrorModalRol(await mensajeDeError(respuesta));

            return;
        }

        usuariosSeleccionados.clear();

        cerrarModalRol();

        await cargarUsuarios();
    } catch {
        mostrarErrorModalRol(
            "No se pudo contactar al servidor. Intenta de nuevo."
        );
    } finally {
        botonConfirmarRol.disabled = false;
        botonCancelarRol.disabled = false;
    }
}

function mostrarErrorModalRol(mensaje) {
    textoModalRolError.textContent = mensaje;
    modalRolError.hidden = false;
}

function ocultarErrorModalRol() {
    textoModalRolError.textContent = "";
    modalRolError.hidden = true;
}

function abrirModalEstado(ids, activoDestino, nombre = null) {
    idsEstadoPendiente = ids;
    activoDestinoPendiente = activoDestino;

    const accionTexto = activoDestino ? "activar" : "desactivar";

    modalEstadoMensaje.textContent =
        ids.length === 1
            ? `¿Estás seguro de que deseas ${accionTexto} al usuario "${nombre}"?`
            : `¿Estás seguro de que deseas ${accionTexto} a los ${ids.length} usuarios seleccionados?`;

    botonConfirmarEstado.textContent = activoDestino ? "Activar" : "Desactivar";

    ocultarErrorModal();

    modalEstadoUsuario.hidden = false;

    botonConfirmarEstado.focus();
}

function cerrarModalEstado() {
    idsEstadoPendiente = [];
    activoDestinoPendiente = null;

    ocultarErrorModal();

    modalEstadoUsuario.hidden = true;
}

async function confirmarCambioEstado() {
    if (idsEstadoPendiente.length === 0) {
        return;
    }

    const ids = idsEstadoPendiente;
    const activo = activoDestinoPendiente;

    ocultarErrorModal();

    botonConfirmarEstado.disabled = true;
    botonCancelarEstado.disabled = true;

    try {
        const respuesta =
            ids.length === 1
                ? await fetch(`/usuarios/${ids[0]}/estado`, {
                      method: "PATCH",
                      headers: {
                          "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                          activo,
                      }),
                  })
                : await fetch("/usuarios/estado-masivo", {
                      method: "PATCH",
                      headers: {
                          "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                          ids,
                          activo,
                      }),
                  });

        if (!respuesta.ok) {
            mostrarErrorModal(await mensajeDeError(respuesta));

            return;
        }

        usuariosSeleccionados.clear();

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
    } catch {}

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
