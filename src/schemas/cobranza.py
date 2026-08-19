from datetime import datetime

from src.schemas.base import SchemaBase
from src.schemas.usuario import UsuarioRead

class CobranzaBase(SchemaBase):

    fecha       : datetime
    contacto    : bool
    medio       : str | None = None
    comentarios : str | None = None

class CobranzaCreate(CobranzaBase):

    pass

class CobranzaUpdate(SchemaBase):

    fecha       : datetime | None = None
    contacto    : bool     | None = None
    medio       : str      | None = None
    comentarios : str      | None = None

class CobranzaRead(CobranzaBase):

    id      : int
    orden   : int
    usuario : UsuarioRead