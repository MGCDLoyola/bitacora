let usuarioSesion = null;

let seccionActual = null;

let estadoExpedientes = null;
let mensajeExpedientes = null;
let textoMensajeExpedientes = null;

let contenedorDelDia = null;
let contenedorActivos = null;
let contenedorDesfasados = null;
let contenedorConsolidacion = null;

let filtroExpedientes = null;

let datosExpedientes = {
    "del-dia": [],
    "activos": [],
    "desfasados": [],
    "consolidacion": []
};

let filtrosExpedientes = {
    "del-dia": "",
    "desfasados": "",
    "consolidacion": "",
    "activos": ""
};


/* ─────────────────────────────────────────────
   SELECCIÓN DE EXPEDIENTES ACTIVOS
   ───────────────────────────────────────────── */

let expedientesActivosFiltradosActuales = [];
let expedientesActivosSeleccionados = new Set();

let checkboxTodosActivos = null;

let barraSeleccionExpedientes = null;
let barraSeleccionExpedientesTexto = null;

let botonReasignarExpedientes = null;
let botonCancelarSeleccionExpedientes = null;
let botonEliminarExpedientes = null;


/* ─────────────────────────────────────────────
   MODAL ASIGNAR
   ───────────────────────────────────────────── */

let modalAsignarExpedientes = null;
let modalAsignarMensaje = null;
let modalAsignarError = null;
let textoModalAsignarError = null;

let selectAsignarExpediente = null;

let botonCancelarAsignarExpedientes = null;
let botonConfirmarAsignarExpedientes = null;

let idsAsignarPendientes = [];


/* ─────────────────────────────────────────────
   MODAL ELIMINAR EXPEDIENTES
   ───────────────────────────────────────────── */

let modalEliminarExpedientes = null;
let modalEliminarExpedientesMensaje = null;
let modalEliminarExpedientesError = null;
let textoModalEliminarExpedientesError = null;

let botonCancelarEliminarExpedientes = null;
let botonConfirmarEliminarExpedientes = null;

let idsEliminarExpedientesPendientes = [];


/* ─────────────────────────────────────────────
   ENDPOINTS
   ───────────────────────────────────────────── */

const ENDPOINTS_EXPEDIENTES = {

    asignar:
        "/expedientes/asignar-masivo",

};

function endpointResumenEliminacionExpediente(
    idExpediente
) {

    return `/expedientes/${idExpediente}/resumen-eliminacion`;
}

function endpointEliminarExpediente(
    idExpediente
) {

    return `/expedientes/${idExpediente}`;
}


/* ─────────────────────────────────────────────
   INICIO
   ───────────────────────────────────────────── */

export async function iniciar({ usuario, contenedor }) {

    usuarioSesion = usuario;

    estadoExpedientes = contenedor.querySelector(
        "#estado-gestiones"
    );

    mensajeExpedientes = contenedor.querySelector(
        "#mensaje-gestiones"
    );

    textoMensajeExpedientes = contenedor.querySelector(
        "#texto-mensaje-gestiones"
    );

    contenedorDelDia = contenedor.querySelector(
        "#gestiones-del-dia"
    );

    contenedorActivos = contenedor.querySelector(
        "#gestiones-activos"
    );

    contenedorDesfasados = contenedor.querySelector(
        "#gestiones-desfasados"
    );

    contenedorConsolidacion = contenedor.querySelector(
        "#gestiones-consolidacion"
    );

    filtroExpedientes = contenedor.querySelector(
        "#filtro-gestiones"
    );


    crearInterfazSeleccion();


    configurarVistaPorRol(contenedor);

    configurarNavegacion(contenedor);

    configurarFiltro();

    configurarAccionesSeleccion();


    await cargarResumen();

    await cargarSeccion(seccionActual);
}


/* ─────────────────────────────────────────────
   INTERFAZ DE SELECCIÓN
   ───────────────────────────────────────────── */

function puedeSeleccionarActivos() {

    const rol =
        usuarioSesion?.rol?.nombre;

    return (
        rol === "Administrador" ||
        rol === "Supervisor"
    );
}


function crearInterfazSeleccion() {

    if (!puedeSeleccionarActivos()) {
        return;
    }

    const seccionActivos =
        document.querySelector(
            "#seccion-activos"
        );

    if (!seccionActivos) {
        return;
    }


    if (
        !document.querySelector(
            "#barra-seleccion-gestiones"
        )
    ) {

        const barra =
            document.createElement("div");

        barra.id =
            "barra-seleccion-gestiones";

        barra.className =
            "barra-seleccion";

        barra.hidden = true;

        barra.innerHTML = `
            <div class="barra-seleccion__marca">

                <span
                    class="barra-seleccion__punto"
                    aria-hidden="true"
                ></span>

                <span
                    id="barra-seleccion-gestiones-texto"
                    class="barra-seleccion__texto u-etiqueta"
                >
                    0 expedientes seleccionados
                </span>

            </div>


            <div class="barra-seleccion__acciones">

                <button
                    type="button"
                    id="boton-reasignar-expedientes"
                    class="barra-seleccion__accion"
                >
                    Asignar
                </button>

                <button
                    type="button"
                    id="boton-eliminar-expedientes"
                    class="barra-seleccion__accion barra-seleccion__accion--desactivar"
                >
                    Eliminar expedientes
                </button>

                <button
                    type="button"
                    id="boton-cancelar-seleccion-expedientes"
                    class="barra-seleccion__cancelar"
                >
                    Cancelar
                </button>

            </div>
        `;


        seccionActivos.insertBefore(
            barra,
            seccionActivos.querySelector(
                ".tabla-contenedor"
            )
        );
    }


    barraSeleccionExpedientes =
        document.querySelector(
            "#barra-seleccion-gestiones"
        );

    barraSeleccionExpedientesTexto =
        document.querySelector(
            "#barra-seleccion-gestiones-texto"
        );

    botonReasignarExpedientes =
        document.querySelector(
            "#boton-reasignar-expedientes"
        );

    botonEliminarExpedientes =
        document.querySelector(
            "#boton-eliminar-expedientes"
        );

    botonCancelarSeleccionExpedientes =
        document.querySelector(
            "#boton-cancelar-seleccion-expedientes"
        );
}


