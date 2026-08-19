import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from src.core.database import SessionLocal
from src.main import app
from src.models.rol import Rol
from src.models.sesion import Sesion
from src.models.usuario import Usuario


@pytest.fixture
def db():

    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def rol_cobranza(db):
    return db.scalar(select(Rol).where(Rol.nombre == "Cobranza"))


@pytest.fixture
def rol_administrador(db):
    return db.scalar(select(Rol).where(Rol.nombre == "Administrador"))


def _borrar_usuario_y_sesiones(db, usuario):
    """Limpieza de teardown: primero las sesiones (evita el NOT NULL de
    id_usuario, ya que el ORM no confía en el ON DELETE CASCADE de la DB
    por default), luego el usuario."""

    db.execute(delete(Sesion).where(Sesion.id_usuario == usuario.id))
    db.commit()

    existe = db.get(Usuario, usuario.id)
    if existe is not None:
        db.delete(existe)
        db.commit()


@pytest.fixture
def usuario_normal(db, rol_cobranza):
    """Usuario ya con contraseña establecida (ultimo_acceso != None)."""

    usuario = Usuario(
        id_rol=rol_cobranza.id,
        nombre="Test Etapa8 Normal",
        correo=f"test_normal_{uuid.uuid4().hex[:8]}@bitacora.test",
        activo=True,
        ultimo_acceso=datetime.now(timezone.utc)
    )
    usuario.set_password("PasswordActual123")

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    yield usuario

    _borrar_usuario_y_sesiones(db, usuario)


@pytest.fixture
def usuario_pendiente(db, rol_cobranza):
    """Usuario recién creado, con password pendiente por cambiar (ultimo_acceso is None)."""

    usuario = Usuario(
        id_rol=rol_cobranza.id,
        nombre="Test Etapa8 Pendiente",
        correo=f"test_pendiente_{uuid.uuid4().hex[:8]}@bitacora.test",
        activo=True
    )
    usuario.set_password("123456")

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    yield usuario

    _borrar_usuario_y_sesiones(db, usuario)


@pytest.fixture
def usuario_inactivo(db, rol_cobranza):

    usuario = Usuario(
        id_rol=rol_cobranza.id,
        nombre="Test Etapa8 Inactivo",
        correo=f"test_inactivo_{uuid.uuid4().hex[:8]}@bitacora.test",
        activo=False,
        ultimo_acceso=datetime.now(timezone.utc)
    )
    usuario.set_password("PasswordActual123")

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    yield usuario

    _borrar_usuario_y_sesiones(db, usuario)


@pytest.fixture
def sesion_expirada(db, usuario_normal):

    sesion = Sesion(
        id_usuario=usuario_normal.id,
        fecha_expiracion=datetime.now(timezone.utc) - timedelta(hours=1)
    )

    db.add(sesion)
    db.commit()
    db.refresh(sesion)

    yield sesion

    existe = db.get(Sesion, sesion.id)
    if existe is not None:
        db.delete(existe)
        db.commit()

@pytest.fixture
def usuario_administrador(db, rol_administrador):

    usuario = Usuario(
        id_rol=rol_administrador.id,
        nombre="Test Etapa8 Administrador",
        correo=f"test_admin_{uuid.uuid4().hex[:8]}@bitacora.test",
        activo=True,
        ultimo_acceso=datetime.now(timezone.utc)
    )

    usuario.set_password("PasswordAdmin123")

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    yield usuario

    _borrar_usuario_y_sesiones(db, usuario)

@pytest.fixture
def usuario_creado(db):
    correo = "diego.loyola@mgcmexico.com.mx"

    yield correo

    usuario = db.scalar(
        select(Usuario).where(Usuario.correo == correo)
    )

    if usuario is not None:
        _borrar_usuario_y_sesiones(db, usuario)