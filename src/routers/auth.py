from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from src.core.config import COOKIE_SECURE, NOMBRE_COOKIE_SESION, SESION_DURACION_HORAS
from src.core.database import get_session
from src.core.deps import sesion_actual
from src.models.sesion import Sesion
from src.schemas.auth import CambiarPasswordRequest, LoginRequest
from src.schemas.usuario import UsuarioRead
from src.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=UsuarioRead)
def login(
    data: LoginRequest,
    response: Response,
    session: Session = Depends(get_session)
):
    servicio = AuthService(session)
    usuario, sesion = servicio.login(data.correo, data.password)

    response.set_cookie(
        key=NOMBRE_COOKIE_SESION,
        value=str(sesion.id),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=SESION_DURACION_HORAS * 3600
    )

    return usuario


@router.post("/cambiar-password", status_code=204)
def cambiar_password(
    data: CambiarPasswordRequest,
    response: Response,
    sesion: Sesion = Depends(sesion_actual),
    session: Session = Depends(get_session)
):
    servicio = AuthService(session)
    servicio.cambiar_password(
        sesion.usuario,
        sesion,
        data.password_actual,
        data.password_nueva
    )

    response.delete_cookie(NOMBRE_COOKIE_SESION)