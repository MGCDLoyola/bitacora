from datetime import date
import shutil

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.expediente import Expediente
from src.models.usuario import Usuario

from src.core.almacenamiento import carpeta_expediente

from collections.abc import Sequence


class ExpedienteService:

    def __init__(self, session: Session):
        self.session = session

    def listar(self) -> Sequence[Expediente]:

        stmt = (
            select(Expediente)
            .order_by(Expediente.id)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def obtener(self, id_expediente: int) -> Expediente | None:

        return self.session.get(Expediente, id_expediente)

    def buscar(
        self,
        interlocutor: str | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None
    ) -> Sequence[Expediente]:

        stmt = select(Expediente)

        if interlocutor is not None:
            stmt = stmt.where(Expediente.interlocutor == interlocutor)

        if fecha_desde is not None:
            stmt = stmt.where(Expediente.fecha_incumplimiento >= fecha_desde)

        if fecha_hasta is not None:
            stmt = stmt.where(Expediente.fecha_incumplimiento <= fecha_hasta)

        stmt = stmt.order_by(Expediente.id)

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def asignar(self, id_expediente: int, id_usuario: int | None) -> Expediente:

        expediente = self.session.get(Expediente, id_expediente)

        if expediente is None:
            raise ValueError(f"No existe un expediente con id '{id_expediente}'")

        if id_usuario is not None:

            usuario = self.session.get(Usuario, id_usuario)

            if usuario is None:
                raise ValueError(f"No existe un usuario con id '{id_usuario}'")

            if not usuario.activo:
                raise ValueError(f"El usuario '{usuario.nombre}' no está activo")

            if usuario.rol.nombre != "Cobranza":
                raise ValueError(f"El usuario '{usuario.nombre}' no tiene rol de Cobranza")

        expediente.id_usuario = id_usuario

        self.session.commit()

        return expediente

    def listar_por_asignado(self, id_usuario: int) -> Sequence[Expediente]:

        stmt = (
            select(Expediente)
            .where(Expediente.id_usuario == id_usuario)
            .order_by(Expediente.id)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def eliminar(self, id_expediente: int) -> None:

        expediente = self.session.get(Expediente, id_expediente)

        if expediente is None:
            raise ValueError(f"No existe un expediente con id '{id_expediente}'")

        cliente = expediente.cliente

        carpeta = carpeta_expediente(cliente, expediente)

        if carpeta.exists():
            shutil.rmtree(carpeta)

        self.session.delete(expediente)
        self.session.commit()