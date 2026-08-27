import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIR = Path("logs")


def configurar_logging() -> None:

    LOG_DIR.mkdir(exist_ok=True)

    formato = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")

    handler_archivo = RotatingFileHandler(
        LOG_DIR / "bitacora.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    handler_archivo.setFormatter(formato)

    handler_consola = logging.StreamHandler()
    handler_consola.setFormatter(formato)

    logger_raiz = logging.getLogger()
    logger_raiz.setLevel(logging.INFO)
    logger_raiz.addHandler(handler_archivo)
    logger_raiz.addHandler(handler_consola)
