let usuarioSesion = null;

let seccionActual = null;

let estadoGestiones = null;
let mensajeGestiones = null;
let textoMensajeGestiones = null;

let contenedorDelDia = null;
let contenedorActivos = null;
let contenedorDesfasados = null;
let contenedorConsolidacion = null;

let filtroGestiones = null;

let datosGestiones = {
    "del-dia": [],
    "activos": [],
    "desfasados": [],
    "consolidacion": []
};

let filtrosGestiones = {
    "del-dia": "",
    "desfasados": "",
    "consolidacion": "",
    "activos": ""
};


/* ─────────────────────────────────────────────
   SELECCIÓN DE ACTIVOS
   ───────────────────────────────────────────── */

let gestionesActivosFiltradasActuales = [];
let gestionesActivosSeleccionadas = new Set();

let checkboxTodosActivos = null;

let barraSeleccionGestiones = null;
let barraSeleccionGestionesTexto = null;

let botonReasignarGestiones = null;
let botonEliminarGestiones = null;
let botonCancelarSeleccionGestiones = null;


/* ─────────────────────────────────────────────
   MODAL REASIGNAR
   ───────────────────────────────────────────── */

let modalReasignarGestion = null;
let modalReasignarMensaje = null;
let modalReasignarError = null;
let textoModalReasignarError = null;

let selectReasignarGestion = null;

let botonCancelarReasignar = null;
let botonConfirmarReasignar = null;

let idsReasignarPendientes = [];


/* ─────────────────────────────────────────────
   MODAL ELIMINAR
   ───────────────────────────────────────────── */

let modalEliminarGestion = null;
let modalEliminarMensaje = null;
let modalEliminarError = null;
let textoModalEliminarError = null;

let botonCancelarEliminar = null;
let botonConfirmarEliminar = null;

let idsEliminarPendientes = [];


/* ─────────────────────────────────────────────
   ENDPOINTS
   ───────────────────────────────────────────── */

const ENDPOINTS_GESTIONES = {

    reasignar:
        "/expedientes/asignar-masivo",

    eliminar:
        "/expedientes/gestiones/eliminar-masivo"

};


/* ─────────────────────────────────────────────
   INICIO
   ───────────────────────────────────────────── */