/* ─────────────────────────────────────────────
   MODALES
   ───────────────────────────────────────────── */

function crearModales() {

    crearModalAsignar();

    crearModalEliminarExpedientes();
}


/* ─────────────────────────────────────────────
   MODAL ASIGNAR EXPEDIENTES
   ───────────────────────────────────────────── */

function crearModalAsignar() {

    if (
        document.querySelector(
            "#modal-reasignar-gestion"
        )
    ) {
        modalAsignarExpedientes =
            document.querySelector(
                "#modal-reasignar-gestion"
            );

        modalAsignarMensaje =
            modalAsignarExpedientes.querySelector(
                "#modal-reasignar-mensaje"
            );

        modalAsignarError =
            modalAsignarExpedientes.querySelector(
                "#modal-reasignar-error"
            );

        textoModalAsignarError =
            modalAsignarExpedientes.querySelector(
                "#texto-modal-reasignar-error"
            );

        selectAsignarExpediente =
            modalAsignarExpedientes.querySelector(
                "#select-reasignar-gestion"
            );

        botonCancelarAsignarExpedientes =
            modalAsignarExpedientes.querySelector(
                "#boton-cancelar-reasignar"
            );

        botonConfirmarAsignarExpedientes =
            modalAsignarExpedientes.querySelector(
                "#boton-confirmar-reasignar"
            );

        return;
    }


    const modal =
        document.createElement("div");

    modal.id =
        "modal-reasignar-gestion";

    modal.className = "modal";

    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="modal__fondo"
            data-cerrar-asignar-expedientes
        ></div>

        <div
            class="modal__contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-asignar-expedientes"
        >

            <div class="modal__encabezado">

                <h3
                    id="titulo-modal-asignar-expedientes"
                    class="modal__titulo u-titulo"
                >
                    Asignar expedientes
                </h3>

            </div>


            <div class="modal__cuerpo">

                <p
                    id="modal-reasignar-mensaje"
                    class="u-cuerpo u-texto-secundario"
                >
                    Selecciona el nuevo responsable.
                </p>


                <div class="campo">

                    <label
                        for="select-reasignar-gestion"
                        class="u-etiqueta u-texto-terciario"
                    >
                        Responsable
                    </label>

                    <select id="select-reasignar-gestion">
                        <option value="">
                            Cargando usuarios...
                        </option>
                    </select>

                </div>


                <div
                    id="modal-reasignar-error"
                    class="mensaje-error modal__error"
                    role="alert"
                    hidden
                >
                    <span class="mensaje-error__sello">
                        Error
                    </span>

                    <span
                        id="texto-modal-reasignar-error"
                    ></span>
                </div>

            </div>


            <div class="modal__acciones">

                <button
                    type="button"
                    id="boton-cancelar-reasignar"
                    class="boton boton--secundario u-boton-texto"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    id="boton-confirmar-reasignar"
                    class="boton u-boton-texto"
                >
                    Asignar
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(modal);


    modalAsignarExpedientes = modal;

    modalAsignarMensaje =
        modal.querySelector(
            "#modal-reasignar-mensaje"
        );

    modalAsignarError =
        modal.querySelector(
            "#modal-reasignar-error"
        );

    textoModalAsignarError =
        modal.querySelector(
            "#texto-modal-reasignar-error"
        );

    selectAsignarExpediente =
        modal.querySelector(
            "#select-reasignar-gestion"
        );

    botonCancelarAsignarExpedientes =
        modal.querySelector(
            "#boton-cancelar-reasignar"
        );

    botonConfirmarAsignarExpedientes =
        modal.querySelector(
            "#boton-confirmar-reasignar"
        );


    botonCancelarAsignarExpedientes.addEventListener(
        "click",
        cerrarModalAsignarExpedientes
    );


    modal
        .querySelectorAll(
            "[data-cerrar-asignar-expedientes]"
        )
        .forEach((elemento) => {

            elemento.addEventListener(
                "click",
                cerrarModalAsignarExpedientes
            );

        });


    botonConfirmarAsignarExpedientes.addEventListener(
        "click",
        confirmarAsignacionExpedientes
    );
}


/* ─────────────────────────────────────────────
   MODAL ELIMINAR EXPEDIENTES
   ───────────────────────────────────────────── */

