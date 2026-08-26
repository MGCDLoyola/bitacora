from datetime import date
from decimal import Decimal

from src.schemas.base import SchemaBase
from src.schemas.cliente import ClienteRead
from src.schemas.usuario import UsuarioRead


class ExpedienteBase(SchemaBase):

    fecha_incumplimiento: date | None = None


class ExpedienteUpdate(SchemaBase):

    comentarios: str | None = None


class ExpedienteRead(ExpedienteBase):

    id: int
    cliente: ClienteRead
    usuario: UsuarioRead | None = None
    comentarios: str | None = None


class ExpedienteGestionRead(SchemaBase):

    id: int
    interlocutor: str
    nombre_cliente: str
    contrato: str | None = None
    monto_vencido: Decimal | None = None
    usuario: str | None = None
    dia: int | None = None
    intentos: int | None = None


class GestionesResumenRead(SchemaBase):

    del_dia: int
    desfasados: int
    consolidacion: int
    activos: int