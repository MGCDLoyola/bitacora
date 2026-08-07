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

ARCHIVOS_BASE_DIR = os.getenv("ARCHIVOS_BASE_DIR")

MAX_DIAS = 4
MAX_GESTIONES_DIA = 3