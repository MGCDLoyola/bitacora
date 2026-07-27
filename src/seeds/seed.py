from src.core.database import SessionLocal

from src.seeds.roles import seed_roles


def main() -> None:

    session = SessionLocal()

    try:
        seed_roles(session)

    finally:
        session.close()


if __name__ == "__main__":
    main()