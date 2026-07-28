from sqlalchemy import or_, select

from src.models.cliente import Cliente
from src.core.exceptions import NoEncontrado

from src.services.base import BaseService

from collections.abc import Sequence


class ClienteService(BaseService):

    def listar(self) -> Sequence[Cliente]:

        stmt = (
            select(Cliente)
            .order_by(Cliente.nombre)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def obtener(self, interlocutor: str) -> Cliente:
        cliente = self.session.get(Cliente, interlocutor)

        if cliente is None:
            raise NoEncontrado(
                f"No se encontró el cliente {interlocutor}."
            )

    def buscar(self, termino: str) -> Sequence[Cliente]:

        patron = f"%{termino}%"

        stmt = (
            select(Cliente)
            .where(
                or_(
                    Cliente.interlocutor.ilike(patron),
                    Cliente.nombre.ilike(patron)
                )
            )
            .order_by(Cliente.nombre)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )