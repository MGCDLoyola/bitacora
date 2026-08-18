from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from src.core.config import COOKIE_SECURE, NOMBRE_COOKIE_SESION, SESION_DURACION_HORAS
from src.core.database import get_session
from src.schemas.auth import LoginRequest
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