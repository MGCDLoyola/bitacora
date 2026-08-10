from datetime import date
import shutil

from sqlalchemy import select

from src.models.expediente import Expediente

from src.core.almacenamiento import carpeta_expediente
from src.core.exceptions import NoEncontrado

from src.services.usuario import UsuarioService
from src.services.base import BaseService

from collections.abc import Sequence


class ExpedienteService(BaseService):

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

    def obtener(self, id_expediente: int) -> Expediente:

        expediente = self.session.get(Expediente, id_expediente)

        if expediente is None:
            raise NoEncontrado(
                f"No existe un expediente con id '{id_expediente}'."
            )

        return expediente

    def crear(
        self,
        interlocutor: str,
        fecha_incumplimiento: date | None = None,
        id_usuario: int | None = None
    ) -> Expediente:

        expediente = Expediente(
            interlocutor=interlocutor,
            fecha_incumplimiento=fecha_incumplimiento,
            id_usuario=id_usuario
        )

        self.session.add(expediente)

        self._guardar(expediente)

        return expediente

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

        expediente = self.obtener(id_expediente)

        if id_usuario is not None:

            UsuarioService(self.session).obtener(id_usuario, activos = True, cobranza = True)

        expediente.id_usuario = id_usuario

        self._guardar(expediente)

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

        expediente = self.obtener(id_expediente)

        cliente = expediente.cliente

        carpeta = carpeta_expediente(cliente, expediente)

        self.session.delete(expediente)

        self._commit()

        if carpeta.exists():
            shutil.rmtree(carpeta)