function crearModalEliminarExpedientes() {

    if (
        document.querySelector(
            "#modal-eliminar-expediente"
        )
    ) {
        modalEliminarExpedientes =
            document.querySelector(
                "#modal-eliminar-expediente"
            );

        modalEliminarExpedientesMensaje =
            modalEliminarExpedientes.querySelector(
                "#modal-eliminar-expediente-mensaje"
            );

        modalEliminarExpedientesError =
            modalEliminarExpedientes.querySelector(
                "#modal-eliminar-expediente-error"
            );

        textoModalEliminarExpedientesError =
            modalEliminarExpedientes.querySelector(
                "#texto-modal-eliminar-expediente-error"
            );

        botonCancelarEliminarExpedientes =
            modalEliminarExpedientes.querySelector(
                "#boton-cancelar-eliminar-expediente"
            );

        botonConfirmarEliminarExpedientes =
            modalEliminarExpedientes.querySelector(
                "#boton-confirmar-eliminar-expediente"
            );

        return;
    }


    const modal =
        document.createElement("div");

    modal.id =
        "modal-eliminar-expediente";

    modal.className = "modal";

    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="modal__fondo"
            data-cerrar-eliminar-expedientes
        ></div>

        <div
            class="modal__contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-eliminar-expedientes"
        >

            <div class="modal__encabezado">

                <h3
                    id="titulo-modal-eliminar-expedientes"
                    class="modal__titulo u-titulo"
                >
                    Eliminar expedientes
                </h3>

            </div>


            <div class="modal__cuerpo">

                <p
                    id="modal-eliminar-expediente-mensaje"
                    class="u-cuerpo u-texto-secundario"
                >
                </p>


                <div
                    id="modal-eliminar-expediente-error"
                    class="mensaje-error modal__error"
                    role="alert"
                    hidden
                >
                    <span class="mensaje-error__sello">
                        Error
                    </span>

                    <span
                        id="texto-modal-eliminar-expediente-error"
                    ></span>
                </div>

            </div>


            <div class="modal__acciones">

                <button
                    type="button"
                    id="boton-cancelar-eliminar-expediente"
                    class="boton boton--secundario u-boton-texto"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    id="boton-confirmar-eliminar-expediente"
                    class="boton u-boton-texto"
                >
                    Eliminar
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(modal);


    modalEliminarExpedientes = modal;

    modalEliminarExpedientesMensaje =
        modal.querySelector(
            "#modal-eliminar-expediente-mensaje"
        );

    modalEliminarExpedientesError =
        modal.querySelector(
            "#modal-eliminar-expediente-error"
        );

    textoModalEliminarExpedientesError =
        modal.querySelector(
            "#texto-modal-eliminar-expediente-error"
        );

    botonCancelarEliminarExpedientes =
        modal.querySelector(
            "#boton-cancelar-eliminar-expediente"
        );

    botonConfirmarEliminarExpedientes =
        modal.querySelector(
            "#boton-confirmar-eliminar-expediente"
        );


    botonCancelarEliminarExpedientes.addEventListener(
        "click",
        cerrarModalEliminarExpedientes
    );


    modal
        .querySelectorAll(
            "[data-cerrar-eliminar-expedientes]"
        )
        .forEach((elemento) => {

            elemento.addEventListener(
                "click",
                cerrarModalEliminarExpedientes
            );

        });


    botonConfirmarEliminarExpedientes.addEventListener(
        "click",
        confirmarEliminacionExpedientes
    );
}


/* ─────────────────────────────────────────────
   CONFIGURACIÓN DE VISTA
   ───────────────────────────────────────────── */

function configurarVistaPorRol(contenedor) {

    const rol =
        usuarioSesion?.rol?.nombre;

    const configuracion = {

        "Administrador": [
            "activos",
            "del-dia",
            "desfasados",
            "consolidacion"
        ],

        "Supervisor": [
            "activos",
            "del-dia",
            "desfasados",
            "consolidacion"
        ],

        "Cobranza": [
            "del-dia",
            "desfasados",
            "consolidacion",
            "activos"
        ],

        "Visualizador": [
            "activos"
        ]

    };


    const seccionesPermitidas =
        configuracion[rol] ?? [];


    seccionActual =
        seccionesPermitidas[0] ?? null;


    const navegacion =
        contenedor.querySelector(
            ".vista-gestiones__navegacion"
        );


    const botones =
        [
            ...navegacion.querySelectorAll(
                "[data-seccion]"
            )
        ];


    botones.forEach((boton) => {

        const seccion =
            boton.dataset.seccion;

        boton.hidden =
            !seccionesPermitidas.includes(
                seccion
            );

    });


    seccionesPermitidas.forEach(
        (seccion) => {

            const boton =
                botones.find(
                    (elemento) =>
                        elemento.dataset.seccion ===
                        seccion
                );

            if (boton) {
                navegacion.appendChild(boton);
            }

        }
    );


    actualizarPestanas();
    actualizarContenedores();
    actualizarFiltro();
}


/* ─────────────────────────────────────────────
   NAVEGACIÓN
   ───────────────────────────────────────────── */

function configurarNavegacion(contenedor) {

    contenedor
        .querySelectorAll("[data-seccion]")
        .forEach((boton) => {

            boton.addEventListener(
                "click",
                () => {

                    const seccion =
                        boton.dataset.seccion;

                    cambiarSeccion(seccion);

                }
            );

        });
}


function configurarFiltro() {

    filtroExpedientes.addEventListener(
        "input",
        () => {

            filtrosExpedientes[seccionActual] =
                filtroExpedientes.value;

            filtrarSeccionActual();

        }
    );
}


