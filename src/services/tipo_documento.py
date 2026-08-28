from collections.abc import Sequence

from sqlalchemy import select

from src.models.tipo_documento import TipoDocumento
from src.services.base import BaseService


class TipoDocumentoService(BaseService):
    def listar(self) -> Sequence[TipoDocumento]:

        stmt = select(TipoDocumento).order_by(TipoDocumento.id)

        return self.session.execute(stmt).scalars().all()
