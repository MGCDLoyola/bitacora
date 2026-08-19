import secrets

from sqlalchemy import select
from pathlib import Path

from src.models.usuario import Usuario
from src.schemas.usuario import UsuarioCreate, UsuarioUpdate
from src.core.exceptions import NoEncontrado, OperacionInvalida
from src.core.almacenamiento import crear_carpeta_firmas, carpeta_firmas

from src.services.base import BaseService

from collections.abc import Sequence


class UsuarioService(BaseService):

    def listar(self) -> Sequence[Usuario]:

        stmt = (
            select(Usuario)
            .order_by(Usuario.id)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def obtener(self, id_usuario: int, activos: bool = False, cobranza: bool = False) -> Usuario:
        usuario = self.session.get(Usuario, id_usuario)

        if usuario is None:
            raise NoEncontrado(
                f"No existe el usuario con id '{id_usuario}'."
            )

        if not usuario.activo and activos:
            raise OperacionInvalida(
                f"El usuario con id '{id_usuario}' no esta activo"
            )

        if usuario.rol.nombre != "Cobranza" and cobranza:
            raise OperacionInvalida(
                f"El usuario con id '{id_usuario}' no tiene rol de Cobranza"
            )

        return usuario

    def crear(self, data: UsuarioCreate) -> tuple[Usuario, str]:

        existente = self.session.scalar(
            select(Usuario)
            .where(Usuario.correo == data.correo)
        )

        if existente is not None:
            raise OperacionInvalida(
                f"Ya existe un usuario con el correo '{data.correo}'"
            )

        codigo = f"{secrets.randbelow(1_000_000):06d}"

        usuario = Usuario(
            nombre=data.nombre,
            correo=data.correo,
            id_rol=data.id_rol,
            activo=data.activo
        )

        usuario.set_password(codigo)

        self.session.add(usuario)
        self._guardar(usuario)

        return usuario, codigo

    def actualizar(self, id_usuario: int, data: UsuarioUpdate) -> Usuario:

        usuario = self.obtener(id_usuario)

        cambios = data.model_dump(exclude_unset=True)

        if "correo" in cambios and cambios["correo"] != usuario.correo:
            existente = self.session.scalar(
                select(Usuario)
                .where(Usuario.correo == cambios["correo"])
            )

            if existente is not None:
                raise OperacionInvalida(f"Ya existe un usuario con el correo '{cambios['correo']}'")

        for campo, valor in cambios.items():
            setattr(usuario, campo, valor)

        self._commit()

        return usuario

    def guardar_firma(self, usuario: Usuario, contenido: bytes) -> str:

        carpeta = carpeta_firmas(usuario)
        crear_carpeta_firmas(usuario)

        nombre = "firma.png"
        ruta = carpeta / nombre

        ruta.write_bytes(contenido)

        usuario.firma = nombre

        self._commit()

        return nombre

    def obtener_firma(self, usuario: Usuario) -> Path:
        if not usuario.firma:
            raise NoEncontrado(
                "El usuario no tiene una firma registrada."
            )

        ruta = carpeta_firmas(usuario) / usuario.firma

        if not ruta.is_file():
            raise NoEncontrado(
                "No se encontró el archivo de firma del usuario."
            )

        return ruta