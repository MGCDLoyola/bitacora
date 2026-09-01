from fastapi import APIRouter, Depends, Request, Response
from mgc_graph import Mail, Mailbox
from sqlalchemy.orm import Session

from src.core.config import (
    COOKIE_SECURE,
    LOGIN_RATE_LIMIT,
    NOMBRE_COOKIE_SESION,
    RECUPERACION_CONFIRMAR_RATE_LIMIT,
    RECUPERACION_RATE_LIMIT,
    SESION_DURACION_HORAS,
)
from src.core.database import get_session
from src.core.deps import mail, mailbox, sesion_actual, usuario_actual
from src.core.rate_limit import limiter
from src.models.sesion import Sesion
from src.models.usuario import Usuario
from src.schemas.auth import (
    CambiarPasswordRequest,
    ConfirmarRecuperacionRequest,
    LoginRequest,
    RecuperarPasswordRequest,
)
from src.schemas.usuario import UsuarioRead
from src.services.auth import AuthService


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=UsuarioRead)
@limiter.limit(LOGIN_RATE_LIMIT)
def login(
    request: Request,
    data: LoginRequest,
    response: Response,
    session: Session = Depends(get_session),
):
    servicio = AuthService(session)

    usuario, sesion = servicio.login(
        data.correo,
        data.password,
    )

    response.set_cookie(
        key=NOMBRE_COOKIE_SESION,
        value=str(sesion.id),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=SESION_DURACION_HORAS * 3600,
    )

    return usuario


@router.post("/cambiar-password", status_code=204)
def cambiar_password(
    data: CambiarPasswordRequest,
    response: Response,
    sesion: Sesion = Depends(sesion_actual),
    session: Session = Depends(get_session),
):
    servicio = AuthService(session)

    servicio.cambiar_password(
        sesion.usuario,
        sesion,
        data.password_actual,
        data.password_nueva,
    )

    response.delete_cookie(NOMBRE_COOKIE_SESION)


@router.post("/recuperar-pw", status_code=204)
@limiter.limit(RECUPERACION_RATE_LIMIT)
def recuperar_password(
    request: Request,
    data: RecuperarPasswordRequest,
    session: Session = Depends(get_session),
    mail: Mail = Depends(mail),
    mailbox: Mailbox = Depends(mailbox),
):
    servicio = AuthService(session)

    servicio.recuperar_password(
        correo=data.correo,
        mail=mail,
        mailbox=mailbox,
    )


@router.post("/recuperar-pw/confirmar", status_code=204)
@limiter.limit(RECUPERACION_CONFIRMAR_RATE_LIMIT)
def confirmar_recuperacion(
    request: Request,
    data: ConfirmarRecuperacionRequest,
    session: Session = Depends(get_session),
):
    servicio = AuthService(session)

    servicio.confirmar_recuperacion(
        correo=data.correo,
        codigo=data.codigo,
        password_nueva=data.password_nueva,
    )


@router.get("/me", response_model=UsuarioRead)
def obtener_usuario_actual(
    usuario: Usuario = Depends(usuario_actual),
):
    return usuario


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    sesion: Sesion = Depends(sesion_actual),
    session: Session = Depends(get_session),
):
    servicio = AuthService(session)

    servicio.logout(sesion)

    response.delete_cookie(NOMBRE_COOKIE_SESION)
