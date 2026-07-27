from datetime import datetime

from src.schemas.base import SchemaBase
from src.schemas.usuario import UsuarioRead

class CobranzaBase(SchemaBase):

    fecha       : datetime
    medio       : str | None = None
    resultado   : str | None = None
    comentarios : str | None = None

class CobranzaCreate(CobranzaBase):

    pass

class CobranzaUpdate(SchemaBase):

    fecha       : datetime | None = None
    medio       : str | None = None
    resultado   : str | None = None
    comentarios : str | None = None

class CobranzaRead(CobranzaBase):

    id      : int
    orden   : int
    usuario : UsuarioRead