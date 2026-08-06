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

        return cliente

    def crear(
        self,
        interlocutor: str,
        central: str,
        nombre: str,
        correo: str | None,
        contrato: str | None
    ) -> Cliente:

        cliente = Cliente(
            interlocutor=interlocutor,
            central=central,
            nombre=nombre,
            correo=correo,
            contrato=contrato
        )

        self._guardar(cliente)

        return cliente


    def actualizar(
        self,
        interlocutor: str,
        correo: str | None,
        contrato: str | None
    ) -> Cliente:

        cliente = self.obtener(interlocutor)

        cliente.correo = correo
        cliente.contrato = contrato

        self._commit()

        return cliente

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