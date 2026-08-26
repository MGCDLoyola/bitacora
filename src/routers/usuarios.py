import logging

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from mgc_graph import Mail, Mailbox, MailError, MailboxError

from src.core.database import get_session
from src.core.deps import mail, mailbox, requiere_rol, usuario_actual
from src.core.exceptions import ErrorEnvioCredenciales, OperacionInvalida
from src.core.plantillas import correo_alta_usuario
from src.models.usuario import Usuario
from src.schemas.usuario import (
    UsuarioCreate, UsuarioRead, UsuarioUpdate,
    UsuarioUpdateSupervisor, UsuarioRolMasivo, UsuarioEstadoMasivo
)
from src.services.firma import FirmaService
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

@router.get("", response_model=list[UsuarioRead])
def listar_usuarios(
    usuario_actual: Usuario = Depends(requiere_rol("Administrador", "Supervisor")),
    session: Session = Depends(get_session),
):
    incluir_admin = usuario_actual.rol.nombre == "Administrador"

    return UsuarioService(session).listar(
        incluir_admin=incluir_admin,
        excluir_id=usuario_actual.id
    )

@router.get("/asignables", response_model=list[UsuarioRead])
def listar_usuarios_asignables(
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor")
    ),
    session: Session = Depends(get_session),
):
    return UsuarioService(session).listar_asignables(
        usuario_actual
    )

@router.patch("/rol-masivo", response_model=list[UsuarioRead])
def actualizar_rol_masivo(
    data: UsuarioRolMasivo,
    usuario_actual: Usuario = Depends(requiere_rol("Administrador")),
    session: Session = Depends(get_session),
):
    return UsuarioService(session).actualizar_rol_masivo(
        data.ids,
        data.id_rol,
        usuario_actual
    )

@router.patch("/estado-masivo", response_model=list[UsuarioRead])
def actualizar_estado_masivo(
    data: UsuarioEstadoMasivo,
    usuario_actual: Usuario = Depends(requiere_rol("Supervisor", "Administrador")),
    session: Session = Depends(get_session),
):
    return UsuarioService(session).actualizar_estado_masivo(
        data.ids,
        data.activo,
        usuario_actual
    )

@router.patch("/{id_usuario}", response_model=UsuarioRead)
def actualizar_usuario(
    id_usuario: int,
    data: UsuarioUpdate,
    usuario_actual: Usuario = Depends(requiere_rol("Administrador")),
    session: Session = Depends(get_session),
):
    return UsuarioService(session).actualizar(
        id_usuario,
        data,
        usuario_actual
    )

@router.patch("/{id_usuario}/estado", response_model=UsuarioRead)
def actualizar_estado_usuario(
    id_usuario: int,
    data: UsuarioUpdateSupervisor,
    usuario_actual: Usuario = Depends(requiere_rol("Supervisor", "Administrador")),
    session: Session = Depends(get_session),
):
    return UsuarioService(session).actualizar_supervisor(
        id_usuario,
        data,
        usuario_actual
    )

@router.post("/me/firma", response_model=UsuarioRead)
def subir_firma(
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
    session: Session = Depends(get_session),
):

    contenido = archivo.file.read()

    servicio = UsuarioService(session)

    servicio.guardar_firma(
        usuario=usuario_actual,
        contenido=contenido
    )

    return usuario_actual

@router.get("/me/firma")
def obtener_firma(
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
    session: Session = Depends(get_session),
):
    servicio = UsuarioService(session)

    ruta = servicio.obtener_firma(usuario_actual)

    return FileResponse(
        path=ruta,
        media_type="image/png",
        filename="firma.png",
    )