from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from src.core.database import get_session
from src.core.deps import requiere_rol, usuario_actual
from src.models.usuario import Usuario
from src.schemas.documento import DocumentoRead
from src.services.documento import DocumentoService


router = APIRouter(prefix="/expedientes", tags=["Documentos"])


@router.post("/{id_expediente}/documentos", response_model=DocumentoRead)
def subir_documento(
    id_expediente: int,
    id_tipo_documento: int = Form(...),
    archivo: UploadFile = File(...),
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
):
    servicio = DocumentoService(session)

    return servicio.crear(
        id_expediente=id_expediente,
        id_usuario=usuario_actual.id,
        id_tipo_documento=id_tipo_documento,
        archivo=archivo,
    )


@router.get("/{id_expediente}/documentos", response_model=list[DocumentoRead])
def listar_documentos(
    id_expediente: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = DocumentoService(session)

    return servicio.listar_por_expediente(id_expediente)
