from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.models.cliente import Cliente

from collections.abc import Sequence


class ClienteService:

    def __init__(self, session: Session):
        self.session = session

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

    def obtener(self, interlocutor: str) -> Cliente | None:

        return self.session.get(Cliente, interlocutor)

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