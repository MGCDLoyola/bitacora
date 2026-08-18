from src.core.config import NOMBRE_COOKIE_SESION
from src.core.deps import requiere_rol


# --- Login ---

def test_login_exitoso(client, usuario_normal):

    resp = client.post("/auth/login", json={
        "correo": usuario_normal.correo,
        "password": "PasswordActual123"
    })

    assert resp.status_code == 200
    assert NOMBRE_COOKIE_SESION in resp.cookies
    assert resp.json()["correo"] == usuario_normal.correo


def test_login_credenciales_invalidas(client, usuario_normal):

    resp = client.post("/auth/login", json={
        "correo": usuario_normal.correo,
        "password": "esta-mal"
    })

    assert resp.status_code == 401


def test_login_usuario_inactivo(client, usuario_inactivo):

    resp = client.post("/auth/login", json={
        "correo": usuario_inactivo.correo,
        "password": "PasswordActual123"
    })

    assert resp.status_code == 401


# --- Candado de cambio de password pendiente ---

def test_password_pendiente_bloquea_endpoint_protegido(client, usuario_pendiente):

    client.post("/auth/login", json={
        "correo": usuario_pendiente.correo,
        "password": "123456"
    })

    resp = client.get("/roles/")

    assert resp.status_code == 403


def test_password_pendiente_permite_cambiar_password(client, usuario_pendiente):

    client.post("/auth/login", json={
        "correo": usuario_pendiente.correo,
        "password": "123456"
    })

    resp = client.post("/auth/cambiar-password", json={
        "password_actual": "123456",
        "password_nueva": "NuevaPassword123"
    })

    assert resp.status_code == 204


def test_cambiar_password_invalida_la_sesion(client, usuario_normal):

    client.post("/auth/login", json={
        "correo": usuario_normal.correo,
        "password": "PasswordActual123"
    })

    resp = client.post("/auth/cambiar-password", json={
        "password_actual": "PasswordActual123",
        "password_nueva": "OtraPassword456"
    })
    assert resp.status_code == 204

    # la cookie que quedó ya no debe servir para nada protegido
    resp = client.get("/roles/")
    assert resp.status_code == 401


# --- Sesión ---

def test_sesion_expirada_es_rechazada(client, sesion_expirada):

    client.cookies.set(NOMBRE_COOKIE_SESION, str(sesion_expirada.id))

    resp = client.get("/roles/")

    assert resp.status_code == 401


def test_sin_cookie_es_rechazado(client):

    resp = client.get("/roles/")

    assert resp.status_code == 401


# --- Logout ---

def test_logout_invalida_la_sesion(client, usuario_normal):

    client.post("/auth/login", json={
        "correo": usuario_normal.correo,
        "password": "PasswordActual123"
    })

    resp = client.post("/auth/logout")
    assert resp.status_code == 204

    resp = client.get("/roles/")
    assert resp.status_code == 401


# --- requiere_rol (unit test directo sobre la dependencia, todavía no hay
# router que la use en HTTP) ---

def test_requiere_rol_permite_rol_correcto(usuario_normal):

    dependencia = requiere_rol(usuario_normal.rol.nombre)

    resultado = dependencia(usuario=usuario_normal)

    assert resultado is usuario_normal


def test_requiere_rol_deniega_rol_incorrecto(usuario_normal):
    from src.core.exceptions import PermisoDenegado

    otro_rol = "Administrador" if usuario_normal.rol.nombre != "Administrador" else "Visualizador"
    dependencia = requiere_rol(otro_rol)

    try:
        dependencia(usuario=usuario_normal)
        assert False, "debió lanzar PermisoDenegado"
    except PermisoDenegado:
        pass