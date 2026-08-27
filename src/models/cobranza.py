from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .expediente import Expediente
    from .usuario import Usuario
    from .evidencia import Evidencia


class Cobranza(AuditoriaMixin, Base):
    __tablename__ = "cobranzas"
    __table_args__ = (
        CheckConstraint("dia BETWEEN 1 AND 4", name="chk_dia"),
        CheckConstraint("orden BETWEEN 1 AND 3", name="chk_orden"),
        UniqueConstraint("id_expediente", "dia", "orden", name="uq_dia_orden"),
    )

    id: Mapped[int] = mapped_column("id_cobranza", primary_key=True)

    id_expediente: Mapped[int] = mapped_column(
        ForeignKey("expedientes.id_expediente", ondelete="CASCADE"), nullable=False
    )

    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="RESTRICT"), nullable=False
    )

    dia: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    orden: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    contacto: Mapped[bool] = mapped_column(Boolean, nullable=False)

    medio: Mapped[str | None] = mapped_column(String(50))

    comentarios: Mapped[str | None] = mapped_column(Text)

    expediente: Mapped["Expediente"] = relationship(
        "Expediente", back_populates="cobranzas"
    )

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="cobranzas")

    evidencias: Mapped[list["Evidencia"]] = relationship(
        "Evidencia",
        back_populates="cobranza",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
