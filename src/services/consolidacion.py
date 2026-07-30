from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.models.cobranza import Cobranza

from src.core.exceptions import OperacionInvalida

from src.services.base import BaseService
from src.services.expediente import ExpedienteService

from collections.abc import Sequence


class ConsolidacionService(BaseService):

    def preconsolidar(self, id_expediente: int) -> Sequence[Cobranza]:

        ExpedienteService(self.session).obtener(id_expediente)

        stmt = (
            select(Cobranza)
            .where(Cobranza.id_expediente == id_expediente)
            .options(selectinload(Cobranza.evidencias))
            .order_by(Cobranza.dia, Cobranza.orden)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )