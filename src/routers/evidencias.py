from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from src.core.database import get_session
from src.core.deps import requiere_rol, usuario_actual
from src.models.usuario import Usuario
from src.schemas.evidencia import EvidenciaRead
from src.services.evidencia import EvidenciaService


router = APIRouter(
    prefix="/cobranzas",
    tags=["Evidencias"]
)


@router.post(
    "/{id_cobranza}/evidencias",
    response_model=EvidenciaRead
)
def subir_evidencia(
    id_cobranza: int,
    archivo: UploadFile = File(...),
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
):
    servicio = EvidenciaService(session)

    return servicio.crear(
        id_cobranza=id_cobranza,
        id_usuario=usuario_actual.id,
        archivo=archivo
    )


@router.get(
    "/{id_cobranza}/evidencias",
    response_model=list[EvidenciaRead]
)
def listar_evidencias(
    id_cobranza: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = EvidenciaService(session)

    return servicio.listar_por_cobranza(id_cobranza)