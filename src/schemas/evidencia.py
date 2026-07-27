import uuid

from src.schemas.base import SchemaBase

class EvidenciaRead(SchemaBase):

    id              : int
    nombre_original : str
    uuid_archivo    : uuid.UUID