import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select

from src.core.almacenamiento import carpeta_vencimiento
from src.models.documento import Documento
from src.core.exceptions import NoEncontrado

from src.services.expediente import ExpedienteService
from src.services.base import BaseService

from collections.abc import Sequence


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

    def eliminar(self, id_documento: int) -> None:

        documento = self.obtener(id_documento)
        ruta = Path(documento.ruta_archivo)

        self._eliminar_archivo(documento, ruta)
