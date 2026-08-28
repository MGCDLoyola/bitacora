import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base import Base
from src.core.mixins import AuditoriaMixin

if TYPE_CHECKING:
    from .cobranza import Cobranza
    from .usuario import Usuario


class Evidencia(AuditoriaMixin, Base):
    __tablename__ = "evidencias"
    __table_args__ = (
        CheckConstraint("tipo IN ('AVISO', 'RESPUESTA')", name="chk_tipo_evidencia"),
    )

    id: Mapped[int] = mapped_column("id_evidencia", primary_key=True)

    id_cobranza: Mapped[int] = mapped_column(
        ForeignKey("cobranzas.id_cobranza", ondelete="CASCADE"), nullable=False
    )

    tipo: Mapped[str] = mapped_column(String(20), nullable=False)

    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="RESTRICT"), nullable=False
    )

    uuid_archivo: Mapped[uuid.UUID] = mapped_column(
        Uuid, unique=True, nullable=False, default=uuid.uuid4
    )

    nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)

    ruta_archivo: Mapped[str] = mapped_column(Text, nullable=False)

    cobranza: Mapped["Cobranza"] = relationship("Cobranza", back_populates="evidencias")

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="evidencias")
