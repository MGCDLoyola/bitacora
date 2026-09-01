from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.core.exceptions import ConflictoNegocio
from src.models.cobranza import Cobranza
from src.models.documento import Documento
from src.models.tipo_documento import TipoDocumento
from src.services.base import BaseService
from src.services.expediente import ExpedienteService


class ConsolidacionService(BaseService):
    def preconsolidar(self, id_expediente: int) -> dict:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        if not expediente.estado:
            raise ConflictoNegocio(
                "No se puede generar una consolidación para un expediente cerrado."
            )

        if expediente.fecha_consolidacion is None:
            raise ConflictoNegocio(
                "El expediente todavía no se encuentra en etapa de consolidación."
            )

        stmt_cobranzas = (
            select(Cobranza)
            .where(Cobranza.id_expediente == id_expediente)
            .options(selectinload(Cobranza.evidencias))
            .order_by(Cobranza.dia, Cobranza.orden)
        )

        cobranzas = self.session.execute(stmt_cobranzas).scalars().all()

        tipo_edc = self.session.execute(
            select(TipoDocumento).where(TipoDocumento.nombre == "Estado de Cuenta SAP")
        ).scalar_one_or_none()

        if tipo_edc is None:
            raise ConflictoNegocio(
                "No existe el tipo de documento 'Estado de Cuenta SAP'."
            )

        stmt_edc = (
            select(Documento)
            .where(
                Documento.id_expediente == id_expediente,
                Documento.id_tipo_documento == tipo_edc.id,
            )
            .order_by(Documento.fecha_creacion)
        )

        documentos_edc = self.session.execute(stmt_edc).scalars().all()

        if not documentos_edc:
            raise ConflictoNegocio(
                "Debes subir el Estado de Cuenta SAP antes de generar la consolidación."
            )

        tipo_consolidacion = self.session.execute(
            select(TipoDocumento).where(TipoDocumento.nombre == "Consolidación")
        ).scalar_one_or_none()

        if tipo_consolidacion is None:
            raise ConflictoNegocio("No existe el tipo de documento 'Consolidación'.")

        tiene_consolidacion = self.session.scalar(
            select(Documento.id)
            .where(
                Documento.id_expediente == id_expediente,
                Documento.id_tipo_documento == tipo_consolidacion.id,
            )
            .limit(1)
        )

        if tiene_consolidacion is not None:
            raise ConflictoNegocio("El expediente ya tiene una consolidación generada.")

        return {
            "id_expediente": id_expediente,
            "cobranzas": cobranzas,
            "documentos_edc": documentos_edc,
        }
