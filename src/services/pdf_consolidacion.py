import uuid
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from fastapi import UploadFile
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select

from src.core.almacenamiento import (
    carpeta_consolidacion,
    crear_carpeta_consolidacion,
)
from src.core.config import HORARIOS_GESTION
from src.core.exceptions import ConflictoNegocio
from src.core.monto import obtener_monto_vencido
from src.core.pdf import codificar_base64, imagen_base64, renderizar_pdf
from src.models.documento import Documento
from src.models.expediente import Expediente
from src.models.tipo_documento import TipoDocumento
from src.models.usuario import Usuario
from src.services.base import BaseService
from src.services.consolidacion import ConsolidacionService
from src.services.documento import DocumentoService
from src.services.expediente import ExpedienteService
from src.utils.money import money

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
LOGO_PATH = TEMPLATES_DIR / "assets" / "mgc_logo.png"

_entorno = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


class PDFConsolidacionService(BaseService):
    NOMBRE_ARCHIVO = "Consolidación.pdf"

    def previsualizar(
        self,
        id_expediente: int,
        decision: str,
        justificacion: str,
        archivo: UploadFile,
        usuario_actual: Usuario,
    ) -> str:

        documento_edc_simulado = self._documento_edc_simulado(
            archivo, usuario_actual
        )

        _, _, html = self._construir_html(
            id_expediente,
            decision,
            justificacion,
            validar_edc_persistido=False,
            documentos_edc_override=[documento_edc_simulado],
        )

        pdf_bytes = renderizar_pdf(html)

        return codificar_base64(pdf_bytes, mime="application/pdf")

    def confirmar(
        self,
        id_expediente: int,
        decision: str,
        justificacion: str,
        archivo: UploadFile,
        usuario_actual: Usuario,
    ) -> Documento:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        ConsolidacionService(self.session).preconsolidar(
            id_expediente, validar_edc_persistido=False
        )

        self._validar_responsable_firma(expediente)

        documento_edc = DocumentoService(self.session).crear_estado_cuenta(
            id_expediente=id_expediente,
            id_usuario=usuario_actual.id,
            archivo=archivo,
            requiere_consolidacion_previa=False,
        )

        try:
            ExpedienteService(self.session).guardar_consolidacion(
                id_expediente=id_expediente,
                decision=decision,
                justificacion=justificacion,
            )

            expediente, responsable, html = self._construir_html(
                id_expediente, decision, justificacion
            )

            cliente = expediente.cliente

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

                raise ConflictoNegocio(
                    "No existe el tipo de documento 'Consolidación'."
                )

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
        except Exception:
            DocumentoService(self.session).eliminar(documento_edc.id)
            raise

        return documento

    def _validar_responsable_firma(self, expediente: Expediente) -> Usuario:

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

        return responsable

    def _documento_edc_simulado(
        self,
        archivo: UploadFile,
        usuario_actual: Usuario,
    ) -> SimpleNamespace:

        return SimpleNamespace(
            nombre_original=archivo.filename,
            fecha_creacion=datetime.now(),
            usuario=SimpleNamespace(nombre=usuario_actual.nombre),
        )

    def _construir_html(
        self,
        id_expediente: int,
        decision: str,
        justificacion: str,
        validar_edc_persistido: bool = True,
        documentos_edc_override: Sequence | None = None,
    ) -> tuple[Expediente, Usuario, str]:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        preconsolidacion = ConsolidacionService(self.session).preconsolidar(
            id_expediente, validar_edc_persistido=validar_edc_persistido
        )

        cobranzas = preconsolidacion["cobranzas"]
        documentos_edc = (
            documentos_edc_override
            if documentos_edc_override is not None
            else preconsolidacion["documentos_edc"]
        )

        cliente = expediente.cliente
        responsable = self._validar_responsable_firma(expediente)

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

        return expediente, responsable, html