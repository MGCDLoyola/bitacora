import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.almacenamiento import carpeta_gestion
from src.models.cobranza import Cobranza
from src.models.evidencia import Evidencia

from collections.abc import Sequence


class EvidenciaService:

    def __init__(self, session: Session):
        self.session = session

    def listar_por_cobranza(self, id_cobranza: int) -> Sequence[Evidencia]:

        stmt = (
            select(Evidencia)
            .where(Evidencia.id_cobranza == id_cobranza)
            .order_by(Evidencia.fecha_creacion)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def obtener(self, id_evidencia: int) -> Evidencia | None:

        return self.session.get(Evidencia, id_evidencia)

    def crear(self, id_cobranza: int, id_usuario: int, archivo: UploadFile) -> Evidencia:

        cobranza = self.session.get(Cobranza, id_cobranza)

        if cobranza is None:
            raise ValueError(f"No existe una cobranza con id '{id_cobranza}'")

        expediente = cobranza.expediente
        cliente = expediente.cliente

        carpeta = carpeta_gestion(cliente, expediente, cobranza.orden)
        carpeta.mkdir(parents=True, exist_ok=True)

        uuid_archivo = uuid.uuid4()
        extension = Path(archivo.filename).suffix
        ruta_destino = carpeta / f"{uuid_archivo}{extension}"

        with ruta_destino.open("wb") as destino:
            shutil.copyfileobj(archivo.file, destino)

        evidencia = Evidencia(
            id_cobranza=id_cobranza,
            id_usuario=id_usuario,
            uuid_archivo=uuid_archivo,
            nombre_original=archivo.filename,
            ruta_archivo=str(ruta_destino)
        )

        self.session.add(evidencia)
        self.session.commit()

        return evidencia

    def eliminar(self, id_evidencia: int) -> None:

        evidencia = self.session.get(Evidencia, id_evidencia)

        if evidencia is None:
            raise ValueError(f"No existe una evidencia con id '{id_evidencia}'")

        ruta = Path(evidencia.ruta_archivo)

        if ruta.exists():
            ruta.unlink()

        self.session.delete(evidencia)
        self.session.commit()