function configurarAccionesSeleccion() {

    if (botonReasignarExpedientes) {

        botonReasignarExpedientes.addEventListener(
            "click",
            () => {

                abrirModalAsignarExpedientes(
                    [
                        ...expedientesActivosSeleccionados
                    ]
                );

            }
        );

    }


    if (botonEliminarExpedientes) {

        botonEliminarExpedientes.addEventListener(
            "click",
            () => {

                abrirModalEliminarExpedientes(
                    [
                        ...expedientesActivosSeleccionados
                    ]
                );

            }
        );

    }


    if (botonCancelarSeleccionExpedientes) {

        botonCancelarSeleccionExpedientes.addEventListener(
            "click",
            cancelarSeleccionExpedientes
        );

    }


    crearModales();
}


/* ─────────────────────────────────────────────
   FILTRO
   ───────────────────────────────────────────── */

function filtrarSeccionActual() {

    const texto =
        filtrosExpedientes[seccionActual]
            .trim()
            .toLowerCase();


    const datos =
        datosExpedientes[seccionActual];


    if (!texto) {

        renderizarSeccion(
            seccionActual,
            datos
        );

        return;
    }


    const filtrados =
        datos.filter(
            (expediente) => {

                const nombre =
                    String(
                        expediente.nombre_cliente ?? ""
                    ).toLowerCase();


                const interlocutor =
                    String(
                        expediente.interlocutor ?? ""
                    ).toLowerCase();


                const contrato =
                    String(
                        expediente.contrato ?? ""
                    ).toLowerCase();


                const responsable =
                    String(
                        expediente.usuario ?? ""
                    ).toLowerCase();


                return (
                    nombre.includes(texto) ||
                    interlocutor.includes(texto) ||
                    contrato.includes(texto) ||
                    (
                        seccionActual === "activos" &&
                        responsable.includes(texto)
                    )
                );

            }
        );


    renderizarSeccion(
        seccionActual,
        filtrados
    );
}


/* ─────────────────────────────────────────────
   RESUMEN
   ───────────────────────────────────────────── */

