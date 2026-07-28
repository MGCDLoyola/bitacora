from collections.abc import Sequence
from datetime import date

from sqlalchemy import select

from src.core.exceptions import ConflictoNegocio, NoEncontrado
from src.core.config import MAX_DIAS, MAX_GESTIONES_DIA

from src.models.cobranza import Cobranza
from src.models.expediente import Expediente

from src.schemas.cobranza import CobranzaCreate, CobranzaUpdate

from src.services.base import BaseService

class CobranzaService(BaseService):


    def listar_por_expediente(self, id_expediente: int) -> Sequence[Cobranza]:
        stmt = (
            select(Cobranza)
            .where(Cobranza.id_expediente == id_expediente)
            .order_by(Cobranza.dia, Cobranza.orden)
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

    def crear(
        self,
        id_expediente: int,
        id_usuario: int,
        data: CobranzaCreate
    ) -> Cobranza:

        dia = self._dia(id_expediente)

        orden = self._orden(
            id_expediente=id_expediente,
            dia=dia
        )

        cobranza = Cobranza(
            id_expediente=id_expediente,
            id_usuario=id_usuario,
            dia=dia,
            orden=orden,
            fecha=data.fecha,
            medio=data.medio,
            comentarios=data.comentarios
        )

        self._guardar(cobranza)

        self._cierre(cobranza)

        return cobranza

    def actualizar(
        self,
        id_cobranza: int,
        data: CobranzaUpdate
    ) -> Cobranza:

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

    def _dia(self, id_expediente: int) -> int:

        ultima = (
            self.session.scalars(
                select(Cobranza)
                .where(Cobranza.id_expediente == id_expediente)
                .order_by(
                    Cobranza.dia.desc(),
                    Cobranza.orden.desc()
                )
                .limit(1)
            )
            .first()
        )

        if ultima is None:
            return 1

        if ultima.fecha_creacion.date() == date.today():
            return ultima.dia

        if ultima.dia >= MAX_DIAS:
            raise ConflictoNegocio(
                "El expediente ya concluyó su periodo de seguimiento."
            )

        return ultima.dia + 1

    def _orden(
        self,
        id_expediente: int,
        dia: int
    ) -> int:

        ordenes = self.session.scalars(
            select(Cobranza.orden)
            .where(Cobranza.id_expediente == id_expediente)
            .where(Cobranza.dia == dia)
        ).all()

        orden = next(
            (
                i
                for i in range(1, MAX_GESTIONES_DIA + 1)
                if i not in ordenes
            ),
            None
        )

        if orden is None:
            raise ConflictoNegocio(
                f"El expediente ya tiene las {MAX_GESTIONES_DIA} gestiones del día {dia}."
            )

        return orden

    def _cierre(
        self,
        cobranza: Cobranza
    ) -> None:

        if (
            cobranza.dia == MAX_DIAS
            and cobranza.orden == MAX_GESTIONES_DIA
        ):
            expediente = self.session.get(Expediente, cobranza.id_expediente)

            expediente.fecha_consolidacion = date.today()

            self._guardar(expediente)