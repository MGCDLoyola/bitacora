from sqlalchemy import select

from src.models.rol import Rol

from src.services.base import BaseService

from collections.abc import Sequence


class RolService(BaseService):

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