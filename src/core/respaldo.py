import os
import subprocess
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from src.core.config import DATABASE_URL, PG_DUMP_PATH


CARPETA_RESPALDOS = Path("backups") / "postgresql"


def crear_respaldo() -> Path:

    if not PG_DUMP_PATH:
        raise RuntimeError("No está configurada la ruta de 'pg_dump'.")

    url = urlparse(DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1))

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    CARPETA_RESPALDOS.mkdir(parents=True, exist_ok=True)

    ruta = CARPETA_RESPALDOS / f"{timestamp}.dump"

    comando = [
        PG_DUMP_PATH,
        "--format=custom",
        "--file",
        str(ruta),
        "--host",
        url.hostname,
        "--port",
        str(url.port or 5432),
        "--username",
        url.username,
        url.path.lstrip("/"),
    ]

    try:
        subprocess.run(
            comando,
            env={**os.environ, "PGPASSWORD": url.password},
            check=True,
            capture_output=True,
            text=True,
        )

    except FileNotFoundError as exc:
        raise RuntimeError(
            f"No se encontró 'pg_dump' en la ruta configurada: {PG_DUMP_PATH}"
        ) from exc

    except subprocess.CalledProcessError as exc:
        if ruta.exists():
            ruta.unlink()

        raise RuntimeError(
            f"No se pudo generar el respaldo de PostgreSQL: {exc.stderr.strip()}"
        ) from exc

    return ruta