export async function iniciar({ usuario, contenedor }) {

    usuarioSesion = usuario;

    estadoGestiones = contenedor.querySelector(
        "#estado-gestiones"
    );

    mensajeGestiones = contenedor.querySelector(
        "#mensaje-gestiones"
    );

    textoMensajeGestiones = contenedor.querySelector(
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

    filtroGestiones = contenedor.querySelector(
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

function crearInterfazSeleccion() {

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
                    class="barra-seleccion__texto"
                >
                    0 gestiones seleccionadas
                </span>

            </div>


            <div class="barra-seleccion__acciones">

                <button
                    type="button"
                    id="boton-reasignar-gestiones"
                    class="barra-seleccion__accion"
                >
                    Reasignar
                </button>

                <button
                    type="button"
                    id="boton-eliminar-gestiones"
                    class="barra-seleccion__accion barra-seleccion__accion--desactivar"
                >
                    Eliminar
                </button>

                <button
                    type="button"
                    id="boton-cancelar-seleccion-gestiones"
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


    barraSeleccionGestiones =
        document.querySelector(
            "#barra-seleccion-gestiones"
        );

    barraSeleccionGestionesTexto =
        document.querySelector(
            "#barra-seleccion-gestiones-texto"
        );

    botonReasignarGestiones =
        document.querySelector(
            "#boton-reasignar-gestiones"
        );

    botonEliminarGestiones =
        document.querySelector(
            "#boton-eliminar-gestiones"
        );

    botonCancelarSeleccionGestiones =
        document.querySelector(
            "#boton-cancelar-seleccion-gestiones"
        );
}


/* ─────────────────────────────────────────────
   MODALES
   ───────────────────────────────────────────── */

function crearModales() {

    crearModalReasignar();

    crearModalEliminar();
}


function crearModalReasignar() {

    if (
        document.querySelector(
            "#modal-reasignar-gestion"
        )
    ) {
        modalReasignarGestion =
            document.querySelector(
                "#modal-reasignar-gestion"
            );

        modalReasignarMensaje =
            modalReasignarGestion.querySelector(
                "#modal-reasignar-mensaje"
            );

        modalReasignarError =
            modalReasignarGestion.querySelector(
                "#modal-reasignar-error"
            );

        textoModalReasignarError =
            modalReasignarGestion.querySelector(
                "#texto-modal-reasignar-error"
            );

        selectReasignarGestion =
            modalReasignarGestion.querySelector(
                "#select-reasignar-gestion"
            );

        botonCancelarReasignar =
            modalReasignarGestion.querySelector(
                "#boton-cancelar-reasignar"
            );

        botonConfirmarReasignar =
            modalReasignarGestion.querySelector(
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
            data-cerrar-reasignar
        ></div>

        <div
            class="modal__contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-reasignar"
        >

            <div class="modal__encabezado">

                <h2
                    id="titulo-modal-reasignar"
                    class="modal__titulo"
                >
                    Reasignar gestiones
                </h2>

            </div>


            <div class="modal__cuerpo">

                <p id="modal-reasignar-mensaje">
                    Selecciona el nuevo responsable.
                </p>


                <div class="campo-formulario">

                    <label
                        for="select-reasignar-gestion"
                    >
                        Responsable
                    </label>

                    <select
                        id="select-reasignar-gestion"
                        class="campo-filtro__input"
                    >
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
                    class="boton boton--secundario"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    id="boton-confirmar-reasignar"
                    class="boton"
                >
                    Reasignar
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(modal);


    modalReasignarGestion = modal;

    modalReasignarMensaje =
        modal.querySelector(
            "#modal-reasignar-mensaje"
        );

    modalReasignarError =
        modal.querySelector(
            "#modal-reasignar-error"
        );

    textoModalReasignarError =
        modal.querySelector(
            "#texto-modal-reasignar-error"
        );

    selectReasignarGestion =
        modal.querySelector(
            "#select-reasignar-gestion"
        );

    botonCancelarReasignar =
        modal.querySelector(
            "#boton-cancelar-reasignar"
        );

    botonConfirmarReasignar =
        modal.querySelector(
            "#boton-confirmar-reasignar"
        );


    botonCancelarReasignar.addEventListener(
        "click",
        cerrarModalReasignar
    );


    modal
        .querySelectorAll(
            "[data-cerrar-reasignar]"
        )
        .forEach((elemento) => {

            elemento.addEventListener(
                "click",
                cerrarModalReasignar
            );

        });


    botonConfirmarReasignar.addEventListener(
        "click",
        confirmarReasignacion
    );
}


function crearModalEliminar() {

    if (
        document.querySelector(
            "#modal-eliminar-gestion"
        )
    ) {
        modalEliminarGestion =
            document.querySelector(
                "#modal-eliminar-gestion"
            );

        modalEliminarMensaje =
            modalEliminarGestion.querySelector(
                "#modal-eliminar-mensaje"
            );

        modalEliminarError =
            modalEliminarGestion.querySelector(
                "#modal-eliminar-error"
            );

        textoModalEliminarError =
            modalEliminarGestion.querySelector(
                "#texto-modal-eliminar-error"
            );

        botonCancelarEliminar =
            modalEliminarGestion.querySelector(
                "#boton-cancelar-eliminar"
            );

        botonConfirmarEliminar =
            modalEliminarGestion.querySelector(
                "#boton-confirmar-eliminar"
            );

        return;
    }


    const modal =
        document.createElement("div");

    modal.id =
        "modal-eliminar-gestion";

    modal.className = "modal";

    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="modal__fondo"
            data-cerrar-eliminar
        ></div>

        <div
            class="modal__contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-eliminar"
        >

            <div class="modal__encabezado">

                <h2
                    id="titulo-modal-eliminar"
                    class="modal__titulo"
                >
                    Eliminar gestiones
                </h2>

            </div>


            <div class="modal__cuerpo">

                <p id="modal-eliminar-mensaje">
                    ¿Estás seguro de que deseas eliminar
                    las gestiones seleccionadas?
                </p>


                <div
                    id="modal-eliminar-error"
                    class="mensaje-error modal__error"
                    role="alert"
                    hidden
                >
                    <span class="mensaje-error__sello">
                        Error
                    </span>

                    <span
                        id="texto-modal-eliminar-error"
                    ></span>
                </div>

            </div>


            <div class="modal__acciones">

                <button
                    type="button"
                    id="boton-cancelar-eliminar"
                    class="boton boton--secundario"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    id="boton-confirmar-eliminar"
                    class="boton"
                >
                    Eliminar
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(modal);


    modalEliminarGestion = modal;

    modalEliminarMensaje =
        modal.querySelector(
            "#modal-eliminar-mensaje"
        );

    modalEliminarError =
        modal.querySelector(
            "#modal-eliminar-error"
        );

    textoModalEliminarError =
        modal.querySelector(
            "#texto-modal-eliminar-error"
        );

    botonCancelarEliminar =
        modal.querySelector(
            "#boton-cancelar-eliminar"
        );

    botonConfirmarEliminar =
        modal.querySelector(
            "#boton-confirmar-eliminar"
        );


    botonCancelarEliminar.addEventListener(
        "click",
        cerrarModalEliminar
    );


    modal
        .querySelectorAll(
            "[data-cerrar-eliminar]"
        )
        .forEach((elemento) => {

            elemento.addEventListener(
                "click",
                cerrarModalEliminar
            );

        });


    botonConfirmarEliminar.addEventListener(
        "click",
        confirmarEliminacion
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

    filtroGestiones.addEventListener(
        "input",
        () => {

            filtrosGestiones[seccionActual] =
                filtroGestiones.value;

            filtrarSeccionActual();

        }
    );
}


function configurarAccionesSeleccion() {

    if (botonReasignarGestiones) {

        botonReasignarGestiones.addEventListener(
            "click",
            () => {

                abrirModalReasignar(
                    [
                        ...gestionesActivosSeleccionadas
                    ]
                );

            }
        );

    }


    if (botonEliminarGestiones) {

        botonEliminarGestiones.addEventListener(
            "click",
            () => {

                abrirModalEliminar(
                    [
                        ...gestionesActivosSeleccionadas
                    ]
                );

            }
        );

    }


    if (botonCancelarSeleccionGestiones) {

        botonCancelarSeleccionGestiones.addEventListener(
            "click",
            cancelarSeleccionGestiones
        );

    }


    crearModales();
}


/* ─────────────────────────────────────────────
   FILTRO
   ───────────────────────────────────────────── */

function filtrarSeccionActual() {

    const texto =
        filtrosGestiones[seccionActual]
            .trim()
            .toLowerCase();


    const datos =
        datosGestiones[seccionActual];


    if (!texto) {

        renderizarSeccion(
            seccionActual,
            datos
        );

        return;
    }


    const filtrados =
        datos.filter(
            (gestion) => {

                const nombre =
                    String(
                        gestion.nombre_cliente ?? ""
                    ).toLowerCase();


                const interlocutor =
                    String(
                        gestion.interlocutor ?? ""
                    ).toLowerCase();


                const contrato =
                    String(
                        gestion.contrato ?? ""
                    ).toLowerCase();


                const responsable =
                    String(
                        gestion.usuario ?? ""
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

    filtroGestiones.hidden = false;


    filtroGestiones.value =
        filtrosGestiones[
            seccionActual
        ] ?? "";


    filtroGestiones.placeholder =
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
            await obtenerGestiones(
                seccion
            );


        datosGestiones[seccion] =
            datos;


        if (seccion === "activos") {

            const idsActuales =
                new Set(
                    datos.map(
                        (gestion) =>
                            gestion.id
                    )
                );


            gestionesActivosSeleccionadas =
                new Set(
                    [
                        ...gestionesActivosSeleccionadas
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
            "No se pudieron cargar las gestiones."
        );

    } finally {

        ocultarCarga();

    }
}


async function obtenerGestiones(seccion) {

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

        gestionesActivosFiltradasActuales =
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
                (gestion) =>
                    crearTarjetaGestion(
                        gestion
                    )
            )
            .join("");
}


function crearTarjetaGestion(
    gestion
) {

    const monto =
        formatearMonto(
            gestion.monto_vencido
        );


    const contrato =
        gestion.contrato
            ? escaparHtml(
                gestion.contrato
            )
            : "Sin contrato";


    return `
        <article
            class="gestion-card"
            data-id="${gestion.id}"
        >

            <div class="gestion-card__encabezado">

                <div>

                    <h3 class="gestion-card__cliente">
                        ${escaparHtml(
                            gestion.nombre_cliente
                        )}
                    </h3>

                    <span class="gestion-card__interlocutor u-mono-sm">
                        ${escaparHtml(
                            gestion.interlocutor
                        )}
                    </span>

                </div>


                <div class="gestion-card__id">

                    <span class="u-mono-sm">
                        #${gestion.id}
                    </span>

                    <div class="gestion-card__acciones">

                        <button
                            type="button"
                            class="boton u-boton-texto gestion-card__boton"
                            data-accion="abrir"
                            data-id="${gestion.id}"
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
                        ${gestion.dia ?? "—"}
                    </span>

                </div>


                <div class="gestion-card__dato">

                    <span class="u-etiqueta u-texto-terciario">
                        Intentos
                    </span>

                    <span class="u-cuerpo">
                        ${gestion.intentos ?? "—"}
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

    gestionesActivosFiltradasActuales =
        datos;


    if (datos.length === 0) {

        contenedorActivos.innerHTML = `
            <div class="tabla-vacia">
                <p class="u-cuerpo u-texto-terciario">
                    No hay gestiones activas.
                </p>
            </div>
        `;


        checkboxTodosActivos = null;

        actualizarBarraSeleccionGestiones();

        return;
    }


    const filas =
        datos
            .map(
                (gestion) =>
                    crearFilaGestionActiva(
                        gestion
                    )
            )
            .join("");


    contenedorActivos.innerHTML = `
        <table class="tabla">

            <thead>

                <tr>

                    <th class="tabla__columna-checkbox">

                        <input
                            type="checkbox"
                            id="checkbox-todos-activos"
                            class="tabla__checkbox"
                            aria-label="Seleccionar todas las gestiones visibles"
                        >

                    </th>

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

    actualizarBarraSeleccionGestiones();
}


function crearFilaGestionActiva(
    gestion
) {

    const seleccionada =
        gestionesActivosSeleccionadas.has(
            gestion.id
        );


    return `
        <tr>

            <td class="tabla__columna-checkbox">

                <input
                    type="checkbox"
                    class="tabla__checkbox"
                    data-checkbox-gestion
                    data-id="${gestion.id}"
                    aria-label="Seleccionar gestión ${gestion.id}"
                    ${seleccionada ? "checked" : ""}
                >

            </td>


            <td>

                <span class="tabla__nombre">
                    ${escaparHtml(
                        gestion.nombre_cliente
                    )}
                </span>

            </td>


            <td>
                ${escaparHtml(
                    gestion.interlocutor
                )}
            </td>


            <td>

                ${
                    gestion.contrato
                        ? escaparHtml(
                            gestion.contrato
                        )
                        : "Sin contrato"
                }

            </td>


            <td>
                ${formatearMonto(
                    gestion.monto_vencido
                )}
            </td>


            <td>

                ${
                    gestion.usuario
                        ? escaparHtml(
                            gestion.usuario
                        )
                        : "Sin asignar"
                }

            </td>


            <td class="tabla__acciones">

                <button
                    type="button"
                    class="tabla__accion"
                    data-accion="abrir"
                    data-id="${gestion.id}"
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
            "[data-checkbox-gestion]"
        )
        .forEach(
            (checkbox) => {

                checkbox.addEventListener(
                    "change",
                    manejarCheckboxGestion
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


function manejarCheckboxGestion(
    event
) {

    const checkbox =
        event.currentTarget;


    const id =
        Number(
            checkbox.dataset.id
        );


    if (checkbox.checked) {

        gestionesActivosSeleccionadas.add(
            id
        );

    } else {

        gestionesActivosSeleccionadas.delete(
            id
        );

    }


    actualizarCheckboxTodosActivos();

    actualizarBarraSeleccionGestiones();
}


function manejarCheckboxTodosActivos(
    event
) {

    const marcar =
        event.currentTarget.checked;


    gestionesActivosFiltradasActuales
        .forEach(
            (gestion) => {

                if (marcar) {

                    gestionesActivosSeleccionadas.add(
                        gestion.id
                    );

                } else {

                    gestionesActivosSeleccionadas.delete(
                        gestion.id
                    );

                }

            }
        );


    renderizarActivos(
        gestionesActivosFiltradasActuales
    );
}


function actualizarCheckboxTodosActivos() {

    if (!checkboxTodosActivos) {
        return;
    }


    const visibles =
        gestionesActivosFiltradasActuales;


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
            (gestion) =>
                gestionesActivosSeleccionadas.has(
                    gestion.id
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

function actualizarBarraSeleccionGestiones() {

    if (!barraSeleccionGestiones) {
        return;
    }


    const cantidad =
        gestionesActivosSeleccionadas.size;


    barraSeleccionGestiones.hidden =
        cantidad === 0;


    if (cantidad === 0) {
        return;
    }


    barraSeleccionGestionesTexto.textContent =
        cantidad === 1
            ? "1 gestión seleccionada"
            : `${cantidad} gestiones seleccionadas`;
}


function cancelarSeleccionGestiones() {

    gestionesActivosSeleccionadas.clear();


    renderizarActivos(
        gestionesActivosFiltradasActuales
    );


    actualizarBarraSeleccionGestiones();
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
   REASIGNACIÓN
   ───────────────────────────────────────────── */

async function abrirModalReasignar(
    ids
) {

    if (!ids.length) {
        return;
    }


    idsReasignarPendientes =
        ids;


    ocultarErrorModalReasignar();


    modalReasignarMensaje.textContent =
        ids.length === 1
            ? "Selecciona el nuevo responsable para esta gestión."
            : `Selecciona el nuevo responsable para las ${ids.length} gestiones seleccionadas.`;


    selectReasignarGestion.innerHTML = `
        <option value="">
            Cargando usuarios...
        </option>
    `;


    selectReasignarGestion.disabled =
        true;


    botonConfirmarReasignar.disabled =
        true;


    modalReasignarGestion.hidden =
        false;


    try {

        const usuarios =
            await obtenerUsuariosAsignables();


        selectReasignarGestion.innerHTML = `
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


        selectReasignarGestion.disabled =
            false;


        botonConfirmarReasignar.disabled =
            false;


        selectReasignarGestion.focus();


    } catch (error) {

        mostrarErrorModalReasignar(
            error.message ||
            "No se pudieron cargar los usuarios."
        );

    }
}


async function obtenerUsuariosAsignables() {
    const respuesta = await fetch(
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


function cerrarModalReasignar() {

    idsReasignarPendientes =
        [];


    ocultarErrorModalReasignar();


    modalReasignarGestion.hidden =
        true;
}


async function confirmarReasignacion() {

    if (
        idsReasignarPendientes.length === 0
    ) {
        return;
    }


    const idUsuario =
        selectReasignarGestion.value;


    if (!idUsuario) {

        mostrarErrorModalReasignar(
            "Selecciona un responsable."
        );

        return;
    }


    ocultarErrorModalReasignar();


    botonConfirmarReasignar.disabled =
        true;

    botonCancelarReasignar.disabled =
        true;


    try {

        const respuesta =
            await fetch(
                ENDPOINTS_GESTIONES.reasignar,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        ids:
                            idsReasignarPendientes,

                        id_usuario:
                            Number(idUsuario)
                    })
                }
            );


        if (!respuesta.ok) {

            mostrarErrorModalReasignar(
                await mensajeDeError(
                    respuesta
                )
            );

            return;
        }


        gestionesActivosSeleccionadas.clear();


        cerrarModalReasignar();


        await cargarSeccion(
            "activos"
        );


        await cargarResumen();


    } catch {

        mostrarErrorModalReasignar(
            "No se pudo contactar al servidor. Intenta de nuevo."
        );

    } finally {

        botonConfirmarReasignar.disabled =
            false;

        botonCancelarReasignar.disabled =
            false;

    }
}


function mostrarErrorModalReasignar(
    mensaje
) {

    textoModalReasignarError.textContent =
        mensaje;

    modalReasignarError.hidden =
        false;
}


function ocultarErrorModalReasignar() {

    textoModalReasignarError.textContent =
        "";

    modalReasignarError.hidden =
        true;
}


/* ─────────────────────────────────────────────
   ELIMINACIÓN
   ───────────────────────────────────────────── */

function abrirModalEliminar(
    ids
) {

    if (!ids.length) {
        return;
    }


    idsEliminarPendientes =
        ids;


    ocultarErrorModalEliminar();


    modalEliminarMensaje.textContent =
        ids.length === 1
            ? "¿Estás seguro de que deseas eliminar esta gestión?"
            : `¿Estás seguro de que deseas eliminar las ${ids.length} gestiones seleccionadas?`;


    modalEliminarGestion.hidden =
        false;


    botonConfirmarEliminar.focus();
}


function cerrarModalEliminar() {

    idsEliminarPendientes =
        [];


    ocultarErrorModalEliminar();


    modalEliminarGestion.hidden =
        true;
}


async function confirmarEliminacion() {

    if (
        idsEliminarPendientes.length === 0
    ) {
        return;
    }


    ocultarErrorModalEliminar();


    botonConfirmarEliminar.disabled =
        true;

    botonCancelarEliminar.disabled =
        true;


    try {

        const respuesta =
            await fetch(
                ENDPOINTS_GESTIONES.eliminar,
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        ids:
                            idsEliminarPendientes
                    })
                }
            );


        if (!respuesta.ok) {

            mostrarErrorModalEliminar(
                await mensajeDeError(
                    respuesta
                )
            );

            return;
        }


        gestionesActivosSeleccionadas.clear();


        cerrarModalEliminar();


        await cargarSeccion(
            "activos"
        );


        await cargarResumen();


    } catch {

        mostrarErrorModalEliminar(
            "No se pudo contactar al servidor. Intenta de nuevo."
        );

    } finally {

        botonConfirmarEliminar.disabled =
            false;

        botonCancelarEliminar.disabled =
            false;

    }
}


function mostrarErrorModalEliminar(
    mensaje
) {

    textoModalEliminarError.textContent =
        mensaje;

    modalEliminarError.hidden =
        false;
}


function ocultarErrorModalEliminar() {

    textoModalEliminarError.textContent =
        "";

    modalEliminarError.hidden =
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

    estadoGestiones.hidden =
        false;
}


function ocultarCarga() {

    estadoGestiones.hidden =
        true;
}


function mostrarError(
    mensaje
) {

    textoMensajeGestiones.textContent =
        mensaje;

    mensajeGestiones.hidden =
        false;
}


function ocultarMensaje() {

    textoMensajeGestiones.textContent =
        "";

    mensajeGestiones.hidden =
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