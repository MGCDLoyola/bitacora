from mgc_graph import GraphAuth, GraphClient, Mailbox

from src.core.config import (
    GRAPH_CLIENT_ID,
    GRAPH_CLIENT_SECRET,
    GRAPH_MAILBOX,
    GRAPH_TENANT_ID,
)
from src.core.database import SessionLocal
from src.jobs.informacion import procesar_informacion


def main():

    auth = GraphAuth(
        GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, verify_ssl=False
    )

    client = GraphClient(auth)

    mailbox = Mailbox(client, GRAPH_MAILBOX)

    session = SessionLocal()

    try:
        procesar_informacion(session, mailbox)

    finally:
        session.close()


if __name__ == "__main__":
    main()
