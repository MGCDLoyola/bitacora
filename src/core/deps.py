import uuid
from datetime import datetime, timezone

from fastapi import Cookie, Depends
from mgc_graph import GraphAuth, GraphClient, Mail, Mailbox
from sqlalchemy.orm import Session

from src.core.config import (
    GRAPH_CLIENT_ID,
    GRAPH_CLIENT_SECRET,
    GRAPH_MAILBOX,
    GRAPH_TENANT_ID,
    NOMBRE_COOKIE_SESION,
)
from src.core.database import get_session
from src.core.exceptions import CambioPasswordRequerido, NoAutorizado, PermisoDenegado
from src.models.sesion import Sesion
from src.models.usuario import Usuario


def sesion_actual(
    id_sesion: uuid.UUID | None = Cookie(default=None, alias=NOMBRE_COOKIE_SESION),
    session: Session = Depends(get_session),
) -> Sesion:

    if id_sesion is None:
        raise NoAutorizado("No se encontró una sesión activa.")

    sesion = session.get(Sesion, id_sesion)

    if sesion is None:
        raise NoAutorizado("La sesión no es válida.")

    if sesion.fecha_expiracion < datetime.now(timezone.utc):
        session.delete(sesion)
        session.commit()
        raise NoAutorizado("La sesión ha expirado.")

    return sesion


def usuario_actual(sesion: Sesion = Depends(sesion_actual)) -> Usuario:

    if sesion.usuario.requiere_cambio_password:
        raise CambioPasswordRequerido("Debes cambiar tu contraseña antes de continuar.")

    return sesion.usuario


def requiere_rol(*roles: str):
    def dependencia(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
        if usuario.rol.nombre not in roles:
            raise PermisoDenegado("No tienes permiso para realizar esta acción.")
        return usuario

    return dependencia


def graph_client() -> GraphClient:

    auth = GraphAuth(
        GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, verify_ssl=False
    )

    return GraphClient(auth)


def mail(client: GraphClient = Depends(graph_client)) -> Mail:

    return Mail(client, GRAPH_MAILBOX)


def mailbox(client: GraphClient = Depends(graph_client)) -> Mailbox:

    return Mailbox(client, GRAPH_MAILBOX)
