import logging
import secrets
from datetime import datetime, timedelta, timezone

from mgc_graph import Mail, Mailbox, MailboxError, MailError
from sqlalchemy import select

from src.core.config import (
    RECUPERACION_DURACION_MINUTOS,
    SESION_DURACION_HORAS,
)
from src.core.exceptions import (
    ErrorEnvioCredenciales,
    NoAutorizado,
    OperacionInvalida,
)
from src.core.plantillas import correo_recuperacion_password
from src.models.sesion import Sesion
from src.models.usuario import Usuario
from src.services.base import BaseService

logger = logging.getLogger("bitacora")


class AuthService(BaseService):
    def login(self, correo: str, password: str) -> tuple[Usuario, Sesion]:

        usuario = self.session.scalar(select(Usuario).where(Usuario.correo == correo))

        if usuario is None or not usuario.check_password(password):
            raise NoAutorizado("Correo o contraseña incorrectos.")

        if not usuario.activo:
            raise NoAutorizado("El usuario no está activo.")

        sesion = Sesion(
            id_usuario=usuario.id,
            fecha_expiracion=datetime.now(timezone.utc)
            + timedelta(hours=SESION_DURACION_HORAS),
        )

        self.session.add(sesion)
        self._guardar(sesion)

        return usuario, sesion

    def cambiar_password(
        self,
        usuario: Usuario,
        sesion_actual: Sesion,
        password_actual: str | None,
        password_nueva: str,
    ) -> None:

        if not usuario.requiere_cambio_password:
            if not password_actual:
                raise OperacionInvalida("Debes proporcionar la contraseña actual.")

            if not usuario.check_password(password_actual):
                raise NoAutorizado("La contraseña actual es incorrecta.")

        if usuario.check_password(password_nueva):
            raise OperacionInvalida(
                "La nueva contraseña debe ser diferente a la actual."
            )

        usuario.set_password(password_nueva)

        if usuario.requiere_cambio_password:
            usuario.ultimo_acceso = datetime.now(timezone.utc)

        self.session.delete(sesion_actual)
        self._commit()

    def recuperar_password(
        self,
        correo: str,
        mail: Mail,
        mailbox: Mailbox,
    ) -> None:

        usuario = self.session.scalar(select(Usuario).where(Usuario.correo == correo))

        if usuario is None or not usuario.activo:
            return

        codigo = f"{secrets.randbelow(1_000_000):06d}"

        expira = datetime.now(timezone.utc) + timedelta(
            minutes=RECUPERACION_DURACION_MINUTOS
        )

        usuario.set_codigo_recuperacion(
            codigo=codigo,
            expira=expira,
        )

        self._commit()

        body = correo_recuperacion_password(
            nombre=usuario.nombre,
            codigo=codigo,
        )

        message_id = None

        try:
            message_id = mail.crear(
                to=usuario.correo,
                subject="Recuperación de contraseña — Bitácora",
                body=body,
            )

            mail.enviar(message_id=message_id)

        except MailError as exc:
            usuario.limpiar_codigo_recuperacion()

            try:
                self._commit()
            except Exception:
                logger.exception(
                    "No fue posible limpiar el código de recuperación "
                    "después de fallar el envío a %s.",
                    usuario.correo,
                )

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
                f"No fue posible enviar el código de recuperación "
                f"al usuario '{usuario.correo}'."
            ) from exc

        else:
            try:
                mailbox.eliminar(message_id)
            except MailboxError:
                logger.warning(
                    "El código de recuperación fue enviado a %s, "
                    "pero no fue posible eliminar el mensaje %s.",
                    usuario.correo,
                    message_id,
                )

    def confirmar_recuperacion(
        self,
        correo: str,
        codigo: str,
        password_nueva: str,
    ) -> None:

        usuario = self.session.scalar(select(Usuario).where(Usuario.correo == correo))

        if usuario is None or not usuario.activo:
            raise NoAutorizado("El código de recuperación no es válido.")

        if not usuario.check_codigo_recuperacion(codigo):
            raise NoAutorizado("El código de recuperación no es válido o ya expiró.")

        if usuario.check_password(password_nueva):
            raise OperacionInvalida(
                "La nueva contraseña debe ser diferente a la actual."
            )

        usuario.set_password(password_nueva)
        usuario.limpiar_codigo_recuperacion()

        if usuario.requiere_cambio_password:
            usuario.ultimo_acceso = datetime.now(timezone.utc)

        self._commit()

    def logout(self, sesion_actual: Sesion) -> None:

        self.session.delete(sesion_actual)
        self._commit()
