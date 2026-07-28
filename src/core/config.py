import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

REPORTE_GARANTIAS_URL = os.environ["REPORTE_GARANTIAS_URL"]

MAX_DIAS = 4
MAX_GESTIONES_DIA = 3