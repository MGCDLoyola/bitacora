import logging
import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.expediente import Expediente
from src.models.usuario import Usuario
from src.models.rol import Rol


logger = logging.getLogger(__name__)


def obtener_expedientes_por_asignar(
    session: Session
) -> list[Expediente]:

    stmt = (
        select(Expediente)
        .outerjoin(
            Usuario,
            Expediente.id_usuario == Usuario.id
        )
        .where(
            Expediente.estado.is_(True),
            Expediente.fecha_consolidacion.is_(None),
            (
                Expediente.id_usuario.is_(None)
                |
                Usuario.activo.is_(False)
            )
        )
        .order_by(
            Expediente.id
        )
    )

    return (
        session.execute(stmt)
        .scalars()
        .all()
    )


def obtener_usuarios_cobranza(
    session: Session
) -> list[Usuario]:

    stmt = (
        select(Usuario)
        .join(
            Usuario.rol
        )
        .where(
            Usuario.activo.is_(True),
            Rol.nombre == "Cobranza"
        )
        .order_by(
            Usuario.id
        )
    )

    return (
        session.execute(stmt)
        .scalars()
        .all()
    )


def asignar_expedientes(
    session: Session
) -> None:

    expedientes = obtener_expedientes_por_asignar(
        session
    )

    if not expedientes:
        logger.info(
            "No hay expedientes pendientes de asignación."
        )
        return


    usuarios = obtener_usuarios_cobranza(
        session
    )

    if not usuarios:
        raise ValueError(
            "No existen usuarios activos de cobranza."
        )

    random.shuffle(
        usuarios
    )

    asignaciones = 0

    for indice, expediente in enumerate(expedientes):

        usuario = usuarios[
            indice % len(usuarios)
        ]

        expediente.id_usuario = usuario.id

        asignaciones += 1


    session.commit()


    logger.info(
        "Se asignaron %d expedientes entre %d usuarios.",
        asignaciones,
        len(usuarios)
    )