async function cargarResumen() {

    const respuesta =
        await fetch(
            "/expedientes/gestiones/resumen",
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


    const resumen =
        await respuesta.json();


    actualizarContadores(resumen);
}


function actualizarContadores(resumen) {

    document
        .querySelectorAll("[data-seccion]")
        .forEach((boton) => {

            const seccion =
                boton.dataset.seccion;

            const cantidad =
                resumen[seccion] ?? 0;


            let contador =
                boton.querySelector(
                    ".vista-gestiones__contador"
                );


            if (!contador) {

                contador =
                    document.createElement(
                        "span"
                    );

                contador.className =
                    "vista-gestiones__contador";

                boton.appendChild(
                    contador
                );

            }


            contador.textContent =
                cantidad;

        });
}


/* ─────────────────────────────────────────────
   CAMBIAR SECCIÓN
   ───────────────────────────────────────────── */

async function cambiarSeccion(seccion) {

    const rol =
        usuarioSesion?.rol?.nombre;


    const seccionesPermitidas = {

        "Administrador": [
            "activos",
            "del-dia",
            "desfasados",
            "consolidacion"
        ],

        "Supervisor": [
            "activos",
            "del-dia",
            "desfasados",
            "consolidacion"
        ],

        "Cobranza": [
            "del-dia",
            "desfasados",
            "consolidacion",
            "activos"
        ],

        "Visualizador": [
            "activos"
        ]

    };


    if (
        !seccionesPermitidas[rol]?.includes(
            seccion
        )
    ) {
        return;
    }


    seccionActual =
        seccion;


    actualizarPestanas();
    actualizarContenedores();
    actualizarFiltro();


    await cargarSeccion(
        seccion
    );
}


/* ─────────────────────────────────────────────
   FILTRO UI
   ───────────────────────────────────────────── */

function actualizarFiltro() {

    filtroExpedientes.hidden = false;


    filtroExpedientes.value =
        filtrosExpedientes[
            seccionActual
        ] ?? "";


    filtroExpedientes.placeholder =
        seccionActual === "activos"
            ? "Buscar por nombre, interlocutor, contrato o responsable..."
            : "Buscar por nombre, interlocutor o contrato...";
}


/* ─────────────────────────────────────────────
   PESTAÑAS
   ───────────────────────────────────────────── */

function actualizarPestanas() {

    document
        .querySelectorAll("[data-seccion]")
        .forEach((boton) => {

            boton.classList.toggle(
                "vista-gestiones__tab--activo",
                boton.dataset.seccion ===
                seccionActual
            );

        });
}


function actualizarContenedores() {

    document
        .querySelectorAll(
            "[data-seccion-contenido]"
        )
        .forEach((seccion) => {

            seccion.hidden =
                seccion.dataset.seccionContenido !==
                seccionActual;

        });
}


/* ─────────────────────────────────────────────
   CARGA
   ───────────────────────────────────────────── */

async function cargarSeccion(seccion) {

    ocultarMensaje();
    mostrarCarga();


    try {

        const datos =
            await obtenerExpedientes(
                seccion
            );


        datosExpedientes[seccion] =
            datos;


        if (seccion === "activos") {

            const idsActuales =
                new Set(
                    datos.map(
                        (expediente) =>
                            expediente.id
                    )
                );


            expedientesActivosSeleccionados =
                new Set(
                    [
                        ...expedientesActivosSeleccionados
                    ].filter(
                        (id) =>
                            idsActuales.has(id)
                    )
                );

        }


        renderizarSeccion(
            seccion,
            datos
        );


    } catch (error) {

        mostrarError(
            error.message ||
            "No se pudieron cargar los expedientes."
        );

    } finally {

        ocultarCarga();

    }
}


async function obtenerExpedientes(seccion) {

    const endpoints = {

        "del-dia":
            "/expedientes/gestiones/del-dia",

        "activos":
            "/expedientes/gestiones/activos",

        "desfasados":
            "/expedientes/gestiones/desfasados",

        "consolidacion":
            "/expedientes/gestiones/consolidacion"

    };


    const endpoint =
        endpoints[seccion];


    if (!endpoint) {

        throw new Error(
            "La sección solicitada no es válida."
        );

    }


    const respuesta =
        await fetch(
            endpoint,
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


    return await respuesta.json();
}


/* ─────────────────────────────────────────────
   RENDERIZADO
   ───────────────────────────────────────────── */

function renderizarSeccion(
    seccion,
    datos
) {

    if (seccion === "del-dia") {

        renderizarTarjetas(
            contenedorDelDia,
            datos,
            "No hay gestiones para hoy."
        );

        return;
    }


    if (seccion === "desfasados") {

        renderizarTarjetas(
            contenedorDesfasados,
            datos,
            "No hay gestiones desfasadas."
        );

        return;
    }


    if (seccion === "consolidacion") {

        renderizarTarjetas(
            contenedorConsolidacion,
            datos,
            "No hay expedientes pendientes de consolidación."
        );

        return;
    }


    if (seccion === "activos") {

        expedientesActivosFiltradosActuales =
            datos;

        renderizarActivos(
            datos
        );

    }
}


/* ─────────────────────────────────────────────
   TARJETAS
   ───────────────────────────────────────────── */

function renderizarTarjetas(
    contenedor,
    datos,
    mensajeVacio
) {

    if (datos.length === 0) {

        contenedor.innerHTML = `
            <div class="gestiones-vacio">
                <p class="u-cuerpo u-texto-terciario">
                    ${mensajeVacio}
                </p>
            </div>
        `;

        return;
    }


    contenedor.innerHTML =
        datos
            .map(
                (expediente) =>
                    crearTarjetaExpediente(
                        expediente
                    )
            )
            .join("");
}


function crearTarjetaExpediente(
    expediente
) {

    const monto =
        formatearMonto(
            expediente.monto_vencido
        );


    const contrato =
        expediente.contrato
            ? escaparHtml(
                expediente.contrato
            )
            : "Sin contrato";


    return `
        <article
            class="gestion-card"
            data-id="${expediente.id}"
        >

            <div class="gestion-card__encabezado">

                <div>

                    <h3 class="gestion-card__cliente">
                        ${escaparHtml(
                            expediente.nombre_cliente
                        )}
                    </h3>

                    <span class="gestion-card__interlocutor u-mono-sm">
                        ${escaparHtml(
                            expediente.interlocutor
                        )}
                    </span>

                </div>


                <div class="gestion-card__id">

                    <span class="u-mono-sm">
                        #${expediente.id}
                    </span>

                    <div class="gestion-card__acciones">

                        <button
                            type="button"
                            class="boton u-boton-texto gestion-card__boton"
                            data-accion="abrir"
                            data-id="${expediente.id}"
                        >
                            Abrir expediente
                        </button>

                    </div>

                </div>

            </div>


            <div class="gestion-card__datos">

                <div class="gestion-card__dato">

                    <span class="u-etiqueta u-texto-terciario">
                        Contrato
                    </span>

                    <span class="u-cuerpo">
                        ${contrato}
                    </span>

                </div>


                <div class="gestion-card__dato">

                    <span class="u-etiqueta u-texto-terciario">
                        Vencido
                    </span>

                    <span class="u-cuerpo">
                        ${monto}
                    </span>

                </div>


                <div class="gestion-card__dato">

                    <span class="u-etiqueta u-texto-terciario">
                        Día
                    </span>

                    <span class="u-cuerpo">
                        ${expediente.dia ?? "—"}
                    </span>

                </div>


                <div class="gestion-card__dato">

                    <span class="u-etiqueta u-texto-terciario">
                        Intentos
                    </span>

                    <span class="u-cuerpo">
                        ${expediente.intentos ?? "—"}
                    </span>

                </div>

            </div>

        </article>
    `;
}


/* ─────────────────────────────────────────────
   ACTIVOS
   ───────────────────────────────────────────── */

function renderizarActivos(datos) {

    expedientesActivosFiltradosActuales =
        datos;


    if (datos.length === 0) {

        contenedorActivos.innerHTML = `
            <div class="tabla-vacia">
                <p class="u-cuerpo u-texto-terciario">
                    No hay expedientes activos.
                </p>
            </div>
        `;


        checkboxTodosActivos = null;

        actualizarBarraSeleccionExpedientes();

        return;
    }


    const filas =
        datos
            .map(
                (expediente) =>
                    crearFilaExpedienteActivo(
                        expediente
                    )
            )
            .join("");


    const permiteSeleccion =
        puedeSeleccionarActivos();


    contenedorActivos.innerHTML = `
        <table class="tabla">

            <thead>

                <tr>

                    ${permiteSeleccion ? `
                        <th class="tabla__columna-checkbox">

                            <input
                                type="checkbox"
                                id="checkbox-todos-activos"
                                class="tabla__checkbox"
                                aria-label="Seleccionar todos los expedientes visibles"
                            >

                        </th>
                    ` : ""}

                    <th>Cliente</th>
                    <th>Interlocutor</th>
                    <th>Contrato</th>
                    <th>Vencido</th>
                    <th>Responsable</th>
                    <th></th>

                </tr>

            </thead>


            <tbody>
                ${filas}
            </tbody>

        </table>
    `;


    configurarAccionesActivos();

    actualizarBarraSeleccionExpedientes();
}


function crearFilaExpedienteActivo(
    expediente
) {

    const seleccionada =
        expedientesActivosSeleccionados.has(
            expediente.id
        );

    const permiteSeleccion =
        puedeSeleccionarActivos();


    return `
        <tr>

            ${permiteSeleccion ? `
                <td class="tabla__columna-checkbox">

                    <input
                        type="checkbox"
                        class="tabla__checkbox"
                        data-checkbox-expediente
                        data-id="${expediente.id}"
                        aria-label="Seleccionar expediente ${expediente.id}"
                        ${seleccionada ? "checked" : ""}
                    >

                </td>
            ` : ""}


            <td>

                <span class="tabla__nombre">
                    ${escaparHtml(
                        expediente.nombre_cliente
                    )}
                </span>

            </td>


            <td>
                ${escaparHtml(
                    expediente.interlocutor
                )}
            </td>


            <td>

                ${
                    expediente.contrato
                        ? escaparHtml(
                            expediente.contrato
                        )
                        : "Sin contrato"
                }

            </td>


            <td>
                ${formatearMonto(
                    expediente.monto_vencido
                )}
            </td>


            <td>

                ${
                    expediente.usuario
                        ? escaparHtml(
                            expediente.usuario
                        )
                        : "Sin asignar"
                }

            </td>


            <td class="tabla__acciones">

                <button
                    type="button"
                    class="tabla__accion"
                    data-accion="abrir"
                    data-id="${expediente.id}"
                >
                    Abrir expediente
                </button>

            </td>

        </tr>
    `;
}


/* ─────────────────────────────────────────────
   ACCIONES DE TABLA
   ───────────────────────────────────────────── */

function configurarAccionesActivos() {

    checkboxTodosActivos =
        contenedorActivos.querySelector(
            "#checkbox-todos-activos"
        );


    if (checkboxTodosActivos) {

        checkboxTodosActivos.addEventListener(
            "change",
            manejarCheckboxTodosActivos
        );

    }


    contenedorActivos
        .querySelectorAll(
            "[data-checkbox-expediente]"
        )
        .forEach(
            (checkbox) => {

                checkbox.addEventListener(
                    "change",
                    manejarCheckboxExpediente
                );

            }
        );


    contenedorActivos
        .querySelectorAll(
            "[data-accion='abrir']"
        )
        .forEach(
            (boton) => {

                boton.addEventListener(
                    "click",
                    manejarAbrirExpediente
                );

            }
        );


    actualizarCheckboxTodosActivos();
}


function manejarCheckboxExpediente(
    event
) {

    const checkbox =
        event.currentTarget;


    const id =
        Number(
            checkbox.dataset.id
        );


    if (checkbox.checked) {

        expedientesActivosSeleccionados.add(
            id
        );

    } else {

        expedientesActivosSeleccionados.delete(
            id
        );

    }


    actualizarCheckboxTodosActivos();

    actualizarBarraSeleccionExpedientes();
}


function manejarCheckboxTodosActivos(
    event
) {

    const marcar =
        event.currentTarget.checked;


    expedientesActivosFiltradosActuales
        .forEach(
            (expediente) => {

                if (marcar) {

                    expedientesActivosSeleccionados.add(
                        expediente.id
                    );

                } else {

                    expedientesActivosSeleccionados.delete(
                        expediente.id
                    );

                }

            }
        );


    renderizarActivos(
        expedientesActivosFiltradosActuales
    );
}


function actualizarCheckboxTodosActivos() {

    if (!checkboxTodosActivos) {
        return;
    }


    const visibles =
        expedientesActivosFiltradosActuales;


    if (visibles.length === 0) {

        checkboxTodosActivos.checked =
            false;

        checkboxTodosActivos.indeterminate =
            false;

        checkboxTodosActivos.disabled =
            true;

        return;
    }


    checkboxTodosActivos.disabled =
        false;


    const seleccionadasVisibles =
        visibles.filter(
            (expediente) =>
                expedientesActivosSeleccionados.has(
                    expediente.id
                )
        );


    checkboxTodosActivos.checked =
        seleccionadasVisibles.length ===
        visibles.length;


    checkboxTodosActivos.indeterminate =
        seleccionadasVisibles.length > 0 &&
        seleccionadasVisibles.length <
            visibles.length;
}


/* ─────────────────────────────────────────────
   BARRA DE SELECCIÓN
   ───────────────────────────────────────────── */

function actualizarBarraSeleccionExpedientes() {

    if (!barraSeleccionExpedientes) {
        return;
    }


    const cantidad =
        expedientesActivosSeleccionados.size;


    barraSeleccionExpedientes.hidden =
        cantidad === 0;


    if (cantidad === 0) {

        if (botonEliminarExpedientes) {

            botonEliminarExpedientes.disabled =
                true;

        }

        return;
    }


    barraSeleccionExpedientesTexto.textContent =
        cantidad === 1
            ? "1 expediente seleccionado"
            : `${cantidad} expedientes seleccionados`;


    if (botonEliminarExpedientes) {

        botonEliminarExpedientes.disabled =
            false;

    }
}


function cancelarSeleccionExpedientes() {

    expedientesActivosSeleccionados.clear();


    renderizarActivos(
        expedientesActivosFiltradosActuales
    );


    actualizarBarraSeleccionExpedientes();
}


/* ─────────────────────────────────────────────
   ABRIR EXPEDIENTE
   ───────────────────────────────────────────── */

function manejarAbrirExpediente(
    event
) {

    const idExpediente =
        Number(
            event.currentTarget.dataset.id
        );


    abrirExpediente(
        idExpediente
    );
}


function abrirExpediente(
    idExpediente
) {

    /*
     * La navegación al detalle del expediente
     * la implementaremos cuando construyamos
     * esa vista.
     */

    console.log(
        "Abrir expediente:",
        idExpediente
    );
}


/* ─────────────────────────────────────────────
   ASIGNACIÓN DE EXPEDIENTES
   ───────────────────────────────────────────── */

async function abrirModalAsignarExpedientes(
    ids
) {

    if (!ids.length) {
        return;
    }


    idsAsignarPendientes =
        ids;


    ocultarErrorModalAsignarExpedientes();


    modalAsignarMensaje.textContent =
        ids.length === 1
            ? "Selecciona el nuevo responsable para este expediente."
            : `Selecciona el nuevo responsable para los ${ids.length} expedientes seleccionados.`;


    selectAsignarExpediente.innerHTML = `
        <option value="">
            Cargando usuarios...
        </option>
    `;


    selectAsignarExpediente.disabled =
        true;


    botonConfirmarAsignarExpedientes.disabled =
        true;


    modalAsignarExpedientes.hidden =
        false;


    try {

        const usuarios =
            await obtenerUsuariosAsignables();


        selectAsignarExpediente.innerHTML = `
            <option value="">
                Selecciona un responsable
            </option>

            ${usuarios.map(
                (usuario) => `
                    <option value="${usuario.id}">
                        ${escaparHtml(
                            usuario.nombre
                        )}
                    </option>
                `
            ).join("")}
        `;


        selectAsignarExpediente.disabled =
            false;


        botonConfirmarAsignarExpedientes.disabled =
            false;


        selectAsignarExpediente.focus();


    } catch (error) {

        mostrarErrorModalAsignarExpedientes(
            error.message ||
            "No se pudieron cargar los usuarios."
        );

    }
}


async function obtenerUsuariosAsignables() {

    const respuesta =
        await fetch(
            "/usuarios/asignables",
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


    return await respuesta.json();
}


function cerrarModalAsignarExpedientes() {

    idsAsignarPendientes =
        [];


    ocultarErrorModalAsignarExpedientes();


    modalAsignarExpedientes.hidden =
        true;
}


async function confirmarAsignacionExpedientes() {

    if (
        idsAsignarPendientes.length === 0
    ) {
        return;
    }


    const idUsuario =
        selectAsignarExpediente.value;


    if (!idUsuario) {

        mostrarErrorModalAsignarExpedientes(
            "Selecciona un responsable."
        );

        return;
    }


    ocultarErrorModalAsignarExpedientes();


    botonConfirmarAsignarExpedientes.disabled =
        true;

    botonCancelarAsignarExpedientes.disabled =
        true;


    try {

        const respuesta =
            await fetch(
                ENDPOINTS_EXPEDIENTES.asignar,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        ids:
                            idsAsignarPendientes,

                        id_usuario:
                            Number(idUsuario)
                    })
                }
            );


        if (!respuesta.ok) {

            mostrarErrorModalAsignarExpedientes(
                await mensajeDeError(
                    respuesta
                )
            );

            return;
        }


        expedientesActivosSeleccionados.clear();


        cerrarModalAsignarExpedientes();


        await cargarSeccion(
            "activos"
        );


        await cargarResumen();


    } catch {

        mostrarErrorModalAsignarExpedientes(
            "No se pudo contactar al servidor. Intenta de nuevo."
        );

    } finally {

        botonConfirmarAsignarExpedientes.disabled =
            false;

        botonCancelarAsignarExpedientes.disabled =
            false;

    }
}


