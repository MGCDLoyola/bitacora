import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select

from src.core.almacenamiento import (
    carpeta_consolidacion,
    crear_carpeta_consolidacion,
)
from src.core.config import HORARIOS_GESTION
from src.core.exceptions import ConflictoNegocio
from src.core.monto import obtener_monto_vencido
from src.core.pdf import imagen_base64, renderizar_pdf
from src.models.documento import Documento
from src.models.tipo_documento import TipoDocumento
from src.services.base import BaseService
from src.services.consolidacion import ConsolidacionService
from src.services.expediente import ExpedienteService
from src.utils.money import money

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
LOGO_PATH = TEMPLATES_DIR / "assets" / "mgc_logo.png"

_entorno = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


class PDFConsolidacionService(BaseService):
    NOMBRE_ARCHIVO = "Consolidación.pdf"

    DECISIONES_VALIDAS = {
        "Continuar gestión extrajudicial",
        "Escalar a jurídico (formal)",
        "Cierre por pago",
    }

    def generar(self, id_expediente: int) -> Path:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        preconsolidacion = ConsolidacionService(self.session).preconsolidar(
            id_expediente
        )

        cobranzas = preconsolidacion["cobranzas"]
        documentos_edc = preconsolidacion["documentos_edc"]

        decision, justificacion = self._obtener_decision_y_justificacion(
            expediente.comentarios
        )

        cliente = expediente.cliente
        responsable = expediente.usuario

        if responsable is None:
            raise ConflictoNegocio(
                "El expediente no tiene un responsable de cobranza asignado."
            )

        if not responsable.firma:
            raise ConflictoNegocio(
                "El responsable de cobranza no tiene una firma registrada. "
                "Debe subirla antes de poder generar el PDF."
            )

        from src.services.usuario import UsuarioService

        ruta_firma = UsuarioService(self.session).obtener_firma(responsable)
        firma_base64 = imagen_base64(ruta_firma)

        dias = []

        for dia in range(1, 5):
            intentos_dia = sorted(
                (cobranza for cobranza in cobranzas if cobranza.dia == dia),
                key=lambda cobranza: cobranza.orden,
            )

            if not intentos_dia:
                dias.append(
                    {
                        "dia": dia,
                        "fecha_dia": "N/D",
                        "monto_vencido": "",
                        "intentos": [],
                    }
                )
                continue

            fecha_dia = intentos_dia[0].fecha.date()

            monto_vencido = obtener_monto_vencido(
                interlocutor=expediente.interlocutor,
                fecha_ancla=fecha_dia,
            )

            dias.append(
                {
                    "dia": dia,
                    "fecha_dia": fecha_dia.strftime("%d/%m/%Y"),
                    "monto_vencido": money(monto_vencido),
                    "intentos": [
                        {
                            "orden": intento.orden,
                            "horario_programado": (
                                f"{HORARIOS_GESTION[intento.orden]:02d}:00"
                            ),
                            "hora": intento.fecha.strftime("%H:%M"),
                            "medio": intento.medio,
                            "contacto": intento.contacto,
                            "comentarios": intento.comentarios,
                            "avisos": [
                                evidencia.nombre_original
                                for evidencia in intento.evidencias
                                if evidencia.tipo == "AVISO"
                            ],
                            "respuestas": [
                                evidencia.nombre_original
                                for evidencia in intento.evidencias
                                if evidencia.tipo == "RESPUESTA"
                            ],
                        }
                        for intento in intentos_dia
                    ],
                }
            )

        contexto = {
            "fecha_registro": expediente.fecha_creacion.strftime("%d/%m/%Y"),
            "cliente": cliente,
            "responsable": responsable,
            "comentarios_expediente": expediente.comentarios,
            "decision": decision,
            "justificacion": justificacion,
            "firma_base64": firma_base64,
            "logo_base64": imagen_base64(LOGO_PATH),
            "dias": dias,
            "documentos_edc": [
                {
                    "nombre_original": documento.nombre_original,
                    "fecha_subida": documento.fecha_creacion.strftime("%d/%m/%Y %H:%M"),
                    "usuario": documento.usuario.nombre,
                }
                for documento in documentos_edc
            ],
        }

        plantilla = _entorno.get_template("pdf_consolidacion.html")

        html = plantilla.render(**contexto)

        pdf_bytes = renderizar_pdf(html)

        crear_carpeta_consolidacion(cliente, expediente)

        carpeta = carpeta_consolidacion(cliente, expediente)

        ruta = carpeta / self.NOMBRE_ARCHIVO

        ruta.write_bytes(pdf_bytes)

        tipo_documento = self.session.scalar(
            select(TipoDocumento).where(TipoDocumento.nombre == "Consolidación")
        )

        if tipo_documento is None:
            if ruta.exists():
                ruta.unlink()

            raise ConflictoNegocio("No existe el tipo de documento 'Consolidación'.")

        documento = Documento(
            id_expediente=expediente.id,
            id_usuario=responsable.id,
            id_tipo_documento=tipo_documento.id,
            uuid_archivo=uuid.uuid4(),
            nombre_original=self.NOMBRE_ARCHIVO,
            ruta_archivo=str(ruta),
        )

        self.session.add(documento)

        try:
            self._commit()
        except Exception:
            if ruta.exists():
                ruta.unlink()
            raise

        return ruta

    def _obtener_decision_y_justificacion(
        self,
        comentarios: str | None,
    ) -> tuple[str, str]:

        if not comentarios or not comentarios.strip():
            raise ConflictoNegocio(
                "Debes seleccionar una decisión y proporcionar la "
                "justificación antes de generar la consolidación."
            )

        contenido = comentarios.strip()

        for decision in self.DECISIONES_VALIDAS:
            prefijo = f"{decision}:"

            if contenido.startswith(prefijo):
                justificacion = contenido[len(prefijo) :].strip()

                if not justificacion:
                    raise ConflictoNegocio(
                        "Debes proporcionar la justificación de la decisión."
                    )

                return decision, justificacion

        raise ConflictoNegocio(
            "El expediente no tiene una decisión de consolidación válida."
        )
