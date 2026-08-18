from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .rol import Rol
    from .documento import Documento
    from .cobranza import Cobranza
    from .evidencia import Evidencia
    from .expediente import Expediente
    from .sesion import Sesion

class Usuario(AuditoriaMixin, Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(
        "id_usuario",
        primary_key=True
    )

    id_rol: Mapped[int] = mapped_column(
        ForeignKey("roles.id_rol"),
        nullable=False
    )

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    correo: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true"
    )

    ultimo_acceso: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    firma: Mapped[str | None] = mapped_column(
        Text, 
        nullable=True
    )

    rol: Mapped["Rol"] = relationship(
        "Rol",
        back_populates="usuarios"
    )

    documentos: Mapped[list["Documento"]] = relationship(
        "Documento",
        back_populates="usuario"
    )

    cobranzas: Mapped[list["Cobranza"]] = relationship(
        "Cobranza",
        back_populates="usuario"
    )

    evidencias: Mapped[list["Evidencia"]] = relationship(
        "Evidencia",
        back_populates="usuario"
    )

    expedientes_asignados: Mapped[list["Expediente"]] = relationship(
        "Expediente",
        back_populates="usuario"
    )

    sesiones: Mapped[list["Sesion"]] = relationship(
        "Sesion",
        back_populates="usuario"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)