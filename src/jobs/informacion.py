import re
import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from mgc_graph import Mailbox

from src.models.cliente import Cliente
from src.models.expediente import Expediente
from src.core.almacenamiento import crear_carpeta_vencimiento, carpeta_vencimiento

logger = logging.getLogger(__name__)

ASUNTO_SUSPENSION = "Suspensión del Servicio por Incumplimiento de pago"
PATRON_CONTRATO = re.compile(r"MGC-CR-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", re.IGNORECASE)


def extraer_contrato(cuerpo: str) -> str | None:
    match = PATRON_CONTRATO.search(cuerpo)
    return match.group(0) if match else None


def obtener_cliente_por_contrato(session: Session, contrato: str) -> Cliente | None:
    stmt = select(Cliente).where(Cliente.contrato == contrato)
    return session.execute(stmt).scalar_one_or_none()


def obtener_expediente_abierto(session: Session, interlocutor: str) -> Expediente | None:
    stmt = (
        select(Expediente)
        .where(
            Expediente.interlocutor == interlocutor,
            Expediente.estado.is_(True),
            Expediente.fecha_consolidacion.is_(None)
        )
    )
    return session.execute(stmt).scalar_one_or_none()


def relacionar_correo_expediente(session: Session, mensaje: dict) -> Expediente | None:

    cuerpo = mensaje.get("body", {}).get("content", "")
    contrato = extraer_contrato(cuerpo)

    if contrato is None:
        logger.warning(
            "Correo sin contrato reconocible (asunto: '%s')",
            mensaje.get("subject")
        )
        return None

    cliente = obtener_cliente_por_contrato(session, contrato)

    if cliente is None:
        logger.warning(
            "Contrato '%s' extraído del correo no coincide con ningún cliente",
            contrato
        )
        return None

    expediente = obtener_expediente_abierto(session, cliente.interlocutor)

    if expediente is None:
        logger.warning(
            "Cliente '%s' (contrato '%s') no tiene expediente abierto",
            cliente.interlocutor,
            contrato
        )
        return None

    return expediente


def procesar_informacion(session: Session, mailbox: Mailbox) -> None:

    hoy = date.today()

    mensajes = mailbox.buscar_enviados(ASUNTO_SUSPENSION, hoy)

    for mensaje in mensajes:

        expediente = relacionar_correo_expediente(session, mensaje)

        if expediente is None:
            continue

        cliente = expediente.cliente

        crear_carpeta_vencimiento(cliente, expediente)

        destino = carpeta_vencimiento(cliente, expediente) / f"{cliente.nombre} - {expediente.fecha_incumplimiento}.eml"

        mailbox.descargar_correo(mensaje["id"], destino)