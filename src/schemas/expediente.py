from datetime import date
from decimal import Decimal
from typing import Literal

from src.schemas.base import SchemaBase


class ExpedienteBase(SchemaBase):
    fecha_incumplimiento: date | None = None


class ExpedienteUpdate(SchemaBase):
    comentarios: str | None = None


class ExpedienteRead(ExpedienteBase):
    id: int

    interlocutor: str

    nombre_cliente: str

    contrato: str | None = None

    dia_actual: int

    modo_gestion: Literal["del_dia", "desfasado", "consolidacion", "cerrado"]

    monto_vencido: Decimal | None = None

    usuario: str | None = None

    comentarios: str | None = None


class ExpedienteGestionRead(SchemaBase):
    id: int

    interlocutor: str

    nombre_cliente: str

    contrato: str | None = None

    fecha_incumplimiento: date | None = None

    dia_actual: int

    monto_vencido: Decimal | None = None

    usuario: str | None = None

    dia: int | None = None

    intentos: int | None = None


class GestionesResumenRead(SchemaBase):
    del_dia: int

    desfasados: int

    consolidacion: int

    activos: int


class ExpedienteAsignacionMasiva(SchemaBase):
    ids: list[int]

    id_usuario: int | None = None


class ExpedienteBitacoraPreview(SchemaBase):
    dia: int

    pdf_base64: str


class ExpedienteResumenEliminacion(SchemaBase):
    cobranzas: int

    documentos: int


class ExpedienteConsolidacion(SchemaBase):
    decision: Literal[
        "Continuar gestión extrajudicial",
        "Escalar a jurídico (formal)",
        "Cierre por pago",
    ]

    justificacion: str