function mostrarErrorModalAsignarExpedientes(
    mensaje
) {

    textoModalAsignarError.textContent =
        mensaje;

    modalAsignarError.hidden =
        false;
}


function ocultarErrorModalAsignarExpedientes() {

    textoModalAsignarError.textContent =
        "";

    modalAsignarError.hidden =
        true;
}


/* ─────────────────────────────────────────────
   ELIMINACIÓN DE EXPEDIENTES
   ───────────────────────────────────────────── */

/*
 * Este es el único punto de entrada para eliminar
 * uno o varios expedientes.
 *
 * Individual:
 *     abrirModalEliminarExpedientes([id])
 *
 * Masivo:
 *     abrirModalEliminarExpedientes([id1, id2, id3])
 */

async function abrirModalEliminarExpedientes(
    ids
) {

    if (!ids.length) {
        return;
    }


    idsEliminarExpedientesPendientes =
        ids;


    ocultarErrorModalEliminarExpedientes();


    const cantidad =
        ids.length;


    modalEliminarExpedientesMensaje.textContent =
        cantidad === 1
            ? "Consultando expediente..."
            : `Consultando ${cantidad} expedientes...`;


    botonConfirmarEliminarExpedientes.disabled =
        true;


    modalEliminarExpedientes.hidden =
        false;


    try {

        let totalCobranzas = 0;
        let totalDocumentos = 0;


        for (const idExpediente of ids) {

            const respuesta =
                await fetch(
                    endpointResumenEliminacionExpediente(
                        idExpediente
                    ),
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );


            if (!respuesta.ok) {

                throw new Error(
                    await mensajeDeError(
                        respuesta
                    )
                );

            }


            const resumen =
                await respuesta.json();


            totalCobranzas +=
                Number(
                    resumen.cobranzas ?? 0
                );


            totalDocumentos +=
                Number(
                    resumen.documentos ?? 0
                );

        }


        const tieneContenido =
            totalCobranzas > 0 ||
            totalDocumentos > 0;


        if (cantidad === 1) {

            modalEliminarExpedientesMensaje.textContent =
                tieneContenido
                    ? `Este expediente tiene ${totalCobranzas} gestión(es) y ${totalDocumentos} documento(s) asociados. Al eliminarlo se eliminará también todo eso, incluyendo sus evidencias. ¿Deseas continuar?`
                    : "¿Estás seguro de que deseas eliminar este expediente?";

        } else {

            modalEliminarExpedientesMensaje.textContent =
                tieneContenido
                    ? `Los ${cantidad} expedientes seleccionados tienen en conjunto ${totalCobranzas} gestión(es) y ${totalDocumentos} documento(s) asociados. Al eliminarlos se eliminará también todo eso, incluyendo sus evidencias. ¿Deseas continuar?`
                    : `¿Estás seguro de que deseas eliminar los ${cantidad} expedientes seleccionados?`;

        }


    } catch (error) {

        mostrarErrorModalEliminarExpedientes(
            error.message ||
            "No se pudo consultar el resumen de los expedientes."
        );

        return;

    } finally {

        botonConfirmarEliminarExpedientes.disabled =
            false;

    }


    botonConfirmarEliminarExpedientes.focus();
}


