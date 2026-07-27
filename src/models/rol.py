from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .usuario import Usuario

class Rol(AuditoriaMixin, Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(
        "id_rol",
        primary_key=True
    )

    nombre: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    descripcion: Mapped[str | None] = mapped_column(
        String(255)
    )

    usuarios: Mapped[list["Usuario"]] = relationship(
        "Usuario",
        back_populates="rol"
    )