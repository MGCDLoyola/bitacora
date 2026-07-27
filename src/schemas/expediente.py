from src.schemas.base import SchemaBase
from src.schemas.cliente import ClienteRead
from src.schemas.usuario import UsuarioRead
from datetime import date

class ExpedienteBase(SchemaBase):

    fecha_incumplimiento: date | None = None

class ExpedienteRead(ExpedienteBase):

    id      : int
    cliente : ClienteRead
    usuario : UsuarioRead | None = None