import uuid
from datetime import datetime, timezone

from fastapi import Cookie, Depends
from sqlalchemy.orm import Session

from src.core.config import NOMBRE_COOKIE_SESION
from src.core.database import get_session
from src.core.exceptions import NoAutorizado
from src.models.sesion import Sesion
from src.models.usuario import Usuario


def usuario_actual(
    id_sesion: uuid.UUID | None = Cookie(default=None, alias=NOMBRE_COOKIE_SESION),
    session: Session = Depends(get_session)
) -> Usuario:

    if id_sesion is None:
        raise NoAutorizado(
            "No se encontró una sesión activa."
        )

    sesion = session.get(Sesion, id_sesion)

    if sesion is None:
        raise NoAutorizado(
            "La sesión no es válida."
        )

    if sesion.fecha_expiracion < datetime.now(timezone.utc):
        session.delete(sesion)
        session.commit()
        raise NoAutorizado(
            "La sesión ha expirado."
        )

    return sesion.usuario