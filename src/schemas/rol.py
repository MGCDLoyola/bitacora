from src.schemas.base import SchemaBase

class RolBase(SchemaBase):

    nombre      : str
    descripcion : str | None = None

class RolRead(RolBase):
    
    id: int