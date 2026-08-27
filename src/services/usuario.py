import secrets

from sqlalchemy import select
from pathlib import Path

from src.models.usuario import Usuario
from src.models.rol import Rol

from src.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioUpdateSupervisor
from src.core.exceptions import NoEncontrado, OperacionInvalida
from src.core.almacenamiento import crear_carpeta_firmas, carpeta_firmas

from src.services.base import BaseService
from src.services.firma import FirmaService

from collections.abc import Sequence


NOMBRE_FIRMA = "firma.png"


class UsuarioService(BaseService):
    def listar(
        self, incluir_admin: bool = True, excluir_id: int | None = None
    ) -> Sequence[Usuario]:

        stmt = select(Usuario)

        if not incluir_admin:
            stmt = stmt.where(Usuario.id_rol != 1)

        if excluir_id is not None:
            stmt = stmt.where(Usuario.id != excluir_id)

        stmt = stmt.order_by(Usuario.id)

        return self.session.execute(stmt).scalars().all()

    def puede_asignar(self, usuario_actual: Usuario, usuario_destino: Usuario) -> bool:

        if not usuario_destino.activo:
            return False

        if usuario_actual.rol.nombre == "Administrador":
            return (
                usuario_destino.id == usuario_actual.id
                or usuario_destino.rol.nombre in ("Supervisor", "Cobranza")
            )

        if usuario_actual.rol.nombre == "Supervisor":
            return (
                usuario_destino.id == usuario_actual.id
                or usuario_destino.rol.nombre == "Cobranza"
            )

        return False

    def listar_asignables(self, usuario_actual: Usuario) -> Sequence[Usuario]:

        if usuario_actual.rol.nombre == "Administrador":
            roles_permitidos = ["Supervisor", "Cobranza"]

        elif usuario_actual.rol.nombre == "Supervisor":
            roles_permitidos = ["Cobranza"]

        else:
            return []

        stmt = (
            select(Usuario)
            .where(
                Usuario.activo.is_(True),
                (Usuario.id == usuario_actual.id)
                | (
                    Usuario.id_rol.in_(
                        select(Rol.id).where(Rol.nombre.in_(roles_permitidos))
                    )
                ),
            )
            .order_by(Usuario.nombre)
        )

        return self.session.execute(stmt).scalars().all()

    def obtener(
        self, id_usuario: int, activos: bool = False, cobranza: bool = False
    ) -> Usuario:
        usuario = self.session.get(Usuario, id_usuario)

        if usuario is None:
            raise NoEncontrado(f"No existe el usuario con id '{id_usuario}'.")

        if not usuario.activo and activos:
            raise OperacionInvalida(f"El usuario con id '{id_usuario}' no esta activo")

        if usuario.rol.nombre != "Cobranza" and cobranza:
            raise OperacionInvalida(
                f"El usuario con id '{id_usuario}' no tiene rol de Cobranza"
            )

        return usuario

    def crear(self, data: UsuarioCreate) -> tuple[Usuario, str]:

        existente = self.session.scalar(
            select(Usuario).where(Usuario.correo == data.correo)
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
            activo=data.activo,
        )

        usuario.set_password(codigo)

        self.session.add(usuario)
        self._guardar(usuario)

        return usuario, codigo

    def actualizar(
        self, id_usuario: int, data: UsuarioUpdate, usuario_actual: Usuario
    ) -> Usuario:

        usuario = self.obtener(id_usuario)

        if usuario.rol.nombre == "Administrador" and usuario.id != usuario_actual.id:
            raise OperacionInvalida(
                "Un Administrador no puede modificar a otro Administrador."
            )

        cambios = data.model_dump(exclude_unset=True)

        if "id_rol" in cambios and usuario.id == usuario_actual.id:
            raise OperacionInvalida("No puedes cambiar tu propio rol.")

        if "correo" in cambios and cambios["correo"] != usuario.correo:
            existente = self.session.scalar(
                select(Usuario).where(Usuario.correo == cambios["correo"])
            )

            if existente is not None:
                raise OperacionInvalida(
                    f"Ya existe un usuario con el correo '{cambios['correo']}'"
                )

        for campo, valor in cambios.items():
            setattr(usuario, campo, valor)

        self._guardar(usuario)

        return usuario

    def actualizar_supervisor(
        self, id_usuario: int, data: UsuarioUpdateSupervisor, usuario_actual: Usuario
    ) -> Usuario:

        usuario = self.obtener(id_usuario)

        if usuario.id == usuario_actual.id:
            raise OperacionInvalida("No puedes modificar tu propio usuario.")

        if usuario.rol.nombre == "Administrador":
            raise OperacionInvalida(
                f"Un {usuario.rol.nombre} no puede modificar a un Administrador."
            )

        cambios = data.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():
            setattr(usuario, campo, valor)

        self._guardar(usuario)

        return usuario

    def actualizar_rol_masivo(
        self, ids: list[int], id_rol: int, usuario_actual: Usuario
    ) -> Sequence[Usuario]:

        usuarios = [self.obtener(id_usuario) for id_usuario in ids]

        for usuario in usuarios:
            if usuario.id == usuario_actual.id:
                raise OperacionInvalida("No puedes cambiar tu propio rol.")

            if (
                usuario.rol.nombre == "Administrador"
                and usuario.id != usuario_actual.id
            ):
                raise OperacionInvalida(
                    "Un Administrador no puede modificar a otro Administrador."
                )

        for usuario in usuarios:
            usuario.id_rol = id_rol

        self._commit()

        return usuarios

    def actualizar_estado_masivo(
        self, ids: list[int], activo: bool, usuario_actual: Usuario
    ) -> Sequence[Usuario]:

        usuarios = [self.obtener(id_usuario) for id_usuario in ids]

        for usuario in usuarios:
            if usuario.id == usuario_actual.id:
                raise OperacionInvalida("No puedes modificar tu propio usuario.")
            if usuario.rol.nombre == "Administrador":
                raise OperacionInvalida(
                    f"El usuario '{usuario.nombre}' es Administrador y no puede modificarse."
                )

        for usuario in usuarios:
            usuario.activo = activo

        self._commit()

        return usuarios

    def guardar_firma(self, usuario: Usuario, contenido: bytes) -> None:

        try:
            procesada = FirmaService.procesar(contenido)
        except ValueError as exc:
            raise OperacionInvalida(str(exc)) from exc

        carpeta = carpeta_firmas(usuario)
        crear_carpeta_firmas(usuario)

        ruta = carpeta / NOMBRE_FIRMA

        ruta.write_bytes(procesada)

        usuario.firma = True

        self._commit()

    def obtener_firma(self, usuario: Usuario) -> Path:
        if not usuario.firma:
            raise NoEncontrado("El usuario no tiene una firma registrada.")

        ruta = carpeta_firmas(usuario) / NOMBRE_FIRMA

        if not ruta.is_file():
            raise NoEncontrado("No se encontró el archivo de firma del usuario.")

        return ruta
