import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select

from src.core.almacenamiento import carpeta_gestion
from src.models.evidencia import Evidencia
from src.core.exceptions import NoEncontrado

from src.services.cobranza import CobranzaService
from src.services.base import BaseService

from collections.abc import Sequence


class EvidenciaService(BaseService):

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

    def obtener(self, id_evidencia: int) -> Evidencia:
        evidencia = self.session.get(Evidencia, id_evidencia)

        if evidencia is None:
            raise NoEncontrado(
                f"No existe la evidencia con id '{id_evidencia}'."
            )

        return evidencia

    def crear(self, id_cobranza: int, id_usuario: int, archivo: UploadFile) -> Evidencia:

        cobranza = CobranzaService(self.session).obtener(id_cobranza)

        expediente = cobranza.expediente
        cliente = expediente.cliente

        carpeta = carpeta_gestion(cliente, expediente, cobranza.orden)

        uuid_archivo = uuid.uuid4()
        extension = Path(archivo.filename).suffix
        ruta_destino = carpeta / f"{uuid_archivo}{extension}"

        evidencia = Evidencia(
            id_cobranza=id_cobranza,
            id_usuario=id_usuario,
            uuid_archivo=uuid_archivo,
            nombre_original=archivo.filename,
            ruta_archivo=str(ruta_destino)
        )

        self.session.add(evidencia)

        def escribir(destino: Path) -> None:
            with destino.open("wb") as f:
                shutil.copyfileobj(archivo.file, f)

        self._guardar_archivo(evidencia, ruta_destino, escribir)

        return evidencia

    def eliminar(self, id_evidencia: int) -> None:

        evidencia = self.obtener(id_evidencia)
        ruta = Path(evidencia.ruta_archivo)

        self._eliminar_archivo(evidencia, ruta)