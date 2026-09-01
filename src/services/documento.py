import io
import shutil
import uuid
import zipfile
from collections.abc import Sequence
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select

from src.core.almacenamiento import carpeta_vencimiento
from src.core.exceptions import ConflictoNegocio, NoEncontrado
from src.models.documento import Documento
from src.models.tipo_documento import TipoDocumento
from src.services.base import BaseService
from src.services.expediente import ExpedienteService


class DocumentoService(BaseService):
    def listar_por_expediente(self, id_expediente: int) -> Sequence[Documento]:

        stmt = (
            select(Documento)
            .where(Documento.id_expediente == id_expediente)
            .order_by(Documento.fecha_creacion)
        )

        return self.session.execute(stmt).scalars().all()

    def obtener(self, id_documento: int) -> Documento:
        documento = self.session.get(Documento, id_documento)

        if documento is None:
            raise NoEncontrado(f"No existe el documento con id '{id_documento}'.")

        return documento

    def crear(
        self,
        id_expediente: int,
        id_usuario: int,
        id_tipo_documento: int,
        archivo: UploadFile,
    ) -> Documento:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        cliente = expediente.cliente

        carpeta = carpeta_vencimiento(cliente, expediente)

        uuid_archivo = uuid.uuid4()
        extension = Path(archivo.filename).suffix
        ruta_destino = carpeta / f"{uuid_archivo}{extension}"

        documento = Documento(
            id_expediente=id_expediente,
            id_usuario=id_usuario,
            id_tipo_documento=id_tipo_documento,
            uuid_archivo=uuid_archivo,
            nombre_original=archivo.filename,
            ruta_archivo=str(ruta_destino),
        )

        self.session.add(documento)

        def escribir(destino: Path) -> None:
            with destino.open("wb") as f:
                shutil.copyfileobj(archivo.file, f)

        self._guardar_archivo(documento, ruta_destino, escribir)

        return documento

    def crear_estado_cuenta(
        self,
        id_expediente: int,
        id_usuario: int,
        archivo: UploadFile,
    ) -> Documento:

        expediente = ExpedienteService(self.session).obtener(id_expediente)

        if not expediente.estado:
            raise ConflictoNegocio(
                "No se puede subir un Estado de Cuenta SAP a un expediente cerrado."
            )

        if expediente.fecha_consolidacion is None:
            raise ConflictoNegocio(
                "El expediente todavía no se encuentra en etapa de consolidación."
            )

        tipo_documento = self.session.scalar(
            select(TipoDocumento).where(TipoDocumento.nombre == "Estado de Cuenta SAP")
        )

        if tipo_documento is None:
            raise ConflictoNegocio(
                "No existe el tipo de documento 'Estado de Cuenta SAP'."
            )

        return self.crear(
            id_expediente=id_expediente,
            id_usuario=id_usuario,
            id_tipo_documento=tipo_documento.id,
            archivo=archivo,
        )

    def eliminar(self, id_documento: int) -> None:

        documento = self.obtener(id_documento)
        ruta = Path(documento.ruta_archivo)

        self._eliminar_archivo(documento, ruta)

    def zip_bitacoras(self, id_expediente: int) -> io.BytesIO:

        ExpedienteService(self.session).obtener(id_expediente)

        stmt = (
            select(Documento)
            .join(TipoDocumento, Documento.id_tipo_documento == TipoDocumento.id)
            .where(
                Documento.id_expediente == id_expediente,
                TipoDocumento.nombre.like("Bitácora %"),
            )
            .order_by(TipoDocumento.nombre)
        )

        documentos = self.session.execute(stmt).scalars().all()

        if not documentos:
            raise ConflictoNegocio("El expediente no tiene bitácoras generadas.")

        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archivo_zip:
            for documento in documentos:
                ruta = Path(documento.ruta_archivo)

                if ruta.exists():
                    archivo_zip.write(ruta, arcname=documento.nombre_original)

        buffer.seek(0)

        return buffer
