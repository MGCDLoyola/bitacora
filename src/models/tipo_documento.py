from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .documento import Documento


class TipoDocumento(AuditoriaMixin, Base):
    __tablename__ = "tipos_documento"

    id: Mapped[int] = mapped_column(
        "id_tipo_documento",
        primary_key=True
    )

    nombre: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    descripcion: Mapped[str | None] = mapped_column(
        Text
    )

    documentos: Mapped[list["Documento"]] = relationship(
        "Documento",
        back_populates="tipo_documento"
    )