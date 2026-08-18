from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from src.core.config import SESION_DURACION_HORAS
from src.core.exceptions import NoAutorizado
from src.models.sesion import Sesion
from src.models.usuario import Usuario

from src.services.base import BaseService


class AuthService(BaseService):

    def login(self, correo: str, password: str) -> tuple[Usuario, Sesion]:

        usuario = self.session.scalar(
            select(Usuario)
            .where(Usuario.correo == correo)
        )

        if usuario is None or not usuario.check_password(password):
            raise NoAutorizado(
                "Correo o contraseña incorrectos."
            )

        if not usuario.activo:
            raise NoAutorizado(
                "El usuario no está activo."
            )

        sesion = Sesion(
            id_usuario=usuario.id,
            fecha_expiracion=datetime.now(timezone.utc) + timedelta(hours=SESION_DURACION_HORAS)
        )

        self.session.add(sesion)
        self._guardar(sesion)

        return usuario, sesion