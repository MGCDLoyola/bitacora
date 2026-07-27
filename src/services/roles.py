from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.rol import Rol

from collections.abc import Sequence


class RolService:

    def __init__(self, session: Session):
        self.session = session

    def listar(self) -> Sequence[Rol]:

        stmt = (
            select(Rol)
            .order_by(Rol.id)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )