import uuid

from sqlalchemy import ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .expediente import Expediente
    from .usuario import Usuario
    from .tipo_documento import TipoDocumento


class Documento(AuditoriaMixin, Base):
    __tablename__ = "documentos"

    id: Mapped[int] = mapped_column(
        "id_documento",
        primary_key=True
    )

    id_expediente: Mapped[int] = mapped_column(
        ForeignKey("expedientes.id_expediente", ondelete="CASCADE"),
        nullable=False
    )

    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="RESTRICT"),
        nullable=False
    )

    id_tipo_documento: Mapped[int] = mapped_column(
        ForeignKey("tipos_documento.id_tipo_documento", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False
    )

    uuid_archivo: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        unique=True,
        nullable=False,
        default=uuid.uuid4
    )

    nombre_original: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    ruta_archivo: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    expediente: Mapped["Expediente"] = relationship(
        "Expediente",
        back_populates="documentos"
    )

    usuario: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="documentos"
    )

    tipo_documento: Mapped["TipoDocumento"] = relationship(
        "TipoDocumento",
        back_populates="documentos"
    )