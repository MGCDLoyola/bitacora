let contenedorLista = null;

let estadoExpedientes = null;
let mensajeExpedientes = null;
let textoMensajeExpedientes = null;

let filtroExpedientes = null;

let expedientes = [];

/* ─────────────────────────────────────────────
   INICIO
   ───────────────────────────────────────────── */

export async function iniciar({ contenedor }) {
    contenedorLista = contenedor.querySelector("#lista-expedientes");

    estadoExpedientes = contenedor.querySelector("#estado-expedientes");

    mensajeExpedientes = contenedor.querySelector("#mensaje-expedientes");

    textoMensajeExpedientes = contenedor.querySelector(
        "#texto-mensaje-expedientes"
    );

    filtroExpedientes = contenedor.querySelector("#filtro-expedientes");

    filtroExpedientes.addEventListener("input", filtrar);

    await cargar();
}

/* ─────────────────────────────────────────────
   CARGA
   ───────────────────────────────────────────── */

async function cargar() {
    ocultarMensaje();
    mostrarCarga();

    try {
        const respuesta = await fetch("/expedientes", {
            method: "GET",
            credentials: "include",
        });

        if (!respuesta.ok) {
            throw new Error(await mensajeDeError(respuesta));
        }

        expedientes = await respuesta.json();

        renderizar(agrupar(expedientes));
    } catch (error) {
        mostrarError(error.message || "No se pudieron cargar los expedientes.");
    } finally {
        ocultarCarga();
    }
}

/* ─────────────────────────────────────────────
   AGRUPACIÓN POR CLIENTE
   ───────────────────────────────────────────── */

function agrupar(datos) {
    const grupos = new Map();

    datos.forEach((expediente) => {
        if (!grupos.has(expediente.interlocutor)) {
            grupos.set(expediente.interlocutor, {
                interlocutor: expediente.interlocutor,
                nombre_cliente: expediente.nombre_cliente,
                contrato: expediente.contrato,
                expedientes: [],
            });
        }

        grupos.get(expediente.interlocutor).expedientes.push(expediente);
    });

    const lista = [...grupos.values()];

    lista.forEach((grupo) => {
        grupo.expedientes.sort((a, b) =>
            String(b.fecha_incumplimiento ?? "").localeCompare(
                String(a.fecha_incumplimiento ?? "")
            )
        );
    });

    lista.sort((a, b) => a.nombre_cliente.localeCompare(b.nombre_cliente));

    return lista;
}

/* ─────────────────────────────────────────────
   FILTRO
   ───────────────────────────────────────────── */

function filtrar() {
    const texto = filtroExpedientes.value.trim().toLowerCase();

    if (!texto) {
        renderizar(agrupar(expedientes));

        return;
    }

    const filtrados = expedientes.filter((expediente) => {
        const nombre = String(expediente.nombre_cliente ?? "").toLowerCase();

        const interlocutor = String(
            expediente.interlocutor ?? ""
        ).toLowerCase();

        const contrato = String(expediente.contrato ?? "").toLowerCase();

        return (
            nombre.includes(texto) ||
            interlocutor.includes(texto) ||
            contrato.includes(texto)
        );
    });

    renderizar(agrupar(filtrados));
}

/* ─────────────────────────────────────────────
   RENDERIZADO
   ───────────────────────────────────────────── */

function renderizar(grupos) {
    if (grupos.length === 0) {
        contenedorLista.innerHTML = `
            <div class="lista-expedientes__vacio">
                <p class="u-cuerpo u-texto-terciario">
                    No se encontraron expedientes.
                </p>
            </div>
        `;

        return;
    }

    contenedorLista.innerHTML = grupos.map(crearBloqueCliente).join("");

    contenedorLista
        .querySelectorAll("[data-accion='abrir']")
        .forEach((fila) => {
            fila.addEventListener("click", manejarAbrirExpediente);

            fila.addEventListener("keydown", manejarTeclaFila);
        });
}

function crearBloqueCliente(grupo) {
    const contrato = grupo.contrato
        ? escaparHtml(grupo.contrato)
        : "Sin contrato";

    return `
        <article class="bloque-cliente">

            <div class="bloque-cliente__encabezado">

                <span class="bloque-cliente__nombre">
                    ${escaparHtml(grupo.nombre_cliente)}
                </span>

                <span class="bloque-cliente__interlocutor u-mono-sm">
                    ${escaparHtml(grupo.interlocutor)}
                </span>

                <span class="bloque-cliente__contrato u-mono-sm">
                    ${contrato}
                </span>

            </div>


            <div class="bloque-cliente__expedientes">
                ${grupo.expedientes.map(crearFilaExpediente).join("")}
            </div>

        </article>
    `;
}

function crearFilaExpediente(expediente) {
    return `
        <div
            class="fila-expediente"
            data-accion="abrir"
            data-id="${expediente.id}"
            role="button"
            tabindex="0"
        >

            <span class="fila-expediente__estado ${claseEstado(
                expediente.modo_gestion
            )}">
                ${textoEstado(expediente.modo_gestion)}
            </span>

            <span class="fila-expediente__fecha u-mono-sm">
                ${expediente.fecha_incumplimiento ?? "—"}
            </span>

            <span class="fila-expediente__monto">
                ${formatearMonto(expediente.monto_vencido)}
            </span>

            <span class="fila-expediente__responsable u-texto-terciario">
                ${
                    expediente.usuario
                        ? escaparHtml(expediente.usuario)
                        : "Sin asignar"
                }
            </span>

        </div>
    `;
}

/* ─────────────────────────────────────────────
   ESTADO DEL EXPEDIENTE
   ───────────────────────────────────────────── */

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
   ABRIR EXPEDIENTE
   ───────────────────────────────────────────── */

function manejarAbrirExpediente(event) {
    const idExpediente = Number(event.currentTarget.dataset.id);

    abrirExpediente(idExpediente);
}

function manejarTeclaFila(event) {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    event.preventDefault();

    const idExpediente = Number(event.currentTarget.dataset.id);

    abrirExpediente(idExpediente);
}

function abrirExpediente(idExpediente) {
    window.navegar("expediente_c", {
        idExpediente: idExpediente,
    });
}

/* ─────────────────────────────────────────────
   FORMATO
   ───────────────────────────────────────────── */

function formatearMonto(monto) {
    if (monto === null || monto === undefined) {
        return "—";
    }

    const numero = Number(monto);

    if (Number.isNaN(numero)) {
        return "—";
    }

    return numero.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });
}

/* ─────────────────────────────────────────────
   ESTADO DE CARGA
   ───────────────────────────────────────────── */

function mostrarCarga() {
    estadoExpedientes.hidden = false;
}

function ocultarCarga() {
    estadoExpedientes.hidden = true;
}

function mostrarError(mensaje) {
    textoMensajeExpedientes.textContent = mensaje;

    mensajeExpedientes.hidden = false;
}

function ocultarMensaje() {
    textoMensajeExpedientes.textContent = "";

    mensajeExpedientes.hidden = true;
}

/* ─────────────────────────────────────────────
   ERRORES HTTP
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
   HTML
   ───────────────────────────────────────────── */

function escaparHtml(valor) {
    const elemento = document.createElement("div");

    elemento.textContent = valor ?? "";

    return elemento.innerHTML;
}
