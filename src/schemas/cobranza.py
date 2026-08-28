from datetime import datetime

from src.schemas.base import SchemaBase
from src.schemas.usuario import UsuarioRead


class CobranzaBase(SchemaBase):

    fecha: datetime

    contacto: bool

    medio: str | None = None

    comentarios: str | None = None


class CobranzaCreate(SchemaBase):

    hora: str
    contacto: bool
    medio: str | None = None
    comentarios: str | None = None

class CobranzaUpdate(SchemaBase):
    fecha: datetime | None = None
    contacto: bool = None
    medio: str | None = None
    comentarios: str | None = None


class CobranzaRead(CobranzaBase):
    id: int
    orden: int
    usuario: UsuarioRead
