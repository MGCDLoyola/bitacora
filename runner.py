import logging

from mdb import PostgreSQL
from mgc_graph import GraphAuth, GraphClient, Mailbox

from src.core.config import (
    GRAPH_CLIENT_ID,
    GRAPH_CLIENT_SECRET,
    GRAPH_MAILBOX,
    GRAPH_TENANT_ID,
    PSQL_DATA_DB,
    PSQL_DATA_HOST,
    PSQL_DATA_PW,
    PSQL_DATA_USR,
)
from src.core.database import SessionLocal
from src.core.logging import configurar_logging
from src.jobs.asignacion import asignar_expedientes
from src.jobs.informacion import procesar_informacion
from src.jobs.vencimientos import procesar_vencimientos

configurar_logging()

logger = logging.getLogger("bitacora.runner")


def ejecutar_cadena(pg: PostgreSQL, session, mailbox: Mailbox) -> None:

    jobs = (
        ("procesar_vencimientos", lambda: procesar_vencimientos(pg, session)),
        ("asignar_expedientes", lambda: asignar_expedientes(session)),
        ("procesar_informacion", lambda: procesar_informacion(session, mailbox)),
    )

    for nombre, job in jobs:
        try:
            logger.info("Iniciando job '%s'.", nombre)
            job()
            logger.info("Job '%s' finalizado correctamente.", nombre)

        except Exception:
            logger.exception(
                "Job '%s' falló. Se continúa con el resto de la cadena.",
                nombre
            )


def main() -> None:

    logger.info("Runner iniciado.")

    pg = PostgreSQL(
        PSQL_DATA_HOST,
        PSQL_DATA_DB,
        PSQL_DATA_USR,
        PSQL_DATA_PW,
    )

    pg.conectar()

    auth = GraphAuth(
        GRAPH_TENANT_ID,
        GRAPH_CLIENT_ID,
        GRAPH_CLIENT_SECRET,
        verify_ssl=False,
    )

    client = GraphClient(auth)
    mailbox = Mailbox(client, GRAPH_MAILBOX)

    session = SessionLocal()

    try:
        ejecutar_cadena(pg, session, mailbox)

    finally:
        session.close()
        pg.desconectar()

    logger.info("Runner finalizado.")


if __name__ == "__main__":
    main()