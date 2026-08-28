from collections.abc import Callable
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session


class BaseService:
    def __init__(self, session: Session):
        self.session = session

    def _commit(self) -> None:

        try:
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise

    def _guardar(self, instancia: DeclarativeBase) -> None:

        self.session.add(instancia)
        self._commit()
        self.session.refresh(instancia)

    def _guardar_archivo(
        self,
        instancia: DeclarativeBase,
        ruta_destino: Path,
        escribir: Callable[[Path], None],
    ) -> None:

        ruta_destino.parent.mkdir(parents=True, exist_ok=True)
        escribir(ruta_destino)

        try:
            self._guardar(instancia)
        except SQLAlchemyError:
            if ruta_destino.exists():
                ruta_destino.unlink()
            raise

    def _eliminar_archivo(self, instancia: DeclarativeBase, ruta_archivo: Path) -> None:

        self.session.delete(instancia)
        self._commit()

        if ruta_archivo.exists():
            ruta_archivo.unlink()
