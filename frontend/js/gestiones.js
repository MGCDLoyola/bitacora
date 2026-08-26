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


    configurarVistaPorRol(contenedor);

    configurarNavegacion(contenedor);

    configurarFiltro();

    await cargarResumen();

    await cargarSeccion(seccionActual);
}


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
        [...navegacion.querySelectorAll(
            "[data-seccion]"
        )];

    botones.forEach((boton) => {
        const seccion =
            boton.dataset.seccion;

        boton.hidden =
            !seccionesPermitidas.includes(seccion);
    });

    seccionesPermitidas.forEach((seccion) => {
        const boton =
            botones.find(
                (elemento) =>
                    elemento.dataset.seccion === seccion
            );

        if (boton) {
            navegacion.appendChild(boton);
        }
    });

    actualizarPestanas();
    actualizarContenedores();
    actualizarFiltro();
}


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


function filtrarSeccionActual() {
    const texto = filtrosGestiones[seccionActual]
        .trim()
        .toLowerCase();

    const datos = datosGestiones[seccionActual];

    if (!texto) {
        renderizarSeccion(
            seccionActual,
            datos
        );

        return;
    }

    const filtrados = datos.filter(
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


async function cargarResumen() {
    const respuesta = await fetch(
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

    const resumen = await respuesta.json();

    actualizarContadores(resumen);
}


function actualizarContadores(resumen) {
    document
        .querySelectorAll("[data-seccion]")
        .forEach((boton) => {

            const seccion = boton.dataset.seccion;
            const cantidad = resumen[seccion] ?? 0;

            let contador =
                boton.querySelector(".vista-gestiones__contador");

            if (!contador) {
                contador = document.createElement("span");

                contador.className =
                    "vista-gestiones__contador";

                boton.appendChild(contador);
            }

            contador.textContent = cantidad;
        });
}


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
        !seccionesPermitidas[rol]?.includes(seccion)
    ) {
        return;
    }

    seccionActual = seccion;

    actualizarPestanas();
    actualizarContenedores();
    actualizarFiltro();

    await cargarSeccion(seccion);
}

function actualizarFiltro() {
    filtroGestiones.hidden = false;

    filtroGestiones.value =
        filtrosGestiones[seccionActual] ?? "";

    filtroGestiones.placeholder =
        seccionActual === "activos"
            ? "Buscar por nombre, interlocutor, contrato o responsable..."
            : "Buscar por nombre, interlocutor o contrato...";
}


function actualizarPestanas() {
    document
        .querySelectorAll("[data-seccion]")
        .forEach((boton) => {

            boton.classList.toggle(
                "vista-gestiones__tab--activo",
                boton.dataset.seccion === seccionActual
            );
        });
}


function actualizarContenedores() {
    document
        .querySelectorAll("[data-seccion-contenido]")
        .forEach((seccion) => {

            seccion.hidden =
                seccion.dataset.seccionContenido !== seccionActual;
        });
}


async function cargarSeccion(seccion) {
    ocultarMensaje();
    mostrarCarga();

    try {
        const datos = await obtenerGestiones(seccion);

        datosGestiones[seccion] = datos;

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

    const endpoint = endpoints[seccion];

    if (!endpoint) {
        throw new Error(
            "La sección solicitada no es válida."
        );
    }

    const respuesta = await fetch(
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


function renderizarSeccion(seccion, datos) {
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
        renderizarActivos(datos);
    }
}


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

    contenedor.innerHTML = datos
        .map((gestion) => crearTarjetaGestion(gestion))
        .join("");
}


function crearTarjetaGestion(gestion) {
    const monto = formatearMonto(
        gestion.monto_vencido
    );

    const contrato = gestion.contrato
        ? escaparHtml(gestion.contrato)
        : "Sin contrato";

    return `
        <article
            class="gestion-card"
            data-id="${gestion.id}"
        >

            <div class="gestion-card__encabezado">

                <div>

                    <h3 class="gestion-card__cliente">
                        ${escaparHtml(gestion.nombre_cliente)}
                    </h3>

                    <span class="gestion-card__interlocutor u-mono-sm">
                        ${escaparHtml(gestion.interlocutor)}
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


function renderizarActivos(datos) {
    if (datos.length === 0) {
        contenedorActivos.innerHTML = `
            <div class="tabla-vacia">
                <p class="u-cuerpo u-texto-terciario">
                    No hay gestiones activas.
                </p>
            </div>
        `;

        return;
    }

    const filas = datos
        .map((gestion) => `
            <tr>

                <td>
                    <span class="tabla__nombre">
                        ${escaparHtml(gestion.nombre_cliente)}
                    </span>
                </td>

                <td>
                    ${escaparHtml(gestion.interlocutor)}
                </td>

                <td>
                    ${gestion.contrato
                        ? escaparHtml(gestion.contrato)
                        : "Sin contrato"}
                </td>

                <td>
                    ${formatearMonto(gestion.monto_vencido)}
                </td>

                <td>
                    ${gestion.usuario
                        ? escaparHtml(gestion.usuario)
                        : "Sin asignar"}
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
        `)
        .join("");


    contenedorActivos.innerHTML = `
        <table class="tabla">

            <thead>
                <tr>
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


    contenedorActivos
        .querySelectorAll("[data-accion='abrir']")
        .forEach((boton) => {

            boton.addEventListener(
                "click",
                manejarAbrirExpediente
            );
        });
}


function manejarAbrirExpediente(event) {
    const idExpediente = Number(
        event.currentTarget.dataset.id
    );

    abrirExpediente(idExpediente);
}


function abrirExpediente(idExpediente) {
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


function formatearMonto(monto) {
    if (
        monto === null ||
        monto === undefined
    ) {
        return "—";
    }

    const numero = Number(monto);

    if (Number.isNaN(numero)) {
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


function mostrarCarga() {
    estadoGestiones.hidden = false;
}


function ocultarCarga() {
    estadoGestiones.hidden = true;
}


function mostrarError(mensaje) {
    textoMensajeGestiones.textContent = mensaje;
    mensajeGestiones.hidden = false;
}


function ocultarMensaje() {
    textoMensajeGestiones.textContent = "";
    mensajeGestiones.hidden = true;
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
    const elemento =
        document.createElement("div");

    elemento.textContent = valor ?? "";

    return elemento.innerHTML;
}