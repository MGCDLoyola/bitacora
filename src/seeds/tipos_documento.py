from sqlalchemy.orm import Session

from src.models.tipo_documento import TipoDocumento


def seed_tipos_documento(session: Session) -> None:
    tipos = [
        {"nombre": "Prueba de Vencimiento"},
        {"nombre": "Bitácora 1"},
        {"nombre": "Bitácora 2"},
        {"nombre": "Bitácora 3"},
        {"nombre": "Bitácora 4"},
        {"nombre": "Consolidación"},
        {"nombre": "Estado de Cuenta SAP"},
    ]

    for datos in tipos:
        existe = session.query(TipoDocumento).filter_by(nombre=datos["nombre"]).first()

        if existe is None:
            session.add(TipoDocumento(**datos))

    session.commit()
