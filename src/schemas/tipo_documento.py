from src.schemas.base import SchemaBase

class TipoDocumentoBase(SchemaBase):

    nombre      : str
    descripcion : str | None = None

class TipoDocumentoRead(TipoDocumentoBase):
    
    id: int