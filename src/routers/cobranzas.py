from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.database import get_session
from src.core.deps import requiere_rol, usuario_actual
from src.models.usuario import Usuario
from src.schemas.cobranza import CobranzaRead, CobranzaUpdate
from src.services.cobranza import CobranzaService

router = APIRouter(prefix="/cobranzas", tags=["Cobranzas"])


@router.get("/{id_cobranza}", response_model=CobranzaRead)
def obtener_cobranza(
    id_cobranza: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = CobranzaService(session)

    return servicio.obtener(id_cobranza)


@router.patch("/{id_cobranza}", response_model=CobranzaRead)
def actualizar_cobranza(
    id_cobranza: int,
    data: CobranzaUpdate,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol(
            "Administrador",
            "Supervisor",
            "Cobranza",
        )
    ),
):
    servicio = CobranzaService(session)

    return servicio.actualizar(
        id_cobranza=id_cobranza,
        id_usuario=usuario_actual.id,
        data=data,
    )


@router.delete("/{id_cobranza}", status_code=204)
def eliminar_cobranza(
    id_cobranza: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol(
            "Administrador",
            "Supervisor",
            "Cobranza",
        )
    ),
):
    servicio = CobranzaService(session)

    servicio.eliminar(
        id_cobranza=id_cobranza,
        id_usuario=usuario_actual.id,
    )
