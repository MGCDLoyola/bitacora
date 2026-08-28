from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

if TYPE_CHECKING:
    from .expediente import Expediente


class Cliente(AuditoriaMixin, Base):
    __tablename__ = "clientes"

    interlocutor: Mapped[str] = mapped_column(String(20), primary_key=True)

    central: Mapped[str] = mapped_column(String(10), nullable=False)

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)

    correo: Mapped[str | None] = mapped_column(String(255))

    contrato: Mapped[str | None] = mapped_column(String(50))

    expedientes: Mapped[list["Expediente"]] = relationship(
        "Expediente", back_populates="cliente"
    )
