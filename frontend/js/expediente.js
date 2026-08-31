let usuarioSesion = null;
let idExpedienteActual = null;
let usuarioAsignadoExpediente = null;

let diaSeleccionado = null;
let diaActualExpediente = null;
let modoGestionExpediente = null;

let cobranzasExpediente = [];

let bitacorasCierre = [];
let indiceBitacoraCierre = 0;

const HORA_INTENTO = {
    1: 9,
    2: 13,
    3: 16,
};

const RESULTADO_CONTACTO = {
    si: [
        { valor: "confirmo_pago", texto: "Contestó y confirmó pago" },
        { valor: "prorroga", texto: "Contestó y solicitó prórroga" },
        { valor: "no_reconoce", texto: "Contestó, no reconoce adeudo" },
        {
            valor: "otro_horario",
            texto: "Cliente indica que llame en otro horario",
        },
        { valor: "otro", texto: "Otro (especificar en comentarios)" },
    ],
    no: [
        { valor: "buzon", texto: "Buzón de voz" },
        { valor: "numero_erroneo", texto: "Número inexistente / erróneo" },
        { valor: "otro", texto: "Otro (especificar en comentarios)" },
    ],
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

        cobranzasExpediente = await obtenerCobranzas(idExpedienteActual);

        renderizarExpediente(contenedor, expediente);

        usuarioAsignadoExpediente = expediente.usuario;

        configurarAcciones(contenedor, expediente);

        renderizarDias(
            contenedor,
            expediente.dia_actual,
            expediente.modo_gestion
        );
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

async function obtenerVistaPreviaCierre(idExpediente) {
    const respuesta = await fetch(
        `/expedientes/${idExpediente}/cierre/vista-previa`,
        {
            method: "POST",
            credentials: "include",
        }
    );

    if (!respuesta.ok) {
        const error = new Error(await mensajeDeError(respuesta));

        error.status = respuesta.status;

        throw error;
    }

    return await respuesta.json();
}

async function confirmarCierreExpediente(idExpediente) {
    const respuesta = await fetch(
        `/expedientes/${idExpediente}/cierre/confirmar`,
        {
            method: "POST",
            credentials: "include",
        }
    );

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

    const botonCerrarExpediente = contenedor.querySelector(
        "#boton-cerrar-expediente"
    );

    const modalCerrar = contenedor.querySelector("#modal-cerrar-expediente");

    const puedeCerrar =
        puedeGestionarExpediente() && expediente.modo_gestion !== "cerrado";

    if (!puedeCerrar) {
        // El modal solo existe en el DOM cuando el usuario en
        // sesión es el asignado al expediente (y este sigue abierto).
        modalCerrar.remove();

        return;
    }

    botonCerrarExpediente.hidden = false;

    botonCerrarExpediente.addEventListener("click", () => {
        abrirModalCerrar(contenedor);
    });

    configurarModalCerrar(contenedor);
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
   MODAL: CERRAR Y FIRMAR
   ───────────────────────────────────────────── */

function configurarModalCerrar(contenedor) {
    const modal = contenedor.querySelector("#modal-cerrar-expediente");

    const botonIrAPerfil = contenedor.querySelector("#boton-ir-a-perfil");

    const botonConfirmarCierre = contenedor.querySelector(
        "#boton-confirmar-cierre"
    );

    const botonReintentarPrevia = contenedor.querySelector(
        "#boton-reintentar-vista-previa"
    );

    const flechaAnterior = contenedor.querySelector(
        "#carrusel-bitacoras-anterior"
    );

    const flechaSiguiente = contenedor.querySelector(
        "#carrusel-bitacoras-siguiente"
    );

    modal.querySelectorAll("[data-cerrar-modal-cierre]").forEach((elemento) => {
        elemento.addEventListener("click", () => {
            cerrarModalCerrar(contenedor);
        });
    });

    botonIrAPerfil.addEventListener("click", () => {
        window.navegar("perfil");
    });

    botonReintentarPrevia.addEventListener("click", () => {
        cargarVistaPreviaCierre(contenedor);
    });

    flechaAnterior.addEventListener("click", () => {
        irABitacoraAnterior(contenedor);
    });

    flechaSiguiente.addEventListener("click", () => {
        irABitacoraSiguiente(contenedor);
    });

    botonConfirmarCierre.addEventListener("click", () => {
        confirmarCierre(contenedor);
    });

    configurarSwipeCarrusel(contenedor);

    document.addEventListener("keydown", (evento) => {
        manejarTecladoCarrusel(contenedor, evento);
    });
}

function abrirModalCerrar(contenedor) {
    const modal = contenedor.querySelector("#modal-cerrar-expediente");

    const bloqueSinFirma = contenedor.querySelector("#modal-cerrar-sin-firma");

    const bloqueConFirma = contenedor.querySelector("#modal-cerrar-con-firma");

    const tieneFirma = Boolean(usuarioSesion.firma);

    bloqueSinFirma.hidden = tieneFirma;
    bloqueConFirma.hidden = !tieneFirma;

    modal.hidden = false;

    if (!tieneFirma) {
        contenedor.querySelector("#boton-ir-a-perfil").focus();

        return;
    }

    ocultarErrorConfirmar(contenedor);

    cargarVistaPreviaCierre(contenedor);

    contenedor.querySelector("#boton-confirmar-cierre").focus();
}

function cerrarModalCerrar(contenedor) {
    const modal = contenedor.querySelector("#modal-cerrar-expediente");

    modal.hidden = true;
}

/* ─────────────────────────────────────────────
   CARRUSEL DE VISTA PREVIA (CIERRE)
   ───────────────────────────────────────────── */

async function cargarVistaPreviaCierre(contenedor) {
    ocultarErrorPrevia(contenedor);
    ocultarCarrusel(contenedor);

    deshabilitarConfirmarCierre(contenedor, true);

    mostrarCargaPrevia(contenedor);

    try {
        bitacorasCierre = await obtenerVistaPreviaCierre(idExpedienteActual);

        indiceBitacoraCierre = 0;

        mostrarCarrusel(contenedor);
        renderizarSlideCarrusel(contenedor);

        deshabilitarConfirmarCierre(contenedor, false);
    } catch (error) {
        mostrarErrorPrevia(
            contenedor,
            error.message || "No se pudo generar la vista previa."
        );
    } finally {
        ocultarCargaPrevia(contenedor);
    }
}

function renderizarSlideCarrusel(contenedor) {
    const titulo = contenedor.querySelector("#carrusel-bitacoras-titulo");

    const visorPdf = contenedor.querySelector("#carrusel-bitacoras-pdf");

    const flechaAnterior = contenedor.querySelector(
        "#carrusel-bitacoras-anterior"
    );

    const flechaSiguiente = contenedor.querySelector(
        "#carrusel-bitacoras-siguiente"
    );

    const bitacora = bitacorasCierre[indiceBitacoraCierre];

    titulo.textContent = `Bitácora ${bitacora.dia}`;

    visorPdf.src = bitacora.pdf_base64;

    const haySoloUna = bitacorasCierre.length <= 1;

    flechaAnterior.hidden = haySoloUna;
    flechaSiguiente.hidden = haySoloUna;
}

function irABitacoraAnterior(contenedor) {
    if (bitacorasCierre.length <= 1) {
        return;
    }

    indiceBitacoraCierre =
        (indiceBitacoraCierre - 1 + bitacorasCierre.length) %
        bitacorasCierre.length;

    renderizarSlideCarrusel(contenedor);
}

function irABitacoraSiguiente(contenedor) {
    if (bitacorasCierre.length <= 1) {
        return;
    }

    indiceBitacoraCierre = (indiceBitacoraCierre + 1) % bitacorasCierre.length;

    renderizarSlideCarrusel(contenedor);
}

function manejarTecladoCarrusel(contenedor, evento) {
    const modal = contenedor.querySelector("#modal-cerrar-expediente");

    if (!modal || modal.hidden) {
        return;
    }

    const carrusel = contenedor.querySelector("#modal-cerrar-carrusel");

    if (carrusel.hidden || bitacorasCierre.length <= 1) {
        return;
    }

    if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        irABitacoraAnterior(contenedor);
    } else if (evento.key === "ArrowRight") {
        evento.preventDefault();
        irABitacoraSiguiente(contenedor);
    }
}

function configurarSwipeCarrusel(contenedor) {
    const marco = contenedor.querySelector("#carrusel-bitacoras-marco");

    const UMBRAL_SWIPE = 40;

    let xInicial = null;

    marco.addEventListener(
        "touchstart",
        (evento) => {
            xInicial = evento.touches[0].clientX;
        },
        { passive: true }
    );

    marco.addEventListener("touchend", (evento) => {
        if (xInicial === null) {
            return;
        }

        const delta = evento.changedTouches[0].clientX - xInicial;

        if (delta > UMBRAL_SWIPE) {
            irABitacoraAnterior(contenedor);
        } else if (delta < -UMBRAL_SWIPE) {
            irABitacoraSiguiente(contenedor);
        }

        xInicial = null;
    });
}

/* ─────────────────────────────────────────────
   CONFIRMAR CIERRE
   ───────────────────────────────────────────── */

async function confirmarCierre(contenedor) {
    const boton = contenedor.querySelector("#boton-confirmar-cierre");

    const textoOriginal = boton.textContent;

    ocultarErrorConfirmar(contenedor);

    boton.disabled = true;
    boton.textContent = "Cerrando...";

    try {
        await confirmarCierreExpediente(idExpedienteActual);

        cerrarModalCerrar(contenedor);

        modoGestionExpediente = "cerrado";

        contenedor.querySelector("#boton-cerrar-expediente").hidden = true;

        contenedor.querySelector("#modal-cerrar-expediente").remove();

        renderizarDias(contenedor, diaActualExpediente, "cerrado");
    } catch (error) {
        mostrarErrorConfirmar(
            contenedor,
            error.message || "No se pudo confirmar el cierre."
        );
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

/* ─────────────────────────────────────────────
   ESTADOS DEL MODAL DE CIERRE
   ───────────────────────────────────────────── */

function mostrarCargaPrevia(contenedor) {
    contenedor.querySelector("#modal-cerrar-carga-previa").hidden = false;
}

function ocultarCargaPrevia(contenedor) {
    contenedor.querySelector("#modal-cerrar-carga-previa").hidden = true;
}

function mostrarCarrusel(contenedor) {
    contenedor.querySelector("#modal-cerrar-carrusel").hidden = false;
}

function ocultarCarrusel(contenedor) {
    contenedor.querySelector("#modal-cerrar-carrusel").hidden = true;
}

function deshabilitarConfirmarCierre(contenedor, deshabilitado) {
    contenedor.querySelector("#boton-confirmar-cierre").disabled =
        deshabilitado;
}

function mostrarErrorPrevia(contenedor, mensaje) {
    contenedor.querySelector(
        "#modal-cerrar-error-previa-texto"
    ).textContent = mensaje;

    contenedor.querySelector("#modal-cerrar-error-previa").hidden = false;
}

function ocultarErrorPrevia(contenedor) {
    contenedor.querySelector("#modal-cerrar-error-previa").hidden = true;
}

function mostrarErrorConfirmar(contenedor, mensaje) {
    contenedor.querySelector(
        "#modal-cerrar-error-confirmar-texto"
    ).textContent = mensaje;

    contenedor.querySelector("#modal-cerrar-error-confirmar").hidden = false;
}

function ocultarErrorConfirmar(contenedor) {
    contenedor.querySelector("#modal-cerrar-error-confirmar").hidden = true;
}

/* ─────────────────────────────────────────────
   DÍAS DE GESTIÓN
   ───────────────────────────────────────────── */

function renderizarDias(contenedor, diaActual, modoGestion) {
    const navegacion = contenedor.querySelector("#expediente-dias-navegacion");

    const contenido = contenedor.querySelector("#expediente-dias-contenido");

    const dia = Number(diaActual) > 0 ? Number(diaActual) : 1;

    diaActualExpediente = dia;
    diaSeleccionado = dia;
    modoGestionExpediente = modoGestion;

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
    const cobranza = obtenerCobranza(dia, orden);

    const realizada = Boolean(cobranza);

    const bloqueada =
        !realizada &&
        (
            !puedeGestionarExpediente() ||
            calcularBloqueo(dia, orden)
        );

    const tarjeta = document.createElement("article");

    tarjeta.className = "intento-tarjeta";

    tarjeta.classList.toggle("intento-tarjeta--bloqueada", bloqueada);

    tarjeta.classList.toggle("intento-tarjeta--realizada", realizada);

    const resumen = document.createElement("button");

    resumen.type = "button";

    resumen.className = "intento-tarjeta__resumen";

    resumen.disabled = bloqueada;

    let textoEstado = "Pendiente";
    let claseEstado = "intento-tarjeta__estado--pendiente";

    if (bloqueada) {
        textoEstado = "Bloqueado";
        claseEstado = "intento-tarjeta__estado--bloqueado";
    } else if (realizada) {
        textoEstado = "Realizado";
        claseEstado = "intento-tarjeta__estado--realizado";
    }

    resumen.innerHTML = `
    <span class="intento-tarjeta__orden">
      Intento ${orden}
    </span>

    <span class="intento-tarjeta__hora u-texto-terciario">
      ${HORA_INTENTO[orden]}:00 hrs
    </span>

    <span class="intento-tarjeta__estado ${claseEstado}">
      ${textoEstado}
    </span>

    ${
        !bloqueada
            ? `
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
        `
            : ""
    }
  `;

    const cuerpo = document.createElement("div");

    cuerpo.className = "intento-tarjeta__cuerpo";

    cuerpo.hidden = true;

    if (!bloqueada) {
        if (realizada) {
            cuerpo.innerHTML = plantillaVistaIntento();

            inicializarVistaIntento(cuerpo, tarjeta, cobranza, dia, orden);
        } else {
            cuerpo.innerHTML = plantillaFormularioIntento();

            inicializarFormularioIntento(cuerpo, tarjeta, dia, orden);
        }

        resumen.addEventListener("click", () => {
            const expandida = tarjeta.classList.toggle(
                "intento-tarjeta--expandida"
            );

            cuerpo.hidden = !expandida;
        });
    }

    tarjeta.appendChild(resumen);

    if (!bloqueada) {
        tarjeta.appendChild(cuerpo);
    }

    return tarjeta;
}

/* ─────────────────────────────────────────────
   VISTA DE INTENTO REALIZADO
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

      <div class="intento-vista__acciones"></div>

    </div>
  `;
}

function inicializarVistaIntento(cuerpo, tarjeta, cobranza, dia, orden) {
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

    const acciones = vista.querySelector(".intento-vista__acciones");

    if (usuarioAsignadoExpediente === usuarioSesion.nombre) {
        const botonEditar = document.createElement("button");

        botonEditar.type = "button";

        botonEditar.className = "boton intento-vista__editar";

        botonEditar.textContent = "Editar";

        botonEditar.addEventListener("click", () => {
            cuerpo.innerHTML = plantillaFormularioIntento();

            inicializarFormularioIntento(cuerpo, tarjeta, dia, orden, {
                modo: "editar",
                cobranza,
                alCancelar: () => {
                    cuerpo.innerHTML = plantillaVistaIntento();

                    inicializarVistaIntento(
                        cuerpo,
                        tarjeta,
                        cobranza,
                        dia,
                        orden
                    );
                },
            });
        });

        acciones.appendChild(botonEditar);
    }
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
          ${evidencia.tipo === "AVISO" ? "Evidencia de contacto" : "Respuesta"}
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

function formatearHora(fecha) {
    return new Date(fecha).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/* ─────────────────────────────────────────────
   COBRANZAS EXISTENTES
   ───────────────────────────────────────────── */

function obtenerCobranza(dia, orden) {
    return cobranzasExpediente.find((cobranza) => {
        const diaCobranza = Number(cobranza.dia);

        const ordenCobranza = Number(cobranza.orden);

        return diaCobranza === Number(dia) && ordenCobranza === Number(orden);
    });
}

/* ─────────────────────────────────────────────
   FORMULARIO
   ───────────────────────────────────────────── */

function plantillaFormularioIntento() {
    return `
    <form class="intento-form" novalidate>

      <div class="intento-form__fila">

        <div class="campo campo--intento">
          <label class="u-etiqueta u-texto-terciario">
            Hora real de contacto
          </label>

          <input
            type="time"
            class="intento-form__hora"
            required
          />
        </div>

        <div class="campo campo--intento">
          <label class="u-etiqueta u-texto-terciario">
            Medio utilizado
          </label>

          <select
            class="intento-form__medio"
            required
          >
            <option
              value=""
              disabled
              selected
            >
              Selecciona…
            </option>

            <option value="llamada">
              Llamada telefónica
            </option>

            <option value="whatsapp">
              WhatsApp
            </option>

            <option value="correo">
              Correo electrónico
            </option>

            <option value="otro">
              Otro
            </option>
          </select>
        </div>

      </div>

      <div class="campo campo--intento">

        <span class="u-etiqueta u-texto-terciario">
          ¿Contactó al cliente?
        </span>

        <div
          class="alternar-contacto"
          role="radiogroup"
        >
          <button
            type="button"
            class="alternar-contacto__opcion alternar-contacto__opcion--si"
            data-valor="si"
          >
            Sí
          </button>

          <button
            type="button"
            class="alternar-contacto__opcion alternar-contacto__opcion--no"
            data-valor="no"
          >
            No
          </button>
        </div>

        <div
          class="resultado-contacto"
          hidden
        >
          <span class="u-etiqueta u-texto-terciario resultado-contacto__titulo">
            Resultado
          </span>

          <div
            class="resultado-contacto__opciones"
            role="radiogroup"
          ></div>
        </div>

      </div>

      <div class="campo campo--intento">

        <label class="u-etiqueta u-texto-terciario">
          Comentarios / próximos pasos
        </label>

        <textarea
          class="intento-form__comentarios"
          rows="3"
          placeholder="Escribe lo ocurrido y los próximos pasos…"
        ></textarea>

      </div>

      <div class="campo campo--intento">

        <span class="u-etiqueta u-texto-terciario">
          Evidencias
        </span>

        <div class="evidencia-modulo">

          <span class="u-etiqueta u-texto-terciario">
            Evidencia de contacto
          </span>

          <label class="zona-evidencias">

            <input
              type="file"
              class="zona-evidencias__input evidencia-contacto__input"
              multiple
              hidden
              accept=".pdf,.jpg,.jpeg,.png,.eml,.msg"
            />

            <svg
              class="zona-evidencias__icono"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 3v10m0-10 4 4m-4-4-4 4M4 15v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <span class="zona-evidencias__texto">
              Arrastra archivos aquí o haz clic para subir
            </span>

          </label>

          <ul class="lista-evidencias evidencia-contacto__lista"></ul>

        </div>

        <div class="evidencia-modulo">

          <span class="u-etiqueta u-texto-terciario">
            Respuesta
          </span>

          <label class="zona-evidencias">

            <input
              type="file"
              class="zona-evidencias__input evidencia-respuesta__input"
              multiple
              hidden
              accept=".pdf,.jpg,.jpeg,.png,.eml,.msg"
            />

            <svg
              class="zona-evidencias__icono"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 3v10m0-10 4 4m-4-4-4 4M4 15v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <span class="zona-evidencias__texto">
              Arrastra archivos aquí o haz clic para subir
            </span>

          </label>

          <ul class="lista-evidencias evidencia-respuesta__lista"></ul>

        </div>

      </div>

      <div
        class="intento-form__mensaje mensaje-error"
        role="alert"
        hidden
      >
        <span class="mensaje-error__sello">
          Error
        </span>

        <span class="intento-form__mensaje-texto"></span>
      </div>

      <div class="intento-form__acciones">

        <button
          type="button"
          class="boton-borrar"
        >
          Borrar todo
        </button>

        <button
          type="submit"
          class="boton intento-form__enviar"
        >
          Registrar intento
        </button>

      </div>

    </form>
  `;
}

function inicializarFormularioIntento(
    cuerpo,
    tarjeta,
    dia,
    orden,
    opciones = {}
) {
    const { modo = "crear", cobranza = null, alCancelar = null } = opciones;

    const formulario = cuerpo.querySelector(".intento-form");

    const entradaHora = formulario.querySelector(".intento-form__hora");

    const selectMedio = formulario.querySelector(".intento-form__medio");

    const opcionesContacto = formulario.querySelectorAll(
        ".alternar-contacto__opcion"
    );

    const contenedorResultado = formulario.querySelector(".resultado-contacto");

    const opcionesResultadoContenedor = formulario.querySelector(
        ".resultado-contacto__opciones"
    );

    const textareaComentarios = formulario.querySelector(
        ".intento-form__comentarios"
    );

    const botonBorrar = formulario.querySelector(".boton-borrar");

    const botonEnviar = formulario.querySelector(".intento-form__enviar");

    if (modo === "editar") {
        botonEnviar.textContent = "Guardar cambios";

        const botonCancelar = document.createElement("button");

        botonCancelar.type = "button";

        botonCancelar.className = "boton-borrar";

        botonCancelar.textContent = "Cancelar";

        botonCancelar.addEventListener("click", () => {
            if (alCancelar) alCancelar();
        });

        formulario
            .querySelector(".intento-form__acciones")
            .prepend(botonCancelar);
    }

    const mensaje = formulario.querySelector(".intento-form__mensaje");

    const mensajeTexto = formulario.querySelector(
        ".intento-form__mensaje-texto"
    );

    const entradaEvidenciaContacto = formulario.querySelector(
        ".evidencia-contacto__input"
    );

    const zonaEvidenciaContacto =
        entradaEvidenciaContacto.closest(".zona-evidencias");

    const listaEvidenciaContacto = formulario.querySelector(
        ".evidencia-contacto__lista"
    );

    const entradaEvidenciaRespuesta = formulario.querySelector(
        ".evidencia-respuesta__input"
    );

    const zonaEvidenciaRespuesta =
        entradaEvidenciaRespuesta.closest(".zona-evidencias");

    const listaEvidenciaRespuesta = formulario.querySelector(
        ".evidencia-respuesta__lista"
    );

    let contactoSeleccionado = null;
    let resultadoSeleccionado = null;

    let archivosEvidenciaContacto = [];
    let archivosEvidenciaRespuesta = [];

    /* ─────────────────────────────────────────
     CONTACTO
     ───────────────────────────────────────── */

    opcionesContacto.forEach((boton) => {
        boton.addEventListener("click", () => {
            contactoSeleccionado = boton.dataset.valor;

            opcionesContacto.forEach((otro) => {
                otro.classList.toggle(
                    "alternar-contacto__opcion--activa",
                    otro === boton
                );
            });

            renderizarOpcionesResultado(contactoSeleccionado);
        });
    });

    function renderizarOpcionesResultado(valor) {
        resultadoSeleccionado = null;

        opcionesResultadoContenedor.innerHTML = "";

        RESULTADO_CONTACTO[valor].forEach((opcion) => {
            const boton = document.createElement("button");

            boton.type = "button";

            boton.className = "resultado-contacto__opcion";

            boton.dataset.valor = opcion.valor;

            boton.textContent = opcion.texto;

            boton.addEventListener("click", () => {
                resultadoSeleccionado = opcion.valor;

                opcionesResultadoContenedor
                    .querySelectorAll(".resultado-contacto__opcion")
                    .forEach((otro) => {
                        otro.classList.toggle(
                            "resultado-contacto__opcion--activa",
                            otro === boton
                        );
                    });
            });

            opcionesResultadoContenedor.appendChild(boton);
        });

        contenedorResultado.hidden = false;
    }

    /* ─────────────────────────────────────────
     EVIDENCIAS
     ───────────────────────────────────────── */

    configurarZonaEvidencia(
        zonaEvidenciaContacto,
        entradaEvidenciaContacto,
        listaEvidenciaContacto,
        (archivos) => {
            archivosEvidenciaContacto = archivos;
        },
        () => archivosEvidenciaContacto
    );

    configurarZonaEvidencia(
        zonaEvidenciaRespuesta,
        entradaEvidenciaRespuesta,
        listaEvidenciaRespuesta,
        (archivos) => {
            archivosEvidenciaRespuesta = archivos;
        },
        () => archivosEvidenciaRespuesta
    );

    /* ─────────────────────────────────────────
     PRECARGA (MODO EDITAR)
     ───────────────────────────────────────── */

    if (modo === "editar" && cobranza) {
        entradaHora.value = formatearHora(cobranza.fecha);

        selectMedio.value = cobranza.medio || "";

        contactoSeleccionado = cobranza.contacto ? "si" : "no";

        opcionesContacto.forEach((boton) => {
            boton.classList.toggle(
                "alternar-contacto__opcion--activa",
                boton.dataset.valor === contactoSeleccionado
            );
        });

        renderizarOpcionesResultado(contactoSeleccionado);

        textareaComentarios.value = cobranza.comentarios || "";
    }

    /* ─────────────────────────────────────────
     BORRAR
     ───────────────────────────────────────── */

    botonBorrar.addEventListener("click", () => {
        formulario.reset();

        contactoSeleccionado = null;
        resultadoSeleccionado = null;

        archivosEvidenciaContacto = [];
        archivosEvidenciaRespuesta = [];

        opcionesContacto.forEach((boton) => {
            boton.classList.remove("alternar-contacto__opcion--activa");
        });

        contenedorResultado.hidden = true;

        opcionesResultadoContenedor.innerHTML = "";

        listaEvidenciaContacto.innerHTML = "";

        listaEvidenciaRespuesta.innerHTML = "";

        ocultarMensajeFormulario();
    });

    /* ─────────────────────────────────────────
     REGISTRAR
     ───────────────────────────────────────── */

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        ocultarMensajeFormulario();

        if (modo === "crear" && obtenerCobranza(dia, orden)) {
            mostrarMensajeFormulario("Este intento ya fue registrado.");

            return;
        }

        if (!contactoSeleccionado) {
            mostrarMensajeFormulario("Indica si se contactó al cliente.");

            return;
        }

        if (!resultadoSeleccionado) {
            mostrarMensajeFormulario("Selecciona un resultado.");

            return;
        }

        const datos = {
            dia,
            orden,
            hora: entradaHora.value,
            medio: selectMedio.value,
            contacto: contactoSeleccionado === "si",
            comentarios: construirComentarios(
                resultadoSeleccionado,
                textareaComentarios.value
            ),
        };

        botonEnviar.disabled = true;
        botonEnviar.textContent =
            modo === "editar" ? "Guardando…" : "Registrando…";

        try {
            const url =
                modo === "editar"
                    ? `/cobranzas/${cobranza.id}`
                    : `/expedientes/${idExpedienteActual}/cobranzas`;

            const respuesta = await fetch(url, {
                method: modo === "editar" ? "PATCH" : "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(datos),
            });

            if (!respuesta.ok) {
                throw new Error(await mensajeDeError(respuesta));
            }

            const cobranzaGuardada = await respuesta.json();

            if (modo === "editar") {
                const indice = cobranzasExpediente.findIndex(
                    (item) => item.id === cobranzaGuardada.id
                );

                if (indice !== -1) {
                    cobranzasExpediente[indice] = cobranzaGuardada;
                }
            } else {
                cobranzasExpediente.push(cobranzaGuardada);
            }

            for (const archivo of archivosEvidenciaContacto) {
                await subirEvidencia(cobranzaGuardada.id, archivo, "AVISO");
            }

            for (const archivo of archivosEvidenciaRespuesta) {
                await subirEvidencia(cobranzaGuardada.id, archivo, "RESPUESTA");
            }

            if (modo === "editar") {
                cuerpo.innerHTML = plantillaVistaIntento();

                inicializarVistaIntento(
                    cuerpo,
                    tarjeta,
                    cobranzaGuardada,
                    dia,
                    orden
                );
            } else {
                marcarIntentoRealizado(tarjeta);
            }
        } catch (error) {
            mostrarMensajeFormulario(
                error.message || "No se pudo completar la operación."
            );
        } finally {
            botonEnviar.disabled = false;
            botonEnviar.textContent =
                modo === "editar" ? "Guardar cambios" : "Registrar intento";
        }
    });

    function mostrarMensajeFormulario(texto) {
        mensajeTexto.textContent = texto;

        mensaje.hidden = false;
    }

    function ocultarMensajeFormulario() {
        mensaje.hidden = true;
    }

    async function subirEvidencia(idCobranza, archivo, tipo) {
        const datos = new FormData();

        datos.append("tipo", tipo);

        datos.append("archivo", archivo);

        const respuesta = await fetch(`/cobranzas/${idCobranza}/evidencias`, {
            method: "POST",
            credentials: "include",
            body: datos,
        });

        if (!respuesta.ok) {
            throw new Error(await mensajeDeError(respuesta));
        }
    }
}

/* ─────────────────────────────────────────────
   EVIDENCIAS
   ───────────────────────────────────────────── */

function configurarZonaEvidencia(
    zona,
    entrada,
    lista,
    guardarArchivos,
    obtenerArchivos
) {
    zona.addEventListener("dragover", (evento) => {
        evento.preventDefault();

        zona.classList.add("zona-evidencias--activa");
    });

    zona.addEventListener("dragleave", () => {
        zona.classList.remove("zona-evidencias--activa");
    });

    zona.addEventListener("drop", (evento) => {
        evento.preventDefault();

        zona.classList.remove("zona-evidencias--activa");

        agregarArchivos(evento.dataTransfer.files);
    });

    entrada.addEventListener("change", () => {
        agregarArchivos(entrada.files);

        entrada.value = "";
    });

    function agregarArchivos(listaArchivos) {
        const archivos = obtenerArchivos();

        Array.from(listaArchivos).forEach((archivo) => {
            archivos.push(archivo);
        });

        guardarArchivos(archivos);

        renderizarArchivos();
    }

    function renderizarArchivos() {
        lista.innerHTML = "";

        obtenerArchivos().forEach((archivo, indice) => {
            const item = document.createElement("li");

            item.className = "lista-evidencias__item";

            item.innerHTML = `
        <span class="lista-evidencias__nombre">
          ${archivo.name}
        </span>

        <span class="lista-evidencias__peso">
          ${formatearPeso(archivo.size)}
        </span>

        <button
          type="button"
          class="lista-evidencias__quitar"
          aria-label="Quitar archivo"
        >
          &times;
        </button>
      `;

            item.querySelector(".lista-evidencias__quitar").addEventListener(
                "click",
                () => {
                    const archivos = obtenerArchivos();

                    archivos.splice(indice, 1);

                    guardarArchivos(archivos);

                    renderizarArchivos();
                }
            );

            lista.appendChild(item);
        });
    }
}

/* ─────────────────────────────────────────────
   COMENTARIOS
   ───────────────────────────────────────────── */

function construirComentarios(resultado, comentarios) {
    const textoComentarios = comentarios.trim();

    if (resultado === "otro") {
        return textoComentarios;
    }

    const opcion = Object.values(RESULTADO_CONTACTO)
        .flat()
        .find((item) => item.valor === resultado);

    if (!opcion) {
        return textoComentarios;
    }

    if (!textoComentarios) {
        return `${opcion.texto}:`;
    }

    return `${opcion.texto}:\n\n${textoComentarios}`;
}

/* ─────────────────────────────────────────────
   ESTADO DE TARJETA
   ───────────────────────────────────────────── */

function marcarIntentoRealizado(tarjeta) {
    const estado = tarjeta.querySelector(".intento-tarjeta__estado");

    estado.textContent = "Realizado";

    estado.className =
        "intento-tarjeta__estado intento-tarjeta__estado--realizado";

    tarjeta.classList.remove("intento-tarjeta--expandida");

    tarjeta.classList.add("intento-tarjeta--realizada");

    const cuerpo = tarjeta.querySelector(".intento-tarjeta__cuerpo");

    if (cuerpo) {
        cuerpo.hidden = true;
    }

    const resumen = tarjeta.querySelector(".intento-tarjeta__resumen");

    if (resumen) {
        resumen.disabled = true;
    }

    const chevron = tarjeta.querySelector(".intento-tarjeta__chevron");

    if (chevron) {
        chevron.remove();
    }
}

/* ─────────────────────────────────────────────
   BLOQUEO
   ───────────────────────────────────────────── */

function calcularBloqueo(dia, orden) {
    /*
     * Días anteriores:
     * los intentos están disponibles para consulta.
     */
    if (dia < diaActualExpediente) {
        return false;
    }

    /*
     * Días futuros:
     * completamente bloqueados.
     */
    if (dia > diaActualExpediente) {
        return true;
    }

    /*
     * El bloqueo por hora solamente aplica
     * a la gestión del día.
     */
    if (modoGestionExpediente !== "del_dia") {
        return false;
    }

    /*
     * Día actual de gestión:
     * cada intento se habilita a partir
     * de su hora correspondiente.
     */
    return new Date().getHours() < HORA_INTENTO[orden];
}

function puedeGestionarExpediente() {
    return usuarioAsignadoExpediente === usuarioSesion.nombre;
}

/* ─────────────────────────────────────────────
   FORMATO
   ───────────────────────────────────────────── */

function formatearPeso(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

    if (respuesta.status === 422) {
        return "Los datos enviados no son válidos.";
    }

    return "No se pudo completar la solicitud.";
}

function mostrarError(contenedor, mensaje) {
    const mensajeExpediente = contenedor.querySelector("#mensaje-expediente");

    const textoMensaje = contenedor.querySelector("#texto-mensaje-expediente");

    textoMensaje.textContent = mensaje;

    mensajeExpediente.hidden = false;
}