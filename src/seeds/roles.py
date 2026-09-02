from sqlalchemy.orm import Session

from src.core.database import SessionLocal
from src.models.rol import Rol

def seed_roles(session: Session) -> None:
    roles = [
        {
            "nombre": "Administrador",
            "descripcion": "Acceso completo al sistema.",
        },
        {
            "nombre": "Supervisor",
            "descripcion": "Permite supervisar usuarios, expedientes y cobranzas.",
        },
        {
            "nombre": "Visualizador",
            "descripcion": "Únicamente puede visualizar los documentos.",
        },
        {
            "nombre": "Cobranza",
            "descripcion": "Permite gestionar expedientes, cobranzas y modificar documentos.",
        },
    ]

    for datos in roles:
        existe = (
            session.query(Rol)
            .filter_by(nombre=datos["nombre"])
            .first()
        )

        if existe is None:
            session.add(Rol(**datos))

    session.commit()

def main() -> None:
    session = SessionLocal()

    try:
        seed_roles(session)
    finally:
        session.close()

if __name__ == "__main__":
    main()