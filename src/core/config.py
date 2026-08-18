import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

PSQL_DATA_HOST = os.getenv("PSQL_DATA_HOST")
PSQL_DATA_DB = os.getenv("PSQL_DATA_DB")
PSQL_DATA_USR = os.getenv("PSQL_DATA_USR")
PSQL_DATA_PW = os.getenv("PSQL_DATA_PW")

TABLA_V = os.getenv("TABLA_V")
TABLA_D = os.getenv("TABLA_D")

GRAPH_TENANT_ID = os.getenv("GRAPH_TENANT_ID")
GRAPH_CLIENT_ID = os.getenv("GRAPH_CLIENT_ID")
GRAPH_CLIENT_SECRET = os.getenv("GRAPH_CLIENT_SECRET")

GRAPH_MAILBOX = os.getenv("GRAPH_MAILBOX")

ARCHIVOS_BASE_DIR = os.getenv("ARCHIVOS_BASE_DIR")

MAX_DIAS = 4
MAX_GESTIONES_DIA = 3

SESION_DURACION_HORAS = int(os.getenv("SESION_DURACION_HORAS", "8"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"