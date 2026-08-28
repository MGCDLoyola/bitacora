from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.database import get_session
from src.core.deps import requiere_rol
from src.models.rol import Rol
from src.models.usuario import Usuario
from src.schemas.rol import RolRead

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/", response_model=list[RolRead])
def listar_roles(
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(requiere_rol("Administrador")),
):
    roles = session.scalars(select(Rol)).all()
    return roles
