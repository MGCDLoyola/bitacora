import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.almacenamiento import carpeta_vencimiento
from src.models.documento import Documento
from src.models.expediente import Expediente

from collections.abc import Sequence


class DocumentoService:

    def __init__(self, session: Session):
        self.session = session

    def listar_por_expediente(self, id_expediente: int) -> Sequence[Documento]:

        stmt = (
            select(Documento)
            .where(Documento.id_expediente == id_expediente)
            .order_by(Documento.fecha_creacion)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def obtener(self, id_documento: int) -> Documento | None:

        return self.session.get(Documento, id_documento)

    def crear(self, id_expediente: int, id_usuario: int, id_tipo_documento: int, archivo: UploadFile) -> Documento:

        expediente = self.session.get(Expediente, id_expediente)

        if expediente is None:
            raise ValueError(f"No existe un expediente con id '{id_expediente}'")

        cliente = expediente.cliente

        carpeta = carpeta_vencimiento(cliente, expediente)
        carpeta.mkdir(parents=True, exist_ok=True)

        uuid_archivo = uuid.uuid4()
        extension = Path(archivo.filename).suffix
        ruta_destino = carpeta / f"{uuid_archivo}{extension}"

        with ruta_destino.open("wb") as destino:
            shutil.copyfileobj(archivo.file, destino)

        documento = Documento(
            id_expediente=id_expediente,
            id_usuario=id_usuario,
            id_tipo_documento=id_tipo_documento,
            uuid_archivo=uuid_archivo,
            nombre_original=archivo.filename,
            ruta_archivo=str(ruta_destino)
        )

        self.session.add(documento)
        self.session.commit()

        return documento

    def eliminar(self, id_documento: int) -> None:

        documento = self.session.get(Documento, id_documento)

        if documento is None:
            raise ValueError(f"No existe un documento con id '{id_documento}'")

        ruta = Path(documento.ruta_archivo)

        if ruta.exists():
            ruta.unlink()

        self.session.delete(documento)
        self.session.commit()