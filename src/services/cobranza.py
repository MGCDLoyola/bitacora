from collections.abc import Sequence
from datetime import datetime
from pathlib import Path

from sqlalchemy import select

from src.core.exceptions import ConflictoNegocio, NoEncontrado, OperacionInvalida
from src.core.config import HORARIOS_GESTION, MAX_DIAS, MAX_GESTIONES_DIA

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
        dia: int,
        data: CobranzaCreate
    ) -> Cobranza:

        expediente = self.session.get(
            Expediente,
            id_expediente
        )

        if expediente.id_usuario != id_usuario:
            raise OperacionInvalida(
                "El expediente no está asignado al usuario actual."
            )

        if expediente is None:
            raise NoEncontrado(
                f"No existe un expediente con id '{id_expediente}'."
            )

        if not expediente.estado:
            raise ConflictoNegocio(
                "No se puede registrar una cobranza "
                "en un expediente cerrado."
            )

        if not 1 <= dia <= MAX_DIAS:
            raise OperacionInvalida(
                f"El día de gestión debe estar entre 1 y {MAX_DIAS}."
            )

        if dia > expediente.dia_actual:
            raise OperacionInvalida(
                f"No se puede registrar una cobranza del día {dia}. "
                f"El día actual del expediente es {expediente.dia_actual}."
            )

        orden = self._orden(
            id_expediente=id_expediente,
            dia=dia
        )

        if dia == expediente.dia_actual:
            self._validar_horario(
                orden,
                data.fecha
            )

        cobranza = Cobranza(
            id_expediente=id_expediente,
            id_usuario=id_usuario,
            dia=dia,
            orden=orden,
            fecha=data.fecha,
            contacto=data.contacto,
            medio=data.medio,
            comentarios=data.comentarios
        )

        self._guardar(cobranza)

        return cobranza

    def actualizar(
        self,
        id_cobranza: int,
        id_usuario: int,
        data: CobranzaUpdate
    ) -> Cobranza:

        cobranza = self.obtener(id_cobranza)

        if cobranza.expediente.id_usuario != id_usuario:
            raise OperacionInvalida(
                "El expediente no está asignado al usuario actual."
            )

        cambios = data.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():

            if valor is None and campo in ("fecha", "contacto"):
                raise OperacionInvalida(
                    f"El campo '{campo}' no puede ser nulo."
                )

            setattr(cobranza, campo, valor)

        self._guardar(cobranza)

        return cobranza

    def eliminar(
        self,
        id_cobranza: int,
        id_usuario: int
    ) -> None:

        cobranza = self.obtener(id_cobranza)

        if cobranza.expediente.id_usuario != id_usuario:
            raise OperacionInvalida(
                "El expediente no está asignado al usuario actual."
            )

        rutas = [
            Path(evidencia.ruta_archivo)
            for evidencia in cobranza.evidencias
        ]

        self.session.delete(cobranza)

        self._commit()

        for ruta in rutas:
            if ruta.exists():
                ruta.unlink()

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

    def _validar_horario(self, orden: int, fecha: datetime) -> None:
        inicio = HORARIOS_GESTION[orden]
        ahora = datetime.now()

        if ahora.hour < inicio:
            raise OperacionInvalida(
                f"El intento {orden} solo se puede registrar "
                f"a partir de las {inicio}:00 horas."
            )

        fecha_naive = fecha.replace(tzinfo=None) if fecha.tzinfo else fecha

        if fecha_naive.date() != ahora.date():
            raise OperacionInvalida(
                "La hora capturada debe corresponder al día de hoy."
            )

        if fecha_naive.hour < inicio:
            raise OperacionInvalida(
                f"La hora capturada no corresponde al intento {orden}; "
                f"debe ser a partir de las {inicio}:00 horas."
            )