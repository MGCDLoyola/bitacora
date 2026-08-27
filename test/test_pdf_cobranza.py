from datetime import datetime

from src.core.database import SessionLocal
from src.schemas.cobranza import CobranzaCreate
from src.services.cobranza import CobranzaService


ID_EXPEDIENTE = 30
ID_USUARIO = 1


def main():
    session = SessionLocal()

    try:
        cobranza = CobranzaService(session).crear(
            id_expediente=ID_EXPEDIENTE,
            id_usuario=ID_USUARIO,
            data=CobranzaCreate(
                fecha=datetime.now(),
                contacto=True,
                medio="Prueba",
                comentarios="Cobranza de prueba para validar generación de PDF.",
            ),
        )

        print("Cobranza creada:")
        print(f"  ID:     {cobranza.id}")
        print(f"  Día:    {cobranza.dia}")
        print(f"  Orden:  {cobranza.orden}")
        print(f"  Fecha:  {cobranza.fecha}")

    finally:
        session.close()


if __name__ == "__main__":
    main()
