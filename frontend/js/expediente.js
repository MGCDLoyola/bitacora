let usuarioSesion = null;
let idExpedienteActual = null;

let diaSeleccionado = null;


export async function iniciar({
    usuario,
    contenedor,
    idExpediente
}) {

    usuarioSesion = usuario;
    idExpedienteActual = idExpediente;


    const botonRegresar =
        contenedor.querySelector(
            "#boton-regresar-gestiones"
        );

    botonRegresar.addEventListener(
        "click",
        () => {

            window.navegar(
                "gestiones"
            );

        }
    );


    mostrarCarga(contenedor);

    try {

        const expediente =
            await obtenerExpediente(
                idExpedienteActual
            );

        renderizarExpediente(
            contenedor,
            expediente
        );

        renderizarDias(
            contenedor,
            expediente.dia_actual
        );

    } catch (error) {

        mostrarError(
            contenedor,
            error.message ||
            "No se pudo cargar el expediente."
        );

    } finally {

        ocultarCarga(contenedor);

    }
}


/* ─────────────────────────────────────────────
   CONSULTA
   ───────────────────────────────────────────── */

async function obtenerExpediente(
    idExpediente
) {

    const respuesta =
        await fetch(
            `/expedientes/${idExpediente}`,
            {
                method: "GET",
                credentials: "include"
            }
        );


    if (!respuesta.ok) {

        const error =
            new Error(
                await mensajeDeError(
                    respuesta
                )
            );

        error.status =
            respuesta.status;

        throw error;
    }


    return await respuesta.json();
}


/* ─────────────────────────────────────────────
   INFORMACIÓN DEL EXPEDIENTE
   ───────────────────────────────────────────── */

function renderizarExpediente(
    contenedor,
    expediente
) {

    const nombreCliente =
        contenedor.querySelector(
            "#expediente-nombre-cliente"
        );

    const interlocutor =
        contenedor.querySelector(
            "#expediente-interlocutor"
        );

    const folio =
        contenedor.querySelector(
            "#expediente-folio"
        );

    const contrato =
        contenedor.querySelector(
            "#expediente-contrato"
        );

    const fechaIncumplimiento =
        contenedor.querySelector(
            "#expediente-fecha-incumplimiento"
        );

    const montoVencido =
        contenedor.querySelector(
            "#expediente-monto-vencido"
        );

    const responsable =
        contenedor.querySelector(
            "#expediente-responsable"
        );

    const contenedorComentarios =
        contenedor.querySelector(
            "#expediente-comentarios-contenedor"
        );

    const comentarios =
        contenedor.querySelector(
            "#expediente-comentarios-texto"
        );


    nombreCliente.textContent =
        expediente.nombre_cliente ||
        "—";


    interlocutor.textContent =
        expediente.interlocutor ||
        "—";


    folio.textContent =
        `#${expediente.id}`;


    contrato.textContent =
        expediente.contrato ||
        "Sin contrato";


    fechaIncumplimiento.textContent =
        formatearFecha(
            expediente.fecha_incumplimiento
        );


    montoVencido.textContent =
        formatearMonto(
            expediente.monto_vencido
        );


    responsable.textContent =
        expediente.usuario ||
        "Sin asignar";


    const tieneComentarios =
        Boolean(
            expediente.comentarios?.trim()
        );


    contenedorComentarios.hidden =
        !tieneComentarios;


    if (tieneComentarios) {

        comentarios.textContent =
            expediente.comentarios;

    }
}


/* ─────────────────────────────────────────────
   DÍAS DE GESTIÓN
   ───────────────────────────────────────────── */

function renderizarDias(
    contenedor,
    diaActual
) {

    const navegacion =
        contenedor.querySelector(
            "#expediente-dias-navegacion"
        );

    const contenido =
        contenedor.querySelector(
            "#expediente-dias-contenido"
        );


    const dia =
        Number(diaActual) > 0
            ? Number(diaActual)
            : 1;

    diaSeleccionado = dia;


    navegacion.innerHTML = "";

    for (
        let numero = 1;
        numero <= dia;
        numero++
    ) {

        navegacion.appendChild(
            crearBotonDia(
                contenedor,
                numero
            )
        );

    }


    contenido.innerHTML = "";
}


function crearBotonDia(
    contenedor,
    numero
) {

    const boton =
        document.createElement(
            "button"
        );

    boton.type =
        "button";

    boton.className =
        "expediente-dias__tab";

    boton.dataset.dia =
        numero;

    boton.textContent =
        `Día ${numero}`;

    boton.classList.toggle(
        "expediente-dias__tab--activo",
        numero === diaSeleccionado
    );

    boton.addEventListener(
        "click",
        () => {

            seleccionarDia(
                contenedor,
                numero
            );

        }
    );

    return boton;
}


function seleccionarDia(
    contenedor,
    numero
) {

    diaSeleccionado = numero;


    contenedor
        .querySelectorAll(
            "#expediente-dias-navegacion [data-dia]"
        )
        .forEach((boton) => {

            boton.classList.toggle(
                "expediente-dias__tab--activo",
                Number(boton.dataset.dia) ===
                diaSeleccionado
            );

        });


    const contenido =
        contenedor.querySelector(
            "#expediente-dias-contenido"
        );

    contenido.innerHTML = "";
}


/* ─────────────────────────────────────────────
   FORMATO
   ───────────────────────────────────────────── */

function formatearFecha(
    fecha
) {

    if (!fecha) {
        return "—";
    }


    const [
        anio,
        mes,
        dia
    ] = fecha.split("-");


    return `${dia}/${mes}/${anio}`;
}


function formatearMonto(
    monto
) {

    if (
        monto === null ||
        monto === undefined
    ) {
        return "—";
    }


    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2
        }
    ).format(monto);
}


/* ─────────────────────────────────────────────
   ESTADO
   ───────────────────────────────────────────── */

function mostrarCarga(
    contenedor
) {

    contenedor.querySelector(
        "#estado-expediente"
    ).hidden = false;
}


function ocultarCarga(
    contenedor
) {

    contenedor.querySelector(
        "#estado-expediente"
    ).hidden = true;
}


/* ─────────────────────────────────────────────
   ERRORES
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


    if (respuesta.status === 401) {
        return "La sesión no es válida.";
    }


    if (respuesta.status === 403) {
        return "No tienes autorización para acceder a este expediente.";
    }


    if (respuesta.status === 404) {
        return "No se encontró el expediente solicitado.";
    }


    return "No se pudo completar la solicitud.";
}


function mostrarError(
    contenedor,
    mensaje
) {

    const mensajeExpediente =
        contenedor.querySelector(
            "#mensaje-expediente"
        );

    const textoMensaje =
        contenedor.querySelector(
            "#texto-mensaje-expediente"
        );


    textoMensaje.textContent =
        mensaje;

    mensajeExpediente.hidden =
        false;
}