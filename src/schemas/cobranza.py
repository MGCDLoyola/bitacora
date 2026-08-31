from datetime import datetime

from src.schemas.base import SchemaBase
from src.schemas.usuario import UsuarioRead


class CobranzaBase(SchemaBase):
    fecha: datetime

    contacto: bool

    medio: str | None = None

    comentarios: str | None = None


class CobranzaCreate(SchemaBase):
    dia: int
    orden: int
    hora: str
    contacto: bool
    medio: str | None = None
    comentarios: str | None = None


class CobranzaRead(CobranzaBase):
    id: int
    dia: int
    orden: int
    usuario: UsuarioRead
