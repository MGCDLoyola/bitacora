import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select

from src.core.almacenamiento import (
    carpeta_cierre,
    crear_carpeta_cierre,
)
from src.core.config import HORARIOS_GESTION
from src.core.exceptions import ConflictoNegocio, NoEncontrado, OperacionInvalida
from src.core.monto import obtener_monto_vencido
from src.core.pdf import (
    codificar_base64,
    imagen_base64,
    renderizar_imagen,
    renderizar_pdf,
)
from src.models.cobranza import Cobranza
from src.models.documento import Documento
from src.models.expediente import Expediente
from src.models.tipo_documento import TipoDocumento
from src.models.usuario import Usuario
from src.services.base import BaseService
from src.services.expediente import ExpedienteService
from src.utils.money import money

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
LOGO_PATH = TEMPLATES_DIR / "assets" / "mgc_logo.png"

_entorno = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


class PDFCobranzaService(BaseService):
    NOMBRE_ARCHIVO = "Bitácora.pdf"

    def generar(self, id_expediente: int, dia: int) -> Path:
        ruta, _ = self._generar_documento(id_expediente, dia)

        try:
            self._commit()
        except Exception:
            if ruta.exists():
                ruta.unlink()
            raise

        return ruta

    def previsualizar_cierre(
        self, id_expediente: int, usuario_actual: Usuario
    ) -> list[dict]:

        expediente, dias = self._validar_puede_cerrar(id_expediente, usuario_actual)

        return [
            {
                "dia": dia,
                "imagen_base64": self._previsualizar_dia(expediente.id, dia),
            }
            for dia in dias
        ]

    def cerrar_con_bitacoras(
        self, id_expediente: int, usuario_actual: Usuario
    ) -> Expediente:

        expediente, dias = self._validar_puede_cerrar(id_expediente, usuario_actual)

        rutas = []

        for dia in dias:
            ruta, _ = self._generar_documento(id_expediente, dia)
            rutas.append(ruta)

        expediente.estado = False

        self.session.add(expediente)

        try:
            self._commit()
        except Exception:
            for ruta in rutas:
                if ruta.exists():
                    ruta.unlink()
            raise

        return expediente

    def _validar_puede_cerrar(
        self, id_expediente: int, usuario_actual: Usuario
    ) -> tuple[Expediente, list[int]]:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        if expediente.id_usuario != usuario_actual.id:
            raise OperacionInvalida(
                "No puedes cerrar un expediente que no tienes asignado."
            )

        if not expediente.estado:
            raise ConflictoNegocio("El expediente ya está cerrado.")

        dias = self._dias_con_intentos(id_expediente)

        if not dias:
            raise ConflictoNegocio("El expediente no tiene intentos registrados.")

        return expediente, dias

    def _dias_con_intentos(self, id_expediente: int) -> list[int]:
        return list(
            self.session.scalars(
                select(Cobranza.dia)
                .where(Cobranza.id_expediente == id_expediente)
                .distinct()
                .order_by(Cobranza.dia)
            ).all()
        )

    def _construir_html(
        self, id_expediente: int, dia: int
    ) -> tuple[Expediente, Usuario, str]:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        cliente = expediente.cliente

        intentos = self.session.scalars(
            select(Cobranza)
            .where(Cobranza.id_expediente == id_expediente)
            .where(Cobranza.dia == dia)
            .order_by(Cobranza.orden)
        ).all()

        if not intentos:
            raise NoEncontrado(
                f"El expediente '{id_expediente}' no tiene intentos registrados "
                f"para el día {dia}."
            )

        fecha_dia = intentos[0].fecha.date()

        monto_vencido = obtener_monto_vencido(
            interlocutor=expediente.interlocutor,
            fecha_ancla=fecha_dia,
        )

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
            "monto_vencido": money(monto_vencido),
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
                    "evidencias": [
                        evidencia.nombre_original for evidencia in intento.evidencias
                    ],
                }
                for intento in intentos
            ],
        }

        plantilla = _entorno.get_template("pdf_cobranza.html")

        html = plantilla.render(**contexto)

        return expediente, responsable, html

    def _previsualizar_dia(self, id_expediente: int, dia: int) -> str:
        _, _, html = self._construir_html(id_expediente, dia)

        imagen_bytes = renderizar_imagen(html)

        return codificar_base64(imagen_bytes, mime="image/png")

    def _generar_documento(
        self, id_expediente: int, dia: int
    ) -> tuple[Path, Documento]:

        expediente, responsable, html = self._construir_html(id_expediente, dia)

        cliente = expediente.cliente

        pdf_bytes = renderizar_pdf(html)

        crear_carpeta_cierre(cliente, expediente)

        carpeta = carpeta_cierre(cliente, expediente)

        nombre_documento = f"Bitácora {dia}.pdf"
        ruta = carpeta / nombre_documento

        ruta.write_bytes(pdf_bytes)

        tipo_documento = self.session.scalar(
            select(TipoDocumento).where(TipoDocumento.nombre == f"Bitácora {dia}")
        )

        if tipo_documento is None:
            if ruta.exists():
                ruta.unlink()

            raise ConflictoNegocio(f"No existe el tipo de documento 'Bitácora {dia}'.")

        documento = Documento(
            id_expediente=expediente.id,
            id_usuario=responsable.id,
            id_tipo_documento=tipo_documento.id,
            uuid_archivo=uuid.uuid4(),
            nombre_original=nombre_documento,
            ruta_archivo=str(ruta),
        )

        self.session.add(documento)

        return ruta, documento
