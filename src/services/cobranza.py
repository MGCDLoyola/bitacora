from collections.abc import Sequence
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from src.core.config import HORARIOS_GESTION, MAX_DIAS, MAX_GESTIONES_DIA
from src.core.exceptions import ConflictoNegocio, NoEncontrado, OperacionInvalida
from src.models.cobranza import Cobranza
from src.models.expediente import Expediente
from src.schemas.cobranza import CobranzaCreate
from src.services.base import BaseService


class CobranzaService(BaseService):
    def listar_por_expediente(self, id_expediente: int) -> Sequence[Cobranza]:
        stmt = (
            select(Cobranza)
            .where(Cobranza.id_expediente == id_expediente)
            .order_by(Cobranza.dia, Cobranza.orden)
        )

        return self.session.execute(stmt).scalars().all()

    def obtener(self, id_cobranza: int) -> Cobranza:

        cobranza = self.session.get(Cobranza, id_cobranza)

        if cobranza is None:
            raise NoEncontrado(f"No existe una cobranza con id '{id_cobranza}'.")

        return cobranza

    def crear(
        self, id_expediente: int, id_usuario: int, data: CobranzaCreate
    ) -> Cobranza:

        expediente = self.session.get(Expediente, id_expediente)

        if expediente is None:
            raise NoEncontrado(f"No existe un expediente con id '{id_expediente}'.")

        if expediente.id_usuario != id_usuario:
            raise OperacionInvalida("El expediente no está asignado al usuario actual.")

        if not expediente.estado:
            raise ConflictoNegocio(
                "No se puede registrar una cobranza en un expediente cerrado."
            )

        if not 1 <= data.dia <= MAX_DIAS:
            raise OperacionInvalida(
                f"El día de gestión debe estar entre 1 y {MAX_DIAS}."
            )

        if data.dia > expediente.dia_actual:
            raise OperacionInvalida(
                f"No se puede registrar una cobranza del día {data.dia}. "
                f"El día actual del expediente es {expediente.dia_actual}."
            )

        if not 1 <= data.orden <= MAX_GESTIONES_DIA:
            raise OperacionInvalida(
                f"El intento debe estar entre 1 y {MAX_GESTIONES_DIA}."
            )

        existe = self.session.scalar(
            select(Cobranza.id)
            .where(Cobranza.id_expediente == id_expediente)
            .where(Cobranza.dia == data.dia)
            .where(Cobranza.orden == data.orden)
        )

        if existe is not None:
            raise ConflictoNegocio(
                f"El intento {data.orden} del día {data.dia} ya fue registrado."
            )

        fecha = self._construir_fecha(
            expediente=expediente,
            dia=data.dia,
            hora=data.hora,
        )

        if data.dia == expediente.dia_actual:
            self._validar_horario(data.orden, fecha)

        cobranza = Cobranza(
            id_expediente=id_expediente,
            id_usuario=id_usuario,
            dia=data.dia,
            orden=data.orden,
            fecha=fecha,
            contacto=data.contacto,
            medio=data.medio,
            comentarios=data.comentarios,
        )

        self._guardar(cobranza)

        return cobranza

    def actualizar(
        self, id_cobranza: int, id_usuario: int, data: CobranzaCreate
    ) -> Cobranza:

        cobranza = self.obtener(id_cobranza)

        if cobranza.expediente.id_usuario != id_usuario:
            raise OperacionInvalida("El expediente no está asignado al usuario actual.")

        fecha = self._construir_fecha(
            expediente=cobranza.expediente,
            dia=cobranza.dia,
            hora=data.hora,
        )

        cobranza.fecha = fecha
        cobranza.contacto = data.contacto
        cobranza.medio = data.medio
        cobranza.comentarios = data.comentarios

        self._guardar(cobranza)

        return cobranza

    def eliminar(self, id_cobranza: int, id_usuario: int) -> None:

        cobranza = self.obtener(id_cobranza)

        if cobranza.expediente.id_usuario != id_usuario:
            raise OperacionInvalida("El expediente no está asignado al usuario actual.")

        rutas = [Path(evidencia.ruta_archivo) for evidencia in cobranza.evidencias]

        self.session.delete(cobranza)

        self._commit()

        for ruta in rutas:
            if ruta.exists():
                ruta.unlink()

    def _construir_fecha(
        self,
        expediente: Expediente,
        dia: int,
        hora: str,
    ) -> datetime:

        fecha = expediente.fecha_creacion + timedelta(days=dia - 1)

        try:
            horas, minutos = map(int, hora.split(":"))
        except (ValueError, AttributeError):
            raise OperacionInvalida("La hora debe tener el formato HH:MM.")

        if not 0 <= horas <= 23 or not 0 <= minutos <= 59:
            raise OperacionInvalida("La hora debe tener el formato HH:MM.")

        return fecha.replace(
            hour=horas,
            minute=minutos,
            second=0,
            microsecond=0,
        )

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
