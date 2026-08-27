let usuarioSesion = null;
let idExpedienteActual = null;

let diaSeleccionado = null;
let diaActualExpediente = null;

const HORA_INTENTO = {
    1: 9,
    2: 13,
    3: 16,
};

export async function iniciar({ usuario, contenedor, idExpediente }) {
    usuarioSesion = usuario;
    idExpedienteActual = idExpediente;

    const botonRegresar = contenedor.querySelector("#boton-regresar-gestiones");

    botonRegresar.addEventListener("click", () => {
        window.navegar("gestiones");
    });

    mostrarCarga(contenedor);

    try {
        const expediente = await obtenerExpediente(idExpedienteActual);

        renderizarExpediente(contenedor, expediente);

        renderizarDias(contenedor, expediente.dia_actual);
    } catch (error) {
        mostrarError(
            contenedor,
            error.message || "No se pudo cargar el expediente."
        );
    } finally {
        ocultarCarga(contenedor);
    }
}

/* ─────────────────────────────────────────────
   CONSULTA
   ───────────────────────────────────────────── */

async function obtenerExpediente(idExpediente) {
    const respuesta = await fetch(`/expedientes/${idExpediente}`, {
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

/* ─────────────────────────────────────────────
   INFORMACIÓN DEL EXPEDIENTE
   ───────────────────────────────────────────── */

function renderizarExpediente(contenedor, expediente) {
    const nombreCliente = contenedor.querySelector(
        "#expediente-nombre-cliente"
    );

    const interlocutor = contenedor.querySelector("#expediente-interlocutor");

    const folio = contenedor.querySelector("#expediente-folio");

    const contrato = contenedor.querySelector("#expediente-contrato");

    const fechaIncumplimiento = contenedor.querySelector(
        "#expediente-fecha-incumplimiento"
    );

    const montoVencido = contenedor.querySelector("#expediente-monto-vencido");

    const responsable = contenedor.querySelector("#expediente-responsable");

    const contenedorComentarios = contenedor.querySelector(
        "#expediente-comentarios-contenedor"
    );

    const comentarios = contenedor.querySelector(
        "#expediente-comentarios-texto"
    );

    nombreCliente.textContent = expediente.nombre_cliente || "—";

    interlocutor.textContent = expediente.interlocutor || "—";

    folio.textContent = `#${expediente.id}`;

    contrato.textContent = expediente.contrato || "Sin contrato";

    fechaIncumplimiento.textContent = formatearFecha(
        expediente.fecha_incumplimiento
    );

    montoVencido.textContent = formatearMonto(expediente.monto_vencido);

    responsable.textContent = expediente.usuario || "Sin asignar";

    const tieneComentarios = Boolean(expediente.comentarios?.trim());

    contenedorComentarios.hidden = !tieneComentarios;

    if (tieneComentarios) {
        comentarios.textContent = expediente.comentarios;
    }
}

/* ─────────────────────────────────────────────
   DÍAS DE GESTIÓN
   ───────────────────────────────────────────── */

function renderizarDias(contenedor, diaActual) {
    const navegacion = contenedor.querySelector("#expediente-dias-navegacion");

    const contenido = contenedor.querySelector("#expediente-dias-contenido");

    const dia = Number(diaActual) > 0 ? Number(diaActual) : 1;

    diaActualExpediente = dia;
    diaSeleccionado = dia;

    navegacion.innerHTML = "";

    for (let numero = 1; numero <= dia; numero++) {
        navegacion.appendChild(crearBotonDia(contenedor, numero));
    }

    contenido.innerHTML = "";

    renderizarIntentos(contenedor, diaSeleccionado);
}

function crearBotonDia(contenedor, numero) {
    const boton = document.createElement("button");

    boton.type = "button";

    boton.className = "expediente-dias__tab";

    boton.dataset.dia = numero;

    boton.textContent = `Día ${numero}`;

    boton.classList.toggle(
        "expediente-dias__tab--activo",
        numero === diaSeleccionado
    );

    boton.addEventListener("click", () => {
        seleccionarDia(contenedor, numero);
    });

    return boton;
}

function seleccionarDia(contenedor, numero) {
    diaSeleccionado = numero;

    contenedor
        .querySelectorAll("#expediente-dias-navegacion [data-dia]")
        .forEach((boton) => {
            boton.classList.toggle(
                "expediente-dias__tab--activo",
                Number(boton.dataset.dia) === diaSeleccionado
            );
        });

    renderizarIntentos(contenedor, diaSeleccionado);
}

/* ─────────────────────────────────────────────
   TARJETAS DE INTENTO
   ───────────────────────────────────────────── */

function renderizarIntentos(contenedor, dia) {
    const contenido = contenedor.querySelector("#expediente-dias-contenido");

    contenido.innerHTML = "";

    for (let orden = 1; orden <= 3; orden++) {
        contenido.appendChild(crearTarjetaIntento(dia, orden));
    }
}

function crearTarjetaIntento(dia, orden) {
    const bloqueada = calcularBloqueo(dia, orden);

    const tarjeta = document.createElement("article");

    tarjeta.className = "intento-tarjeta";

    tarjeta.classList.toggle("intento-tarjeta--bloqueada", bloqueada);

    const resumen = document.createElement("button");

    resumen.type = "button";

    resumen.className = "intento-tarjeta__resumen";

    resumen.disabled = bloqueada;

    resumen.innerHTML = `
        <span class="intento-tarjeta__orden">Intento ${orden}</span>
        <span class="intento-tarjeta__hora u-texto-terciario">${HORA_INTENTO[orden]}:00 hrs</span>
        <span class="intento-tarjeta__estado ${
            bloqueada
                ? "intento-tarjeta__estado--bloqueado"
                : "intento-tarjeta__estado--pendiente"
        }">
            ${bloqueada ? "Bloqueado" : "Pendiente"}
        </span>
        <svg class="intento-tarjeta__chevron" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    const cuerpo = document.createElement("div");

    cuerpo.className = "intento-tarjeta__cuerpo";

    cuerpo.hidden = true;

    cuerpo.innerHTML = `
        <p class="intento-tarjeta__aviso">
            Formulario de captura — próximamente.
        </p>
    `;

    if (!bloqueada) {
        resumen.addEventListener("click", () => {
            const expandida = tarjeta.classList.toggle(
                "intento-tarjeta--expandida"
            );

            cuerpo.hidden = !expandida;
        });
    }

    tarjeta.appendChild(resumen);
    tarjeta.appendChild(cuerpo);

    return tarjeta;
}

function calcularBloqueo(dia, orden) {
    if (dia < diaActualExpediente) {
        return false;
    }

    if (dia > diaActualExpediente) {
        return true;
    }

    return new Date().getHours() < HORA_INTENTO[orden];
}

/* ─────────────────────────────────────────────
   FORMATO
   ───────────────────────────────────────────── */

function formatearFecha(fecha) {
    if (!fecha) {
        return "—";
    }

    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio}`;
}

function formatearMonto(monto) {
    if (monto === null || monto === undefined) {
        return "—";
    }

    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
    }).format(monto);
}

/* ─────────────────────────────────────────────
   ESTADO
   ───────────────────────────────────────────── */

function mostrarCarga(contenedor) {
    contenedor.querySelector("#estado-expediente").hidden = false;
}

function ocultarCarga(contenedor) {
    contenedor.querySelector("#estado-expediente").hidden = true;
}

/* ─────────────────────────────────────────────
   ERRORES
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
        return "No tienes autorización para acceder a este expediente.";
    }

    if (respuesta.status === 404) {
        return "No se encontró el expediente solicitado.";
    }

    return "No se pudo completar la solicitud.";
}

function mostrarError(contenedor, mensaje) {
    const mensajeExpediente = contenedor.querySelector("#mensaje-expediente");

    const textoMensaje = contenedor.querySelector("#texto-mensaje-expediente");

    textoMensaje.textContent = mensaje;

    mensajeExpediente.hidden = false;
}
