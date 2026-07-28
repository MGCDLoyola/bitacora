from sqlalchemy import select

from src.models.cobranza import Cobranza
from src.schemas.cobranza import CobranzaCreate, CobranzaUpdate
from src.core.exceptions import NoEncontrado, ConflictoNegocio
from src.services.base import BaseService

from collections.abc import Sequence


class CobranzaService(BaseService):

    def listar_por_expediente(self, id_expediente: int) -> Sequence[Cobranza]:

        stmt = (
            select(Cobranza)
            .where(Cobranza.id_expediente == id_expediente)
            .order_by(Cobranza.orden)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def obtener(self, id_cobranza: int) -> Cobranza:
        cobranza = self.session.get(Cobranza, id_cobranza)

        if cobranza is None:
            raise NoEncontrado(
                f"No existe una cobranza con id '{id_cobranza}'."
            )

        return cobranza

    def crear(self, id_expediente: int, id_usuario: int, data: CobranzaCreate) -> Cobranza:

        ordenes_usados = self.session.scalars(
            select(Cobranza.orden)
            .where(Cobranza.id_expediente == id_expediente)
        ).all()

        siguiente_orden = next(
            (orden for orden in (1, 2, 3) if orden not in ordenes_usados),
            None
        )

        if siguiente_orden is None:
            raise ConflictoNegocio(
                f"El expediente '{id_expediente}' ya tiene las 3 gestiones de cobranza permitidas."
            )

        cobranza = Cobranza(
            id_expediente=id_expediente,
            id_usuario=id_usuario,
            orden=siguiente_orden,
            fecha=data.fecha,
            medio=data.medio,
            comentarios=data.comentarios
        )

        self.session.add(cobranza)
        self._guardar(cobranza)

        return cobranza


    def actualizar(self, id_cobranza: int, data: CobranzaUpdate) -> Cobranza:

        cobranza = self.obtener(id_cobranza)

        cambios = data.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():
            setattr(cobranza, campo, valor)

        self._guardar(cobranza)

        return cobranza

    def eliminar(self, id_cobranza: int) -> None:

        cobranza = self.obtener(id_cobranza)

        self.session.delete(cobranza)

        self._commit()