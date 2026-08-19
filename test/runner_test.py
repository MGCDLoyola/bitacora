from src.jobs.vencimientos import procesar_clientes
from src.core.database import SessionLocal
from mdb import PostgreSQL
from src.core.config import PSQL_DATA_DB, PSQL_DATA_HOST, PSQL_DATA_PW, PSQL_DATA_USR
from src.jobs.informacion import procesar_informacion
from src.core.config import GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_MAILBOX
from mgc_graph import GraphAuth, GraphClient, Mailbox
from src.jobs.asignacion import asignar_expedientes


def main():

    pg = PostgreSQL(PSQL_DATA_HOST, PSQL_DATA_DB, PSQL_DATA_USR, PSQL_DATA_PW)

    pg.conectar()

    auth = GraphAuth(GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, verify_ssl=False)

    client = GraphClient(auth)

    mailbox = Mailbox(client, GRAPH_MAILBOX)

    session = SessionLocal()

    try:
        procesar_clientes(
            pg,
            session
        )
        asignar_expedientes(session)
        procesar_informacion(session, mailbox)


    finally:
        session.close()
        pg.desconectar()


if __name__ == "__main__":
    main()