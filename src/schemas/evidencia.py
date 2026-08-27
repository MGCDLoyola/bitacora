import uuid
from typing import Literal

from src.schemas.base import SchemaBase


class EvidenciaRead(SchemaBase):
    id: int
    tipo: Literal["AVISO", "RESPUESTA"]
    nombre_original: str
    uuid_archivo: uuid.UUID
