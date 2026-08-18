from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from src.core.config import SESION_DURACION_HORAS
from src.core.exceptions import NoAutorizado, OperacionInvalida
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

    def cambiar_password(
        self,
        usuario: Usuario,
        sesion_actual: Sesion,
        password_actual: str,
        password_nueva: str
    ) -> None:

        if not usuario.check_password(password_actual):
            raise NoAutorizado(
                "La contraseña actual es incorrecta."
            )

        if password_actual == password_nueva:
            raise OperacionInvalida(
                "La nueva contraseña debe ser diferente a la actual."
            )

        usuario.set_password(password_nueva)

        if usuario.requiere_cambio_password:
            usuario.ultimo_acceso = datetime.now(timezone.utc)

        self.session.delete(sesion_actual)
        self._commit()

    def logout(self, sesion_actual: Sesion) -> None:

        self.session.delete(sesion_actual)
        self._commit()