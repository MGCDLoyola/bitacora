from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .cliente import Cliente
    from .documento import Documento
    from .cobranza import Cobranza
    from .usuario import Usuario

class Expediente(AuditoriaMixin, Base):
    __tablename__ = "expedientes"

    id: Mapped[int] = mapped_column(
        "id_expediente",
        primary_key=True
    )

    interlocutor: Mapped[str] = mapped_column(
        ForeignKey("clientes.interlocutor", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False
    )

    fecha_incumplimiento: Mapped[date | None] = mapped_column(
        Date
    )

    fecha_consolidacion: Mapped[date | None] = mapped_column(
            Date
        )

    id_usuario: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id_usuario", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=True
    )

    estado: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true"
    )

    comentarios: Mapped[str | None] = mapped_column(
        Text
    )

    cliente: Mapped["Cliente"] = relationship(
        "Cliente",
        back_populates="expedientes"
    )

    documentos: Mapped[list["Documento"]] = relationship(
        "Documento",
        back_populates="expediente"
    )

    cobranzas: Mapped[list["Cobranza"]] = relationship(
        "Cobranza",
        back_populates="expediente"
    )

    usuario: Mapped["Usuario | None"] = relationship(
        "Usuario",
        back_populates="expedientes_asignados"
    )