import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from mgc_graph import Mail, Mailbox, MailError, MailboxError

from src.core.database import get_session
from src.core.deps import mail, mailbox, requiere_rol
from src.core.exceptions import ErrorEnvioCredenciales
from src.core.plantillas import correo_alta_usuario
from src.models.usuario import Usuario
from src.schemas.usuario import UsuarioCreate, UsuarioRead
from src.services.usuario import UsuarioService


logger = logging.getLogger("bitacora")

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.post("", response_model=UsuarioRead)
def crear_usuario(
    data: UsuarioCreate,
    usuario_actual: Usuario = Depends(requiere_rol("Administrador")),
    session: Session = Depends(get_session),
    mail: Mail = Depends(mail),
    mailbox: Mailbox = Depends(mailbox),
):
    servicio = UsuarioService(session)

    usuario, codigo = servicio.crear(data)

    body = correo_alta_usuario(
        nombre   = usuario.nombre,
        correo   = usuario.correo,
        password = codigo
    )

    message_id = None

    try:
        message_id = mail.crear(
            to      = usuario.correo,
            subject = "Alta de usuario en Bitácora",
            body    = body
        )

        mail.enviar(message_id = message_id)

    except MailError as exc:

        if message_id is not None:
            try:
                mailbox.eliminar(message_id)
            except MailboxError:
                logger.warning(
                    "No fue posible eliminar el borrador %s "
                    "después de fallar el envío.",
                    message_id,
                )

        raise ErrorEnvioCredenciales(
            f"No fue posible enviar las credenciales al usuario "
            f"'{usuario.correo}'."
        ) from exc

    else:
        try:
            mailbox.eliminar(message_id)
        except MailboxError:
            logger.warning(
                "Las credenciales fueron enviadas a %s, "
                "pero no fue posible eliminar el mensaje %s.",
                usuario.correo,
                message_id,
            )

    return usuario