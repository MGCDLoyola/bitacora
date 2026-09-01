import uuid

from src.schemas.base import SchemaBase
from src.schemas.tipo_documento import TipoDocumentoRead


class DocumentoRead(SchemaBase):
    id: int
    id_tipo_documento: int
    nombre_original: str
    uuid_archivo: uuid.UUID
    tipo_documento: TipoDocumentoRead