async function confirmarEliminacionExpedientes() {

    if (
        idsEliminarExpedientesPendientes.length === 0
    ) {
        return;
    }


    ocultarErrorModalEliminarExpedientes();


    botonConfirmarEliminarExpedientes.disabled =
        true;

    botonCancelarEliminarExpedientes.disabled =
        true;


    try {

        for (
            const idExpediente
            of idsEliminarExpedientesPendientes
        ) {

            const respuesta =
                await fetch(
                    endpointEliminarExpediente(
                        idExpediente
                    ),
                    {
                        method: "DELETE",
                        credentials: "include"
                    }
                );


            if (!respuesta.ok) {

                throw new Error(
                    await mensajeDeError(
                        respuesta
                    )
                );

            }

        }


        expedientesActivosSeleccionados.clear();


        cerrarModalEliminarExpedientes();


        await cargarSeccion(
            "activos"
        );


        await cargarResumen();


    } catch (error) {

        mostrarErrorModalEliminarExpedientes(
            error.message ||
            "No se pudo completar la eliminación de los expedientes."
        );

    } finally {

        botonConfirmarEliminarExpedientes.disabled =
            false;

        botonCancelarEliminarExpedientes.disabled =
            false;
    }
}


function manejarEliminarExpediente(
    event
) {

    const idExpediente =
        Number(
            event.currentTarget.dataset.id
        );


    /*
     * Individual y masivo convergen aquí.
     */
    abrirModalEliminarExpedientes(
        [idExpediente]
    );
}


