from src.core.database import SessionLocal
from src.schemas.usuario import UsuarioCreate
from src.services.usuario import UsuarioService
from src.core.exceptions import OperacionInvalida

ID_ROL_COBRANZA = 3

USUARIOS_PRUEBA = [
    {"nombre": "Diego Loyola", "correo": "diego.loyola@m.com.mx"}
]


def seed_usuarios_prueba(session) -> None:

    service = UsuarioService(session)

    for datos in USUARIOS_PRUEBA:

        data = UsuarioCreate(
            nombre=datos["nombre"],
            correo=datos["correo"],
            id_rol=ID_ROL_COBRANZA,
            activo=True
        )

        try:
            usuario, codigo = service.crear(data)
            print(f"Usuario creado: {usuario.correo} (contraseña: {codigo})")
        except OperacionInvalida:
            print(f"Usuario ya existe, se omite: {datos['correo']}")


def main() -> None:

    session = SessionLocal()

    try:
        seed_usuarios_prueba(session)

    finally:
        session.close()


if __name__ == "__main__":
    main()