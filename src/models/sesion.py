import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .usuario import Usuario

class Sesion(AuditoriaMixin, Base):
    __tablename__ = "sesiones"

    id: Mapped[uuid.UUID] = mapped_column(
        "id_sesion",
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False
    )

    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    usuario: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="sesiones"
    )