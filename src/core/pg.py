from collections.abc import Generator

from mdb import PostgreSQL

from .config import (
    PSQL_DATA_DB,
    PSQL_DATA_HOST,
    PSQL_DATA_PW,
    PSQL_DATA_USR,
)


pg = PostgreSQL(
    PSQL_DATA_HOST,
    PSQL_DATA_DB,
    PSQL_DATA_USR,
    PSQL_DATA_PW,
)


def get_pg() -> Generator[PostgreSQL, None, None]:
    yield pg