from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.tipo_documento import TipoDocumento

from collections.abc import Sequence


class TipoDocumentoService:

    def __init__(self, session: Session):
        self.session = session

    def listar(self) -> Sequence[TipoDocumento]:

        stmt = (
            select(TipoDocumento)
            .order_by(TipoDocumento.id)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )