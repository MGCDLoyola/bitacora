import logging
import re
import uuid
from datetime import date

from mgc_graph import Mailbox
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.almacenamiento import carpeta_vencimiento, crear_carpeta_vencimiento
from src.models.cliente import Cliente
from src.models.documento import Documento
from src.models.expediente import Expediente
from src.models.tipo_documento import TipoDocumento

logger = logging.getLogger(__name__)

ASUNTO_SUSPENSION = "Suspensión del Servicio por Incumplimiento de pago"
PATRON_CONTRATO = re.compile(r"MGC-CR-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", re.IGNORECASE)
TIPO_DOCUMENTO_INFORMACION = "Prueba de Vencimiento"


def extraer_contrato(cuerpo: str) -> str | None:
    match = PATRON_CONTRATO.search(cuerpo)
    return match.group(0) if match else None


def obtener_cliente_por_contrato(session: Session, contrato: str) -> Cliente | None:
    stmt = select(Cliente).where(Cliente.contrato == contrato)
    return session.execute(stmt).scalar_one_or_none()


def obtener_expediente_abierto(
    session: Session, interlocutor: str
) -> Expediente | None:
    stmt = select(Expediente).where(
        Expediente.interlocutor == interlocutor,
        Expediente.estado.is_(True),
        Expediente.fecha_consolidacion.is_(None),
    )
    return session.execute(stmt).scalar_one_or_none()


def relacionar_correo_expediente(session: Session, mensaje: dict) -> Expediente | None:

    cuerpo = mensaje.get("body", {}).get("content", "")
    contrato = extraer_contrato(cuerpo)

    if contrato is None:
        logger.warning(
            "Correo sin contrato reconocible (asunto: '%s')", mensaje.get("subject")
        )
        return None

    cliente = obtener_cliente_por_contrato(session, contrato)

    if cliente is None:
        logger.warning(
            "Contrato '%s' extraído del correo no coincide con ningún cliente", contrato
        )
        return None

    expediente = obtener_expediente_abierto(session, cliente.interlocutor)

    if expediente is None:
        logger.warning(
            "Cliente '%s' (contrato '%s') no tiene expediente abierto",
            cliente.interlocutor,
            contrato,
        )
        return None

    return expediente


def obtener_tipo_documento_informacion(session: Session) -> TipoDocumento | None:
    stmt = select(TipoDocumento).where(
        TipoDocumento.nombre == TIPO_DOCUMENTO_INFORMACION
    )
    return session.execute(stmt).scalar_one_or_none()


def registrar_documento_informacion(
    session: Session,
    expediente: Expediente,
    uuid_archivo: uuid.UUID,
    ruta_archivo,
    nombre_original: str,
    id_tipo_documento: int,
) -> Documento | None:

    if expediente.id_usuario is None:
        logger.warning(
            "Expediente '%s' sin usuario asignado, no se registra el documento en Documentos",
            expediente.interlocutor,
        )
        return None

    documento = Documento(
        id_expediente=expediente.id,
        id_usuario=expediente.id_usuario,
        id_tipo_documento=id_tipo_documento,
        uuid_archivo=uuid_archivo,
        nombre_original=nombre_original,
        ruta_archivo=str(ruta_archivo),
    )

    session.add(documento)

    return documento


def procesar_informacion(session: Session, mailbox: Mailbox) -> None:

    hoy = date.today()

    tipo_documento = obtener_tipo_documento_informacion(session)

    if tipo_documento is None:
        raise ValueError(
            f"No existe el tipo de documento '{TIPO_DOCUMENTO_INFORMACION}'."
        )

    mensajes = mailbox.buscar(ASUNTO_SUSPENSION, hoy, carpeta="SentItems")

    print(f"Correos encontrados: {len(mensajes)}")

    for mensaje in mensajes:
        print(
            "ID:",
            mensaje["id"],
            "| CONTRATO:",
            extraer_contrato(mensaje.get("body", {}).get("content", "")),
        )

    for mensaje in mensajes:
        expediente = relacionar_correo_expediente(session, mensaje)

        if expediente is None:
            continue

        cliente = expediente.cliente

        crear_carpeta_vencimiento(cliente, expediente)

        uuid_archivo = uuid.uuid4()
        nombre_original = f"{cliente.nombre} - {expediente.fecha_incumplimiento}.eml"
        destino = carpeta_vencimiento(cliente, expediente) / f"{uuid_archivo}.eml"

        mailbox.descargar_correo(mensaje["id"], destino)

        try:
            registrar_documento_informacion(
                session,
                expediente,
                uuid_archivo,
                destino,
                nombre_original,
                tipo_documento.id,
            )
            session.commit()
        except Exception:
            session.rollback()
            if destino.exists():
                destino.unlink()
            raise
