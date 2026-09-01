let idExpedienteActual = null;

let cobranzasExpediente = [];

/* ─────────────────────────────────────────────
   INICIO
   ───────────────────────────────────────────── */

export async function iniciar({ contenedor, idExpediente }) {
    idExpedienteActual = idExpediente;

    const botonRegresar = contenedor.querySelector(
        "#boton-regresar-expedientes"
    );

    botonRegresar.addEventListener("click", () => {
        window.navegar("expedientes");
    });

    mostrarCarga(contenedor);

    try {
        const expediente = await obtenerExpediente(idExpedienteActual);

        cobranzasExpediente = await obtenerCobranzas(idExpedienteActual);

        renderizarExpediente(contenedor, expediente);

        configurarAcciones(contenedor, expediente);

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

async function obtenerCobranzas(idExpediente) {
    const respuesta = await fetch(`/expedientes/${idExpediente}/cobranzas`, {
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

async function descargarBitacorasZip(idExpediente) {
    const respuesta = await fetch(
        `/expedientes/${idExpediente}/bitacoras/zip`,
        {
            method: "GET",
            credentials: "include",
        }
    );

    if (!respuesta.ok) {
        const error = new Error(await mensajeDeError(respuesta));

        error.status = respuesta.status;

        throw error;
    }

    return await respuesta.blob();
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

    const estado = contenedor.querySelector("#expediente-estado");

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

    estado.textContent = textoEstado(expediente.modo_gestion);

    estado.className = `fila-expediente__estado ${claseEstado(
        expediente.modo_gestion
    )}`;

    estado.hidden = false;

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

function claseEstado(modo) {
    const clases = {
        del_dia: "fila-expediente__estado--del-dia",
        desfasado: "fila-expediente__estado--desfasado",
        consolidacion: "fila-expediente__estado--consolidacion",
        cerrado: "fila-expediente__estado--cerrado",
    };

    return clases[modo] ?? "";
}

function textoEstado(modo) {
    const textos = {
        del_dia: "Del día",
        desfasado: "Desfasado",
        consolidacion: "Consolidación",
        cerrado: "Cerrado",
    };

    return textos[modo] ?? modo;
}

/* ─────────────────────────────────────────────
   ACCIONES DEL EXPEDIENTE
   ───────────────────────────────────────────── */

function configurarAcciones(contenedor, expediente) {
    const botonDescargarBitacoras = contenedor.querySelector(
        "#boton-descargar-bitacoras"
    );

    botonDescargarBitacoras.hidden = expediente.modo_gestion !== "cerrado";

    botonDescargarBitacoras.addEventListener("click", () => {
        descargarBitacoras(contenedor);
    });
}

async function descargarBitacoras(contenedor) {
    const boton = contenedor.querySelector("#boton-descargar-bitacoras");

    const textoOriginal = boton.textContent;

    boton.disabled = true;
    boton.textContent = "Descargando…";

    try {
        const blob = await descargarBitacorasZip(idExpedienteActual);

        const url = URL.createObjectURL(blob);

        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `Bitacoras_Expediente_${idExpedienteActual}.zip`;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        URL.revokeObjectURL(url);
    } catch (error) {
        mostrarError(
            contenedor,
            error.message || "No se pudieron descargar las bitácoras."
        );
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

/* ─────────────────────────────────────────────
   DÍAS DE GESTIÓN
   ───────────────────────────────────────────── */

function renderizarDias(contenedor, diaActual) {
    const navegacion = contenedor.querySelector("#expediente-dias-navegacion");

    const dia = Number(diaActual) > 0 ? Number(diaActual) : 1;

    navegacion.innerHTML = "";

    for (let numero = 1; numero <= dia; numero++) {
        navegacion.appendChild(crearBotonDia(contenedor, numero, dia));
    }

    renderizarIntentos(contenedor, dia);
}

function crearBotonDia(contenedor, numero, diaSeleccionadoInicial) {
    const boton = document.createElement("button");

    boton.type = "button";

    boton.className = "expediente-dias__tab";

    boton.dataset.dia = numero;

    boton.textContent = `Día ${numero}`;

    boton.classList.toggle(
        "expediente-dias__tab--activo",
        numero === diaSeleccionadoInicial
    );

    boton.addEventListener("click", () => {
        seleccionarDia(contenedor, numero);
    });

    return boton;
}

function seleccionarDia(contenedor, numero) {
    contenedor
        .querySelectorAll("#expediente-dias-navegacion [data-dia]")
        .forEach((boton) => {
            boton.classList.toggle(
                "expediente-dias__tab--activo",
                Number(boton.dataset.dia) === numero
            );
        });

    renderizarIntentos(contenedor, numero);
}

/* ─────────────────────────────────────────────
   TARJETAS DE COBRANZA REGISTRADA
   ───────────────────────────────────────────── */

function renderizarIntentos(contenedor, dia) {
    const contenido = contenedor.querySelector("#expediente-dias-contenido");

    contenido.innerHTML = "";

    const cobranzasDelDia = cobranzasExpediente
        .filter((cobranza) => Number(cobranza.dia) === Number(dia))
        .sort((a, b) => Number(a.orden) - Number(b.orden));

    if (cobranzasDelDia.length === 0) {
        contenido.innerHTML = `
            <p class="u-cuerpo u-texto-terciario expediente-dias__vacio">
                No hay cobranzas registradas este día.
            </p>
        `;

        return;
    }

    cobranzasDelDia.forEach((cobranza) => {
        contenido.appendChild(crearTarjetaIntento(cobranza));
    });
}

function crearTarjetaIntento(cobranza) {
    const tarjeta = document.createElement("article");

    tarjeta.className = "intento-tarjeta intento-tarjeta--realizada";

    const resumen = document.createElement("button");

    resumen.type = "button";

    resumen.className = "intento-tarjeta__resumen";

    resumen.innerHTML = `
        <span class="intento-tarjeta__orden">
            Intento ${cobranza.orden}
        </span>

        <span class="intento-tarjeta__hora u-texto-terciario">
            ${formatearHora(cobranza.fecha)}
        </span>

        <span class="intento-tarjeta__estado intento-tarjeta__estado--realizado">
            Registrado
        </span>

        <svg
            class="intento-tarjeta__chevron"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    `;

    const cuerpo = document.createElement("div");

    cuerpo.className = "intento-tarjeta__cuerpo";

    cuerpo.hidden = true;

    cuerpo.innerHTML = plantillaVistaIntento();

    inicializarVistaIntento(cuerpo, cobranza);

    resumen.addEventListener("click", () => {
        const expandida = tarjeta.classList.toggle(
            "intento-tarjeta--expandida"
        );

        cuerpo.hidden = !expandida;
    });

    tarjeta.appendChild(resumen);
    tarjeta.appendChild(cuerpo);

    return tarjeta;
}

/* ─────────────────────────────────────────────
   VISTA DE COBRANZA (SOLO LECTURA)
   ───────────────────────────────────────────── */

const MEDIO_TEXTO = {
    llamada: "Llamada telefónica",
    whatsapp: "WhatsApp",
    correo: "Correo electrónico",
    otro: "Otro",
};

function plantillaVistaIntento() {
    return `
        <div class="intento-vista">

            <div class="intento-form__fila">

                <div class="campo campo--intento">
                    <span class="u-etiqueta u-texto-terciario">
                        Hora real de contacto
                    </span>

                    <span class="intento-vista__hora"></span>
                </div>

                <div class="campo campo--intento">
                    <span class="u-etiqueta u-texto-terciario">
                        Medio utilizado
                    </span>

                    <span class="intento-vista__medio"></span>
                </div>

            </div>

            <div class="campo campo--intento">
                <span class="u-etiqueta u-texto-terciario">
                    ¿Contactó al cliente?
                </span>

                <span class="intento-vista__contacto"></span>
            </div>

            <div class="campo campo--intento">
                <span class="u-etiqueta u-texto-terciario">
                    Comentarios / próximos pasos
                </span>

                <p class="intento-vista__comentarios"></p>
            </div>

            <div class="campo campo--intento">
                <span class="u-etiqueta u-texto-terciario">
                    Evidencias
                </span>

                <ul class="lista-evidencias intento-vista__evidencias"></ul>
            </div>

        </div>
    `;
}

function inicializarVistaIntento(cuerpo, cobranza) {
    const vista = cuerpo.querySelector(".intento-vista");

    vista.querySelector(".intento-vista__hora").textContent = formatearHora(
        cobranza.fecha
    );

    vista.querySelector(".intento-vista__medio").textContent =
        MEDIO_TEXTO[cobranza.medio] || cobranza.medio || "—";

    vista.querySelector(".intento-vista__contacto").textContent =
        cobranza.contacto ? "Sí" : "No";

    vista.querySelector(".intento-vista__comentarios").textContent =
        cobranza.comentarios || "—";

    cargarEvidenciasVista(vista, cobranza.id);
}

async function cargarEvidenciasVista(vista, idCobranza) {
    const lista = vista.querySelector(".intento-vista__evidencias");

    try {
        const respuesta = await fetch(`/cobranzas/${idCobranza}/evidencias`, {
            method: "GET",
            credentials: "include",
        });

        if (!respuesta.ok) {
            throw new Error(await mensajeDeError(respuesta));
        }

        const evidencias = await respuesta.json();

        if (evidencias.length === 0) {
            lista.innerHTML = `
                <li class="lista-evidencias__item u-texto-terciario">
                    Sin evidencias
                </li>
            `;

            return;
        }

        lista.innerHTML = "";

        evidencias.forEach((evidencia) => {
            const item = document.createElement("li");

            item.className = "lista-evidencias__item";

            item.innerHTML = `
                <span class="lista-evidencias__nombre">
                    ${evidencia.nombre_original}
                </span>

                <span class="u-texto-terciario">
                    ${
                        evidencia.tipo === "AVISO"
                            ? "Evidencia de contacto"
                            : "Respuesta"
                    }
                </span>
            `;

            lista.appendChild(item);
        });
    } catch (error) {
        lista.innerHTML = `
            <li class="lista-evidencias__item u-texto-terciario">
                No se pudieron cargar las evidencias.
            </li>
        `;
    }
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

function formatearHora(fecha) {
    return new Date(fecha).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/* ─────────────────────────────────────────────
   ESTADO DE CARGA
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