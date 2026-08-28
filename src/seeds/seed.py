from src.core.database import SessionLocal
from src.seeds.tipos_documento import seed_tipos_documento


def main() -> None:

    session = SessionLocal()

    try:
        seed_tipos_documento(session)

    finally:
        session.close()


if __name__ == "__main__":
    main()