function cerrarModalEliminarExpedientes() {

    idsEliminarExpedientesPendientes =
        [];


    ocultarErrorModalEliminarExpedientes();


    modalEliminarExpedientes.hidden =
        true;
}


function mostrarErrorModalEliminarExpedientes(
    mensaje
) {

    textoModalEliminarExpedientesError.textContent =
        mensaje;

    modalEliminarExpedientesError.hidden =
        false;
}


function ocultarErrorModalEliminarExpedientes() {

    textoModalEliminarExpedientesError.textContent =
        "";

    modalEliminarExpedientesError.hidden =
        true;
}


/* ─────────────────────────────────────────────
   FORMATO
   ───────────────────────────────────────────── */

function formatearMonto(
    monto
) {

    if (
        monto === null ||
        monto === undefined
    ) {
        return "—";
    }


    const numero =
        Number(monto);


    if (
        Number.isNaN(numero)
    ) {
        return "—";
    }


    return numero.toLocaleString(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    );
}


/* ─────────────────────────────────────────────
   ESTADO
   ───────────────────────────────────────────── */

function mostrarCarga() {

    estadoExpedientes.hidden =
        false;
}


function ocultarCarga() {

    estadoExpedientes.hidden =
        true;
}


function mostrarError(
    mensaje
) {

    textoMensajeExpedientes.textContent =
        mensaje;

    mensajeExpedientes.hidden =
        false;
}


function ocultarMensaje() {

    textoMensajeExpedientes.textContent =
        "";

    mensajeExpedientes.hidden =
        true;
}


/* ─────────────────────────────────────────────
   ERRORES HTTP
   ───────────────────────────────────────────── */

async function mensajeDeError(
    respuesta
) {

    try {

        const cuerpo =
            await respuesta.json();


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


/* ─────────────────────────────────────────────
   HTML
   ───────────────────────────────────────────── */

function escaparHtml(
    valor
) {

    const elemento =
        document.createElement(
            "div"
        );


    elemento.textContent =
        valor ?? "";


    return elemento.innerHTML;
}