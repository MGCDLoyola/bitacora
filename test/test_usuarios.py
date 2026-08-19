def test_crear_usuario_exitoso(
    client,
    usuario_administrador,
    usuario_creado,
    rol_cobranza,
):

    print("1. Antes del login")

    login = client.post("/auth/login", json={
        "correo": usuario_administrador.correo,
        "password": "PasswordAdmin123"
    })

    print("2. Después del login")

    assert login.status_code == 200

    print("3. Antes de crear usuario")

    resp = client.post("/usuarios", json={
        "nombre": "Usuario Prueba Correo",
        "correo": usuario_creado,
        "id_rol": rol_cobranza.id,
        "activo": True
    })

    print("4. Después de crear usuario")

    assert resp.status_code == 200