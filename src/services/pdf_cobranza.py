from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select

from src.core.almacenamiento import carpeta_gestion_dia, crear_carpeta_gestion_dia
from src.core.config import HORARIOS_GESTION
from src.core.exceptions import ConflictoNegocio, NoEncontrado
from src.core.pdf import imagen_base64, renderizar_pdf

from src.models.cobranza import Cobranza

from src.services.base import BaseService
from src.services.expediente import ExpedienteService

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
LOGO_PATH = TEMPLATES_DIR / "assets" / "mgc_logo.png"

_entorno = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


class PDFCobranzaService(BaseService):

    NOMBRE_ARCHIVO = "Gestion.pdf"

    def generar(self, id_expediente: int, dia: int) -> Path:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        cliente = expediente.cliente

        intentos = (
            self.session.scalars(
                select(Cobranza)
                .where(Cobranza.id_expediente == id_expediente)
                .where(Cobranza.dia == dia)
                .order_by(Cobranza.orden)
            )
            .all()
        )

        if not intentos:
            raise NoEncontrado(
                f"El expediente '{id_expediente}' no tiene intentos registrados "
                f"para el día {dia}."
            )

        fecha_dia = intentos[0].fecha.date()

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

        contexto = {
            "dia": dia,
            "fecha_dia": fecha_dia.strftime("%d/%m/%Y"),
            "fecha_registro": expediente.fecha_creacion.strftime("%d/%m/%Y"),
            "cliente": cliente,
            "responsable": responsable,
            "monto_vencido": None,
            "comentarios_expediente": expediente.comentarios,
            "firma_base64": firma_base64,
            "logo_base64": imagen_base64(LOGO_PATH),
            "intentos": [
                {
                    "orden": intento.orden,
                    "horario_programado": f"{HORARIOS_GESTION[intento.orden]:02d}:00",
                    "hora": intento.fecha.strftime("%H:%M"),
                    "medio": intento.medio,
                    "contacto": intento.contacto,
                    "comentarios": intento.comentarios,
                }
                for intento in intentos
            ],
        }

        plantilla = _entorno.get_template("pdf_cobranza.html")

        html = plantilla.render(**contexto)

        pdf_bytes = renderizar_pdf(html)

        carpeta = carpeta_gestion_dia(cliente, expediente, fecha_dia)
        crear_carpeta_gestion_dia(cliente, expediente, fecha_dia)

        ruta = carpeta / self.NOMBRE_ARCHIVO

        ruta.write_bytes(pdf_bytes)

        return ruta