import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.usuario import Usuario
from src.schemas.usuario import UsuarioCreate, UsuarioUpdate

from collections.abc import Sequence


class UsuarioService:

    def __init__(self, session: Session):
        self.session = session

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

    def crear(self, data: UsuarioCreate) -> tuple[Usuario, str]:

        existente = self.session.scalar(
            select(Usuario)
            .where(Usuario.correo == data.correo)
        )

        if existente is not None:
            raise ValueError(f"Ya existe un usuario con el correo '{data.correo}'")

        codigo = f"{random.randint(0, 999999):06d}"

        usuario = Usuario(
            nombre=data.nombre,
            correo=data.correo,
            id_rol=data.id_rol,
            activo=data.activo
        )

        usuario.set_password(codigo)

        self.session.add(usuario)
        self.session.commit()

        return usuario, codigo

    def actualizar(self, id_usuario: int, data: UsuarioUpdate) -> Usuario:

        usuario = self.session.get(Usuario, id_usuario)

        if usuario is None:
            raise ValueError(f"No existe un usuario con id '{id_usuario}'")

        cambios = data.model_dump(exclude_unset=True)

        if "correo" in cambios and cambios["correo"] != usuario.correo:
            existente = self.session.scalar(
                select(Usuario)
                .where(Usuario.correo == cambios["correo"])
            )

            if existente is not None:
                raise ValueError(f"Ya existe un usuario con el correo '{cambios['correo']}'")

        for campo, valor in cambios.items():
            setattr(usuario, campo, valor)

        self.session.commit()

        return usuario