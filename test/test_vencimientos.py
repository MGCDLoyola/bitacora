from mdb import PostgreSQL

from src.core.config import PSQL_DATA_DB, PSQL_DATA_HOST, PSQL_DATA_PW, PSQL_DATA_USR
from src.core.database import SessionLocal
from src.jobs.vencimientos import procesar_clientes


def main():

    pg = PostgreSQL(PSQL_DATA_HOST, PSQL_DATA_DB, PSQL_DATA_USR, PSQL_DATA_PW)

    pg.conectar()

    session = SessionLocal()

    try:
        procesar_clientes(pg, session)

    finally:
        session.close()
        pg.desconectar()


if __name__ == "__main__":
    main()
